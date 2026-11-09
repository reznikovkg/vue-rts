<template>
  <!-- маршрут и будущие точки видны только у выбранного персонажа -->
  <polyline
    v-if="selected && routePoints.length"
    :points="[{ x: unit.x, y: unit.y }, ...routePoints].map((point) => `${point.x},${point.y}`).join(' ')"
    class="map-unit__route"
  />
  <circle
    v-for="(point, index) in selected ? routePoints.slice(1) : []"
    :key="index"
    :cx="point.x"
    :cy="point.y"
    r="0.23"
    class="map-unit__waypoint"
  />

  <!-- красный пунктир — активный приказ атаки -->
  <line
    v-if="selected && attackTarget"
    :x1="unit.x"
    :y1="unit.y"
    :x2="attackTarget.x"
    :y2="attackTarget.y"
    class="map-unit__attack-line"
  />

  <!-- персонаж - круг, корабль - корпус, вписанный в круг столкновений -->
  <g
    class="map-unit"
    :class="{ 'map-unit--selected': selected }"
    @mousedown.left.exact.stop="bus.emit(EVENTS.SELECT, unit.id)"
    @mousedown.left.shift.exact.stop="bus.emit(EVENTS.SELECT_TOGGLE, unit.id)"
  >
    <polygon v-if="type.ship" :points="shipPoints(unit.x, unit.y, type.size)" :fill="colorOf(group, unit)" />
    <circle v-else :cx="unit.x" :cy="unit.y" :r="type.size / 2" :fill="colorOf(group, unit)" />
  </g>

  <!-- куда идет выбранный: путь в обход зданий пунктиром и квадрат в конце -->
  <rect
    v-if="selected && finish"
    :x="finish.x - 0.25"
    :y="finish.y - 0.25"
    width="0.5"
    height="0.5"
    class="map-unit__target"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { shipPoints, UNIT_TYPES } from '@/game/entities'
import { colorOf } from '@/game/groups'

const props = defineProps({
  unit: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => UNIT_TYPES[props.unit.type])
const group = computed(() => store.getters['game/getGroup'](props.unit.groupId))
const selected = computed(() => store.getters['game/isSelected'](props.unit.id))
const orders = computed(() => store.getters['game/getUnitEvents'](props.unit.id))
const attackTarget = computed(() => store.state.game.entities.find((entity) => entity.id === orders.value[0]?.targetId))
const finish = computed(() => orders.value[0]?.type === 'move' ? orders.value[0].target : null)
const routePoints = computed(() => {
  const active = props.unit.activeEventId === orders.value[0]?.id
  const path = active && props.unit.target ? [props.unit.target, ...props.unit.path] : []
  const queued = orders.value.slice(path.length ? 1 : 0, 8)
    .map((order) => order.type === 'move' ? order.target : store.state.game.entities.find((entity) => entity.id === order.targetId))
    .filter(Boolean)
  return [...path, ...queued]
})
</script>

<style scoped lang="scss">
.map-unit {
  stroke: rgba(0, 0, 0, 0.6);
  vector-effect: non-scaling-stroke;
  cursor: pointer;

  & > circle, & > polygon {
    vector-effect: non-scaling-stroke;
  }

  &--selected {
    stroke: #fff;
    stroke-width: 2;
  }

  &__route {
    fill: none;
    stroke: rgba(255, 255, 255, 0.6);
    stroke-dasharray: 4 3;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }

  &__waypoint {
    fill: rgba(17, 22, 27, 0.75);
    stroke: #fff;
    stroke-width: 2;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }

  &__attack-line {
    stroke: #f17777;
    stroke-width: 2;
    stroke-dasharray: 5 4;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }

  &__target {
    fill: none;
    stroke: #fff;
    stroke-dasharray: 3 2;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }
}
</style>
