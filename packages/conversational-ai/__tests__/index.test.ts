/**
 * Tests for ConversationalAIAPI type exports and API contract
 *
 * Note: These tests verify the module structure without instantiating
 * the SDK classes, as they require browser APIs (RTC, RTM) that are
 * not available in the test environment.
 */

import { describe, it, expect } from "vitest"
import type {
  ConversationalAIAPIConfig,
  ConversationalAIAPIEventMap,
  TranscriptItem,
  AgentState,
  ConnectionState,
  RTCHelperConfig,
  RTMHelperConfig,
} from "../type"

describe("Type Exports", () => {
  it("exports ConversationalAIAPIConfig type", () => {
    // Type test - verifies interface is exported
    const config: Partial<ConversationalAIAPIConfig> = {
      enableLog: true,
    }
    expect(config.enableLog).toBe(true)
  })

  it("exports TranscriptItem type", () => {
    // Type test - verifies interface structure
    const transcript: TranscriptItem = {
      uid: 123,
      time: 1000,
      dataType: "transcribe",
      words: [{ text: "hello", isFinal: true, startTime: 0, endTime: 100, confidence: 0.9 }],
      textStream: null,
      text: "hello",
      isFinal: true,
      role: "user",
    }
    expect(transcript.text).toBe("hello")
  })

  it("exports event type definitions", () => {
    // Type test - verifies event map exists
    type EventMap = ConversationalAIAPIEventMap

    // If this compiles, the type is properly exported
    const mockHandler: EventMap["transcript-updated"] = (transcripts: TranscriptItem[]) => {
      expect(Array.isArray(transcripts)).toBe(true)
    }
    mockHandler([])
  })

  it("exports AgentState type", () => {
    const state: AgentState = "listening"
    expect(["listening", "processing", "speaking", "idle"].includes(state)).toBe(true)
  })

  it("exports ConnectionState type", () => {
    const state: ConnectionState = "connected"
    expect(["connected", "disconnected", "connecting"].includes(state)).toBe(true)
  })

  it("exports RTCHelperConfig type", () => {
    const config: Partial<RTCHelperConfig> = {
      enableLog: false,
    }
    expect(typeof config.enableLog).toBe("boolean")
  })

  it("exports RTMHelperConfig type", () => {
    const config: Partial<RTMHelperConfig> = {
      enableLog: true,
    }
    expect(typeof config.enableLog).toBe("boolean")
  })
})

describe("Module Structure", () => {
  it("successfully imports type module", async () => {
    const types = await import("../type")
    expect(types).toBeDefined()
  })
})
