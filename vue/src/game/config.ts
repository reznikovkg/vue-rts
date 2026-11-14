import type { BuildingType, Command, ObjectType, StaticObject, TerrainZone, Unit, UnitType } from './types'

export const MAP = { width: 3000, height: 3000, cell: 50 }

const WATER_ZONES: TerrainZone[] = [
  { type: 'river', col: 23, row: 0, cols: 5, rows: 40 },
  { type: 'river', col: 23, row: 17, cols: 19, rows: 5 },
  { type: 'lake', col: 42, row: 16, cols: 10, rows: 9 },
  { type: 'lake', col: 21, row: 40, cols: 10, rows: 8 },
]

// Зоны гор
const MOUNTAINS_ZONES: TerrainZone[] = [
  { type: 'mountain', col: 5, row: 5, cols: 10, rows: 10 },
  { type: 'mountain', col: 15, row: 55, cols: 25, rows: 5 },
]

// зоны местности: озёра и реки - вода, горы - непроходимы, всё вне зон - суша
export const TERRAIN_ZONES: TerrainZone[] = [...WATER_ZONES, ...MOUNTAINS_ZONES]

// edgePx - зона у края экрана, где камера начинает двигаться
export const CAMERA = { speedPxPerSecond: 500, edgePx: 80 }

// размер в пикселях по размеру в клетках
const cells = (count: number) => count * MAP.cell

export const OBJECT_TYPES: Record<string, ObjectType | BuildingType> = {
  house: { name: 'Дом', width: cells(2), height: cells(2), color: '#a16207', wallHeight: 50, roofHeight: 40, roofColor: '#b91c1c', size: 2, maxHp: 200, spawns: ['worker'], maxPerGroup: 3, buildSeconds: 6 },
  tree: { name: 'Дерево', width: 10, height: 10, color: '#7c4a1e', wallHeight: 80, branchColor: '#16a34a' },
  castle: { name: 'Замок', width: cells(4), height: cells(4), color: '#6b7280', wallHeight: 110, roofHeight: 18, roofType: 'battlements', size: 4, maxHp: 500, spawns: ['worker', 'warrior'], maxPerGroup: 1, buildSeconds: 12 },
  tower: { name: 'Башня', width: cells(1), height: cells(1), color: '#78716c', wallHeight: 90, roofHeight: 30, roofColor: '#44403c', size: 1, maxHp: 120, maxPerGroup: 3, buildSeconds: 4 },
  barracks: { name: 'Казарма', width: cells(3), height: cells(3), color: '#92400e', wallHeight: 45, roofHeight: 30, roofColor: '#166534', size: 3, maxHp: 350, spawns: ['warrior'], maxPerGroup: 2, buildSeconds: 9 },
  dock: { name: 'Пристань', width: cells(2), height: cells(2), color: '#a8a29e', wallHeight: 30, roofHeight: 25, roofColor: '#0369a1', size: 2, maxHp: 150, spawns: ['boat', 'warship'], maxPerGroup: 2, buildSeconds: 6 },
  bridge: { name: 'Мост', width: cells(7), height: cells(2), color: '#92400e', image: 'bridge.svg', passable: true },
  'bridge-vertical': { name: 'Мост', width: cells(2), height: cells(7), color: '#92400e', image: 'bridge-vertical.svg', passable: true },
}

export const UNIT_TYPES: Record<string, UnitType> = {
  worker: { name: 'Рабочий', width: 24, height: 40, color: '#0000ff', speedPxPerSecond: 80, maxHp: 50, strength: 5, attackSpeed: 1, buildSeconds: 3, maxPerGroup: 6, terrain: 'land' },
  warrior: { name: 'Воин', width: 32, height: 52, color: '#ff0000', speedPxPerSecond: 150, maxHp: 100, strength: 15, attackSpeed: 1.5, buildSeconds: 6, maxPerGroup: 10, terrain: 'land' },
  boat: { name: 'Лодка', width: 84, height: 46, color: '#c2853b', speedPxPerSecond: 150, maxHp: 80, strength: 0, attackSpeed: 0, buildSeconds: 6, maxPerGroup: 5, terrain: 'water', shape: 'boat' },
  warship: { name: 'Военный корабль', width: 132, height: 72, color: '#8b9199', speedPxPerSecond: 110, maxHp: 250, strength: 30, attackSpeed: 1, buildSeconds: 8, maxPerGroup: 3, terrain: 'water', shape: 'warship' },
}

