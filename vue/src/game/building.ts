import { MAP, OBJECT_TYPES } from './config'
import { isAreaFree, isInsideMap, overlaps, staticFootprint } from './spatial'
import type { CollisionWorld, Footprint } from './spatial'
import { hasSolidTerrainUnder } from './terrain'
import type { BuildingType, Point } from './types'

export interface BuildingPlacement {
  position: Point
  valid: boolean
  reason: string
}

export const getBuildingType = (id: string): BuildingType | null => {
  if (!Object.hasOwn(OBJECT_TYPES, id)) return null
  const type = OBJECT_TYPES[id]
  return 'size' in type ? type : null
}

// Проверяем все клетки под площадью: даже узкая полоса воды у края не останется незамеченной
export const getBuildingError = (world: CollisionWorld, area: Footprint): string => {
  if (!isInsideMap(area)) return 'За пределами карты'
  if (hasSolidTerrainUnder(world.terrainMap, area)) return 'Неподходящая местность'
  // Мост проходим для юнитов, но его место нельзя занять постройкой
  const onBridge = world.objects.some((object) =>
    OBJECT_TYPES[object.type]?.passable && overlaps(area, staticFootprint(object)))
  if (onBridge || !isAreaFree(world, area)) return 'Место занято'
  return ''
}

// Курсор задаёт верхнюю левую клетку; в мире хранится центр основания
export const getBuildingPlacement = (
  world: CollisionWorld, typeId: string, point: Point,
): BuildingPlacement | null => {
  const type = getBuildingType(typeId)
  if (!type || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
  const col = Math.floor((point.x + MAP.width / 2) / MAP.cell)
  const row = Math.floor((point.y + MAP.height / 2) / MAP.cell)
  const position = {
    x: -MAP.width / 2 + (col + type.size / 2) * MAP.cell,
    y: -MAP.height / 2 + (row + type.size / 2) * MAP.cell,
  }
  const reason = getBuildingError(world, staticFootprint({ id: 0, type: typeId, group: 0, position }))
  return { position, valid: reason === '', reason }
}
