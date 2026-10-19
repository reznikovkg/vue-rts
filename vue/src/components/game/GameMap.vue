<template>
  <div
      class="game-map"
      @mousedown="onMouseDown"
      @click.capture="onClickCapture"
      @click="emit('background-click')"
      @contextmenu.prevent
      @wheel.prevent="onWheel"
      @mouseleave="mouse = null"
  >
    <svg
        ref="svgRef"
        class="game-map__world"
        :width="projected.width"
        :height="projected.height"
        :viewBox="viewBox"
        role="group"
        aria-labelledby="map-title map-description"
        @contextmenu.prevent="onContextMenu"
    >
      <title id="map-title">Координатная карта RTS</title>
      <desc id="map-description">
        Изометрическая карта. Начало координат в центре мира, X растёт вправо-вниз, Y — влево-вниз.
        Светлые линии — оси, ромбовидная сетка с шагом {{ map.gridSize }} мировых единиц.
      </desc>

      <polygon :points="outline" fill="#354c2e" stroke="#b9cba5" stroke-width="2" />
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
    <div v-if="isSelecting" class="game-map__selection" :style="selectionStyle" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import {
  worldToScreen,
  screenToWorld,
  clampToMap,
  getProjectedSize,
  getMapOutline,
  getGridLines,
} from '@/game/map.js'

const emit = defineEmits(['tick', 'command', 'background-click', 'select-area', 'cancel'])

const CAMERA_SPEED = 600
const EDGE_SIZE = 16
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const CAMERA_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']

const store = useStore()
const map = computed(() => store.getters['game/getMap'])
const projected = computed(() => getProjectedSize(map.value))
const outline = computed(() => getMapOutline(map.value))
const gridLines = computed(() => getGridLines(map.value))
const xLabel = computed(() => worldToScreen(map.value.gridSize * 4, 0, map.value.gridSize))
const yLabel = computed(() => worldToScreen(0, map.value.gridSize * 4, map.value.gridSize))

// Камера — точка экранной (изометрической) плоскости в центре окна и масштаб.
// Сдвиг и масштаб делает браузер через viewBox, объекты рисуются прямо в координатах карты.
const cameraX = ref(0)
const cameraY = ref(0)
const zoom = ref(1)
const svgRef = ref(null)

const viewBox = computed(() => {
  const width = projected.value.width / zoom.value
  const height = projected.value.height / zoom.value
  return `${cameraX.value - width / 2} ${cameraY.value - height / 2} ${width} ${height}`
})

// Клиентские координаты мыши → координаты внутри SVG (учитывает камеру и положение на странице)
const toSvgPoint = (clientX, clientY) => {
  const matrix = svgRef.value?.getScreenCTM()
  return matrix ? new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()) : null
}

const onContextMenu = (event) => {
  const point = toSvgPoint(event.clientX, event.clientY)
  if (!point) return
  emit('command', clampToMap(screenToWorld(point.x, point.y, map.value.gridSize), map.value))
}

const onWheel = (event) => {
  if (event.deltaY === 0) return
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value * (event.deltaY < 0 ? 1.1 : 1 / 1.1)))
}

// Мышь: ЛКМ — выбор/рамка, СКМ — перетаскивание камеры, курсор у края — прокрутка
const mouse = ref(null)
const selectionStart = ref(null)
const selectionEnd = ref(null)
const isSelecting = ref(false)
let dragLast = null
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

const getLocalPoint = (event) => {
  const rect = svgRef.value.parentElement.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top, width: rect.width, height: rect.height }
}

const onMouseDown = (event) => {
  if (event.button === 1) {
    event.preventDefault()
    dragLast = { x: event.clientX, y: event.clientY }
    return
  }
  if (event.button !== 0) return
  const point = getLocalPoint(event)
  selectionStart.value = { x: point.x, y: point.y, clientX: event.clientX, clientY: event.clientY }
  selectionEnd.value = { x: point.x, y: point.y }
}

