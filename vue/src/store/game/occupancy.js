import { MAP_RADIUS, TILE_SIZE, tileAt } from './terrain'
import { getCollisionCircles } from './buildingCollision'
import { positionIntersectsCircle } from './collision'

export function isCellBlocked(
  state,
  col,
  row,
  unitId,
  reservedCells,
  escapeStart = null,
  collisionCircles = getCollisionCircles(state, unitId),
) {
  if (Math.abs(col) > MAP_RADIUS || Math.abs(row) > MAP_RADIUS) {
    return true
  }

  const tile = tileAt(state, col, row)
  if (!tile || tile.type !== 'land' || reservedCells.has(`${col}:${row}`)) {
    return true
  }

  const position = { x: col * TILE_SIZE, y: row * TILE_SIZE }

  return collisionCircles.some(circle =>
    positionIntersectsCircle(position, circle, escapeStart),
  )
}
