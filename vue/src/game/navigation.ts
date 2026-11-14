import { MAP, OBJECT_TYPES } from './config'
import { ISO_SCALE } from './coords'
import { isInsideMap, SEARCH_STEP, squareFootprint, staticFootprint } from './spatial'
import type { Footprint } from './spatial'
import { bridgesOf, EMPTY_TERRAIN, isFootprintTerrainPassable } from './terrain'
import type { TerrainMap } from './terrain'
import type { Point, StaticObject, TerrainType } from './types'

// Растровые маски для A*. Статика сценария не меняется между приказами,
// поэтому геометрия считается один раз на сетку, а поиск читает массивы.
export const COLS = Math.floor(MAP.width / SEARCH_STEP) + 1
export const ROWS = Math.floor(MAP.height / SEARCH_STEP) + 1

// Любая точка ребра сетки (до диагонали шага) ближе половины ребра к одному из концов.
// Если оба конца дальше EDGE_PAD от всех препятствий, ребро свободно без точной проверки
const EDGE_PAD = SEARCH_STEP * Math.SQRT1_2 + 1

const cellX = (col: number) => -MAP.width / 2 + col * SEARCH_STEP
const cellY = (row: number) => -MAP.height / 2 + row * SEARCH_STEP
export { cellX, cellY }
export const cellToPoint = (cell: number): Point => ({ x: cellX(cell % COLS), y: cellY(Math.floor(cell / COLS)) })

export const pointToCell = (point: Point): number => {
  const col = Math.round((point.x + MAP.width / 2) / SEARCH_STEP)
  const row = Math.round((point.y + MAP.height / 2) / SEARCH_STEP)
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1
  return row * COLS + col
}

export interface NavigationGrid {
  blocked: Uint8Array // 1 - основание юнита в центре клетки пересекает препятствие или чужую местность
  hidden: Uint8Array // 1 - высокий объект закрывает юнита: сюда можно только выйти
  near: Uint8Array // 1 - ближе EDGE_PAD к препятствию, ребро проверяется точно
  component: Int32Array // компонента связности свободных клеток, -1 у занятых и скрытых
  edge: Uint8Array // кэш точной проверки рёбер: 2 бита на направление (E, SE, S, SW), 0 - не проверено, 1 - свободно, 2 - занято
}

// Закрашиваем клетки, центр которых строго внутри области
const paint = (mask: Uint8Array, position: Point, halfWidth: number, halfHeight: number) => {
  const minCol = Math.max(0, Math.floor((position.x - halfWidth + MAP.width / 2) / SEARCH_STEP))
  const maxCol = Math.min(COLS - 1, Math.ceil((position.x + halfWidth + MAP.width / 2) / SEARCH_STEP))
  const minRow = Math.max(0, Math.floor((position.y - halfHeight + MAP.height / 2) / SEARCH_STEP))
  const maxRow = Math.min(ROWS - 1, Math.ceil((position.y + halfHeight + MAP.height / 2) / SEARCH_STEP))
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (Math.abs(cellX(col) - position.x) < halfWidth && Math.abs(cellY(row) - position.y) < halfHeight) {
        mask[row * COLS + col] = 1
      }
    }
  }
}

const paintArea = (blocked: Uint8Array, near: Uint8Array, area: Footprint, margin: number) => {
  paint(blocked, area.position, area.halfWidth + margin, area.halfHeight + margin)
  paint(near, area.position, area.halfWidth + margin + EDGE_PAD, area.halfHeight + margin + EDGE_PAD)
}

// Зона перекрытия из isHidden: основание, сдвинутое к экрану на высоту объекта.
// Закрашиваем её пошагово: это объединение квадратов вдоль диагонали
const paintHidden = (hidden: Uint8Array, near: Uint8Array, object: StaticObject, margin: number) => {
  const type = OBJECT_TYPES[object.type]
  if (!type?.wallHeight) return
  const height = (type.wallHeight + (type.roofHeight ?? 0)) / ISO_SCALE
  const steps = Math.ceil(height / (SEARCH_STEP / 2))
  for (let i = 0; i <= steps; i++) {
    const shift = height * i / steps
    const position = { x: object.position.x - shift, y: object.position.y - shift }
    paint(hidden, position, type.width / 2 + margin, type.height / 2 + margin)
    paint(near, position, type.width / 2 + margin + EDGE_PAD, type.height / 2 + margin + EDGE_PAD)
  }
}

// Компоненты по восьми направлениям: связность с запасом, чтобы не отсечь реальный путь
const labelComponents = (grid: NavigationGrid) => {
  const { blocked, hidden, component } = grid
  component.fill(-1)
  const queue = new Int32Array(COLS * ROWS)
  let next = 0
  for (let start = 0; start < component.length; start++) {
    if (blocked[start] || hidden[start] || component[start] !== -1) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    component[start] = next
    while (head < tail) {
      const cell = queue[head++]
      const col = cell % COLS
      const row = (cell - col) / COLS
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nextCol = col + dx
          const nextRow = row + dy
          if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) continue
          const nextCell = nextRow * COLS + nextCol
          if (blocked[nextCell] || hidden[nextCell] || component[nextCell] !== -1) continue
          component[nextCell] = next
          queue[tail++] = nextCell
        }
      }
    }
    next++
  }
}

