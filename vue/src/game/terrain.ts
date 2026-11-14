import { MAP, OBJECT_TYPES } from './config'
import { staticFootprint } from './spatial'
import type { Footprint } from './spatial'
import type { Point, StaticObject, TerrainType, TerrainZone } from './types'

// Местность - карта клеток MAP.cell × MAP.cell (60 × 60). Зоны сценария задаются
// прямоугольниками из клеток, карта собирается один раз при загрузке сценария

export const TERRAIN_COLS = MAP.width / MAP.cell
export const TERRAIN_ROWS = MAP.height / MAP.cell

export const CELL_LAND = 0
export const CELL_SAND = 1
export const CELL_LAKE = 2
export const CELL_RIVER_H = 3
export const CELL_RIVER_V = 4
export const CELL_MOUNTAIN = 5

const isWaterCell = (cell: number): boolean => cell >= CELL_LAKE && cell <= CELL_RIVER_V
const isSolidCell = (cell: number): boolean => cell === CELL_MOUNTAIN || isWaterCell(cell)

// класс местности клетки: река и озеро - вода, песок - суша, горы - горы
const terrainClassOfCell = (cell: number): TerrainType =>
  cell === CELL_MOUNTAIN ? 'mountain' : isWaterCell(cell) ? 'water' : 'land'

// Карта местности сценария: не меняется в пределах партии
export interface TerrainMap {
  cells: Uint8Array // TERRAIN_COLS × TERRAIN_ROWS, код клетки
  hasSolid: boolean // есть ли вода или горы: без них проверки местности можно пропускать
  key: string // подпись содержимого для кэша навигационной сетки
}

// Прямоугольники мостов (passable-объектов): их настил делает воду проходимой для сухопутных юнитов.
// Кэш по массиву объектов: он заменяется целиком при загрузке сценария и удалении объекта
const bridgeCache = new WeakMap<readonly StaticObject[], Footprint[]>()
export const bridgesOf = (objects: readonly StaticObject[]): Footprint[] => {
  let bridges = bridgeCache.get(objects)
  if (!bridges) {
    bridges = objects.filter((object) => OBJECT_TYPES[object.type]?.passable).map(staticFootprint)
    bridgeCache.set(objects, bridges)
  }
  return bridges
}

// Точка на настиле моста
const isOnBridgeXY = (x: number, y: number, bridges: readonly Footprint[]): boolean =>
  bridges.some((area) =>
    Math.abs(x - area.position.x) <= area.halfWidth &&
    Math.abs(y - area.position.y) <= area.halfHeight)

// Закрасить прямоугольник зоны, обрезанный по карте
const paintZone = (cells: Uint8Array, zone: TerrainZone, code: number) => {
  const minCol = Math.max(0, zone.col)
  const maxCol = Math.min(TERRAIN_COLS - 1, zone.col + zone.cols - 1)
  const minRow = Math.max(0, zone.row)
  const maxRow = Math.min(TERRAIN_ROWS - 1, zone.row + zone.rows - 1)
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      cells[row * TERRAIN_COLS + col] = code
    }
  }
}

export const buildTerrainMap = (zones: readonly TerrainZone[]): TerrainMap => {
  const cells = new Uint8Array(TERRAIN_COLS * TERRAIN_ROWS)
  for (const zone of zones) {
    if (zone.type === 'mountain') continue
    paintZone(cells, zone, zone.type === 'lake' ? CELL_LAKE : zone.rows > zone.cols ? CELL_RIVER_V : CELL_RIVER_H)
  }
  for (const zone of zones) {
    if (zone.type !== 'mountain') continue
    paintZone(cells, zone, CELL_MOUNTAIN)
  }
  const water: number[] = []
  for (let i = 0; i < cells.length; i++) {
    if (isWaterCell(cells[i])) water.push(i)
  }
  for (const i of water) {
    const col = i % TERRAIN_COLS
    const row = (i - col) / TERRAIN_COLS
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nextCol = col + dx
        const nextRow = row + dy
        if (nextCol < 0 || nextCol >= TERRAIN_COLS || nextRow < 0 || nextRow >= TERRAIN_ROWS) continue
        const j = nextRow * TERRAIN_COLS + nextCol
        if (cells[j] === CELL_LAND) cells[j] = CELL_SAND
      }
    }
  }
  let hasSolid = false
  for (let i = 0; i < cells.length && !hasSolid; i++) hasSolid = isSolidCell(cells[i])
  return {
    cells,
    hasSolid,
    key: zones.map((zone) => `${zone.type}:${zone.col},${zone.row},${zone.cols},${zone.rows}`).join('|'),
  }
}

