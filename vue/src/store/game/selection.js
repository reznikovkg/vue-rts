import { findUnit } from './units'

export function setSelection(
  state,
  unitIds = [],
  buildingId = null,
  append = false,
) {
  const selectedIds = unitIds.filter(id => findUnit(state, id))

  state.selectedUnitIds = append
    ? [...new Set([...state.selectedUnitIds, ...selectedIds])]
    : selectedIds
  state.selectedBuildingId = buildingId

  if (buildingId !== null) {
    const building = state.buildings.find(item => item.id === buildingId)
    if (building) state.activeGroup = building.groupId
  }

  const selectedUnit = findUnit(state, state.selectedUnitIds[0])
  state.targetPosition = selectedUnit?.target ?? null
}
