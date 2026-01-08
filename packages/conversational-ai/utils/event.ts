// Type-safe event emitter for pub/sub pattern

export class EventHelper<TEvents extends Record<string, (...args: any[]) => void>> {
  private listeners: Map<keyof TEvents, Set<(...args: any[]) => void>> = new Map()

  on<K extends keyof TEvents>(event: K, handler: TEvents[K]): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
    return this
  }

  off<K extends keyof TEvents>(event: K, handler: TEvents[K]): this {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(handler)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
    return this
  }

  once<K extends keyof TEvents>(event: K, handler: TEvents[K]): this {
    const onceHandler = ((...args: any[]) => {
      handler(...args)
      this.off(event, onceHandler as TEvents[K])
    }) as TEvents[K]

    return this.on(event, onceHandler)
  }

  emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): this {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((handler) => {
        try {
          handler(...args)
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error)
        }
      })
    }
    return this
  }

  removeAllListeners(event?: keyof TEvents): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }

  listenerCount(event: keyof TEvents): number {
    return this.listeners.get(event)?.size ?? 0
  }
}
