import { computed, inject, unref } from 'vue'
import { useStore } from 'vuex'
import { screenToWorld, worldToScreen } from '../world/coordinates.js'

export function useGameMap(viewportSizeSource) {
  const store = useStore()
  const injectedViewportSize = inject('gameViewportSize', null)
  const camera = computed(() => store.getters['camera/camera'])
  const viewportSize = computed(() => {
    const explicit = unref(viewportSizeSource)
    if (explicit?.width && explicit?.height) {
      return explicit
    }
    const injected = injectedViewportSize?.value ?? unref(injectedViewportSize)
    return injected?.width && injected?.height ? injected : { width: 0, height: 0 }
  })

  return {
    camera,
    viewportSize,
    worldToScreen: (wx, wy) => worldToScreen(wx, wy, camera.value, viewportSize.value),
    screenToWorld: (sx, sy) => screenToWorld(sx, sy, camera.value, viewportSize.value),
  }
}
