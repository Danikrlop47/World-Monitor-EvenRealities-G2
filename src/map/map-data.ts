import worldMap from '@svg-maps/world'
import { PROJ_X, PROJ_Y } from './map-data-internal'

export const WORLD_VIEWBOX = worldMap.viewBox
export const WORLD_LOCATIONS = worldMap.locations

const [vbX, vbY, vbW, vbH] = WORLD_VIEWBOX.split(/\s+/).map(Number)

export { PROJ_X, PROJ_Y } from './map-data-internal'

export function latLonToMapCoords(lat: number, lon: number): { x: number; y: number } {
  return {
    x: PROJ_X.lon * lon + PROJ_X.lat * lat + PROJ_X.c,
    y: PROJ_Y.lon * lon + PROJ_Y.lat * lat + PROJ_Y.c,
  }
}

export { vbX, vbY, vbW, vbH }
