// Один кадр: берём состояние карты и текущие события, применяем приказы и
// возвращаем новое состояние. Компоненты ничего не рассчитывают сами.
import { advanceBattle } from './combat.js'
import { canAttack, isUnit, stepToTarget, typeOf } from './entities.js'
import { ORDER_TYPES, removeOrder } from './events.js'
import { advanceUnit, routeUnit } from './pathfinding.js'

export const advanceFrame = (entities, events, dt, map) => {
  let nextEntities = entities.map((entity) => ({ ...entity }))
  let nextEvents = events.map((event) => ({ ...event }))
  const byId = new Map(nextEntities.map((entity) => [entity.id, entity]))
  const firstOrder = (unit) => nextEvents.find((event) => event.unitId === unit.id)
  const finish = (event) => (nextEvents = removeOrder(nextEvents, event.id))

  // Устанавливаем актуальный приказ. Недействительные цели пропускаем,
  // чтобы они не блокировали следующие события в очереди.
  const activate = (unit) => {
    let event = firstOrder(unit)
    while (event?.type === ORDER_TYPES.ATTACK && !canAttack(unit, byId.get(event.targetId))) {
      finish(event)
      event = firstOrder(unit)
    }

    if (event?.type === ORDER_TYPES.MOVE) {
      if (map) {
        if (unit.activeEventId !== event.id) routeUnit(map, nextEntities, unit, event.target, event.groupIds)
      } else unit.target = { ...event.target }
      unit.attackTargetId = null
      unit.attackCooldown = 0
    } else if (event?.type === ORDER_TYPES.ATTACK) {
      if (unit.activeEventId !== event.id) {
        unit.target = null
        unit.path = []
        unit.routeGoal = null
        unit.repathDelay = 0
      }
      if (unit.attackTargetId !== event.targetId) unit.attackCooldown = 0
      unit.attackTargetId = event.targetId
    } else {
      unit.target = null
      unit.path = []
      unit.attackTargetId = null
      unit.attackCooldown = 0
    }
    unit.activeEventId = event?.id ?? null
    return event
  }

  const moveDistances = new Map()
  nextEntities.filter(isUnit).forEach((unit) => {
    const event = activate(unit)
    if (event?.type === ORDER_TYPES.MOVE) {
      moveDistances.set(unit.id, Math.hypot(unit.x - event.target.x, unit.y - event.target.y))
    }
  })

  // Движение и бой рассчитываются в одной симуляции, а не в SVG-компонентах.
  nextEntities = advanceBattle(nextEntities, dt, map)
  const aliveIds = new Set(nextEntities.map((entity) => entity.id))
  nextEvents = nextEvents.filter((event) => aliveIds.has(event.unitId))

  nextEntities.filter(isUnit).forEach((unit) => {
    const event = firstOrder(unit)
    if (!event) return

    if (event.type === ORDER_TYPES.ATTACK) {
      // Атака завершается, когда цель погибла или перестала быть доступна.
      if (!canAttack(unit, nextEntities.find((entity) => entity.id === event.targetId))) {
        finish(event)
        activate(unit)
      }
      return
    }

    if (unit.target) return // точка ещё не достигнута
    finish(event)

    // Если в одном кадре дошли до точки, используем оставшееся время
    // для следующего участка: между точками маршрута нет остановки.
    let remaining = map ? unit.remainingTime : Math.max(0, dt - moveDistances.get(unit.id) / typeOf(unit).speed)
    let next = activate(unit)
    while (next?.type === ORDER_TYPES.MOVE && remaining > 0) {
      const distance = Math.hypot(next.target.x - unit.x, next.target.y - unit.y)
      if (map) remaining = advanceUnit(map, nextEntities, unit, remaining)
      else Object.assign(unit, stepToTarget(unit, remaining))
      if (unit.target) break
      if (!map) remaining = Math.max(0, remaining - distance / typeOf(unit).speed)
      finish(next)
      next = activate(unit)
    }
  })

  nextEntities.filter(isUnit).forEach((unit) => delete unit.remainingTime)

  return { entities: nextEntities, events: nextEvents }
}
