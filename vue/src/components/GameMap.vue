<template>
  <div
    class="game-map"
    ref="container"
    :style="gridBgStyle"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseLeave"
    @wheel.prevent="onWheel"
    @click="onClick"
    @contextmenu.prevent="onRightClick"
  >
    <div class="world" :style="worldStyle">
      <div class="axis axis-x"></div>
      <div class="axis axis-y"></div>

      <GameObject
        v-for="obj in gameObjects"
        :key="obj.id"
        :object="obj"
        @select="onObjectSelect"
      />

      <div v-if="hoverTile" class="hover-tile" :style="hoverStyle"></div>
    </div>

    <div class="hud">
      X: {{ Math.round(camera.x) }} |
      Y: {{ Math.round(camera.y) }} |
      Zoom: {{ camera.scale.toFixed(2) }} |
      Tile: {{ hoverTile ? `${hoverTile.col},${hoverTile.row}` : '—' }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import GameObject from './GameObject.vue'

const emit = defineEmits(['tile-click', 'tile-right-click'])

const store = useStore()
const gameObjects = computed(() => store.state.gameObjects.objects)

const container = ref(null)
const size = reactive({ width: 0, height: 0 })

const TILE_SIZE = 64
const MIN_SCALE = 0.2
const MAX_SCALE = 4
const CLICK_THRESHOLD = 5
const EDGE_ZONE = 30
const EDGE_SPEED = 900
const KEY_SPEED = 700

const camera = reactive({ x: 0, y: 0, scale: 1, isPanning: false, startX: 0, startY: 0 })
const keys   = reactive({ w: 0, a: 0, s: 0, d: 0, up: 0, down: 0, left: 0, right: 0 })
const mouse  = reactive({ x: 0, y: 0, inside: false })
const hoverTile = ref(null)

let dragDistance = 0

const worldStyle = computed(() => ({
  transform:
    `translate(${size.width / 2}px, ${size.height / 2}px) ` +
    `scale(${camera.scale}) ` +
    `translate(${-camera.x}px, ${-camera.y}px)`
}))

const gridBgStyle = computed(() => {
  const tilePx = TILE_SIZE * camera.scale
  const offX = ((size.width  / 2 - camera.x * camera.scale) % tilePx + tilePx) % tilePx
  const offY = ((size.height / 2 - camera.y * camera.scale) % tilePx + tilePx) % tilePx
  return {
    backgroundImage: `
      linear-gradient(to right,  rgba(140,140,140,0.35) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(140,140,140,0.35) 1px, transparent 1px)
    `,
    backgroundSize: `${tilePx}px ${tilePx}px`,
    backgroundPosition: `${offX}px ${offY}px`
  }
})

const hoverStyle = computed(() => hoverTile.value && ({
  left: `${hoverTile.value.col * TILE_SIZE}px`,
  top: `${hoverTile.value.row * TILE_SIZE}px`,
  width: `${TILE_SIZE}px`,
  height: `${TILE_SIZE}px`
}))

function screenToWorld(clientX, clientY) {
  const rect = container.value.getBoundingClientRect()
  const sx = clientX - rect.left - rect.width / 2
  const sy = clientY - rect.top  - rect.height / 2
  return {
    x: sx / camera.scale + camera.x,
    y: sy / camera.scale + camera.y
  }
}

function onMouseDown(e) {
  if (e.button !== 0) return
  camera.isPanning = true
  camera.startX = e.clientX
  camera.startY = e.clientY
  dragDistance = 0
}

function onMouseMove(e) {
  const rect = container.value.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top

  if (camera.isPanning) {
    const dx = e.clientX - camera.startX
    const dy = e.clientY - camera.startY
    dragDistance += Math.hypot(dx, dy)
    camera.x -= dx / camera.scale
    camera.y -= dy / camera.scale
    camera.startX = e.clientX
    camera.startY = e.clientY
  }

  const w = screenToWorld(e.clientX, e.clientY)
  hoverTile.value = {
    col: Math.floor(w.x / TILE_SIZE),
    row: Math.floor(w.y / TILE_SIZE)
  }
}

function onMouseUp() {
  camera.isPanning = false
}

function onMouseLeave() {
  camera.isPanning = false
  mouse.inside = false
  hoverTile.value = null
}

function onWheel(e) {
  const rect = container.value.getBoundingClientRect()
  const mx = e.clientX - rect.left - rect.width  / 2
  const my = e.clientY - rect.top  - rect.height / 2

  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.min(Math.max(camera.scale * delta, MIN_SCALE), MAX_SCALE)

  const wx = mx / camera.scale + camera.x
  const wy = my / camera.scale + camera.y

  camera.x = wx - mx / newScale
  camera.y = wy - my / newScale
  camera.scale = newScale
}

function onClick(e) {
  if (dragDistance > CLICK_THRESHOLD) return
  const w = screenToWorld(e.clientX, e.clientY)
  emit('tile-click', {
    col: Math.floor(w.x / TILE_SIZE),
    row: Math.floor(w.y / TILE_SIZE),
    worldX: w.x, worldY: w.y
  })
}

function onRightClick(e) {
  const w = screenToWorld(e.clientX, e.clientY)
  emit('tile-right-click', {
    col: Math.floor(w.x / TILE_SIZE),
    row: Math.floor(w.y / TILE_SIZE),
    worldX: w.x, worldY: w.y
  })
}

function onObjectSelect(id) {
  store.dispatch('gameObjects/selectObject', id)
}

const KEY_MAP = {
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right'
}

function onKeyDown(e) {
  const k = KEY_MAP[e.code]
  if (k) {
    keys[k] = 1
    e.preventDefault()
  }
}

function onKeyUp (e) {
  const k = KEY_MAP[e.code]
  if (k) {
    keys[k] = 0
    e.preventDefault()
  }
}

function onEnter() {
  mouse.inside = true
}

let raf = null
let last = 0

function tick(t) {
  const dt = Math.min((t - last) / 1000 || 0, 0.05)
  last = t

  let vx = keys.d + keys.right - keys.a - keys.left
  let vy = keys.s + keys.down  - keys.w - keys.up

  if (mouse.inside && !camera.isPanning) {
    if (mouse.x < EDGE_ZONE)
      vx -= (EDGE_ZONE - mouse.x) / EDGE_ZONE
    if (mouse.x > size.width - EDGE_ZONE)
      vx += (mouse.x - (size.width - EDGE_ZONE)) / EDGE_ZONE
    if (mouse.y < EDGE_ZONE)
      vy -= (EDGE_ZONE - mouse.y) / EDGE_ZONE
    if (mouse.y > size.height - EDGE_ZONE)
      vy += (mouse.y - (size.height - EDGE_ZONE)) / EDGE_ZONE
  }

  const len = Math.hypot(vx, vy)
  if (len > 1e-6) {
    if (len > 1) {
      vx /= len
      vy /= len
    }
    const speed = Math.max(EDGE_SPEED, KEY_SPEED)
    camera.x += vx * speed * dt
    camera.y += vy * speed * dt
  }

  const objects = store.state.gameObjects.objects
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i]
    if (!obj.movable) continue
    if (obj.targetX == null || obj.targetY == null) continue

    const dx = obj.targetX - obj.x
    const dy = obj.targetY - obj.y
    const dist = Math.hypot(dx, dy)

    if (dist < 1) {
      store.commit('gameObjects/UPDATE_POSITION',
        { id: obj.id, x: obj.targetX, y: obj.targetY })
      store.commit('gameObjects/CLEAR_TARGET', obj.id)
    } else {
      const step = obj.speed * dt
      store.commit('gameObjects/UPDATE_POSITION', {
        id: obj.id,
        x: obj.x + (dx / dist) * step,
        y: obj.y + (dy / dist) * step,
      })
    }
  }

  raf = requestAnimationFrame(tick)
}

