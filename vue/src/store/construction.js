import { PLAYER_GROUP } from '@/game/config'
import { screenToWorld } from '@/game/coords'
import { getBuildingPlacement, getBuildingType } from '@/game/building'

export default {
  namespaced: true,
  state: () => ({
    typeId: null,
    // Группа, от имени которой строятся здания (выбирается в панели строительства)
    group: PLAYER_GROUP,
    cursor: null,
    viewport: { width: 0, height: 0 },
  }),
  getters: {
    getTypeId: (state) => state.typeId,
    getGroup: (state) => state.group,
    getType: (state) => state.typeId ? getBuildingType(state.typeId) : null,
    // Камера и мир могут измениться под неподвижным курсором
    getPlacement: (state, getters, rootState, rootGetters) => {
      if (!state.typeId || !state.cursor || !rootGetters['game/isRunning'] || rootState.game.paused ||
          state.viewport.width <= 0 || state.viewport.height <= 0) return null
      const point = screenToWorld({
        x: state.cursor.x - state.viewport.width / 2 + rootState.camera.x,
        y: state.cursor.y - state.viewport.height / 2 + rootState.camera.y,
      })
      const placement = getBuildingPlacement(rootState.world, state.typeId, point)
      // Лимит зданий этого типа у выбранной группы достигнут: место считаем невалидным
      if (placement && getters.getType &&
          rootGetters['world/countObjectsOfType'](state.group, state.typeId) >= getters.getType.maxPerGroup) {
        return { ...placement, valid: false, reason: 'Лимит зданий достигнут' }
      }
      return placement
    },
  },
  mutations: {
    SET_TYPE: (state, typeId) => {
      state.typeId = typeId
      state.cursor = null
    },
    SET_CURSOR: (state, point) => {
      state.cursor = point ? { ...point } : null
    },
    SET_VIEWPORT: (state, size) => {
      state.viewport = { ...size }
    },
    SET_GROUP: (state, group) => {
      state.group = group
    },
  },
  actions: {
    start: ({ commit, rootState, rootGetters }, typeId) => {
      if (!rootGetters['game/isRunning'] || rootState.game.paused || !getBuildingType(typeId)) return false
      commit('SET_TYPE', typeId)
      return true
    },
    cancel: ({ commit }) => commit('SET_TYPE', null),
    setCursor: ({ commit }, point) => commit('SET_CURSOR', point),
    setViewport: ({ commit }, size) => commit('SET_VIEWPORT', size),
    // Выбор группы для строительства: только целые положительные номера
    setGroup: ({ commit }, group) => {
      if (!Number.isInteger(group) || group <= 0) return
      commit('SET_GROUP', group)
    },
    place: async ({ state, getters, commit, dispatch, rootState }) => {
      // Геттер проверяет актуальное место повторно, включая только что вошедшего юнита
      const placement = getters.getPlacement
      if (!placement?.valid) return false
      const typeId = state.typeId
      const type = getBuildingType(typeId)
      const objectId = rootState.world.nextObjectId
      const added = await dispatch('world/addObject', {
        kind: 'static',
        object: {
          id: objectId,
          type: typeId,
          group: state.group,
          hp: type.maxHp,
          position: placement.position,
        },
      }, { root: true })
      if (added) {
        // Здание стоит на карте, но строится ещё buildSeconds секунд (world/updateConstruction)
        dispatch('world/startConstruction', objectId, { root: true })
        if (state.typeId === typeId) commit('SET_TYPE', null)
      }
      return added
    },
  },
}
