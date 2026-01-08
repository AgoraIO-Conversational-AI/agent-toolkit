// Agora RTC client wrapper with singleton pattern

import AgoraRTC, { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng"
import { EventHelper } from "../utils/event"
import type {
  RTCHelperEventMap,
  ConnectionState,
  RemoteUser,
  VolumeIndicator,
  NetworkQuality,
} from "../type"
import { RTCHelperEvents, ConnectionState as CS } from "../type"

export class RTCHelper extends EventHelper<RTCHelperEventMap> {
  private static instance: RTCHelper | null = null

  public client: IAgoraRTCClient | null = null
  public localAudioTrack: IMicrophoneAudioTrack | null = null

  private appId: string = ""
  private channel: string = ""
  private token: string | null = null
  private uid: number = 0
  private connectionState: ConnectionState = CS.DISCONNECTED
  private volumeIntervalRef: NodeJS.Timeout | null = null

  private constructor() {
    super()
  }

  static getInstance(): RTCHelper {
    if (!RTCHelper.instance) {
      RTCHelper.instance = new RTCHelper()
    }
    return RTCHelper.instance
  }

  async init(config: {
    appId: string
    channel: string
    token: string | null
    uid: number
  }): Promise<void> {
    this.appId = config.appId
    this.channel = config.channel
    this.token = config.token
    this.uid = config.uid

    this.client = AgoraRTC.createClient({
      mode: "rtc",
      codec: "vp8",
    })

    this.setupEventListeners()
  }

  async createAudioTrack(config?: {
    encoderConfig?: string
    AEC?: boolean
    ANS?: boolean
    AGC?: boolean
  }): Promise<IMicrophoneAudioTrack> {
    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: config?.encoderConfig || "high_quality_stereo",
      AEC: config?.AEC ?? true,
      ANS: config?.ANS ?? true,
      AGC: config?.AGC ?? true,
    })

    return this.localAudioTrack
  }

  async join(): Promise<void> {
    if (!this.client) {
      throw new Error("RTC client not initialized. Call init() first.")
    }

    this.setConnectionState(CS.CONNECTING)

    try {
      await this.client.join(this.appId, this.channel, this.token, this.uid)
      this.setConnectionState(CS.CONNECTED)
    } catch (error) {
      this.setConnectionState(CS.FAILED)
      this.emit(RTCHelperEvents.ERROR, error as Error)
      throw error
    }
  }

  async publish(): Promise<void> {
    if (!this.client || !this.localAudioTrack) {
      throw new Error("Client or audio track not ready")
    }

    await this.client.publish([this.localAudioTrack])
    this.startVolumeMonitoring()
  }

  async unpublish(): Promise<void> {
    if (!this.client || !this.localAudioTrack) return

    await this.client.unpublish([this.localAudioTrack])
    this.stopVolumeMonitoring()
  }

  async leave(): Promise<void> {
    if (!this.client) return

    this.stopVolumeMonitoring()

    if (this.localAudioTrack) {
      this.localAudioTrack.stop()
      this.localAudioTrack.close()
      this.localAudioTrack = null
    }

    await this.client.leave()
    this.setConnectionState(CS.DISCONNECTED)
  }

  async setMuted(muted: boolean): Promise<void> {
    if (!this.localAudioTrack) return
    await this.localAudioTrack.setEnabled(!muted)
  }

  getMuted(): boolean {
    return this.localAudioTrack?.enabled === false
  }

  getRemoteUsers(): RemoteUser[] {
    if (!this.client) return []

    return this.client.remoteUsers.map((user) => ({
      uid: user.uid,
      audioTrack: user.audioTrack,
      hasAudio: !!user.audioTrack,
    }))
  }

  private setupEventListeners(): void {
    if (!this.client) return

    this.client.on("user-published", async (user, mediaType) => {
      if (mediaType === "audio") {
        await this.client!.subscribe(user, mediaType)
        user.audioTrack?.play()

        this.emit(
          RTCHelperEvents.USER_PUBLISHED,
          {
            uid: user.uid,
            audioTrack: user.audioTrack,
            hasAudio: true,
          },
          mediaType
        )

        this.startAudioPTSEmission(user.audioTrack!)
      }
    })

    this.client.on("user-unpublished", (user, mediaType) => {
      this.emit(
        RTCHelperEvents.USER_UNPUBLISHED,
        {
          uid: user.uid,
          audioTrack: undefined,
          hasAudio: false,
        },
        mediaType
      )
    })

    this.client.on("user-joined", (user) => {
      this.emit(RTCHelperEvents.USER_JOINED, {
        uid: user.uid,
        audioTrack: user.audioTrack,
        hasAudio: !!user.audioTrack,
      })
    })

    this.client.on("user-left", (user) => {
      this.emit(RTCHelperEvents.USER_LEFT, {
        uid: user.uid,
        audioTrack: undefined,
        hasAudio: false,
      })
    })

    this.client.on("connection-state-change", (curState) => {
      const stateMap: Record<string, ConnectionState> = {
        DISCONNECTED: CS.DISCONNECTED,
        CONNECTING: CS.CONNECTING,
        CONNECTED: CS.CONNECTED,
        RECONNECTING: CS.RECONNECTING,
        DISCONNECTING: CS.DISCONNECTED,
      }

      const mappedState = stateMap[curState] || CS.DISCONNECTED
      this.setConnectionState(mappedState)
    })

    this.client.on("network-quality", (stats) => {
      const quality: NetworkQuality = {
        uplinkNetworkQuality: stats.uplinkNetworkQuality,
        downlinkNetworkQuality: stats.downlinkNetworkQuality,
      }
      this.emit(RTCHelperEvents.NETWORK_QUALITY, quality)
    })

    // Critical: Listen for stream messages (transcript data from AI agent)
    this.client.on("stream-message", (user, stream) => {
      // Reduced logging - only log message size
      this.emit(RTCHelperEvents.STREAM_MESSAGE, user.uid, stream)
    })

    this.client.on("exception", (event) => {
      // Log only non-empty exceptions to reduce console noise
      if (event && Object.keys(event).length > 0) {
        console.warn("[RTCHelper] SDK Exception:", event)
      }
    })
  }

  private startVolumeMonitoring(): void {
    if (this.volumeIntervalRef) return

    this.volumeIntervalRef = setInterval(() => {
      if (!this.client) return

      const volumes: VolumeIndicator[] = []

      if (this.localAudioTrack) {
        const level = this.localAudioTrack.getVolumeLevel()
        volumes.push({ uid: this.uid, level })
      }

      this.client.remoteUsers.forEach((user) => {
        if (user.audioTrack) {
          const level = user.audioTrack.getVolumeLevel()
          volumes.push({ uid: user.uid, level })
        }
      })

      if (volumes.length > 0) {
        this.emit(RTCHelperEvents.VOLUME_INDICATOR, volumes)
      }
    }, 200)
  }

  private stopVolumeMonitoring(): void {
    if (this.volumeIntervalRef) {
      clearInterval(this.volumeIntervalRef)
      this.volumeIntervalRef = null
    }
  }

  private startAudioPTSEmission(audioTrack: any): void {
    const emitPTS = () => {
      if (audioTrack) {
        const stats = audioTrack.getStats()
        const pts = stats.receiveFrames || 0
        this.emit(RTCHelperEvents.AUDIO_PTS, pts)
      }
      requestAnimationFrame(emitPTS)
    }
    emitPTS()
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.emit(RTCHelperEvents.CONNECTION_STATE_CHANGED, state)
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  destroy(): void {
    this.leave()
    this.removeAllListeners()
    RTCHelper.instance = null
  }
}
