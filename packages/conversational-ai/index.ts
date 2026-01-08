// Main orchestration class for Conversational AI SDK

import { EventHelper } from "./utils/event"
import { SubRenderController } from "./utils/sub-render"
import { RTCHelper } from "./helper/rtc"
import { RTMHelper, RTMHelperEvents } from "./helper/rtm"
import type {
  ConversationalAIAPIConfig,
  ConversationalAIAPIEventMap,
  TranscriptItem,
  AgentState,
  ConnectionState,
} from "./type"
import { ConversationalAIAPIEvents, RTCHelperEvents } from "./type"

export class ConversationalAIAPI extends EventHelper<ConversationalAIAPIEventMap> {
  private static instance: ConversationalAIAPI | null = null

  private rtcHelper: RTCHelper
  private rtmHelper: RTMHelper | null = null
  private subRenderController: SubRenderController | null = null
  private rtcClient: any
  private enableLog: boolean = false
  private rtmConfig: ConversationalAIAPIConfig["rtmConfig"] | null = null
  private messageCache: Map<
    string,
    Array<{ part_idx: number; part_sum: number; content: string }>
  > = new Map()

  private constructor(config: ConversationalAIAPIConfig) {
    super()
    this.rtcClient = config.rtcEngine
    this.enableLog = config.enableLog ?? false
    this.rtcHelper = RTCHelper.getInstance()
    this.rtmConfig = config.rtmConfig ?? null

    this.subRenderController = new SubRenderController({
      mode: config.renderMode,
      callback: (messages) => {
        this.emit(ConversationalAIAPIEvents.TRANSCRIPT_UPDATED, messages)
      },
    })

    this.setupRTCEventListeners()

    // Initialize RTM if config provided
    if (this.rtmConfig) {
      console.log("💬 [API] RTM config provided, will initialize RTM")
      this.initRTM(this.rtmConfig)
    } else {
      console.log("💬 [API] No RTM config, using RTC stream-messages only")
    }
  }

  static init(config: ConversationalAIAPIConfig): ConversationalAIAPI {
    if (!ConversationalAIAPI.instance) {
      ConversationalAIAPI.instance = new ConversationalAIAPI(config)
    }
    return ConversationalAIAPI.instance
  }

  static getInstance(): ConversationalAIAPI {
    if (!ConversationalAIAPI.instance) {
      throw new Error("ConversationalAIAPI not initialized. Call init() first.")
    }
    return ConversationalAIAPI.instance
  }

  private setupRTCEventListeners(): void {
    this.rtcHelper.on(RTCHelperEvents.AUDIO_PTS, (pts) => {
      this.subRenderController?.setPTS(pts)
    })

    this.rtcHelper.on(RTCHelperEvents.CONNECTION_STATE_CHANGED, (state) => {
      this.emit(ConversationalAIAPIEvents.CONNECTION_STATE_CHANGED, state)
    })

    this.rtcHelper.on(RTCHelperEvents.ERROR, (error) => {
      this.emit(ConversationalAIAPIEvents.AGENT_ERROR, error)
    })

    // Handle stream messages (transcripts from agent) - Chunked format support
    this.rtcHelper.on(RTCHelperEvents.STREAM_MESSAGE, (uid, stream) => {
      try {
        let text: string

        // Convert to string if Uint8Array
        if (stream instanceof Uint8Array) {
          const decoder = new TextDecoder("utf-8")
          text = decoder.decode(stream)
        } else if (typeof stream === "string") {
          text = stream
        } else {
          console.warn("[API] Unknown stream type:", typeof stream, stream)
          return
        }

        // Check if it's chunked format: message_id|part_idx|part_sum|data
        const parts = text.split("|")
        if (parts.length === 4) {
          // Chunked message format (Trulience pattern)
          const message = this.handleChunkedMessage(parts)
          if (message) {
            this.routeMessage(message)
          }
        } else {
          // Try direct JSON parse (non-chunked)
          try {
            const message = JSON.parse(text)
            this.routeMessage(message)
          } catch (parseError) {
            console.error("[API] Failed to parse non-chunked message:", parseError)
            console.error("[API] Text:", text)
          }
        }
      } catch (error) {
        console.error("[API] Error processing stream message:", error)
      }
    })
  }

