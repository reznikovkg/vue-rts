import { isBlocked, isSegmentFreeStatic, isSweepBlockersFree } from './obstacles'
import type { NavigationOptions } from './obstacles'
import {
  cellToPoint, cellX, cellY, COLS, componentAt, nearestReachableCell, navigationGrid, pointToCell, ROWS,
  withDynamicBlockers,
} from './navigation'
import { COLLISION_EPSILON, findNearestFreePosition, SEARCH_STEP, squareFootprint, unitFootprint } from './spatial'
import type { Point, StaticObject } from './types'

const STEP = SEARCH_STEP

const distance = (a: Point, b: Point) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)

interface PathOptions extends NavigationOptions {
  allowPartial?: boolean // разрешить остановку в ближайшем достижимом узле
}

interface PathNode {
  cell: number
  cost: number // пройденное расстояние
  priority: number // пройденное расстояние + оценка до цели
}

// Двоичная куча: ближайший кандидат A* извлекается за O(log n)
class PathQueue {
  private items: PathNode[] = []

  get length() { return this.items.length }

  push(item: PathNode) {
    let index = this.items.length
    this.items.push(item)
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.items[parent].priority <= item.priority) break
      this.items[index] = this.items[parent]
      index = parent
    }
    this.items[index] = item
  }

  pop() {
    const first = this.items[0]
    const last = this.items.pop()!
    if (this.items.length) {
      let index = 0
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1
        if (child + 1 < this.items.length && this.items[child + 1].priority < this.items[child].priority) child++
        if (last.priority <= this.items[child].priority) break
        this.items[index] = this.items[child]
        index = child
      }
      this.items[index] = last
    }
    return first
  }
}

// Убираем промежуточные точки, если участок можно пройти напрямую.
// Сначала пробуем дальний конец: в чистом поле весь путь схлопывается за одну проверку.
// Иначе двоичным поиском ищем дальнюю видимую точку: прежнее линейное наращивание
// перепроверяло весь отрезок на каждый шаг и стоило квадратично.
// Видимость не строго монотонна, поэтому найденная точка может быть не самой дальней -
// путь от этого лишь чуть менее сглажен, каждый оставленный участок проверен
const smoothPath = (from: Point, points: Point[], free: (a: Point, b: Point) => boolean): Point[] => {
  if (!points.length) return points
  const result: Point[] = []
  const last = points.length - 1
  let anchor = from
  let index = 0
  while (index < last) {
    if (free(anchor, points[last])) break
    // free(anchor, points[index]) уже известно: точка попала в путь проверенным участком
    let lo = index // свободно
    let hi = last // занято: проверили строкой выше
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (free(anchor, points[mid])) lo = mid
      else hi = mid
    }
    result.push(points[lo])
    anchor = points[lo]
    // даже без видимости вперёд соседняя клетка - минимальный шаг:
    // её ребро уже проверено поиском или свободно по построению маски near
    index = lo + 1
  }
  result.push(points[last])
  return result
}

