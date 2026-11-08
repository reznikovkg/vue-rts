import { TILE_SIZE } from './terrain'
import { findUnit } from './units'
import { getPath } from './pathfinding'
import { findTarget, getAttackPath } from './combat'

export function startCommand(
  state,
  unit,
  command,
  reservedCells = new Set(),
) {
  unit.activeCommand = command
  unit.target = null

  if (command.type === 'move') {
    unit.path = getPath(state, unit, command.destination, reservedCells) ?? []
    unit.target = unit.path.length > 0
      ? unit.path[unit.path.length - 1]
      : null
  } else if (command.type === 'attack') {
    const target = findTarget(state, command.targetType, command.targetId)

    if (!target || target.groupId === unit.groupId) {
      unit.activeCommand = null
      startNextCommand(state, unit)
      return
    }

    unit.path = getAttackPath(state, unit, target, command.targetType) ?? []
    unit.target = { x: target.x, y: target.y }
  }

  if (state.selectedUnitIds.includes(unit.id)) {
    state.targetPosition = unit.target
  }
}

export function startNextCommand(state, unit) {
  const nextCommand = unit.commandQueue.shift()

  unit.activeCommand = null
  unit.target = null
  unit.path = []

  if (nextCommand) {
    startCommand(state, unit, nextCommand)
  } else if (state.selectedUnitIds.includes(unit.id)) {
    state.targetPosition = null
  }
}

export function orderUnits(state, unitIds, command, append) {
  const reservedCells = new Set()

  for (const unitId of unitIds) {
    const unit = findUnit(state, unitId)
    if (!unit) continue

    if (append && unit.activeCommand) {
      unit.commandQueue.push({ ...command })
      continue
    }

    unit.commandQueue = []
    startCommand(state, unit, { ...command }, reservedCells)

    if (command.type === 'move' && unit.path.length) {
      const endpoint = unit.path[unit.path.length - 1]

      for (let row = -1; row <= 1; row++) {
        for (let col = -1; col <= 1; col++) {
          reservedCells.add(
            `${Math.round(endpoint.x / TILE_SIZE) + col}:${Math.round(endpoint.y / TILE_SIZE) + row}`,
          )
        }
      }
    }
  }
}