  private handleChunkedMessage(parts: string[]): any | null {
    const [msgId, partIdx, partSum, partData] = parts

    const input = {
      part_idx: parseInt(partIdx, 10),
      part_sum: partSum === "???" ? -1 : parseInt(partSum, 10),
      content: partData,
    }

    // Initialize cache for this message
    if (!this.messageCache.has(msgId)) {
      this.messageCache.set(msgId, [])
    }

    const cache = this.messageCache.get(msgId)!
    cache.push(input)
    cache.sort((a, b) => a.part_idx - b.part_idx)

    // Check if complete
    if (input.part_sum !== -1 && cache.length === input.part_sum) {
      // Assemble complete message
      const base64Message = cache.map((chunk) => chunk.content).join("")

      try {
        // Base64 decode
        const decodedMessage = atob(base64Message)

        // Parse JSON
        const message = JSON.parse(decodedMessage)

        // Cleanup cache
        this.messageCache.delete(msgId)

        return message
      } catch (error) {
        console.error(`[API] Error decoding/parsing message ${msgId}:`, error)
        this.messageCache.delete(msgId)
        return null
      }
    }

    // Not complete yet
    return null
  }

  private routeMessage(message: any): void {
    if (message.object === "user.transcription") {
      this.subRenderController?.handleUserTranscription(message)
    } else if (message.object === "assistant.transcription") {
      this.subRenderController?.handleAgentTranscription(message)
    } else if (message.object === "message.interrupt") {
      this.subRenderController?.handleMessageInterrupt(message)
    }
  }

  getRTCHelper(): RTCHelper {
    return this.rtcHelper
  }

  getSubRenderController(): SubRenderController | null {
    return this.subRenderController
  }

  getTranscript(): TranscriptItem[] {
    return this.subRenderController?.getMessages() ?? []
  }

  clearTranscript(): void {
    this.subRenderController?.clearMessages()
  }

  /**
   * Send a text message to the agent via RTM
   * Based on Trulience SDK pattern
   *
   * @param message - The text message to send
   * @param agentUid - The agent's UID (default: "100")
   * @param priority - Message priority: "APPEND" (default) or "REPLACE"
   * @returns Promise<void>
   * @throws Error if RTM is not configured
   */
  async sendMessage(
    message: string,
    agentUid: string = "100",
    priority: "APPEND" | "REPLACE" = "APPEND"
  ): Promise<void> {
    if (!this.rtmHelper) {
      throw new Error(
        "RTM not configured. Provide rtmConfig when initializing ConversationalAIAPI."
      )
    }

    return this.rtmHelper.sendMessage(message, agentUid, priority)
  }

  private async initRTM(
    config: NonNullable<ConversationalAIAPIConfig["rtmConfig"]>
  ): Promise<void> {
    try {
      this.rtmHelper = RTMHelper.getInstance()

      await this.rtmHelper.init({
        appId: config.appId,
        uid: config.uid,
        token: config.token,
      })

      await this.rtmHelper.login()
      await this.rtmHelper.subscribe(config.channel)

      this.setupRTMEventListeners()

      console.log("💬 [API] RTM initialized and subscribed to channel:", config.channel)
    } catch (error) {
      console.error("💬 [API] RTM initialization failed:", error)
      this.emit(ConversationalAIAPIEvents.AGENT_ERROR, error as Error)
    }
  }

  private setupRTMEventListeners(): void {
    if (!this.rtmHelper) return

    this.rtmHelper.on(RTMHelperEvents.MESSAGE, (event: any) => {
      try {
        console.log("💬 [API] RTM Message event:", event)

        const messageData = event.message

        let parsedMessage: any

        // Handle both string and Uint8Array
        if (typeof messageData === "string") {
          parsedMessage = JSON.parse(messageData)
        } else if (messageData instanceof Uint8Array) {
          const decoder = new TextDecoder("utf-8")
          const text = decoder.decode(messageData)
          parsedMessage = JSON.parse(text)
        } else {
          console.warn("💬 [API] Unknown RTM message type:", typeof messageData)
          return
        }

        console.log("💬 [API] Parsed RTM message:", parsedMessage)

        // Route to SubRenderController based on message type
        if (parsedMessage.object === "user.transcription") {
          console.log("💬 [API] Routing to handleUserTranscription")
          this.subRenderController?.handleUserTranscription(parsedMessage)
        } else if (parsedMessage.object === "assistant.transcription") {
          console.log("💬 [API] Routing to handleAgentTranscription")
          this.subRenderController?.handleAgentTranscription(parsedMessage)
        } else {
          console.log("💬 [API] Unknown message.object:", parsedMessage.object)
        }
      } catch (error) {
        console.error("💬 [API] Error processing RTM message:", error)
      }
    })
  }

  destroy(): void {
    this.subRenderController?.destroy()
    this.rtcHelper.destroy()
    this.rtmHelper?.destroy()
    this.messageCache.clear()
    this.removeAllListeners()
    ConversationalAIAPI.instance = null
  }
}

export * from "./type"
export { RTCHelper } from "./helper/rtc"
export { RTMHelper } from "./helper/rtm"
export { SubRenderController } from "./utils/sub-render"
export { EventHelper } from "./utils/event"
