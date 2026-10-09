<template>
  <defs v-if="fogTiles !== null">
    <clipPath id="explored-area">
      <path :d="exploredAreaPath"/>
    </clipPath>
  </defs>
  <g :clip-path="fogTiles !== null ? 'url(#explored-area)' : null">
    <rect
        v-for="(run, index) in terrainRuns"
        :key="index"
        :fill="TERRAIN_COLORS[run.terrain]"
        :height="run.height"
        :width="run.width"
        :x="run.x"
        :y="run.y"
    />
    <path :d="gridPath" fill="none" stroke="#000" stroke-opacity="0.12" stroke-width="0.5" vector-effect="non-scaling-stroke"/>
    <rect
        :height="height"
        :width="width"
        :x="map.bounds.minX"
        :y="map.bounds.minY"
        fill="none"
        stroke="#404040"
        vector-effect="non-scaling-stroke"
    />
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {buildExploredAreaPath} from '@/game/fog.js'
import {getTerrainRuns, TERRAIN_TYPES} from '@/game/map.js'

const TERRAIN_COLORS = {
  [TERRAIN_TYPES.LAND]: '#d8d8d8',
  [TERRAIN_TYPES.WATER]: '#9fa8ae',
  [TERRAIN_TYPES.MOUNTAIN]: '#8f8f8f',
}

const props = defineProps({
  map: {type: Object, required: true},
  fogTiles: {type: Array, default: null},
})

const terrainRuns = computed(() => getTerrainRuns(props.map))
const exploredAreaPath = computed(() => {
  if (props.fogTiles === null) {
    return ''
  }
  return buildExploredAreaPath(props.map, props.fogTiles)
})
const width = computed(() => props.map.bounds.maxX - props.map.bounds.minX)
const height = computed(() => props.map.bounds.maxY - props.map.bounds.minY)

const gridPath = computed(() => {
  const bounds = props.map.bounds
  const tileSize = props.map.tileSize
  let path = ''

  for (let column = 1; column < props.map.columns; column++) {
    const x = bounds.minX + column * tileSize
    path += 'M ' + x + ' ' + bounds.minY + ' L ' + x + ' ' + bounds.maxY + ' '
  }
  for (let row = 1; row < props.map.rows; row++) {
    const y = bounds.minY + row * tileSize
    path += 'M ' + bounds.minX + ' ' + y + ' L ' + bounds.maxX + ' ' + y + ' '
  }
  return path
})
</script>
