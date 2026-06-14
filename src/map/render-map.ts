import {
  MAP_DISPLAY_H,
  MAP_DISPLAY_W,
  MAP_TILE_H,
  MAP_TILE_W,
} from '../layout/display'
import type { ModuleItem } from '../modules/demo-data'
import {
  latLonToMapCoords,
  vbH,
  vbW,
  vbX,
  vbY,
  WORLD_LOCATIONS,
  WORLD_VIEWBOX,
} from './map-data'

export { WORLD_VIEWBOX } from './map-data'
export { MAP_DISPLAY_H, MAP_DISPLAY_W, MAP_TILE_H, MAP_TILE_W } from '../layout/display'

/** Faint country outlines — markers should dominate the map. */
const MAP_STROKE = 'rgba(120, 120, 120, 0.22)'
const MAP_FILL = 'rgba(255, 255, 255, 0.03)'
const SELECTED_RING = '#ffffff'
const MARKER_RADIUS = { normal: 4.5, selected: 6.5 }

const pathByRegion = new Map<string, Path2D>()
let mapCanvas: HTMLCanvasElement | null = null
const tileCanvasPool: HTMLCanvasElement[] = []
let cachedTilePixels: (Uint8ClampedArray | null)[] = [null, null, null, null]
let cachedTilePng: (Uint8Array | null)[] = [null, null, null, null]

export function invalidateMapRenderSurface(): void {
  mapCanvas = null
  cachedTilePixels = [null, null, null, null]
  cachedTilePng = [null, null, null, null]
}

function regionPath(id: string, d: string): Path2D {
  let path = pathByRegion.get(id)
  if (!path) {
    path = new Path2D(d)
    pathByRegion.set(id, path)
  }
  return path
}

function getDrawCanvas(): HTMLCanvasElement {
  if (!mapCanvas) {
    mapCanvas = document.createElement('canvas')
    mapCanvas.width = MAP_DISPLAY_W
    mapCanvas.height = MAP_DISPLAY_H
  }
  return mapCanvas
}

function getTileCanvas(index: number): HTMLCanvasElement {
  let tile = tileCanvasPool[index]
  if (!tile) {
    tile = document.createElement('canvas')
    tile.width = MAP_TILE_W
    tile.height = MAP_TILE_H
    tileCanvasPool[index] = tile
  }
  return tile
}

function pixelsEqual(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('canvas.toBlob failed'))
        return
      }
      blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)))
    }, 'image/png')
  })
}

function encodeTileFromCanvas(
  source: HTMLCanvasElement,
  index: number,
): Promise<Uint8Array> {
  const row = index >> 1
  const col = index & 1
  const sourceCtx = source.getContext('2d')
  if (!sourceCtx) return Promise.reject(new Error('2d canvas unavailable'))

  const imageData = sourceCtx.getImageData(
    col * MAP_TILE_W,
    row * MAP_TILE_H,
    MAP_TILE_W,
    MAP_TILE_H,
  )

  const cached = cachedTilePixels[index]
  if (cached && pixelsEqual(cached, imageData.data)) {
    const png = cachedTilePng[index]
    if (png) return Promise.resolve(png)
  }

  cachedTilePixels[index] = new Uint8ClampedArray(imageData.data)
  const tile = getTileCanvas(index)
  const tctx = tile.getContext('2d')
  if (!tctx) return Promise.reject(new Error('tile canvas unavailable'))
  tctx.putImageData(imageData, 0, 0)

  return canvasToPngBytes(tile).then(png => {
    cachedTilePng[index] = png
    return png
  })
}

export function warmMapRenderCache(): void {
  for (const location of WORLD_LOCATIONS) {
    regionPath(location.id, location.path)
  }
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  item: ModuleItem,
  selected: boolean,
): void {
  if (item.lat === 0 && item.lon === 0) return

  const { x, y } = latLonToMapCoords(item.lat, item.lon)
  const color = item.color
  const radius = selected ? MARKER_RADIUS.selected : MARKER_RADIUS.normal

  // Soft glow so points read clearly over faint geography
  ctx.save()
  ctx.globalAlpha = selected ? 0.5 : 0.32
  ctx.beginPath()
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()

  if (selected) {
    ctx.beginPath()
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2)
    ctx.strokeStyle = SELECTED_RING
    ctx.lineWidth = 1.8
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = selected ? '#ffffff' : 'rgba(0, 0, 0, 0.65)'
  ctx.lineWidth = selected ? 1.2 : 0.9
  ctx.stroke()
}

function drawMapCanvas(
  items: ModuleItem[],
  selectedIndex: number,
): HTMLCanvasElement {
  const canvas = getDrawCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, MAP_DISPLAY_W, MAP_DISPLAY_H)

  ctx.save()
  ctx.scale(MAP_DISPLAY_W / vbW, MAP_DISPLAY_H / vbH)
  ctx.translate(-vbX, -vbY)

  for (const location of WORLD_LOCATIONS) {
    const path = regionPath(location.id, location.path)
    ctx.fillStyle = MAP_FILL
    ctx.fill(path)
    ctx.strokeStyle = MAP_STROKE
    ctx.lineWidth = 0.45
    ctx.stroke(path)
  }

  items.forEach((item, i) => {
    drawMarker(ctx, item, i === selectedIndex)
  })

  ctx.restore()

  return canvas
}

export async function renderMapTiles(
  items: ModuleItem[],
  selectedIndex: number,
): Promise<Uint8Array[]> {
  const canvas = drawMapCanvas(items, selectedIndex)
  return Promise.all([
    encodeTileFromCanvas(canvas, 0),
    encodeTileFromCanvas(canvas, 1),
    encodeTileFromCanvas(canvas, 2),
    encodeTileFromCanvas(canvas, 3),
  ])
}

export function renderCompanionMapSvg(
  items: ModuleItem[],
  selectedIndex: number,
): string {
  const paths = WORLD_LOCATIONS.map(
    (location: { id: string; name: string; path: string }) =>
      `<path id="${location.id}" name="${location.name}" d="${location.path}" fill="rgba(255,255,255,0.03)" stroke="rgba(120,120,120,0.22)" stroke-width="0.45" />`,
  ).join('\n')

  const markers = items
    .map((item, i) => {
      if (item.lat === 0 && item.lon === 0) return ''
      const { x, y } = latLonToMapCoords(item.lat, item.lon)
      const color = item.color
      const selected = i === selectedIndex
      const r = selected ? MARKER_RADIUS.selected : MARKER_RADIUS.normal
      const glow = `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="${color}" opacity="${selected ? 0.5 : 0.32}" />`
      const ring = selected
        ? `<circle cx="${x}" cy="${y}" r="${r + 3}" fill="none" stroke="#ffffff" stroke-width="1.8" />`
        : ''
      const stroke = selected ? '#ffffff' : 'rgba(0,0,0,0.65)'
      const strokeWidth = selected ? 1.2 : 0.9
      return `${glow}${ring}<circle data-event="${item.id}" cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
    })
    .join('\n')

  return `<svg viewBox="${WORLD_VIEWBOX}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="World events map">${paths}\n${markers}</svg>`
}

export function mapItemsKey(
  module: string,
  items: ModuleItem[],
  selectedIndex: number,
): string {
  return `${module}|${selectedIndex}|${items.map(e => e.id).join(',')}`
}

export function tilesEqual(a: Uint8Array, b: Uint8Array | null | undefined): boolean {
  if (!b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
