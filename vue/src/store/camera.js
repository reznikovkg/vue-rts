import { clampCameraWorldCenter } from '@/game/camera/cameraBounds.js'
import {
  createCameraAtWorldCenter,
  translateCameraWorldCenter,
} from '@/game/camera/cameraModel.js'
import {
  getCameraWorldZoom,
  zoomCameraAtScreenPoint,
} from '@/game/camera/cameraZoom.js'
import {
  screenToWorld as projectScreenToWorld,
  worldToScreen as projectWorldToScreen,
} from '@/game/world/coordinates.js'

export default {
  namespaced: true,
  state() {
    return {
      camera: createCameraAtWorldCenter(),
    }
  },
  getters: {
    camera: (state) => state.camera,
    worldToScreen: (state) => (wx, wy, viewportSize) =>
      projectWorldToScreen(wx, wy, state.camera, viewportSize),
    screenToWorld: (state) => (sx, sy, viewportSize) =>
      projectScreenToWorld(sx, sy, state.camera, viewportSize),
  },
  mutations: {
    SET_CAMERA(state, camera) {
      state.camera = clampCameraWorldCenter(camera)
    },
    PAN_CAMERA(state, { deltaWx, deltaWy }) {
      state.camera = clampCameraWorldCenter(
        translateCameraWorldCenter(state.camera, deltaWx, deltaWy),
      )
    },
  },
  actions: {
    panCamera({ commit }, payload) {
      commit('PAN_CAMERA', payload)
    },
    zoomAtScreen({ state, commit }, { sx, sy, viewportSize, zoomFactor }) {
      const nextZoom = getCameraWorldZoom(state.camera) * zoomFactor
      commit(
        'SET_CAMERA',
        zoomCameraAtScreenPoint(state.camera, viewportSize, sx, sy, nextZoom),
      )
    },
  },
}