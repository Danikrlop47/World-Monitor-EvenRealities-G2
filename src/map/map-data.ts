import worldMap from '@svg-maps/world'

export const WORLD_VIEWBOX = worldMap.viewBox
export const WORLD_LOCATIONS = worldMap.locations

const [vbX, vbY, vbW, vbH] = WORLD_VIEWBOX.split(/\s+/).map(Number)

/**
 * Affine transform fitted to @svg-maps/world (MapSVG) country bounding boxes.
 * Simple equirectangular math does not match this basemap — it placed dots ~300px off.
 */
const PROJ_X = { lon: 2.8555467648406228, lat: 0.04014946892091907, c: 473.72569719143155 }
const PROJ_Y = { lon: 0.09594077897564542, lat: -3.6213127368165643, c: 465.2252264233413 }

export function latLonToMapCoords(lat: number, lon: number): { x: number; y: number } {
  return {
    x: PROJ_X.lon * lon + PROJ_X.lat * lat + PROJ_X.c,
    y: PROJ_Y.lon * lon + PROJ_Y.lat * lat + PROJ_Y.c,
  }
}

export { vbX, vbY, vbW, vbH }
