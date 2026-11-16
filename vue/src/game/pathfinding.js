// Поиск обходного пути вокруг зданий и озера: сетка шагом gridSize + A* по четырём направлениям.
// Путь вычисляется один раз — когда событие начинает выполняться — и живёт внутри этого же события.
// Клетка занята, если юнит (без canSwim) в её центре задевает здание или стоит на воде; путь между
// соседними свободными клетками тогда гарантированно чист, а сглаживание прямыми проверяется по точкам.
import { circleOverlapsBuilding } from './objects.js'
import { isWater } from './terrain.js'

// Шаг проверки отрезка на чистоту: меньше радиуса юнита, чтобы не перескочить препятствие.
// Запас к радиусу компенсирует погрешность проверки по точкам (до половины шага, ≤ 3px):
// движение идёт точным stepToward, поэтому реальный зазор должен оставаться больше радиуса.
const CLEAR_STEP = 6
const CLEAR_MARGIN = 4

// Препятствует ли точка пути юниту: здание с запасом к радиусу или вода (если юнит не плавает).
// Вода проверяется с тем же запасом: без него срезание углов одобряло отрезки, идущие
// вплотную к кромке озера, и юнит вставал на границу воды.
const blocksPath = (x, y, unit, buildings, clearance) => {
  if (buildings.some(building => circleOverlapsBuilding(x, y, clearance, building))) return true
  return !unit.canSwim && isWater(x, y, clearance)
}

// Свободен ли прямой отрезок: идём по нему шагами и проверяем здания с радиусом юнита
// (экспортируется для прямого подхода при атаке)
export const isPathClear = (from, to, unit, buildings) => {
  const clearance = unit.type.radius + CLEAR_MARGIN
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const samples = Math.max(1, Math.ceil(length / CLEAR_STEP))
  for (let index = 0; index <= samples; index++) {
    const x = from.x + (dx * index) / samples
    const y = from.y + (dy * index) / samples
    if (blocksPath(x, y, unit, buildings, clearance)) return false
  }
  return true
}

// Первый отрезок пути — от реальной позиции юнита, которая может быть вплотную к зданию
// (внутри запаса клиренса). Поэтому проверяем точным радиусом и не проверяем точку старта:
// юнит уже стоит в ней, двигаться надо от неё. margin добавляет запас к радиусу.
const isPathClearAhead = (from, to, unit, buildings, margin = 0) => {
  const radius = unit.type.radius + margin
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  const samples = Math.max(1, Math.ceil(length / CLEAR_STEP))
  for (let index = 1; index <= samples; index++) {
    const x = from.x + (dx * index) / samples
    const y = from.y + (dy * index) / samples
    if (blocksPath(x, y, unit, buildings, radius)) return false
  }
  return true
}

// Срезание углов на ходу: пока прямой путь до следующей точки маршрута (или до конечной цели)
// свободен с запасом, промежуточные точки выбрасываются — юнит срезает угол здания по диагонали,
// вместо того чтобы идти через центры клеток «по катетам». Запас на прямой меньше статического
// на 1px: точка старта не проверяется, а проседание между сэмплами (≤ CLEAR_STEP / 2) не должно
// довести реальный зазор до радиуса, иначе шаг заблокирует точный stepToward.
export const skipPassedWaypoints = (unit, path, finalPoint, buildings) => {
  while (path.length && isPathClearAhead(unit, path.length > 1 ? path[1] : finalPoint, unit, buildings, CLEAR_MARGIN - 1)) {
    path.shift()
  }
}

// Очередь с приоритетом по стоимости f — двоичная куча
class MinHeap {
  constructor () { this.items = [] }

  get size () { return this.items.length }

  swap (a, b) {
    const items = this.items
    const tmp = items[a]
    items[a] = items[b]
    items[b] = tmp
  }

  push (item) {
    const items = this.items
    items.push(item)
    let index = items.length - 1
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (items[parent].f <= items[index].f) break
      this.swap(parent, index)
      index = parent
    }
  }

  pop () {
    const items = this.items
    const top = items[0]
    const last = items.pop()
    if (items.length) {
      items[0] = last
      let index = 0
      for (;;) {
        const left = index * 2 + 1
        const right = left + 1
        let smallest = index
        if (left < items.length && items[left].f < items[smallest].f) smallest = left
        if (right < items.length && items[right].f < items[smallest].f) smallest = right
        if (smallest === index) break
        this.swap(smallest, index)
        index = smallest
      }
    }
    return top
  }
}

const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

