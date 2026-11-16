import {
  MAP_RADIUS,
  tileAt,
  buildingCoversCell,
  worldToCell,
} from './terrain'

export const isCellBlocked = (
  state,
  col,
  row,
  unitId = null,
  reservedCells = new Set(),
) => {
  if (Math.abs(col) > MAP_RADIUS || Math.abs(row) > MAP_RADIUS) {
    return true
  }

  const tile = tileAt(state, col, row)

  if (!tile || tile.type !== 'land' || reservedCells.has(`${col}:${row}`)) {
    return true
  }

  if (state.buildings.some((building) =>
    buildingCoversCell(building, col, row),
  )) {
    return true
  }

  return state.units.some((unit) => {
    if (unit.id === unitId) return false

    const unitCell = worldToCell(unit.x, unit.y)

    return unitCell.col === col && unitCell.row === row
  })
}
