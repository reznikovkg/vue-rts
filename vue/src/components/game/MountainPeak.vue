<template>
  <g class="mountain-peak">
    <polygon :points="faces.backLeft" fill="#b4b4b4"/>
    <polygon :points="faces.backRight" fill="#c2c2c2"/>
    <polygon :points="faces.frontLeft" fill="#7a7a7a" stroke="#000" stroke-opacity="0.35"/>
    <polygon :points="faces.frontRight" fill="#9a9a9a" stroke="#000" stroke-opacity="0.35"/>
    <polygon v-if="faces.snowCap !== null" :points="faces.snowCap" fill="#ececec"/>
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {pointsToSvgString, worldToIso} from '@/game/projection.js'

const SNOW_LINE_HEIGHT = 62
const SNOW_CAP_FRACTION = 0.25

const props = defineProps({
  peak: {type: Object, required: true},
})

const moveTowards = (from, to, fraction) => {
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  }
}

const faces = computed(() => {
  const footprint = props.peak.footprint
  const backCorner = worldToIso({x: footprint.minX, y: footprint.minY})
  const rightCorner = worldToIso({x: footprint.maxX, y: footprint.minY})
  const frontCorner = worldToIso({x: footprint.maxX, y: footprint.maxY})
  const leftCorner = worldToIso({x: footprint.minX, y: footprint.maxY})
  const center = worldToIso(props.peak.position)
  const apex = {x: center.x, y: center.y - props.peak.height}

  let snowCap = null
  if (props.peak.height >= SNOW_LINE_HEIGHT) {
    snowCap = pointsToSvgString([
      apex,
      moveTowards(apex, leftCorner, SNOW_CAP_FRACTION),
      moveTowards(apex, frontCorner, SNOW_CAP_FRACTION),
      moveTowards(apex, rightCorner, SNOW_CAP_FRACTION),
    ])
  }

  return {
    backLeft: pointsToSvgString([leftCorner, backCorner, apex]),
    backRight: pointsToSvgString([backCorner, rightCorner, apex]),
    frontLeft: pointsToSvgString([leftCorner, frontCorner, apex]),
    frontRight: pointsToSvgString([frontCorner, rightCorner, apex]),
    snowCap: snowCap,
  }
})
</script>

<style scoped lang="scss">
.mountain-peak {
  pointer-events: none;
}
</style>