const buildGrid = (
  objects: readonly StaticObject[], margin: number, terrain: TerrainType | 'both' | undefined, map: TerrainMap,
): NavigationGrid => {
  const size = COLS * ROWS
  const grid = {
    blocked: new Uint8Array(size), hidden: new Uint8Array(size), near: new Uint8Array(size),
    component: new Int32Array(size), edge: new Uint8Array(size),
  }
  for (const object of objects) {
    // Проходимые объекты (мосты) не закрашиваем: по настилу ходят,
    // воду под ним делает проходимой bridgesOf в проверке местности ниже
    if (OBJECT_TYPES[object.type]?.passable) continue
    paintArea(grid.blocked, grid.near, staticFootprint(object), margin)
    paintHidden(grid.hidden, grid.near, object, margin)
  }
  const bridges = bridgesOf(objects)
  for (let cell = 0; cell < size; cell++) {
    if (grid.blocked[cell]) continue
    const point = cellToPoint(cell)
    if (!isInsideMap(squareFootprint(point, margin)) ||
      !isFootprintTerrainPassable(squareFootprint(point, margin), map, terrain, bridges)) {
      grid.blocked[cell] = 1
      grid.near[cell] = 1
    } else if (!grid.near[cell] && map.hasSolid &&
      !isFootprintTerrainPassable(squareFootprint(point, margin + EDGE_PAD), map, terrain, bridges)) {
      grid.near[cell] = 1
    }
  }
  labelComponents(grid)
  return grid
}

// Объекты могут меняться на месте (push при постройке), поэтому ключ - содержимое, а не массив
const signature = (objects: readonly StaticObject[], margin: number, terrain: string | undefined, map: TerrainMap) =>
  `${margin}|${terrain}|${map.key}|` +
  objects.map((o) => `${o.type},${o.position.x},${o.position.y}`).join(';')

const GRID_CACHE_SIZE = 16
const gridCache = new Map<string, NavigationGrid>()

export const navigationGrid = (
  objects: readonly StaticObject[], margin: number, terrain?: TerrainType | 'both', map: TerrainMap = EMPTY_TERRAIN,
): NavigationGrid => {
  const key = signature(objects, margin, terrain, map)
  let grid = gridCache.get(key)
  if (!grid) {
    grid = buildGrid(objects, margin, terrain, map)
    if (gridCache.size >= GRID_CACHE_SIZE) gridCache.delete(gridCache.keys().next().value!)
  }
  gridCache.delete(key)
  gridCache.set(key, grid) // свежий ключ в конец: вытесняется самый старый
  return grid
}

// Юниты и зарезервированные цели меняются каждый приказ: копируем маски и закрашиваем их поверх.
// Кэш рёбер edge не копируем и не чистим: он хранит только статические вердикты
// (объекты, местность, перекрытия), которые от юнитов не зависят
export const withDynamicBlockers = (grid: NavigationGrid, blockers: readonly Footprint[], margin: number): NavigationGrid => {
  if (!blockers.length) return grid
  const blocked = grid.blocked.slice()
  const near = grid.near.slice()
  for (const area of blockers) paintArea(blocked, near, area, margin)
  return { ...grid, blocked, near }
}

// Достижимая клетка, ближайшая к цели по сетке: берег озера, сторона стены.
// Обход идёт от цели по всей карте и не ограничен масками, иначе первая найденная
// клетка оказывается не ближайшей, а случайной точкой на периметре препятствия
export const nearestReachableCell = (grid: NavigationGrid, goalCell: number, components: ReadonlySet<number>): number => {
  if (goalCell < 0) return -1
  const distances = new Int32Array(COLS * ROWS).fill(-1)
  const queue = new Int32Array(COLS * ROWS)
  let head = 0
  let tail = 0
  queue[tail++] = goalCell
  distances[goalCell] = 0
  while (head < tail) {
    const cell = queue[head++]
    const col = cell % COLS
    const row = (cell - col) / COLS
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nextCol = col + dx
        const nextRow = row + dy
        if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) continue
        const nextCell = nextRow * COLS + nextCol
        if (distances[nextCell] !== -1) continue
        distances[nextCell] = distances[cell] + 1
        queue[tail++] = nextCell
      }
    }
  }
  let best = -1
  let bestDistance = Infinity
  for (let cell = 0; cell < distances.length; cell++) {
    if (distances[cell] === -1 || distances[cell] >= bestDistance) continue
    if (grid.blocked[cell] || !components.has(grid.component[cell])) continue
    best = cell
    bestDistance = distances[cell]
  }
  return best
}

// Компонента точки: её клетки или соседней, если точка у самой границы
export const componentAt = (grid: NavigationGrid, point: Point): number => {
  const cell = pointToCell(point)
  if (cell < 0) return -1
  if (grid.component[cell] >= 0) return grid.component[cell]
  const col = cell % COLS
  const row = (cell - col) / COLS
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nextCol = col + dx
      const nextRow = row + dy
      if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) continue
      const component = grid.component[nextRow * COLS + nextCol]
      if (component >= 0) return component
    }
  }
  return -1
}
