import { isMovementBlocked } from './buildingCollision'
import { getCommandPath } from './combat'
import { startNextCommand } from './commands'

export function updateMovement(state, unit, command, deltaTime) {
  if (unit.path.length === 0) {
    if (command.type === 'move') {
      startNextCommand(state, unit)
    }
    return
  }

  let remainingMovement = unit.speed * deltaTime

  while (remainingMovement > 0 && unit.path.length > 0) {
    const nextPoint = unit.path[0]
    const distance = Math.hypot(nextPoint.x - unit.x, nextPoint.y - unit.y)

    if (distance <= remainingMovement) {
      const start = { x: unit.x, y: unit.y }
      const blocked = isMovementBlocked(state, unit, start, nextPoint)

      if (blocked) {
        unit.path = getCommandPath(state, unit, command)
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
      const start = { x: unit.x, y: unit.y }
      const blocked = isMovementBlocked(state, unit, start, nextPosition)

      if (blocked) {
        unit.path = getCommandPath(state, unit, command)
        break
      }

      unit.x = nextPosition.x
      unit.y = nextPosition.y
      remainingMovement = 0
    }
  }

  if (unit.path.length === 0 && command.type === 'move') {
    startNextCommand(state, unit)
  }
}
