import { MAP_FIELD_IS_UNBOUNDED, MAP_LOGICAL_BOUNDS } from '../world/bounds.js'

export function clampCameraWorldCenter(camera) {
  if (MAP_FIELD_IS_UNBOUNDED || MAP_LOGICAL_BOUNDS === null) {
    return camera
  }
  const { minWx, maxWx, minWy, maxWy } = MAP_LOGICAL_BOUNDS
  return {
    ...camera,
    cameraCenterWx: Math.min(maxWx, Math.max(minWx, camera.cameraCenterWx)),
    cameraCenterWy: Math.min(maxWy, Math.max(minWy, camera.cameraCenterWy)),
  }
}
