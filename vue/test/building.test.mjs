import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createStore } from 'vuex'

const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL('../', import.meta.url)),
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-test-building', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
  logLevel: 'error',
})
after(() => server.close())
const { getBuildingPlacement, getBuildingType } = await server.ssrLoadModule('/src/game/building.ts')
const { worldToScreen } = await server.ssrLoadModule('/src/game/coords.ts')
const { OBJECT_TYPES, PLAYER_GROUP, UNIT_TYPES } = await server.ssrLoadModule('/src/game/config.ts')
const modules = Object.fromEntries(await Promise.all(
  ['world', 'game', 'events', 'selection', 'construction', 'camera'].map(async name =>
    [name, (await server.ssrLoadModule(`/src/store/${name}.js`)).default]),
))
const emptyWorld = (terrainZones = []) => ({ objects: [], units: [], terrainZones })
const makeStore = (terrainZones = []) => createStore({
  strict: true,
  modules: {
    ...modules,
    world: { ...modules.world, state: () => ({
      ...modules.world.state(), ...emptyWorld(terrainZones), nextObjectId: 3,
      units: [1, 2].map(id => ({
        id, type: 'worker', group: id, hp: 50, target: null, position: { x: -1000 + id * 100, y: -1000 },
      })),
    }) },
    game: { ...modules.game, state: () => ({ ...modules.game.state(), started: true }) },
  },
})
const pointCursor = async (store, point) => {
  await store.dispatch('construction/setViewport', { width: 1200, height: 800 })
  const screen = worldToScreen(point)
  await store.dispatch('construction/setCursor', { x: screen.x + 600, y: screen.y + 400 })
}
const build = async (store, type = 'tower', point = { x: 1000, y: 1000 }) => {
  assert.equal(await store.dispatch('construction/start', type), true)
  await pointCursor(store, point)
  assert.equal(await store.dispatch('construction/place'), true)
  return store.state.world.objects.at(-1)
}

test('four square sizes snap by their upper-left cell, including negative coordinates', () => {
  for (const [id, center] of [['tower', 25], ['house', 50], ['barracks', 75], ['castle', 100]]) {
    assert.deepEqual(getBuildingPlacement(emptyWorld(), id, { x: 0, y: 0 }), {
      position: { x: center, y: center }, valid: true, reason: '',
    })
    assert.equal(getBuildingType(id).width, getBuildingType(id).height)
  }
  assert.deepEqual(getBuildingPlacement(emptyWorld(), 'tower', { x: -0.1, y: -0.1 }).position, { x: -25, y: -25 })
  for (const id of ['tree', 'bridge', 'missing', '__proto__']) assert.equal(getBuildingType(id), null)
})

test('the whole base must fit the map; invalid positions are not shifted inside', () => {
  const world = emptyWorld()
  assert.equal(getBuildingPlacement(world, 'castle', { x: 1300, y: 1300 }).valid, true)
  assert.equal(getBuildingPlacement(world, 'castle', { x: -1500, y: -1500 }).valid, true)
  const invalid = getBuildingPlacement(world, 'castle', { x: 1350, y: 1350 })
  assert.equal(invalid.reason, 'За пределами карты')
  assert.deepEqual(invalid.position, { x: 1450, y: 1450 })
  assert.equal(getBuildingPlacement(world, 'tower', { x: NaN, y: 0 }), null)
})

test('even a thin strip of water or mountain under the base blocks construction', () => {
  for (const type of ['lake', 'river', 'mountain']) {
    const world = emptyWorld([{ type, x: 10, y: 1, width: 1, height: 48 }])
    assert.equal(getBuildingPlacement(world, 'tower', { x: 0, y: 0 }).reason, 'Неподходящая местность')
  }
  const sand = emptyWorld([{ type: 'sand', x: 0, y: 0, width: 50, height: 50 }])
  assert.equal(getBuildingPlacement(sand, 'tower', { x: 0, y: 0 }).valid, true)
  const shore = emptyWorld([{ type: 'lake', x: 50, y: 0, width: 50, height: 50 }])
  assert.equal(getBuildingPlacement(shore, 'tower', { x: 0, y: 0 }).valid, true)
})

test('units, trees, buildings and bridge decks block construction', () => {
  for (const type of ['tree', 'house', 'castle', 'bridge']) {
    const world = emptyWorld()
    world.objects.push({ id: 1, type, group: 0, position: { x: 25, y: 25 } })
    assert.equal(getBuildingPlacement(world, 'tower', { x: 0, y: 0 }).reason, 'Место занято')
  }
  const world = emptyWorld()
  world.units.push({ id: 1, type: 'worker', group: 1, hp: 50, target: null, position: { x: 25, y: 25 } })
  assert.equal(getBuildingPlacement(world, 'tower', { x: 0, y: 0 }).valid, false)
})

