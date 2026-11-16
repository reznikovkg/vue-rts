import { TILE_SIZE, worldToCell } from './terrain'
import { findUnit } from './units'
import { getPath } from './pathfinding'

const FORMATION_OFFSETS = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
]

const getFormationDestination = (destination, index) => {
  const offset = FORMATION_OFFSETS[index % FORMATION_OFFSETS.length]

  return {
    x: destination.x + offset.x * TILE_SIZE,
    y: destination.y + offset.y * TILE_SIZE,
  }
}

const reserveDestination = (unit, reservedCells) => {
  if (!unit.path.length) return

  const endpoint = unit.path[unit.path.length - 1]
  const cell = worldToCell(endpoint.x, endpoint.y)
  reservedCells.add(`${cell.col}:${cell.row}`)
}

export const startCommand = (
  state,
  unit,
  command,
  reservedCells = new Set(),
) => {
  unit.activeCommand = command
  unit.target = null

  if (command.type === 'move' || command.type === 'attack') {
    unit.path = getPath(state, unit, command.destination, reservedCells) ?? []
  }

  unit.target = unit.path.length
    ? unit.path[unit.path.length - 1]
    : null

  if (state.selectedUnitIds.includes(unit.id)) {
    state.targetPosition = unit.target
  }
}

export const startNextCommand = (state, unit) => {
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

export const orderUnits = (state, unitIds, command, append) => {
  const reservedCells = new Set()

  unitIds.forEach((unitId, index) => {
    const unit = findUnit(state, unitId)

    if (!unit) return

    if (append && unit.activeCommand) {
      unit.commandQueue.push({ ...command })
      return
    }

    unit.commandQueue = []

    const nextCommand = command.type === 'move' && unitIds.length > 1
      ? {
          ...command,
          destination: getFormationDestination(command.destination, index),
        }
      : { ...command }

    startCommand(state, unit, nextCommand, reservedCells)
    reserveDestination(unit, reservedCells)
  })
}
