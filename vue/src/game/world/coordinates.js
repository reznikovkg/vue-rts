import {
  ISO_TILE_HEIGHT,
  ISO_TILE_WIDTH,
  WORLD_GRID_SIZE,
} from './worldUnits.js'

function getZoom(camera) {
  return camera.cameraWorldZoom ?? 1
}

function toProjectedPlane(wx, wy, camera) {
  const x = wx - camera.cameraCenterWx
  const y = wy - camera.cameraCenterWy
  return {
    px: ((x - y) / WORLD_GRID_SIZE) * (ISO_TILE_WIDTH / 2),
    py: ((x + y) / WORLD_GRID_SIZE) * (ISO_TILE_HEIGHT / 2),
  }
}

export function worldToScreen(wx, wy, camera, viewportSize) {
  const { width, height } = viewportSize
  const zoom = getZoom(camera)
  const { px, py } = toProjectedPlane(wx, wy, camera)
  return {
    sx: width / 2 + px * zoom,
    sy: height / 2 + py * zoom,
  }
}

export function worldToProjectedPlane(wx, wy, camera) {
  return toProjectedPlane(wx, wy, camera)
}

export function screenToWorld(sx, sy, camera, viewportSize) {
  const { width, height } = viewportSize
  const zoom = getZoom(camera)
  const px = (sx - width / 2) / zoom
  const py = (sy - height / 2) / zoom
  const relWx =
    ((px / (ISO_TILE_WIDTH / 2) + py / (ISO_TILE_HEIGHT / 2)) * WORLD_GRID_SIZE) / 2
  const relWy =
    ((py / (ISO_TILE_HEIGHT / 2) - px / (ISO_TILE_WIDTH / 2)) * WORLD_GRID_SIZE) / 2
  return {
    wx: relWx + camera.cameraCenterWx,
    wy: relWy + camera.cameraCenterWy,
  }
}

export function screenDragToCameraWorldDelta(deltaSx, deltaSy, camera) {
  const zoom = getZoom(camera)
  const px = deltaSx / zoom
  const py = deltaSy / zoom
  return {
    deltaWx: -((px / (ISO_TILE_WIDTH / 2) + py / (ISO_TILE_HEIGHT / 2)) * WORLD_GRID_SIZE) / 2,
    deltaWy: -((py / (ISO_TILE_HEIGHT / 2) - px / (ISO_TILE_WIDTH / 2)) * WORLD_GRID_SIZE) / 2,
  }
}

export function worldAxisCameraStepDelta(axis) {
  const step = WORLD_GRID_SIZE
  if (axis === 'north') {
    return { deltaWx: 0, deltaWy: -step }
  }
  if (axis === 'south') {
    return { deltaWx: 0, deltaWy: step }
  }
  if (axis === 'west') {
    return { deltaWx: -step, deltaWy: 0 }
  }
  return { deltaWx: step, deltaWy: 0 }
}
