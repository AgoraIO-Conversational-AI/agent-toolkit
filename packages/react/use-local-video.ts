"use client"

import { useState, useCallback, useEffect } from "react"
import type { ICameraVideoTrack } from "agora-rtc-sdk-ng"
import AgoraRTC from "agora-rtc-sdk-ng"

export interface VideoDevice {
  deviceId: string
  label: string
  groupId?: string
}

export interface UseLocalVideoConfig {
  /**
   * Initial camera device ID (optional)
   */
  deviceId?: string

  /**
   * Video encoder configuration
   * @default "720p_2"
   */
  encoderConfig?: string

  /**
   * Start with video enabled
   * @default false
   */
  startEnabled?: boolean
}

export interface UseLocalVideoReturn {
  /**
   * Local camera video track
   */
  videoTrack: ICameraVideoTrack | null

  /**
   * Whether video is currently enabled
   */
  isVideoEnabled: boolean

  /**
   * Available camera devices
   */
  cameras: VideoDevice[]

  /**
   * Currently selected camera device ID
   */
  currentDeviceId: string | undefined

  /**
   * Enable/create video track
   */
  enableVideo: () => Promise<void>

  /**
   * Disable/destroy video track
   */
  disableVideo: () => Promise<void>

  /**
   * Toggle video on/off
   */
  toggleVideo: () => Promise<void>

  /**
   * Switch to a different camera
   */
  switchCamera: (deviceId: string) => Promise<void>

  /**
   * Refresh available cameras list
   */
  refreshCameras: () => Promise<void>

  /**
   * Error message if any
   */
  error: string | null
}

export function useLocalVideo(config?: UseLocalVideoConfig): UseLocalVideoReturn {
  const [videoTrack, setVideoTrack] = useState<ICameraVideoTrack | null>(null)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [cameras, setCameras] = useState<VideoDevice[]>([])
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>(config?.deviceId)
  const [error, setError] = useState<string | null>(null)

  // Load available cameras
  const refreshCameras = useCallback(async () => {
    try {
      setError(null)
      const devices = await AgoraRTC.getCameras()
      const videoDevices: VideoDevice[] = devices.map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        groupId: device.groupId,
      }))
      setCameras(videoDevices)

      // Set current device if not set
      if (!currentDeviceId && videoDevices.length > 0) {
        setCurrentDeviceId(videoDevices[0].deviceId)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to get cameras"
      setError(errorMsg)
      console.error("[useLocalVideo] Error getting cameras:", err)
    }
  }, [currentDeviceId])

  // Initialize cameras on mount
  useEffect(() => {
    refreshCameras()

    // Listen for device changes
    const handleDeviceChange = () => {
      refreshCameras()
    }

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange)
    }
  }, [refreshCameras])

  // Enable video
  const enableVideo = useCallback(async () => {
    try {
      setError(null)
      console.log("[useLocalVideo] enableVideo called", {
        hasExistingTrack: !!videoTrack,
        currentDeviceId,
      })

      // If track already exists, just enable it
      if (videoTrack) {
        console.log("[useLocalVideo] Enabling existing video track")
        await videoTrack.setEnabled(true)
        setIsVideoEnabled(true)
        return
      }

      // Create new video track
      console.log("[useLocalVideo] Creating new camera video track")
      const track = await AgoraRTC.createCameraVideoTrack({
        cameraId: currentDeviceId,
        encoderConfig: (config?.encoderConfig as any) || "720p_2",
      })

      console.log("[useLocalVideo] Video track created successfully:", track)
      setVideoTrack(track)
      setIsVideoEnabled(true)
      if (track._deviceName) {
        setCurrentDeviceId(track.getTrackId())
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to enable video"
      setError(errorMsg)
      console.error("[useLocalVideo] Error enabling video:", err)
      throw err
    }
  }, [videoTrack, currentDeviceId, config?.encoderConfig])

  // Disable video
  const disableVideo = useCallback(async () => {
    try {
      setError(null)

      if (videoTrack) {
        await videoTrack.setEnabled(false)
        setIsVideoEnabled(false)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to disable video"
      setError(errorMsg)
      console.error("[useLocalVideo] Error disabling video:", err)
    }
  }, [videoTrack])

  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (isVideoEnabled) {
      await disableVideo()
    } else {
      await enableVideo()
    }
  }, [isVideoEnabled, enableVideo, disableVideo])

  // Switch camera
  const switchCamera = useCallback(
    async (deviceId: string) => {
      try {
        setError(null)

        if (!videoTrack) {
          // If no track exists, just set the device ID for future use
          setCurrentDeviceId(deviceId)
          return
        }

        // Switch the camera on existing track
        await videoTrack.setDevice(deviceId)
        setCurrentDeviceId(deviceId)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to switch camera"
        setError(errorMsg)
        console.error("[useLocalVideo] Error switching camera:", err)
        throw err
      }
    },
    [videoTrack]
  )

  // Auto-start video if configured
  useEffect(() => {
    if (config?.startEnabled && !videoTrack) {
      enableVideo().catch((err) => {
        console.error("[useLocalVideo] Auto-start video failed:", err)
      })
    }
  }, [config?.startEnabled, videoTrack, enableVideo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTrack) {
        videoTrack.close()
      }
    }
  }, [videoTrack])

  return {
    videoTrack,
    isVideoEnabled,
    cameras,
    currentDeviceId,
    enableVideo,
    disableVideo,
    toggleVideo,
    switchCamera,
    refreshCameras,
    error,
  }
}
