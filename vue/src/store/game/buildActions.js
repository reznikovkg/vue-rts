import {
  TILE_SIZE,
  worldToCell,
  tileAt,
  buildingCoversCell,
} from './terrain'
import { BUILDING_TYPES, createBuilding } from './buildings'

export const canBuildAt = (state, type, gridX, gridY) => {
  const definition = BUILDING_TYPES[type]

  if (!definition) return false

  for (let row = gridY; row < gridY + definition.size; row += 1) {
    for (let col = gridX; col < gridX + definition.size; col += 1) {
      const tile = tileAt(state, col, row)

      if (!tile || tile.type !== 'land') return false

      if (state.buildings.some((building) =>
        buildingCoversCell(building, col, row),
      )) {
        return false
      }

      if (state.units.some((unit) => {
        const cell = worldToCell(unit.x, unit.y)
        return cell.col === col && cell.row === row
      })) {
        return false
      }
    }
  }

  return true
}

export const handleBuildMode = (state, event) => {
  state.buildMode = event.buildingType ?? null
}

export const handleBuild = (state, event) => {
  const definition = BUILDING_TYPES[event.buildingType]

  if (!definition) return

  const offset = (definition.size - 1) / 2
  const gridX = Math.round(event.position.x / TILE_SIZE - offset)
  const gridY = Math.round(event.position.y / TILE_SIZE - offset)

  if (!canBuildAt(state, event.buildingType, gridX, gridY)) return

  state.buildings.push(createBuilding(
    state.nextBuildingId++,
    event.groupId ?? state.activeGroup,
    event.buildingType,
    gridX,
    gridY,
  ))
  state.buildMode = null
}

export const handleSelfDestruct = (state, event) => {
  const selectedIds = new Set(event.unitIds)

  state.units = state.units.filter((unit) => !selectedIds.has(unit.id))
  state.selectedUnitIds = state.selectedUnitIds.filter(
    (id) => !selectedIds.has(id),
  )

  if (state.selectedUnitIds.length === 0) {
    state.targetPosition = null
  }
}
