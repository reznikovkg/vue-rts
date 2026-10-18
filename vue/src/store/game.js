// состояние игры: карта, объекты, выбор персонажа-юнита, камера
// компоненты только читают геттеры и вызывают действия

import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '@/game/camera'
import { containsPoint, createSquareMap } from '@/game/map'
import { createStartEntities, isUnit, stepToTarget } from '@/game/entities'

const MAP_SIZE = 120 // карта 120 на 120

export const MUTATIONS = {
  SET_VIEWPORT: 'SET_VIEWPORT',
  SET_CAMERA: 'SET_CAMERA',
  SET_SELECTED: 'SET_SELECTED',
  SET_TARGET: 'SET_TARGET',
  TICK: 'TICK',
}

export default {
  namespaced: true,
  state: () => ({
    map: createSquareMap(MAP_SIZE),
    entities: createStartEntities(),
    selectedIds: [], // массив, чтобы потом добавить выделение нескольких
    camera: createCamera(),
    viewport: { width: 0, height: 0 },
  }),
  getters: {
    getMap: (state) => state.map,
    // сначала дальние (меньше x + y), чтобы ближние рисовались поверх
    getEntities: (state) => [...state.entities].sort((a, b) => a.x + a.y - (b.x + b.y)),
    getSelected: (state) => state.entities.filter((e) => state.selectedIds.includes(e.id)),
    isSelected: (state) => (id) => state.selectedIds.includes(id),
    getCameraMatrix: (state) => cameraMatrix(state.camera, state.viewport),
    toScreen: (state) => (point) => worldToScreen(state.camera, state.viewport, point),
  },
  mutations: {
    [MUTATIONS.SET_VIEWPORT]: (state, viewport) => {
      state.viewport = viewport
    },
    [MUTATIONS.SET_CAMERA]: (state, camera) => {
      state.camera = camera
    },
    [MUTATIONS.SET_SELECTED]: (state, ids) => {
      state.selectedIds = ids
    },
    [MUTATIONS.SET_TARGET]: (state, { id, target }) => {
      state.entities.find((e) => e.id === id).target = target
    },
    // один кадр: каждый идущий персонаж делает шаг к цели
    [MUTATIONS.TICK]: (state, dt) => {
      state.entities.filter((e) => isUnit(e) && e.target).forEach((unit) => Object.assign(unit, stepToTarget(unit, dt)))
    },
  },
  actions: {
    setViewport: ({ commit }, viewport) => commit(MUTATIONS.SET_VIEWPORT, viewport),
    panCamera: ({ commit, state }, delta) =>
      commit(MUTATIONS.SET_CAMERA, panCamera(state.camera, state.viewport, delta, state.map.bounds)),
    zoomCamera: ({ commit, state }, zoom) =>
      commit(MUTATIONS.SET_CAMERA, zoomCamera(state.camera, state.viewport, zoom, state.map.bounds)),
    select: ({ commit }, id) => commit(MUTATIONS.SET_SELECTED, id === null ? [] : [id]),
    // приказ выбранным персонажам идти в точку экрана, если она на карте
    moveSelected: ({ commit, state, getters }, screenPoint) => {
      const target = screenToWorld(state.camera, state.viewport, screenPoint)
      if (!containsPoint(state.map, target)) return
      getters.getSelected.filter(isUnit).forEach((unit) => commit(MUTATIONS.SET_TARGET, { id: unit.id, target }))
    },
    tick: ({ commit }, dt) => commit(MUTATIONS.TICK, dt),
  },
}