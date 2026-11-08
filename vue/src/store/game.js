import { createInitialState } from './game/initialState'
import { advanceFrame, applyFrame } from './game/frame'

export default {
  namespaced: true,
  state: createInitialState,
  getters: {
    selectedUnits: state =>
      state.units.filter(unit => state.selectedUnitIds.includes(unit.id)),
    selectedBuilding: state =>
      state.buildings.find(building => building.id === state.selectedBuildingId) ?? null,
    selectedGroup: state => state.activeGroup,
    isGameOver: state => state.result !== null,
  },
  mutations: {
    applyFrame,
  },
  actions: {
    advanceFrame,
  },
}
