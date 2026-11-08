<template>
  <div
    ref="gameField"
    class="game-field"
    @mousedown="handleMouseDown"
    @contextmenu.prevent="handleRightClick"
  >
    <div class="world" :style="worldStyle">
      <div class="iso-map">
        <div
          v-for="tile in tiles"
          :key="tile.id"
          class="iso-tile"
          :class="{ 'iso-tile--alt': tile.alt }"
          :style="{
            left: `${worldToScreenX(tile.x, tile.y)}px`,
            top: `${worldToScreenY(tile.x, tile.y)}px`,
          }"
        />
      </div>

      <GameBuilding
        v-for="building in buildings"
        :key="building.id"
        :x="worldToScreenX(building.x, building.y)"
        :y="worldToScreenY(building.x, building.y)"
        :style="{
          zIndex: Math.round(worldToScreenY(building.x, building.y) + 60),
        }"
      />

      <GameUnit
        v-for="unit in units"
        :key="unit.id"
        :x="worldToScreenX(unit.x, unit.y)"
        :y="worldToScreenY(unit.x, unit.y)"
        :selected="unit.id === selectedUnitId"
        :style="{
          zIndex: Math.round(worldToScreenY(unit.x, unit.y) + 12),
        }"
        @select="selectUnit(unit.id)"
      />

      <div v-if="targetPosition" class="target" :style="targetStyle">
        <div class="target-cross" />
      </div>

      <div class="origin">
        <div class="origin-x" />
        <div class="origin-y" />
      </div>
    </div>

    <div class="hud">
      <div class="hud-row">
        <strong>Camera</strong>
        <span>X: {{ Math.round(camera.x) }} Y: {{ Math.round(camera.y) }}</span>
      </div>

      <div class="hud-row">
        <strong>Selected</strong>
        <span>{{ selectedUnitId ?? 'none' }}</span>
      </div>

      <div class="hud-help">
        <div>WASD / стрелки — движение камеры</div>
        <div>ЛКМ по юниту — выбрать</div>
        <div>ЛКМ по земле — переместить</div>
        <div>Клик по дому — подойти ко входу</div>
        <div>ПКМ — снять выделение</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import GameUnit from './GameUnit.vue'
import GameBuilding from './GameBuilding.vue'

interface Position {
  x: number
  y: number
}

interface Unit {
  id: number
  type: 'unit'
  x: number
  y: number
  speed: number
  target: Position | null
  path: Position[]
}

interface Building {
  id: number
  type: 'house'
  x: number
  y: number
}

interface Tile {
  id: string
  x: number
  y: number
  alt: boolean
}

interface PathNode {
  position: Position
  previous: number | null
  distance: number
  visited: boolean
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

const TILE_WIDTH = 50
const HOUSE_HALF_WIDTH = 115
const HOUSE_HALF_HEIGHT = 62
const UNIT_RADIUS = 8
const PATH_MARGIN = 8

const tiles: Tile[] = []

for (let row = -30; row <= 30; row++) {
  for (let col = -30; col <= 30; col++) {
    tiles.push({
      id: `${row}-${col}`,
      x: col * TILE_WIDTH,
      y: row * TILE_WIDTH,
      alt: (row + col) % 2 !== 0,
    })
  }
}

const buildings = computed(() => store.state.game.buildings as Building[])
const units = computed(() => store.state.game.units as Unit[])
const selectedUnitId = computed(
  () => store.state.game.selectedUnitId as number | null,
)
const targetPosition = computed(
  () => store.state.game.targetPosition as Position | null,
)
const keys = new Set<string>()

let animationFrameId = 0
let previousTime = 0

const worldStyle = computed(() => ({
  width: `${viewport.width}px`,
  height: `${viewport.height}px`,
}))

const targetStyle = computed(() => {
  const target = targetPosition.value

  if (!target) {
    return {}
  }

  return {
    left: `${worldToScreenX(target.x, target.y)}px`,
    top: `${worldToScreenY(target.x, target.y)}px`,
  }
})

const selectedUnit = computed(() => {
  return store.getters['game/selectedUnit'] as Unit | null
})

function worldToScreenX(worldX: number, worldY: number) {
  return (
    viewport.width / 2 +
    ((worldX - camera.x) - (worldY - camera.y)) / 2
  )
}

function worldToScreenY(worldX: number, worldY: number) {
  return (
    viewport.height / 2 +
    ((worldX - camera.x) + (worldY - camera.y)) / 4
  )
}

function screenToWorld(screenX: number, screenY: number): Position {
  const x = screenX - viewport.width / 2
  const y = screenY - viewport.height / 2

  return {
    x: camera.x + x + 2 * y,
    y: camera.y - x + 2 * y,
  }
}

function selectUnit(unitId: number) {
  store.commit('game/selectUnit', unitId)
}

function handleRightClick() {
  store.commit('game/clearSelection')
}

function distanceBetween(a: Position, b: Position) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function toIso(position: Position, building: Building): Position {
  const dx = position.x - building.x
  const dy = position.y - building.y

  return {
    x: (dx - dy) / 2,
    y: (dx + dy) / 4,
  }
}

function fromIso(position: Position, building: Building): Position {
  return {
    x: building.x + position.x + 2 * position.y,
    y: building.y - position.x + 2 * position.y,
  }
}

function pointInsideBuilding(
  position: Position,
  building: Building,
  padding = 0,
) {
  const point = toIso(position, building)

  return (
    Math.abs(point.x) < HOUSE_HALF_WIDTH + padding &&
    Math.abs(point.y) < HOUSE_HALF_HEIGHT + padding
  )
}

function segmentIntersectsBuilding(
  start: Position,
  end: Position,
  building: Building,
) {
  const a = toIso(start, building)
  const b = toIso(end, building)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy) / 2))

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const point = {
      x: a.x + dx * t,
      y: a.y + dy * t,
    }

    if (
      Math.abs(point.x) < HOUSE_HALF_WIDTH + UNIT_RADIUS &&
      Math.abs(point.y) < HOUSE_HALF_HEIGHT + UNIT_RADIUS
    ) {
      return true
    }
  }

  return false
}

