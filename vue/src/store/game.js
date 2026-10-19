import { createMap, clampToMap, worldToScreen, screenToWorld } from '@/game/map.js'
import {
  UNIT_TYPES,
  BUILDING_TYPES,
  createUnit,
  createBuilding,
  isUnit,
  isBuilding,
  moveUnit,
  getDepth,
} from '@/game/objects.js'

const MUTATIONS = {
  SET_SELECTED: 'SET_SELECTED',
  SET_TARGETS: 'SET_TARGETS',
  TICK: 'TICK',
}

const FORMATION_SPACING = 24

export default {
  namespaced: true,
  state () {
    return {
      map: createMap(3200, 2400, 40),
      objects: [
        createBuilding(BUILDING_TYPES.TOWN_CENTER, -200, -200),
        createBuilding(BUILDING_TYPES.HOUSE, -440, -120),
        createBuilding(BUILDING_TYPES.BARRACKS, -160, 120),
        createUnit(UNIT_TYPES.VILLAGER, 40, -80),
        createUnit(UNIT_TYPES.VILLAGER, 80, -40),
        createUnit(UNIT_TYPES.VILLAGER, 120, 0),
        createUnit(UNIT_TYPES.MILITIA, 80, 120),
        createUnit(UNIT_TYPES.MILITIA, 120, 160),
        createUnit(UNIT_TYPES.SCOUT, 240, -40),
      ],
      selectedIds: [],
    }
  },
  getters: {
    getMap: (state) => state.map,
    getUnits: (state) => state.objects.filter(isUnit),
    getBuildings: (state) => state.objects.filter(isBuilding),
    // Порядок отрисовки для изометрии: дальние объекты раньше, ближние поверх
    getDrawOrder: (state) => [...state.objects].sort((a, b) => getDepth(a) - getDepth(b)),
    getSelected: (state) => state.objects.filter(object => state.selectedIds.includes(object.id)),
    isSelected: (state) => (id) => state.selectedIds.includes(id),
  },
  mutations: {
    [MUTATIONS.SET_SELECTED]: (state, ids) => {
      state.selectedIds = ids
    },
    [MUTATIONS.SET_TARGETS]: (state, targets) => {
      targets.forEach(({ id, target }) => {
        state.objects.find(object => object.id === id).target = target
      })
    },
    [MUTATIONS.TICK]: (state, delta) => {
      const buildings = state.objects.filter(isBuilding)
      state.objects.filter(isUnit).forEach(unit => moveUnit(unit, delta, buildings))
    },
  },
  actions: {
    select: (store, id) => {
      store.commit(MUTATIONS.SET_SELECTED, [id])
    },
    clearSelection: (store) => {
      store.commit(MUTATIONS.SET_SELECTED, [])
    },
    // Рамка приходит в экранных (изометрических) координатах SVG, рамкой выбираются только юниты
    selectArea: (store, { left, top, right, bottom }) => {
      const { gridSize } = store.state.map
      const ids = store.getters.getUnits
        .filter(unit => {
          const point = worldToScreen(unit.x, unit.y, gridSize)
          return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom
        })
        .map(unit => unit.id)
      store.commit(MUTATIONS.SET_SELECTED, ids)
    },
    // Приказ выбранным юнитам идти в точку мира; группа встаёт строем вокруг точки
    moveSelected: (store, { x, y }) => {
      const { map } = store.state
      const units = store.getters.getSelected.filter(isUnit)
      if (!units.length) return

      const destination = worldToScreen(x, y, map.gridSize)
      const columns = Math.ceil(Math.sqrt(units.length))
      const rows = Math.ceil(units.length / columns)

      store.commit(MUTATIONS.SET_TARGETS, units.map((unit, index) => {
        const row = Math.floor(index / columns)
        const countInRow = Math.min(columns, units.length - row * columns)
        const column = index % columns
        const target = screenToWorld(
          destination.x + (column - (countInRow - 1) / 2) * FORMATION_SPACING,
          destination.y + (row - (rows - 1) / 2) * FORMATION_SPACING,
          map.gridSize,
        )
        return { id: unit.id, target: clampToMap(target, map) }
      }))
    },
    tick: (store, delta) => {
      store.commit(MUTATIONS.TICK, delta)
    },
  },
}
