// Готовые расстановки и последовательности событий для запуска одним нажатием.
import { createBuilding, createUnit, isBuilding, isUnit } from './entities.js'
import { addOrders, ORDER_TYPES } from './events.js'
import { createGroups } from './groups.js'

export const SCENARIOS = [
  { id: 'duel', name: 'Дуэль', groupCount: 2, description: 'Две группы атакуют друг друга.' },
  { id: 'triangle', name: 'Три фронта', groupCount: 3, description: 'Три независимые группы сражаются одновременно.' },
  { id: 'four', name: 'Четыре стороны', groupCount: 4, description: 'Четыре группы и общий бой за карту.' },
]

// расстановки сдвинуты от озера, чтобы сухопутные объекты стояли на своей местности
const POSITIONS = {
  duel: [{ x: -15, y: -3 }, { x: 3, y: 3 }],
  triangle: [{ x: -16, y: -7 }, { x: 4, y: -7 }, { x: -6, y: 10 }],
  four: [{ x: -16, y: -9 }, { x: 4, y: -9 }, { x: -16, y: 9 }, { x: 4, y: 9 }],
}

export const createScenario = (id = SCENARIOS[0].id) => {
  const scenario = SCENARIOS.find((item) => item.id === id) ?? SCENARIOS[0]
  const groups = createGroups(scenario.groupCount)
  const entities = []

  groups.forEach((group, index) => {
    const { x, y } = POSITIONS[scenario.id][index]
    const dx = x > 0 ? -1 : 1
    const dy = y > 0 ? -1 : 1
    entities.push(
      createBuilding('castle', x, y, group.id),
      createBuilding('house', x - dx * 4, y, group.id),
      createUnit('slow', x + dx * 4, y + dy * 2, group.id),
      createUnit('slow', x + dx * 3, y - dy * 2, group.id),
      createUnit('fast', x + dx * 5, y, group.id),
    )
  })

  // У каждого персонажа подготовлена цепочка атак по всем другим группам.
  // Если цель уже уничтожена, обработчик кадра пропустит её в очереди.
  // Эти команды можно заменить вручную ещё до старта сценария.
  let events = []
  let nextEventId = 1
  entities.filter(isUnit).forEach((unit) => {
    const enemies = entities.filter((entity) => entity.groupId !== unit.groupId)
      .sort((a, b) => {
        // Сперва солдаты, затем здания, внутри категорий — ближайшие цели.
        if (isBuilding(a) !== isBuilding(b)) return isBuilding(a) ? 1 : -1
        return Math.hypot(a.x - unit.x, a.y - unit.y) - Math.hypot(b.x - unit.x, b.y - unit.y)
      })
    enemies.forEach((enemy) => {
      const next = addOrders(events, nextEventId, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: enemy.id }, true)
      events = next.events
      nextEventId = next.nextEventId
    })
  })

  return { scenarioId: scenario.id, groups, entities, events, nextEventId }
}
