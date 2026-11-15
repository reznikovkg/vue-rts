import { OBJECT_TYPES, UNIT_TYPES } from '@/game/config'
import type { BuildingType, StaticObject, Unit } from '@/game/types'

// юнит для сценария, hp полное, цели нет
export const makeUnit = (id: number, type: string, group: number, x: number, y: number): Unit => ({
  id,
  type,
  group,
  hp: UNIT_TYPES[type].maxHp,
  position: { x, y },
  target: null,
})

// здание для сценария, hp берём из OBJECT_TYPES
export const makeBuilding = (id: number, type: string, group: number, x: number, y: number): StaticObject => ({
  id,
  type,
  group,
  hp: (OBJECT_TYPES[type] as BuildingType).maxHp,
  position: { x, y },
})
