import { setSelection } from './selection'

export const handleAssignGroup = (state, event) => {
  state.units.forEach(unit => {
    if (event.unitIds.includes(unit.id)) unit.groupId = event.groupId
  })
}

export const handleSelectGroup = (state, event) => {
  state.activeGroup = event.groupId
  setSelection(
    state,
    state.units
      .filter(unit => unit.groupId === event.groupId)
      .map(unit => unit.id),
  )
}
