import { vbH, vbW, vbX, vbY } from './map-data'

/** Slight north bias so Europe / USA face the viewer; poles stay near the rim. */
export const GLOBE_TILT_X = 0.06
/** Shift the visible hemisphere toward ~28°N (North Atlantic / Europe / USA). */
export const GLOBE_LAT_OFFSET = 28
/** Start facing the mid-Atlantic (~35°W) so Europe and the Americas are prominent. */
export const GLOBE_INITIAL_ROT_Y = 0.65

/** Equirectangular viewBox xy → lat/lon (matches @svg-maps/world artwork). */
export function svgCoordsToLatLon(x: number, y: number): { lat: number; lon: number } {
  const lon = ((x - vbX) / vbW) * 360 - 180
  const lat = 90 - ((y - vbY) / vbH) * 180
  return { lat, lon: normalizeLon(lon) }
}

export function normalizeLon(lon: number): number {
  let n = lon
  while (n > 180) n -= 360
  while (n < -180) n += 360
  return n
}

export interface GlobeProjected {
  x: number
  y: number
  depth: number
}

function globeCartesian(
  lat: number,
  lon: number,
  rotY: number,
): { x3: number; y3: number; z3: number } {
  const latR = ((lat - GLOBE_LAT_OFFSET) * Math.PI) / 180
  const lonR = (lon * Math.PI) / 180 + rotY

  const x3 = Math.cos(latR) * Math.sin(lonR)
  let y3 = Math.sin(latR)
  let z3 = Math.cos(latR) * Math.cos(lonR)

  const yT = y3 * Math.cos(GLOBE_TILT_X) - z3 * Math.sin(GLOBE_TILT_X)
  const zT = y3 * Math.sin(GLOBE_TILT_X) + z3 * Math.cos(GLOBE_TILT_X)

  return { x3, y3: yT, z3: zT }
}

/** Orthographic globe with fixed tilt and Y-axis spin (radians). */
export function projectGlobe(
  lat: number,
  lon: number,
  rotY: number,
  cx: number,
  cy: number,
  radius: number,
): GlobeProjected | null {
  const { x3, y3, z3 } = globeCartesian(lat, lon, rotY)

  if (z3 < 0.035) return null

  return {
    x: cx + x3 * radius,
    y: cy - y3 * radius,
    depth: z3,
  }
}

export function globeDepthAt(lat: number, lon: number, rotY: number): number {
  return globeCartesian(lat, lon, rotY).z3
}
