import { DEMO_EVENTS } from './demo-feed'
import type { WorldEvent } from '../types'

export interface EventsSnapshot {
  event: WorldEvent
  index: number
  total: number
  detailOpen: boolean
  detailScrollOffset: number
}

type Listener = (snapshot: EventsSnapshot) => void

const DETAIL_SCROLL_STEP = 120

export class EventsState {
  private index = 0
  private detailOpen = false
  private detailScrollOffset = 0
  private listeners = new Set<Listener>()

  getSnapshot(): EventsSnapshot {
    return {
      event: DEMO_EVENTS[this.index],
      index: this.index,
      total: DEMO_EVENTS.length,
      detailOpen: this.detailOpen,
      detailScrollOffset: this.detailScrollOffset,
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  getAllEvents(): WorldEvent[] {
    return DEMO_EVENTS
  }

  /** Ring scroll down — older events. */
  scrollOlder(): void {
    if (this.detailOpen) {
      this.scrollDetailDown()
      return
    }
    if (this.index >= DEMO_EVENTS.length - 1) return
    this.index++
    this.notify()
  }

  /** Ring scroll up — newer events. */
  scrollNewer(): void {
    if (this.detailOpen) {
      this.scrollDetailUp()
      return
    }
    if (this.index <= 0) return
    this.index--
    this.notify()
  }

  /** Tap — open full article or close detail view. */
  toggleDetail(): void {
    if (this.detailOpen) {
      this.closeDetail()
    } else {
      this.openDetail()
    }
  }

  openDetail(): void {
    this.detailOpen = true
    this.detailScrollOffset = 0
    this.notify()
  }

  closeDetail(): void {
    this.detailOpen = false
    this.detailScrollOffset = 0
    this.notify()
  }

  selectIndex(index: number): void {
    if (index < 0 || index >= DEMO_EVENTS.length) return
    this.index = index
    this.detailOpen = false
    this.detailScrollOffset = 0
    this.notify()
  }

  private scrollDetailDown(): void {
    const event = DEMO_EVENTS[this.index]
    const maxOffset = Math.max(0, event.body.length - 200)
    if (this.detailScrollOffset >= maxOffset) return
    this.detailScrollOffset = Math.min(maxOffset, this.detailScrollOffset + DETAIL_SCROLL_STEP)
    this.notify()
  }

  private scrollDetailUp(): void {
    if (this.detailScrollOffset <= 0) {
      this.closeDetail()
      return
    }
    this.detailScrollOffset = Math.max(0, this.detailScrollOffset - DETAIL_SCROLL_STEP)
    this.notify()
  }

  private notify(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) listener(snapshot)
  }
}
