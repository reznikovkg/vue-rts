<template>
  <div
    ref="gameField"
    class="game-field"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
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
        @select-unit="handleSelectUnit"
        @select-building="handleSelectBuilding"
      />

      <GameSelectionBox
        v-if="selectionBox"
        :start="dragStart"
        :current="dragCurrent"
      />
    </div>

    <ControlsHeader :scenario="scenario" />
    <ControlsGroups />
    <ControlsSelectedUnits />
    <ControlsSelectedBuilding />
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
import GameMap from './GameMap.vue'
import GameSelectionBox from './GameSelectionBox.vue'
import ControlsHeader from './ControlsHeader.vue'
import ControlsGroups from './ControlsGroups.vue'
import ControlsSelectedUnits from './ControlsSelectedUnits.vue'
import ControlsSelectedBuilding from './ControlsSelectedBuilding.vue'
import GameControls from './GameControls.vue'
import GameResult from './GameResult.vue'
import { useGameState } from './useGameState'
import { useGameLoop } from './useGameLoop'
import { useSelection } from './useSelection'
import { useCommands } from './useCommands'
import { useBuildMode } from './useBuildMode'

interface Position {
  x: number
  y: number
}

const gameField = ref<HTMLElement | null>(null)
const store = useStore()

const viewport = reactive({
  width: window.innerWidth,
  height: window.innerHeight,
})

const camera = reactive({
  x: 0,
  y: 0,
  speed: 500,
})

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

const worldToScreenX = (worldX: number, worldY: number) =>
  viewport.width / 2 +
  ((worldX - camera.x) - (worldY - camera.y)) / 2

const worldToScreenY = (worldX: number, worldY: number) =>
  viewport.height / 2 +
  ((worldX - camera.x) + (worldY - camera.y)) / 4

const screenToWorld = (screenX: number, screenY: number): Position => {
  const x = screenX - viewport.width / 2
  const y = screenY - viewport.height / 2

  return {
    x: camera.x + x + 2 * y,
    y: camera.y - x + 2 * y,
  }
}

const enqueue = (event: Record<string, unknown>) => {
  store.commit('events/enqueue', event)
}

const selection = useSelection({
  gameField,
  units,
  worldToScreenX,
  worldToScreenY,
  enqueue,
})

const {
  dragStart,
  dragCurrent,
  selectionBox,
  handleMouseDown: handleSelectionMouseDown,
  handleMouseMove,
  handleMouseUp: handleSelectionMouseUp,
  handleMouseLeave,
} = selection

const commands = useCommands({
  enqueue,
  selectedUnitIds,
  screenToWorld,
})

const build = useBuildMode({
  enqueue,
  buildMode: computed(() => store.state.game.buildMode),
  activeGroup: computed(() => store.state.game.activeGroup),
  gameField,
  screenToWorld,
})

const handleMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return

  const target = event.target

  if (target instanceof Element && target.closest('.unit, .building')) {
    return
  }

  if (build.handleBuildClick(event)) return

  handleSelectionMouseDown(event)
}

const handleMouseUp = (event: MouseEvent) => {
  const moved = handleSelectionMouseUp(event)

  if (
    moved === false &&
    event.button === 0
    && !store.state.game.buildMode
  ) {
    commands.handleGroundClick(event, gameField.value, event.shiftKey)
  }
}

const handleSelectUnit = (unitId: number, event: MouseEvent) => {
  enqueue({
    type: 'select',
    unitIds: [unitId],
    append: event.shiftKey,
  })
}

const handleSelectBuilding = (buildingId: number) => {
  enqueue({
    type: 'select',
    unitIds: [],
    buildingId,
  })
}

const startScenario = (name = 'skirmish') => {
  enqueue({ type: 'scenario', name })
}

const updateCamera = (deltaTime: number) => {
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

const handleKeyDown = (event: KeyboardEvent) => {
  const key = event.key.toLowerCase()

  if (key === 'escape') {
    enqueue({ type: 'buildMode', buildingType: null })
    return
  }

  if (
    [
      'w',
      'a',
      's',
      'd',
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
    ].includes(key)
  ) {
    event.preventDefault()
    keys.add(key)
  }
}

const handleKeyUp = (event: KeyboardEvent) => {
  keys.delete(event.key.toLowerCase())
}

const handleResize = () => {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
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
  left: 0;
  top: 0;
}
</style>
