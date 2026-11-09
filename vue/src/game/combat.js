import { canAttack, isBuilding, isUnit, stepToTarget, typeOf } from './entities.js'
import { advanceUnit, routeUnit } from './pathfinding.js'

// ближняя атака: расстояние от края объекта, а не от его центра
const ATTACK_RANGE = 0.65

export const distanceToTarget = (unit, target) => {
  if (isBuilding(target)) {
    const half = typeOf(target).size / 2
    const dx = Math.max(0, Math.abs(unit.x - target.x) - half)
    const dy = Math.max(0, Math.abs(unit.y - target.y) - half)
    return Math.hypot(dx, dy)
  }

  return Math.max(0, Math.hypot(unit.x - target.x, unit.y - target.y) - typeOf(target).size / 2)
}

// шаг симуляции: движение и атака зависят от dt, а не от частоты кадров
export const advanceBattle = (entities, dt, map) => {
  const byId = new Map(entities.map((entity) => [entity.id, entity]))

  entities.filter(isUnit).forEach((unit) => {
    if (unit.hp <= 0) return

    // свободное перемещение без приказа атаковать
    if (unit.attackTargetId === null) {
      if (map) unit.remainingTime = advanceUnit(map, entities, unit, dt)
      else if (unit.target) Object.assign(unit, stepToTarget(unit, dt))
      return
    }

    const enemy = byId.get(unit.attackTargetId)
    if (!canAttack(unit, enemy)) {
      unit.attackTargetId = null
      unit.attackCooldown = 0
      return
    }

    const stats = typeOf(unit)
    const contactDistance = ATTACK_RANGE + stats.size / 2
    const distance = distanceToTarget(unit, enemy)

    if (distance > contactDistance) {
      // догоняем текущую позицию цели, в том числе движущейся
      const dx = enemy.x - unit.x
      const dy = enemy.y - unit.y
      const length = Math.hypot(dx, dy)
      const step = Math.min(stats.speed * dt, distance - contactDistance)

      if (map) {
        const moved = !unit.routeGoal || Math.hypot(unit.routeGoal.x - enemy.x, unit.routeGoal.y - enemy.y) > 0.5
        if ((moved || !unit.target) && !unit.repathDelay) {
          // для атаки достаточно любой свободной точки в радиусе удара
          routeUnit(map, entities.filter((entity) => entity.hp > 0), unit, enemy, [],
            (point) => distanceToTarget(point, enemy) <= contactDistance + 1e-6)
          unit.repathDelay = 0.5
        }
        advanceUnit(map, entities, unit, Math.min(dt, (distance - contactDistance) / stats.speed))
      } else if (length > 0 && step > 0) {
        unit.x += (dx / length) * step
        unit.y += (dy / length) * step
      }

      // Если достигли дистанции удара в этом же кадре, сразу атакуем.
      if (distanceToTarget(unit, enemy) > contactDistance + 1e-6) {
        unit.attackCooldown = 0
        return
      }
    }

    unit.target = null
    unit.path = []
    // наносим фиксированный урон не чаще, чем attackSpeed ударов в секунду
    unit.attackCooldown -= dt
    if (unit.attackCooldown <= 0) {
      enemy.hp = Math.max(0, enemy.hp - stats.attack)
      unit.attackCooldown += 1 / stats.attackSpeed
      if (enemy.hp === 0) {
        unit.attackTargetId = null
        unit.attackCooldown = 0
      }
    }
  })

  // удаляем уничтоженные объекты и отменяем приказы на исчезнувшие цели
  const alive = entities.filter((entity) => entity.hp > 0)
  const aliveIds = new Set(alive.map((entity) => entity.id))
  alive.filter(isUnit).forEach((unit) => {
    if (unit.attackTargetId !== null && !aliveIds.has(unit.attackTargetId)) {
      unit.attackTargetId = null
      unit.attackCooldown = 0
    }
  })

  return alive
}
