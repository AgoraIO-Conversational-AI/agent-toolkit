// Queue-based message processing with PTS synchronization and deduplication

import type {
  TranscriptItem,
  UserTranscription,
  AgentTranscription,
  MessageInterrupt,
  Word,
  TranscriptHelperMode,
  TurnStatus,
  SubRenderControllerConfig,
} from "../type"
import { TurnStatus as TS, TranscriptHelperMode as Mode } from "../type"

interface QueueItem {
  turn_id: number
  uid: number
  stream_id: number
  text: string
  words: Word[]
  status: TurnStatus
}

const PTS_INTERVAL_MS = 200
const MAX_QUEUE_SIZE = 2

export class SubRenderController {
  private mode: TranscriptHelperMode = Mode.AUTO
  private pts: number = 0
  private messageList: TranscriptItem[] = []
  private queue: QueueItem[] = []
  private intervalRef: NodeJS.Timeout | null = null
  private callback: (messages: TranscriptItem[]) => void
  private processedMessageIds = new Set<string>()

  constructor(config: SubRenderControllerConfig) {
    this.callback = config.callback
    if (config.mode) {
      this.mode = config.mode
    }
  }

  setMode(mode: TranscriptHelperMode): void {
    if (this.mode === Mode.AUTO || this.mode === Mode.UNKNOWN) {
      this.mode = mode
      if (mode === Mode.WORD) {
        this.startIntervalForWords()
      }
    }
  }

  setPTS(pts: number): void {
    this.pts = pts
  }

  handleUserTranscription(message: UserTranscription): void {
    // Message ID deduplication (Trulience pattern)
    const messageId = (message as any).message_id
    if (messageId && this.processedMessageIds.has(messageId)) {
      console.log(`🔄 [SubRender] Skipping duplicate user message: ${messageId}`)
      return
    }
    if (messageId) {
      this.processedMessageIds.add(messageId)
    }

    const turn_id = message.turn_id
    const text = message.text || ""
    const stream_id = message.stream_id
    const turn_status = message.final ? TS.END : TS.IN_PROGRESS

    const uid =
      message.user_id && message.user_id.trim() !== "" ? parseInt(message.user_id, 10) : stream_id

    const existingMessage = this.messageList.find(
      (item) => item.turn_id === turn_id && item.uid === uid
    )

    if (!existingMessage) {
      this.appendMessage({
        turn_id,
        uid,
        stream_id,
        timestamp: Date.now(),
        text,
        status: turn_status,
        words: message.words,
        metadata: message,
      })
    } else {
      existingMessage.text = text
      existingMessage.status = turn_status
      existingMessage.words = message.words
      existingMessage.metadata = message
    }

    this.notifyUpdate()
  }

  handleAgentTranscription(message: AgentTranscription): void {
    // Message ID deduplication (Trulience pattern)
    const messageId = (message as any).message_id
    if (messageId && this.processedMessageIds.has(messageId)) {
      return
    }
    if (messageId) {
      this.processedMessageIds.add(messageId)
    }

    const isAgentMessage = message.stream_id === 0
    const turn_id = message.turn_id
    const text = message.text || ""
    const words = message.words || []
    const stream_id = message.stream_id

    const uid =
      message.user_id && message.user_id.trim() !== "" ? parseInt(message.user_id, 10) : stream_id

    if (isAgentMessage && this.mode === Mode.AUTO) {
      if (!words || words.length === 0) {
        this.setMode(Mode.TEXT)
      } else {
        this.setMode(Mode.WORD)
      }
    }

    if (this.mode === Mode.WORD && words.length > 0) {
      this.pushToQueue({
        turn_id,
        uid,
        stream_id,
        text,
        words: this.sortWordsWithStatus(words, message.turn_status),
        status: message.turn_status,
      })
    } else {
      const existingMessage = this.messageList.find(
        (item) => item.turn_id === turn_id && item.uid === uid
      )

      if (!existingMessage) {
        this.appendMessage({
          turn_id,
          uid,
          stream_id,
          timestamp: Date.now(),
          text,
          status: message.turn_status,
          words,
          metadata: message,
        })
      } else {
        existingMessage.text = text
        existingMessage.status = message.turn_status
        existingMessage.words = words
        existingMessage.metadata = message
      }

      this.notifyUpdate()
    }
  }

