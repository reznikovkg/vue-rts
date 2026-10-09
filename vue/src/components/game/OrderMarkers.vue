<template>
  <g class="order-markers">
    <g v-for="route in routes" :key="route.unitId">
      <polyline
          v-if="route.points.length > 1"
          :points="pointsToSvgString(route.points)"
          fill="none"
          stroke="#000"
          vector-effect="non-scaling-stroke"
          stroke-dasharray="8 8"
          stroke-opacity="0.4"
      />
      <template v-for="(point, index) in route.points" :key="index">
        <circle v-if="index > 0" :cx="point.x" :cy="point.y" fill="none" r="10" stroke="#000" vector-effect="non-scaling-stroke"/>
      </template>
    </g>
  </g>
</template>

<script setup>
import {pointsToSvgString} from '@/game/projection.js'

defineProps({
  routes: {type: Array, required: true},
})
</script>

<style scoped lang="scss">
.order-markers {
  pointer-events: none;
}
</style>
