import { calculateNextFrame, winnerFor } from '@/game/world/frame.js'
import { createBuilding, createUnit } from '@/game/world/gameObject.js'

export default {
  namespaced: true,
  state: () => ({ paused: false, started: false, winner: null, frame: 0 }),
  getters: { paused: (state) => state.paused, winner: (state) => state.winner, frame: (state) => state.frame },
  mutations: {
    SET_PAUSED(state, value) { state.paused = value },
    SET_STARTED(state, value) { state.started = value },
    SET_WINNER(state, winner) { state.winner = winner; if (winner !== null) state.paused = true },
    NEXT_FRAME(state) { state.frame++ },
    RESET(state) { state.paused = false; state.started = true; state.winner = null; state.frame = 0 },
  },
  actions: {
    togglePause({ state, commit }) { if (state.winner === null) commit('SET_PAUSED', !state.paused) },
    step({ state, rootState, commit }, elapsedSeconds) {
      if (state.paused || state.winner !== null || !Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return
      const next = calculateNextFrame(rootState.units.list, rootState.events.queues, elapsedSeconds)
      commit('units/SET_OBJECTS', next.objects, { root: true })
      commit('events/SET_QUEUES', next.queues, { root: true })
      commit('NEXT_FRAME')
      commit('SET_STARTED', true)
      commit('SET_WINNER', winnerFor(next.objects, true))
    },
    startScenario({ commit }, name) {
      const scenarios = {
        duel: [createUnit({ id: 'scenario-1', wx: -200, wy: 0, group: 1 }), createUnit({ id: 'scenario-2', wx: 200, wy: 0, group: 2 })],
        fortress: [createUnit({ id: 'scenario-1', wx: -240, wy: 0, group: 1 }), createBuilding({ id: 'scenario-2', wx: 160, wy: 0, group: 2, sizeN: 2 })],
      }
      if (!scenarios[name]) return
      commit('units/SET_OBJECTS', scenarios[name], { root: true })
      commit('units/SELECT', null, { root: true })
      commit('events/SET_QUEUES', {}, { root: true })
      commit('RESET')
    },
    checkWinner({ state, rootState, commit }) {
      if (state.started && state.winner === null) commit('SET_WINNER', winnerFor(rootState.units.list, true))
    },
  },
}