  handleMessageInterrupt(message: MessageInterrupt): void {
    const turn_id = message.turn_id
    const start_ms = message.start_ms

    for (const queueItem of this.queue) {
      if (queueItem.turn_id === turn_id) {
        queueItem.status = TS.INTERRUPTED
        queueItem.words = queueItem.words.map((word) => {
          if (word.start_ms >= start_ms) {
            return { ...word, status: TS.INTERRUPTED }
          }
          return word
        })
      }
    }

    for (const message of this.messageList) {
      if (message.turn_id === turn_id && message.start_ms && message.start_ms >= start_ms) {
        message.status = TS.INTERRUPTED
        if (message.words) {
          message.words = message.words.map((word) => {
            if (word.start_ms >= start_ms) {
              return { ...word, status: TS.INTERRUPTED }
            }
            return word
          })
        }
      }
    }

    this.notifyUpdate()
  }

  private sortWordsWithStatus(words: Word[], turn_status: TurnStatus): Word[] {
    const sortedWords = words
      .map((word) => ({ ...word, status: TS.IN_PROGRESS as TurnStatus }))
      .sort((a, b) => a.start_ms - b.start_ms)
      .reduce((acc, curr) => {
        if (!acc.find((word) => word.start_ms === curr.start_ms)) {
          acc.push(curr)
        }
        return acc
      }, [] as Word[])

    if (turn_status !== TS.IN_PROGRESS && sortedWords.length > 0) {
      sortedWords[sortedWords.length - 1].status = turn_status
    }

    return sortedWords
  }

  private pushToQueue(data: QueueItem): void {
    const existing = this.queue.find((item) => item.turn_id === data.turn_id)

    if (!existing) {
      this.queue.push(data)
      if (this.queue.length > MAX_QUEUE_SIZE) {
        this.queue.shift()
      }
    } else {
      existing.text = data.text
      existing.words = this.sortWordsWithStatus([...existing.words, ...data.words], data.status)
      existing.status = data.status
    }
  }

  private startIntervalForWords(): void {
    if (this.intervalRef) return

    this.intervalRef = setInterval(() => {
      this.processQueue()
    }, PTS_INTERVAL_MS)
  }

  private processQueue(): void {
    if (this.queue.length === 0) return

    const queueItem = this.queue[0]
    const validWords: Word[] = []
    const restWords: Word[] = []

    for (const word of queueItem.words) {
      if (word.start_ms <= this.pts) {
        validWords.push(word)
      } else {
        restWords.push(word)
      }
    }

    const validWordsText = validWords.map((word) => word.word).join("")

    const existingMessage = this.messageList.find(
      (item) => item.turn_id === queueItem.turn_id && item.uid === queueItem.uid
    )

    if (!existingMessage) {
      this.appendMessage({
        turn_id: queueItem.turn_id,
        uid: queueItem.uid,
        stream_id: queueItem.stream_id,
        timestamp: Date.now(),
        text: validWordsText,
        status: validWords.length === queueItem.words.length ? queueItem.status : TS.IN_PROGRESS,
        words: validWords,
      })
    } else {
      existingMessage.text = validWordsText
      existingMessage.words = validWords
      existingMessage.status =
        validWords.length === queueItem.words.length ? queueItem.status : TS.IN_PROGRESS
    }

    if (restWords.length === 0 && queueItem.status !== TS.IN_PROGRESS) {
      this.queue.shift()
    } else {
      queueItem.words = restWords
    }

    this.notifyUpdate()
  }

  private appendMessage(message: TranscriptItem): void {
    this.messageList.push(message)
  }

  private notifyUpdate(): void {
    this.callback([...this.messageList])
  }

  getMessages(): TranscriptItem[] {
    return [...this.messageList]
  }

  clearMessages(): void {
    this.messageList = []
    this.queue = []
    this.pts = 0
    this.processedMessageIds.clear()
    this.notifyUpdate()
  }

  destroy(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef)
      this.intervalRef = null
    }
    this.clearMessages()
  }
}
