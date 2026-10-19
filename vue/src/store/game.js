import { createMap } from '../game/map.js'
import { SCENARIOS } from '../game/scenarios.js'
import {
  tick, canPlace, spawnUnit, removeDead, makeUnit, makeBuilding,
} from '../game/engine.js'

export default {
  namespaced: true,
  state () {
    const { terrain, rocks } = createMap()
    return {
      terrain, rocks,            // местность и статические объекты
      units: [], buildings: [],  // хранилище всех элементов карты
      events: [],                // хранилище текущих событий
      selected: [],
      camera: { x: 0, y: 0 },
      paused: false, hadFight: false, gameOver: false, winner: null,
      buildType: null, group: 1,
      nextId: 1,
    }
  },
  getters: {
    selectedEntities: (s) => [...s.units, ...s.buildings].filter(e => s.selected.includes(e.id)),
  },
  mutations: {
    TICK: (state, dt) => tick(state, dt),
    SET_CAMERA: (state, { x, y }) => { state.camera = { x, y } },
    MOVE_CAMERA: (state, { dx, dy }) => { state.camera = { x: state.camera.x + dx, y: state.camera.y + dy } },
    SET_PAUSED: (state, value) => { state.paused = value },
    SET_BUILD_TYPE: (state, type) => { state.buildType = type },
    SET_GROUP: (state, group) => { state.group = group },

    SELECT: (state, { ids, mode = 'set' }) => {
      if (mode === 'set') { state.selected = ids; return }
      const result = state.selected.filter(id => state.units.some(u => u.id === id))
      ids.forEach(id => {
        const i = result.indexOf(id)
        if (i === -1) result.push(id)
        else if (mode === 'toggle') result.splice(i, 1)
      })
      state.selected = result
    },

    ADD_EVENT: (state, { unitIds, type, x, y, targetId, queue }) => {
      if (!queue) state.events = state.events.filter(e => !unitIds.includes(e.unitId))
      unitIds.forEach(unitId => state.events.push({ id: state.nextId++, unitId, type, x, y, targetId }))
    },

    ADD_BUILDING: (state, { type, x, y, group }) => {
      state.buildings.push(makeBuilding(state, type, x, y, group))
    },
    SPAWN: (state, buildingId) => {
      const b = state.buildings.find(b => b.id === buildingId)
      const unit = b && spawnUnit(state, b)
      if (unit) state.units.push(unit)
    },
    DESTROY: (state, ids) => {
      state.units.filter(u => ids.includes(u.id)).forEach(u => { u.dead = true })
      removeDead(state)
    },

    LOAD_SCENARIO: (state, index) => {
      const sc = SCENARIOS[index]
      Object.assign(state, {
        units: [], buildings: [], events: [], selected: [], nextId: 1,
        paused: false, hadFight: false, gameOver: false, winner: null, buildType: null,
      })
      sc.buildings.forEach(([t, x, y, g]) => state.buildings.push(makeBuilding(state, t, x, y, g)))
      sc.units.forEach(([t, x, y, g]) => state.units.push(makeUnit(state, t, x, y, g)))
    },
  },
  actions: {
    tick: ({ state, commit }, dt) => {
      if (!state.paused && !state.gameOver) commit('TICK', dt)
    },
    placeBuilding: ({ state, commit }, { x, y }) => {
      if (!state.buildType || !canPlace(state, state.buildType, x, y)) return
      commit('ADD_BUILDING', { type: state.buildType, x, y, group: state.group })
      commit('SET_BUILD_TYPE', null)
    },
    spawn: ({ commit }, buildingId) => commit('SPAWN', buildingId),
  },
}

