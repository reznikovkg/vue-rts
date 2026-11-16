import { isWorldPointInsideMap } from './bounds.js'

/** Move one mobile object by speed * elapsedSeconds toward its destination. */
export function advanceGameObject(object, elapsedSeconds) {
  if (!object.destination || !Number.isFinite(object.stats?.speed) || object.stats.speed <= 0) {
    return object
  }

  const dx = object.destination.wx - object.wx
  const dy = object.destination.wy - object.wy
  const distance = Math.hypot(dx, dy)
  const step = object.stats.speed * Math.max(0, elapsedSeconds)

  if (distance === 0 || distance <= step) {
    object.wx = object.destination.wx
    object.wy = object.destination.wy
    object.destination = null
  } else if (step > 0) {
    object.wx += (dx / distance) * step
    object.wy += (dy / distance) * step
  }

  return object
}

export function clampDestinationToMap(wx, wy) {
  if (isWorldPointInsideMap(wx, wy)) return { wx, wy }
  return null
}
