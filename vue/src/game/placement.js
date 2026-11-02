// стройка: куда встанет здание и можно ли его там поставить
import { canStandOnTerrain, containsPoint, terrainAt, TERRAIN_TYPES } from './map.js'
import { BUILDING_TYPES, isBuilding, typeOf, UNIT_TYPES } from './entities.js'

// углы проверяем чуть внутри здания, чтобы край карты не считался выходом за нее
const EDGE_INSET = 0.001

// погрешность вычислений при касании границ
const COLLISION_EPSILON = 1e-9

export const SHIPYARD_DIRECTIONS = {
  east: { x: 1, y: 0 }, south: { x: 0, y: 1 }, west: { x: -1, y: 0 }, north: { x: 0, y: -1 },
}

// квадрат здания: центр (x, y), сторона size
export const toBox = (x, y, size) => ({
  minX: x - size / 2,
  maxX: x + size / 2,
  minY: y - size / 2,
  maxY: y + size / 2,
})

// корпус на суше, две перемычки к воде и открытый док между ними
export const shipyardLayout = (building) => {
  const direction = SHIPYARD_DIRECTIONS[building.direction ?? 'east']
  const rotate = (box) => {
    const points = [
      [box.minX, box.minY], [box.maxX, box.minY], [box.maxX, box.maxY], [box.minX, box.maxY],
    ].map(([x, y]) => ({ x: building.x + direction.x * x - direction.y * y, y: building.y + direction.y * x + direction.x * y }))
    return {
      minX: Math.min(...points.map((p) => p.x)), maxX: Math.max(...points.map((p) => p.x)),
      minY: Math.min(...points.map((p) => p.y)), maxY: Math.max(...points.map((p) => p.y)),
    }
  }
  return {
    dock: rotate({ minX: -1, maxX: 3, minY: -2, maxY: 2 }),
    parts: [
      { minX: -3, maxX: -1, minY: -3, maxY: 3 },
      { minX: -1, maxX: 3, minY: -3, maxY: -2 },
      { minX: -1, maxX: 3, minY: 2, maxY: 3 },
    ].map(rotate),
  }
}

// верфь ставим поперек берега: тыл целиком на суше, выход целиком на воде
export const shipyardDirection = (map, point) => Object.keys(SHIPYARD_DIRECTIONS).find((key) => {
  const direction = SHIPYARD_DIRECTIONS[key]
  const box = toBox(point.x, point.y, BUILDING_TYPES.shipyard.size)
  for (let x = box.minX; x < box.maxX; x++) {
    for (let y = box.minY; y < box.maxY; y++) {
      const cell = { x: x + 0.5, y: y + 0.5 }
      const front = (cell.x - point.x) * direction.x + (cell.y - point.y) * direction.y >= 0
      if (terrainAt(map, cell) !== (front ? TERRAIN_TYPES.WATER : TERRAIN_TYPES.LAND)) return false
    }
  }
  return true
})

const obstacleBoxes = (entity, unitType) => entity.type === 'shipyard' && unitType?.ship
  ? shipyardLayout(entity).parts
  : [toBox(entity.x, entity.y, typeOf(entity).size)]

export const canUseUnitTerrain = (map, entities, unitType, point) => {
  const docks = unitType.ship ? entities.filter((entity) => isBuilding(entity) && entity.type === 'shipyard').map((entity) => shipyardLayout(entity).dock) : []
  return canStandOnTerrain(map, point, unitType.size / 2, unitType.terrain, docks)
}

export const canPlaceUnit = (map, entities, unitType, point) =>
  canUseUnitTerrain(map, entities, unitType, point) &&
  entities.every((entity) => isClearOfEntity(point, unitType.size / 2, entity, unitType))

// круг персонажа не задевает объект; касание границ разрешено
export const isClearOfEntity = (point, radius, entity, unitType) => {
  const size = typeOf(entity).size
  if (!isBuilding(entity)) {
    return Math.hypot(point.x - entity.x, point.y - entity.y) + COLLISION_EPSILON >= radius + size / 2
  }

  return obstacleBoxes(entity, unitType).every((box) => {
    const nearestX = Math.min(box.maxX, Math.max(box.minX, point.x))
    const nearestY = Math.min(box.maxY, Math.max(box.minY, point.y))
    return Math.hypot(point.x - nearestX, point.y - nearestY) + COLLISION_EPSILON >= radius
  })
}

