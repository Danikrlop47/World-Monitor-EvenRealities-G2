import { GLOBE_INITIAL_ROT_Y } from './globe-projection'

/** One full rotation every ~90 seconds. */
const ROTATION_PERIOD_MS = 90_000

let rotationY = GLOBE_INITIAL_ROT_Y
let lastTick = performance.now()
let running = false
let rafId = 0
const listeners = new Set<(angle: number) => void>()

function tick(now: number): void {
  const dt = Math.min(now - lastTick, 100)
  lastTick = now
  rotationY += (dt / ROTATION_PERIOD_MS) * Math.PI * 2
  if (rotationY > Math.PI * 2) rotationY -= Math.PI * 2

  for (const fn of listeners) fn(rotationY)

  if (running) rafId = requestAnimationFrame(tick)
}

export function getGlobeRotationY(): number {
  return rotationY
}

export function subscribeGlobeRotation(listener: (angle: number) => void): () => void {
  listeners.add(listener)
  listener(rotationY)
  return () => listeners.delete(listener)
}

export function startGlobeRotation(): void {
  if (running) return
  running = true
  lastTick = performance.now()
  rafId = requestAnimationFrame(tick)
}

export function stopGlobeRotation(): void {
  running = false
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

export function isGlobeRotationRunning(): boolean {
  return running
}
