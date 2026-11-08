<template>
  <div
    ref="gameField"
    class="game-field"
    @mousedown="handleMouseDown"
    @mousemove="selection.handleMouseMove"
    @mouseup="selection.handleMouseUp"
    @mouseleave="selection.handleMouseLeave"
    @contextmenu.prevent="commands.handleRightClick"
  >
    <div class="world" :style="worldStyle">
      <GameMap
        :tiles="tiles"
        :buildings="buildings"
        :units="units"
        :selected-unit-ids="selectedUnitIds"
        :selected-building-id="selectedBuildingId"
        :target-position="targetPosition"
        :world-to-screen-x="worldToScreenX"
        :world-to-screen-y="worldToScreenY"
        :tile-size="TILE_SIZE"
        @select-unit="selection.selectUnit"
        @select-building="selection.selectBuilding"
      />

      <GameSelectionBox
        v-if="selection.selectionBox.value"
        :start="selection.dragStart.value"
        :current="selection.dragCurrent.value"
      />
    </div>

    <GameControls />

    <GameResult
      v-if="result"
      :result="result"
      :scenario="scenario"
      @restart="startScenario"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import GameControls from './GameControls.vue'
import GameMap from './GameMap.vue'
import GameResult from './GameResult.vue'
import GameSelectionBox from './GameSelectionBox.vue'
import { useGameState } from './useGameState'
import { useGameLoop } from './useGameLoop'
import { useSelection } from './useSelection'
import { useBuildMode } from './useBuildMode'
import { useCommands } from './useCommands'

interface Position {
  x: number
  y: number
}

const TILE_SIZE = 50
const gameField = ref<HTMLElement | null>(null)
const store = useStore()
const viewport = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
})
const camera = reactive({ x: 0, y: 0, speed: 500 })
const keys = new Set<string>()

const {
  tiles,
  buildings,
  units,
  selectedUnitIds,
  selectedBuildingId,
  targetPosition,
  scenario,
  result,
} = useGameState(store)

const worldStyle = computed(() => ({
  width: `${viewport.width}px`,
  height: `${viewport.height}px`,
}))

function worldToScreenX(worldX: number, worldY: number) {
  return viewport.width / 2 + ((worldX - camera.x) - (worldY - camera.y)) / 2
}

function worldToScreenY(worldX: number, worldY: number) {
  return viewport.height / 2 + ((worldX - camera.x) + (worldY - camera.y)) / 4
}

function screenToWorld(screenX: number, screenY: number): Position {
  const x = screenX - viewport.width / 2
  const y = screenY - viewport.height / 2

  return {
    x: camera.x + x + 2 * y,
    y: camera.y - x + 2 * y,
  }
}

function localPosition(event: MouseEvent): Position | null {
  if (!gameField.value) return null
  const rect = gameField.value.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function enqueue(event: Record<string, unknown>) {
  store.commit('events/enqueue', event)
}

const selection = useSelection({
  units,
  selectedUnitIds,
  worldToScreenX,
  worldToScreenY,
  screenToWorld,
  localPosition,
  enqueue,
  gameField,
})

const buildMode = useBuildMode({
  store,
  localPosition,
  screenToWorld,
  enqueue,
})

const commands = useCommands({
  selectedUnitIds,
  localPosition,
  screenToWorld,
  enqueue,
})

function handleMouseDown(event: MouseEvent) {
  if (buildMode.tryBuild(event)) return
  selection.handleMouseDown(event)
}

function updateCamera(deltaTime: number) {
  let directionX = 0
  let directionY = 0

  if (keys.has('a') || keys.has('arrowleft')) directionX -= 1
  if (keys.has('d') || keys.has('arrowright')) directionX += 1
  if (keys.has('w') || keys.has('arrowup')) directionY -= 1
  if (keys.has('s') || keys.has('arrowdown')) directionY += 1
  if (directionX === 0 && directionY === 0) return

  const length = Math.hypot(directionX, directionY)
  directionX /= length
  directionY /= length
  const moveX = directionX * camera.speed * deltaTime
  const moveY = directionY * camera.speed * deltaTime
  camera.x += moveX + 2 * moveY
  camera.y += -moveX + 2 * moveY
}

const gameLoop = useGameLoop(store, updateCamera)

function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    event.preventDefault()
    keys.add(key)
  }

  commands.handleGroupKeyDown(event)
}

function handleKeyUp(event: KeyboardEvent) {
  keys.delete(event.key.toLowerCase())
}

function handleResize() {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
}

function startScenario(name: string) {
  enqueue({ type: 'scenario', name })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('resize', handleResize)
  gameLoop.start()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('resize', handleResize)
  gameLoop.stop()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/tokens' as tokens;

.game-field {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: tokens.$color-ground;
  user-select: none;
}

.world {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
