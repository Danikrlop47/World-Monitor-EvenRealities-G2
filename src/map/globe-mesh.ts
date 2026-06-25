import { WORLD_LOCATIONS } from './map-data'
import { globeDepthAt, normalizeLon, svgCoordsToLatLon } from './globe-projection'

export interface GlobeVertex {
  lat: number
  lon: number
}

export interface GlobeRing {
  vertices: GlobeVertex[]
  closed: boolean
}

export interface GlobeCountryMesh {
  id: string
  rings: GlobeRing[]
}

const PATH_SAMPLE_STEP = 3
const DENSIFY_MAX_DEG = 2.4
/** Max great-circle span between consecutive samples; longer = flat-map jump. */
export const MAX_GLOBE_SEGMENT_DEG = 10

function splitPathSubpaths(pathD: string): { d: string; closed: boolean }[] {
  return pathD
    .split(/(?=[Mm])/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => ({
      d: part.replace(/\s*[Zz]\s*$/g, ''),
      closed: /\s[Zz]\s*$/i.test(part),
    }))
}

function samplePathVertices(pathD: string, closed: boolean): GlobeVertex[] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', pathD)
  const len = el.getTotalLength()
  if (!len) return []

  const vertices: GlobeVertex[] = []
  for (let d = 0; d <= len; d += PATH_SAMPLE_STEP) {
    const pt = el.getPointAtLength(d)
    const { lat, lon } = svgCoordsToLatLon(pt.x, pt.y)
    vertices.push({ lat, lon: normalizeLon(lon) })
  }

  if (closed && vertices.length >= 3) {
    const first = vertices[0]
    const last = vertices[vertices.length - 1]
    if (angularDistanceDeg(first, last) > 0.5) {
      vertices.push({ ...first })
    }
  }

  return densifyRing(vertices, DENSIFY_MAX_DEG)
}

function sampleCountryRings(pathD: string): GlobeRing[] {
  const rings: GlobeRing[] = []
  for (const subpath of splitPathSubpaths(pathD)) {
    const vertices = samplePathVertices(subpath.d, subpath.closed)
    if (vertices.length >= 2) {
      rings.push({ vertices, closed: subpath.closed })
    }
  }
  return rings
}

function densifyRing(vertices: GlobeVertex[], maxDeg: number): GlobeVertex[] {
  if (vertices.length < 2) return vertices

  const out: GlobeVertex[] = [vertices[0]]
  for (let i = 1; i < vertices.length; i++) {
    appendEdge(out, vertices[i - 1], vertices[i], maxDeg)
  }
  return out
}

function appendEdge(
  out: GlobeVertex[],
  a: GlobeVertex,
  b: GlobeVertex,
  maxDeg: number,
): void {
  const dist = angularDistanceDeg(a, b)
  if (dist <= maxDeg) {
    out.push(b)
    return
  }

  const steps = Math.ceil(dist / maxDeg)
  for (let i = 1; i <= steps; i++) {
    out.push(slerpVertex(a, b, i / steps))
  }
}

function slerpVertex(a: GlobeVertex, b: GlobeVertex, t: number): GlobeVertex {
  const va = toUnit(a)
  const vb = toUnit(b)
  const dot = Math.max(-1, Math.min(1, va.x * vb.x + va.y * vb.y + va.z * vb.z))
  const omega = Math.acos(dot)

  if (omega < 1e-5) {
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lon: normalizeLon(a.lon + (b.lon - a.lon) * t),
    }
  }

  const s0 = Math.sin((1 - t) * omega) / Math.sin(omega)
  const s1 = Math.sin(t * omega) / Math.sin(omega)
  const x = va.x * s0 + vb.x * s1
  const y = va.y * s0 + vb.y * s1
  const z = va.z * s0 + vb.z * s1

  return {
    lat: (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI,
    lon: normalizeLon((Math.atan2(y, x) * 180) / Math.PI),
  }
}

function toUnit(v: GlobeVertex): { x: number; y: number; z: number } {
  const latR = (v.lat * Math.PI) / 180
  const lonR = (v.lon * Math.PI) / 180
  return {
    x: Math.cos(latR) * Math.cos(lonR),
    y: Math.cos(latR) * Math.sin(lonR),
    z: Math.sin(latR),
  }
}

let countryMeshes: GlobeCountryMesh[] | null = null

export function getGlobeCountryMeshes(): GlobeCountryMesh[] {
  if (countryMeshes) return countryMeshes

  const meshes = WORLD_LOCATIONS.map((location: { id: string; path: string }) => ({
    id: location.id,
    rings: sampleCountryRings(location.path),
  }))
  countryMeshes = meshes
  return meshes
}

export function angularDistanceDeg(a: GlobeVertex, b: GlobeVertex): number {
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const dLat = lat2 - lat1
  let dLon = ((b.lon - a.lon) * Math.PI) / 180
  while (dLon > Math.PI) dLon -= 2 * Math.PI
  while (dLon < -Math.PI) dLon += 2 * Math.PI
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return ((2 * Math.asin(Math.min(1, Math.sqrt(h)))) * 180) / Math.PI
}

export function interpolateOnSphere(a: GlobeVertex, b: GlobeVertex, t: number): GlobeVertex {
  return slerpVertex(a, b, t)
}

export function midpointOnSphere(a: GlobeVertex, b: GlobeVertex): GlobeVertex {
  return slerpVertex(a, b, 0.5)
}

export function averageRingDepth(ring: GlobeRing, rotY: number): number {
  if (!ring.vertices.length) return 0
  let sum = 0
  for (const v of ring.vertices) {
    sum += globeDepthAt(v.lat, v.lon, rotY)
  }
  return sum / ring.vertices.length
}

export function warmGlobeMeshCache(): void {
  getGlobeCountryMeshes()
}

export function invalidateGlobeMeshCache(): void {
  countryMeshes = null
}
