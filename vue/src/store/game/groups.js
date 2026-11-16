import { setSelection } from './selection'

export const GROUP_COLORS = [
  '#4f7cff',
  '#e05a4f',
  '#49b36b',
  '#d6a13a',
  '#a45bd3',
  '#2fb6b0'
]

export const getGroupColor = (groupId) => GROUP_COLORS[(Math.max(1, groupId) - 1) % GROUP_COLORS.length]

export const handleAssignGroup = (state, event) => {
  state.units.forEach((unit) => {
    if (event.unitIds.includes(unit.id)) {
      unit.groupId = event.groupId
    }
  })
}

export const handleSelectGroup = (state, event) => {
  state.activeGroup = event.groupId
  setSelection(
    state,
    state.units
      .filter((unit) => unit.groupId === event.groupId)
      .map((unit) => unit.id)
  )
}