// A* по сетке 25 px. Статика заранее разложена в маски (navigation.ts):
// точная проверка отрезка нужна только у самых препятствий,
// а её вердикт для ребра кэшируется в сетке - группа юнитов и повторные
// приказы идут по тому же коридору без пересчёта геометрии
export const findPath = (
  from: Point, to: Point, objects: readonly StaticObject[], margin: number, options: PathOptions = {},
): Point[] => {
  const blockers = [
    ...(options.units ?? []).filter((unit) => unit.id !== options.ignoreId).map(unitFootprint),
    ...(options.reserved ?? []),
  ]
  const grid = withDynamicBlockers(navigationGrid(objects, margin, options.terrain, options.terrainMap), blockers, margin)
  const { blocked, hidden, near, edge } = grid

  // Проверка отрезка делится на статику и динамику. Статический вердикт зависит
  // только от ключа сетки (объекты, margin, местность), поэтому живёт в кэше edge;
  // юниты и зарезервированные места проверяются на месте - они живут один приказ
  const dynamicFree = (a: Point, b: Point) => isSweepBlockersFree(a, b, blockers, margin)
  const staticFree = (a: Point, b: Point) => isSegmentFreeStatic(a, b, objects, margin, {
    terrain: options.terrain, terrainMap: options.terrainMap,
  })
  const free = (a: Point, b: Point) => staticFree(a, b) && dynamicFree(a, b)
  if (!free(from, from)) return []

  // Старт между узлами соединяем с сеткой только свободными отрезками
  const seeds: number[] = []
  const startCell = pointToCell(from)
  const startCol = startCell % COLS
  const startRow = Math.floor(startCell / COLS)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (startCol + dx < 0 || startCol + dx >= COLS || startRow + dy < 0 || startRow + dy >= ROWS) continue
      const cell = (startRow + dy) * COLS + startCol + dx
      if (!blocked[cell] && free(from, cellToPoint(cell))) seeds.push(cell)
    }
  }
  // Старт в зоне перекрытия выходит наружу, компоненты для него не определены
  const startComponents = new Set(seeds.map((cell) => grid.component[cell]))
  const knownStart = seeds.length > 0 && !startComponents.has(-1)

  // Занятую цель заменяем ближайшей свободной точкой
  let goal = findNearestFreePosition(
    { objects, units: options.units ?? [] }, squareFootprint(to, margin),
    { ...options, accept: (point) => !isBlocked(point, objects, margin, options) },
  )
  // Цель в другой компоненте недостижима: не обходим всю карту, а сразу решаем,
  // отказать в приказе или остановиться у ближайшей достижимой клетки к цели
  if (knownStart && (!goal || !startComponents.has(componentAt(grid, goal)))) {
    if (options.allowPartial === false) return []
    const cell = nearestReachableCell(grid, pointToCell(goal ?? to), startComponents)
    goal = cell === -1 ? null : cellToPoint(cell)
  }
  if (!goal || distance(from, goal) < COLLISION_EPSILON) return []
  if (free(from, goal)) return [goal]

  const goalX = goal.x
  const goalY = goal.y
  const cost = new Float64Array(COLS * ROWS).fill(Infinity)
  const parent = new Int32Array(COLS * ROWS).fill(-1)
  const closed = new Uint8Array(COLS * ROWS)
  const open = new PathQueue()
  for (const cell of seeds) {
    const point = cellToPoint(cell)
    cost[cell] = distance(from, point)
    open.push({ cell, cost: cost[cell], priority: cost[cell] + distance(point, goal) })
  }

  // Переиспользуемые точки клеток: проверки отрезка их только читают
  const cellPt: Point = { x: 0, y: 0 }
  const nextPt: Point = { x: 0, y: 0 }
  let best = -1
  let bestDistance = distance(from, goal)
  let reached = false
  while (open.length) {
    const entry = open.pop()
    const cell = entry.cell
    // Более короткий путь мог добавить новую запись того же узла
    if (closed[cell] || entry.cost !== cost[cell]) continue
    closed[cell] = 1
    const col = cell % COLS
    const row = (cell - col) / COLS
    const px = cellX(col)
    const py = cellY(row)
    const remaining = Math.sqrt((goalX - px) ** 2 + (goalY - py) ** 2)
    if (remaining < bestDistance) {
      best = cell
      bestDistance = remaining
    }
    if (remaining <= STEP * Math.SQRT2) {
      cellPt.x = px
      cellPt.y = py
      if (free(cellPt, goal)) {
        best = cell
        reached = true
        break
      }
    }
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || col + dx < 0 || col + dx >= COLS || row + dy < 0 || row + dy >= ROWS) continue
        const next = cell + dy * COLS + dx
        // В зону перекрытия можно только выйти из неё, но не войти снаружи
        if (closed[next] || blocked[next] || (hidden[next] && !hidden[cell])) continue
        const nextCost = cost[cell] + (dx && dy ? STEP * Math.SQRT2 : STEP)
        if (nextCost >= cost[next]) continue
        // Вдали от препятствий ребро свободно по построению маски. У препятствий
        // динамику (юниты) проверяем по месту, статику берём из кэша сетки.
        // Направление канонизируем к четырём (E, SE, S, SW): обратное ребро - та же пара клеток
        if (near[cell] || near[next]) {
          cellPt.x = px
          cellPt.y = py
          nextPt.x = px + dx * STEP
          nextPt.y = py + dy * STEP
          if (!dynamicFree(cellPt, nextPt)) continue
          const forward = dy === 1 || (dy === 0 && dx === 1)
          const base = forward ? cell : next
          const cdx = forward ? dx : -dx
          const field = forward && dy === 0 ? 0 : cdx === 1 ? 1 : cdx === 0 ? 2 : 3
          const shift = field * 2
          let verdict = (edge[base] >> shift) & 3
          if (!verdict) {
            verdict = staticFree(cellPt, nextPt) ? 1 : 2
            edge[base] = (edge[base] & ~(3 << shift)) | (verdict << shift)
          }
          if (verdict === 2) continue
        }
        cost[next] = nextCost
        parent[next] = cell
        const nx = px + dx * STEP
        const ny = py + dy * STEP
        open.push({ cell: next, cost: nextCost, priority: nextCost + Math.sqrt((goalX - nx) ** 2 + (goalY - ny) ** 2) })
      }
    }
  }

  // Для недостижимой цели возвращаем частичный путь, только если он разрешён
  if (best === -1 || (!reached && options.allowPartial === false)) return []
  const points: Point[] = []
  for (let cell = best; cell !== -1; cell = parent[cell]) points.push(cellToPoint(cell))
  points.reverse()
  if (reached) points.push(goal)
  return smoothPath(from, points, free).filter((point) => distance(from, point) > COLLISION_EPSILON)
}
