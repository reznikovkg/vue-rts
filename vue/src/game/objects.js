// Объекты мира: юниты и здания. Характеристики объекта задаются его типом из UNIT_TYPES / BUILDING_TYPES.
export const OBJECT_KINDS = {
  UNIT: 'unit',
  BUILDING: 'building',
}

// attack: damage — сколько здоровья снимает удар, interval — секунд между ударами (скорость атаки),
// range — дистанция удара от края юнита до края цели.
// strength — сила персонажа (добавленная характеристика).
export const UNIT_TYPES = {
  // Сила 3: слабый юнит 
  VILLAGER: { name: 'Крестьянин', speed: 70, radius: 9, maxHealth: 25, strength: 3, color: '#ffd376', attack: { damage: 3, interval: 2, range: 6 } },
  // Сила 12: сильный боевой юнит
  MILITIA: { name: 'Ополченец', speed: 95, radius: 10, maxHealth: 40, strength: 12, color: '#e07b5a', attack: { damage: 6, interval: 1.5, range: 6 } },
  // Сила 7: средний юнит
  SCOUT: { name: 'Разведчик', speed: 160, radius: 12, maxHealth: 45, strength: 7, color: '#8ab4e8', canSwim: true, attack: { damage: 4, interval: 1, range: 6 } },
}

// size — сторона квадратного основания в мировых единицах (на экране — ромб), height — высота стен в пикселях,
// spawns — ключи UNIT_TYPES, которые можно создать в этом здании
export const BUILDING_TYPES = {
  TOWN_CENTER: { name: 'Городской центр', size: 160, height: 48, maxHealth: 2400, color: '#b08a5a', spawns: ['VILLAGER'] },
  HOUSE: { name: 'Дом', size: 80, height: 28, maxHealth: 550, color: '#c9a678', spawns: [] },
  BARRACKS: { name: 'Казармы', size: 120, height: 36, maxHealth: 1200, color: '#9c7b55', spawns: ['MILITIA', 'SCOUT'] },
  TOWER: { name: 'Башня', size: 160, height: 40, maxHealth: 800, color: '#7a8a9c', spawns: [] },
}

// Группы игроков: число групп не ограничено. Цвет группы — обводка юнита и флаг на здании.
// Первые группы берут цвета из списка, следующие — оттенок по номеру группы.
export const GROUP_COLORS = ['#3d7be0', '#d6453a', '#8e5ad6', '#3fae5a', '#e0912f', '#2fb5b5', '#d64f9c', '#c9c23a']

export const getGroupColor = (group) => GROUP_COLORS[group - 1] ?? `hsl(${(group * 137) % 360}, 65%, 55%)`
export const getGroupName = (group) => `Группа ${group}`

let nextId = 1

export const createUnit = (type, x, y, group = 1) => ({
  id: nextId++,
  kind: OBJECT_KINDS.UNIT,
  type,
  x,
  y,
  group,
  health: type.maxHealth,
  // Сколько секунд осталось до следующего удара
  attackCooldown: 0,
  canSwim: type.canSwim || false,
})

export const createBuilding = (type, x, y, group = 1) => ({
  id: nextId++,
  kind: OBJECT_KINDS.BUILDING,
  type,
  x,
  y,
  group,
  health: type.maxHealth,
})

export const isUnit = (object) => object.kind === OBJECT_KINDS.UNIT
export const isBuilding = (object) => object.kind === OBJECT_KINDS.BUILDING

// Задевает ли круг радиуса radius с центром (x, y) квадратное основание здания
export const circleOverlapsBuilding = (x, y, radius, building) => {
  const half = building.type.size / 2
  const nearestX = Math.max(building.x - half, Math.min(x, building.x + half))
  const nearestY = Math.max(building.y - half, Math.min(y, building.y + half))
  return Math.hypot(x - nearestX, y - nearestY) < radius
}

// Задевает ли круг юнита в точке (x, y) квадратное основание здания
const overlapsBuilding = (unit, x, y, building) => circleOverlapsBuilding(x, y, unit.type.radius, building)

import { isWater } from './terrain.js'

// Шаг между кольцами поиска места и число точек на кольце
const SPAWN_GAP = 6
const SPAWN_POINTS_PER_RING = 12
const SPAWN_MAX_RINGS = 8

