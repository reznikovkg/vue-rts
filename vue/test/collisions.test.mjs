import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createStore } from 'vuex'
import { reactive } from 'vue'

// Загружаем игровые TS-модули через Vite с тем же alias @, что в приложении
const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-test', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
  logLevel: 'error',
})
after(() => server.close())
const spatial = await server.ssrLoadModule('/src/game/spatial.ts')
const { findPath } = await server.ssrLoadModule('/src/game/pathfinding.ts')
const { isBlocked, isSegmentFree } = await server.ssrLoadModule('/src/game/obstacles.ts')
const { orderUnit, advanceUnits } = await server.ssrLoadModule('/src/game/movement.ts')
const { SCENARIOS } = await server.ssrLoadModule('/src/game/scenarios/index.ts')
const { default: game } = await server.ssrLoadModule('/src/store/game.js')
const { default: worldModule } = await server.ssrLoadModule('/src/store/world.js')
const { default: selection } = await server.ssrLoadModule('/src/store/selection.js')
const { default: events } = await server.ssrLoadModule('/src/store/events.js')
const { default: construction } = await server.ssrLoadModule('/src/store/construction.js')
const { isAreaFree, isSweepFree, unitFootprint, staticFootprint, squareFootprint, overlaps, findNearestFreePosition } = spatial

const unit = (id, x, y, group = 1, type = 'warrior') => ({
  id, type, group, hp: 50, position: { x, y }, target: null,
})
const object = (id, x, y, type = 'house') => ({
  id, type, group: 1, hp: 200, position: { x, y },
})
const world = (units = [], objects = []) => ({ units, objects })
const assertValid = (state) => {
  for (const item of state.units) {
    assert.ok(isAreaFree(state, unitFootprint(item), { ignoreId: item.id }), `unit ${item.id} overlaps or leaves map: ${JSON.stringify(item.position)}`)
  }
  for (const item of state.objects) {
    assert.ok(isAreaFree(state, staticFootprint(item), { ignoreId: item.id }), `object ${item.id} overlaps or leaves map`)
  }
}
const simulate = (state, frames = 600, delta = 1 / 60) => {
  assertValid(state)
  for (let frame = 0; frame < frames; frame++) {
    advanceUnits(state, delta)
    assertValid(state)
  }
}
const makeStore = (units = [unit(1, -200, 0), unit(2, 800, 800, 2)], objects = []) => {
  // Столкновения проверяем на чистой суше: местность сценариев здесь не нужна
  const worldState = { ...worldModule.state(), units, objects, terrainZones: [] }
  const gameState = { ...game.state(), started: true }
  return createStore({
    strict: true,
    modules: {
      game: { ...game, state: () => gameState },
      world: { ...worldModule, state: () => worldState },
      selection,
      events,
      construction,
    },
  })
}

test('footprints use ground dimensions; touching edges do not overlap', () => {
  const a = unitFootprint(unit(1, 0, 0))
  assert.equal(a.halfHeight, 16)
  assert.equal(overlaps(a, unitFootprint(unit(2, 32, 0))), false)
  assert.equal(overlaps(a, unitFootprint(unit(2, 31.9, 0))), true)
  assert.equal(overlaps(staticFootprint(object(3, 0, 0)), staticFootprint(object(4, 100, 0))), false)
})

test('shared placement checks units, buildings, trees and map bounds with full size', () => {
  const state = world([unit(1, 0, 0)], [object(2, 300, 0), object(3, 100, 0, 'tree')])
  for (const x of [0, 100, 300]) assert.equal(isAreaFree(state, squareFootprint({ x, y: 0 }, 12)), false)
  assert.equal(isAreaFree(state, squareFootprint({ x: 200, y: 200 }, 12)), true)
  assert.equal(isAreaFree(state, squareFootprint({ x: 1484, y: 0 }, 16)), true)
  assert.equal(isAreaFree(state, squareFootprint({ x: 1484.1, y: 0 }, 16)), false)
  assert.equal(isAreaFree(state, squareFootprint({ x: NaN, y: 0 }, 16)), false)
  assert.equal(isAreaFree(state, squareFootprint({ x: 0, y: 0 }, -1)), false)
  assert.equal(isAreaFree(state, unitFootprint(state.units[0]), { ignoreId: 1 }), true)
})

test('continuous sweep catches tunneling through a thin tree and another unit', () => {
  const area = squareFootprint({ x: -1000, y: 0 }, 16)
  assert.equal(isSweepFree(world([], [object(1, 0, 0, 'tree')]), area, { x: 1000, y: 0 }), false)
  assert.equal(isSweepFree(world([unit(1, 0, 0)]), area, { x: 1000, y: 0 }), false)
  assert.equal(isSweepFree(world([], [object(1, 0, 0, 'tree')]), { ...area, position: { x: -1000, y: 21 } }, { x: 1000, y: 21 }), true)
  assert.equal(isSweepFree(world(), area, { x: 1600, y: 0 }), false)
})

