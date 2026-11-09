import test from 'node:test'
import assert from 'node:assert/strict'
import game, { MUTATIONS, PHASES } from '../store/game.js'
import { createBuilding, createUnit, isUnit, typeOf, UNIT_TYPES, BUILDING_TYPES } from './entities.js'
import { worldToScreen } from './camera.js'
import { canPlaceUnit } from './placement.js'
import { SCENARIOS } from './scenarios.js'

const createTestStore = (scenarioId = 'duel') => {
  const state = game.state()
  if (scenarioId !== state.scenarioId) game.mutations[MUTATIONS.LOAD_SCENARIO](state, scenarioId)
  const commit = (name, payload) => game.mutations[name](state, payload)
  const getters = Object.fromEntries(Object.keys(game.getters).map((name) => [name, null]))
  Object.keys(getters).forEach((name) => Object.defineProperty(getters, name, { get: () => game.getters[name](state) }))
  const dispatch = (name, payload) => game.actions[name]({ state, getters, commit, dispatch }, payload)
  return { state, commit, dispatch }
}

test('до старта и на паузе кадры не изменяют игру, после продолжения работают', () => {
  const { state, commit, dispatch } = createTestStore()
  const initialEntities = JSON.stringify(state.entities)
  const initialEvents = JSON.stringify(state.events)
  assert.equal(state.phase, PHASES.READY)
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(JSON.stringify(state.entities), initialEntities)
  assert.equal(JSON.stringify(state.events), initialEvents)
  dispatch('start')
  assert.equal(state.phase, PHASES.RUNNING)
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(state.elapsedSeconds, 0.1)
  assert.notEqual(JSON.stringify(state.entities), initialEntities)
  dispatch('pause')
  const snapshot = JSON.stringify({ entities: state.entities, events: state.events, elapsed: state.elapsedSeconds })
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(JSON.stringify({ entities: state.entities, events: state.events, elapsed: state.elapsedSeconds }), snapshot)
  dispatch('togglePause')
  assert.equal(state.phase, PHASES.RUNNING)
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(state.elapsedSeconds, 0.2)
})

test('на паузе можно подготовить маршрут и последовательные команды, но нельзя атаковать свою группу', () => {
  const { state, commit, dispatch } = createTestStore('triangle')
  const unit = state.entities.find((entity) => entity.kind === 'unit' && entity.groupId === 'group3')
  const enemy = state.entities.find((entity) => entity.groupId === 'group2')
  const ally = state.entities.find((entity) => entity.groupId === 'group3' && entity.id !== unit.id)
  commit(MUTATIONS.SET_SELECTED, [unit.id])
  const getters = { getSelected: game.getters.getSelected(state) }
  const context = { state, getters, commit }
  game.actions.attackSelected(context, { targetId: ally.id })
  assert.equal(state.events.some((event) => event.unitId === unit.id && event.targetId === ally.id), false)
  game.actions.attackSelected(context, { targetId: enemy.id })
  assert.deepEqual(state.events.filter((event) => event.unitId === unit.id).map((event) => event.targetId), [enemy.id])
  game.actions.attackSelected(context, { targetId: state.entities.find((item) => item.groupId === 'group1').id, append: true })
  const orders = state.events.filter((event) => event.unitId === unit.id)
  assert.equal(orders.length, 2)
  assert.equal(orders[0].nextId, orders[1].id)
  assert.equal(state.phase, PHASES.READY)
  dispatch('start')
  dispatch('pause')
  assert.equal(state.phase, PHASES.PAUSED)
})

test('когда уцелели здания и юниты только одной группы, партия завершается и не перезапускается сама', () => {
  const { state, commit, dispatch } = createTestStore('triangle')
  dispatch('start')
  const last = state.entities.filter((entity) => entity.groupId === 'group3')
  state.entities = [...last, state.entities.find((entity) => entity.groupId === 'group2')]
  const enemyId = state.entities.at(-1).id
  commit(MUTATIONS.REMOVE_ENTITY, enemyId)
  assert.equal(state.phase, PHASES.FINISHED)
  assert.equal(state.winnerGroupId, 'group3')
  assert.equal(state.events.length, 0)
  const snapshot = JSON.stringify(state.entities)
  commit(MUTATIONS.TICK, 0.1)
  dispatch('start')
  assert.equal(JSON.stringify(state.entities), snapshot)
  assert.equal(state.phase, PHASES.FINISHED)
  dispatch('loadScenario', 'four')
  assert.equal(state.phase, PHASES.READY)
  assert.equal(state.winnerGroupId, null)
  assert.equal(state.groups.length, 4)
  assert.equal(state.elapsedSeconds, 0)
})

