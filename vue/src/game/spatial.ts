import { MAP, OBJECT_TYPES, UNIT_TYPES } from './config'
import type { TerrainMap } from './terrain'
import type { Point, StaticObject, Unit } from './types'

// Основание на земле: центр и половины размеров в мировых координатах
export interface Footprint {
  position: Point
  halfWidth: number
  halfHeight: number
}

export interface CollisionWorld {
  objects: readonly StaticObject[]
  units: readonly Unit[]
  terrainMap?: TerrainMap // карта местности сценария, без неё - чистая суша
}

export interface CollisionOptions {
  ignoreId?: number // сам движущийся юнит не считается препятствием
  reserved?: readonly Footprint[] // цели, уже назначенные в этом групповом приказе
}

// Допуск на погрешности вычислений у общей границы
export const COLLISION_EPSILON = 1e-7
export const SEARCH_STEP = MAP.cell / 2

// Юнит занимает квадрат по ширине; высота спрайта не влияет на проходимость
export const unitFootprint = (unit: Unit): Footprint => ({
  position: unit.position,
  halfWidth: UNIT_TYPES[unit.type]?.width / 2,
  halfHeight: UNIT_TYPES[unit.type]?.width / 2,
})

export const staticFootprint = (object: StaticObject): Footprint => ({
  position: object.position,
  halfWidth: OBJECT_TYPES[object.type]?.width / 2,
  halfHeight: OBJECT_TYPES[object.type]?.height / 2,
})

export const squareFootprint = (position: Point, margin: number): Footprint => ({
  position, halfWidth: margin, halfHeight: margin,
})

export const isValidFootprint = (area: Footprint): boolean =>
  !!area.position && Number.isFinite(area.position.x) && Number.isFinite(area.position.y) &&
  Number.isFinite(area.halfWidth) && Number.isFinite(area.halfHeight) &&
  area.halfWidth > 0 && area.halfHeight > 0

export const isInsideMap = (area: Footprint): boolean => isValidFootprint(area) &&
  Math.abs(area.position.x) + area.halfWidth <= MAP.width / 2 + COLLISION_EPSILON &&
  Math.abs(area.position.y) + area.halfHeight <= MAP.height / 2 + COLLISION_EPSILON

// Касание гранями разрешено, пересечение внутренних областей запрещено
export const overlaps = (a: Footprint, b: Footprint): boolean =>
  Math.abs(a.position.x - b.position.x) < a.halfWidth + b.halfWidth - COLLISION_EPSILON &&
  Math.abs(a.position.y - b.position.y) < a.halfHeight + b.halfHeight - COLLISION_EPSILON

// Расширяем препятствие на размер основания и проверяем отрезок его центра.
// Так обнаруживаются и столкновения между началом и концом кадра.
const segmentIntersectsObstacle = (from: Point, to: Point, area: Footprint, obstacle: Footprint): boolean => {
  // Интервал долей пути [0, 1], в котором центр находится внутри препятствия
  let enter = 0
  let leave = 1
  for (const axis of ['x', 'y'] as const) {
    const half = axis === 'x'
      ? area.halfWidth + obstacle.halfWidth - COLLISION_EPSILON
      : area.halfHeight + obstacle.halfHeight - COLLISION_EPSILON
    const delta = to[axis] - from[axis]
    const min = obstacle.position[axis] - half
    const max = obstacle.position[axis] + half
    if (delta === 0) {
      if (from[axis] <= min || from[axis] >= max) return false
    } else {
      const t1 = (min - from[axis]) / delta
      const t2 = (max - from[axis]) / delta
      enter = Math.max(enter, Math.min(t1, t2))
      leave = Math.min(leave, Math.max(t1, t2))
      if (enter >= leave) return false
    }
  }
  return enter < leave
}

// Проход мимо статичных объектов (мосты пропускаем, свой id не мешает)
export const objectsSweepFree = (
  objects: readonly StaticObject[], from: Point, to: Point, area: Footprint,
  scratch: Footprint, ignoreId?: number,
): boolean => {
  for (const object of objects) {
    if (object.id === ignoreId || OBJECT_TYPES[object.type]?.passable) continue
    const type = OBJECT_TYPES[object.type]
    if (!object.position || !type || !Number.isFinite(type.width) || !(type.width > 0) ||
      !Number.isFinite(type.height) || !(type.height > 0)) return false
    scratch.position = object.position
    scratch.halfWidth = type.width / 2
    scratch.halfHeight = type.height / 2
    if (segmentIntersectsObstacle(from, to, area, scratch)) return false
  }
  return true
}

