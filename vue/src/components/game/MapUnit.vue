<template>
  <!-- персонаж - круг, на экране овал на земле -->
  <circle
    :cx="unit.x"
    :cy="unit.y"
    :r="type.size / 2"
    :fill="type.color"
    class="map-unit"
    :class="{ 'map-unit--selected': selected }"
    @mousedown.left.exact.stop="bus.emit(EVENTS.SELECT, unit.id)"
  />

  <!-- куда идет выбранный -->
  <rect
    v-if="selected && unit.target"
    :x="unit.target.x - 0.25"
    :y="unit.target.y - 0.25"
    width="0.5"
    height="0.5"
    class="map-unit__target"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { UNIT_TYPES } from '@/game/entities'

const props = defineProps({
  unit: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => UNIT_TYPES[props.unit.type])
const selected = computed(() => store.getters['game/isSelected'](props.unit.id))
</script>

<style scoped lang="scss">
.map-unit {
  stroke: rgba(0, 0, 0, 0.6);
  vector-effect: non-scaling-stroke;
  cursor: pointer;

  &--selected {
    stroke: #fff;
    stroke-width: 2;
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
