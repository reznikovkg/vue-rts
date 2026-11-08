export default {
  namespaced: true,
  state: () => ({
    queue: [],
    nextId: 1,
  }),
  mutations: {
    enqueue(state, event) {
      state.queue.push({
        ...event,
        id: state.nextId++,
      })
    },
    clear(state) {
      state.queue = []
    },
    consume(state, eventIds) {
      const consumed = new Set(eventIds)
      state.queue = state.queue.filter(event => !consumed.has(event.id))
    },
  },
}
