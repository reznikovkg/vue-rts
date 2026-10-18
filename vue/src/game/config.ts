import type { BuildingType, ObjectType, StaticObject, Unit, UnitType } from './types'

// размер карты и cell - размер ячейики сетки в пикселях
export const MAP = { width: 3000, height: 3000, cell: 50 }

// edgePx - зона у края экрана, где камера начинает двигаться
export const CAMERA = { speedPxPerSecond: 500, edgePx: 80 }

// размер в пикселях по размеру в клетках
const cells = (count: number) => count * MAP.cell

export const OBJECT_TYPES: Record<string, ObjectType | BuildingType> = {
  house: { name: 'Дом', width: cells(2), height: cells(2), color: '#a16207', wallHeight: 50, roofHeight: 40, roofColor: '#b91c1c', size: 2, maxHp: 200 },
  tree: { name: 'Дерево', width: 10, height: 10, color: '#7c4a1e', wallHeight: 80, branchColor: '#16a34a' },
  castle: { name: 'Замок', width: cells(4), height: cells(4), color: '#6b7280', wallHeight: 110, roofHeight: 18, roofType: 'battlements', size: 4, maxHp: 500 },
}

export const UNIT_TYPES: Record<string, UnitType> = {
  worker: { name: 'Рабочий', width: 24, height: 40, color: '#0000ff', speedPxPerSecond: 80, maxHp: 50, strength: 5, attackSpeed: 1 },
  warrior: { name: 'Воин', width: 32, height: 52, color: '#ff0000', speedPxPerSecond: 150, maxHp: 100, strength: 15, attackSpeed: 1.5 },
}

export const GROUP_COLORS: Record<number, string> = {
  1: '#2563eb',
  2: '#dc2626',
}

// group: 0 - нейтральные, 1 и 2 - разные группы; hp здания равен maxHp его типа
export const START_OBJECTS: StaticObject[] = [
  { id: 1, type: 'house', group: 1, hp: 200, position: { x: -200, y: -150 } },
  { id: 2, type: 'house', group: 2, hp: 200, position: { x: 350, y: 250 } },
  { id: 3, type: 'tree', group: 0, position: { x: 150, y: -300 } },
  { id: 4, type: 'tree', group: 0, position: { x: -350, y: 250 } },
  { id: 5, type: 'tree', group: 0, position: { x: 550, y: -150 } },
  { id: 6, type: 'castle', group: 1, hp: 500, position: { x: -550, y: -200 } },
]

export const START_UNITS: Unit[] = [
  { id: 7, type: 'worker', group: 1, hp: UNIT_TYPES.worker.maxHp, position: { x: 0, y: 0 }, target: null },
  { id: 8, type: 'worker', group: 2, hp: UNIT_TYPES.worker.maxHp, position: { x: 60, y: 40 }, target: null },
  { id: 9, type: 'warrior', group: 1, hp: UNIT_TYPES.warrior.maxHp, position: { x: -100, y: 120 }, target: null },
  { id: 10, type: 'warrior', group: 1, hp: UNIT_TYPES.warrior.maxHp, position: { x: -150, y: 80 }, target: null },
  { id: 11, type: 'warrior', group: 2, hp: UNIT_TYPES.warrior.maxHp, position: { x: 100, y: 100 }, target: null },
]
