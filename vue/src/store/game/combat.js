import { getPath } from './pathfinding'
import { collisionDistance } from './collision'

export const findTarget = (state, targetType, targetId) => {
  const collection = targetType === 'building' ? state.buildings : state.units

  return collection.find((entity) => entity.id === targetId)
}

export const getAttackRange = (targetType, target) =>
  targetType === 'building' ? 55 + (target.size ?? 2) * 30 : 65

const removeTarget = (state, targetType, target) => {
  if (targetType === 'building') {
    state.buildings = state.buildings.filter((building) => building.id !== target.id)
    if (state.selectedBuildingId === target.id) {
      state.selectedBuildingId = null
    }
    return
  }

  state.units = state.units.filter((unit) => unit.id !== target.id)
  state.selectedUnitIds = state.selectedUnitIds.filter((id) => id !== target.id)
}

export const updateAttack = (state, unit, command, deltaTime, startNextCommand) => {
  const target = findTarget(state, command.targetType, command.targetId)

  if (!target || target.groupId === unit.groupId) {
    startNextCommand(state, unit)
    return true
  }

  const distance = collisionDistance(target, unit)
  const attackRange = getAttackRange(command.targetType, target)

  if (distance <= attackRange) {
    unit.path = []
    unit.target = { x: target.x, y: target.y }
    unit.attackCooldown = (unit.attackCooldown ?? 0) - deltaTime

    if (unit.attackCooldown <= 0) {
      target.health = (target.health ?? 0) - (unit.attackPower ?? 0)
      unit.attackCooldown = 1 / Math.max(0.1, unit.attackSpeed ?? 1)

      if (target.health <= 0) {
        removeTarget(state, command.targetType, target)
        startNextCommand(state, unit)
      }
    }

    return true
  }

  const endpoint = unit.path[unit.path.length - 1]

  if (!endpoint || collisionDistance(endpoint, target) > attackRange) {
    unit.path = getPath(state, unit, { x: target.x, y: target.y }) ?? []
  }

  unit.target = { x: target.x, y: target.y }

  return false
}
