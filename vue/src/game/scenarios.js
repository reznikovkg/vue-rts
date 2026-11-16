// Расстановка кланов и подготовка приказов: в бою участвуют все кланы, сколько бы их ни было.
import { createBuilding, createUnit, isBuilding, isUnit } from './entities.js'
import { addOrders, ORDER_TYPES } from './events.js'
import { createGroups } from './groups.js'
import { findBuildingSpot } from './placement.js'
import { findSpawnPoint } from './spawn.js'

export const DEFAULT_GROUP_COUNT = 2
const BASE_RADIUS = 28 // на таком расстоянии от центра карты кланы ставят базы
const START_UNITS = ['slow', 'slow', 'fast']

// база клана: особняк, хижина рядом и трое бойцов перед особняком
// кланы расходятся по кругу от центра, угол у каждого свой; занято - берем ближайшее свободное место
export const createBase = (map, entities, group, index) => {
  const angle = index * 2.4
  const near = { x: Math.cos(angle) * BASE_RADIUS, y: Math.sin(angle) * BASE_RADIUS }
  const castleSpot = findBuildingSpot(map, entities, 'castle', near)
  if (!castleSpot) return []
  const base = [createBuilding('castle', castleSpot.x, castleSpot.y, group.id)]
  const houseSpot = findBuildingSpot(map, [...entities, ...base], 'house', { x: castleSpot.x - 4, y: castleSpot.y })
  if (houseSpot) base.push(createBuilding('house', houseSpot.x, houseSpot.y, group.id))
  START_UNITS.forEach((type) => {
    const point = findSpawnPoint(map, [...entities, ...base], base[0], type)
    if (point) base.push(createUnit(type, point.x, point.y, group.id))
  })
  return base
}

// очередь атак: каждый персонаж по порядку идет на все цели из targets чужих кланов
// сначала бойцы, потом здания, внутри - ближайшие
export const planAttacks = (events, nextEventId, units, targets, append = true) => {
  let next = { events, nextEventId }
  units.forEach((unit) => {
    targets
      .filter((target) => target.groupId !== unit.groupId)
      .sort((a, b) => {
        if (isBuilding(a) !== isBuilding(b)) return isBuilding(a) ? 1 : -1
        return Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y)
      })
      .forEach((target, index) => {
        const first = !append && index === 0 // первый приказ заменяет старую очередь
        next = addOrders(next.events, next.nextEventId, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: target.id }, !first)
      })
  })
  return next
}

// новая партия на groupCount кланов: у каждого база, у каждого бойца цепочка атак по всем чужим
export const createBattle = (map, groupCount = DEFAULT_GROUP_COUNT) => {
  const groups = createGroups(groupCount)
  const entities = []
  groups.forEach((group, index) => entities.push(...createBase(map, entities, group, index + 1)))
  const { events, nextEventId } = planAttacks([], 1, entities.filter(isUnit), entities)
  return { groups, entities, events, nextEventId }
}
