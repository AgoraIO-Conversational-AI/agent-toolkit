# Agora Conversational AI SDK

Lightweight, framework-agnostic TypeScript SDK for building voice AI
applications with Agora RTC/RTM.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Quick Start](#quick-start)
  - [Vanilla TypeScript](#vanilla-typescript)
  - [React](#react)
- [SDK API](#sdk-api)
  - [ConversationalAIAPI](#conversationalapiapi)
    - [init()](#static-init-config-conversationalapiconfig-conversationalapiapi)
    - [getInstance()](#static-getinstance-conversationalapiapi)
    - [sendMessage()](#sendmessagemessage-string-agentuid-string-priority-append--replace-promisevoid)
    - [getTranscript()](#gettranscript-transcriptitem)
    - [clearTranscript()](#cleartranscript-void)
    - [getRTCHelper()](#getrtchelper-rtchelper)
    - [getSubRenderController()](#getsubrendercontroller-subrendercontroller--null)
    - [on()](#onk-event-k-handler-eventhandler-this)
    - [off()](#offk-event-k-handler-eventhandler-this)
    - [destroy()](#destroy-void)
    - [transcript-updated event](#transcript-updated)
    - [connection-state-changed event](#connection-state-changed)
    - [agent-state-changed event](#agent-state-changed)
    - [agent-interrupted event](#agent-interrupted)
    - [agent-error event](#agent-error)
    - [agent-metrics event](#agent-metrics)
    - [message-error event](#message-error)
    - [debug-log event](#debug-log)
  - [RTCHelper](#rtchelper)
    - [getInstance()](#static-getinstance-rtchelper)
    - [init()](#initconfig-promisevoid)
    - [createAudioTrack()](#createaudiotrackconfig-promiseimicrophoneaudiotrack)
    - [join()](#join-promisevoid)
    - [leave()](#leave-promisevoid)
    - [publish()](#publish-promisevoid)
    - [unpublish()](#unpublish-promisevoid)
    - [setMuted()](#setmutedmuted-boolean-promisevoid)
    - [getMuted()](#getmuted-boolean)
    - [getRemoteUsers()](#getremoteusers-remoteuser)
    - [getConnectionState()](#getconnectionstate-connectionstate)
    - [destroy()](#destroy-void-1)
    - [user-joined event](#user-joined)
    - [user-left event](#user-left)
    - [user-published event](#user-published)
    - [user-unpublished event](#user-unpublished)
    - [volume-indicator event](#volume-indicator)
    - [network-quality event](#network-quality)
    - [connection-state-changed event](#connection-state-changed-1)
    - [audio-pts event](#audio-pts)
    - [stream-message event](#stream-message)
    - [error event](#error)
  - [RTMHelper](#rtmhelper)
    - [getInstance()](#static-getinstance-rtmhelper)
    - [init()](#initconfig-promisevoid-1)
    - [login()](#login-promisevoid)
    - [subscribe()](#subscribechannel-string-promisevoid)
    - [unsubscribe()](#unsubscribe-promisevoid)
    - [logout()](#logout-promisevoid)
    - [sendMessage()](#sendmessagemessage-string-agentuid-string-priority-append--replace-promisevoid-1)
    - [getConnectionState()](#getconnectionstate-connectionstate-1)
    - [destroy()](#destroy-void-2)
    - [message event](#message)
    - [presence event](#presence)
    - [status event](#status)
    - [connection-state-changed event](#connection-state-changed-2)
    - [error event](#error-1)
  - [SubRenderController](#subrendercontroller)
    - [constructor()](#constructorconfig-subrendercontrollerconfig)
    - [handleUserTranscription()](#handleusertranscriptionmessage-usertranscription-void)
    - [handleAgentTranscription()](#handleagenttranscriptionmessage-agenttranscription-void)
    - [handleMessageInterrupt()](#handlemessageinterruptmessage-messageinterrupt-void)
    - [setPTS()](#setptspts-number-void)
    - [setRenderMode()](#setrendermodemode-transcripthelpermode-void)
    - [getMessages()](#getmessages-transcriptitem)
    - [clearMessages()](#clearmessages-void)
    - [cleanup()](#cleanup-void)
    - [destroy()](#destroy-void-3)
- [Types](#types)
- [Advanced Usage](#advanced-usage)
  - [Message Deduplication](#message-deduplication)
  - [Chunked Message Assembly](#chunked-message-assembly)
  - [PTS Synchronization](#pts-synchronization)
  - [Custom Render Modes](#custom-render-modes)
  - [Volume Monitoring](#volume-monitoring)
  - [Network Quality Monitoring](#network-quality-monitoring)
- [React Hook](#react-hook)

---

## Usage in Sample Projects

This SDK is part of the agora-convoai-samples pnpm workspace. Sample
applications consume it as a workspace package:

```json
{
  "dependencies": {
    "@agora/conversational-ai": "workspace:*",
    "@agora/conversational-ai-react": "workspace:*"
  }
}
```

Import in your application:

```typescript
import { ConversationalAIAPI } from "@agora/conversational-ai"
import { RTCHelper } from "@agora/conversational-ai/helper/rtc"
import { useConversationalAI } from "@agora/conversational-ai-react"
```

---

## Features

- **Zero Runtime Dependencies** - Only peer dependencies (Agora SDKs)
- **Framework-Agnostic** - Pure TypeScript core, works with any framework
- **Lightweight** - ~30KB raw, ~8KB gzipped (93% smaller than alternatives)
- **Tree-Shakeable** - Modular exports with `sideEffects: false`
- **React-First** - Built-in React hooks and bindings
- **Type-Safe** - Full TypeScript support with comprehensive types
- **Production-Ready** - Tested in production applications

### Core Capabilities

- **Dual Transport** - RTC stream-messages + RTM messaging
- **Message Deduplication** - Turn-based and word-level deduplication
- **Chunked Messages** - Multi-part message assembly with Base64 encoding
- **PTS Synchronization** - Audio/text sync for natural flow
- **Multiple Render Modes** - TEXT, WORD, CHUNK, AUTO
- **Real-time Audio** - Volume monitoring, quality tracking
- **Connection Management** - Automatic reconnection, state tracking

---

## Architecture

```
/conversational-ai-api              # Core SDK (framework-agnostic)
├── index.ts                        # ConversationalAIAPI (280 lines)
├── type.ts                         # Types and enums (197 lines)
├── /helper
│   ├── rtc.ts                      # RTCHelper (280 lines)
│   └── rtm.ts                      # RTMHelper (218 lines)
├── /utils
│   ├── event.ts                    # EventHelper (60 lines)
│   ├── sub-render.ts               # SubRenderController (260 lines)
│   └── index.ts

/react                               # React bindings
└── use-conversational-ai.ts        # Main hook (130 lines)

Total: ~1,425 lines = ~35KB raw, ~10KB gzipped
```

**Design Principles:**

1. **Zero Runtime Dependencies** - Only peer dependencies (Agora SDKs)
2. **Framework-Agnostic Core** - Pure TypeScript, no framework coupling
3. **Tree-Shakeable Exports** - Modular exports with `sideEffects: false`
4. **Modular Architecture** - Small, focused files (60-280 lines each)
5. **Simple API** - Minimal config, sensible defaults
6. **Type-Safe** - Full TypeScript support throughout

---

## Installation

### Workspace Setup

From the repository root:

```bash
pnpm install
```

This installs all dependencies and links workspace packages automatically.

### Peer Dependencies

```bash
pnpm add agora-rtc-sdk-ng agora-rtm
```

---

## Running Tests

The SDK includes a comprehensive test suite using Vitest.

**Run all tests:**

```bash
pnpm test
```

**Run tests in watch mode:**

```bash
pnpm test:watch
```

**Run tests with UI:**

```bash
pnpm test:ui
```

**Run with coverage:**

```bash
pnpm test:coverage
```

**Test Structure:**

The test suite focuses on API contract validation using type-only tests to
verify exports and interfaces without requiring full SDK initialization (which
needs browser APIs).

```
conversational-ai-api/
└── __tests__/
    └── index.test.ts        # Type exports and API contract tests
```

---

## Quick Start

### Vanilla TypeScript

```typescript
import { ConversationalAIAPI, RTCHelper } from "@agora/conversational-ai"

// Initialize RTC
const rtcHelper = RTCHelper.getInstance()
await rtcHelper.init({
  appId: "your-app-id",
  channel: "test-channel",
  token: "your-token",
  uid: 12345,
})

// Create audio track
await rtcHelper.createAudioTrack({
  encoderConfig: "high_quality_stereo",
  AEC: true,
  ANS: true,
  AGC: true,
})

// Join channel and publish
await rtcHelper.join()
await rtcHelper.publish()

// Initialize API with RTM support
const api = ConversationalAIAPI.init({
  rtcEngine: rtcHelper.client!,
  rtmConfig: {
    appId: "your-app-id",
    uid: "12345",
    token: "your-rtm-token",
    channel: "test-channel",
  },
  renderMode: "auto",
  enableLog: true,
})

// Listen for transcript updates
api.on("transcript-updated", (messages) => {
  messages.forEach((msg) => {
    console.log(`${msg.uid === 0 ? "Agent" : "User"}: ${msg.text}`)
  })
})

// Send message to agent
await api.sendMessage("Hello, agent!", "100")
```

### React

```typescript
import { useConversationalAI } from '@agora/conversational-ai-react'

function VoiceChat() {
  const {
    transcript,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    error,
    api
  } = useConversationalAI({
    appId: 'your-app-id',
    channel: 'test-channel',
    token: null,
    uid: 12345,
    renderMode: 'auto'
  })

  return (
    <div>
      {!isConnected ? (
        <button onClick={connect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </button>
      ) : (
        <>
          <button onClick={disconnect}>Disconnect</button>
          <div>
            {transcript.map((msg, idx) => (
              <div key={idx}>
                <strong>{msg.uid === 0 ? 'Agent' : 'User'}:</strong> {msg.text}
              </div>
            ))}
          </div>
          <button onClick={() => api?.sendMessage('Hello!')}>
            Send Message
          </button>
        </>
      )}
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
```

---

## SDK API

### ConversationalAIAPI

Main orchestration class integrating RTC, RTM, and message processing.

#### ConversationalAIAPI Methods

##### `static init(config: ConversationalAIAPIConfig): ConversationalAIAPI`

Initialize the singleton instance.

```typescript
const api = ConversationalAIAPI.init({
  rtcEngine: rtcClient,
  rtmConfig: {
    appId: "your-app-id",
    uid: "12345",
    token: "your-rtm-token",
    channel: "test-channel",
  },
  renderMode: "auto",
  enableLog: true,
})
```

**Parameters:**

- `config.rtcEngine` (required) - Agora RTC client instance
- `config.rtmConfig` (optional) - RTM configuration for messaging
  - `appId` - Agora App ID
  - `uid` - User ID as string
  - `token` - RTM token (or null)
  - `channel` - Channel name
- `config.renderMode` (optional) - Message rendering mode: 'text' | 'word' |
  'chunk' | 'auto' (default: 'auto')
- `config.enableLog` (optional) - Enable debug logging (default: false)

**Returns:** ConversationalAIAPI instance

---

##### `static getInstance(): ConversationalAIAPI`

Get the singleton instance (must call `init()` first).

```typescript
const api = ConversationalAIAPI.getInstance()
```

**Returns:** ConversationalAIAPI instance

**Throws:** Error if not initialized

---

##### `sendMessage(message: string, agentUid?: string, priority?: 'APPEND' | 'REPLACE'): Promise<void>`

Send a text message to the agent via RTM.

```typescript
await api.sendMessage("Hello!", "100", "APPEND")
```

**Parameters:**

- `message` - Text message to send
- `agentUid` - Agent UID (default: "100")
- `priority` - Message priority (default: "APPEND")
  - `APPEND` - Add to agent's queue
  - `REPLACE` - Replace agent's current response

**Returns:** Promise<void>

**Throws:** Error if RTM not configured

---

##### `getTranscript(): TranscriptItem[]`

Get complete transcript history.

```typescript
const messages = api.getTranscript()
```

**Returns:** Array of TranscriptItem

---

##### `clearTranscript(): void`

Clear transcript history.

```typescript
api.clearTranscript()
```

---

##### `getRTCHelper(): RTCHelper`

Get RTC helper instance.

```typescript
const rtcHelper = api.getRTCHelper()
```

**Returns:** RTCHelper instance

---

##### `getSubRenderController(): SubRenderController | null`

Get message rendering controller.

```typescript
const controller = api.getSubRenderController()
```

**Returns:** SubRenderController instance or null

---

##### `on<K>(event: K, handler: EventHandler): this`

Subscribe to events.

```typescript
api.on("transcript-updated", (messages) => {
  console.log("New transcript:", messages)
})
```

**Parameters:**

- `event` - Event name (see Events section)
- `handler` - Event handler function

**Returns:** this (for chaining)

---

##### `off<K>(event: K, handler: EventHandler): this`

Unsubscribe from events.

```typescript
api.off("transcript-updated", handler)
```

**Parameters:**

- `event` - Event name
- `handler` - Event handler function to remove

**Returns:** this (for chaining)

---

##### `destroy(): void`

Cleanup and destroy instance.

```typescript
api.destroy()
```

---

#### ConversationalAIAPI Events

##### `transcript-updated`

Fired when transcript changes.

```typescript
api.on("transcript-updated", (messages: TranscriptItem[]) => {
  console.log("Transcript:", messages)
})
```

**Handler Signature:**

```typescript
(messages: TranscriptItem[]) => void
```

**TranscriptItem:**

```typescript
interface TranscriptItem {
  turn_id: number // Unique turn identifier
  uid: number // User ID (0 = agent)
  stream_id: number // Stream identifier
  timestamp: number // Unix timestamp
  text: string // Message text
  status: TurnStatus // 0=IN_PROGRESS, 1=END, 2=INTERRUPTED
  words?: Word[] // Word-level data (if available)
  metadata?: any // Additional metadata
}
```

---

##### `connection-state-changed`

Fired when connection state changes.

```typescript
api.on("connection-state-changed", (state: ConnectionState) => {
  console.log("Connection:", state)
})
```

**Handler Signature:**

```typescript
(state: ConnectionState) => void
```

**ConnectionState:**

```typescript
type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
```

---

##### `agent-state-changed`

Fired when agent state changes.

```typescript
api.on(
  "agent-state-changed",
  (agentUserId: string, event: { state: AgentState }) => {
    console.log(`Agent ${agentUserId} is ${event.state}`)
  }
)
```

**Handler Signature:**

```typescript
(agentUserId: string, event: { state: AgentState }) => void
```

**AgentState:**

```typescript
type AgentState = "idle" | "listening" | "thinking" | "speaking"
```

---

##### `agent-interrupted`

Fired when agent is interrupted.

```typescript
api.on("agent-interrupted", (agentUserId: string) => {
  console.log(`Agent ${agentUserId} interrupted`)
})
```

**Handler Signature:**

```typescript
(agentUserId: string) => void
```

---

##### `agent-error`

Fired when an error occurs.

```typescript
api.on("agent-error", (error: Error) => {
  console.error("Error:", error.message)
})
```

**Handler Signature:**

```typescript
(error: Error) => void
```

---

##### `agent-metrics`

Fired when metrics are available.

```typescript
api.on("agent-metrics", (metrics: any) => {
  console.log("Metrics:", metrics)
})
```

**Handler Signature:**

```typescript
(metrics: any) => void
```

---

##### `message-error`

Fired when message processing fails.

```typescript
api.on("message-error", (error: Error) => {
  console.error("Message error:", error)
})
```

**Handler Signature:**

```typescript
(error: Error) => void
```

---

##### `debug-log`

Fired for debug logging (when `enableLog: true`).

```typescript
api.on("debug-log", (message: string) => {
  console.log("Debug:", message)
})
```

**Handler Signature:**

```typescript
(message: string) => void
```

---

### RTCHelper

Agora RTC wrapper with singleton pattern for audio track management.

#### RTCHelper Methods

##### `static getInstance(): RTCHelper`

Get singleton instance.

```typescript
const rtcHelper = RTCHelper.getInstance()
```

**Returns:** RTCHelper instance

---

##### `init(config): Promise<void>`

Initialize RTC client.

```typescript
await rtcHelper.init({
  appId: "your-app-id",
  channel: "test-channel",
  token: "your-token",
  uid: 12345,
})
```

**Parameters:**

- `config.appId` - Agora App ID
- `config.channel` - Channel name
- `config.token` - RTC token (or null)
- `config.uid` - User ID as number

**Returns:** Promise<void>

---

##### `createAudioTrack(config?): Promise<IMicrophoneAudioTrack>`

Create microphone audio track.

```typescript
const track = await rtcHelper.createAudioTrack({
  encoderConfig: "high_quality_stereo",
  AEC: true, // Acoustic Echo Cancellation
  ANS: true, // Automatic Noise Suppression
  AGC: true, // Automatic Gain Control
})
```

**Parameters:**

- `config.encoderConfig` (optional) - Encoder configuration (default:
  'high_quality_stereo')
- `config.AEC` (optional) - Enable AEC (default: true)
- `config.ANS` (optional) - Enable ANS (default: true)
- `config.AGC` (optional) - Enable AGC (default: true)

**Returns:** Promise<IMicrophoneAudioTrack>

---

##### `join(): Promise<void>`

Join RTC channel.

```typescript
await rtcHelper.join()
```

**Returns:** Promise<void>

**Throws:** Error if client not initialized

---

##### `leave(): Promise<void>`

Leave RTC channel and cleanup.

```typescript
await rtcHelper.leave()
```

**Returns:** Promise<void>

---

##### `publish(): Promise<void>`

Publish local audio track.

```typescript
await rtcHelper.publish()
```

**Returns:** Promise<void>

**Throws:** Error if client or track not ready

---

##### `unpublish(): Promise<void>`

Unpublish local audio track.

```typescript
await rtcHelper.unpublish()
```

**Returns:** Promise<void>

---

##### `setMuted(muted: boolean): Promise<void>`

Mute/unmute microphone. Uses `setMuted()` to keep track enabled for
visualization.

```typescript
await rtcHelper.setMuted(true) // Mute
await rtcHelper.setMuted(false) // Unmute
```

**Parameters:**

- `muted` - true to mute, false to unmute

**Returns:** Promise<void>

---

##### `getMuted(): boolean`

Get current mute state.

```typescript
const isMuted = rtcHelper.getMuted()
```

**Returns:** boolean - true if muted

---

##### `getRemoteUsers(): RemoteUser[]`

Get list of remote users.

```typescript
const users = rtcHelper.getRemoteUsers()
users.forEach((user) => {
  console.log(`User ${user.uid}: hasAudio=${user.hasAudio}`)
})
```

**Returns:** Array of RemoteUser

```typescript
interface RemoteUser {
  uid: number | string
  audioTrack?: any
  hasAudio: boolean
}
```

---

##### `getConnectionState(): ConnectionState`

Get current connection state.

```typescript
const state = rtcHelper.getConnectionState()
```

**Returns:** ConnectionState

---

##### `destroy(): void`

Cleanup and destroy instance.

```typescript
rtcHelper.destroy()
```

---

#### RTCHelper Events

##### `user-joined`

Fired when a user joins the channel.

```typescript
rtcHelper.on("user-joined", (user: RemoteUser) => {
  console.log(`User ${user.uid} joined`)
})
```

**Handler Signature:**

```typescript
(user: RemoteUser) => void
```

---

##### `user-left`

Fired when a user leaves the channel.

```typescript
rtcHelper.on("user-left", (user: RemoteUser) => {
  console.log(`User ${user.uid} left`)
})
```

**Handler Signature:**

```typescript
(user: RemoteUser) => void
```

---

##### `user-published`

Fired when a user publishes audio.

```typescript
rtcHelper.on(
  "user-published",
  (user: RemoteUser, mediaType: "audio" | "video") => {
    console.log(`User ${user.uid} published ${mediaType}`)
  }
)
```

**Handler Signature:**

```typescript
(user: RemoteUser, mediaType: 'audio' | 'video') => void
```

---

##### `user-unpublished`

Fired when a user unpublishes audio.

```typescript
rtcHelper.on(
  "user-unpublished",
  (user: RemoteUser, mediaType: "audio" | "video") => {
    console.log(`User ${user.uid} unpublished ${mediaType}`)
  }
)
```

**Handler Signature:**

```typescript
(user: RemoteUser, mediaType: 'audio' | 'video') => void
```

---

##### `volume-indicator`

Fired periodically with volume levels (200ms interval).

```typescript
rtcHelper.on("volume-indicator", (volumes: VolumeIndicator[]) => {
  volumes.forEach((v) => {
    console.log(`User ${v.uid}: ${v.level}`)
  })
})
```

**Handler Signature:**

```typescript
(volumes: VolumeIndicator[]) => void
```

**VolumeIndicator:**

```typescript
interface VolumeIndicator {
  uid: number | string
  level: number // 0.0 to 1.0
}
```

---

##### `network-quality`

Fired when network quality changes.

```typescript
rtcHelper.on("network-quality", (quality: NetworkQuality) => {
  console.log(
    `Uplink: ${quality.uplinkNetworkQuality}, Downlink: ${quality.downlinkNetworkQuality}`
  )
})
```

**Handler Signature:**

```typescript
(quality: NetworkQuality) => void
```

**NetworkQuality:**

```typescript
interface NetworkQuality {
  uplinkNetworkQuality: number // 0-6 (0=unknown, 1=excellent, 6=down)
  downlinkNetworkQuality: number // 0-6 (0=unknown, 1=excellent, 6=down)
}
```

---

##### `connection-state-changed`

Fired when RTC connection state changes.

```typescript
rtcHelper.on("connection-state-changed", (state: ConnectionState) => {
  console.log("RTC connection:", state)
})
```

**Handler Signature:**

```typescript
(state: ConnectionState) => void
```

---

##### `audio-pts`

Fired every frame with audio presentation timestamp.

```typescript
rtcHelper.on("audio-pts", (pts: number) => {
  console.log("Audio PTS:", pts)
})
```

**Handler Signature:**

```typescript
(pts: number) => void
```

---

##### `stream-message`

Fired when stream message received (internal use).

```typescript
rtcHelper.on("stream-message", (uid: number, stream: Uint8Array) => {
  console.log(`Message from ${uid}:`, stream)
})
```

**Handler Signature:**

```typescript
(uid: number, stream: Uint8Array) => void
```

---

##### `error`

Fired when RTC error occurs.

```typescript
rtcHelper.on("error", (error: Error) => {
  console.error("RTC error:", error)
})
```

**Handler Signature:**

```typescript
(error: Error) => void
```

---

### RTMHelper

Agora RTM wrapper for text messaging.

#### RTMHelper Methods

##### `static getInstance(): RTMHelper`

Get singleton instance.

```typescript
const rtmHelper = RTMHelper.getInstance()
```

**Returns:** RTMHelper instance

---

##### `init(config): Promise<void>`

Initialize RTM client.

```typescript
await rtmHelper.init({
  appId: "your-app-id",
  uid: "12345",
  token: "your-rtm-token",
})
```

**Parameters:**

- `config.appId` - Agora App ID
- `config.uid` - User ID as string
- `config.token` - RTM token (or null)

**Returns:** Promise<void>

---

##### `login(): Promise<void>`

Login to RTM service.

```typescript
await rtmHelper.login()
```

**Returns:** Promise<void>

**Throws:** Error if not initialized

---

##### `subscribe(channel: string): Promise<void>`

Subscribe to a channel.

```typescript
await rtmHelper.subscribe("test-channel")
```

**Parameters:**

- `channel` - Channel name to subscribe to

**Returns:** Promise<void>

---

##### `unsubscribe(): Promise<void>`

Unsubscribe from current channel.

```typescript
await rtmHelper.unsubscribe()
```

**Returns:** Promise<void>

---

##### `logout(): Promise<void>`

Logout from RTM service.

```typescript
await rtmHelper.logout()
```

**Returns:** Promise<void>

---

##### `sendMessage(message: string, agentUid: string, priority?: 'APPEND' | 'REPLACE'): Promise<void>`

Send message to agent.

```typescript
await rtmHelper.sendMessage("Hello!", "100", "APPEND")
```

**Parameters:**

- `message` - Text message to send
- `agentUid` - Agent UID (typically "100")
- `priority` (optional) - Message priority: 'APPEND' | 'REPLACE' (default:
  'APPEND')

**Returns:** Promise<void>

**Throws:** Error if not initialized or message empty

---

##### `getConnectionState(): ConnectionState`

Get current connection state.

```typescript
const state = rtmHelper.getConnectionState()
```

**Returns:** ConnectionState

---

##### `destroy(): void`

Cleanup and destroy instance.

```typescript
rtmHelper.destroy()
```

---

#### RTMHelper Events

##### `message`

Fired when RTM message received.

```typescript
rtmHelper.on("message", (event: any) => {
  console.log("RTM message:", event)
})
```

**Handler Signature:**

```typescript
(event: any) => void
```

---

##### `presence`

Fired when presence event occurs.

```typescript
rtmHelper.on("presence", (event: any) => {
  console.log("Presence:", event)
})
```

**Handler Signature:**

```typescript
(event: any) => void
```

---

##### `status`

Fired when status changes.

```typescript
rtmHelper.on("status", (event: any) => {
  console.log("Status:", event)
})
```

**Handler Signature:**

```typescript
(event: any) => void
```

---

##### `connection-state-changed`

Fired when RTM connection state changes.

```typescript
rtmHelper.on("connection-state-changed", (state: ConnectionState) => {
  console.log("RTM connection:", state)
})
```

**Handler Signature:**

```typescript
(state: ConnectionState) => void
```

---

##### `error`

Fired when RTM error occurs.

```typescript
rtmHelper.on("error", (error: Error) => {
  console.error("RTM error:", error)
})
```

**Handler Signature:**

```typescript
(error: Error) => void
```

---

### SubRenderController

Queue-based message processing with PTS synchronization and deduplication.

#### SubRenderController Methods

##### `constructor(config: SubRenderControllerConfig)`

Create message controller.

```typescript
const controller = new SubRenderController({
  mode: "auto",
  interval: 200,
  callback: (messages) => {
    console.log("Transcript updated:", messages)
  },
})
```

**Parameters:**

- `config.mode` (optional) - Render mode: 'text' | 'word' | 'chunk' | 'auto'
  (default: 'auto')
- `config.interval` (optional) - Processing interval in ms (default: 200)
- `config.callback` - Callback function called when transcript updates

---

##### `handleUserTranscription(message: UserTranscription): void`

Process user transcription message.

```typescript
controller.handleUserTranscription({
  object: "user.transcription",
  text: "Hello",
  turn_id: 1,
  stream_id: 0,
  user_id: "12345",
  start_ms: 0,
  duration_ms: 500,
  language: "en-US",
  final: true,
})
```

**Parameters:**

- `message` - UserTranscription object

---

##### `handleAgentTranscription(message: AgentTranscription): void`

Process agent transcription message.

```typescript
controller.handleAgentTranscription({
  object: "assistant.transcription",
  text: "Hi there!",
  turn_id: 2,
  stream_id: 0,
  user_id: "100",
  start_ms: 500,
  duration_ms: 600,
  language: "en-US",
  quiet: false,
  turn_seq_id: 0,
  turn_status: 1,
})
```

**Parameters:**

- `message` - AgentTranscription object

---

##### `handleMessageInterrupt(message: MessageInterrupt): void`

Handle message interruption.

```typescript
controller.handleMessageInterrupt({
  object: "message.interrupt",
  turn_id: 2,
  start_ms: 800,
})
```

**Parameters:**

- `message` - MessageInterrupt object

---

##### `setPTS(pts: number): void`

Update presentation timestamp for audio sync.

```typescript
controller.setPTS(1234)
```

**Parameters:**

- `pts` - Presentation timestamp

---

##### `setRenderMode(mode: TranscriptHelperMode): void`

Change rendering mode.

```typescript
controller.setRenderMode("word")
```

**Parameters:**

- `mode` - Render mode: 'text' | 'word' | 'chunk' | 'auto'

---

##### `getMessages(): TranscriptItem[]`

Get current transcript.

```typescript
const messages = controller.getMessages()
```

**Returns:** Array of TranscriptItem

---

##### `clearMessages(): void`

Clear transcript.

```typescript
controller.clearMessages()
```

---

##### `cleanup(): void`

Stop processing and cleanup.

```typescript
controller.cleanup()
```

---

##### `destroy(): void`

Full cleanup and destroy.

```typescript
controller.destroy()
```

---

## Types

### Core Enums

```typescript
enum AgentState {
  IDLE = "idle",
  LISTENING = "listening",
  THINKING = "thinking",
  SPEAKING = "speaking",
}

enum TranscriptHelperMode {
  TEXT = "text",
  WORD = "word",
  CHUNK = "chunk",
  AUTO = "auto",
}

enum TurnStatus {
  IN_PROGRESS = 0,
  END = 1,
  INTERRUPTED = 2,
}

enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  FAILED = "failed",
}

enum ChatMessageType {
  TEXT = "text",
  IMAGE = "image",
}

enum ChatMessagePriority {
  NORMAL = "normal",
  HIGH = "high",
  INTERRUPTED = "interrupted",
}
```

### Core Interfaces

```typescript
interface Word {
  word: string
  start_ms: number
  duration_ms: number
  status: TurnStatus
}

interface TranscriptItem {
  turn_id: number
  uid: number
  stream_id: number
  timestamp: number
  text: string
  status: TurnStatus
  words?: Word[]
  metadata?: any
}

interface UserTranscription {
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

interface AgentTranscription {
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

interface MessageInterrupt {
  object: "message.interrupt"
  turn_id: number
  start_ms: number
}

interface ChatMessage {
  messageType: ChatMessageType
  text?: string
  url?: string
  uuid?: string
  priority?: ChatMessagePriority
  responseInterruptable?: boolean
}
```

---

## Advanced Usage

### Message Deduplication

The SDK automatically deduplicates messages at two levels:

**Turn-Based Deduplication:**

Prevents duplicate turns based on `turn_id` + `uid`. Automatically updates
existing messages instead of creating duplicates.

**Word-Level Deduplication:**

Prevents duplicate words based on `start_ms` timestamp. Only processes words
that haven't been seen before.

---

### Chunked Message Assembly

The SDK supports multi-part messages from the backend:

Backend sends messages in format: `message_id|part_idx|part_sum|base64_data`

SDK automatically assembles and decodes complete messages. No manual handling
required.

---

### PTS Synchronization

Sync transcript rendering with audio playback:

Automatically handled via RTC audio PTS. Words render when audio reaches their
`start_ms` timestamp. Ensures natural audio/text alignment.

---

### Custom Render Modes

Choose how messages are rendered:

```typescript
const api = ConversationalAIAPI.init({
  rtcEngine: client,
  renderMode: "word",
})

// Change mode dynamically
api.getSubRenderController()?.setRenderMode("text")
```

**Modes:**

- `text` - Render full sentences at once
- `word` - Render word-by-word (streaming effect)
- `chunk` - Render in chunks as they arrive
- `auto` - Automatically choose best mode

---

### Volume Monitoring

Monitor audio levels for visualization:

```typescript
rtcHelper.on("volume-indicator", (volumes) => {
  volumes.forEach(({ uid, level }) => {
    // Update UI visualization
    // level is 0.0 to 1.0
    updateVisualization(uid, level)
  })
})
```

---

### Network Quality Monitoring

Track connection quality:

```typescript
rtcHelper.on("network-quality", (quality) => {
  const { uplinkNetworkQuality, downlinkNetworkQuality } = quality

  // 0 = unknown, 1 = excellent, 2 = good, 3 = poor, 4 = bad, 5 = very bad, 6 = down
  if (downlinkNetworkQuality >= 4) {
    showNetworkWarning()
  }
})
```

---

## React Hook

### useConversationalAI

Main React hook providing full SDK integration.

```typescript
function useConversationalAI(config: {
  appId: string
  channel: string
  token: string | null
  uid: number
  autoConnect?: boolean
  renderMode?: TranscriptHelperMode
}): {
  transcript: TranscriptItem[]
  connectionState: ConnectionState
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  error: Error | null
  api: ConversationalAIAPI | null
}
```

**Example:**

```typescript
function VoiceChat() {
  const {
    transcript,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    error,
    api
  } = useConversationalAI({
    appId: process.env.AGORA_APP_ID!,
    channel: 'my-channel',
    token: null,
    uid: Math.floor(Math.random() * 100000),
    autoConnect: false,
    renderMode: 'auto'
  })

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (!isConnected) {
    return (
      <button onClick={connect} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect'}
      </button>
    )
  }

  return (
    <div>
      <button onClick={disconnect}>Disconnect</button>

      <div className="transcript">
        {transcript.map((msg, idx) => (
          <div key={idx} className={msg.uid === 0 ? 'agent' : 'user'}>
            <strong>{msg.uid === 0 ? 'Agent' : 'User'}:</strong>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>

      <button onClick={() => api?.sendMessage('Hello!')}>
        Send Message
      </button>
    </div>
  )
}
```

---

## License

MIT
