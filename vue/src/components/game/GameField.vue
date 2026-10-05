<template>
  <div ref="container" class="game-field">
    <svg
        :height="viewport.height"
        :width="viewport.width"

        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @wheel.prevent="handleWheel"
        @contextmenu.prevent
    >
      <g :transform="cameraTransform">
        <MapGround :map="map"/>


        <BuildingItem
            v-for="building in buildings"
            :key="building.id"
            :building="building"
            :is-selected="isSelected(building)"
            @select="selectEntity"
        />

        <UnitItem
            v-for="unit in units"
            :key="unit.id"
            :is-selected="isSelected(unit)"
            :unit="unit"
            @select="selectEntity"
        />
      </g>
    </svg>
  </div>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useStore} from 'vuex'

import {getCameraTransform} from '@/game/camera.js'
import {useGameLoop} from '@/composables/useGameLoop.js'
import {useKeyboardDirection} from '@/composables/useKeyboardDirection.js'

import MapGround from './MapGround.vue'
import UnitItem from './UnitItem.vue'
import BuildingItem from './BuildingItem.vue'

const MOUSE_BUTTONS = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
}
const KEYBOARD_CAMERA_SPEED = 800
const WHEEL_ZOOM_FACTOR = 1.1

const store = useStore()

const map = computed(() => store.getters['game/getMap'])
const camera = computed(() => store.getters['game/getCamera'])
const viewport = computed(() => store.getters['game/getViewport'])
const units = computed(() => store.getters['game/getUnits'])
const buildings = computed(() => store.getters['game/getBuildings'])

const selectedEntity = computed(() => store.getters['game/getSelectedEntity'])
const cameraTransform = computed(() => getCameraTransform(camera.value, viewport.value))

const container = ref(null)
const {getDirection} = useKeyboardDirection()


let lastDragPoint = null

function isSelected(entity) {
  return selectedEntity.value !== null && selectedEntity.value.id === entity.id
}

function selectEntity(id) {
  store.dispatch('game/selectEntity', id)
}

function getScreenPoint(event) {
  const rect = container.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function handleMouseDown(event) {
  if (event.button === MOUSE_BUTTONS.LEFT) {
    store.dispatch('game/clearSelection')
  }

  if (event.button === MOUSE_BUTTONS.MIDDLE) {
    event.preventDefault()
    lastDragPoint = getScreenPoint(event)
  }

  if (event.button === MOUSE_BUTTONS.RIGHT) {
    store.dispatch('game/orderSelectedUnitToScreenPoint', getScreenPoint(event))
  }
}

function handleMouseMove(event) {
  if (lastDragPoint === null) {
    return
  }
  const currentPoint = getScreenPoint(event)
  store.dispatch('game/moveCamera', {
    x: lastDragPoint.x - currentPoint.x,
    y: lastDragPoint.y - currentPoint.y,
  })
  lastDragPoint = currentPoint
}

function stopDragging() {lastDragPoint = null}


function handleWheel(event) {
  let zoomFactor = WHEEL_ZOOM_FACTOR
  if (event.deltaY > 0) {
    zoomFactor = 1 / WHEEL_ZOOM_FACTOR
  }
  store.dispatch('game/zoomCamera', {
    screenPoint: getScreenPoint(event),
    zoomFactor: zoomFactor,
  })
}

function updateViewportSize() {
  const rect = container.value.getBoundingClientRect()
  store.dispatch('game/setViewport', {width: rect.width, height: rect.height})
}

function moveCameraByKeyboard(deltaSeconds) {
  const direction = getDirection()
  if (direction.x === 0 && direction.y === 0) {
    return
  }
  store.dispatch('game/moveCamera', {
    x: direction.x * KEYBOARD_CAMERA_SPEED * deltaSeconds,
    y: direction.y * KEYBOARD_CAMERA_SPEED * deltaSeconds,
  })
}

useGameLoop((deltaSeconds) => {
  moveCameraByKeyboard(deltaSeconds)
  store.dispatch('game/advanceTime', deltaSeconds)
})

onMounted(() => {
  updateViewportSize()
  window.addEventListener('resize', updateViewportSize)
  window.addEventListener('mouseup', stopDragging)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportSize)
  window.removeEventListener('mouseup', stopDragging)
})
</script>

<style scoped lang="scss">
.game-field {
  flex: 1;
  overflow: hidden;
  background: #fff;
}

svg {
  display: block;
}
</style>
