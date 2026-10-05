const createGameObject = (options = {}) => {
  const type = options.type || 'unit'
  const defaults = {
    id: `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    x: 0,
    y: 0,
    speed: 100,
    movable: type !== 'building',
    selected: false,
    targetX: null,
    targetY: null
  }
  return { ...defaults, ...options }
}

export default {
  namespaced: true,
  state: () => ({
    objects: [],
    selectedId: null
  }),
  getters: {
    selectedObject: (state) => state.objects.find(o => o.id === state.selectedId) || null,
    units: (state) => state.objects.filter(o => o.type === 'unit'),
    buildings: (state) => state.objects.filter(o => o.type === 'building')
  },
  mutations: {
    ADD_OBJECT(state, object) {
      state.objects.push(object)
    },
    REMOVE_OBJECT(state, id) {
      state.objects = state.objects.filter(o => o.id !== id)
    },
    SELECT_OBJECT(state, id) {
      state.objects.forEach(o => {
        o.selected = false
      })
      const obj = state.objects.find(o => o.id === id)
      if (obj) {
        obj.selected = true
        state.selectedId = id
      }
      else {
        state.selectedId = null
      }
    },
    DESELECT_ALL(state) {
      state.objects.forEach(o => {
        o.selected = false
      })
      state.selectedId = null
    },
    SET_TARGET(state, { id, x, y }) {
      const obj = state.objects.find(o => o.id === id)
      if (obj) {
        obj.targetX = x
        obj.targetY = y
      }
    },
    UPDATE_POSITION(state, { id, x, y }) {
      const obj = state.objects.find(o => o.id === id)
      if (obj) {
        obj.x = x
        obj.y = y
      }
    },
    CLEAR_TARGET(state, id) {
      const obj = state.objects.find(o => o.id === id)
      if (obj) {
        obj.targetX = null
        obj.targetY = null
      }
    }
  },
  actions: {
    createObject({ commit }, options) {
      const obj = createGameObject(options)
      commit('ADD_OBJECT', obj)
      return obj
    },
    selectObject({ commit }, id) {
      commit('SELECT_OBJECT', id)
    },
    moveSelectedTo({ state, commit }, { x, y }) {
      const obj = state.objects.find(o => o.id === state.selectedId)
      if (!obj || !obj.movable) return
      commit('SET_TARGET', { id: obj.id, x, y })
    }
  }
}