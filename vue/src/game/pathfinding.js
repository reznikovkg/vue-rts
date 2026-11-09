// обход объектов: ищем путь по клеткам (A*), потом срезаем лишние повороты
import { stepToTarget, typeOf } from './entities.js'
import { canPlaceUnit, canUseUnitTerrain, isSegmentClear } from './placement.js'

// 8 соседей клетки: 4 по сторонам и 4 по диагонали
const NEIGHBORS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
]

// с таким шагом проверяем отрезок, меньше толщины любого здания
const CHECK_STEP = 0.1

// как далеко от цели ищем свободную клетку, если цель в здании
const MAX_SEARCH_RING = 20
const REPATH_DELAY = 0.5 // между попытками обойти движущееся препятствие, в секундах

const keyOf = (i, j) => `${i},${j}`
const cellOf = (grid, point) => ({ i: Math.round(point.x - grid.origin.x), j: Math.round(point.y - grid.origin.y) })
// цель совпадает с узлом сетки, чтобы можно было подойти к месту внутри плотного строя
const pointOf = (grid, cell) => ({ x: grid.origin.x + cell.i, y: grid.origin.y + cell.j })

// все, что нужно поиску: местность, размер персонажа и остальные объекты
const createGrid = (map, entities, radius, from, origin) => ({
  map, radius, from, origin, unitType: typeOf(from),
  obstacles: entities.filter((entity) => entity.id !== from.id),
})

const isFreeCell = (grid, cell) => isFreePoint(grid, pointOf(grid, cell))

const isFreePoint = (grid, p) => canPlaceUnit(grid.map, grid.obstacles, grid.unitType, p)

// можно ли пройти по прямой: проверяем точки отрезка с маленьким шагом
const canWalkStraight = (grid, from, to) => {
  if (!isFreePoint(grid, to) || !grid.obstacles.every((entity) => isSegmentClear(from, to, grid.radius, entity, grid.unitType))) {
    return false
  }
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / CHECK_STEP)
  for (let k = 1; k <= steps; k++) {
    const t = k / steps
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
    if (!canUseUnitTerrain(grid.map, grid.obstacles, grid.unitType, point)) {
      return false
    }
  }
  return true
}

// цель в здании - ищем ближайшую к ней свободную клетку, обходя кольца вокруг
const nearestFreeCell = (grid, cell) => {
  if (isFreeCell(grid, cell)) {
    return cell
  }

  for (let r = 1; r <= MAX_SEARCH_RING; r++) {
    const ring = []
    for (let i = cell.i - r; i <= cell.i + r; i++) {
      for (let j = cell.j - r; j <= cell.j + r; j++) {
        if (Math.max(Math.abs(i - cell.i), Math.abs(j - cell.j)) === r && isFreeCell(grid, { i, j })) {
          ring.push({ i, j })
        }
      }
    }
    if (ring.length) {
      const dist = (c) => Math.hypot(c.i - cell.i, c.j - cell.j)
      return ring.reduce((best, c) => (dist(c) < dist(best) ? c : best))
    }
  }
  return cell
}

// A*: всегда раскрываем клетку с наименьшим f = пройдено (g) + примерно осталось (h)
// если до цели не дойти, возвращаем путь к самой близкой к ней клетке
const searchCells = (grid, start, goal, reached) => {
  const h = (c) => Math.hypot(c.i - goal.i, c.j - goal.j)
  const startNode = { ...start, g: 0, h: h(start), parent: null }
  const open = [startNode]
  const closed = new Set()
  const bestG = new Map() // лучший найденный g для клетки, чтобы не класть в очередь худшие пути
  let closest = startNode

  while (open.length) {
    const index = open.reduce((best, n, k) => (n.g + n.h < open[best].g + open[best].h ? k : best), 0)
    const node = open.splice(index, 1)[0]
    const key = keyOf(node.i, node.j)
    if (closed.has(key)) {
      continue
    }
    closed.add(key)

    if (node.h < closest.h) {
      closest = node
    }
    if (reached ? reached(node.parent ? pointOf(grid, node) : grid.from) : node.i === goal.i && node.j === goal.j) {
      closest = node
      break
    }

    NEIGHBORS.forEach(([di, dj]) => {
      const next = { i: node.i + di, j: node.j + dj }
      if (closed.has(keyOf(next.i, next.j)) || !isFreeCell(grid, next)) {
        return
      }
      // по диагонали только если обе соседние клетки свободны, иначе срежем угол здания
      if (di && dj && (!isFreeCell(grid, { i: node.i + di, j: node.j }) || !isFreeCell(grid, { i: node.i, j: node.j + dj }))) {
        return
      }
      if (!canWalkStraight(grid, node.parent ? pointOf(grid, node) : grid.from, pointOf(grid, next))) {
        return
      }
      const g = node.g + Math.hypot(di, dj)
      if (g >= (bestG.get(keyOf(next.i, next.j)) ?? Infinity)) {
        return
      }
      bestG.set(keyOf(next.i, next.j), g)
      open.push({ ...next, g, h: h(next), parent: node })
    })
  }

  const cells = []
  for (let node = closest; node; node = node.parent) {
    cells.unshift(node)
  }
  return cells
}

