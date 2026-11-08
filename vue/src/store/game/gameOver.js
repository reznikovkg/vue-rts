export function remainingGroups(state) {
  const aliveGroups = new Set()

  state.units.forEach(unit => aliveGroups.add(unit.groupId))

  return [...aliveGroups]
}

export function finishIfGameOver(state) {
  const groups = remainingGroups(state)

  if (!state.result && groups.length <= 1) {
    state.result = { winner: groups[0] ?? null }
  }
}
