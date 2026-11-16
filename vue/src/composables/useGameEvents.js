// callbacks для компонентов игры: действие -> экшен стора

import { useStore } from 'vuex'

export const useGameEvents = (store = useStore()) => ({
  select: (id) => store.dispatch('game/select', id),
  toggleSelected: (id) => store.dispatch('game/toggleSelected', id),
  selectArea: (area) => store.dispatch('game/selectArea', area),
  move: (options) => store.dispatch('game/moveSelected', options),
  attack: (options) => store.dispatch('game/attackSelected', options),
  attackGroup: (groupId) => store.dispatch('game/attackGroup', groupId),
  selfDestruct: (id) => store.dispatch('game/selfDestruct', id),
  startPlacement: (type) => store.dispatch('game/startPlacement', type),
  placeBuilding: (options) => store.dispatch('game/placeBuilding', options),
  cancelPlacement: () => store.dispatch('game/cancelPlacement'),
  spawn: (options) => store.dispatch('game/spawnUnits', options),
})
