<template>
  <!-- здание, которое сейчас ставим: зеленое - место свободно, красное - нельзя -->
  <g v-if="visible" class="building-ghost" :class="stateClass">
    <polygon v-if="hull" :points="hull" />
    <rect v-if="dock" v-bind="dock" class="building-ghost__dock" />
    <rect v-for="(rect, index) in rects" :key="index" v-bind="rect" />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILDING_TYPES, shipPoints, UNIT_TYPES } from '@/game/entities'
import { shipyardDirection, shipyardLayout, toBox } from '@/game/placement'
import { rectOf } from '@/game/visuals'

const store = useStore()
const placement = computed(() => store.getters['game/getPlacement'])
const visible = computed(() => placement.value && placement.value.x !== null)
const stateClass = computed(() => (store.getters['game/isPlacementValid'] ? 'building-ghost--valid' : 'building-ghost--invalid'))
const type = computed(() => visible.value && (BUILDING_TYPES[placement.value.type] ?? UNIT_TYPES[placement.value.type]))

// корабль рисуем корпусом, остальные здания - прямоугольниками
const hull = computed(() => type.value?.ship && shipPoints(placement.value.x, placement.value.y, type.value.size))
const layout = computed(() => {
  if (!visible.value || placement.value.type !== 'shipyard') return null
  const direction = shipyardDirection(store.getters['game/getMap'], placement.value)
  return shipyardLayout({ ...placement.value, direction })
})
const dock = computed(() => layout.value && rectOf(layout.value.dock))
const rects = computed(() => {
  if (!type.value || type.value.ship) return []
  const boxes = layout.value ? layout.value.parts : [toBox(placement.value.x, placement.value.y, type.value.size)]
  return boxes.map(rectOf)
})
</script>

<style scoped lang="scss">
.building-ghost {
  stroke-width: 2;
  stroke-dasharray: 6 4;
  pointer-events: none;

  rect,
  polygon {
    vector-effect: non-scaling-stroke;
  }

  &__dock {
    fill-opacity: 0.3;
  }

  &--valid {
    fill: rgba(113, 212, 160, 0.35);
    stroke: #71d4a0;
  }

  &--invalid {
    fill: rgba(241, 119, 119, 0.35);
    stroke: #f17777;
  }
}
</style>
