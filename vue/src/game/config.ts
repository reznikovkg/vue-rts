import type { ObjectType, StaticObject, Unit, UnitType } from './types'

// размер карты и cell - размер ячейики сетки в пикселях
export const MAP = { width: 3000, height: 2000, cell: 50 }

// edgePx - зона у края экрана, где камера начинает двигаться
export const CAMERA = { speedPxPerSecond: 500, edgePx: 50 }

export const OBJECT_TYPES: Record<string, ObjectType> = {
  house: { name: 'Дом', width: 100, height: 70, color: '#a16207' },
  tree: { name: 'Дерево', width: 30, height: 80, color: '#00ff00' },
  castle: { name: 'Замок', width: 200, height: 160, color: '#6b7280' },
}

export const UNIT_TYPES: Record<string, UnitType> = {
  worker: { name: 'Рабочий', width: 24, height: 24, color: '#0000ff', speedPxPerSecond: 80 },
  warrior: { name: 'Воин', width: 32, height: 32, color: '#ff0000', speedPxPerSecond: 150 },
}

export const START_OBJECTS: StaticObject[] = [
  { id: 1, type: 'house', x: -200, y: -150 },
  { id: 2, type: 'house', x: 350, y: 250 },
  { id: 3, type: 'tree', x: 150, y: -300 },
  { id: 4, type: 'tree', x: -350, y: 250 },
  { id: 5, type: 'tree', x: 550, y: -150 },
  { id: 6, type: 'castle', x: -550, y: -200 },
]

export const START_UNITS: Unit[] = [
  { id: 7, type: 'worker', x: 0, y: 0, target: null },
  { id: 8, type: 'worker', x: 60, y: 40, target: null },
  { id: 9, type: 'warrior', x: -100, y: 120, target: null},
  { id: 10, type: 'warrior', x: -150, y: 80, target: null },
  { id: 11, type: 'warrior', x: 100, y: 100, target: null },
]