test('a formerly green preview is rechecked at confirmation and recovers when a blocker leaves', async () => {
  const store = makeStore()
  await store.dispatch('construction/start', 'tower')
  await pointCursor(store, { x: 1000, y: 1000 })
  assert.equal(store.getters['construction/getPlacement'].valid, true)
  await store.dispatch('world/addObject', {
    kind: 'unit', object: { id: 100, type: 'worker', group: 1, hp: 50, target: null, position: { x: 1025, y: 1025 } },
  })
  assert.equal(store.getters['construction/getPlacement'].valid, false)
  assert.equal(await store.dispatch('construction/place'), false)
  assert.equal(store.state.construction.typeId, 'tower')
  assert.equal(store.state.world.objects.length, 0)
  await store.dispatch('world/destroyObject', 100)
  assert.equal(await store.dispatch('construction/place'), true)
  assert.equal(store.state.world.objects[0].id, 101)
  assert.equal(store.state.construction.typeId, null)
})

test('a stationary cursor follows camera movement and viewport resizing', async () => {
  const store = makeStore()
  await store.dispatch('construction/start', 'tower')
  await pointCursor(store, { x: 0, y: 0 })
  assert.deepEqual(store.getters['construction/getPlacement'].position, { x: 25, y: 25 })
  const delta = worldToScreen({ x: 100, y: 100 })
  await store.dispatch('camera/moveBy', delta)
  assert.deepEqual(store.getters['construction/getPlacement'].position, { x: 125, y: 125 })
  await store.dispatch('construction/setViewport', { width: 1200, height: 600 })
  assert.notDeepEqual(store.getters['construction/getPlacement'].position, { x: 125, y: 125 })
  await store.dispatch('construction/setCursor', null)
  assert.equal(store.getters['construction/getPlacement'], null)
})

test('double confirmation adds one building with player group and full HP', async () => {
  const store = makeStore()
  await store.dispatch('construction/start', 'castle')
  await pointCursor(store, { x: 1000, y: 1000 })
  assert.deepEqual(await Promise.all([
    store.dispatch('construction/place'), store.dispatch('construction/place'),
  ]), [true, false])
  const building = store.state.world.objects[0]
  assert.equal(building.group, PLAYER_GROUP)
  assert.equal(building.hp, OBJECT_TYPES.castle.maxHp)
  await store.dispatch('world/destroyObject', building.id)
  const next = await build(store)
  assert.equal(next.id, building.id + 1)
})

test('a constructed building retains production and shares the ID counter with spawned units', async () => {
  const store = makeStore()
  const house = await build(store, 'house')
  await store.dispatch('selection/select', house.id)
  assert.equal(await store.dispatch('world/spawnUnit', 'worker'), true)
  await store.dispatch('world/updateProduction', UNIT_TYPES.worker.buildSeconds)
  assert.equal(store.state.world.production.length, 0)
  const worker = store.state.world.units.at(-1)
  assert.equal(worker.id, house.id + 1)
  assert.equal(worker.group, house.group)
  assert.equal(worker.hp, UNIT_TYPES.worker.maxHp)
  const tower = await build(store, 'tower', { x: 500, y: 1000 })
  assert.equal(tower.id, worker.id + 1)
})

test('direct world additions cannot bypass the same terrain and bridge checks', async () => {
  for (const world of [
    { terrain: [{ type: 'lake', x: 1010, y: 1001, width: 1, height: 48 }], objects: [] },
    { terrain: [], objects: [{ id: 90, type: 'bridge', group: 0, position: { x: 1025, y: 1025 } }] },
  ]) {
    const store = makeStore(world.terrain)
    store.commit('world/LOAD', { objects: world.objects, units: store.state.world.units.map(unit => ({ ...unit, position: { ...unit.position } })), terrain: world.terrain })
    assert.equal(await store.dispatch('world/addObject', {
      kind: 'static', object: { id: 100, type: 'tower', group: 1, hp: 120, position: { x: 1025, y: 1025 } },
    }), false)
  }
})

test('cancel, pause, menu, restart and game over clear construction', async () => {
  const store = makeStore()
  assert.equal(await store.dispatch('construction/start', 'tree'), false)
  await store.dispatch('construction/start', 'tower')
  await store.dispatch('construction/cancel')
  assert.equal(store.state.construction.typeId, null)
  assert.equal(await store.dispatch('construction/place'), false)
  await store.dispatch('construction/start', 'tower')
  await store.dispatch('game/togglePause')
  assert.equal(store.state.construction.typeId, null)
  assert.equal(await store.dispatch('construction/start', 'tower'), false)
  await store.dispatch('game/togglePause')
  await store.dispatch('construction/start', 'house')
  await store.dispatch('game/openMenu')
  assert.equal(store.state.construction.typeId, null)
  assert.equal(await store.dispatch('construction/start', 'tower'), false)
  await store.dispatch('game/loadScenario', 'base')
  await store.dispatch('construction/start', 'castle')
  await store.dispatch('game/loadScenario', 'base')
  assert.equal(store.state.construction.typeId, null)
  await store.dispatch('construction/start', 'tower')
  const enemies = [...store.state.world.units, ...store.state.world.objects].filter(object => object.group > 1).map(object => object.id)
  for (const id of enemies) await store.dispatch('world/destroyObject', id)
  assert.equal(store.getters['game/isGameOver'], true)
  assert.equal(store.state.construction.typeId, null)
})
