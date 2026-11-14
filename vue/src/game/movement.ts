import { UNIT_TYPES } from './config'
import { isSegmentFree } from './obstacles'
import { findPath } from './pathfinding'
import { clampFootprintToMap, unitFootprint } from './spatial'
import type { CollisionWorld, Footprint } from './spatial'
import type { Point, Unit } from './types'

const REPATH_SECONDS = 0.25
const MAX_FRAME_SECONDS = 0.1
const margin = (unit: Unit) => unitFootprint(unit).halfWidth

// местность юнита: по ней проходимость проверяют и движение, и поиск пути
const terrainOf = (unit: Unit) => UNIT_TYPES[unit.type].terrain

// параметры навигации для юнита в мире сценария
const navigationOptions = (world: CollisionWorld, unit: Unit) => ({
  units: world.units,
  ignoreId: unit.id,
  terrain: terrainOf(unit),
  terrainMap: world.terrainMap,
})

// Игровое состояние меняется внутри синхронных mutations Vuex
export const orderUnit = (world: CollisionWorld, unit: Unit, target: Point, reserved: readonly Footprint[] = []) => {
  if (!Number.isFinite(target.x) || !Number.isFinite(target.y)) return
  const path = findPath(unit.position, target, world.objects, margin(unit), {
    ...navigationOptions(world, unit), reserved,
  })
  unit.path = path.length ? path : null
  unit.target = path.length ? path[path.length - 1] : null
  unit.blockedFor = 0
}

export const advanceUnits = (world: CollisionWorld, secondsPassed: number) => {
  if (!Number.isFinite(secondsPassed) || secondsPassed <= 0) return
  const seconds = Math.min(secondsPassed, MAX_FRAME_SECONDS)
  // Обновляем по ID: занятое первым юнитом место сразу учитывается у следующих
  for (const unit of [...world.units].sort((a, b) => a.id - b.id)) {
    if (!unit.target) continue
    let budget = UNIT_TYPES[unit.type].speedPxPerSecond * seconds
    const options = navigationOptions(world, unit)
    if (!unit.path?.length) unit.path = [unit.target]
    // Остаток шага переносим на следующую точку пути в том же кадре
    while (budget > 0 && unit.path.length) {
      const waypoint = unit.path[0]
      const dx = waypoint.x - unit.position.x
      const dy = waypoint.y - unit.position.y
      const distance = Math.hypot(dx, dy)
      const step = Math.min(budget, distance)
      const next = distance <= budget ? waypoint : {
        x: unit.position.x + dx / distance * step,
        y: unit.position.y + dy / distance * step,
      }
      if (!isSegmentFree(unit.position, next, world.objects, margin(unit), options)) {
        unit.blockedFor = (unit.blockedFor ?? 0) + seconds
        if (unit.blockedFor >= REPATH_SECONDS) {
          // Неполный маршрут не должен завершить временно заблокированный приказ
          const path = findPath(unit.position, unit.target, world.objects, margin(unit), { ...options, allowPartial: false })
          // Сохраняем цель, если обхода пока нет: следующий поиск повторится по таймеру
          unit.path = path.length ? path : null
          if (path.length) unit.target = path[path.length - 1]
          unit.blockedFor = 0
        }
        break
      }
      unit.position = { ...next }
      // нос смотрит по направлению шага: рисование судов в изометрии поворачивает корпус по этому углу
      if (distance > 0) unit.facing = Math.atan2(dy, dx)
      unit.blockedFor = 0
      budget -= step
      if (distance <= step) {
        unit.path.shift()
        if (!unit.path.length) {
          unit.target = null
          unit.path = null
          break
        }
      }
    }
  }
}

export const clampUnitTarget = (unit: Unit, position: Point): Point =>
  clampFootprintToMap({ ...unitFootprint(unit), position })