test('все готовые сценарии автоматически доигрываются до победителя на карте с водой', () => {
  for (const scenario of SCENARIOS) {
    const { state, commit, dispatch } = createTestStore(scenario.id)
    dispatch('start')
    for (let i = 0; i < 3000 && state.phase !== PHASES.FINISHED; i++) commit(MUTATIONS.TICK, 0.1)
    assert.equal(state.phase, PHASES.FINISHED, scenario.id)
    assert.ok(state.winnerGroupId)
    assert.equal(new Set(state.entities.map((entity) => entity.groupId)).size, 1)
    assert.ok(state.entities.every((entity) => entity.groupId === state.winnerGroupId))
  }
})

test('здания строятся для выбранной группы, персонажи наследуют группу и здоровье', () => {
  const { state, dispatch } = createTestStore()
  dispatch('setBuildGroup', 'group2')
  for (const [type, x, y] of [['barracks', -30.5, 0.5], ['shipyard', 10, -5], ['waterBase', 20.5, 0.5]]) {
    dispatch('startPlacement', type)
    dispatch('movePlacement', worldToScreen(state.camera, state.viewport, { x, y }))
    dispatch('placeBuilding')
    const building = state.entities.at(-1)
    assert.equal(building.type, type)
    assert.equal(building.groupId, 'group2')
    assert.equal(building.hp, BUILDING_TYPES[type].maxHp)
    assert.equal(state.placement, null)
    const spawns = BUILDING_TYPES[type].spawns
    for (const unitType of Array.isArray(spawns) ? spawns : [spawns]) {
      const before = state.entities.length
      dispatch('spawnUnits', { id: building.id, type: unitType, count: 1 })
      assert.equal(state.entities.length, before + 1)
      const unit = state.entities.at(-1)
      assert.equal(unit.type, unitType)
      assert.equal(unit.groupId, building.groupId)
      assert.equal(unit.hp, UNIT_TYPES[unitType].maxHp)
      assert.ok(canPlaceUnit(state.map, state.entities.filter((entity) => entity.id !== unit.id), typeOf(unit), unit))
    }
  }
})

test('прямое размещение корабля сохраняет группу и не создает здание', () => {
  const { state, dispatch } = createTestStore()
  dispatch('setBuildGroup', 'group2')
  dispatch('startPlacement', 'largeShip')
  dispatch('movePlacement', worldToScreen(state.camera, state.viewport, { x: 20, y: 0 }))
  dispatch('placeBuilding', { keep: true })
  const unit = state.entities.at(-1)
  assert.ok(isUnit(unit))
  assert.equal(unit.groupId, 'group2')
  assert.equal(unit.hp, UNIT_TYPES.largeShip.maxHp)
  assert.equal(state.placement.type, 'largeShip')
  dispatch('loadScenario', 'triangle')
  assert.equal(state.placement, null)
  assert.equal(state.buildGroupId, 'group1')
})

test('выделенная группа исполняет очереди строем без наложения персонажей', () => {
  const { state, commit, dispatch } = createTestStore()
  const units = [createUnit('fast', -8, -2), createUnit('fast', -8, 2)]
  state.entities = [...units, createBuilding('house', -30, -30, 'group2')]
  state.events = []
  commit(MUTATIONS.SET_SELECTED, units.map((unit) => unit.id))
  for (const [x, y, append] of [[0, 0, false], [4, 4, true]]) {
    dispatch('moveSelected', { point: worldToScreen(state.camera, state.viewport, { x, y }), append })
  }
  assert.equal(state.events.length, 4)
  dispatch('start')
  for (let i = 0; i < 150 && state.events.length; i++) {
    commit(MUTATIONS.TICK, 0.1)
    state.entities.filter(isUnit).forEach((unit) => {
      assert.ok(canPlaceUnit(state.map, state.entities.filter((other) => other.id !== unit.id), typeOf(unit), unit))
    })
  }
  assert.equal(state.events.length, 0)
  assert.ok(state.entities.filter(isUnit).every((unit) => unit.x >= 2))
})

