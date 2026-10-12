<template>
  <div
      ref="screenView"
      class="screen-view"
      @mousedown.left="() => initSelect()"
      @mousedown.middle.prevent="(event) => startDrag(event)"
      @contextmenu.prevent="(event) => moveSelected(event)"
      @mousemove="(event) => saveMouse(event)"
      @mouseleave="() => resetMouse()">

    <div class="world" :style="worldStyle">
      <GameStaticObject
          v-for="o in objects"
          :key="o.id"
          :object="o"
          :selected="o === selected"
          @select="selected = o"/>

      <GameUnit
          v-for="u in units"
          :key="u.id"
          :unit="u"
          :selected="u === selected"
          @select="selected = u"/>

      <div
          v-if="selectedUnit?.target"
          class="target-mark"
          :style="targetStyle" />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import GameStaticObject from './GameStaticObject.vue'
import GameUnit from './GameUnit.vue'
import { CAMERA, MAP, START_OBJECTS, START_UNITS, UNIT_TYPES } from '@/game/config'
import type { Point, StaticObject, Unit } from '@/game/types'

// перетаскивание камеры средней кнопкой мыши
let dragging = false
let dragLast: Point = { x: 0, y: 0 }

const selected = defineModel<StaticObject | Unit | null>('selected', { default: null })
const screenView = ref<HTMLElement | null>(null)
const camera = reactive({ x: 0, y: 0 })
const mouse = { x: 0, y: 0, inside: false }
const objects = ref<StaticObject[]>(structuredClone(START_OBJECTS))
const units = ref<Unit[]>(structuredClone(START_UNITS))

const selectedUnit = computed(() => {
  const selectedValue = selected.value
  if (!selectedValue) {
    return null
  }
  if ('target' in selectedValue) {
    return selectedValue
  }
  return null
})

// стили карты: размер, шаг сетки и сдвиг под камеру
// translate ставит точку camera в центр экрана: если камера едет вправо, то карта уезжает влево
const worldStyle = computed(() => ({
  width: MAP.width + 'px',
  height: MAP.height + 'px',
  backgroundSize: MAP.cell + 'px ' + MAP.cell + 'px',
  transform: `translate(${-MAP.width / 2 - camera.x}px, ${-MAP.height / 2 - camera.y}px)`,
}))

const targetStyle = computed(() => {
  const target = selectedUnit.value?.target
  if (target) {
    return {
      left: target.x + MAP.width / 2 + 'px',
      top: target.y + MAP.height / 2 + 'px',
    }
  } else {
    return {}
  }
})

const toWorld = (e: MouseEvent): Point => {
  const rect = screenView.value!.getBoundingClientRect()
  return {
    x: e.clientX - rect.left - rect.width / 2 + camera.x,
    y: e.clientY - rect.top - rect.height / 2 + camera.y,
  }
}

const saveMouse = (e: MouseEvent) => {
  // окно ввода на странице и его размер
  const rect = screenView.value!.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
  mouse.inside = true
}

const resetMouse = () => {
  mouse.inside = false
}

const moveSelected = (e: MouseEvent) => {
  if (!selectedUnit.value) {
    return
  }
  const point = toWorld(e)
  // чтобы не уйти за границы карты
  selectedUnit.value.target = {
    x: Math.max(-MAP.width / 2, Math.min(MAP.width / 2, point.x)),
    y: Math.max(-MAP.height / 2, Math.min(MAP.height / 2, point.y)),
  }
}

const clampCamera = () => {
  camera.x = Math.max(-MAP.width / 2, Math.min(MAP.width / 2, camera.x))
  camera.y = Math.max(-MAP.height / 2, Math.min(MAP.height / 2, camera.y))
}

const initSelect = () => {
  selected.value = null
}

const startDrag = (e: MouseEvent) => {
  dragging = true
  dragLast = { x: e.clientX, y: e.clientY }
}

const onWindowMouseMove = (e: MouseEvent) => {
  if (!dragging) {
    return
  }
  camera.x -= e.clientX - dragLast.x
  camera.y -= e.clientY - dragLast.y
  dragLast = { x: e.clientX, y: e.clientY }
  clampCamera()
}

const onWindowMouseUp = (e: MouseEvent) => {
  if (e.button === 1) {
    dragging = false
  }
}

const moveCamera = (secondsPassed: number) => {
  if (!screenView.value || !mouse.inside || dragging) {
    return
  }

  const width = screenView.value.clientWidth
  const height = screenView.value.clientHeight
  const step = CAMERA.speedPxPerSecond * secondsPassed

  if (mouse.x < CAMERA.edgePx) {
    camera.x -= step
  }
  if (mouse.x > width - CAMERA.edgePx) {
    camera.x += step
  }
  if (mouse.y < CAMERA.edgePx) {
    camera.y -= step
  }
  if (mouse.y > height - CAMERA.edgePx) {
    camera.y += step
  }

  clampCamera()
}

const moveUnits = (secondsPassed: number) => {
  for (const u of units.value) {
    if (u.target) {
      const dx = u.target.x - u.x
      const dy = u.target.y - u.y
      const dist = Math.hypot(dx, dy)
      const step = UNIT_TYPES[u.type].speedPxPerSecond * secondsPassed

      if (dist <= step) {
        u.x = u.target.x
        u.y = u.target.y
        u.target = null
      } else {
        u.x += (dx / dist) * step
        u.y += (dy / dist) * step
      }
    }
  }
}

let frameId = 0
let lastTime = 0

const MILLIS_IN_SECOND = 1000
const MAX_FRAME_SECONDS = 0.1

const tick = (time: number) => {
  const secondsPassed = Math.min((time - lastTime) / MILLIS_IN_SECOND, MAX_FRAME_SECONDS)
  lastTime = time

  moveCamera(secondsPassed)
  moveUnits(secondsPassed)

  frameId = requestAnimationFrame(tick)
}

// компонент появился на странице - запускаем игровой цикл
onMounted(() => {
  lastTime = performance.now()
  frameId = requestAnimationFrame(tick)
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
})

// если ушли со страницы игры - останавливаем цикл
onUnmounted(() => {
  cancelAnimationFrame(frameId)
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})
</script>

<style scoped lang="scss">
.screen-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #1a1a1a;
  user-select: none;
}

.world {
  position: absolute;
  left: 50%;
  top: 50%;
  background-color: #4a7c3a;
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, 0.2) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 1px, transparent 1px);
}

.target-mark {
  position: absolute;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid #fff;
  border-radius: 50%;
  pointer-events: none;
}
</style>