test('an initial physical overlap never enables an unchecked escape through objects', () => {
  const state = world([], [object(1, 0, 0)])
  assert.equal(isSegmentFree({ x: 0, y: 0 }, { x: 200, y: 0 }, state.objects, 16), false)
})

test('legacy visual exclusion remains navigation-only', () => {
  const state = world([], [object(1, 0, 0)])
  const point = { x: -100, y: -100 }
  assert.equal(isAreaFree(state, squareFootprint(point, 16)), true)
  assert.equal(isBlocked(point, state.objects, 16), true)
  assert.equal(isSegmentFree(point, { x: -300, y: -300 }, state.objects, 16), true)
})

test('nearest free position respects reservations and returns null on a full map', () => {
  const state = world([unit(1, 0, 0)])
  const request = squareFootprint({ x: 0, y: 0 }, 16)
  const first = findNearestFreePosition(state, request)
  assert.ok(first)
  assert.ok(isAreaFree(state, { ...request, position: first }))
  const reserved = [{ ...request, position: first }]
  const second = findNearestFreePosition(state, request, { reserved })
  assert.ok(second)
  assert.equal(overlaps(reserved[0], { ...request, position: second }), false)
  assert.equal(findNearestFreePosition(world(), request, { reserved: [squareFootprint({ x: 0, y: 0 }, 1500)] }), null)
})

test('A* goes around buildings and a stationary unit; every segment is safe', () => {
  const state = world([unit(1, 0, 0)], [object(2, 250, 0)])
  const from = { x: -250, y: 0 }
  const goal = { x: 500, y: 0 }
  const options = { units: state.units }
  const path = findPath(from, goal, state.objects, 16, options)
  assert.ok(path.length > 1)
  assert.deepEqual(path.at(-1), goal)
  let previous = from
  for (const point of path) {
    assert.ok(isSegmentFree(previous, point, state.objects, 16, options))
    previous = point
  }
})

test('A* connects an off-grid start safely and clamps an edge goal by size', () => {
  const from = { x: -123.3, y: 17.8 }
  const objects = [object(1, 0, 0, 'tree')]
  const path = findPath(from, { x: 2000, y: 0 }, objects, 16)
  assert.ok(path.length)
  assert.equal(path.at(-1).x, 1484)
  let previous = from
  for (const point of path) {
    assert.ok(isSegmentFree(previous, point, objects, 16))
    previous = point
  }
})

test('a command targeting an occupied unit ends in a free position', () => {
  const state = world([unit(1, -200, 0), unit(2, 0, 0)])
  orderUnit(state, state.units[0], { x: 0, y: 0 })
  simulate(state)
  assert.equal(state.units[0].target, null)
  assert.notDeepEqual(state.units[0].position, state.units[1].position)
  assert.ok(Math.hypot(state.units[0].position.x, state.units[0].position.y) <= 75)
})

test('head-on stale paths cannot swap through each other and recover by rerouting', () => {
  const state = world([unit(1, -100, 0), unit(2, 100, 0, 2)])
  for (const item of state.units) {
    item.target = { x: -item.position.x, y: 0 }
    item.path = [item.target]
  }
  simulate(state, 1200)
  assert.equal(state.units[0].target, null)
  assert.equal(state.units[1].target, null)
  assert.ok(state.units[0].position.x > 0)
  assert.ok(state.units[1].position.x < 0)
})

test('crossing simultaneous orders keep collision invariants on every frame', () => {
  const state = world([unit(1, -200, 0), unit(2, 0, -200, 2)])
  orderUnit(state, state.units[0], { x: 200, y: 0 })
  orderUnit(state, state.units[1], { x: 0, y: 200 })
  simulate(state)
  assert.equal(state.units[0].target, null)
  assert.equal(state.units[1].target, null)
  assert.ok(state.units[0].position.x > 150)
  assert.ok(state.units[1].position.y > 150)
})

test('group targets remain distinct when formation is clamped at a corner', async () => {
  const store = makeStore([unit(1, -100, 0), unit(2, -100, 60), unit(3, -160, 0), unit(4, -160, 60), unit(5, -800, -800, 2)])
  await store.dispatch('events/orderMove', { actorIds: [1, 2, 3, 4], point: { x: 1500, y: 1500 } })
  const targets = store.state.world.units.slice(0, 4).map((item) => ({ ...unitFootprint(item), position: item.target }))
  for (let i = 0; i < targets.length; i++) {
    assert.ok(targets[i].position)
    for (let j = i + 1; j < targets.length; j++) assert.equal(overlaps(targets[i], targets[j]), false)
  }
  for (let i = 0; i < 600; i++) {
    store.commit('world/MOVE_UNITS', 0.1)
    assertValid(store.state.world)
  }
  assert.ok(store.state.world.units.slice(0, 4).every((item) => item.target === null))
})

