import { canMoveTo } from './collision'
import { getPath } from './pathfinding'
import { startNextCommand } from './commands'

export const updateMovement = (state, unit, command, deltaTime) => {
  if (!unit.path.length) {
    if (command.type === 'move') {
      startNextCommand(state, unit)
    }
    return
  }

  let remainingMovement = (unit.speed ?? 0) * deltaTime

  while (remainingMovement > 0 && unit.path.length > 0) {
    const nextPoint = unit.path[0]
    const distance = Math.hypot(
      nextPoint.x - unit.x,
      nextPoint.y - unit.y,
    )

    if (distance <= remainingMovement) {
      if (!canMoveTo(state, unit, nextPoint)) {
        unit.path = getPath(state, unit, unit.target ?? nextPoint) ?? []
        break
      }

      unit.x = nextPoint.x
      unit.y = nextPoint.y
      unit.path.shift()
      remainingMovement -= distance
    } else {
      const nextPosition = {
        x: unit.x + ((nextPoint.x - unit.x) / distance) * remainingMovement,
        y: unit.y + ((nextPoint.y - unit.y) / distance) * remainingMovement,
      }

      if (!canMoveTo(state, unit, nextPosition)) {
        unit.path = getPath(state, unit, unit.target ?? nextPoint) ?? []
        break
      }

      unit.x = nextPosition.x
      unit.y = nextPosition.y
      remainingMovement = 0
    }
  }

  if (!unit.path.length && command.type === 'move') {
    startNextCommand(state, unit)
  }
}
