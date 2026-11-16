// События отдельно от элементов карты. Кадр — это применение текущих событий к элементам.
// Цепочка одного юнита делит linkId: событие с меньшим order выполняется первым,
// после его завершения в том же кадре начинается следующее.
import { isBuilding, isUnit, MOVE_RESULT, stepToward, getContact, getAttackPosition, strike } from './objects.js'
import { findPath, isPathClear, skipPassedWaypoints } from './pathfinding.js'

export const EVENT_TYPES = {
  MOVE: 'move',
  ATTACK: 'attack',
}

let nextEventId = 1
let nextLinkId = 1

// path — точки обходного маршрута вокруг зданий; вычисляется при первом кадре события
// (от реальной позиции юнита) и живёт внутри этого же события. Пустой массив — путь по прямой.
export const createMoveEvent = (elementId, linkId, order, x, y) => ({
  id: nextEventId++,
  type: EVENT_TYPES.MOVE,
  elementId,
  linkId,
  order,
  x,
  y,
  path: null,
})

// Атака: юнит подходит к цели и бьёт её, пока цель жива. path — обход зданий на подходе к цели.
export const createAttackEvent = (elementId, linkId, order, targetId) => ({
  id: nextEventId++,
  type: EVENT_TYPES.ATTACK,
  elementId,
  linkId,
  order,
  targetId,
  path: null,
})

const chainOf = (events, elementId) => events
  .filter(event => event.elementId === elementId)
  .sort((a, b) => a.order - b.order)

// queue: дописать приказ в текущую цепочку. Иначе прежние события этих юнитов заменяются.
// Приказ с targetId — атака цели, иначе — движение в точку (x, y).
export const issueOrders = (events, orders, queue) => {
  const elementIds = new Set(orders.map(order => order.elementId))
  const next = queue ? events.slice() : events.filter(event => !elementIds.has(event.elementId))

  orders.forEach(order => {
    const chain = chainOf(next, order.elementId)
    const linkId = chain.length ? chain[0].linkId : nextLinkId++
    const orderIndex = chain.reduce((max, event) => Math.max(max, event.order), -1) + 1
    next.push(order.targetId
      ? createAttackEvent(order.elementId, linkId, orderIndex, order.targetId)
      : createMoveEvent(order.elementId, linkId, orderIndex, order.x, order.y))
  })

  return next
}

// Кадр атаки: в зоне удара — удар, иначе шаг к цели. Прямой подход проверяется тем же
// предикатом, что и построение пути (здания и вода): закрыт — идём по обходному пути.
// false — к цели не подойти, атака снимается.
const attackFrame = (unit, target, event, time, buildings, map) => {
  const contact = getContact(unit, target)
  if (contact.gap <= unit.type.attack.range) {
    event.path = null
    strike(unit, target)
    return true
  }

  const position = getAttackPosition(unit, contact)
  if (isPathClear(unit, position, unit, buildings)) {
    event.path = null // прямой подход свободен — обходной путь больше не нужен
  } else if (!event.path?.length) {
    event.path = findPath(unit, position, buildings, map) ?? []
  }

  if (event.path?.length) {
    // Срезаем углы на подходе: прямой путь до дальней точки маршрута или до цели короче.
    // Срез может опустошить путь — тогда шагаем прямо к точке удара.
    skipPassedWaypoints(unit, event.path, position, buildings)
    const waypoint = event.path.length ? event.path[0] : position
    const result = stepToward(unit, waypoint, time, buildings)
    if (result.status === MOVE_RESULT.DONE && event.path.length) event.path.shift()
    return result.status !== MOVE_RESULT.BLOCKED
  }

  const result = stepToward(unit, position, time, buildings)
  if (result.status !== MOVE_RESULT.BLOCKED) return true

  // Страховка: прямой шаг заблокирован зданием — считаем обход
  event.path = findPath(unit, position, buildings, map) ?? []
  return event.path.length > 0
}

// Следующий кадр. Координаты элементов обновляются на месте.
// Законченное событие снимается с очереди, остаток времени кадра уходит следующему в той же связи.
// Юнит идёт по точкам обходного маршрута события; если шаг всё же упирается в здание,
// снимается вся оставшаяся цепочка этого юнита.
export const nextFrame = (elements, events, delta, map) => {
  if (!events.length || delta <= 0) return events

  const buildings = elements.filter(isBuilding)
  const byId = new Map(elements.map(element => [element.id, element]))
  const removeIds = new Set()

  const elementIds = new Set(events.map(event => event.elementId))
  elementIds.forEach(elementId => {
    const element = byId.get(elementId)
    const chain = chainOf(events, elementId)
    if (!element || !isUnit(element)) {
      chain.forEach(event => removeIds.add(event.id))
      return
    }

    let time = delta
    for (let index = 0; index < chain.length && time > 0; index++) {
      const event = chain[index]
      if (event.type === EVENT_TYPES.ATTACK) {
        const target = byId.get(event.targetId)
        // Цель уничтожена — атака закончена, время кадра уходит следующему событию
        if (!target || target.health <= 0) {
          removeIds.add(event.id)
          continue
        }
        if (!attackFrame(element, target, event, time, buildings, map)) {
          chain.slice(index).forEach(item => removeIds.add(item.id))
        }
        return
      }
      if (!event.path) event.path = findPath(element, event, buildings, map) ?? []
      // Срезаем углы на ходу: прямой путь до дальней точки маршрута (или до цели) короче
      skipPassedWaypoints(element, event.path, event, buildings)

      // Точки маршрута внутри одного события: дойдя до очередной, сразу идём к следующей
      for (;;) {
        const waypoint = event.path.length ? event.path[0] : event
        const result = stepToward(element, waypoint, time, buildings)
        if (result.status === MOVE_RESULT.MOVING) return

        if (result.status === MOVE_RESULT.BLOCKED) {
          chain.slice(index).forEach(item => removeIds.add(item.id))
          return
        }

        time = result.remaining
        if (event.path.length) {
          event.path.shift()
          continue
        }
        removeIds.add(event.id)
        break
      }
    }
  })

  if (!removeIds.size) return events
  return events.filter(event => !removeIds.has(event.id))
}