// из точек по клеткам оставляем только повороты: идем по прямой до самой дальней видимой точки
const smoothPath = (grid, points) => {
  const result = []
  let i = 0
  while (i < points.length - 1) {
    let far = i + 1
    if (!canWalkStraight(grid, points[i], points[far])) {
      break
    }
    while (far + 1 < points.length && canWalkStraight(grid, points[i], points[far + 1])) {
      far++
    }
    result.push(points[far])
    i = far
  }
  return result
}

// путь персонажа от from к to в обход объектов: список точек, по которым идти
// цель в здании - идем к ближайшей свободной клетке, цель недостижима - подходим как можно ближе
export const findPath = (map, entities, from, to, radius, reached) => {
  const grid = createGrid(map, entities, radius, from, to)
  if (canWalkStraight(grid, from, to)) {
    return [to]
  }

  const target = cellOf(grid, to)
  const cells = searchCells(grid, cellOf(grid, from), reached ? target : nearestFreeCell(grid, target), reached)
  const points = cells.slice(1).map((cell) => pointOf(grid, cell))

  return smoothPath(grid, [from, ...points])
}

// маршрут текущего приказа: очередь приказов хранится отдельно от точек обхода
export const routeUnit = (map, entities, unit, to, groupIds = [], reached) => {
  const obstacles = entities.filter((entity) => !groupIds.includes(entity.id) || entity.id === unit.id)
  const path = findPath(map, obstacles, unit, to, typeOf(unit).size / 2, reached)
  unit.target = path[0] ?? null
  unit.path = path.slice(1)
  unit.routeGoal = { x: to.x, y: to.y }
  unit.repathDelay = path.length ? 0 : REPATH_DELAY
}

// движение для обычного приказа и погони: местность и столкновения проверяются одинаково
// возвращаем неиспользованное время, если дошли до конца маршрута
export const advanceUnit = (map, entities, unit, dt) => {
  unit.repathDelay = Math.max(0, unit.repathDelay - dt)
  let remaining = dt
  while (unit.target && remaining > 0) {
    const distance = Math.hypot(unit.target.x - unit.x, unit.target.y - unit.y)
    const next = stepToTarget(unit, remaining)
    const type = typeOf(unit)
    const clear = entities.every((entity) => entity.id === unit.id || entity.hp <= 0 || isSegmentClear(unit, next, type.size / 2, entity, type))
    if (clear && canUseUnitTerrain(map, entities, type, next)) {
      Object.assign(unit, next)
      remaining = Math.max(0, remaining - distance / type.speed)
    } else {
      if (!unit.repathDelay) {
        unit.repathDelay = REPATH_DELAY
        const finish = unit.path[unit.path.length - 1] ?? unit.target
        const path = findPath(map, entities.filter((entity) => entity.hp > 0), unit, finish, type.size / 2)
        const last = path[path.length - 1]
        // неполный обход не заменяет цель: в плотной группе ждем, пока соседи пройдут
        if (last && Math.hypot(last.x - finish.x, last.y - finish.y) < 1e-9) {
          unit.target = path[0]
          unit.path = path.slice(1)
        }
      }
      return 0
    }
  }
  return remaining
}
