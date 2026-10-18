<template>
  <div class="field-viewport" @click="emit('background-click')" @contextmenu.prevent>
    <svg
        class="game-world"
        :width="projectedWidth"
        :height="projectedHeight"
        :viewBox="`${cameraX - projectedWidth / 2} ${cameraY - projectedHeight / 2} ${projectedWidth} ${projectedHeight}`"
        role="group"
        aria-labelledby="field-title field-description"
        @contextmenu.prevent="onContextMenu"
    >
      <title id="field-title">Координатная карта RTS</title>
      <desc id="field-description">
        Изометрическая карта с управлением камерой через WASD или стрелки. Начало координат в центре мира,
        X растёт вправо-вниз, Y — влево-вниз. Светлые линии обозначают оси,
        ромбовидная сетка отмечает шаг в {{ gridSize }} мировых единиц.
      </desc>

      <polygon
          :points="mapOutline"
          fill="#354c2e"
          stroke="#b9cba5"
          stroke-width="2"
      />
      <line
          v-for="(line, index) in gridLines"
          :key="index"
          :x1="line.start.x"
          :y1="line.start.y"
          :x2="line.end.x"
          :y2="line.end.y"
          :stroke="line.isAxis ? '#b9cba5' : '#66805b'"
          :stroke-width="line.isAxis ? 2 : 1"
      />
      <circle cx="0" cy="0" r="4" fill="#f0f4e7" />
      <g fill="#f0f4e7" font-size="14">
        <text x="10" y="-12">(0, 0)</text>
        <text :x="xLabel.x" :y="xLabel.y" dx="8" dy="-8">+X</text>
        <text :x="yLabel.x" :y="yLabel.y" dx="-8" dy="-8" text-anchor="end">+Y</text>
      </g>

      <slot />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  worldWidth,
  worldHeight,
  gridSize,
  screenToWorld,
  worldToScreen,
  projectedWidth,
  projectedHeight,
  mapOutline,
  gridLines,
} from '@/game/map'

const emit = defineEmits<{
  tick: [delta: number]
  command: [x: number, y: number]
  'background-click': []
}>()

const xLabel = worldToScreen(160, 0)
const yLabel = worldToScreen(0, 160)

const onContextMenu = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const matrix = svg.getScreenCTM()
  if (!matrix) return

  // The inverse SVG matrix accounts for the page position and the camera in viewBox.
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
  const target = screenToWorld(point.x, point.y)
  emit(
      'command',
      Math.max(-worldWidth / 2, Math.min(worldWidth / 2, target.x)),
      Math.max(-worldHeight / 2, Math.min(worldHeight / 2, target.y)),
  )
}

const cameraX = ref(0)
const cameraY = ref(0)
const CAMERA_SPEED = 600
const pressedKeys = new Set<string>()
const cameraKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']
let animationFrame = 0
let previousTime = 0

const onKeyDown = (event: KeyboardEvent) => {
  if (!cameraKeys.includes(event.code) || event.ctrlKey || event.metaKey || event.altKey) return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return

  event.preventDefault()
  pressedKeys.add(event.code)
}

const onKeyUp = (event: KeyboardEvent) => {
  pressedKeys.delete(event.code)
}

const clearKeys = () => {
  pressedKeys.clear()
}

const updateFrame = (time: number) => {
  // Clamp the delta to avoid a jump after an inactive tab.
  const delta = Math.max(0, Math.min((time - previousTime) / 1000, 0.05))
  previousTime = time
  const dx = Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight'))
      - Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'))
  const dy = Number(pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown'))
      - Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp'))
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
  clearKeys()
})
</script>

<style scoped>
.field-viewport {
  position: relative;
  height: clamp(320px, 70vh, 720px);
  margin: 16px 0;
  overflow: clip;
  border: 1px solid #66805b;
  background: #243421;

  .game-world {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}
</style>
