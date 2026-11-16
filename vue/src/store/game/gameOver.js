export const remainingGroups = (state) => {
  const groups = new Set()

  state.units.forEach((unit) => groups.add(unit.groupId))
  state.buildings.forEach((building) => groups.add(building.groupId))

  return [...groups]
}

export const finishIfGameOver = (state) => {
  const groups = remainingGroups(state)

  if (!state.result && groups.length <= 1) {
    state.result = {
      winner: groups[0] ?? null,
    }
  }
}
