<template>
  <!-- поле, клетки и оси в координатах мира (рисуется внутри <g> с матрицей камеры) -->
  <clipPath id="map-clip">
    <polygon :points="points" />
  </clipPath>
  <polygon :points="points" class="map-ground" />
  <path :d="grid" class="map-ground__grid" clip-path="url(#map-clip)" />
  <line :x1="map.bounds.minX" y1="0" :x2="map.bounds.maxX" y2="0" class="map-ground__axis map-ground__axis--x" />
  <line x1="0" :y1="map.bounds.minY" x2="0" :y2="map.bounds.maxY" class="map-ground__axis map-ground__axis--y" />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  map: { type: Object, required: true },
})

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const points = computed(() => props.map.outline.map((p) => `${p.x},${p.y}`).join(' '))

// все линии клеток одним path: M - начало линии, V/H - вертикальная/горизонтальная до
const grid = computed(() => {
  const { minX, minY, maxX, maxY } = props.map.bounds
  const xs = range(Math.ceil(minX), Math.floor(maxX)).map((x) => `M${x} ${minY}V${maxY}`)
  const ys = range(Math.ceil(minY), Math.floor(maxY)).map((y) => `M${minX} ${y}H${maxX}`)
  return [...xs, ...ys].join('')
})
</script>

<style scoped lang="scss">
// non-scaling-stroke: толщина линий в пикселях экрана, а не в клетках
.map-ground {
  fill: #5a8a3c;

  &__grid {
    fill: none;
    stroke: rgba(0, 0, 0, 0.15);
    vector-effect: non-scaling-stroke;
  }

  &__axis {
    stroke-width: 2;
    vector-effect: non-scaling-stroke;

    &--x {
      stroke: #e04848;
    }

    &--y {
      stroke: #3a7be0;
    }
  }
}
</style>