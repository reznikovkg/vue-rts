<template>
  <div
    ref="root"
    class="map"
    @mousedown.left="onDown"
    @mousemove="onMove"
    @mouseup.left="onUp"
    @mouseleave="onLeave"
    @contextmenu.prevent="onContext"
  >
    <div class="world" :style="{ transform: `translate(${camera.x}px, ${camera.y}px)` }">
      <div v-for="t in tiles" :key="t.key" class="tile" :class="t.cls" :style="t.style" />

      <div v-for="r in game.rocks" :key="r.x + '-' + r.y" class="rock" :style="unitStyle(r)" />

      <div v-if="ghost" class="building ghost" :style="buildingStyle(ghost)">
        <div class="shape" />
      </div>

      <div
        v-for="b in game.buildings" :key="b.id"
        class="building" :class="{ selected: game.selected.includes(b.id) }"
        :style="buildingStyle(b)"
      >
        <div class="shape" />
        <span class="icon">{{ BUILDING_TYPES[b.type].icon }}</span>
        <div class="bhp"><i :style="{ width: (b.hp / b.maxHp) * 100 + '%' }" /></div>
      </div>

      <div
        v-for="u in game.units" :key="u.id"
        class="unit" :class="[u.type, { selected: game.selected.includes(u.id) }]"
        :style="unitStyle(u, GROUP_COLORS[u.group])"
      >
        {{ UNIT_TYPES[u.type].icon }}
        <div class="hp"><i :style="{ width: (u.hp / u.maxHp) * 100 + '%' }" /></div>
      </div>
    </div>

    <div v-if="rect" class="rect" :style="rectStyle" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { canPlace } from '@/game/engine'
import {
  TILE_W, TILE_H, MAP_SIZE, GROUP_COLORS, UNIT_TYPES, BUILDING_TYPES,
} from '@/game/config'

const store = useStore()
const game = computed(() => store.state.game)
const camera = computed(() => game.value.camera)

const root = ref(null)
const hover = ref(null)
const rect = ref(null)
let drag = null

// Изометрия: (x, y) клетки -> верхняя вершина ромба в координатах мира
const sx = (x, y) => ((x - y) * TILE_W) / 2
const sy = (x, y) => ((x + y) * TILE_H) / 2

// Местность не меняется — рисуем один раз (обычные div, без canvas)
const tiles = []
for (let y = 0; y < MAP_SIZE; y++) {
  for (let x = 0; x < MAP_SIZE; x++) {
    tiles.push({
      key: x + '-' + y,
      cls: [game.value.terrain[y][x], (x + y) % 2 ? 'a' : 'b'],
      style: { left: sx(x, y) - TILE_W / 2 + 'px', top: sy(x, y) + 'px' },
    })
  }
}

const unitStyle = (e, color) => ({
  transform: `translate(${sx(e.x, e.y) - 14}px, ${sy(e.x, e.y) + TILE_H / 2 - 22}px)`,
  zIndex: 10 + e.x + e.y,
  background: color,
})

const buildingStyle = (b) => ({
  left: sx(b.x, b.y) - (b.size * TILE_W) / 2 + 'px',
  top: sy(b.x, b.y) + 'px',
  width: b.size * TILE_W + 'px',
  height: b.size * TILE_H + 'px',
  zIndex: 10 + b.x + b.y + 2 * (b.size - 1),
  '--c': b.color || GROUP_COLORS[b.group],
})

// Превью постройки под курсором
const ghost = computed(() => {
  const type = game.value.buildType
  const h = hover.value
  if (!type || !h) return null
  const ok = canPlace(game.value, type, h.x, h.y)
  return { x: h.x, y: h.y, size: BUILDING_TYPES[type].size, color: ok ? '#4ade80' : '#f87171' }
})

const rectStyle = computed(() => ({
  left: Math.min(rect.value.x1, rect.value.x2) + 'px',
  top: Math.min(rect.value.y1, rect.value.y2) + 'px',
  width: Math.abs(rect.value.x2 - rect.value.x1) + 'px',
  height: Math.abs(rect.value.y2 - rect.value.y1) + 'px',
}))

const mousePos = (e) => {
  const b = root.value.getBoundingClientRect()
  return { x: e.clientX - b.left, y: e.clientY - b.top }
}

// Экранные координаты -> клетка
const toTile = (p) => {
  const a = (p.x - camera.value.x) / (TILE_W / 2)
  const b = (p.y - camera.value.y - TILE_H / 2) / (TILE_H / 2)
  return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) }
}

const entityAt = ({ x, y }) =>
  game.value.units.find(u => u.x === x && u.y === y) ||
  game.value.buildings.find(b => x >= b.x && x < b.x + b.size && y >= b.y && y < b.y + b.size)