// Проход мимо готовых оснований: зарезервированные цели, юниты из приказа
export const sweepFootprintsFree = (
  footprints: readonly Footprint[], from: Point, to: Point, area: Footprint,
): boolean => {
  for (const obstacle of footprints) {
    if (!isValidFootprint(obstacle) || segmentIntersectsObstacle(from, to, area, obstacle)) return false
  }
  return true
}

// Занятость вычисляется по текущему миру без отдельного кэша
export const isAreaFree = (world: CollisionWorld, area: Footprint, options: CollisionOptions = {}): boolean => {
  if (!isInsideMap(area)) return false
  const scratch: Footprint = { position: { x: 0, y: 0 }, halfWidth: 0, halfHeight: 0 }
  for (const object of world.objects) {
    if (object.id === options.ignoreId || OBJECT_TYPES[object.type]?.passable) continue
    const type = OBJECT_TYPES[object.type]
    if (!object.position || !type || !Number.isFinite(type.width) || !(type.width > 0) ||
      !Number.isFinite(type.height) || !(type.height > 0)) return false
    scratch.position = object.position
    scratch.halfWidth = type.width / 2
    scratch.halfHeight = type.height / 2
    if (overlaps(area, scratch)) return false
  }
  for (const unit of world.units) {
    if (unit.id === options.ignoreId) continue
    const type = UNIT_TYPES[unit.type]
    if (!unit.position || !type || !Number.isFinite(type.width) || !(type.width > 0)) return false
    scratch.position = unit.position
    scratch.halfWidth = type.width / 2
    scratch.halfHeight = type.width / 2
    if (overlaps(area, scratch)) return false
  }
  for (const obstacle of options.reserved ?? []) {
    if (!isValidFootprint(obstacle) || overlaps(area, obstacle)) return false
  }
  return true
}

// Проверка всего отрезка перемещения с учётом размеров основания
export const isSweepFree = (
  world: CollisionWorld, area: Footprint, to: Point, options: CollisionOptions = {},
): boolean => {
  if (!isInsideMap(area) || !isInsideMap({ ...area, position: to })) return false
  const scratch: Footprint = { position: { x: 0, y: 0 }, halfWidth: 0, halfHeight: 0 }
  if (!objectsSweepFree(world.objects, area.position, to, area, scratch, options.ignoreId)) return false
  for (const unit of world.units) {
    if (unit.id === options.ignoreId) continue
    const type = UNIT_TYPES[unit.type]
    if (!unit.position || !type || !Number.isFinite(type.width) || !(type.width > 0)) return false
    scratch.position = unit.position
    scratch.halfWidth = type.width / 2
    scratch.halfHeight = type.width / 2
    if (segmentIntersectsObstacle(area.position, to, area, scratch)) return false
  }
  return sweepFootprintsFree(options.reserved ?? [], area.position, to, area)
}

export const clampFootprintToMap = (area: Footprint): Point => ({
  x: Math.max(-MAP.width / 2 + area.halfWidth, Math.min(MAP.width / 2 - area.halfWidth, area.position.x)),
  y: Math.max(-MAP.height / 2 + area.halfHeight, Math.min(MAP.height / 2 - area.halfHeight, area.position.y)),
})

// Поиск свободного места на сетке; accept добавляет правила местности и навигации.
// Обход ограничен размером карты.
export const findNearestFreePosition = (
  world: CollisionWorld,
  area: Footprint,
  options: CollisionOptions & { accept?: (point: Point) => boolean } = {},
): Point | null => {
  if (!isValidFootprint(area) || area.halfWidth * 2 > MAP.width || area.halfHeight * 2 > MAP.height) return null
  const origin = clampFootprintToMap(area)
  const available = (point: Point) => isAreaFree(world, { ...area, position: point }, options) &&
    (options.accept?.(point) ?? true)
  if (available(origin)) return origin

  let best: Point | null = null
  let bestDistance = Infinity // квадрат расстояния до лучшего кандидата
  const visit = (dx: number, dy: number) => {
    const distance = (dx * dx + dy * dy) * SEARCH_STEP ** 2
    if (distance >= bestDistance) return
    const point = { x: origin.x + dx * SEARCH_STEP, y: origin.y + dy * SEARCH_STEP }
    if (available(point)) {
      best = point
      bestDistance = distance
    }
  }
  const rings = Math.ceil(Math.max(MAP.width, MAP.height) / SEARCH_STEP)
  for (let ring = 1; ring <= rings; ring++) {
    // Следующие кольца уже дальше лучшего кандидата
    if ((ring * SEARCH_STEP) ** 2 > bestDistance) break
    // Обходим только периметр кольца
    for (let offset = -ring; offset <= ring; offset++) {
      visit(-ring, offset)
      visit(ring, offset)
      if (Math.abs(offset) !== ring) {
        visit(offset, -ring)
        visit(offset, ring)
      }
    }
  }
  return best
}
