export const UNIT_COLLISION_RADIUS = 18
export const UNIT_SEPARATION = UNIT_COLLISION_RADIUS * 2

export function toCollisionSpace(position) {
  return {
    x: (position.x - position.y) / 2,
    y: (position.x + position.y) / 4,
  }
}

export function collisionDistance(first, second) {
  const firstPosition = toCollisionSpace(first)
  const secondPosition = toCollisionSpace(second)

  return Math.hypot(
    firstPosition.x - secondPosition.x,
    firstPosition.y - secondPosition.y,
  )
}

export function isMovingOutOfCircle(start, end, circle) {
  const collisionStart = toCollisionSpace(start)
  const collisionEnd = toCollisionSpace(end)
  const startX = collisionStart.x - circle.x
  const startY = collisionStart.y - circle.y
  const endX = collisionEnd.x - circle.x
  const endY = collisionEnd.y - circle.y
  const startDistanceSquared = startX * startX + startY * startY
  const endDistanceSquared = endX * endX + endY * endY
  const movementDot = (collisionEnd.x - collisionStart.x) * startX +
    (collisionEnd.y - collisionStart.y) * startY

  return startDistanceSquared <= circle.radius * circle.radius &&
    endDistanceSquared > startDistanceSquared + Number.EPSILON &&
    movementDot >= -Number.EPSILON
}

export function positionIntersectsCircle(position, circle, escapeStart = null) {
  const collisionPosition = toCollisionSpace(position)
  const deltaX = collisionPosition.x - circle.x
  const deltaY = collisionPosition.y - circle.y
  const intersects =
    deltaX * deltaX + deltaY * deltaY <= circle.radius * circle.radius

  return intersects && !(
    escapeStart && isMovingOutOfCircle(escapeStart, position, circle)
  )
}

export function segmentIntersectsCircle(start, end, circle) {
  if (isMovingOutOfCircle(start, end, circle)) return false

  const collisionStart = toCollisionSpace(start)
  const collisionEnd = toCollisionSpace(end)
  const deltaX = collisionEnd.x - collisionStart.x
  const deltaY = collisionEnd.y - collisionStart.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(
      1,
      ((circle.x - collisionStart.x) * deltaX +
        (circle.y - collisionStart.y) * deltaY) /
        lengthSquared,
    ))
  const nearestX = collisionStart.x + projection * deltaX
  const nearestY = collisionStart.y + projection * deltaY
  const offsetX = nearestX - circle.x
  const offsetY = nearestY - circle.y

  return offsetX * offsetX + offsetY * offsetY <= circle.radius * circle.radius
}
