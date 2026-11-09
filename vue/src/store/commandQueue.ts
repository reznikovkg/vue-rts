import type { MoveEvent } from '@/game/Unit'

type QueueState = { byUnit: Record<number, MoveEvent[]> }

export default {
  namespaced: true,
  state: (): QueueState => ({ byUnit: {} }),
  mutations: {
    add: (state: QueueState, move: MoveEvent) => {
      (state.byUnit[move.unitId] ??= []).push(move)
    },
    shift: (state: QueueState, id: number) => {
      state.byUnit[id]?.shift()
    },
    reset: (state: QueueState) => {
      state.byUnit = {}
    },
    clear: (state: QueueState, ids: number[]) => {
      ids.forEach(id => delete state.byUnit[id])
    },
  },
}
