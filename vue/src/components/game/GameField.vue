<template>
  <div ref="container" class="game-field">
    <svg
        ref="canvas"
        :height="viewport.height"
        :width="viewport.width"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @wheel.prevent="handleWheel"
        @contextmenu.prevent
    >
      <StarField :camera="camera" :viewport="viewport"/>

      <g :transform="cameraTransform">
        <MapPlinth :fog-tiles="fogTiles" :map="map"/>
        <g :transform="ISO_GROUND_TRANSFORM">
          <MapGround :fog-tiles="fogTiles" :map="map"/>
          <DepositField :deposits="deposits" :tile-size="map.tileSize" @command="commandToDeposit"/>
        </g>

        <template v-for="entity in groundItemsInDrawOrder" :key="entity.id">
          <MountainPeak v-if="isMountainPeak(entity)" :peak="entity"/>
          <BuildingItem
              v-else-if="isBuilding(entity)"
              :building="entity"
              :is-selected="isSelected(entity)"
              @command="commandToEntity"
              @select="selectEntity"
          />
          <UnitItem
              v-else
              :is-selected="isSelected(entity)"
              :unit="entity"
              @command="commandToEntity"
              @select="selectEntity"
          />
        </template>

        <UnitItem
            v-for="unit in flyingUnitsInDrawOrder"
            :key="unit.id"
            :is-selected="isSelected(unit)"
            :unit="unit"
            @command="commandToEntity"
            @select="selectEntity"
        />

        <g v-if="fogTiles !== null" :transform="ISO_GROUND_TRANSFORM">
          <FogLayer :map="map" :tiles="fogTiles"/>
        </g>

        <EffectsLayer :effects="effects"/>

        <g :transform="ISO_GROUND_TRANSFORM">
          <OrderMarkers :routes="selectedRoutes"/>
          <PlacementGhost
              v-if="placement !== null && placementArea !== null"
              :area="placementArea"
              :is-valid="placement.isValid"
          />
        </g>
      </g>

      <rect
          v-if="selectionRect !== null"
          :height="selectionRect.maxY - selectionRect.minY"
          :width="selectionRect.maxX - selectionRect.minX"
          :x="selectionRect.minX"
          :y="selectionRect.minY"
          class="game-field__selection-box"
          fill="#fff"
          fill-opacity="0.08"
          stroke="#fff"
          stroke-dasharray="4 4"
      />
    </svg>
  </div>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {useStore} from 'vuex'

import {getCameraTransform} from '@/game/camera.js'
import {GAME_STATUSES} from '@/game/gameStatus.js'
import {isBuilding} from '@/game/entities.js'
import {isMountainPeak} from '@/game/map.js'
import {ISO_GROUND_TRANSFORM} from '@/game/projection.js'
import {useGameLoop} from '@/composables/useGameLoop.js'
import {useKeyboardDirection} from '@/composables/useKeyboardDirection.js'

import MapGround from './MapGround.vue'
import UnitItem from './UnitItem.vue'
import BuildingItem from './BuildingItem.vue'
import OrderMarkers from './OrderMarkers.vue'
import EffectsLayer from './EffectsLayer.vue'
import PlacementGhost from './PlacementGhost.vue'
import StarField from './StarField.vue'
import MapPlinth from './MapPlinth.vue'
import MountainPeak from './MountainPeak.vue'
import DepositField from './DepositField.vue'
import FogLayer from './FogLayer.vue'

const MOUSE_BUTTONS = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2,
}
const KEYBOARD_CAMERA_SPEED = 800
const WHEEL_ZOOM_FACTOR = 1.1
const MIN_SELECTION_BOX_SIZE = 4

const store = useStore()

const map = computed(() => store.getters['game/getMap'])
const camera = computed(() => store.getters['game/getCamera'])
const viewport = computed(() => store.getters['game/getViewport'])
const effects = computed(() => store.getters['game/getEffects'])
const deposits = computed(() => store.getters['game/getDeposits'])
const fogTiles = computed(() => store.getters['game/getFogTiles'])
const placement = computed(() => store.getters['game/getPlacement'])
const placementArea = computed(() => store.getters['game/getPlacementArea'])
const groundItemsInDrawOrder = computed(() => store.getters['game/getGroundItemsInDrawOrder'])
const flyingUnitsInDrawOrder = computed(() => store.getters['game/getFlyingUnitsInDrawOrder'])
const selectedEntityIds = computed(() => store.getters['game/getSelectedEntityIds'])
const selectedRoutes = computed(() => store.getters['game/getSelectedRoutes'])
const cameraTransform = computed(() => getCameraTransform(camera.value, viewport.value))
const isAnimationFrozen = computed(() => store.getters['game/getStatus'] !== GAME_STATUSES.RUNNING)

const container = ref(null)
const canvas = ref(null)
const selectionBox = ref(null)
const {getDirection} = useKeyboardDirection()

let lastDragPoint = null

