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