test('a newly placed building blocks an existing path and triggers a safe detour', async () => {
  const store = makeStore()
  store.commit('world/SET_UNIT_TARGET', { id: 1, target: { x: 250, y: 0 } })
  store.commit('world/MOVE_UNITS', 0.1)
  assert.equal(await store.dispatch('world/addObject', { kind: 'static', object: object(3, 0, 0) }), true)
  for (let i = 0; i < 600; i++) {
    store.commit('world/MOVE_UNITS', 1 / 60)
    assertValid(store.state.world)
  }
  assert.equal(store.state.world.units[0].target, null)
  assert.deepEqual({ ...store.state.world.units[0].position }, { x: 250, y: 0 })
})

test('temporary unreachable blockage keeps the order and resumes when the wall is removed', () => {
  const state = world([unit(1, -400, 0)])
  orderUnit(state, state.units[0], { x: 400, y: 0 })
  state.objects = Array.from({ length: 15 }, (_, index) => object(10 + index, 0, -1400 + index * 200, 'castle'))
  simulate(state, 35, 0.1)
  assert.deepEqual(state.units[0].target, { x: 400, y: 0 })
  state.objects = []
  simulate(state)
  assert.equal(state.units[0].target, null)
  assert.deepEqual(state.units[0].position, { x: 400, y: 0 })
})

test('many independent orders into one destination settle without overlap', () => {
  const state = world(Array.from({ length: 12 }, (_, index) => {
    const angle = index * Math.PI / 6
    return unit(index + 1, Math.cos(angle) * 400, Math.sin(angle) * 400, index % 3 + 1)
  }))
  for (const item of state.units) orderUnit(state, item, { x: 0, y: 0 })
  simulate(state, 1200)
  assert.ok(state.units.every((item) => item.target === null))
})

test('spawn/build additions reject overlap, duplicate IDs, invalid types and out-of-bounds', async () => {
  const store = makeStore()
  const add = (kind, item) => store.dispatch('world/addObject', { kind, object: item })
  assert.equal(await add('unit', unit(3, -200, 0)), false)
  assert.equal(await add('static', object(3, -200, 0)), false)
  assert.equal(await add('static', object(3, 1490, 0)), false)
  assert.equal(await add('unit', unit(1, 400, 400)), false)
  assert.equal(await add('static', object(3, 400, 400, 'missing')), false)
  assert.equal(await add('static', object(3, 400, 400)), true)
  assert.equal(await add('unit', unit(4, 400, 400)), false)
  assert.equal(await add('static', object(5, 500, 400)), true)
  assertValid(store.state.world)
})

test('addObject accepts Vue reactive requests and copies the position', async () => {
  const store = makeStore()
  const request = reactive({ kind: 'unit', object: unit(3, 400, 400) })

  assert.equal(await store.dispatch('world/addObject', request), true)
  request.object.position.x = 600
  request.object.hp = 1

  const created = store.state.world.units.find((item) => item.id === 3)
  assert.equal(created.position.x, 400)
  assert.equal(created.hp, 50)
  assert.equal(created.target, null)
  assertValid(store.state.world)
})

test('removing a unit or building immediately frees its footprint', async () => {
  const store = makeStore([unit(1, -200, 0), unit(2, 800, 800, 2), unit(5, -800, 800)])
  const area = unitFootprint(store.state.world.units[0])
  assert.equal(isAreaFree(store.state.world, area), false)
  await store.dispatch('world/destroyObject', 1)
  assert.equal(isAreaFree(store.state.world, area), true)
  const building = object(3, 0, 0)
  assert.equal(await store.dispatch('world/addObject', { kind: 'static', object: building }), true)
  assert.equal(isAreaFree(store.state.world, staticFootprint(building)), false)
  await store.dispatch('world/destroyObject', 3)
  assert.equal(isAreaFree(store.state.world, staticFootprint(building)), true)
})

test('pause/menu/game over prevent movement and creation; restart discards old occupancy', async () => {
  const store = makeStore()
  store.commit('world/SET_UNIT_TARGET', { id: 1, target: { x: 200, y: 0 } })
  store.commit('game/SET_PAUSED', true)
  await store.dispatch('world/moveUnits', 0.1)
  assert.equal(store.state.world.units[0].position.x, -200)
  assert.equal(await store.dispatch('world/addObject', { kind: 'unit', object: unit(3, 400, 400) }), false)
  store.commit('game/OPEN_MENU')
  await store.dispatch('world/moveUnits', 0.1)
  assert.equal(store.state.world.units[0].position.x, -200)
  await store.dispatch('game/loadScenario', 'duel')
  assertValid(store.state.world)
  assert.equal(isAreaFree(store.state.world, squareFootprint({ x: 800, y: 800 }, 16)), true)
  await store.dispatch('world/destroyObject', 3)
  assert.equal(store.getters['game/isGameOver'], true)
  assert.equal(await store.dispatch('world/addObject', { kind: 'unit', object: unit(4, 400, 400, 2) }), false)
})

test('every bundled scenario starts and runs without physical overlap', () => {
  for (const scenario of SCENARIOS) {
    const state = structuredClone({ units: scenario.units, objects: scenario.objects })
    simulate(state, 1)
    for (const event of scenario.events) {
      const actor = state.units.find((item) => item.id === event.unitId)
      orderUnit(state, actor, event.target)
    }
    simulate(state, 600)
  }
})
