<template>
  <!-- персонаж - круг, корабль - корпус, вписанный в круг столкновений -->
  <g
    class="map-unit"
    :class="{ 'map-unit--selected': selected }"
    @mousedown.left.exact.stop="bus.emit(EVENTS.SELECT, unit.id)"
    @mousedown.left.shift.exact.stop="bus.emit(EVENTS.SELECT_TOGGLE, unit.id)"
  >
    <polygon v-if="type.ship" :points="shipPoints(unit.x, unit.y, type.size)" :fill="type.color" />
    <circle v-else :cx="unit.x" :cy="unit.y" :r="type.size / 2" :fill="type.color" />
  </g>

  <!-- куда идет выбранный: путь в обход зданий пунктиром и квадрат в конце -->
  <polyline v-if="selected && finish" :points="route" class="map-unit__route" />
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

const props = defineProps({
  unit: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => UNIT_TYPES[props.unit.type])
const selected = computed(() => store.getters['game/isSelected'](props.unit.id))
const finish = computed(() => props.unit.path[props.unit.path.length - 1] ?? props.unit.target)
const route = computed(() => [props.unit, props.unit.target, ...props.unit.path].map((p) => `${p.x},${p.y}`).join(' '))
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

  &__target {
    fill: none;
    stroke: #fff;
    stroke-dasharray: 3 2;
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }
}
</style>
