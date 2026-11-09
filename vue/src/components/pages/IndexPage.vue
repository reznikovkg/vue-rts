<template>
  <main>
    <h1>Игровое поле</h1>
    <p>Карта {{ worldWidth }} × {{ worldHeight }} · шаг сетки {{ gridSize }}</p>
    <p>Камера: WASD или стрелки, масштаб: колесо мыши, пауза: P.</p>
    <p>Здания строятся из панели навигации под картой. ЛКМ по зданию — выбрать и создавать персонажей, ЛКМ по персонажу — выбрать, рамка мышью — выбрать группу, Shift+ЛКМ или Shift+рамка — добавить к выделению, ПКМ — идти к точке, ПКМ по врагу — атаковать, Shift+ПКМ — добавить команду в очередь.</p>

    <GameMap
        @tick="nextFrame"
        @background-click="onBackgroundClick"
        @pointer-move="onPointerMove"
        @select-area="selectArea"
        @command="onCommand"
    >
      <GameObject
          v-for="object in objects"
          :key="object.id"
          :object="object"
          :selected="object.id === selectedObject?.id"
          @select="selectObject(object.id)"
          @target="queue => attack({ kind: 'object', id: object.id }, queue)"
      />
      <GameUnit
          v-for="unit in units"
          :key="unit.id"
          :unit="unit"
          :move-event="events.find(event => event.unitId === unit.id)"
          :queue="store.state.commandQueue.byUnit[unit.id]"
          @select="additive => selectUnit(unit.id, additive)"
          @target="queue => attack({ kind: 'unit', id: unit.id }, queue)"
      />
      <polygon
          v-if="ghost"
          :points="ghostPoints"
          :fill="ghostValid ? 'rgba(141, 220, 120, 0.35)' : 'rgba(230, 90, 80, 0.35)'"
          :stroke="ghostValid ? '#8ddc78' : '#e65a50'"
          stroke-width="2"
          pointer-events="none"
      />
      <template #overlay>
        <div v-if="winner !== null" class="map-message game-over" @mousedown.stop @click.stop>
          <strong>Игра окончена</strong>
          <span v-if="winner">
            Победила
            <span class="swatch" :style="{ background: groupColor(winner) }" />
            группа {{ winner }}{{ winner === playerGroup ? ' — это вы!' : '' }}
          </span>
          <span v-else>Ничья: на карте никого не осталось</span>
          <button type="button" @click="loadScenario(store.state.game.scenarioIndex)">Сыграть ещё раз</button>
        </div>
        <div v-else-if="paused" class="map-message">Пауза</div>
      </template>
    </GameMap>

    <GamePanel
        :build-size="buildSize"
        :building="selectedObject"
        :units="selectedUnits"
        :groups="groups"
        :player-group="playerGroup"
        :paused="paused"
        :scenario-index="store.state.game.scenarioIndex"
        :game-over="winner !== null"
        @build="size => buildSize = size"
        @cancel-build="buildSize = null"
        @spawn="spawnUnit"
        @destroy="destroySelected"
        @player-group="group => store.commit('game/setPlayerGroup', group)"
        @pause="setPaused"
        @scenario="loadScenario"
    />

    <RouterLink :to="{ name: $routes.EXAMPLE }">Пример Vuex</RouterLink>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import GameMap from '@/components/pages/GameMap.vue'
import GameObject from '@/components/pages/GameObject.vue'
import GameUnit from '@/components/pages/GameUnit.vue'
import GamePanel from '@/components/pages/GamePanel.vue'
import type { Unit, MoveEvent, AttackEvent, AttackTarget } from '@/game/Unit'
import { UNIT_RADIUS, canPlaceObject, objectCorners, snapObject, type MapObject } from '@/game/occupancy'
import { worldWidth, worldHeight, gridSize, worldToScreen, screenToWorld } from '@/game/map'
import { groupColor } from '@/game/groups'

const store = useStore()
const units = computed(() => store.state.game.units as Unit[])
const objects = computed(() => store.state.game.objects as MapObject[])
const events = computed(() => store.state.game.events as MoveEvent[])
const attacks = computed(() => store.state.game.attacks as AttackEvent[])
const busyIds = () => new Set([...events.value, ...attacks.value].map(event => event.unitId))
const paused = computed(() => store.state.game.paused as boolean)
const winner = computed(() => store.state.game.winner as number | null)
const playerGroup = computed(() => store.state.game.playerGroup as number)
const groups = computed(() => [...new Set([
  playerGroup.value,
  ...units.value.map(unit => unit.group),
  ...objects.value.map(object => object.group),
])].sort((a, b) => a - b))
const selectedUnits = computed(() => units.value.filter(unit => unit.selected))
const selectedObject = computed(() => objects.value.find(object => object.id === store.state.game.selectedObjectId))

const nextFrame = (delta: number) => {
  const activeBefore = busyIds()
  store.commit('game/nextFrame', delta)
  const activeAfter = busyIds()
  activeBefore.forEach(id => {
    if (activeAfter.has(id)) return
    if (!units.value.some(unit => unit.id === id)) {
      store.commit('commandQueue/clear', [id])
      return
    }
    const next = (store.state.commandQueue.byUnit[id] as MoveEvent[] | undefined)?.[0]
    if (!next) return
    store.commit('commandQueue/shift', id)
    store.commit('game/setMoveEvents', [next])
  })
}

const setPaused = (value: boolean) => {
  store.commit('game/setPaused', value)
}

const loadScenario = (index: number) => {
  buildSize.value = null
  store.commit('commandQueue/reset')
  store.commit('game/loadScenario', index)
}