const selectionRect = computed(() => {
  if (selectionBox.value === null) {
    return null
  }
  const start = selectionBox.value.start
  const current = selectionBox.value.current
  return {
    minX: Math.min(start.x, current.x),
    maxX: Math.max(start.x, current.x),
    minY: Math.min(start.y, current.y),
    maxY: Math.max(start.y, current.y),
  }
})

const isSelected = (entity) => {
  return selectedEntityIds.value.includes(entity.id)
}

const selectEntity = (id, isAdditive) => {
  store.dispatch('game/selectEntity', {id: id, isAdditive: isAdditive})
}

const commandToEntity = (targetId, isQueued) => {
  if (placement.value !== null) {
    store.dispatch('game/cancelPlacement')
    return
  }
  store.dispatch('game/commandSelectedToEntity', {targetId: targetId, isQueued: isQueued})
}

const commandToDeposit = (depositId, isQueued) => {
  if (placement.value !== null) {
    store.dispatch('game/cancelPlacement')
    return
  }
  store.dispatch('game/commandSelectedToDeposit', {depositId: depositId, isQueued: isQueued})
}

const getScreenPoint = (event) => {
  const rect = container.value.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

const handleLeftMouseDown = (event) => {
  if (placement.value !== null) {
    store.dispatch('game/confirmPlacement')
    return
  }

  const point = getScreenPoint(event)
  selectionBox.value = {start: point, current: point, isAdditive: event.shiftKey}
}

const handleRightMouseDown = (event) => {
  if (placement.value !== null) {
    store.dispatch('game/cancelPlacement')
    return
  }

  store.dispatch('game/commandSelectedToScreenPoint', {
    screenPoint: getScreenPoint(event),
    isQueued: event.shiftKey,
    isAttackMove: event.ctrlKey,
  })
}

const handleMouseDown = (event) => {
  if (event.button === MOUSE_BUTTONS.LEFT) {
    handleLeftMouseDown(event)
  }

  if (event.button === MOUSE_BUTTONS.MIDDLE) {
    event.preventDefault()
    lastDragPoint = getScreenPoint(event)
  }

  if (event.button === MOUSE_BUTTONS.RIGHT) {
    handleRightMouseDown(event)
  }
}

const dragCamera = (currentPoint) => {
  store.dispatch('game/moveCamera', {
    x: lastDragPoint.x - currentPoint.x,
    y: lastDragPoint.y - currentPoint.y,
  })
  lastDragPoint = currentPoint
}

const handleMouseMove = (event) => {
  const currentPoint = getScreenPoint(event)

  if (lastDragPoint !== null) {
    dragCamera(currentPoint)
  }
  if (selectionBox.value !== null) {
    selectionBox.value.current = currentPoint
  }
  if (placement.value !== null) {
    store.dispatch('game/updatePlacement', currentPoint)
  }
}

const finishBoxSelection = () => {
  const rect = selectionRect.value
  const isAdditive = selectionBox.value.isAdditive
  selectionBox.value = null

  const isClick = rect.maxX - rect.minX < MIN_SELECTION_BOX_SIZE && rect.maxY - rect.minY < MIN_SELECTION_BOX_SIZE
  if (!isClick) {
    store.dispatch('game/selectUnitsInScreenRect', {rect: rect, isAdditive: isAdditive})
    return
  }
  if (!isAdditive) {
    store.dispatch('game/clearSelection')
  }
}

const handleMouseUp = (event) => {
  if (event.button === MOUSE_BUTTONS.MIDDLE) {
    lastDragPoint = null
  }
  if (event.button === MOUSE_BUTTONS.LEFT && selectionBox.value !== null) {
    finishBoxSelection()
  }
}

const handleKeyDown = (event) => {
  if (event.code === 'Escape') {
    store.dispatch('game/cancelPlacement')
  }
  if (event.code === 'KeyP') {
    store.dispatch('game/togglePause')
  }
}

const handleWheel = (event) => {
  let zoomFactor = WHEEL_ZOOM_FACTOR
  if (event.deltaY > 0) {
    zoomFactor = 1 / WHEEL_ZOOM_FACTOR
  }
  store.dispatch('game/zoomCamera', {
    screenPoint: getScreenPoint(event),
    zoomFactor: zoomFactor,
  })
}

const updateViewportSize = () => {
  const rect = container.value.getBoundingClientRect()
  store.dispatch('game/setViewport', {width: rect.width, height: rect.height})
}

const moveCameraByKeyboard = (deltaSeconds) => {
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

const syncAnimationsWithStatus = (isFrozen) => {
  if (isFrozen) {
    canvas.value.pauseAnimations()
  } else {
    canvas.value.unpauseAnimations()
  }
}

watch(isAnimationFrozen, syncAnimationsWithStatus)

onMounted(() => {
  syncAnimationsWithStatus(isAnimationFrozen.value)
  updateViewportSize()
  window.addEventListener('resize', updateViewportSize)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportSize)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped lang="scss">
.game-field {
  flex: 1;
  overflow: hidden;
  background: #0b0e1a;

  &__selection-box {
    pointer-events: none;
  }

}

svg {
  display: block;
}
</style>
