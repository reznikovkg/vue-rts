import { TILE_SIZE } from './terrain'
import { BUILDING_TYPES, canBuildAt, createBuilding } from './buildings'

export function handleBuildMode(state, event) {
  state.buildMode = event.buildingType
}

export function handleBuild(state, event) {
  const definition = BUILDING_TYPES[event.buildingType]
  if (!definition) return

  const offset = (definition.size - 1) / 2
  const gridX = Math.round(event.position.x / TILE_SIZE - offset)
  const gridY = Math.round(event.position.y / TILE_SIZE - offset)

  if (!canBuildAt(state, event.buildingType, gridX, gridY)) return

  state.buildings.push(createBuilding(
    state.nextBuildingId++,
    event.groupId,
    event.buildingType,
    gridX,
    gridY,
  ))
  state.buildMode = null
}

export function handleSelfDestruct(state, event) {
  const selectedIds = new Set(event.unitIds)

  state.units = state.units.filter(unit => !selectedIds.has(unit.id))
  state.selectedUnitIds = state.selectedUnitIds.filter(
    id => !selectedIds.has(id),
  )

  if (state.selectedUnitIds.length === 0) {
    state.targetPosition = null
  }
}
