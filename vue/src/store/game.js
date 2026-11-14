import { SCENARIOS } from '@/game/scenarios'

// Партия: выбранный сценарий, меню, пауза, время сценария и конец игры.
// Сами элементы карты лежат в сторе world, выбор игрока - в сторе selection.

const MUTATIONS = {
  SET_PAUSED: 'SET_PAUSED',
  START_SCENARIO: 'START_SCENARIO',
  OPEN_MENU: 'OPEN_MENU',
  ADVANCE_SCENARIO: 'ADVANCE_SCENARIO',
}

export default {
  namespaced: true,
  state () {
    return {
      started: false, // false - показываем меню
      paused: false,
      scenarioTime: 0,
      // События сценария по времени, которые ещё не наступили
      pendingEvents: [],
      scenarioId: SCENARIOS[0].id,
    }
  },
  getters: {
    getStarted: (state) => state.started,
    // Игра идёт, если сценарий выбран и игра не закончена
    isRunning: (state, getters) => state.started && !getters.isGameOver,
    getPaused: (state) => state.paused,
    getScenarioId: (state) => state.scenarioId,
    // Группы у которых остались юниты или здания, группа 0 не считается
    getAliveGroups: (state, getters, rootState, rootGetters) => rootGetters['world/getAliveGroups'],
    // Конец игры, когда осталась одна группа
    getWinner: (state, getters) => (getters.getAliveGroups.length === 1 ? getters.getAliveGroups[0] : null),
    isGameOver: (state, getters) => state.started && getters.getAliveGroups.length <= 1,
  },
  mutations: {
    [MUTATIONS.SET_PAUSED]: (state, paused) => {
      state.paused = paused
    },
    [MUTATIONS.START_SCENARIO]: (state, scenario) => {
      state.paused = false
      state.started = true
      state.scenarioTime = 0
      state.pendingEvents = structuredClone(scenario.events)
      state.scenarioId = scenario.id
    },
    [MUTATIONS.OPEN_MENU]: (state) => {
      state.started = false
      state.paused = false
    },
    // Время сценария идёт вперёд, наступившие события убираются из очереди сценария
    [MUTATIONS.ADVANCE_SCENARIO]: (state, secondsPassed) => {
      state.scenarioTime += secondsPassed
      state.pendingEvents = state.pendingEvents.filter((e) => e.at > state.scenarioTime)
    },
  },
  actions: {
    // Пауза: нажали - стоим, ещё раз - продолжаем
    togglePause: ({ state, commit, dispatch }) => {
      commit(MUTATIONS.SET_PAUSED, !state.paused)
      if (state.paused) dispatch('construction/cancel', null, { root: true })
    },
    // Запустить сценарий по id
    loadScenario: ({ commit, dispatch }, id) => {
      const scenario = SCENARIOS.find((s) => s.id === id)
      if (scenario) {
        dispatch('world/load', scenario, { root: true })
        dispatch('selection/clear', null, { root: true })
        dispatch('events/clear', null, { root: true })
        dispatch('construction/cancel', null, { root: true })
        commit(MUTATIONS.START_SCENARIO, scenario)
      }
    },
    openMenu: ({ commit, dispatch }) => {
      commit(MUTATIONS.OPEN_MENU)
      dispatch('selection/clear', null, { root: true })
      dispatch('events/clear', null, { root: true })
      dispatch('construction/cancel', null, { root: true })
    },
    // События сценария (на паузе и в меню не идут): наступившие становятся событиями move в сторе events
    runScenarioEvents: ({ state, commit, dispatch, getters }, secondsPassed) => {
      if (!state.started || state.paused || getters.isGameOver) {
        return
      }
      const due = state.pendingEvents.filter((e) => e.at <= state.scenarioTime + secondsPassed)
      commit(MUTATIONS.ADVANCE_SCENARIO, secondsPassed)
      due.forEach((e) => dispatch('events/orderMove', { actorIds: [e.unitId], point: e.target }, { root: true }))
    },
  },
}
