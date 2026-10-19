<template>
  <div
      class="field-viewport"
      @contextmenu.prevent
      @wheel.prevent="onWheel"
  >
    <svg
        ref="svgRef"
        class="game-world"
        :width="projectedWidth"
        :height="projectedHeight"
        :viewBox="`${cameraX - projectedWidth / (2 * zoom)} ${cameraY - projectedHeight / (2 * zoom)} ${projectedWidth / zoom} ${projectedHeight / zoom}`"
        @contextmenu.prevent="onContextMenu"
    >
      <polygon :points="mapOutline" fill="#3a3a3a" stroke="#888888" stroke-width="2" />
      
      <line
          v-for="(line, index) in gridLines"
          :key="index"
          :x1="line.start.x" :y1="line.start.y"
          :x2="line.end.x" :y2="line.end.y"
          :stroke="line.isAxis ? '#ffffff' : '#555555'"
          :stroke-width="line.isAxis ? 2 : 1"
      />
      
      <circle cx="0" cy="0" r="4" fill="#f0f4e7" />
      
      <slot />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  worldWidth, worldHeight, screenToWorld,
  projectedWidth, projectedHeight, mapOutline, gridLines
} from '@/game/map'

const emit = defineEmits<{
  tick: [delta: number]
  command: [x: number, y: number]
  'background-click': []
}>()

const cameraX = ref(0)
const cameraY = ref(0)
const zoom = ref(1)
const svgRef = ref<SVGSVGElement | null>(null)
const CAMERA_SPEED = 600

const onWheel = (event: WheelEvent) => {
  if (event.deltaY === 0) return
  zoom.value = Math.max(0.3, Math.min(3, zoom.value * (event.deltaY < 0 ? 1.1 : 1 / 1.1)))
}

const onContextMenu = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const matrix = svg.getScreenCTM()
  if (!matrix) return

  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
  const target = screenToWorld(point.x, point.y)
  
  emit(
      'command',
      Math.max(-worldWidth / 2, Math.min(worldWidth / 2, target.x)),
      Math.max(-worldHeight / 2, Math.min(worldHeight / 2, target.y)),
  )
}

const pressedKeys = new Set<string>()
const cameraKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']
let animationFrame = 0
let previousTime = 0

const onKeyDown = (event: KeyboardEvent) => {
  if (!cameraKeys.includes(event.code) || event.ctrlKey || event.metaKey || event.altKey) return
  event.preventDefault()
  pressedKeys.add(event.code)
}
const onKeyUp = (event: KeyboardEvent) => pressedKeys.delete(event.code)
const clearKeys = () => pressedKeys.clear()

const updateFrame = (time: number) => {
  const delta = Math.max(0, Math.min((time - previousTime) / 1000, 0.05))
  previousTime = time
  
  const dx = Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) - Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'))
  const dy = Number(pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) - Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp'))
  const distance = CAMERA_SPEED * delta / (Math.hypot(dx, dy) || 1)

  cameraX.value = Math.max(-projectedWidth / 2, Math.min(projectedWidth / 2, cameraX.value + dx * distance))
  cameraY.value = Math.max(-projectedHeight / 2, Math.min(projectedHeight / 2, cameraY.value + dy * distance))
  
  emit('tick', delta)
  animationFrame = requestAnimationFrame(updateFrame)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', clearKeys)
  previousTime = performance.now()
  animationFrame = requestAnimationFrame(updateFrame)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', clearKeys)
  cancelAnimationFrame(animationFrame)
})
</script>

<style scoped lang="scss">
.field-viewport {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #2b2b2b;
  cursor: crosshair;

  .game-world {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>