// Свободная точка рядом со зданием для нового юнита: не в здании, не на другом юните, внутри карты.
// Кольца расходятся от основания здания; поиск начинается с угла, ближнего к зрителю (+x, +y).
export const findSpawnPoint = (building, unitType, elements, map) => {
  const radius = unitType.radius
  const buildings = elements.filter(isBuilding)
  const units = elements.filter(isUnit)
  const isFree = (x, y) => Math.abs(x) <= map.width / 2 && Math.abs(y) <= map.height / 2 && !isWater(x, y, radius)
    && !buildings.some(other => circleOverlapsBuilding(x, y, radius + 1, other))
    && !units.some(unit => Math.hypot(unit.x - x, unit.y - y) < unit.type.radius + radius + 2)

  for (let ring = 0; ring < SPAWN_MAX_RINGS; ring++) {
    const distance = building.type.size / 2 * Math.SQRT2 + radius + SPAWN_GAP + ring * (radius * 2 + SPAWN_GAP)
    for (let index = 0; index < SPAWN_POINTS_PER_RING; index++) {
      const step = Math.ceil(index / 2) * (index % 2 ? 1 : -1)
      const angle = Math.PI / 4 + step * (2 * Math.PI / SPAWN_POINTS_PER_RING)
      const x = building.x + Math.cos(angle) * distance
      const y = building.y + Math.sin(angle) * distance
      if (isFree(x, y)) return { x, y }
    }
  }
  return null
}

// Ближайшая к юниту точка цели и зазор между краем юнита и краем цели
export const getContact = (unit, target) => {
  if (isBuilding(target)) {
    const half = target.type.size / 2
    const x = Math.max(target.x - half, Math.min(unit.x, target.x + half))
    const y = Math.max(target.y - half, Math.min(unit.y, target.y + half))
    return { x, y, gap: Math.hypot(unit.x - x, unit.y - y) - unit.type.radius }
  }
  return { x: target.x, y: target.y, gap: Math.hypot(unit.x - target.x, unit.y - target.y) - unit.type.radius - target.type.radius }
}

// Точка, в которой юнит встаёт для удара: на линии к цели, с зазором в половину дальности атаки
export const getAttackPosition = (unit, contact) => {
  const distance = Math.hypot(contact.x - unit.x, contact.y - unit.y)
  if (distance === 0) return { x: unit.x, y: unit.y }
  const approach = contact.gap - unit.type.attack.range / 2
  return {
    x: unit.x + (contact.x - unit.x) / distance * approach,
    y: unit.y + (contact.y - unit.y) / distance * approach,
  }
}

// Удар по цели, если перезарядка закончилась
export const strike = (unit, target) => {
  if (unit.attackCooldown > 0) return
  target.health = Math.max(0, target.health - unit.type.attack.damage)
  unit.attackCooldown = unit.type.attack.interval
}

export const MOVE_RESULT = {
  MOVING: 'moving',
  DONE: 'done',
  BLOCKED: 'blocked',
}

// Шаг юнита к точке на speed * delta мировых единиц.
// Координаты меняются на месте. Если шаг заходит в здание, юнит остаётся где был.
export const stepToward = (unit, target, delta, buildings) => {
  const dx = target.x - unit.x
  const dy = target.y - unit.y
  const distance = Math.hypot(dx, dy)
  if (distance === 0) return { status: MOVE_RESULT.DONE, remaining: delta }

  const step = unit.type.speed * delta
  const reached = distance <= step
  const next = reached
    ? target
    : { x: unit.x + (dx / distance) * step, y: unit.y + (dy / distance) * step }

  if (buildings.some(building => overlapsBuilding(unit, next.x, next.y, building))) {
    return { status: MOVE_RESULT.BLOCKED, remaining: 0 }
  }

  unit.x = next.x
  unit.y = next.y
  if (!reached) return { status: MOVE_RESULT.MOVING, remaining: 0 }
  return { status: MOVE_RESULT.DONE, remaining: Math.max(0, delta - distance / unit.type.speed) }
}

// Глубина объекта для изометрии по его центру: чем больше x + y, тем ближе объект к зрителю
export const getDepth = (object) => object.x + object.y
