import test from 'node:test'
import assert from 'node:assert/strict'
import { createBuilding, createUnit, typeOf } from './entities.js'
import { addOrders, ORDER_TYPES } from './events.js'
import { advanceFrame } from './frame.js'
import { createSquareMap } from './map.js'
import { canPlaceUnit } from './placement.js'

const move = (x, y) => ({ type: ORDER_TYPES.MOVE, target: { x, y } })

test('обычный приказ заменяет маршрут, Shift добавляет событие со связью nextId', () => {
  const unit = createUnit('fast', 0, 0)
  const first = addOrders([], 1, [unit.id], move(1, 0))
  const second = addOrders(first.events, first.nextEventId, [unit.id], move(2, 0), true)
  assert.equal(second.events.length, 2)
  assert.equal(second.events[0].nextId, second.events[1].id)
  assert.equal(second.events[1].nextId, null)

  const replacement = addOrders(second.events, second.nextEventId, [unit.id], move(3, 0))
  assert.equal(replacement.events.length, 1)
  assert.deepEqual(replacement.events[0].target, { x: 3, y: 0 })
  assert.equal(replacement.events[0].nextId, null)
})

test('при достижении первой точки юнит без остановки переходит ко второй', () => {
  const unit = createUnit('fast', 0, 0)
  const first = addOrders([], 1, [unit.id], move(1, 0))
  const second = addOrders(first.events, first.nextEventId, [unit.id], move(3, 0), true)
  const before = JSON.stringify({ unit, events: second.events })

  const frame = advanceFrame([unit], second.events, 0.5) // fast: 3 клетки/сек
  assert.ok(Math.abs(frame.entities[0].x - 1.5) < 1e-9)
  assert.equal(frame.events.length, 1)
  assert.equal(frame.events[0].id, second.events[1].id)
  assert.deepEqual(frame.entities[0].target, { x: 3, y: 0 })
  assert.equal(JSON.stringify({ unit, events: second.events }), before) // чистый пересчёт кадра

  const finished = advanceFrame(frame.entities, frame.events, 0.5)
  assert.equal(finished.entities[0].x, 3)
  assert.equal(finished.entities[0].target, null)
  assert.deepEqual(finished.events, [])
})

test('разные юниты выполняют собственные очереди, не мешая друг другу', () => {
  const first = createUnit('fast', 0, 0)
  const second = createUnit('slow', 0, 2)
  let queue = addOrders([], 1, [first.id, second.id], move(1, 0))
  queue = addOrders(queue.events, queue.nextEventId, [first.id], move(4, 0), true)
  const frame = advanceFrame([first, second], queue.events, 1)

  assert.equal(frame.entities[0].x, 3)
  assert.ok(frame.entities[1].x > 0)
  assert.equal(frame.events.filter((event) => event.unitId === first.id).length, 1)
  assert.equal(frame.events.filter((event) => event.unitId === second.id).length, 1)
})

test('атака после перемещения запускается только после достижения точки', () => {
  const unit = createUnit('fast', 0, 0)
  const enemy = createBuilding('house', 5, 0, 'group2')
  let queue = addOrders([], 1, [unit.id], move(2, 0))
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: enemy.id }, true)

  const first = advanceFrame([unit, enemy], queue.events, 0.5)
  assert.equal(first.entities[1].hp, enemy.hp)
  assert.equal(first.entities[0].attackTargetId, null)

  const second = advanceFrame(first.entities, first.events, 0.5)
  assert.equal(second.entities[0].x, 2)
  assert.equal(second.entities[0].attackTargetId, enemy.id)
  assert.equal(second.entities[1].hp, enemy.hp)
  const third = advanceFrame(second.entities, second.events, 1)
  assert.ok(third.entities[0].x > 2)
})

test('исчезнувшая цель не блокирует следующий приказ', () => {
  const unit = createUnit('fast', 0, 0)
  const enemy = createUnit('slow', 1, 0, 'group2')
  let queue = addOrders([], 1, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: enemy.id })
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], move(2, 0), true)

  const frame = advanceFrame([unit], queue.events, 0.5)
  assert.equal(frame.events.length, 1)
  assert.equal(frame.events[0].type, ORDER_TYPES.MOVE)
  assert.equal(frame.entities[0].x, 1.5)
})

