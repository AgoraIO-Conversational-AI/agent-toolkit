"use client"

import { useState, useEffect, useCallback } from "react"
import type { IRemoteVideoTrack, IAgoraRTCClient, IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng"

export interface RemoteVideoUser {
  uid: number | string
  videoTrack: IRemoteVideoTrack | null
  hasVideo: boolean
}

export interface UseRemoteVideoConfig {
  /**
   * Agora RTC client instance
   */
  client?: IAgoraRTCClient | null

  /**
   * Auto-subscribe to remote video tracks
   * @default true
   */
  autoSubscribe?: boolean

  /**
   * Filter function to determine which users to track
   * @default undefined (track all users)
   */
  userFilter?: (uid: number | string) => boolean
}

export interface UseRemoteVideoReturn {
  /**
   * Map of remote users with video tracks
   */
  remoteVideoUsers: Map<number | string, RemoteVideoUser>

  /**
   * Array of remote users for easier iteration
   */
  remoteVideoUsersArray: RemoteVideoUser[]

  /**
   * Get video track for a specific user
   */
  getVideoTrack: (uid: number | string) => IRemoteVideoTrack | null

  /**
   * Check if a user has video enabled
   */
  hasVideo: (uid: number | string) => boolean

  /**
   * Total number of remote video users
   */
  count: number
}

export function useRemoteVideo(config?: UseRemoteVideoConfig): UseRemoteVideoReturn {
  const [remoteVideoUsers, setRemoteVideoUsers] = useState<Map<number | string, RemoteVideoUser>>(
    new Map()
  )
  const { client, autoSubscribe = true, userFilter } = config || {}

  // Subscribe to remote video tracks
  const handleUserPublished = useCallback(
    async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      if (mediaType !== "video") return
      if (userFilter && !userFilter(user.uid)) return

      try {
        // Auto-subscribe if enabled
        if (autoSubscribe && client) {
          await client.subscribe(user, mediaType)
        }

        // Update state
        setRemoteVideoUsers((prev) => {
          const updated = new Map(prev)
          updated.set(user.uid, {
            uid: user.uid,
            videoTrack: user.videoTrack || null,
            hasVideo: !!user.videoTrack,
          })
          return updated
        })

        console.log(`[useRemoteVideo] User ${user.uid} published video`)
      } catch (err) {
        console.error(`[useRemoteVideo] Failed to subscribe to user ${user.uid} video:`, err)
      }
    },
    [client, autoSubscribe, userFilter]
  )

  // Handle user unpublished video
  const handleUserUnpublished = useCallback(
    (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
      if (mediaType !== "video") return

      setRemoteVideoUsers((prev) => {
        const updated = new Map(prev)
        const existing = updated.get(user.uid)
        if (existing) {
          updated.set(user.uid, {
            ...existing,
            videoTrack: null,
            hasVideo: false,
          })
        }
        return updated
      })

      console.log(`[useRemoteVideo] User ${user.uid} unpublished video`)
    },
    []
  )

  // Handle user left
  const handleUserLeft = useCallback((user: IAgoraRTCRemoteUser) => {
    setRemoteVideoUsers((prev) => {
      const updated = new Map(prev)
      updated.delete(user.uid)
      return updated
    })

    console.log(`[useRemoteVideo] User ${user.uid} left`)
  }, [])

  // Setup event listeners
  useEffect(() => {
    if (!client) return

    client.on("user-published", handleUserPublished)
    client.on("user-unpublished", handleUserUnpublished)
    client.on("user-left", handleUserLeft)

    return () => {
      client.off("user-published", handleUserPublished)
      client.off("user-unpublished", handleUserUnpublished)
      client.off("user-left", handleUserLeft)
    }
  }, [client, handleUserPublished, handleUserUnpublished, handleUserLeft])

  // Utility functions
  const getVideoTrack = useCallback(
    (uid: number | string): IRemoteVideoTrack | null => {
      return remoteVideoUsers.get(uid)?.videoTrack || null
    },
    [remoteVideoUsers]
  )

  const hasVideo = useCallback(
    (uid: number | string): boolean => {
      return remoteVideoUsers.get(uid)?.hasVideo || false
    },
    [remoteVideoUsers]
  )

  const remoteVideoUsersArray = Array.from(remoteVideoUsers.values())

  return {
    remoteVideoUsers,
    remoteVideoUsersArray,
    getVideoTrack,
    hasVideo,
    count: remoteVideoUsers.size,
  }
}
