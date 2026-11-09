<template>
  <svg
    ref="svg"
    class="game-field"
    @mousedown.left="onLeftClick"
    @pointerdown.right.prevent="onRightClick"
    @contextmenu.prevent
    @wheel.prevent="onWheel"
    @mousemove="onMouseMove"
    @mouseleave="mouse.inside = false"
  >
    <!-- все внутри рисуется в координатах мира, матрица камеры делает из квадратов ромбы -->
    <g :transform="matrix">
      <MapGround :map="map" />
      <!-- во время стройки объекты не ловят клики: клик ставит здание, а не выбирает -->
      <g :class="{ 'game-field__objects--placing': placement }">
        <MapBuilding v-for="building in buildings" :key="building.id" :building="building" />
        <MapUnit v-for="unit in units" :key="unit.id" :unit="unit" />
      </g>
      <BuildingGhost />
    </g>

    <!-- HP рисуется в экранных координатах, чтобы шкала не искажалась изометрией. -->
    <g
      v-for="entity in entities"
      :key="`hp-${entity.id}`"
      class="game-field__health"
      :transform="`translate(${toScreen(entity).x}, ${toScreen(entity).y - (isBuilding(entity) ? typeOf(entity).size * 8 + 12 : 19)})`"
    >
      <rect x="-21" y="-3" width="42" height="7" rx="2" fill="#1d2226" stroke="#0d1115" stroke-width="1" />
      <rect
        x="-20" y="-2" :width="40 * entity.hp / typeOf(entity).maxHp" height="5" rx="1"
        :fill="groupColor(entity.groupId)"
      />
    </g>

    <circle :cx="labels.center.x" :cy="labels.center.y" r="4" class="game-field__center" />
    <text :x="labels.center.x + 8" :y="labels.center.y - 6" class="game-field__label">(0, 0)</text>
    <text :x="labels.x.x + 6" :y="labels.x.y" class="game-field__label">x</text>
    <text :x="labels.y.x - 14" :y="labels.y.y" class="game-field__label">y</text>

    <!-- рамка выделения, рисуется в точках экрана -->
    <rect
      v-if="box"
      :x="box.minX"
      :y="box.minY"
      :width="box.maxX - box.minX"
      :height="box.maxY - box.minY"
      class="game-field__box"
    />
  </svg>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { clamp, screenToWorld } from '@/game/camera'
import { canAttack, entityAtPoint, isBuilding, typeOf } from '@/game/entities'
import { isClick, toRect } from '@/game/selection'
import { useGameLoop } from '@/composables/useGameLoop'
import { useKeyboard } from '@/composables/useKeyboard'
import MapGround from './MapGround.vue'
import MapBuilding from './MapBuilding.vue'
import MapUnit from './MapUnit.vue'
import BuildingGhost from './BuildingGhost.vue'

const EDGE = 16
const PAN_SPEED = 700

const store = useStore()
const svg = ref(null)
const mouse = { x: 0, y: 0, inside: false } // не реактивный: нужен только циклу
const { isPressed } = useKeyboard()
const drag = ref(null) // рамка выделения: { from, to, add }, пока зажата ЛКМ

const map = computed(() => store.getters['game/getMap'])
const buildings = computed(() => store.getters['game/getBuildings'])
const units = computed(() => store.getters['game/getUnits'])
const entities = computed(() => store.state.game.entities)
const toScreen = (point) => store.getters['game/toScreen'](point)
const groupColor = (id) => store.getters['game/getGroup'](id)?.color ?? '#999999'
const matrix = computed(() => store.getters['game/getCameraMatrix'])
const placement = computed(() => store.getters['game/getPlacement'])
const labels = computed(() => {
  const toScreen = store.getters['game/toScreen']
  const { maxX, maxY } = map.value.bounds
  return { center: toScreen({ x: 0, y: 0 }), x: toScreen({ x: maxX, y: 0 }), y: toScreen({ x: 0, y: maxY }) }
})
const box = computed(() => drag.value && toRect(drag.value.from, drag.value.to))

