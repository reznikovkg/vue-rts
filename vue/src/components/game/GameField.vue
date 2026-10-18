<template>
  <div
      ref="screenView"
      class="screen-view"
      @mousedown.left="(event) => startSelect(event)"
      @mousedown.middle.prevent="(event) => startDrag(event)"
      @contextmenu.prevent="(event) => moveSelected(event)"
      @mousemove="(event) => saveMouse(event)"
      @mouseleave="() => resetMouse()">

    <div class="world" :style="worldStyle">
      <div class="ground" :style="groundStyle" />

      <div class="objects-layer">
        <GameStaticObject
            v-for="o in objects"
            :key="o.id"
            :object="o"
            :type="OBJECT_TYPES[o.type]"
            :selected="selectedIds.includes(o.id)"
            @select="select(o.id)"/>
      </div>

      <!-- линии пути выбранных юнитов -->
      <div
          v-for="order in orders"
          :key="order.id"
          class="path-line"
          :style="order.pathStyle" />

      <GameUnit
          v-for="u in units"
          :key="u.id"
          :unit="u"
          :type="UNIT_TYPES[u.type]"
          :selected="selectedIds.includes(u.id)"
          @select="select(u.id)"/>

      <div
          v-for="order in orders"
          :key="order.id"
          class="target-mark"
          :style="order.targetStyle" />

    </div>

    <div
        v-if="selectionBox"
        class="selection-box"
        :style="selectionBoxStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import GameStaticObject from './GameStaticObject.vue'
import GameUnit from './GameUnit.vue'
import { CAMERA, MAP, OBJECT_TYPES, UNIT_TYPES } from '@/game/config'
import { clampToMap, screenToWorld, worldToScreen } from '@/game/coords'
import type { Point, StaticObject, Unit } from '@/game/types'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

// перетаскивание камеры средней кнопкой мыши
let dragging = false
let dragLast: Point = { x: 0, y: 0 }
let dragCurrent: Point = { x: 0, y: 0 }

// объекты, юниты и выбор хранятся в store
const store = useStore()
const objects = computed<StaticObject[]>(() => store.getters['game/getObjects'])
const units = computed<Unit[]>(() => store.getters['game/getUnits'])
const selectedIds = computed<number[]>(() => store.getters['game/getSelectedIds'])
const selectedUnits = computed<Unit[]>(() => store.getters['game/getSelectedUnits'])

const screenView = ref<HTMLElement | null>(null)
const camera = reactive({ x: 0, y: 0 })
const mouse = { x: 0, y: 0, inside: false }

// выделение рамкой юнитов
let selectStart: Point | null = null
const selectionBox = ref<Box | null>(null)

const worldStyle = computed(() => ({
  transform: `translate(${-camera.x}px, ${-camera.y}px)`,
}))

const groundStyle = {
  left: -MAP.width / 2 + 'px',
  top: -MAP.height / 2 + 'px',
  width: MAP.width + 'px',
  height: MAP.height + 'px',
  backgroundSize: `${MAP.cell}px ${MAP.cell}px, ${MAP.cell}px ${MAP.cell}px, 256px 256px`,
}

const orders = computed(() => {
  const result = []
  for (const unit of selectedUnits.value) {
    if (unit.target) {
      const from = worldToScreen(unit.position)
      const to = worldToScreen(unit.target)
      const dx = to.x - from.x
      const dy = to.y - from.y
      result.push({
        id: unit.id,
        targetStyle: {
          left: to.x + 'px',
          top: to.y + 'px',
        },
        pathStyle: {
          left: from.x + 'px',
          top: from.y + 'px',
          width: Math.hypot(dx, dy) + 'px',
          transform: `rotate(${Math.atan2(dy, dx)}rad)`,
        },
      })
    }
  }
  return result
})

const selectionBoxStyle = computed(() => {
  const box = selectionBox.value
  if (!box) {
    return {}
  }
  return {
    left: box.left + 'px',
    top: box.top + 'px',
    width: box.width + 'px',
    height: box.height + 'px',
  }
})

const toWorld = (e: MouseEvent): Point => {
  const rect = screenView.value!.getBoundingClientRect()
  return screenToWorld({
    x: e.clientX - rect.left - rect.width / 2 + camera.x,
    y: e.clientY - rect.top - rect.height / 2 + camera.y,
  })
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
  store.dispatch('game/moveSelected', toWorld(e))
}

