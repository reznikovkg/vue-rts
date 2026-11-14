import { OBJECT_TYPES } from './config'
import { ISO_SCALE } from './coords'
import { isAreaFree, isInsideMap, objectsSweepFree, squareFootprint, sweepFootprintsFree, unitFootprint } from './spatial'
import type { CollisionOptions, Footprint } from './spatial'
import { bridgesOf, EMPTY_TERRAIN, isFootprintTerrainPassable } from './terrain'
import type { TerrainMap } from './terrain'
import type { Point, StaticObject, TerrainType, Unit } from './types'

export interface NavigationOptions extends CollisionOptions {
  units?: readonly Unit[]
  terrain?: TerrainType | 'both' // где ходит юнит, undefined - по суше и воде
  terrainMap?: TerrainMap // карта местности сценария: реки, озёра, горы
}

const isTerrainFree = (
  point: Point, margin: number, terrain?: TerrainType | 'both', map: TerrainMap = EMPTY_TERRAIN,
  bridges: readonly Footprint[] = [],
): boolean => isFootprintTerrainPassable(squareFootprint(point, margin), map, terrain, bridges)

// Высокие объекты для зон перекрытия: их форма не зависит от margin, считаем один раз
// на массив объектов (он заменяется целиком при загрузке сценария и удалении - как bridgesOf)
interface TallShape {
  x: number
  y: number
  halfWidth: number
  halfHeight: number
  hidden: number
}

const tallCache = new WeakMap<readonly StaticObject[], TallShape[]>()
const tallShapes = (objects: readonly StaticObject[]): TallShape[] => {
  let shapes = tallCache.get(objects)
  if (!shapes) {
    shapes = []
    for (const object of objects) {
      const type = OBJECT_TYPES[object.type]
      // без wallHeight у объекта нет зоны перекрытия; неизвестный тип пропускаем
      if (!type?.wallHeight) continue
      shapes.push({
        x: object.position.x,
        y: object.position.y,
        halfWidth: type.width / 2,
        halfHeight: type.height / 2,
        hidden: (type.wallHeight + (type.roofHeight ?? 0)) / ISO_SCALE,
      })
    }
    tallCache.set(objects, shapes)
  }
  return shapes
}

// Область, где высокий объект закрывает юнита в изометрии
export const isHidden = (point: Point, objects: readonly StaticObject[], margin: number): boolean => {
  for (const shape of tallShapes(objects)) {
    const x = point.x - shape.x
    const y = point.y - shape.y
    const halfWidth = shape.halfWidth + margin
    const halfHeight = shape.halfHeight + margin
    const tMin = Math.max(0, -halfWidth - x, -halfHeight - y)
    const tMax = Math.min(shape.hidden, halfWidth - x, halfHeight - y)
    if (tMin < tMax) return true
  }
  return false
}

// Навигация учитывает основание объекта, тип местности юнита и зону визуального перекрытия
export const isBlocked = (
  point: Point, objects: readonly StaticObject[], margin: number, options: NavigationOptions = {},
): boolean => !isAreaFree({ objects, units: options.units ?? [] }, squareFootprint(point, margin), options) ||
  isHidden(point, objects, margin) ||
  !isTerrainFree(point, margin, options.terrain, options.terrainMap ?? EMPTY_TERRAIN, bridgesOf(objects))

// Для зон перекрытия достаточно шага 5 мировых пикселей
const HIDDEN_STEP = 5

// Статическая часть проверки отрезка: статичные объекты, местность и зоны перекрытия.
// Не зависит от юнитов и зарезервированных мест, поэтому вердикт для ребра сетки навигации
// всегда одинаков - pathfinding кэширует его прямо в сетке
export const isSegmentFreeStatic = (
  from: Point, to: Point, objects: readonly StaticObject[], margin: number, options: NavigationOptions = {},
): boolean => {
  const area = squareFootprint(from, margin)
  if (!isInsideMap(area) || !isInsideMap({ ...area, position: to })) return false
  const scratch: Footprint = { position: { x: 0, y: 0 }, halfWidth: 0, halfHeight: 0 }
  if (!objectsSweepFree(objects, from, to, area, scratch, options.ignoreId)) return false
  const map = options.terrainMap ?? EMPTY_TERRAIN
  const bridges = bridgesOf(objects)
  let stepTerrain = map.hasSolid
  if (!stepTerrain && options.terrain === 'water') {
    const x0 = Math.min(from.x, to.x) - margin
    const y0 = Math.min(from.y, to.y) - margin
    const x1 = Math.max(from.x, to.x) + margin
    const y1 = Math.max(from.y, to.y) + margin
    const spanned = bridges.some((bridge) => bridge.position.x + bridge.halfWidth >= x0 &&
      bridge.position.x - bridge.halfWidth <= x1 &&
      bridge.position.y + bridge.halfHeight >= y0 &&
      bridge.position.y - bridge.halfHeight <= y1)
    if (!spanned) return false
    stepTerrain = true
  }
  const count = Math.ceil(Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2) / HIDDEN_STEP)
  const probe: Point = { x: 0, y: 0 }
  const probeArea = { position: probe, halfWidth: margin, halfHeight: margin }
  let leaving = isHidden(from, objects, margin)
  for (let i = 1; i <= count; i++) {
    const t = i / count
    probe.x = from.x + (to.x - from.x) * t
    probe.y = from.y + (to.y - from.y) * t
    if (stepTerrain && !isFootprintTerrainPassable(probeArea, map, options.terrain, bridges)) return false
    // Из визуальной зоны разрешён выход; физическое наложение проверено выше
    const hidden = isHidden(probe, objects, margin)
    if (hidden && !leaving) return false
    if (!hidden) leaving = false
  }
  return true
}

// Динамическая часть: живые юниты и зарезервированные в этом приказе места
export const isSweepBlockersFree = (
  from: Point, to: Point, blockers: readonly Footprint[], margin: number,
): boolean => sweepFootprintsFree(blockers, from, to, squareFootprint(from, margin))

export const isSegmentFree = (
  from: Point, to: Point, objects: readonly StaticObject[], margin: number, options: NavigationOptions = {},
): boolean => isSegmentFreeStatic(from, to, objects, margin, options) &&
  isSweepBlockersFree(from, to, [
    ...(options.units ?? []).filter((unit) => unit.id !== options.ignoreId).map(unitFootprint),
    ...(options.reserved ?? []),
  ], margin)
