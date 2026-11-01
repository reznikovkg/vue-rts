<template>
  <div ref="viewportEl" class="game-viewport" tabindex="0">
    <svg
      v-if="viewportSize.width && viewportSize.height"
      class="game-world-svg"
      :width="viewportSize.width"
      :height="viewportSize.height"
      :viewBox="viewBox"
    >
      <polygon
        :points="mapOutlinePoints"
        class="game-map-fill"
      />
      <line
        v-for="(segment, index) in gridLines"
        :key="`line-${index}`"
        :x1="segment.x1"
        :y1="segment.y1"
        :x2="segment.x2"
        :y2="segment.y2"
        :class="segment.isAxis ? 'game-grid-axis' : 'game-grid-line'"
      />
      <circle cx="0" cy="0" r="4" class="game-origin-marker" />
      <slot />
    </svg>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
import { useStore } from 'vuex'
import { getCameraWorldZoom } from '../camera/cameraZoom.js'
import { screenToWorld } from "@/game/world/coordinates.js";
import { useCameraPan } from '../camera/useCameraPan.js'
import {
  buildIsometricGridLines,
  buildMapOutlinePoints,
} from '../world/isometricGridLines.js'

const emit = defineEmits(['world-click'])
const store = useStore()
const camera = computed(() => store.getters['camera/camera'])

const viewportEl = ref(null)
const viewportSize = ref({ width: 0, height: 0 })

provide('gameViewportSize', viewportSize)

const viewBox = computed(() => {
  const { width, height } = viewportSize.value
  const zoom = getCameraWorldZoom(camera.value)
  const viewWidth = width / zoom
  const viewHeight = height / zoom
  return `${-viewWidth / 2} ${-viewHeight / 2} ${viewWidth} ${viewHeight}`
})

const mapOutlinePoints = computed(() => buildMapOutlinePoints(camera.value))

const gridLines = computed(() => buildIsometricGridLines(camera.value))

let resizeObserver

useCameraPan(viewportEl, () => camera.value, {
  onClick: (sx, sy, button) => {
    const { wx, wy} = screenToWorld(sx, sy, camera.value, viewportSize.value)
    emit('world-click', { button, wx, wy })
  },
  onPanCamera: (deltaWx, deltaWy) => {
    store.dispatch('camera/panCamera', { deltaWx, deltaWy })
  },
  onZoomAtScreen: (sx, sy, zoomFactor) => {
    store.dispatch('camera/zoomAtScreen', {
      sx,
      sy,
      zoomFactor,
      viewportSize: viewportSize.value,
    })
  },
})

onMounted(() => {
  viewportEl.value?.focus({ preventScroll: true })
  const syncViewportSize = () => {
    if (!viewportEl.value) {
      return
    }
    viewportSize.value = {
      width: viewportEl.value.clientWidth,
      height: viewportEl.value.clientHeight,
    }
  }
  syncViewportSize()
  resizeObserver = new ResizeObserver(syncViewportSize)
  resizeObserver.observe(viewportEl.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped lang="scss">
.game-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #2b2b2b;
  cursor: grab;
  outline: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
}

.game-world-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.game-map-fill {
  fill: #3a5f3a;
  stroke: #888;
  stroke-width: 2;
}

.game-grid-line {
  stroke: #555;
  stroke-width: 1;
}

.game-grid-axis {
  stroke: #fff;
  stroke-width: 2;
}

.game-origin-marker {
  fill: #f0f4e7;
}
</style>