const clampCamera = () => {
  const point = worldToScreen(clampToMap(screenToWorld(camera)))
  camera.x = point.x
  camera.y = point.y
}

const select = (id: number | null) => {
  store.dispatch('game/select', id)
}

const getSelectionBox = (start: Point): Box => ({
  left: Math.min(start.x, mouse.x),
  top: Math.min(start.y, mouse.y),
  width: Math.abs(mouse.x - start.x),
  height: Math.abs(mouse.y - start.y),
})

// рамка считается рамкой, только если мышь заметно сдвинули, иначе это обычный клик
const isBigEnough = (box: Box) => box.width > MIN_SELECTION_PX || box.height > MIN_SELECTION_PX

// левая кнопка на пустом месте: начинаем тянуть рамку (клик по объекту сюда не доходит, там stop)
const startSelect = (e: MouseEvent) => {
  saveMouse(e)
  selectStart = { x: mouse.x, y: mouse.y }
}

// раз в кадр обновляем рамку на экране
const updateSelectionBox = () => {
  if (!selectStart) {
    return
  }
  const box = getSelectionBox(selectStart)
  selectionBox.value = isBigEnough(box) ? box : null
}

const finishSelect = () => {
  if (!selectStart || !screenView.value) {
    return
  }
  const box = getSelectionBox(selectStart)
  selectStart = null
  selectionBox.value = null

  if (!isBigEnough(box)) {
    select(null)
    return
  }
  const width = screenView.value.clientWidth
  const height = screenView.value.clientHeight
  const ids = units.value
    .filter((u) => {
      const point = worldToScreen(u.position)
      const x = point.x - camera.x + width / 2
      const y = point.y - camera.y + height / 2 - UNIT_TYPES[u.type].height / 2
      return x >= box.left && x <= box.left + box.width && y >= box.top && y <= box.top + box.height
    })
    .map((u) => u.id)
  store.dispatch('game/selectMany', ids)
}

const startDrag = (e: MouseEvent) => {
  dragging = true
  dragLast = { x: e.clientX, y: e.clientY }
  dragCurrent = dragLast
}

const onWindowMouseMove = (e: MouseEvent) => {
  if (!dragging) {
    return
  }
  dragCurrent = { x: e.clientX, y: e.clientY }
}

const onWindowMouseUp = (e: MouseEvent) => {
  if (e.button === 0) {
    finishSelect()
  }
  if (e.button === 1) {
    // применяем сдвиг, накопленный после последнего кадра
    dragCamera()
    dragging = false
  }
}

const dragCamera = () => {
  if (!dragging) {
    return
  }
  camera.x -= dragCurrent.x - dragLast.x
  camera.y -= dragCurrent.y - dragLast.y
  dragLast = dragCurrent
  clampCamera()
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

let frameId = 0
let lastTime = 0

const MIN_SELECTION_PX = 5
const MILLIS_IN_SECOND = 1000
const MAX_FRAME_SECONDS = 0.1

const tick = (time: number) => {
  const secondsPassed = Math.min((time - lastTime) / MILLIS_IN_SECOND, MAX_FRAME_SECONDS)
  lastTime = time

  dragCamera()
  moveCamera(secondsPassed)
  updateSelectionBox()
  store.dispatch('game/moveUnits', secondsPassed)

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
  width: 0;
  height: 0;
}

.ground {
  position: absolute;
  // ромбовидная карта: поворот на 45 градусов и сжатие по вертикали на 0.5
  transform: scaleY(0.5) rotate(45deg);
  background-color: #4a7c3a;
  background-image:
      linear-gradient(to right, rgba(0, 0, 0, 0.2) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(0, 0, 0, 0.2) 1px, transparent 1px),
      url('../../assets/grass.svg');
}

.objects-layer {
  position: absolute;
  z-index: 0;
}

.path-line {
  position: absolute;
  height: 0;
  margin-top: -1px;
  border-top: 2px dashed rgba(255, 255, 255, 0.7);
  transform-origin: left center;
  pointer-events: none;
}

.selection-box {
  position: absolute;
  border: 1px solid #fff;
  background: rgba(255, 255, 255, 0.15);
  pointer-events: none;
}

.target-mark {
  position: absolute;
  width: 16px;
  height: 8px;
  margin: -4px 0 0 -8px;
  border: 2px solid #fff;
  border-radius: 50%;
  pointer-events: none;
}
</style>
