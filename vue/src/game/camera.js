const TILE = 64 // ширина клетки-ромба при zoom = 1, px
const MIN_ZOOM = 0.1
const MAX_ZOOM = 3

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export const createCamera = () => ({ x: 0, y: 0, zoom: 1 })

const scale = (camera) => (TILE / 2) * camera.zoom

// мир -> экран
export const worldToScreen = (camera, viewport, p) => {
  const s = scale(camera)
  const dx = p.x - camera.x
  const dy = p.y - camera.y
  return { x: (dx - dy) * s + viewport.width / 2, y: ((dx + dy) * s) / 2 + viewport.height / 2 }
}

// экран -> мир (обратная формула)
export const screenToWorld = (camera, viewport, p) => {
  const s = scale(camera)
  const a = (p.x - viewport.width / 2) / s // dx - dy
  const b = ((p.y - viewport.height / 2) * 2) / s // dx + dy
  return { x: camera.x + (a + b) / 2, y: camera.y + (b - a) / 2 }
}

export const cameraMatrix = (camera, viewport) => {
  const s = scale(camera)
  const e = viewport.width / 2 - s * (camera.x - camera.y)
  const f = viewport.height / 2 - (s / 2) * (camera.x + camera.y)
  return `matrix(${s} ${s / 2} ${-s} ${s / 2} ${e} ${f})`
}

const keepInside = (camera, bounds) => ({
  ...camera,
  x: clamp(camera.x, bounds.minX, bounds.maxX),
  y: clamp(camera.y, bounds.minY, bounds.maxY),
})

export const panCamera = (camera, viewport, { dx, dy }, bounds) => {
  const center = screenToWorld(camera, viewport, { x: viewport.width / 2 + dx, y: viewport.height / 2 + dy })
  return keepInside({ ...camera, ...center }, bounds)
}

export const zoomCamera = (camera, viewport, { point, factor }, bounds) => {
  const before = screenToWorld(camera, viewport, point)
  const zoomed = { ...camera, zoom: clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM) }
  const after = screenToWorld(zoomed, viewport, point)
  return keepInside({ ...zoomed, x: zoomed.x + before.x - after.x, y: zoomed.y + before.y - after.y }, bounds)
}