// Чистая суша: карта сценариев без зон и значение по умолчанию
export const EMPTY_TERRAIN: TerrainMap = buildTerrainMap([])

// Клетка под точкой; за пределами карты - суша
export const terrainCellAt = (map: TerrainMap, x: number, y: number): number => {
  const col = Math.floor((x + MAP.width / 2) / MAP.cell)
  const row = Math.floor((y + MAP.height / 2) / MAP.cell)
  if (col < 0 || col >= TERRAIN_COLS || row < 0 || row >= TERRAIN_ROWS) return CELL_LAND
  return map.cells[row * TERRAIN_COLS + col]
}

// Местность в точке: озеро и река - вода, горы - горы, всё остальное (в том числе песок) - суша
export const terrainAt = (point: Point, map: TerrainMap): TerrainType =>
  terrainClassOfCell(terrainCellAt(map, point.x, point.y))

// Может ли юнит с такой местностью terrain стоять в точке;
// 'both' и undefined ходят по суше и воде, горы непроходимы для всех.
// Мост не меняет местность: вода под ним остаётся водой для судов,
// но по настилу проходит и сухопутный юнит
export const isTerrainPassable = (
  point: Point, map: TerrainMap, terrain?: TerrainType | 'both', bridges: readonly Footprint[] = [],
): boolean => {
  const cell = terrainCellAt(map, point.x, point.y)
  if (cell === CELL_MOUNTAIN) return false
  return terrain === undefined || terrain === 'both' || terrainClassOfCell(cell) === terrain ||
    isOnBridgeXY(point.x, point.y, bridges)
}

export const hasSolidTerrainUnder = (map: TerrainMap | undefined, area: Footprint): boolean => {
  if (!map?.hasSolid) return false
  const minCol = Math.max(0, Math.floor((area.position.x - area.halfWidth + MAP.width / 2) / MAP.cell))
  const maxCol = Math.min(TERRAIN_COLS - 1, Math.ceil((area.position.x + area.halfWidth + MAP.width / 2) / MAP.cell) - 1)
  const minRow = Math.max(0, Math.floor((area.position.y - area.halfHeight + MAP.height / 2) / MAP.cell))
  const maxRow = Math.min(TERRAIN_ROWS - 1, Math.ceil((area.position.y + area.halfHeight + MAP.height / 2) / MAP.cell) - 1)
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (isSolidCell(map.cells[row * TERRAIN_COLS + col])) return true
    }
  }
  return false
}

// Насколько углы проверки основания сдвинуты внутрь, чтобы касание края не считалось выходом
const TERRAIN_INSET = 4

export const isFootprintTerrainPassable = (
  area: Footprint, map: TerrainMap, terrain?: TerrainType | 'both', bridges: readonly Footprint[] = [],
): boolean => {
  const dx = Math.max(0, area.halfWidth - TERRAIN_INSET)
  const dy = Math.max(0, area.halfHeight - TERRAIN_INSET)
  const { x, y } = area.position
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const cell = terrainCellAt(map, x + i * dx, y + j * dy)
      if (cell === CELL_MOUNTAIN) return false
      if (!(terrain === undefined || terrain === 'both' || terrainClassOfCell(cell) === terrain ||
        isOnBridgeXY(x + i * dx, y + j * dy, bridges))) return false
    }
  }
  return true
}
