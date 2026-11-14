// Что сейчас выбрано игроком: id объектов и юнитов из стора world

const MUTATIONS = {
    SET_SELECTED_IDS: 'SET_SELECTED_IDS',
}

export default {
    namespaced: true,
    state() {
        return {
            selectedIds: [],
        }
    },
    getters: {
        getSelectedIds: (state) => state.selectedIds,
        // единственный выбранный объект или юнит, null если выбрано не ровно одно
        getSelected: (state, getters, rootState, rootGetters) => {
            if (state.selectedIds.length !== 1) {
                return null
            }
            return rootGetters['world/getById'](state.selectedIds[0])
        },
        getSelectedUnits: (state, getters, rootState, rootGetters) =>
            rootGetters['world/getUnits'].filter((u) => state.selectedIds.includes(u.id)),
    },
    mutations: {
        [MUTATIONS.SET_SELECTED_IDS]: (state, ids) => {
            state.selectedIds = ids
        },
    },
    actions: {
        select: ({commit, rootGetters}, id) => {
            if (!rootGetters['game/isRunning']) {
                return
            }
            commit(MUTATIONS.SET_SELECTED_IDS, id === null ? [] : [id])
        },
        selectMany: ({commit, rootGetters}, ids) => {
            if (!rootGetters['game/isRunning']) {
                return
            }
            commit(MUTATIONS.SET_SELECTED_IDS, ids)
        },
        // Shift + клик: юнит добавляется к выбору или убирается из него
        toggleSelect: ({commit, getters, rootGetters}, id) => {
            if (!rootGetters['game/isRunning']) {
                return
            }
            const ids = getters.getSelectedUnits.map((u) => u.id)
            commit(MUTATIONS.SET_SELECTED_IDS, ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id])
        },
        // shift + рамка: новые юниты добавляются к уже выбранным
        addToSelection: ({commit, getters, rootGetters}, ids) => {
            if (!rootGetters['game/isRunning']) {
                return
            }
            const selected = getters.getSelectedUnits.map((u) => u.id)
            commit(MUTATIONS.SET_SELECTED_IDS, [...selected, ...ids.filter((id) => !selected.includes(id))])
        },
        // убрать из выбора (объект уничтожен)
        deselect: ({state, commit}, id) => {
            if (state.selectedIds.includes(id)) {
                commit(MUTATIONS.SET_SELECTED_IDS, state.selectedIds.filter((selectedId) => selectedId !== id))
            }
        },
        // сбросить выбор (новый сценарий, выход в меню)
        clear: ({commit}) => {
            commit(MUTATIONS.SET_SELECTED_IDS, [])
        },
    },
}