// координаты события внутри svg
const toLocal = (e) => {
  const rect = svg.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

// ЛКМ: во время стройки - поставить здание (shift - строить дальше), иначе начинаем рамку выделения
const onLeftClick = (e) => {
  if (placement.value) {
    if (!e.ctrlKey) bus.emit(EVENTS.BUILD_PLACE, { keep: e.shiftKey }) // ctrl+клик на маке - это правый клик
    return
  }

  if (e.ctrlKey || e.altKey || e.metaKey) return
  const point = toLocal(e)
  drag.value = { from: point, to: point, add: e.shiftKey }
}

// отпустили ЛКМ (в том числе за полем): рамка выбирает персонажей, просто клик мимо объектов снимает выбор
const onMouseUp = () => {
  if (!drag.value) return
  const { from, to, add } = drag.value
  drag.value = null

  if (!isClick(toRect(from, to))) bus.emit(EVENTS.SELECT_AREA, { from, to, add })
  else if (!add) bus.emit(EVENTS.SELECT, null)
}

// ПКМ: отмена стройки, атака противника или движение; shift добавляет приказ в очередь
const onRightClick = (e) => {
  if (placement.value) {
    bus.emit(EVENTS.BUILD_CANCEL)
    return
  }
  const point = toLocal(e)
  const { camera, viewport, entities } = store.state.game
  const target = entityAtPoint(entities, screenToWorld(camera, viewport, point))
  const selected = store.getters['game/getSelected']
  if (target && selected.some((unit) => canAttack(unit, target))) bus.emit(EVENTS.ATTACK, { targetId: target.id, append: e.shiftKey })
  else bus.emit(EVENTS.MOVE, { point, append: e.shiftKey })
}

// запоминаем курсор для прокрутки у края; во время стройки двигаем за ним здание-призрак
const onMouseMove = (e) => {
  const point = toLocal(e)
  Object.assign(mouse, point, { inside: true })
  if (placement.value) store.dispatch('game/movePlacement', point)
  if (drag.value) drag.value.to = point
}

// щипок на тачпаде (и ctrl+колесо) приходит с ctrlKey -> зум, свайп двумя пальцами -> сдвиг камеры
const onWheel = (e) => {
  if (e.ctrlKey) store.dispatch('game/zoomCamera', { point: toLocal(e), factor: Math.exp(-clamp(e.deltaY, -50, 50) * 0.01) })
  else store.dispatch('game/panCamera', { dx: e.deltaX, dy: e.deltaY })
}

// камера: wasd, стрелки или курсор у края экрана
const moveCamera = (dt) => {
  const { width, height } = store.state.game.viewport
  const at = (edge) => mouse.inside && edge
  const dx = (isPressed('KeyD', 'ArrowRight') || at(mouse.x > width - EDGE)) - (isPressed('KeyA', 'ArrowLeft') || at(mouse.x < EDGE))
  const dy = (isPressed('KeyS', 'ArrowDown') || at(mouse.y > height - EDGE)) - (isPressed('KeyW', 'ArrowUp') || at(mouse.y < EDGE))
  if (!dx && !dy) return
  const len = Math.hypot(dx, dy) // по диагонали не быстрее
  store.dispatch('game/panCamera', { dx: (dx / len) * PAN_SPEED * dt, dy: (dy / len) * PAN_SPEED * dt })
}

useGameLoop((dt) => {
  moveCamera(dt)
  store.dispatch('game/tick', dt)
})

const resizeObserver = new ResizeObserver(([entry]) =>
  store.dispatch('game/setViewport', { width: entry.contentRect.width, height: entry.contentRect.height }),
)

// Esc - отменить стройку; ловим само нажатие, а не проверяем в цикле: короткое нажатие цикл может пропустить
const onKeyDown = (e) => {
  if (e.code === 'Escape' && placement.value) bus.emit(EVENTS.BUILD_CANCEL)
}

onMounted(() => {
  resizeObserver.observe(svg.value)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('mouseup', onMouseUp)
})
onBeforeUnmount(() => {
  resizeObserver.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped lang="scss">
.game-field {
  display: block;
  width: 100%;
  height: 100%;
  background: #0b0d10;

  &__health, &__objects--placing {
    pointer-events: none;
  }

  &__center {
    fill: #fff;
  }

  &__label {
    fill: #fff;
    font-size: 14px;
    pointer-events: none;
  }

  &__box {
    fill: rgba(113, 212, 160, 0.12);
    stroke: #71d4a0;
    stroke-width: 1;
    pointer-events: none;
  }
}
</style>