const onMouseMove = (event) => {
  const local = getLocalPoint(event)
  const isInside = local.x >= 0 && local.y >= 0 && local.x <= local.width && local.y <= local.height
  mouse.value = isInside ? local : null

  if (dragLast) {
    moveCamera(-(event.clientX - dragLast.x) / zoom.value, -(event.clientY - dragLast.y) / zoom.value)
    dragLast = { x: event.clientX, y: event.clientY }
  }

  const start = selectionStart.value
  if (!start) return
  selectionEnd.value = { x: local.x, y: local.y }
  if (Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 6) {
    isSelecting.value = true
  }
}

const onMouseUp = (event) => {
  if (event.button === 1) dragLast = null
  const start = selectionStart.value
  if (event.button !== 0 || !start) return
  if (isSelecting.value) {
    const first = toSvgPoint(start.clientX, start.clientY)
    const last = toSvgPoint(event.clientX, event.clientY)
    if (first && last) {
      emit('select-area', {
        left: Math.min(first.x, last.x),
        top: Math.min(first.y, last.y),
        right: Math.max(first.x, last.x),
        bottom: Math.max(first.y, last.y),
      })
    }
    // Блокирует click после рамки, чтобы он не сбросил выбор
    suppressClick = true
    window.setTimeout(() => suppressClick = false, 0)
  }
  selectionStart.value = null
  isSelecting.value = false
}

const onClickCapture = (event) => {
  if (!suppressClick) return
  event.preventDefault()
  event.stopPropagation()
  suppressClick = false
}

// Клавиатура: WASD/стрелки — камера, Esc — снять выбор
const pressedKeys = new Set()

const onKeyDown = (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return
  if (event.code === 'Escape') emit('cancel')
  if (!CAMERA_KEYS.includes(event.code)) return
  event.preventDefault()
  pressedKeys.add(event.code)
}

const onKeyUp = (event) => {
  pressedKeys.delete(event.code)
}

const clearInput = () => {
  pressedKeys.clear()
  dragLast = null
}

const moveCamera = (dx, dy) => {
  cameraX.value = Math.max(-projected.value.width / 2, Math.min(projected.value.width / 2, cameraX.value + dx))
  cameraY.value = Math.max(-projected.value.height / 2, Math.min(projected.value.height / 2, cameraY.value + dy))
}

const getCameraDirection = () => {
  let dx = Number(pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight'))
      - Number(pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft'))
  let dy = Number(pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown'))
      - Number(pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp'))
  const point = mouse.value
  if (point && !selectionStart.value && !dragLast) {
    dx += Number(point.x > point.width - EDGE_SIZE) - Number(point.x < EDGE_SIZE)
    dy += Number(point.y > point.height - EDGE_SIZE) - Number(point.y < EDGE_SIZE)
  }
  return { dx: Math.sign(dx), dy: Math.sign(dy) }
}

// Игровой цикл: камера + tick для мира
let animationFrame = 0
let previousTime = 0

const updateFrame = (time) => {
  // Ограничение delta после неактивной вкладки
  const delta = Math.max(0, Math.min((time - previousTime) / 1000, 0.05))
  previousTime = time
  const { dx, dy } = getCameraDirection()
  // Скорость прокрутки на экране не зависит от масштаба
  const distance = CAMERA_SPEED * delta / zoom.value / (Math.hypot(dx, dy) || 1)
  moveCamera(dx * distance, dy * distance)
  emit('tick', delta)
  animationFrame = requestAnimationFrame(updateFrame)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', clearInput)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  previousTime = performance.now()
  animationFrame = requestAnimationFrame(updateFrame)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', clearInput)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  cancelAnimationFrame(animationFrame)
  clearInput()
})
</script>

<style scoped lang="scss">
.game-map {
  position: relative;
  flex: 1;
  overflow: clip;
  background: #243421;

  &__world {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  &__selection {
    position: absolute;
    border: 1px solid #ffe08a;
    background: rgba(255, 224, 138, 0.12);
    pointer-events: none;
  }
}
</style>