function updateSize() {
  if (!container.value) return
  const r = container.value.getBoundingClientRect()
  size.width = r.width
  size.height = r.height
}

let ro = null
const onWinResize = () => updateSize()

onMounted(() => {
  updateSize()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(updateSize)
    ro.observe(container.value)
  } else {
    window.addEventListener('resize', onWinResize)
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup',   onKeyUp)
  container.value.addEventListener('mouseenter', onEnter)
  raf = requestAnimationFrame(tick)
})

onUnmounted(() => {
  if (ro)
    ro.disconnect()
  else
    window.removeEventListener('resize', onWinResize)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup',   onKeyUp)
  container.value?.removeEventListener('mouseenter', onEnter)
  cancelAnimationFrame(raf)
})
</script>

<style lang="scss" scoped>
.game-map {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #1a1a1a;
  cursor: grab;
  user-select: none;

  &:active { cursor: grabbing; }
}

.world {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;
}

.axis {
  position: absolute;
  background: rgba(220, 60, 60, 0.7);
  &.axis-x { left: -50000px; top: -1px; width: 100000px; height: 2px; }
  &.axis-y { left: -1px; top: -50000px; width: 2px; height: 100000px; }
}

.hover-tile {
  position: absolute;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  pointer-events: none;
}

.hud {
  position: absolute;
  left: 12px;
  bottom: 12px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #eee;
  font-family: monospace;
  font-size: 12px;
  border-radius: 4px;
  pointer-events: none;
}
</style>