function segmentIsClear(start: Position, end: Position) {
  return buildings.value.every(building => {
    return !segmentIntersectsBuilding(start, end, building)
  })
}

function getBuildingWaypoints(building: Building): Position[] {
  const w = HOUSE_HALF_WIDTH + UNIT_RADIUS + PATH_MARGIN
  const h = HOUSE_HALF_HEIGHT + UNIT_RADIUS + PATH_MARGIN

  const isoPoints: Position[] = [
    { x: -w, y: -h },
    { x: -w, y: 0 },
    { x: -w, y: h },
    { x: 0, y: -h },
    { x: 0, y: h },
    { x: w, y: -h },
    { x: w, y: 0 },
    { x: w, y: h },
  ]

  return isoPoints.map(point => fromIso(point, building))
}

function getEntrancePoint(building: Building): Position {
  return fromIso(
    {
      x: 0,
      y: HOUSE_HALF_HEIGHT + UNIT_RADIUS + 2,
    },
    building,
  )
}

function isInsideAnyBuilding(position: Position, padding = 0) {
  return buildings.value.some(building =>
    pointInsideBuilding(position, building, padding),
  )
}

function getSafeDestination(position: Position): Position {
  for (const building of buildings.value) {
    if (pointInsideBuilding(position, building, UNIT_RADIUS)) {
      return getEntrancePoint(building)
    }
  }

  return position
}

function findPath(start: Position, destination: Position): Position[] {
  if (segmentIsClear(start, destination)) {
    return [{ ...destination }]
  }

  const nodes: PathNode[] = [
    {
      position: { ...start },
      previous: null,
      distance: 0,
      visited: false,
    },
    {
      position: { ...destination },
      previous: null,
      distance: Infinity,
      visited: false,
    },
  ]

  for (const building of buildings.value) {
    for (const position of getBuildingWaypoints(building)) {
      if (isInsideAnyBuilding(position, UNIT_RADIUS)) {
        continue
      }

      nodes.push({
        position,
        previous: null,
        distance: Infinity,
        visited: false,
      })
    }
  }

  while (true) {
    let currentIndex = -1
    let shortestDistance = Infinity

    for (let i = 0; i < nodes.length; i++) {
      if (!nodes[i].visited && nodes[i].distance < shortestDistance) {
        currentIndex = i
        shortestDistance = nodes[i].distance
      }
    }

    if (currentIndex === -1 || currentIndex === 1) {
      break
    }

    const current = nodes[currentIndex]
    current.visited = true

    for (let nextIndex = 1; nextIndex < nodes.length; nextIndex++) {
      if (nextIndex === currentIndex || nodes[nextIndex].visited) {
        continue
      }

      const next = nodes[nextIndex]

      if (!segmentIsClear(current.position, next.position)) {
        continue
      }

      const newDistance =
        current.distance +
        distanceBetween(current.position, next.position)

      if (newDistance < next.distance) {
        next.distance = newDistance
        next.previous = currentIndex
      }
    }
  }

  if (!Number.isFinite(nodes[1].distance)) {
    return []
  }

  const path: Position[] = []
  let currentIndex: number | null = 1

  while (currentIndex !== null && currentIndex !== 0) {
    path.unshift({ ...nodes[currentIndex].position })
    currentIndex = nodes[currentIndex].previous
  }

  return path
}

