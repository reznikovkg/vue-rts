// объекты на карте: персонажи и здания
// характеристики лежат в таблицах: новый тип = новая строка, новое свойство = новое поле
// size - сторона квадрата в клетках (на экране ромб), скорость считается в клетках в секунду

import { TERRAIN_TYPES } from './map.js'

export const KINDS = { UNIT: 'unit', BUILDING: 'building' }

// водным типам пока заданы базовые боевые характеристики медленного персонажа
export const UNIT_TYPES = {
  slow: { name: 'Медленный', maxHp: 120, attack: 18, attackSpeed: 1, speed: 1.5, size: 0.8, color: '#3d6fb8', terrain: TERRAIN_TYPES.LAND },
  fast: { name: 'Быстрый', maxHp: 75, attack: 11, attackSpeed: 2, speed: 3, size: 0.8, color: '#b8432f', terrain: TERRAIN_TYPES.LAND },
  swimmer: { name: 'Пловец', maxHp: 120, attack: 18, attackSpeed: 1, speed: 2, size: 0.8, color: '#e0c55a', terrain: TERRAIN_TYPES.WATER },
  boat: { name: 'Лодка', maxHp: 120, attack: 18, attackSpeed: 1, speed: 3, size: 0.8, color: '#d6ac6a', terrain: TERRAIN_TYPES.WATER, ship: true },
  ship: { name: 'Корабль', maxHp: 120, attack: 18, attackSpeed: 1, speed: 2, size: 1.6, color: '#bd8050', terrain: TERRAIN_TYPES.WATER, ship: true },
  largeShip: { name: 'Большой корабль', maxHp: 120, attack: 18, attackSpeed: 1, speed: 1.5, size: 2.4, color: '#926347', terrain: TERRAIN_TYPES.WATER, ship: true },
}

// здание size x size клеток; порядок здесь = порядок кнопок в панели стройки
// spawns - тип персонажа или список типов, которые здание создает (нет поля - никого не создает)
// новым зданиям пока задано базовое здоровье дома
export const BUILDING_TYPES = {
  tower: { name: 'Башня', maxHp: 160, size: 1, color: '#6f7d5c' },
  house: { name: 'Дом', maxHp: 160, size: 2, color: '#8a6d4b' },
  barracks: { name: 'Казарма', maxHp: 160, size: 3, color: '#6b5b7b', spawns: 'slow' },
  castle: { name: 'Замок', maxHp: 400, size: 4, color: '#7d7f86', spawns: 'fast' },
  shipyard: { name: 'Верфь', maxHp: 160, size: 6, color: '#96724e', spawns: ['boat', 'ship', 'largeShip'] },
  waterBase: { name: 'Водная база', maxHp: 160, size: 3, color: '#438a98', terrain: TERRAIN_TYPES.WATER, spawns: 'swimmer' },
}

let nextId = 1

// target - текущая цель, path - следующие точки пути, repathDelay - пауза до следующей попытки обхода
export const createUnit = (type, x, y, groupId = 'group1') => ({
  id: nextId++, kind: KINDS.UNIT, type, groupId, x, y,
  hp: UNIT_TYPES[type].maxHp,
  target: null, path: [], repathDelay: 0,
  attackTargetId: null, // id цели для атаки
  attackCooldown: 0, // секунды до следующего удара
})

export const createBuilding = (type, x, y, groupId = 'group1', direction = 'east') => ({
  id: nextId++, kind: KINDS.BUILDING, type, groupId, x, y, direction,
  hp: BUILDING_TYPES[type].maxHp,
})

// корпус вписан в круг, который используется при проверке столкновений
export const shipPoints = (x, y, size) => [
  [0.5, 0], [0.25, 0.3], [-0.35, 0.3], [-0.45, 0], [-0.35, -0.3], [0.25, -0.3],
].map(([dx, dy]) => `${x + dx * size},${y + dy * size}`).join(' ')

export const typeOf = (entity) => (entity.kind === KINDS.UNIT ? UNIT_TYPES : BUILDING_TYPES)[entity.type]

export const isUnit = (entity) => entity.kind === KINDS.UNIT

export const isBuilding = (entity) => entity.kind === KINDS.BUILDING

// атаковать можно только живого противника, будь то персонаж или здание
export const canAttack = (unit, target) =>
  !!unit && isUnit(unit) && unit.hp > 0 && !!target && target.hp > 0 && unit.groupId !== target.groupId

// сначала ищем фигуру под курсором, затем небольшой допуск вокруг нее
const HIT_PADDING = 0.35
const byDepth = (a, b) => a.x + a.y - (b.x + b.y)
const containsEntity = (entity, point, padding) => {
  const radius = typeOf(entity).size / 2 + padding
  const dx = Math.abs(entity.x - point.x)
  const dy = Math.abs(entity.y - point.y)
  if (isBuilding(entity)) return dx <= radius && dy <= radius
  return Math.hypot(dx, dy) <= radius
}

export const entityAtPoint = (entities, point) => {
  const units = entities.filter((entity) => entity.hp > 0 && isUnit(entity)).sort(byDepth).reverse()
  const buildings = entities.filter((entity) => entity.hp > 0 && isBuilding(entity)).sort(byDepth).reverse()
  const visible = [...units, ...buildings]
  return visible.find((entity) => containsEntity(entity, point, 0))
    ?? visible.find((entity) => containsEntity(entity, point, HIT_PADDING))
    ?? null
}

// стартовая расстановка (здания стоят ровно по клеткам: центр + половина размера)
export const createStartEntities = () => [
  createBuilding('castle', -8, -8),
  createBuilding('house', 7, -5),
  createUnit('slow', -2, 2),
  createUnit('slow', 0, 3),
  createUnit('fast', 3, 1),
  createUnit('swimmer', 20, 0),
  createUnit('swimmer', 22, 0),
]

// шаг к цели за dt секунд: путь = скорость * dt, поэтому скорость не зависит от fps
// возвращает новые координаты, цель и остаток пути (цель null - дошел до конца)
export const stepToTarget = (unit, dt) => {
  const next = { x: unit.x, y: unit.y, target: unit.target, path: unit.path } // начинаем с текущего положения
  if (!unit.target) return next

  const dx = unit.target.x - unit.x
  const dy = unit.target.y - unit.y
  const dist = Math.hypot(dx, dy)
  const step = UNIT_TYPES[unit.type].speed * dt

  if (dist <= step) {
    // ближе шага - встаем ровно в точку и берем следующую из пути (нет ее - останавливаемся)
    next.x = unit.target.x
    next.y = unit.target.y
    next.target = unit.path[0] ?? null
    next.path = unit.path.slice(1)
  } else {
    // идем в сторону цели на длину шага
    next.x += (dx / dist) * step
    next.y += (dy / dist) * step
  }

  return next
}
