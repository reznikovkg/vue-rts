import { TILE_SIZE } from './terrain'
import { collisionDistance } from './collision'
import { getPath } from './pathfinding'

export const findTarget = (state, targetType, targetId) => {
  const collection = targetType === 'building' ? state.buildings : state.units

  return collection.find(entity => entity.id === targetId)
}

export const getAttackRange = (targetType, target) => {
  return targetType === 'building' ? 55 + target.size * TILE_SIZE * 0.6 : 65
}

export const getAttackPath = (state, unit, target, targetType) => {
  return getPath(state, unit, target, new Set(), getAttackRange(targetType, target))
}

export const getCommandPath = (state, unit, command) => {
  if (command.type === 'attack') {
    const target = findTarget(state, command.targetType, command.targetId)

    return target ? getAttackPath(state, unit, target, command.targetType) ?? [] : []
  }

  return getPath(state, unit, command.destination) ?? []
}

export const updateAttack = (state, unit, command, deltaTime, startNextCommand,) => {
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
    unit.attackCooldown -= deltaTime

    if (unit.attackCooldown <= 0) {
      target.health -= unit.attackPower
      unit.attackCooldown = 1 / unit.attackSpeed

      if (target.health <= 0) {
        if (command.targetType === 'building') {
          state.buildings = state.buildings.filter(item => item.id !== target.id)
          if (state.selectedBuildingId === target.id) {
            state.selectedBuildingId = null
          }
        } else {
          state.units = state.units.filter(item => item.id !== target.id)
          state.selectedUnitIds = state.selectedUnitIds.filter(
            id => id !== target.id,
          )
        }
        startNextCommand(state, unit)
      }
    }

    return true
  }

  const endpoint = unit.path[unit.path.length - 1]
  if (
    !endpoint ||
    collisionDistance(endpoint, target) > attackRange
  ) {
    unit.path = getAttackPath(state, unit, target, command.targetType) ?? []
  }
  unit.target = { x: target.x, y: target.y }

  return false
}
