<template>
  <svg
    ref="svg"
    class="game-field"
    @mousedown.left="onLeftClick"
    @pointerdown.right.prevent="onRightClick"
    @contextmenu.prevent
    @wheel.prevent="onWheel"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  >
    <!-- все внутри рисуется в координатах мира, матрица камеры делает из квадратов ромбы -->
    <g :transform="matrix">
      <MapGround :map="map" />
      <!-- здания и персонажи одним списком по глубине: ближние перекрывают дальние -->
      <!-- во время стройки объекты не ловят клики: клик ставит здание, а не выбирает -->
      <g :class="objectsClass">
        <template v-for="item in objects" :key="item.entity.id">
          <MapBuilding v-if="item.building" :building="item.entity" :actions="actions" />
          <MapUnit v-else :unit="item.entity" :actions="actions" />
        </template>
      </g>
      <MapEffects />
      <MapFog />
      <BuildingGhost />
    </g>

    <!-- HP рисуется в экранных координатах, чтобы шкала не искажалась изометрией -->
    <!-- полоска видна у выбранных и раненых, чтобы не загромождать поле -->
    <g v-for="bar in healthBars" :key="bar.id" class="game-field__health" :transform="bar.transform">
      <rect x="-21" y="-3" width="42" height="7" rx="2" class="game-field__health-back" />
      <rect x="-20" y="-2" :width="bar.width" height="5" rx="1" :fill="bar.color" />
    </g>

    <circle :cx="center.x" :cy="center.y" r="4" class="game-field__center" />
    <text v-for="label in labels" :key="label.text" :x="label.x" :y="label.y" class="game-field__label">{{ label.text }}</text>

    <!-- рамка выделения, рисуется в точках экрана -->
    <rect v-if="box" v-bind="box" class="game-field__box" />
  </svg>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import { clamp, screenToWorld } from '@/game/camera'
import { BUILDING_TYPES, canAttack, entityAtPoint, isBuilding, typeOf } from '@/game/entities'
import { isClick, toRect } from '@/game/selection'
import { buildingTop, rectOf } from '@/game/visuals'
import { useGameLoop } from '@/composables/useGameLoop'
import { useKeyboard } from '@/composables/useKeyboard'
import MapGround from './MapGround.vue'
import MapBuilding from './MapBuilding.vue'
import MapUnit from './MapUnit.vue'
import BuildingGhost from './BuildingGhost.vue'
import MapEffects from './MapEffects.vue'
import MapFog from './MapFog.vue'

const EDGE = 16
const PAN_SPEED = 700
const HP_WIDTH = 40 // px, полная полоска здоровья
const UNIT_HEIGHT = 1.4 // высота фигурки персонажа в клетках
const HP_OFFSET = 8 // px над макушкой

const props = defineProps({
  actions: { type: Object, required: true },
})

const store = useStore()
const svg = ref(null)
const mouse = { x: 0, y: 0, inside: false } // не реактивный: нужен только циклу
const { isPressed } = useKeyboard()
const drag = ref(null) // рамка выделения: { from, to, add }, пока зажата ЛКМ

const map = computed(() => store.getters['game/getMap'])
const objects = computed(() => store.getters['game/getObjects'].map((entity) => ({ entity, building: isBuilding(entity) })))
const toScreen = (point) => store.getters['game/toScreen'](point)
const groupColor = (id) => store.getters['game/getGroup'](id)?.color ?? '#999999'
const matrix = computed(() => store.getters['game/getCameraMatrix'])
const placement = computed(() => store.getters['game/getPlacement'])
const objectsClass = computed(() => ({ 'game-field__objects--placing': !!placement.value }))
const center = computed(() => toScreen({ x: 0, y: 0 }))
const labels = computed(() => {
  const { maxX, maxY } = map.value.bounds
  const x = toScreen({ x: maxX, y: 0 })
  const y = toScreen({ x: 0, y: maxY })
  return [
    { text: '(0, 0)', x: center.value.x + 8, y: center.value.y - 6 },
    { text: 'x', x: x.x + 6, y: x.y },
    { text: 'y', x: y.x - 14, y: y.y },
  ]
})
const box = computed(() => drag.value && rectOf(toRect(drag.value.from, drag.value.to)))

// полоска над макушкой: подъем на h в мире - это сдвиг на -h по обеим осям
const healthTop = (entity) => {
  const lift = isBuilding(entity)
    ? BUILDING_TYPES[entity.type].size / 2 + buildingTop(entity, BUILDING_TYPES[entity.type].height)
    : UNIT_HEIGHT
  return toScreen({ x: entity.x - lift, y: entity.y - lift }).y - HP_OFFSET
}
const healthBars = computed(() => store.state.game.entities
  .filter((entity) => entity.hp < typeOf(entity).maxHp || store.getters['game/isSelected'](entity.id))
  .map((entity) => ({
    id: entity.id,
    transform: `translate(${toScreen(entity).x}, ${healthTop(entity)})`,
    width: (HP_WIDTH * entity.hp) / typeOf(entity).maxHp,
    color: groupColor(entity.groupId),
  })))

// координаты события внутри svg
const toLocal = (e) => {
  const rect = svg.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

// ЛКМ: во время стройки - поставить здание (shift - строить дальше), иначе начинаем рамку выделения
const onLeftClick = (e) => {
  if (placement.value) {
    if (!e.ctrlKey) props.actions.placeBuilding({ keep: e.shiftKey }) // ctrl+клик на маке - это правый клик
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

  if (!isClick(toRect(from, to))) props.actions.selectArea({ from, to, add })
  else if (!add) props.actions.select(null)
}

// ПКМ: отмена стройки, атака противника или движение; shift добавляет приказ в очередь
const onRightClick = (e) => {
  if (placement.value) {
    props.actions.cancelPlacement()
    return
  }
  const point = toLocal(e)
  const { camera, viewport, entities } = store.state.game
  const target = entityAtPoint(entities, screenToWorld(camera, viewport, point))
  const selected = store.getters['game/getSelected']
  if (target && selected.some((unit) => canAttack(unit, target))) props.actions.attack({ targetId: target.id, append: e.shiftKey })
  else props.actions.move({ point, append: e.shiftKey })
}

// запоминаем курсор для прокрутки у края; во время стройки двигаем за ним здание-призрак
const onMouseMove = (e) => {
  const point = toLocal(e)
  Object.assign(mouse, point, { inside: true })
  if (placement.value) store.dispatch('game/movePlacement', point)
  if (drag.value) drag.value.to = point
}

const onMouseLeave = () => {
  mouse.inside = false
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
  if (e.code === 'Escape' && placement.value) props.actions.cancelPlacement()
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
  background: #0c1214;

  &__health,
  &__objects--placing {
    pointer-events: none;
  }

  &__health-back {
    fill: #1d2226;
    stroke: #0d1115;
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
