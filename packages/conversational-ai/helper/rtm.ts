// Agora RTM client wrapper

import AgoraRTM, { type RTMClient } from "agora-rtm"
import { EventHelper } from "../utils/event"
import type { ConnectionState } from "../type"
import { ConnectionState as CS } from "../type"

export enum RTMHelperEvents {
  MESSAGE = "message",
  PRESENCE = "presence",
  STATUS = "status",
  CONNECTION_STATE_CHANGED = "connection-state-changed",
  ERROR = "error",
}

export interface RTMHelperEventMap {
  [RTMHelperEvents.MESSAGE]: (message: any) => void
  [RTMHelperEvents.PRESENCE]: (presence: any) => void
  [RTMHelperEvents.STATUS]: (status: any) => void
  [RTMHelperEvents.CONNECTION_STATE_CHANGED]: (state: ConnectionState) => void
  [RTMHelperEvents.ERROR]: (error: Error) => void
}

export class RTMHelper extends EventHelper<RTMHelperEventMap> {
  private static instance: RTMHelper | null = null

  public client: RTMClient | null = null

  private appId: string = ""
  private uid: string = ""
  private token: string | null = null
  private channel: string = ""
  private connectionState: ConnectionState = CS.DISCONNECTED

  private constructor() {
    super()
  }

  static getInstance(): RTMHelper {
    if (!RTMHelper.instance) {
      RTMHelper.instance = new RTMHelper()
    }
    return RTMHelper.instance
  }

  async init(config: { appId: string; uid: string; token: string | null }): Promise<void> {
    this.appId = config.appId
    this.uid = config.uid
    this.token = config.token

    console.log("📡 [RTMHelper] Initializing RTM client:", { appId: this.appId, uid: this.uid })

    try {
      this.client = new AgoraRTM.RTM(this.appId, this.uid, { logLevel: "debug" })
      console.log("📡 [RTMHelper] RTM client created")
    } catch (error) {
      console.error("📡 [RTMHelper] Failed to create RTM client:", error)
      throw error
    }
  }

  async login(): Promise<void> {
    if (!this.client) {
      throw new Error("RTM client not initialized. Call init() first.")
    }

    this.setConnectionState(CS.CONNECTING)

    try {
      console.log("📡 [RTMHelper] Logging in with token...")
      await this.client.login()
      this.setConnectionState(CS.CONNECTED)
      console.log("📡 [RTMHelper] Login successful")
    } catch (error) {
      this.setConnectionState(CS.FAILED)
      this.emit(RTMHelperEvents.ERROR, error as Error)
      console.error("📡 [RTMHelper] Login failed:", error)
      throw error
    }
  }

  async subscribe(channel: string): Promise<void> {
    if (!this.client) {
      throw new Error("RTM client not initialized")
    }

    this.channel = channel

    console.log("📡 [RTMHelper] Subscribing to channel:", channel)

    try {
      await this.client.subscribe(channel, { withMessage: true, withPresence: true })
      console.log("📡 [RTMHelper] Subscribed to channel:", channel)

      // Setup event listeners after subscription
      this.setupEventListeners()
    } catch (error) {
      console.error("📡 [RTMHelper] Subscribe failed:", error)
      this.emit(RTMHelperEvents.ERROR, error as Error)
      throw error
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.client || !this.channel) return

    try {
      await this.client.unsubscribe(this.channel)
      console.log("📡 [RTMHelper] Unsubscribed from channel:", this.channel)
    } catch (error) {
      console.error("📡 [RTMHelper] Unsubscribe failed:", error)
    }
  }

  async logout(): Promise<void> {
    if (!this.client) return

    try {
      await this.unsubscribe()
      await this.client.logout()
      this.setConnectionState(CS.DISCONNECTED)
      console.log("📡 [RTMHelper] Logout successful")
    } catch (error) {
      console.error("📡 [RTMHelper] Logout failed:", error)
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return

    console.log("📡 [RTMHelper] Setting up event listeners")

    this.client.addEventListener("message", (event: any) => {
      console.log("📡 [RTMHelper] Message event:", event)
      this.emit(RTMHelperEvents.MESSAGE, event)
    })

    this.client.addEventListener("presence", (event: any) => {
      console.log("📡 [RTMHelper] Presence event:", event)
      this.emit(RTMHelperEvents.PRESENCE, event)
    })

    this.client.addEventListener("status", (event: any) => {
      console.log("📡 [RTMHelper] Status event:", event)
      this.emit(RTMHelperEvents.STATUS, event)
    })
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.emit(RTMHelperEvents.CONNECTION_STATE_CHANGED, state)
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Send a text message to the agent
   * Based on Trulience SDK pattern: sends to agent_uid-channel or agent_uid
   *
   * @param message - The text message to send
   * @param agentUid - The agent's UID (typically "100")
   * @param priority - Message priority: "APPEND" (default) or "REPLACE"
   * @returns Promise<void>
   */
  async sendMessage(
    message: string,
    agentUid: string,
    priority: "APPEND" | "REPLACE" = "APPEND"
  ): Promise<void> {
    if (!this.client) {
      throw new Error("RTM client not initialized")
    }

    if (!message.trim()) {
      console.warn("📡 [RTMHelper] Attempted to send empty message")
      return
    }

    try {
      // Determine target: agent_uid-channel or just agent_uid
      const publishTarget = this.channel ? `${agentUid}-${this.channel}` : agentUid

      const options = {
        customType: "user.transcription",
        channelType: "USER" as const,
      }

      const messagePayload = JSON.stringify({
        message: message.trim(),
        priority,
      })

      console.log("📡 [RTMHelper] Sending message:", {
        target: publishTarget,
        priority,
        length: message.length,
      })

      await this.client.publish(publishTarget, messagePayload, options)
      console.log("📡 [RTMHelper] Message sent successfully")
    } catch (error) {
      console.error("📡 [RTMHelper] Failed to send message:", error)
      this.emit(RTMHelperEvents.ERROR, error as Error)
      throw error
    }
  }

  destroy(): void {
    this.logout()
    this.removeAllListeners()
    RTMHelper.instance = null
  }
}