// цвета групп (группа N получает цвет GROUP_PALETTE[N - 1])
export const GROUP_PALETTE = ['#2563eb', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#db2777']

// цвет группы; у нейтральных (группа 0) цвета нет, берём чёрный
export const groupColor = (group: number) => {
  if (group <= 0) {
    return '#000'
  }
  return GROUP_PALETTE[(group - 1) % GROUP_PALETTE.length]
}

// группа игрока, остальные группы - враги
export const PLAYER_GROUP = 1

// group: 0 - нейтральные, 1 и 2 - разные группы; hp здания равен maxHp его типа
export const START_OBJECTS: StaticObject[] = [
  { id: 1, type: 'house', group: 1, hp: 200, position: { x: -800, y: 100 } },
  { id: 2, type: 'house', group: 2, hp: 200, position: { x: 350, y: 550 } },
  { id: 3, type: 'tree', group: 0, position: { x: 150, y: -300 } },
  { id: 4, type: 'tree', group: 0, position: { x: -550, y: 250 } },
  { id: 5, type: 'tree', group: 0, position: { x: 550, y: -150 } },
  { id: 6, type: 'castle', group: 1, hp: 500, position: { x: -900, y: -200 } },
  { id: 7, type: 'castle', group: 2, hp: 500, position: { x: 600, y: 300 } },
  { id: 30, type: 'castle', group: 3, hp: 500, position: { x: 250, y: -1100 } },
  { id: 18, type: 'tower', group: 1, hp: 120, position: { x: -675, y: 325 } },
  { id: 19, type: 'barracks', group: 2, hp: 350, position: { x: 325, y: 875 } },
  { id: 20, type: 'barracks', group: 3, hp: 350, position: { x: 625, y: -1125 } },
  { id: 21, type: 'tower', group: 3, hp: 120, position: { x: 875, y: -975 } },
  { id: 22, type: 'house', group: 3, hp: 200, position: { x: 900, y: -1250 } },
  { id: 26, type: 'dock', group: 1, hp: 150, position: { x: -500, y: 700 } },
  { id: 27, type: 'dock', group: 2, hp: 150, position: { x: 850, y: -200 } },
  { id: 28, type: 'bridge', group: 0, position: { x: -225, y: 300 } },
  { id: 29, type: 'bridge-vertical', group: 0, position: { x: 400, y: -545 } },
]

const START_UNITS: Unit[] = [
  { id: 8, type: 'worker', group: 1, hp: UNIT_TYPES.worker.maxHp, position: { x: -650, y: 0 }, target: null },
  { id: 9, type: 'worker', group: 2, hp: UNIT_TYPES.worker.maxHp, position: { x: 60, y: 40 }, target: null },
  { id: 10, type: 'warrior', group: 1, hp: UNIT_TYPES.warrior.maxHp, position: { x: -600, y: 120 }, target: null },
  { id: 11, type: 'warrior', group: 1, hp: UNIT_TYPES.warrior.maxHp, position: { x: -650, y: -150 }, target: null },
  { id: 12, type: 'warrior', group: 2, hp: UNIT_TYPES.warrior.maxHp, position: { x: 100, y: 100 }, target: null },
  { id: 13, type: 'warrior', group: 2, hp: UNIT_TYPES.warrior.maxHp, position: { x: 200, y: 300 }, target: null },
  { id: 14, type: 'boat', group: 2, hp: UNIT_TYPES.boat.maxHp, position: { x: 700, y: -470 }, target: null },
  { id: 15, type: 'boat', group: 1, hp: UNIT_TYPES.boat.maxHp, position: { x: -350, y: 700 }, target: null },
  { id: 16, type: 'warship', group: 2, hp: UNIT_TYPES.warship.maxHp, position: { x: 900, y: -600 }, target: null },
  { id: 17, type: 'warship', group: 1, hp: UNIT_TYPES.warship.maxHp, position: { x: -200, y: 700 }, target: null },
  { id: 23, type: 'worker', group: 3, hp: UNIT_TYPES.worker.maxHp, position: { x: 500, y: -950 }, target: null },
  { id: 24, type: 'warrior', group: 3, hp: UNIT_TYPES.warrior.maxHp, position: { x: 750, y: -950 }, target: null },
  { id: 25, type: 'warrior', group: 3, hp: UNIT_TYPES.warrior.maxHp, position: { x: 700, y: -1300 }, target: null },
]
export default START_UNITS

// кнопки панели, action вызывается из стора
export const COMMANDS: Record<string, Command> = {
  destroy: { id: 'destroy', label: 'Самоуничтожение', action: 'world/destroySelectedUnits' },
}