const onDown = (e) => {
  drag = { start: mousePos(e), shift: e.shiftKey }
  rect.value = null
}

const onMove = (e) => {
  const p = mousePos(e)
  hover.value = toTile(p)
  if (drag && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 5) {
    rect.value = { x1: drag.start.x, y1: drag.start.y, x2: p.x, y2: p.y }
  }
}

const onLeave = () => { drag = null; rect.value = null; hover.value = null }

const onUp = (e) => {
  if (!drag) return
  const shift = drag.shift
  if (rect.value) {
    // выделение областью: юниты, чьи экранные координаты попали в рамку
    const r = rect.value
    const [x1, x2] = [Math.min(r.x1, r.x2), Math.max(r.x1, r.x2)]
    const [y1, y2] = [Math.min(r.y1, r.y2), Math.max(r.y1, r.y2)]
    const ids = game.value.units
      .filter(u => {
        const px = camera.value.x + sx(u.x, u.y)
        const py = camera.value.y + sy(u.x, u.y) + TILE_H / 2
        return px >= x1 && px <= x2 && py >= y1 && py <= y2
      })
      .map(u => u.id)
    store.commit('game/SELECT', { ids, mode: shift ? 'add' : 'set' })
  } else {
    const tile = toTile(mousePos(e))
    if (game.value.buildType) {
      store.dispatch('game/placeBuilding', tile)
    } else {
      const ent = entityAt(tile)
      if (ent) store.commit('game/SELECT', { ids: [ent.id], mode: shift && ent.kind === 'unit' ? 'toggle' : 'set' })
      else if (!shift) store.commit('game/SELECT', { ids: [] })
    }
  }
  drag = null
  rect.value = null
}

const onContext = (e) => {
  if (game.value.buildType) { store.commit('game/SET_BUILD_TYPE', null); return }
  const units = store.getters['game/selectedEntities'].filter(s => s.kind === 'unit')
  const tile = toTile(mousePos(e))
  if (!units.length || tile.x < 0 || tile.y < 0 || tile.x >= MAP_SIZE || tile.y >= MAP_SIZE) return
  const queue = e.shiftKey
  const target = entityAt(tile)
  const attackers = target ? units.filter(u => u.group !== target.group) : []
  const movers = units.filter(u => !attackers.includes(u))
  if (attackers.length) {
    store.commit('game/ADD_EVENT', { unitIds: attackers.map(u => u.id), type: 'attack', targetId: target.id, queue })
  }
  if (movers.length) {
    store.commit('game/ADD_EVENT', { unitIds: movers.map(u => u.id), type: 'move', x: tile.x, y: tile.y, queue })
  }
}

onMounted(() => {
  store.commit('game/SET_CAMERA', { x: root.value.clientWidth / 2, y: 30 })
})
</script>

<style scoped>
.map {
  flex: 1;
  position: relative;
  overflow: hidden;
  user-select: none;
}
.world { position: absolute; left: 0; top: 0; }
.world * { pointer-events: none; }

.tile {
  position: absolute;
  width: 64px;
  height: 32px;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.tile.land.a { background: #7cb860; }
.tile.land.b { background: #72ac57; }
.tile.water.a { background: #3b82c4; }
.tile.water.b { background: #3377b8; }

.rock {
  position: absolute; left: 0; top: 0;
  width: 28px; height: 28px;
  border-radius: 40%;
  background: #8b8f98 !important;
  border: 2px solid #4b4f58;
  box-sizing: border-box;
}

.unit {
  position: absolute; left: 0; top: 0;
  width: 28px; height: 28px;
  box-sizing: border-box;
  border: 2px solid #111;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  transition: transform 0.25s linear;
}
.unit.boat { border-radius: 6px; }
.unit.selected { box-shadow: 0 0 0 3px #fff; }
.hp {
  position: absolute; left: 0; right: 0; top: -8px;
  height: 4px; background: #5b1111;
}
.hp i, .bhp i { display: block; height: 100%; background: #4ade80; }

.building { position: absolute; }
.shape {
  position: absolute; inset: 0;
  background: #111;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.shape::after {
  content: '';
  position: absolute; inset: 4%;
  background: var(--c);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
.building.selected .shape { background: #fff; }
.building.ghost { opacity: 0.7; }
.icon {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -65%);
  font-size: 20px;
}
.bhp {
  position: absolute; left: 50%; top: calc(50% + 10px);
  transform: translateX(-50%);
  width: 36px; height: 4px; background: #5b1111;
}

.rect {
  position: absolute;
  border: 1px solid #fff;
  background: rgba(255, 255, 255, 0.15);
  pointer-events: none;
}
</style>
