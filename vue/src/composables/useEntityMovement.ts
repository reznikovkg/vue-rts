import { onBeforeUnmount, onMounted } from 'vue'
import type { Entity } from '@/game/entities'
import { world, type Point } from '@/game/world'

export const useEntityMovement = (entities: Entity[]) => {
  const targets = new Map<number, Point>()
  let frame = 0
  let previousTime = 0

  const move = (entity: Entity, target: Point) => {
    if (entity.speed > 0) targets.set(entity.id, target)
  }

  const update = (time: number) => {
    const seconds = Math.min((time - previousTime) / 1000, 0.05)
    previousTime = time

    entities.forEach((entity) => {
      const target = targets.get(entity.id)
      if (!target) return

      const dx = target.x - entity.x
      const dy = target.y - entity.y
      const distance = Math.hypot(dx, dy)
      const step = entity.speed * seconds

      if (distance <= step) {
        entity.x = target.x
        entity.y = target.y
        targets.delete(entity.id)
        return
      }

      entity.x += dx / distance * step
      entity.y += dy / distance * step
    })

    frame = requestAnimationFrame(update)
  }

  const boundedTarget = (entity: Entity, target: Point): Point => {
    const radius = entity.size / 2
    return {
      x: Math.max(-world.width / 2 + radius, Math.min(target.x, world.width / 2 - radius)),
      y: Math.max(-world.height / 2 + radius, Math.min(target.y, world.height / 2 - radius)),
    }
  }

  onMounted(() => { frame = requestAnimationFrame(update) })
  onBeforeUnmount(() => cancelAnimationFrame(frame))

  return { move, boundedTarget }
}
