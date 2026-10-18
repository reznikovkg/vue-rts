<template>
  <div
      class="field-viewport"
      @mousedown="onMouseDown"
      @click.capture="onClickCapture"
      @click="emit('background-click')"
      @contextmenu.prevent
      @wheel.prevent="onWheel"
  >
    <svg
        ref="svgRef"
        class="game-world"
        :width="projectedWidth"
        :height="projectedHeight"
        :viewBox="`${cameraX - projectedWidth / (2 * zoom)} ${cameraY - projectedHeight / (2 * zoom)} ${projectedWidth / zoom} ${projectedHeight / zoom}`"
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
    <div v-if="isSelecting" class="selection-box" :style="selectionStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
  'select-area': [left: number, top: number, right: number, bottom: number]
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
const zoom = ref(1)
const svgRef = ref<SVGSVGElement | null>(null)
const CAMERA_SPEED = 600

const onWheel = (event: WheelEvent) => {
  if (event.deltaY === 0) return
  zoom.value = Math.max(0.5, Math.min(2, zoom.value * (event.deltaY < 0 ? 1.1 : 1 / 1.1)))
}

const selectionStart = ref<{ x: number; y: number; clientX: number; clientY: number } | null>(null)
const selectionEnd = ref<{ x: number; y: number } | null>(null)
const isSelecting = ref(false)
let suppressClick = false

const selectionStyle = computed(() => {
  const start = selectionStart.value
  const end = selectionEnd.value
  if (!start || !end) return {}
  return {
    left: `${Math.min(start.x, end.x)}px`,
    top: `${Math.min(start.y, end.y)}px`,
    width: `${Math.abs(end.x - start.x)}px`,
    height: `${Math.abs(end.y - start.y)}px`,
  }
})

const onMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  selectionStart.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    clientX: event.clientX,
    clientY: event.clientY,
  }
  selectionEnd.value = { x: selectionStart.value.x, y: selectionStart.value.y }
}

const onMouseMove = (event: MouseEvent) => {
  const start = selectionStart.value
  if (!start) return
  const rect = (svgRef.value?.parentElement as HTMLElement).getBoundingClientRect()
  selectionEnd.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  if (Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 6) {
    isSelecting.value = true
  }
}

const onMouseUp = (event: MouseEvent) => {
  const start = selectionStart.value
  if (!start) return
  if (isSelecting.value) {
    const matrix = svgRef.value?.getScreenCTM()
    if (matrix) {
      const inverse = matrix.inverse()
      const first = new DOMPoint(start.clientX, start.clientY).matrixTransform(inverse)
      const last = new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse)
      emit('select-area', Math.min(first.x, last.x), Math.min(first.y, last.y),
        Math.max(first.x, last.x), Math.max(first.y, last.y))
    }
    suppressClick = true
    window.setTimeout(() => suppressClick = false, 0)
  }
  selectionStart.value = null
  isSelecting.value = false
}

const onClickCapture = (event: MouseEvent) => {
  if (!suppressClick) return
  event.preventDefault()
  event.stopPropagation()
  suppressClick = false
}

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
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  previousTime = performance.now()
  animationFrame = requestAnimationFrame(updateFrame)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', clearKeys)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  cancelAnimationFrame(animationFrame)
  clearKeys()
  selectionStart.value = null
})
</script>

<style scoped lang="scss">
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

  .selection-box {
    position: absolute;
    border: 1px solid #ffe08a;
    background: rgba(255, 224, 138, 0.12);
    pointer-events: none;
  }
}
</style>