// Возвращает точки маршрута от позиции юнита к цели (последняя точка — место остановки).
// Пустой массив — прямая до цели свободна, юнит идёт напрямую.
export const findPath = (unit, target, buildings, map) => {
  if (isPathClear(unit, target, unit, buildings)) return []

  const cellSize = map.gridSize
  const cols = Math.round(map.width / cellSize)
  const rows = Math.round(map.height / cellSize)
  const halfWidth = map.width / 2
  const halfHeight = map.height / 2

  const toIndex = (i, j) => j * cols + i
  const cellPoint = (i, j) => ({
    x: -halfWidth + (i + 0.5) * cellSize,
    y: -halfHeight + (j + 0.5) * cellSize,
  })
  const toCell = (value, half, count) => Math.min(count - 1, Math.max(0, Math.floor((value + half) / cellSize)))

  // Клетка занята, если в её центре юнит задевает здание (с запасом к радиусу) или стоит на воде
  const clearance = unit.type.radius + CLEAR_MARGIN
  const waterBlocks = !unit.canSwim
  const blocked = new Uint8Array(cols * rows)
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const point = cellPoint(i, j)
      blocked[toIndex(i, j)] = ((waterBlocks && isWater(point.x, point.y))
        || buildings.some(building => circleOverlapsBuilding(point.x, point.y, clearance, building))) ? 1 : 0
    }
  }

  const start = { i: toCell(unit.x, halfWidth, cols), j: toCell(unit.y, halfHeight, rows) }
  const goal = { i: toCell(target.x, halfWidth, cols), j: toCell(target.y, halfHeight, rows) }
  const startIndex = toIndex(start.i, start.j)
  const goalIndex = toIndex(goal.i, goal.j)
  // Цель может оказаться внутри здания (клик по зданию) — тогда идём к ближайшей достижимой точке
  const goalFree = !blocked[goalIndex]

  const gScore = new Float64Array(cols * rows).fill(Infinity)
  const cameFrom = new Int32Array(cols * rows).fill(-1)
  const closed = new Uint8Array(cols * rows)
  const open = new MinHeap()

  const heuristic = (i, j) => (Math.abs(i - goal.i) + Math.abs(j - goal.j)) * cellSize

  gScore[startIndex] = 0
  open.push({ index: startIndex, i: start.i, j: start.j, f: heuristic(start.i, start.j) })

  let best = { index: startIndex, distance: Math.hypot(unit.x - target.x, unit.y - target.y) }

  while (open.size) {
    const node = open.pop()
    if (closed[node.index]) continue
    closed[node.index] = 1

    const point = cellPoint(node.i, node.j)
    const distance = Math.hypot(point.x - target.x, point.y - target.y)
    if (distance < best.distance) best = { index: node.index, distance }

    if (goalFree && node.index === goalIndex) break

    for (const [di, dj] of DIRECTIONS) {
      const i = node.i + di
      const j = node.j + dj
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue
      const nextIndex = toIndex(i, j)
      if (blocked[nextIndex] || closed[nextIndex]) continue
      const tentative = gScore[node.index] + cellSize
      if (tentative < gScore[nextIndex]) {
        gScore[nextIndex] = tentative
        cameFrom[nextIndex] = node.index
        open.push({ index: nextIndex, i, j, f: tentative + heuristic(i, j) })
      }
    }
  }

  const endIndex = goalFree ? goalIndex : best.index
  const cells = []
  for (let index = endIndex; index !== -1; index = cameFrom[index]) cells.push(index)
  cells.reverse()

  // Узлы маршрута: точная позиция юнита → центры клеток; свободную цель заменяем точной точкой клика
  const nodes = cells.map((index, position) => position === 0
    ? { x: unit.x, y: unit.y }
    : cellPoint(index % cols, Math.floor(index / cols)))
  if (goalFree) {
    const lastPoint = nodes[nodes.length - 1]
    if (isPathClear(lastPoint, target, unit, buildings)) nodes[nodes.length - 1] = { x: target.x, y: target.y }
  }

  // Сглаживание: из каждой точки прыгаем к самой дальней, до которой путь по прямой чист
  const smoothed = []
  let current = 0
  while (current < nodes.length - 1) {
    let next = nodes.length - 1
    while (next > current + 1 && !isPathClear(nodes[current], nodes[next], unit, buildings)) next--
    smoothed.push(nodes[next])
    current = next
  }

  // Первый отрезок идёт от реальной позиции юнита — убираем точки, до которых напрямую не пройти
  while (smoothed.length && !isPathClearAhead(unit, smoothed[0], unit, buildings)) smoothed.shift()
  return smoothed
}