const distanceToSegment = (point, from, to) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared)) : 0
  return Math.hypot(point.x - from.x - t * dx, point.y - from.y - t * dy)
}

const crossesBox = (from, to, box) => {
  let enter = 0
  let exit = 1
  for (const [axis, min, max] of [['x', box.minX, box.maxX], ['y', box.minY, box.maxY]]) {
    const delta = to[axis] - from[axis]
    if (!delta) {
      if (from[axis] < min || from[axis] > max) return false
    } else {
      const a = (min - from[axis]) / delta
      const b = (max - from[axis]) / delta
      enter = Math.max(enter, Math.min(a, b))
      exit = Math.min(exit, Math.max(a, b))
      if (enter > exit) return false
    }
  }
  return true
}

// проверяем весь шаг, чтобы персонаж не прошел сквозь объект между кадрами
export const isSegmentClear = (from, to, radius, entity, unitType) => {
  const size = typeOf(entity).size
  if (!isBuilding(entity)) {
    return distanceToSegment(entity, from, to) + COLLISION_EPSILON >= radius + size / 2
  }

  return isClearOfEntity(from, radius, entity, unitType) &&
    isClearOfEntity(to, radius, entity, unitType) &&
    obstacleBoxes(entity, unitType).every((box) => !crossesBox(from, to, box) && [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.maxX, y: box.maxY },
      { x: box.minX, y: box.maxY },
    ].every((corner) => distanceToSegment(corner, from, to) + COLLISION_EPSILON >= radius))
}

// здание N x N ставим ровно по клеткам, курсор - примерно центр здания
export const snapToGrid = (type, point) => {
  if (UNIT_TYPES[type]?.ship) return point
  const size = BUILDING_TYPES[type].size
  const left = Math.round(point.x - size / 2)
  const top = Math.round(point.y - size / 2)
  return { x: left + size / 2, y: top + size / 2 }
}

// пересекается ли квадрат с объектом на карте
const overlaps = (box, entity) => {
  const size = typeOf(entity).size

  if (isBuilding(entity)) {
    const other = toBox(entity.x, entity.y, size)
    return box.minX < other.maxX && other.minX < box.maxX && box.minY < other.maxY && other.minY < box.maxY
  }

  // персонаж - круг: ищем ближайшую к его центру точку квадрата
  const nearestX = Math.min(box.maxX, Math.max(box.minX, entity.x))
  const nearestY = Math.min(box.maxY, Math.max(box.minY, entity.y))
  return Math.hypot(entity.x - nearestX, entity.y - nearestY) < size / 2
}

// здания на своей местности (по умолчанию суша), верфь поперек берега, корабли на воде или в доке
export const canPlaceBuilding = (map, entities, type, point) => {
  if (UNIT_TYPES[type]?.ship) return canPlaceUnit(map, entities, UNIT_TYPES[type], point)
  const box = toBox(point.x, point.y, BUILDING_TYPES[type].size)

  const corners = [
    { x: box.minX + EDGE_INSET, y: box.minY + EDGE_INSET },
    { x: box.maxX - EDGE_INSET, y: box.minY + EDGE_INSET },
    { x: box.maxX - EDGE_INSET, y: box.maxY - EDGE_INSET },
    { x: box.minX + EDGE_INSET, y: box.maxY - EDGE_INSET },
  ]
  if (!corners.every((corner) => containsPoint(map, corner))) {
    return false
  }

  if (type === 'shipyard') {
    if (!shipyardDirection(map, point)) return false
  } else {
    const terrain = BUILDING_TYPES[type].terrain ?? TERRAIN_TYPES.LAND
    // проверяем каждую клетку под зданием: вода может оказаться и между его углами
    for (let x = Math.floor(box.minX); x < Math.ceil(box.maxX); x++) {
      for (let y = Math.floor(box.minY); y < Math.ceil(box.maxY); y++) {
        if (terrainAt(map, { x: x + 0.5, y: y + 0.5 }) !== terrain) {
          return false
        }
      }
    }
  }

  return entities.every((entity) => !overlaps(box, entity))
}
