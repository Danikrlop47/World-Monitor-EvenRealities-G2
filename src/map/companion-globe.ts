import type { ModuleItem } from '../modules/demo-data'
import { getGlobeRotationY } from './globe-rotation'
import { drawGlobeMap } from './render-map'

export function mountCompanionGlobe(
  host: HTMLElement,
  getItems: () => ModuleItem[],
  getSelectedIndex: () => number,
  onRotation: (listener: (angle: number) => void) => () => void,
): () => void {
  host.innerHTML = ''
  const canvas = document.createElement('canvas')
  canvas.className = 'globe-canvas'
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Rotating world events globe')
  host.appendChild(canvas)

  let layoutW = 0
  let layoutH = 0

  const draw = (rotY: number): void => {
    const ctx = canvas.getContext('2d')
    if (!ctx || layoutW <= 0 || layoutH <= 0) return
    drawGlobeMap(ctx, canvas.width, canvas.height, getItems(), getSelectedIndex(), rotY)
  }

  const resize = (): void => {
    const rect = host.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    if (w === layoutW && h === layoutH) return

    layoutW = w
    layoutH = h
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.max(1, Math.floor(w * dpr))
    canvas.height = Math.max(1, Math.floor(h * dpr))
    draw(getGlobeRotationY())
  }

  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  const unsubRot = onRotation(draw)

  return () => {
    unsubRot()
    ro.disconnect()
    host.innerHTML = ''
  }
}
