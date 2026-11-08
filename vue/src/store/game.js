function createInitialState() {
  return {
    buildings: [
      {
        id: 1,
        type: 'house',
        x: 0,
        y: 0,
      },
    ],
    units: [
      {
        id: 1,
        type: 'unit',
        x: -410,
        y: -320,
        speed: 120,
        target: null,
        path: [],
      },
      {
        id: 2,
        type: 'unit',
        x: 410,
        y: -320,
        speed: 80,
        target: null,
        path: [],
      },
      {
        id: 3,
        type: 'unit',
        x: 0,
        y: 410,
        speed: 100,
        target: null,
        path: [],
      },
    ],
    selectedUnitId: null,
    targetPosition: null,
  }
}

function findUnit(state, unitId) {
  const unit = state.units.find(item => item.id === unitId)

  if (!unit) {
    throw new Error(`Cannot update unknown game unit: ${unitId}`)
  }

  return unit
}

export default {
  namespaced: true,
  state: createInitialState,
  getters: {
    selectedUnit: state =>
      state.units.find(unit => unit.id === state.selectedUnitId) ?? null,
  },
  mutations: {
    selectUnit(state, unitId) {
      const unit = findUnit(state, unitId)
      state.selectedUnitId = unitId
      state.targetPosition = unit.target ? { ...unit.target } : null
    },
    clearSelection(state) {
      state.selectedUnitId = null
      state.targetPosition = null
    },
    setUnitOrder(state, { unitId, target, path }) {
      const unit = findUnit(state, unitId)
      unit.target = { ...target }
      unit.path = path.map(point => ({ ...point }))

      if (state.selectedUnitId === unitId) {
        state.targetPosition = { ...target }
      }
    },
    updateUnitProgress(state, { unitId, x, y, target, path }) {
      const unit = findUnit(state, unitId)
      unit.x = x
      unit.y = y
      unit.target = target ? { ...target } : null
      unit.path = path.map(point => ({ ...point }))

      if (state.selectedUnitId === unitId) {
        state.targetPosition = target ? { ...target } : null
      }
    },
  },
}
