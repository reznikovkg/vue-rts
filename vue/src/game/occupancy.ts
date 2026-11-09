import type { Unit } from './Unit'
import { worldWidth, worldHeight, gridSize, worldToScreen, screenToWorld } from './map'
import { overlapsWater } from './terrain'

// Includes the 1px outline around the character's SVG circle.
export const UNIT_RADIUS = 11

export type MapObject = {
  id: number
  x: number
  y: number
  size: number
  group: number
  maxHealth: number
  health: number
}

type Point = {
  x: number
  y: number
}

type Place = Point & { radius: number }

export const objectHalf = (object: { size: number }) => object.size * gridSize / 2

export const objectCorners = (object: Point & { size: number }) => {
  const half = objectHalf(object)
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    .map(([sx, sy]) => worldToScreen(object.x + sx * half, object.y + sy * half))
}

const pointToSegment = (point: Point, a: Point, b: Point) => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const part = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(point.x - a.x - dx * part, point.y - a.y - dy * part)
}

const side = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

const crosses = (a: Point, b: Point, c: Point, d: Point) =>
  side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0

const isInside = (point: Point, object: MapObject) => {
  const world = screenToWorld(point.x, point.y)
  const half = objectHalf(object)
  return Math.abs(world.x - object.x) <= half && Math.abs(world.y - object.y) <= half
}

// Screen distance between a segment (from, to) and the building footprint.
export const distanceToObject = (from: Point, to: Point, object: MapObject) => {
  if (isInside(from, object) || isInside(to, object)) return 0
  const corners = objectCorners(object)
  const edges = corners.map((corner, index) => [corner, corners[(index + 1) % corners.length]])
  if (edges.some(([c, d]) => crosses(from, to, c, d))) return 0
  return Math.min(
    ...edges.map(([c, d]) => Math.min(pointToSegment(from, c, d), pointToSegment(to, c, d))),
    ...corners.map(corner => pointToSegment(corner, from, to)),
  )
}

export const canOccupy = (
  x: number,
  y: number,
  radius: number,
  units: Unit[],
  objects: MapObject[],
  ignoredUnitIds: number[] = [],
  reserved: Place[] = [],
) => {
  const point = worldToScreen(x, y)
  const overlaps = (other: Place) => {
    const otherPoint = worldToScreen(other.x, other.y)
    return Math.hypot(point.x - otherPoint.x, point.y - otherPoint.y) < radius + other.radius - 0.01
  }

  return !units.some(unit => !ignoredUnitIds.includes(unit.id)
      && overlaps({ x: unit.x, y: unit.y, radius: UNIT_RADIUS }))
    && !objects.some(object => distanceToObject(point, point, object) < radius - 0.01)
    && !reserved.some(overlaps)
}

export const snapObject = (x: number, y: number, size: number) => {
  const left = Math.round(x / gridSize - size / 2) * gridSize
  const top = Math.round(y / gridSize - size / 2) * gridSize
  return { x: left + size * gridSize / 2, y: top + size * gridSize / 2 }
}

export const canPlaceObject = (object: Point & { size: number }, units: Unit[], objects: MapObject[]) => {
  const half = objectHalf(object)
  if (Math.abs(object.x) + half > worldWidth / 2 || Math.abs(object.y) + half > worldHeight / 2) return false
  if (overlapsWater(object.x - half, object.y - half, object.x + half, object.y + half)) return false
  const footprint = { ...object, id: 0, group: 0, maxHealth: 0, health: 0 }
  return !objects.some(other => {
    const limit = half + objectHalf(other)
    return Math.abs(other.x - object.x) < limit && Math.abs(other.y - object.y) < limit
  }) && !units.some(unit => {
    const point = worldToScreen(unit.x, unit.y)
    return distanceToObject(point, point, footprint) < UNIT_RADIUS
  })
}

export const findFreePosition = (
  x: number,
  y: number,
  units: Unit[],
  objects: MapObject[],
  ignoredUnitIds: number[],
  reserved: Place[],
  allowed: (x: number, y: number) => boolean = () => true,
) => {
  const center = worldToScreen(x, y)
  const step = UNIT_RADIUS * 2

  for (let ring = 0; ring <= 8; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue

        const point = screenToWorld(center.x + dx * step, center.y + dy * step)
        if (Math.abs(point.x) > worldWidth / 2 || Math.abs(point.y) > worldHeight / 2) continue
        if (!allowed(point.x, point.y)) continue
        if (canOccupy(point.x, point.y, UNIT_RADIUS, units, objects, ignoredUnitIds, reserved)) {
          return point
        }
      }
    }
  }

  return null
}
