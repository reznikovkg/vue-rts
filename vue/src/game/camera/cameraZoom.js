import {
  screenDragToCameraWorldDelta,
  screenToWorld,
  worldToScreen,
} from '../world/coordinates.js'

export const CAMERA_ZOOM_MIN = 0.3

export const CAMERA_ZOOM_MAX = 3

export function clampCameraWorldZoom(zoom) {
  return Math.min(CAMERA_ZOOM_MAX, Math.max(CAMERA_ZOOM_MIN, zoom))
}

export function getCameraWorldZoom(camera) {
  return camera.cameraWorldZoom ?? 1
}

export function zoomCameraAtScreenPoint(camera, viewportSize, sx, sy, nextZoom) {
  const anchor = screenToWorld(sx, sy, camera, viewportSize)
  const cameraWorldZoom = clampCameraWorldZoom(nextZoom)
  let nextCamera = { ...camera, cameraWorldZoom }
  const shifted = screenToWorld(sx, sy, nextCamera, viewportSize)
  const { deltaWx, deltaWy } = {
    deltaWx: anchor.wx - shifted.wx,
    deltaWy: anchor.wy - shifted.wy,
  }
  nextCamera = {
    ...nextCamera,
    cameraCenterWx: nextCamera.cameraCenterWx + deltaWx,
    cameraCenterWy: nextCamera.cameraCenterWy + deltaWy,
  }
  return nextCamera
}
