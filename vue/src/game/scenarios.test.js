import test from 'node:test'
import assert from 'node:assert/strict'
import { createUnit, createBuilding, canAttack, isUnit, typeOf } from './entities.js'
import { createGroup, createGroups, colorOf } from './groups.js'
import { createBattle } from './scenarios.js'
import { getGameResult, remainingGroups } from './result.js'
import { advanceFrame } from './frame.js'
import { createSquareMap } from './map.js'
import { canPlaceBuilding, canPlaceUnit } from './placement.js'

test('группы независимы, новые группы можно создавать без изменения логики боя', () => {
  const groups = createGroups(7)
  assert.equal(groups.length, 7)
  assert.equal(new Set(groups.map((group) => group.id)).size, 7)
  assert.equal(createGroup(3).name, 'Клан Рыси')
  assert.ok(colorOf(groups[2], createUnit('fast', 0, 0, groups[2].id)))
  const first = createUnit('fast', 0, 0, groups[0].id)
  const ally = createUnit('slow', 2, 0, groups[0].id)
  const third = createBuilding('house', 3, 0, groups[2].id)
  assert.equal(canAttack(first, ally), false)
  assert.equal(canAttack(first, third), true)
})

test('каждый сценарий создаёт нужное число групп, бойцов, зданий и цепочек приказов', () => {
  for (const groupCount of [2, 3, 4, 9]) {
    const { groups, entities, events, nextEventId } = createBattle(createSquareMap(120), groupCount)
    assert.equal(groups.length, groupCount)
    assert.equal(entities.length, groupCount * 5)
    assert.ok(entities.every((entity) => groups.some((group) => group.id === entity.groupId)))
    assert.equal(new Set(entities.map((entity) => entity.id)).size, entities.length)
    assert.ok(events.length > 0)
    assert.equal(new Set(events.map((event) => event.id)).size, events.length)
    assert.equal(nextEventId, events.length + 1)
    for (const unit of entities.filter((entity) => entity.kind === 'unit')) {
      const commands = events.filter((event) => event.unitId === unit.id)
      assert.equal(commands.length, (groupCount - 1) * 5)
      assert.ok(commands.every((event) => entities.find((entity) => entity.id === event.targetId)?.groupId !== unit.groupId))
      assert.deepEqual(commands.slice(0, -1).map((event) => event.nextId), commands.slice(1).map((event) => event.id))
      assert.equal(commands.at(-1).nextId, null)
    }
  }
})

test('победитель определяется по всем объектам, включая один оставшийся дом', () => {
  const a = createUnit('fast', 0, 0, 'group1')
  const b = createBuilding('house', 2, 2, 'group2')
  const c = createUnit('slow', 3, 3, 'group3')
  assert.equal(getGameResult([a, b, c]).finished, false)
  assert.deepEqual(remainingGroups([a, b]), ['group1', 'group2'])
  assert.equal(getGameResult([a, b]).finished, false)
  assert.deepEqual(getGameResult([b]), { finished: true, winnerGroupId: 'group2' })
  assert.deepEqual(getGameResult([]), { finished: true, winnerGroupId: null })
})

test('подготовленные сценарии исполняются через текущий фреймовый расчёт', () => {
  const { entities: start, events: planned } = createBattle(createSquareMap(120), 3)
  const original = JSON.stringify({ start, planned })
  const { entities, events } = advanceFrame(start, planned, 0.1)
  assert.notDeepEqual(entities, start)
  assert.ok(entities.some((entity, index) => entity.kind === 'unit' && (entity.x !== start[index].x || entity.y !== start[index].y)))
  assert.equal(JSON.stringify({ start, planned }), original)
  assert.ok(events.length <= planned.length)
})

test('сценарные здания и персонажи стоят на суше и не пересекаются', () => {
  const map = createSquareMap(120)
  for (const groupCount of [2, 3, 4, 9]) {
    const { entities } = createBattle(map, groupCount)
    entities.forEach((entity) => {
      const others = entities.filter((other) => other.id !== entity.id)
      assert.ok(isUnit(entity)
        ? canPlaceUnit(map, others, typeOf(entity), entity)
        : canPlaceBuilding(map, others, entity.type, entity), `${groupCount}: ${entity.type}`)
    })
  }
})
