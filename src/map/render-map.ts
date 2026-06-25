import {
  MAP_DISPLAY_H,
  MAP_DISPLAY_W,
  MAP_TILE_H,
  MAP_TILE_W,
} from '../layout/display'
import type { ModuleItem } from '../modules/demo-data'
import { projectGlobe } from './globe-projection'
import {
  angularDistanceDeg,
  averageRingDepth,
  getGlobeCountryMeshes,
  interpolateOnSphere,
  MAX_GLOBE_SEGMENT_DEG,
  type GlobeRing,
  type GlobeVertex,
} from './globe-mesh'

export { MAP_DISPLAY_H, MAP_DISPLAY_W, MAP_TILE_H, MAP_TILE_W } from '../layout/display'

const SELECTED_RING = '#ffffff'
const MARKER_RADIUS = { normal: 4.5, selected: 6.5 }

const tileCanvasPool: HTMLCanvasElement[] = []
let cachedTilePixels: (Uint8ClampedArray | null)[] = [null, null, null, null]
let cachedTilePng: (Uint8Array | null)[] = [null, null, null, null]

export function invalidateMapRenderSurface(): void {
  cachedTilePixels = [null, null, null, null]
  cachedTilePng = [null, null, null, null]
}

function globeLayout(width: number, height: number) {
  const radius = Math.min(width, height) * 0.435
  return { cx: width / 2, cy: height / 2, radius }
}

function clipGlobe(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number): void {
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
}

function drawGlobeOcean(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.fillStyle = '#060606'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
}

function drawGlobeAtmosphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.strokeStyle = 'rgba(180, 200, 190, 0.22)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()
}

function segmentVisibleOnGlobe(
  a: GlobeVertex,
  b: GlobeVertex,
  rotY: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  if (angularDistanceDeg(a, b) > MAX_GLOBE_SEGMENT_DEG) return false
  if (!projectGlobe(a.lat, a.lon, rotY, cx, cy, radius)) return false
  if (!projectGlobe(b.lat, b.lon, rotY, cx, cy, radius)) return false

  for (const t of [0.25, 0.5, 0.75]) {
    const mid = interpolateOnSphere(a, b, t)
    if (!projectGlobe(mid.lat, mid.lon, rotY, cx, cy, radius)) return false
  }

  return true
}

function traceRingPath(
  ctx: CanvasRenderingContext2D,
  ring: GlobeRing,
  rotY: number,
  cx: number,
  cy: number,
  radius: number,
): { drew: boolean } {
  let penDown = false
  let prev: GlobeVertex | null = null
  let pointCount = 0

  for (const vertex of ring.vertices) {
    const p = projectGlobe(vertex.lat, vertex.lon, rotY, cx, cy, radius)
    if (!p) {
      penDown = false
      prev = null
      continue
    }

    if (prev && !segmentVisibleOnGlobe(prev, vertex, rotY, cx, cy, radius)) {
      penDown = false
    }

    if (!penDown) {
      ctx.moveTo(p.x, p.y)
      penDown = true
    } else {
      ctx.lineTo(p.x, p.y)
    }

    pointCount++
    prev = vertex
  }

  return { drew: pointCount > 1 }
}

const LAND_FILL = '#1a3028'
const COAST_STROKE = 'rgba(120, 160, 140, 0.55)'

function drawGlobeCountries(
  ctx: CanvasRenderingContext2D,
  rotY: number,
  cx: number,
  cy: number,
  radius: number,
): void {
  ctx.imageSmoothingEnabled = true
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const entries = getGlobeCountryMeshes().flatMap(mesh =>
    mesh.rings.map(ring => ({ ring, sortDepth: averageRingDepth(ring, rotY) })),
  )
  entries.sort((a, b) => a.sortDepth - b.sortDepth)

  for (const { ring } of entries) {
    if (!ring.closed) continue
    ctx.beginPath()
    const { drew } = traceRingPath(ctx, ring, rotY, cx, cy, radius)
    if (!drew) continue
    ctx.fillStyle = LAND_FILL
    ctx.fill('evenodd')
  }

  ctx.strokeStyle = COAST_STROKE
  ctx.lineWidth = 0.65

  for (const mesh of getGlobeCountryMeshes()) {
    for (const ring of mesh.rings) {
      ctx.beginPath()
      const { drew } = traceRingPath(ctx, ring, rotY, cx, cy, radius)
      if (drew) ctx.stroke()
    }
  }
}

function drawGlobeMarker(
  ctx: CanvasRenderingContext2D,
  item: ModuleItem,
  selected: boolean,
  rotY: number,
  cx: number,
  cy: number,
  radius: number,
): void {
  if (item.lat === 0 && item.lon === 0) return

  const p = projectGlobe(item.lat, item.lon, rotY, cx, cy, radius)
  if (!p) return

  const depthScale = 0.82 + p.depth * 0.18
  const color = item.color
  const r = (selected ? MARKER_RADIUS.selected : MARKER_RADIUS.normal) * depthScale

  if (selected) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2)
    ctx.strokeStyle = SELECTED_RING
    ctx.lineWidth = 1.4
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = selected ? '#ffffff' : 'rgba(0, 0, 0, 0.7)'
  ctx.lineWidth = selected ? 1 : 0.75
  ctx.stroke()
}

/** Draw the rotating 3D globe into any canvas context. */
export function drawGlobeMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  items: ModuleItem[],
  selectedIndex: number,
  rotY: number,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  const { cx, cy, radius } = globeLayout(width, height)

  drawGlobeOcean(ctx, cx, cy, radius)

  ctx.save()
  clipGlobe(ctx, cx, cy, radius)
  drawGlobeCountries(ctx, rotY, cx, cy, radius)
  ctx.restore()

  drawGlobeAtmosphere(ctx, cx, cy, radius)

  items.forEach((item, i) => {
    drawGlobeMarker(ctx, item, i === selectedIndex, rotY, cx, cy, radius)
  })
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
  skipCache: boolean,
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

  if (!skipCache) {
    const cached = cachedTilePixels[index]
    if (cached && pixelsEqual(cached, imageData.data)) {
      const png = cachedTilePng[index]
      if (png) return Promise.resolve(png)
    }
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

function pixelsEqual(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export async function renderMapTiles(
  items: ModuleItem[],
  selectedIndex: number,
  rotY: number,
): Promise<Uint8Array[]> {
  const canvas = document.createElement('canvas')
  canvas.width = MAP_DISPLAY_W
  canvas.height = MAP_DISPLAY_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas unavailable')

  drawGlobeMap(ctx, MAP_DISPLAY_W, MAP_DISPLAY_H, items, selectedIndex, rotY)

  return Promise.all([
    encodeTileFromCanvas(canvas, 0, true),
    encodeTileFromCanvas(canvas, 1, true),
    encodeTileFromCanvas(canvas, 2, true),
    encodeTileFromCanvas(canvas, 3, true),
  ])
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

export function warmMapRenderCache(): void {
  getGlobeCountryMeshes()
}
