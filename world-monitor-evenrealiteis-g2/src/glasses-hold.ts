/** Hold duration before navigating back (ms). */
export const GLASSES_HOLD_MS = 1500

export class GlassesHoldGesture {
  private holdTimer: ReturnType<typeof setTimeout> | null = null
  private holdTriggered = false

  onPressStart(onHold: () => void): void {
    this.clearTimer()
    this.holdTriggered = false
    this.holdTimer = setTimeout(() => {
      this.holdTriggered = true
      onHold()
    }, GLASSES_HOLD_MS)
  }

  onPressEnd(onTap: () => void): void {
    const wasHold = this.holdTriggered
    this.clearTimer()
    if (!wasHold) onTap()
    this.holdTriggered = false
  }

  cancel(): void {
    this.clearTimer()
    this.holdTriggered = false
  }

  private clearTimer(): void {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer)
      this.holdTimer = null
    }
  }
}
