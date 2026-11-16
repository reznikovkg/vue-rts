import { findUnit } from './units'

export const setSelection = (
  state,
  unitIds = [],
  buildingId = null,
  append = false,
) => {
  const validIds = unitIds.filter((id) => Boolean(findUnit(state, id)))
  state.selectedUnitIds = append
    ? [...new Set([...state.selectedUnitIds, ...validIds])]
    : validIds

  if (append && validIds.length === 1) {
    const unitId = validIds[0]
    const alreadySelected = state.selectedUnitIds.includes(unitId)

    state.selectedUnitIds = alreadySelected
        ? state.selectedUnitIds.filter((id) => id !== unitId)
        : [...state.selectedUnitIds, unitId]
  }

  state.selectedBuildingId = buildingId

  if (buildingId !== null) {
    const building = state.buildings.find((item) => item.id === buildingId)
    if (building) state.activeGroup = building.groupId
  }

  const firstUnit = findUnit(state, state.selectedUnitIds[0])
  state.targetPosition = firstUnit?.target ?? null
}

export const clearSelection = (state) => {
  state.selectedUnitIds = []
  state.selectedBuildingId = null
  state.targetPosition = null
}
