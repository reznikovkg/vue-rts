// Игровой цикл: раз в кадр (requestAnimationFrame) считаем следующий кадр.
// Компонент игры только запускает (engine/start) и останавливает (engine/stop) цикл.
// Пауза хранится в сторе game (game/togglePause): на паузе кадр мира не считается, камера работает.

const MUTATIONS = {
  SET_RUNNING: 'SET_RUNNING',
}

const MILLIS_IN_SECOND = 1000
// если вкладка была неактивна, не прыгаем вперёд на всё пропущенное время
const MAX_FRAME_SECONDS = 0.1

// номер запрошенного кадра и время прошлого кадра - служебные значения цикла, в стор не кладём
let frameId = 0
let lastTime = 0

export default {
  namespaced: true,
  state () {
    return {
      running: false,
    }
  },
  getters: {
    isRunning: (state) => state.running,
  },
  mutations: {
    [MUTATIONS.SET_RUNNING]: (state, running) => {
      state.running = running
    },
  },
  actions: {
    start: ({ state, commit, dispatch }) => {
      if (state.running) {
        return
      }
      commit(MUTATIONS.SET_RUNNING, true)
      lastTime = performance.now()
      const frame = (now) => {
        const secondsPassed = Math.min((now - lastTime) / MILLIS_IN_SECOND, MAX_FRAME_SECONDS)
        lastTime = now
        dispatch('tick', secondsPassed)
        frameId = requestAnimationFrame(frame)
      }
      frameId = requestAnimationFrame(frame)
    },
    stop: ({ commit }) => {
      cancelAnimationFrame(frameId)
      frameId = 0
      commit(MUTATIONS.SET_RUNNING, false)
    },
    // один кадр игры: камера, затем мир (в меню, на паузе и после конца игры мир стоит)
    tick: ({ dispatch, rootState, rootGetters }, secondsPassed) => {
      dispatch('camera/update', secondsPassed, { root: true })
      if (!rootGetters['game/isRunning'] || rootState.game.paused) {
        return
      }
      dispatch('game/runScenarioEvents', secondsPassed, { root: true })
      dispatch('events/startPending', null, { root: true })
      // атака до движения: догоняем цель, в радиусе стоим и бьём
      dispatch('events/updateAttacks', secondsPassed, { root: true })
      dispatch('world/moveUnits', secondsPassed, { root: true })
          dispatch('events/finishArrived', null, { root: true })
          dispatch('world/removeDead', null, { root: true })
          // производство юнитов в зданиях - после removeDead, чтобы погибшее здание не успело создать юнита
          dispatch('world/updateProduction', secondsPassed, { root: true })
          // строительство зданий: время заданий идёт, готовые снимаются
          dispatch('world/updateConstruction', secondsPassed, { root: true })
    },
  },
}
