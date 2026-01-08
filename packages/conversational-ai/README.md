# Agora Conversational AI SDK

Framework-agnostic TypeScript SDK for building voice AI applications with Agora
RTC. Provides queue-based message handling, PTS synchronization, word-level
deduplication, and multi-mode rendering.

**Status**: ✅ Core SDK Complete | 🚧 React Bindings Available | 📝
Documentation In Progress

---

## Architecture

Aligned with Agora's Conversational-AI-Demo architecture:

```
/conversational-ai-api              # Core SDK (framework-agnostic)
├── index.ts                        # ConversationalAIAPI (main orchestrator)
├── type.ts                         # Core types and enums
├── /helper
│   └── rtc.ts                      # RTCHelper (audio track management)
├── /utils
│   ├── event.ts                    # EventHelper (type-safe events)
│   ├── sub-render.ts               # SubRenderController (message processing)
│   └── index.ts
└── README.md

/react                               # React bindings
├── use-conversational-ai.ts        # Main React hook
└── index.ts
```

---

## Features

### Core SDK (`/conversational-ai-api`)

✅ **EventHelper** - Type-safe pub/sub event system ✅ **SubRenderController** -
Queue-based message processing with:

- PTS (Presentation Time Stamp) synchronization
- Word-level deduplication by `start_ms`
- Support for TEXT, WORD, CHUNK, AUTO render modes
- Interrupt handling
- Turn-based deduplication by `turn_id` + `uid`

✅ **RTCHelper** - Agora RTC wrapper with:

- Singleton pattern
- Audio track lifecycle management
- Volume monitoring
- Network quality tracking
- PTS emission for audio synchronization

✅ **ConversationalAIAPI** - Main orchestration class:

- Integrates RTCHelper + SubRenderController
- Event-driven architecture
- Transcript management
- Connection state tracking

### React Bindings (`/react`)

✅ **useConversationalAI** - Main React hook providing:

- Connection lifecycle (connect/disconnect)
- Real-time transcript updates
- Connection state management
- Error handling
- Direct API access

---

## Usage

### Vanilla TypeScript

```typescript
import { ConversationalAIAPI, RTCHelper } from "./conversational-ai-api"

const rtcHelper = RTCHelper.getInstance()

await rtcHelper.init({
  appId: "your-app-id",
  channel: "test-channel",
  token: "your-token",
  uid: 12345,
})

await rtcHelper.createAudioTrack()
await rtcHelper.join()
await rtcHelper.publish()

const api = ConversationalAIAPI.init({
  rtcEngine: rtcHelper.client!,
  renderMode: "word",
  enableLog: true,
})

api.on("transcript-updated", (messages) => {
  console.log("Transcript:", messages)
})

api.on("connection-state-changed", (state) => {
  console.log("Connection:", state)
})
```

### React

```typescript
import { useConversationalAI } from './react'

function VoiceChat() {
  const {
    transcript,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    error
  } = useConversationalAI({
    appId: 'your-app-id',
    channel: 'test-channel',
    token: null,
    uid: 12345,
    renderMode: 'word'
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
                {msg.uid === 0 ? 'Agent' : 'User'}: {msg.text}
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
```

---

## Key Design Patterns

### 1. Message Deduplication

**Problem**: RTC may send duplicate or out-of-order messages.

**Solution**: Two-level deduplication:

- **Turn-based**: Find existing messages by `turn_id` + `uid`, update instead of
  create
- **Word-based**: Deduplicate words by `start_ms` timestamp

```typescript
// In SubRenderController
const existingMessage = this.messageList.find(
  (item) => item.turn_id === turn_id && item.uid === uid
)

if (!existingMessage) {
  this.appendMessage({ turn_id, uid, text, ... })
} else {
  existingMessage.text = text  // Update existing
}
```

### 2. PTS Synchronization

**Problem**: Transcripts must sync with audio playback for natural flow.

**Solution**: Audio PTS (Presentation Time Stamp) tracking:

```typescript
// RTCHelper emits PTS every frame
rtcHelper.on("audio-pts", (pts) => {
  subRenderController.setPTS(pts)
})

// SubRenderController renders words when pts >= word.start_ms
for (const word of queueItem.words) {
  if (word.start_ms <= this.pts) {
    validWords.push(word) // Render now
  } else {
    restWords.push(word) // Render later
  }
}
```

### 3. Singleton Pattern

All core helpers use singleton pattern for global access:

```typescript
const rtcHelper = RTCHelper.getInstance()
const api = ConversationalAIAPI.getInstance()
```

---

## Type System

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
```

### Key Interfaces

```typescript
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

interface Word {
  word: string
  start_ms: number
  duration_ms: number
  status: TurnStatus
}
```

---

## Events

### ConversationalAIAPI Events

```typescript
api.on("transcript-updated", (messages: TranscriptItem[]) => {})
api.on(
  "agent-state-changed",
  (agentUserId: string, event: { state: AgentState }) => {}
)
api.on("connection-state-changed", (state: ConnectionState) => {})
api.on("agent-error", (error: Error) => {})
```

### RTCHelper Events

```typescript
rtcHelper.on("user-joined", (user: RemoteUser) => {})
rtcHelper.on(
  "user-published",
  (user: RemoteUser, mediaType: "audio" | "video") => {}
)
rtcHelper.on("volume-indicator", (volumes: VolumeIndicator[]) => {})
rtcHelper.on("audio-pts", (pts: number) => {})
```

---

## Performance Optimizations

1. **200ms interval processing** - Prevents excessive re-renders
2. **start_ms deduplication** - Reduces duplicate word processing
3. **Max 2 items in queue** - Prevents memory buildup
4. **Volume monitoring** - 200ms polling for smooth updates
5. **PTS-based rendering** - Only renders words that should be visible

---

## Next Steps

- [ ] Add RTMHelper for text messaging support
- [ ] Add audio denoising integration
- [ ] Create additional React hooks (useAgentState, useAudioTrack)
- [ ] Add comprehensive tests
- [ ] Create vanilla JS examples
- [ ] Publish as NPM package
- [ ] Add migration guide from existing code

---

## Comparison with Conversational-AI-Demo

| Feature          | This SDK                | Conversational-AI-Demo |
| ---------------- | ----------------------- | ---------------------- |
| Architecture     | Framework-agnostic core | Next.js integrated     |
| Message Handling | SubRenderController     | CovSubRenderController |
| RTC Management   | RTCHelper               | RTCHelper (similar)    |
| State Management | Event-driven            | Zustand stores         |
| React Support    | Optional bindings       | Built-in               |
| RTM Support      | Not yet                 | Full support           |

---

## Credits

Based on architecture patterns from:

- [Agora Conversational-AI-Demo](https://github.com/AgoraIO-Community/Conversational-AI-Demo)
- [Agora RTC SDK](https://docs.agora.io/en/video-calling/overview/product-overview)

Built to be the **canonical library for Agora Conversational AI** across web
applications.