test('при смерти персонажа из стора событий исчезают все его будущие приказы', () => {
  const unit = createUnit('fast', 0, 0)
  let queue = addOrders([], 1, [unit.id], move(1, 0))
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], move(2, 0), true)
  assert.deepEqual(advanceFrame([], queue.events, 0.1).events, [])
})

test('очередь движения обходит здание и продолжает следующий приказ', () => {
  const map = createSquareMap(120)
  const unit = createUnit('fast', -4, 0)
  const house = createBuilding('house', 0, 0)
  let queue = addOrders([], 1, [unit.id], move(4, 0))
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], move(4, 4), true)
  let frame = { entities: [unit, house], events: queue.events }
  const before = JSON.stringify(frame)
  let detoured = false
  for (let i = 0; i < 100 && frame.events.length; i++) {
    frame = advanceFrame(frame.entities, frame.events, 0.1, map)
    const moving = frame.entities[0]
    assert.ok(canPlaceUnit(map, [house], typeOf(moving), moving))
    if (moving.x < 2 && Math.abs(moving.y) > 1) detoured = true
  }
  assert.ok(detoured)
  assert.equal(frame.events.length, 0)
  assert.equal(frame.entities[0].x, 4)
  assert.equal(frame.entities[0].y, 4)
  assert.equal(JSON.stringify({ entities: [unit, house], events: queue.events }), before)
})

test('атака обходит преграду, сохраняя запрет пересечения зданий', () => {
  const map = createSquareMap(120)
  const unit = createUnit('fast', -5, 0)
  const wall = createBuilding('house', 0, 0)
  const enemy = createUnit('slow', 5, 0, 'group2')
  const queue = addOrders([], 1, [unit.id], { type: ORDER_TYPES.ATTACK, targetId: enemy.id })
  let frame = { entities: [unit, wall, enemy], events: queue.events }
  for (let i = 0; i < 100; i++) {
    frame = advanceFrame(frame.entities, frame.events, 0.1, map)
    const moving = frame.entities.find((entity) => entity.id === unit.id)
    assert.ok(canPlaceUnit(map, frame.entities.filter((entity) => entity.id !== unit.id), typeOf(moving), moving))
  }
  assert.ok(!frame.entities.find((entity) => entity.id === enemy.id) || frame.entities.find((entity) => entity.id === enemy.id).hp < enemy.hp)
})

test('маршрут сухопутного персонажа огибает озеро', () => {
  const map = createSquareMap(120)
  const unit = createUnit('fast', 8, 0)
  const queue = addOrders([], 1, [unit.id], move(32, 0))
  let frame = { entities: [unit], events: queue.events }
  for (let i = 0; i < 300 && frame.events.length; i++) {
    frame = advanceFrame(frame.entities, frame.events, 0.1, map)
    assert.ok(canPlaceUnit(map, [], typeOf(unit), frame.entities[0]))
  }
  assert.equal(frame.events.length, 0)
  assert.equal(frame.entities[0].x, 32)
  assert.equal(frame.entities[0].y, 0)
})

test('все размеры кораблей выходят из дока и исполняют очередь на воде', () => {
  const map = createSquareMap(120)
  for (const type of ['boat', 'ship', 'largeShip']) {
    const yard = createBuilding('shipyard', 10, 0, 'group2', 'east')
    const unit = createUnit(type, 11, 0, 'group2')
    let queue = addOrders([], 1, [unit.id], move(18, 0))
    queue = addOrders(queue.events, queue.nextEventId, [unit.id], move(20, 4), true)
    let frame = { entities: [yard, unit], events: queue.events }
    for (let i = 0; i < 150 && frame.events.length; i++) {
      frame = advanceFrame(frame.entities, frame.events, 0.1, map)
      assert.ok(canPlaceUnit(map, [yard], typeOf(unit), frame.entities[1]), type)
    }
    assert.equal(frame.events.length, 0, type)
    assert.equal(frame.entities[1].x, 20)
    assert.equal(frame.entities[1].y, 4)
  }
})

test('следующая команда использует остаток кадра и на карте с препятствиями', () => {
  const map = createSquareMap(120)
  const unit = createUnit('fast', 0, 0)
  let queue = addOrders([], 1, [unit.id], move(1, 0))
  queue = addOrders(queue.events, queue.nextEventId, [unit.id], move(3, 0), true)
  const frame = advanceFrame([unit], queue.events, 0.5, map)
  assert.equal(frame.entities[0].x, 1.5)
  assert.equal(frame.events.length, 1)
})
