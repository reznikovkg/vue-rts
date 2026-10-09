<template>
  <g class="map-plinth">
    <path :d="sides.left" fill="#6e6e6e" stroke="#404040" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <path :d="sides.right" fill="#8a8a8a" stroke="#404040" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {isTileExploredIn} from '@/game/fog.js'
import {tileToWorld} from '@/game/map.js'
import {worldToIso} from '@/game/projection.js'

const PLINTH_THICKNESS = 48

const props = defineProps({
  map: {type: Object, required: true},
  fogTiles: {type: Array, default: null},
})

const getFacePath = (from, to) => {
  const start = worldToIso(from)
  const end = worldToIso(to)
  return 'M ' + start.x + ' ' + start.y
      + ' L ' + end.x + ' ' + end.y
      + ' L ' + end.x + ' ' + (end.y + PLINTH_THICKNESS)
      + ' L ' + start.x + ' ' + (start.y + PLINTH_THICKNESS) + ' Z '
}

const isExplored = (column, row) => {
  return isTileExploredIn(props.map, props.fogTiles, {column: column, row: row})
}

const hasLeftFace = (column, row) => {
  return isExplored(column, row) && !isExplored(column, row + 1)
}

const hasRightFace = (column, row) => {
  return isExplored(column, row) && !isExplored(column + 1, row)
}

const buildLeftFaces = () => {
  let path = ''
  for (let row = 0; row < props.map.rows; row++) {
    let runStartColumn = null
    for (let column = 0; column <= props.map.columns; column++) {
      const hasFace = column < props.map.columns && hasLeftFace(column, row)
      if (hasFace && runStartColumn === null) {
        runStartColumn = column
      }
      if (!hasFace && runStartColumn !== null) {
        const start = tileToWorld(props.map, {column: runStartColumn, row: row + 1})
        const end = tileToWorld(props.map, {column: column, row: row + 1})
        path += getFacePath(start, end)
        runStartColumn = null
      }
    }
  }
  return path
}

const buildRightFaces = () => {
  let path = ''
  for (let column = 0; column < props.map.columns; column++) {
    let runStartRow = null
    for (let row = 0; row <= props.map.rows; row++) {
      const hasFace = row < props.map.rows && hasRightFace(column, row)
      if (hasFace && runStartRow === null) {
        runStartRow = row
      }
      if (!hasFace && runStartRow !== null) {
        const start = tileToWorld(props.map, {column: column + 1, row: row})
        const end = tileToWorld(props.map, {column: column + 1, row: runStartRow})
        path += getFacePath(start, end)
        runStartRow = null
      }
    }
  }
  return path
}

const sides = computed(() => {
  return {left: buildLeftFaces(), right: buildRightFaces()}
})
</script>

<style scoped lang="scss">
.map-plinth {
  pointer-events: none;
}
</style>
