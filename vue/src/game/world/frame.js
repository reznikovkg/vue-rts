export function calculateNextFrame(objects, queues, elapsedSeconds) {
  const nextObjects = objects.map((item) => ({ ...item, stats: { ...item.stats }, destination: item.destination && { ...item.destination } }))
  const nextQueues = Object.fromEntries(Object.entries(queues).map(([id, queue]) => [id, queue.map((event) => ({ ...event }))]))
  for (const unit of nextObjects) {
    const queue = nextQueues[unit.id]
    if (unit.type !== 'unit' || !queue?.length || unit.stats.hp <= 0) continue
    const event = queue[0]
    if (event.type === 'attack') {
      unit.destination = null
      const target = nextObjects.find((item) => item.id === event.targetId && item.stats?.hp > 0)
      if (!target || target.group === unit.group) { queue.shift(); continue }
      const range = (unit.radius ?? 16) + (target.type === 'building' ? (target.sizeN ?? 1) * 20 : target.radius ?? 16) + 10
      const distance = Math.hypot(target.wx - unit.wx, target.wy - unit.wy)
      if (distance <= range) {
        event.cooldown = (event.cooldown ?? 0) - elapsedSeconds
        const period = 1 / Math.max(0.01, unit.stats.attackSpeed || 1)
        while (event.cooldown <= 0 && target.stats.hp > 0) {
          target.stats.hp = Math.max(0, target.stats.hp - (unit.stats.attack || 0))
          event.cooldown += period
        }
        if (target.stats.hp <= 0) queue.shift()
      } else {
        const dx = target.wx - unit.wx
        const dy = target.wy - unit.wy
        const step = Math.min(distance - range, Math.max(0, unit.stats.speed || 0) * elapsedSeconds)
        if (step > 0) { unit.wx += dx / distance * step; unit.wy += dy / distance * step }
      }
      continue
    }
    if (event.type !== 'move') { queue.shift(); continue }
    const dx = event.wx - unit.wx
    const dy = event.wy - unit.wy
    const distance = Math.hypot(dx, dy)
    const step = Math.min(distance, Math.max(0, unit.stats.speed || 0) * elapsedSeconds)
    if (distance > 0 && step > 0) { unit.wx += dx / distance * step; unit.wy += dy / distance * step }
    if (distance <= step + 0.00001) {
      unit.wx = event.wx
      unit.wy = event.wy
      queue.shift()
    }
    unit.destination = queue[0]?.type === 'move' ? { wx: queue[0].wx, wy: queue[0].wy } : null
  }
  const alive = nextObjects.filter((item) => item.stats?.hp > 0)
  for (const id of Object.keys(nextQueues)) if (!alive.some((item) => item.id === id)) delete nextQueues[id]
  return { objects: alive, queues: nextQueues }
}

export function winnerFor(objects, started) {
  if (!started) return null
  const groups = new Set(objects.filter((item) => (item.type === 'unit' || item.type === 'building') && item.stats?.hp > 0).map((item) => item.group))
  return groups.size <= 1 ? [...groups][0] ?? 'draw' : null
}
