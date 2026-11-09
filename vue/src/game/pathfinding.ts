import { worldWidth, worldHeight, worldToScreen, screenToWorld } from './map'
import { UNIT_RADIUS, distanceToObject, objectHalf, type MapObject } from './occupancy'
import { getTerrain, type Terrain } from './terrain'

type Point = { x: number; y: number }

// Try a direct line first, then the corners around each building.
export const findPath = (start: Point, target: Point, objects: MapObject[], terrain: Terrain): Point[] | null => {
  const valid = (point: Point) => Math.abs(point.x) <= worldWidth / 2 && Math.abs(point.y) <= worldHeight / 2
    && getTerrain(point.x, point.y) === terrain
  const clear = (from: Point, to: Point) => {
    if (!valid(from) || !valid(to)) return false
    const a = worldToScreen(from.x, from.y)
    const b = worldToScreen(to.x, to.y)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const length = Math.hypot(dx, dy)
    for (let i = 1; i < Math.ceil(length / 8); i++) {
      const world = screenToWorld(a.x + dx * i * 8 / length, a.y + dy * i * 8 / length)
      if (getTerrain(world.x, world.y) !== terrain) return false
    }
    return objects.every(object => distanceToObject(a, b, object) >= UNIT_RADIUS - 0.01)
  }
  const distance = (a: Point, b: Point) => {
    const from = worldToScreen(a.x, a.y)
    const to = worldToScreen(b.x, b.y)
    return Math.hypot(to.x - from.x, to.y - from.y)
  }

  if (clear(start, target)) return [target]

  const axisX = worldToScreen(1, 0)
  const axisY = worldToScreen(0, 1)
  const gap = (UNIT_RADIUS + 2) * Math.hypot(axisY.x, axisY.y) / Math.abs(axisX.x * axisY.y - axisX.y * axisY.x)
  const points: Point[] = [start, target]
  objects.forEach(object => {
    const offset = objectHalf(object) + gap
    ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      const point = { x: object.x + sx * offset, y: object.y + sy * offset }
      if (valid(point)) points.push(point)
    })
  })

  // Dijkstra on these few points chooses the shorter side of the obstacle.
  const distances = points.map((_, index) => index === 0 ? 0 : Infinity)
  const previous = points.map(() => -1)
  const visited = points.map(() => false)
  for (let count = 0; count < points.length; count++) {
    let current = -1
    for (let i = 0; i < points.length; i++) {
      if (!visited[i] && (current === -1 || distances[i] < distances[current])) current = i
    }
    if (current === -1 || distances[current] === Infinity || current === 1) break
    visited[current] = true
    for (let next = 1; next < points.length; next++) {
      if (visited[next] || !clear(points[current], points[next])) continue
      const total = distances[current] + distance(points[current], points[next])
      if (total < distances[next]) {
        distances[next] = total
        previous[next] = current
      }
    }
  }
  if (previous[1] === -1) return null
  const path: Point[] = []
  for (let index = 1; index !== 0; index = previous[index]) {
    path.unshift(points[index])
  }
  return path
}