test('после завершения партии стройка и спавн заблокированы', () => {
  const { state, dispatch } = createTestStore()
  state.phase = PHASES.FINISHED
  const before = JSON.stringify(state.entities)
  const castle = state.entities.find((entity) => entity.type === 'castle')
  dispatch('startPlacement', 'house')
  dispatch('spawnUnits', { id: castle.id, count: 5 })
  state.placement = { type: 'house', x: -30, y: 0 }
  dispatch('placeBuilding')
  assert.equal(JSON.stringify(state.entities), before)
})

test('здание на маршруте вызывает обход, сохраняя очередь приказов', () => {
  const { state, commit, dispatch } = createTestStore()
  const unit = createUnit('fast', -5, 0.5)
  state.entities = [unit, createBuilding('house', -30, -30, 'group2')]
  state.events = []
  commit(MUTATIONS.SET_SELECTED, [unit.id])
  dispatch('moveSelected', { point: worldToScreen(state.camera, state.viewport, { x: 5, y: 0.5 }) })
  dispatch('moveSelected', { point: worldToScreen(state.camera, state.viewport, { x: 8, y: 4 }), append: true })
  dispatch('start')
  commit(MUTATIONS.TICK, 0.1)
  const events = JSON.stringify(state.events)
  dispatch('startPlacement', 'tower')
  dispatch('movePlacement', worldToScreen(state.camera, state.viewport, { x: 0.5, y: 0.5 }))
  dispatch('placeBuilding')
  assert.equal(state.entities.at(-1).type, 'tower')
  assert.equal(JSON.stringify(state.events), events)
  for (let i = 0; i < 150 && state.events.length; i++) {
    commit(MUTATIONS.TICK, 0.1)
    const moving = state.entities.find((entity) => entity.id === unit.id)
    assert.ok(canPlaceUnit(state.map, state.entities.filter((entity) => entity.id !== unit.id), typeOf(moving), moving))
  }
  assert.equal(state.events.length, 0)
  assert.equal(state.entities[0].x, 8)
  assert.equal(state.entities[0].y, 4)
})

test('новый приказ движения заменяет атаку, включая уже рассчитанный путь', () => {
  const { state, commit, dispatch } = createTestStore()
  const unit = createUnit('fast', -5, 0)
  const enemy = createUnit('slow', 5, 0, 'group2')
  state.entities = [unit, enemy]
  state.events = []
  commit(MUTATIONS.SET_SELECTED, [unit.id])
  dispatch('attackSelected', { targetId: enemy.id })
  dispatch('start')
  commit(MUTATIONS.TICK, 0.1)
  assert.equal(state.entities[0].attackTargetId, enemy.id)
  dispatch('moveSelected', { point: worldToScreen(state.camera, state.viewport, { x: -5, y: 4 }) })
  assert.equal(state.events.length, 1)
  assert.equal(state.events[0].type, 'move')
  for (let i = 0; i < 50 && state.events.length; i++) commit(MUTATIONS.TICK, 0.1)
  assert.equal(state.entities[0].attackTargetId, null)
  assert.equal(state.entities[0].x, -5)
  assert.equal(state.entities[0].y, 4)
  assert.equal(state.entities[1].hp, enemy.hp)
})

test('приказы до старта резервируют разные места для отдельно выбранных персонажей', () => {
  const { state, commit, dispatch } = createTestStore()
  const units = [createUnit('fast', -5, -2), createUnit('fast', -5, 2)]
  state.entities = [...units, createBuilding('house', -30, -30, 'group2')]
  state.events = []
  for (const unit of units) {
    commit(MUTATIONS.SET_SELECTED, [unit.id])
    dispatch('moveSelected', { point: worldToScreen(state.camera, state.viewport, { x: 0, y: 0 }) })
  }
  const [first, second] = state.events.map((event) => event.target)
  assert.ok(Math.hypot(first.x - second.x, first.y - second.y) >= 0.8)
  dispatch('start')
  for (let i = 0; i < 100 && state.events.length; i++) commit(MUTATIONS.TICK, 0.1)
  assert.equal(state.events.length, 0)
})
