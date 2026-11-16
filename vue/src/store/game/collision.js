export const collisionDistance = (first, second) =>
    Math.hypot(second.x - first.x, second.y - first.y)

import {TILE_SIZE, worldToCell} from './terrain'
import {isCellBlocked} from './occupancy'

export const canMoveTo = (state, unit, nextPosition) => {
  const cell = worldToCell(nextPosition.x, nextPosition.y)

  if (isCellBlocked(state, cell.col, cell.row, unit.id)) {
    return false
  }

  return state.units.every((other) => {
    if (other.id === unit.id) return true

    return collisionDistance(other, nextPosition) >= TILE_SIZE * 0.55
  })
}







