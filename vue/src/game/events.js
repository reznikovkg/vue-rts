// Очередь приказов живет отдельно от объектов карты.
// nextId связывает последовательные события одного персонажа.
export const ORDER_TYPES = { MOVE: 'move', ATTACK: 'attack' }

export const addOrders = (events, nextId, unitIds, order, append = false) => {
  const ids = new Set(unitIds)
  const next = events
    .filter((event) => append || !ids.has(event.unitId))
    .map((event) => ({ ...event }))

  unitIds.forEach((unitId) => {
    const previous = [...next].reverse().find((event) => event.unitId === unitId)
    const event = { ...order, id: nextId++, unitId, nextId: null }
    if (previous) previous.nextId = event.id
    next.push(event)
  })

  return { events: next, nextEventId: nextId }
}

export const removeOrder = (events, id) => {
  const finished = events.find((event) => event.id === id)
  if (!finished) return events

  return events
    .filter((event) => event.id !== id)
    .map((event) => event.nextId === id ? { ...event, nextId: finished.nextId } : event)
}
