import { createStore } from 'vuex'

export default createStore({
  state: {
    count: 0
  },
  getters: {
    getCountX2: (state: any) => state.count * 2
  },
  mutations: {
    increment: (state: any, payload: number = 1) => {
      state.count += payload
    }
  },
  actions: {
    runIncrement: (store: any, payload: any = 1) => {
      store.commit('increment', payload)
    }
  }
})
