<template>
  <defs>
    <pattern id="map-grid" :height="map.tileSize" :width="map.tileSize" patternUnits="userSpaceOnUse">
      <path :d="gridCellPath" fill="none" stroke="#b0b0b0"/>
    </pattern>
  </defs>
  <rect
      :height="height"
      :width="width"
      :x="map.bounds.minX"
      :y="map.bounds.minY"
      fill="#d8d8d8"
  />
  <rect
      :height="height"
      :width="width"
      :x="map.bounds.minX"
      :y="map.bounds.minY"
      fill="url(#map-grid)"
      stroke="#404040"
  />
</template>

<script setup>
import {computed} from 'vue'

const props = defineProps({
  map: {type: Object, required: true},
})

const width = computed(() => props.map.bounds.maxX - props.map.bounds.minX)
const height = computed(() => props.map.bounds.maxY - props.map.bounds.minY)
const gridCellPath = computed(() => 'M ' + props.map.tileSize + ' 0 L 0 0 0 ' + props.map.tileSize)
</script>
