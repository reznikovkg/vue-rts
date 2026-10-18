<template>
  <!-- персонаж -->
  <circle
    v-if="isUnit(entity)"
    :cx="entity.x"
    :cy="entity.y"
    :r="type.size / 2"
    :fill="type.color"
    class="map-object"
    :class="{ 'map-object--selected': selected }"
    @mousedown.left.exact.stop="bus.emit(EVENTS.SELECT, entity.id)"
  />
  <!-- здание -->
  <rect
    v-else
    :x="entity.x - type.size / 2"
    :y="entity.y - type.size / 2"
    :width="type.size"
    :height="type.size"
    :fill="type.color"
    class="map-object"
    :class="{ 'map-object--selected': selected }"
    @mousedown.left.exact.stop="bus.emit(EVENTS.SELECT, entity.id)"
  />
  <!-- куда идет выбранный -->
  <rect
    v-if="selected && entity.target"
    :x="entity.target.x - 0.25"
    :y="entity.target.y - 0.25"
    width="0.5"
    height="0.5"
    class="map-object__target"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { isUnit, typeOf } from '@/game/entities'

const props = defineProps({
  entity: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => typeOf(props.entity))
const selected = computed(() => store.getters['game/isSelected'](props.entity.id))
</script>

<style scoped lang="scss">
.map-object {
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
