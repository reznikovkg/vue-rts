import { isWorldPointInsideMap } from '@/game/world/bounds.js'
import { createGameObject, createUnit } from '@/game/world/gameObject.js'
import { advanceGameObject } from '@/game/world/movement.js'

export default {
    namespaced: true,
    state() {
        return {
            selectedId: null,
            list: [
                //TODO PLACEHOLDER, нужно делать нормальные конфиги для каждых юнитов
                createUnit({ id: 'a', wx: 0, wy: 0, radius: 16, stats: { speed: 120 } }),
                createUnit({ id: 'b', wx: 120, wy: 80, radius: 16, stats: { speed: 220 } }),
            ],
        }
    },
    getters: {
        units: (state) => state.list,
        selectedId: (state) => state.selectedId,
    },
    mutations: {
        SELECT(state, id) {
            state.selectedId = id
        },
        SET_DESTINATION(state, { id, wx, wy }) {
            const unit = state.list.find((item) => item.id === id)
            if (unit) {
                unit.destination = { wx, wy }
            }
        },
        ADVANCE(state, elapsedSeconds) {
            for (const item of state.list) advanceGameObject(item, elapsedSeconds)
        },
        ADD_OBJECT(state, object) {
            if (!state.list.some((item) => item.id === object.id)) state.list.push(object)
        },
    },
    actions: {
        select({ commit }, id) {
            commit('SELECT', id)
        },
        moveSelectedTo({ state, commit }, { wx, wy }) {
            if (state.selectedId !== null && isWorldPointInsideMap(wx, wy)) {
                commit('SET_DESTINATION', { id: state.selectedId, wx, wy })
            }
        },
        advance({ commit }, elapsedSeconds) {
            commit('ADVANCE', elapsedSeconds)
        },
        addObject({ commit }, config) {
            const object = createGameObject(config)
            commit('ADD_OBJECT', object)
            return object
        },
    },
}
