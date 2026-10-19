// Объекты мира: юниты и здания. Характеристики объекта задаются его типом из UNIT_TYPES / BUILDING_TYPES.
export const OBJECT_KINDS = {
  UNIT: 'unit',
  BUILDING: 'building',
}

export const UNIT_TYPES = {
  VILLAGER: { name: 'Крестьянин', speed: 70, radius: 9, maxHealth: 25, color: '#ffd376' },
  MILITIA: { name: 'Ополченец', speed: 95, radius: 10, maxHealth: 40, color: '#e07b5a' },
  SCOUT: { name: 'Разведчик', speed: 160, radius: 12, maxHealth: 45, color: '#8ab4e8' },
}

// size — сторона квадратного основания в мировых единицах (на экране — ромб), height — высота стен в пикселях
export const BUILDING_TYPES = {
  TOWN_CENTER: { name: 'Городской центр', size: 160, height: 48, maxHealth: 2400, color: '#b08a5a' },
  HOUSE: { name: 'Дом', size: 80, height: 28, maxHealth: 550, color: '#c9a678' },
  BARRACKS: { name: 'Казармы', size: 120, height: 36, maxHealth: 1200, color: '#9c7b55' },
}

let nextId = 1

export const createUnit = (type, x, y) => ({
  id: nextId++,
  kind: OBJECT_KINDS.UNIT,
  type,
  x,
  y,
  health: type.maxHealth,
  target: null,
})

export const createBuilding = (type, x, y) => ({
  id: nextId++,
  kind: OBJECT_KINDS.BUILDING,
  type,
  x,
  y,
  health: type.maxHealth,
})

export const isUnit = (object) => object.kind === OBJECT_KINDS.UNIT
export const isBuilding = (object) => object.kind === OBJECT_KINDS.BUILDING

// Задевает ли круг юнита в точке (x, y) квадратное основание здания
const overlapsBuilding = (unit, x, y, building) => {
  const half = building.type.size / 2
  const nearestX = Math.max(building.x - half, Math.min(x, building.x + half))
  const nearestY = Math.max(building.y - half, Math.min(y, building.y + half))
  return Math.hypot(x - nearestX, y - nearestY) < unit.type.radius
}

// Перемещает юнита к цели на speed * delta мировых единиц.
// Если следующий шаг заходит в здание, юнит останавливается.
export const moveUnit = (unit, delta, buildings) => {
  if (!unit.target) return

  const dx = unit.target.x - unit.x
  const dy = unit.target.y - unit.y
  const distance = Math.hypot(dx, dy)
  const step = unit.type.speed * delta
  const next = distance <= step
    ? unit.target
    : { x: unit.x + dx / distance * step, y: unit.y + dy / distance * step }

  if (buildings.some(building => overlapsBuilding(unit, next.x, next.y, building))) {
    unit.target = null
    return
  }

  unit.x = next.x
  unit.y = next.y
  if (next === unit.target) unit.target = null
}

// Глубина объекта для изометрии по его центру: чем больше x + y, тем ближе объект к зрителю
export const getDepth = (object) => object.x + object.y