function moveSelectedUnit(position: Position) {
  const unit = selectedUnit.value

  if (!unit) {
    return
  }

  const destination = getSafeDestination({ ...position })
  const path = findPath(
    { x: unit.x, y: unit.y },
    destination,
  )

  if (path.length === 0) {
    return
  }

  store.commit('game/setUnitOrder', {
    unitId: unit.id,
    target: destination,
    path,
  })
}

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0 || !gameField.value) {
    return
  }

  const target = event.target

  if (target instanceof Element && target.closest('.unit')) {
    return
  }

  const rect = gameField.value.getBoundingClientRect()

  const position = screenToWorld(
    event.clientX - rect.left,
    event.clientY - rect.top,
  )

  moveSelectedUnit(position)
}

function updateCamera(deltaTime: number) {
  let directionX = 0
  let directionY = 0

  if (keys.has('a') || keys.has('arrowleft')) directionX -= 1
  if (keys.has('d') || keys.has('arrowright')) directionX += 1
  if (keys.has('w') || keys.has('arrowup')) directionY -= 1
  if (keys.has('s') || keys.has('arrowdown')) directionY += 1

  if (directionX === 0 && directionY === 0) {
    return
  }

  const length = Math.hypot(directionX, directionY)

  directionX /= length
  directionY /= length

  const moveX = directionX * camera.speed * deltaTime
  const moveY = directionY * camera.speed * deltaTime

  camera.x += moveX + 2 * moveY
  camera.y += -moveX + 2 * moveY
}

function updateUnits(deltaTime: number) {
  for (const unit of units.value) {
    if (!unit.target || unit.path.length === 0) {
      continue
    }

    const nextPoint = unit.path[0]
    const deltaX = nextPoint.x - unit.x
    const deltaY = nextPoint.y - unit.y
    const distance = Math.hypot(deltaX, deltaY)
    const movement = unit.speed * deltaTime
    let x = unit.x
    let y = unit.y
    let target = unit.target
    let path = unit.path

    if (distance <= Math.max(movement, 1)) {
      if (!isInsideAnyBuilding(nextPoint, UNIT_RADIUS)) {
        x = nextPoint.x
        y = nextPoint.y
      }

      path = path.slice(1)
    } else {
      const nextPosition = {
        x: x + (deltaX / distance) * movement,
        y: y + (deltaY / distance) * movement,
      }

      const blocked = isInsideAnyBuilding(nextPosition, UNIT_RADIUS)

      if (!blocked) {
        x = nextPosition.x
        y = nextPosition.y
      } else {
        path = findPath(
          { x, y },
          unit.target,
        )

        if (path.length === 0) {
          target = null
        }
      }
    }

    if (path.length === 0) {
      target = null
    }

    store.commit('game/updateUnitProgress', {
      unitId: unit.id,
      x,
      y,
      target,
      path,
    })
  }
}

function gameLoop(time: number) {
  if (!previousTime) {
    previousTime = time
  }

  const deltaTime = Math.min((time - previousTime) / 1000, 0.05)
  previousTime = time

  updateCamera(deltaTime)
  updateUnits(deltaTime)

  animationFrameId = requestAnimationFrame(gameLoop)
}

function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()

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

function handleKeyUp(event: KeyboardEvent) {
  keys.delete(event.key.toLowerCase())
}

function handleResize() {
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('resize', handleResize)

  animationFrameId = requestAnimationFrame(gameLoop)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('resize', handleResize)

  cancelAnimationFrame(animationFrameId)
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

.iso-map {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.iso-tile {
  position: absolute;
  width: 50px;
  height: 25px;
  transform: translate(-50%, -50%);
  background: tokens.$color-grass;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  outline: 1px solid rgba(25, 50, 20, 0.2);

  &--alt {
    background: tokens.$color-grass-alt;
  }
}

.origin {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.origin-x {
  position: absolute;
  left: -20px;
  top: -1px;
  width: 40px;
  height: 2px;
  background: red;
}

.origin-y {
  position: absolute;
  left: -1px;
  top: -20px;
  width: 2px;
  height: 40px;
  background: red;
}

.target {
  position: absolute;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1000;
}

.target-cross {
  position: absolute;
  inset: 0;
  border: 2px solid white;
  border-radius: 50%;
}

.target-cross::before,
.target-cross::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  background: white;
  transform: translate(-50%, -50%);
}

.target-cross::before {
  width: 2px;
  height: 28px;
}

.target-cross::after {
  width: 28px;
  height: 2px;
}

.hud {
  position: absolute;
  left: 20px;
  top: 20px;
  min-width: 220px;
  padding: 14px;
  border-radius: 8px;
  background: tokens.$color-panel;
  color: tokens.$color-white;
  font-family: Arial, sans-serif;
  font-size: 14px;
  z-index: 10000;
}

.hud-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.hud-help {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  line-height: 1.5;
}
</style>