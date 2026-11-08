export function createUnit(id, groupId, x, y) {
  return {
    id,
    type: 'unit',
    groupId,
    x,
    y,
    health: 100,
    maxHealth: 100,
    attackPower: 12,
    speed: 110,
    attackSpeed: 1,
    attackCooldown: 0,
    target: null,
    path: [],
    commandQueue: [],
    activeCommand: null,
  }
}

export function findUnit(state, unitId) {
  return state.units.find(unit => unit.id === unitId)
}
