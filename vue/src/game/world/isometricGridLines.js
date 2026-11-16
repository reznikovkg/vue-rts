import { worldToProjectedPlane } from './coordinates.js'
import { WORLD_MAP_HALF_EXTENT } from './bounds.js'
import { WORLD_GRID_SIZE } from './worldUnits.js'

export function buildMapOutlinePoints(camera) {
  return [
    worldToProjectedPlane(-WORLD_MAP_HALF_EXTENT, -WORLD_MAP_HALF_EXTENT, camera),
    worldToProjectedPlane(WORLD_MAP_HALF_EXTENT, -WORLD_MAP_HALF_EXTENT, camera),
    worldToProjectedPlane(WORLD_MAP_HALF_EXTENT, WORLD_MAP_HALF_EXTENT, camera),
    worldToProjectedPlane(-WORLD_MAP_HALF_EXTENT, WORLD_MAP_HALF_EXTENT, camera),
  ]
    .map((point) => `${point.px},${point.py}`)
    .join(' ')
}

export function buildIsometricGridLines(camera) {
  const lines = []

  for (
    let worldX = -WORLD_MAP_HALF_EXTENT + WORLD_GRID_SIZE;
    worldX < WORLD_MAP_HALF_EXTENT;
    worldX += WORLD_GRID_SIZE
  ) {
    const start = worldToProjectedPlane(worldX, -WORLD_MAP_HALF_EXTENT, camera)
    const end = worldToProjectedPlane(worldX, WORLD_MAP_HALF_EXTENT, camera)
    lines.push({
      x1: start.px,
      y1: start.py,
      x2: end.px,
      y2: end.py,
      isAxis: worldX === 0,
    })
  }

  for (
    let worldY = -WORLD_MAP_HALF_EXTENT + WORLD_GRID_SIZE;
    worldY < WORLD_MAP_HALF_EXTENT;
    worldY += WORLD_GRID_SIZE
  ) {
    const start = worldToProjectedPlane(-WORLD_MAP_HALF_EXTENT, worldY, camera)
    const end = worldToProjectedPlane(WORLD_MAP_HALF_EXTENT, worldY, camera)
    lines.push({
      x1: start.px,
      y1: start.py,
      x2: end.px,
      y2: end.py,
      isAxis: worldY === 0,
    })
  }

  return lines
}
