// Core types and enums for Conversational AI API

import type { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng"

export enum AgentState {
  IDLE = "idle",
  LISTENING = "listening",
  THINKING = "thinking",
  SPEAKING = "speaking",
}

export enum TranscriptHelperMode {
  TEXT = "text",
  WORD = "word",
  CHUNK = "chunk",
  AUTO = "auto",
}

export enum TurnStatus {
  IN_PROGRESS = 0,
  END = 1,
  INTERRUPTED = 2,
}

export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
}

export enum ChatMessageType {
  TEXT = "text",
  IMAGE = "image",
}

export enum ChatMessagePriority {
  NORMAL = "normal",
  HIGH = "high",
  INTERRUPTED = "interrupted",
}

export interface Word {
  word: string
  start_ms: number
  duration_ms: number
  status: TurnStatus
}

export interface TranscriptItem {
  turn_id: number
  uid: number
  stream_id: number
  timestamp: number
  text: string
  status: TurnStatus
  words?: Word[]
  metadata?: any
}

export interface UserTranscription {
  object: "user.transcription"
  text: string
  start_ms: number
  duration_ms: number
  language: string
  turn_id: number
  stream_id: number
  user_id: string
  words?: Word[]
  final: boolean
}

export interface AgentTranscription {
  object: "assistant.transcription"
  text: string
  start_ms: number
  duration_ms: number
  language: string
  turn_id: number
  stream_id: number
  user_id: string
  words?: Word[]
  quiet: boolean
  turn_seq_id: number
  turn_status: TurnStatus
}

export interface MessageInterrupt {
  object: "message.interrupt"
  turn_id: number
  start_ms: number
}

export interface ChatMessage {
  messageType: ChatMessageType
  text?: string
  url?: string
  uuid?: string
  priority?: ChatMessagePriority
  responseInterruptable?: boolean
}

export interface ConversationalAIAPIConfig {
  rtcEngine: IAgoraRTCClient
  rtmConfig?: {
    appId: string
    uid: string
    token: string | null
    channel: string
  }
  renderMode?: TranscriptHelperMode
  enableLog?: boolean
}

export interface RTCHelperConfig {
  appId: string
  userId: number
  logLevel?: "debug" | "info" | "warn" | "error"
}

export interface RTMHelperConfig {
  appId: string
  userId: string
}

export interface SubRenderControllerConfig {
  mode?: TranscriptHelperMode
  interval?: number
  callback: (messages: TranscriptItem[]) => void
}

export interface RemoteUser {
  uid: number | string
  audioTrack?: any
  hasAudio: boolean
}

export interface VolumeIndicator {
  uid: number | string
  level: number
}

export interface NetworkQuality {
  uplinkNetworkQuality: number
  downlinkNetworkQuality: number
}

export enum ConversationalAIAPIEvents {
  AGENT_STATE_CHANGED = "agent-state-changed",
  AGENT_INTERRUPTED = "agent-interrupted",
  AGENT_METRICS = "agent-metrics",
  AGENT_ERROR = "agent-error",
  TRANSCRIPT_UPDATED = "transcript-updated",
  CONNECTION_STATE_CHANGED = "connection-state-changed",
  MESSAGE_ERROR = "message-error",
  DEBUG_LOG = "debug-log",
}

export interface ConversationalAIAPIEventMap {
  [ConversationalAIAPIEvents.AGENT_STATE_CHANGED]: (
    agentUserId: string,
    event: { state: AgentState }
  ) => void
  [ConversationalAIAPIEvents.AGENT_INTERRUPTED]: (agentUserId: string) => void
  [ConversationalAIAPIEvents.AGENT_METRICS]: (metrics: any) => void
  [ConversationalAIAPIEvents.AGENT_ERROR]: (error: Error) => void
  [ConversationalAIAPIEvents.TRANSCRIPT_UPDATED]: (transcript: TranscriptItem[]) => void
  [ConversationalAIAPIEvents.CONNECTION_STATE_CHANGED]: (state: ConnectionState) => void
  [ConversationalAIAPIEvents.MESSAGE_ERROR]: (error: Error) => void
  [ConversationalAIAPIEvents.DEBUG_LOG]: (message: string) => void
}

export enum RTCHelperEvents {
  USER_JOINED = "user-joined",
  USER_LEFT = "user-left",
  USER_PUBLISHED = "user-published",
  USER_UNPUBLISHED = "user-unpublished",
  VOLUME_INDICATOR = "volume-indicator",
  NETWORK_QUALITY = "network-quality",
  CONNECTION_STATE_CHANGED = "connection-state-changed",
  AUDIO_PTS = "audio-pts",
  STREAM_MESSAGE = "stream-message",
  ERROR = "error",
}

export interface RTCHelperEventMap {
  [RTCHelperEvents.USER_JOINED]: (user: RemoteUser) => void
  [RTCHelperEvents.USER_LEFT]: (user: RemoteUser) => void
  [RTCHelperEvents.USER_PUBLISHED]: (user: RemoteUser, mediaType: "audio" | "video") => void
  [RTCHelperEvents.USER_UNPUBLISHED]: (user: RemoteUser, mediaType: "audio" | "video") => void
  [RTCHelperEvents.VOLUME_INDICATOR]: (volumes: VolumeIndicator[]) => void
  [RTCHelperEvents.NETWORK_QUALITY]: (quality: NetworkQuality) => void
  [RTCHelperEvents.CONNECTION_STATE_CHANGED]: (state: ConnectionState) => void
  [RTCHelperEvents.AUDIO_PTS]: (pts: number) => void
  [RTCHelperEvents.STREAM_MESSAGE]: (uid: number, stream: Uint8Array) => void
  [RTCHelperEvents.ERROR]: (error: Error) => void
}