const onKeyDown = (event: KeyboardEvent) => {
  if (event.code !== 'KeyP' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return
  if (winner.value !== null) return
  setPaused(!paused.value)
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

const buildSize = ref<number | null>(null)
const pointer = ref<{ x: number; y: number } | null>(null)
const ghost = computed(() => buildSize.value && pointer.value
  ? { ...snapObject(pointer.value.x, pointer.value.y, buildSize.value), size: buildSize.value }
  : null)
const ghostPoints = computed(() => ghost.value
  ? objectCorners(ghost.value).map(point => `${point.x},${point.y}`).join(' ')
  : '')
const ghostValid = computed(() => !!ghost.value && canPlaceObject(ghost.value, units.value, objects.value))

const onPointerMove = (x: number, y: number) => {
  pointer.value = { x, y }
}

const onBackgroundClick = (x: number, y: number, additive: boolean) => {
  if (buildSize.value) {
    store.commit('game/placeBuilding', { ...snapObject(x, y, buildSize.value), size: buildSize.value })
    return
  }
  if (!additive) store.commit('game/selectUnits', [])
}

const selectUnit = (id: number, additive: boolean) => {
  if (units.value.find(unit => unit.id === id)?.group !== playerGroup.value) return
  const ids = selectedUnits.value.map(unit => unit.id)
  if (!additive) {
    store.commit('game/selectUnits', [id])
  } else if (ids.includes(id)) {
    store.commit('game/selectUnits', ids.filter(selectedId => selectedId !== id))
  } else {
    store.commit('game/selectUnits', [...ids, id])
  }
}

const selectObject = (id: number) => {
  if (objects.value.find(object => object.id === id)?.group !== playerGroup.value) return
  store.commit('game/selectObject', id)
}

const spawnUnit = () => {
  if (selectedObject.value) store.commit('game/spawnUnit', selectedObject.value.id)
}

const destroySelected = () => {
  const ids = selectedUnits.value.map(unit => unit.id)
  store.commit('commandQueue/clear', ids)
  store.commit('game/destroyUnits', ids)
}

const attack = (target: AttackTarget, queue: boolean) => {
  if (buildSize.value) {
    buildSize.value = null
    return
  }
  const place = target.kind === 'unit'
    ? units.value.find(unit => unit.id === target.id)
    : objects.value.find(object => object.id === target.id)
  if (!place) return
  if (place.group === playerGroup.value) {
    onCommand(place.x, place.y, queue)
    return
  }
  const ids = selectedUnits.value.map(unit => unit.id)
  if (!ids.length) return
  store.commit('commandQueue/clear', ids)
  store.commit('game/attack', { unitIds: ids, target })
}

const selectArea = (left: number, top: number, right: number, bottom: number, additive: boolean) => {
  const ids = units.value.filter(unit => {
    if (unit.group !== playerGroup.value) return false
    const point = worldToScreen(unit.x, unit.y)
    return point.x >= left && point.x <= right
      && point.y - 10 >= top && point.y - 10 <= bottom
  }).map(unit => unit.id)
  const previous = additive ? selectedUnits.value.map(unit => unit.id) : []
  store.commit('game/selectUnits', [...new Set([...previous, ...ids])])
}

const onCommand = (x: number, y: number, queue: boolean) => {
  if (buildSize.value) {
    buildSize.value = null
    return
  }
  const selected = units.value.filter(unit => unit.selected)
  if (!selected.length) return

  const destination = worldToScreen(x, y)
  const spacing = UNIT_RADIUS * 2
  const columns = Math.ceil(Math.sqrt(selected.length))
  const rows = Math.ceil(selected.length / columns)

  const slots = selected.map((_, index) => {
    const row = Math.floor(index / columns)
    const countInRow = Math.min(columns, selected.length - row * columns)
    const column = index % columns
    return {
      x: destination.x + (column - (countInRow - 1) / 2) * spacing,
      y: destination.y + (row - (rows - 1) / 2) * spacing,
    }
  }).sort((a, b) => a.x - b.x)
  selected.sort((a, b) => worldToScreen(a.x, a.y).x - worldToScreen(b.x, b.y).x)

  const moves = selected.map((unit, index) => {
    const target = screenToWorld(slots[index].x, slots[index].y)
    return {
      unitId: unit.id,
      x: Math.max(-worldWidth / 2, Math.min(worldWidth / 2, target.x)),
      y: Math.max(-worldHeight / 2, Math.min(worldHeight / 2, target.y)),
    }
  })
  if (queue) {
    moves.forEach(move => {
      if (busyIds().has(move.unitId)) {
        store.commit('commandQueue/add', move)
      } else {
        store.commit('game/setMoveEvents', [move])
      }
    })
  } else {
    store.commit('commandQueue/clear', moves.map(move => move.unitId))
    store.commit('game/stopAttacks', moves.map(move => move.unitId))
    store.commit('game/setMoveEvents', moves)
  }
}
</script>

<style scoped lang="scss">
.map-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 12px 24px;
  border: 1px solid #b9cba5;
  background: rgba(36, 52, 33, 0.85);
  color: #f0f4e7;
  font-size: 24px;
  text-align: center;
  pointer-events: none;

  &.game-over {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    font-size: 18px;
    pointer-events: auto;

    strong {
      font-size: 24px;
    }

    .swatch {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid #303b31;
      border-radius: 50%;
    }

    button {
      padding: 4px 12px;
      border: 1px solid #b9cba5;
      background: #354c2e;
      color: inherit;
      font-size: 16px;
      cursor: pointer;
    }
  }
}
</style>
