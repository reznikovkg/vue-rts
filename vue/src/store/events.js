export default {
  namespaced: true,
  state: () => ({ queues: {} }),
  getters: { queues: (state) => state.queues },
  mutations: {
    SET_QUEUES(state, queues) { state.queues = queues },
    ENQUEUE(state, { ids, event, append = false }) {
      const next = { ...state.queues }
      for (const id of ids) next[id] = [...(append ? next[id] ?? [] : []), { ...event }]
      state.queues = next
    },
    REMOVE(state, id) { const next = { ...state.queues }; delete next[id]; state.queues = next },
  },
}
