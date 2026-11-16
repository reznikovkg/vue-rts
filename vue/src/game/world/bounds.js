import { buildingHalfExtent } from './worldUnits.js'

export const WORLD_MAP_HALF_EXTENT = 2400

export const MAP_FIELD_IS_UNBOUNDED = false

export const MAP_LOGICAL_BOUNDS = Object.freeze({
  minWx: -WORLD_MAP_HALF_EXTENT,
  maxWx: WORLD_MAP_HALF_EXTENT,
  minWy: -WORLD_MAP_HALF_EXTENT,
  maxWy: WORLD_MAP_HALF_EXTENT,
})

export function isWorldPointInsideMap(wx, wy) {
  if (MAP_FIELD_IS_UNBOUNDED || MAP_LOGICAL_BOUNDS === null) {
    return true
  }
  const { minWx, maxWx, minWy, maxWy } = MAP_LOGICAL_BOUNDS
  return wx >= minWx && wx <= maxWx && wy >= minWy && wy <= maxWy
}

export function isBuildingInsideMap(wx, wy, sizeN) {
  const half = buildingHalfExtent(sizeN)
  return (
      isWorldPointInsideMap(wx - half, wy - half) &&
      isWorldPointInsideMap(wx + half, wy - half) &&
      isWorldPointInsideMap(wx + half, wy + half) &&
      isWorldPointInsideMap(wx - half, wy + half)
  )
}

export function clampWorldPointToMap(wx, wy) {
  if (MAP_FIELD_IS_UNBOUNDED || MAP_LOGICAL_BOUNDS === null) {
    return { wx, wy }
  }
  const { minWx, maxWx, minWy, maxWy } = MAP_LOGICAL_BOUNDS
  return {
    wx: Math.min(maxWx, Math.max(minWx, wx)),
    wy: Math.min(maxWy, Math.max(minWy, wy)),
  }
}