import { CAMERA } from '@/game/config'
import { clampToMap, screenToWorld, worldToScreen } from '@/game/coords'

// Камера: сдвиг экрана относительно центра карты (в пикселях экрана).
// Компонент сообщает, куда двигаться (курсор у края, перетаскивание колёсиком), а сдвиг считается здесь.

const MUTATIONS = {
  SET_POSITION: 'SET_POSITION',
  SET_EDGE_SCROLL: 'SET_EDGE_SCROLL',
}

// камера не уходит за край карты
const clampCamera = (point) => worldToScreen(clampToMap(screenToWorld(point)))

export default {
  namespaced: true,
  state () {
    return {
      x: 0,
      y: 0,
      // направление движения от курсора у края экрана: -1, 0 или 1 по каждой оси
      edgeScroll: { x: 0, y: 0 },
    }
  },
  getters: {
    getPosition: (state) => ({ x: state.x, y: state.y }),
  },
  mutations: {
    [MUTATIONS.SET_POSITION]: (state, point) => {
      state.x = point.x
      state.y = point.y
    },
    [MUTATIONS.SET_EDGE_SCROLL]: (state, direction) => {
      state.edgeScroll = direction
    },
  },
  actions: {
    // сдвиг на заданное число пикселей (перетаскивание колёсиком)
    moveBy: ({ state, commit }, delta) => {
      commit(MUTATIONS.SET_POSITION, clampCamera({ x: state.x + delta.x, y: state.y + delta.y }))
    },
    setEdgeScroll: ({ state, commit }, direction) => {
      if (state.edgeScroll.x !== direction.x || state.edgeScroll.y !== direction.y) {
        commit(MUTATIONS.SET_EDGE_SCROLL, direction)
      }
    },
    // вызывается каждый кадр из engine/tick, двигается и на паузе
    update: ({ state, dispatch }, secondsPassed) => {
      const { x, y } = state.edgeScroll
      if (x !== 0 || y !== 0) {
        const step = CAMERA.speedPxPerSecond * secondsPassed
        dispatch('moveBy', { x: x * step, y: y * step })
      }
    },
  },
}
