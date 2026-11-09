<template>
  <!-- здание, которое сейчас ставим: зеленое - место свободно, красное - нельзя -->
  <g
    v-if="placement && placement.x !== null"
    class="building-ghost"
    :class="valid ? 'building-ghost--valid' : 'building-ghost--invalid'"
  >
    <polygon v-if="type.ship" :points="shipPoints(placement.x, placement.y, size)" />
    <template v-else-if="layout">
      <rect
        :x="layout.dock.minX" :y="layout.dock.minY"
        :width="layout.dock.maxX - layout.dock.minX" :height="layout.dock.maxY - layout.dock.minY"
        class="building-ghost__dock"
      />
      <rect
        v-for="(part, index) in layout.parts" :key="index"
        :x="part.minX" :y="part.minY" :width="part.maxX - part.minX" :height="part.maxY - part.minY"
      />
    </template>
    <rect v-else :x="placement.x - size / 2" :y="placement.y - size / 2" :width="size" :height="size" />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILDING_TYPES, shipPoints, UNIT_TYPES } from '@/game/entities'
import { shipyardDirection, shipyardLayout } from '@/game/placement'

const store = useStore()
const placement = computed(() => store.getters['game/getPlacement'])
const valid = computed(() => store.getters['game/isPlacementValid'])
const type = computed(() => placement.value ? BUILDING_TYPES[placement.value.type] ?? UNIT_TYPES[placement.value.type] : null)
const size = computed(() => type.value?.size ?? 0)
const layout = computed(() => {
  if (placement.value?.type !== 'shipyard' || placement.value.x === null) return null
  const direction = shipyardDirection(store.getters['game/getMap'], placement.value)
  return shipyardLayout({ ...placement.value, direction })
})
</script>

<style scoped lang="scss">
.building-ghost {
  stroke-width: 2;
  stroke-dasharray: 6 4;
  vector-effect: non-scaling-stroke;
  pointer-events: none;

  & > rect, & > polygon {
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
