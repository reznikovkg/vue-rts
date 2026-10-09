<template>
  <g class="deposit-field">
    <g
        v-for="deposit in deposits"
        :key="deposit.id"
        :opacity="getRichness(deposit)"
        class="deposit-field__deposit"
        @mousedown.right.stop="$emit('command', deposit.id, $event.shiftKey)"
    >
      <rect
          :height="tileSize"
          :width="tileSize"
          :x="deposit.position.x - tileSize / 2"
          :y="deposit.position.y - tileSize / 2"
          fill="#b08d57"
          fill-opacity="0.25"
      />
      <rect
          v-for="(chunk, index) in ORE_CHUNKS"
          :key="index"
          :height="chunk.size"
          :transform="'rotate(' + chunk.angle + ' ' + (deposit.position.x + chunk.x) + ' ' + (deposit.position.y + chunk.y) + ')'"
          :width="chunk.size"
          :x="deposit.position.x + chunk.x - chunk.size / 2"
          :y="deposit.position.y + chunk.y - chunk.size / 2"
          fill="#b08d57"
          stroke="#5f4a2a"
          stroke-width="0.5"
          vector-effect="non-scaling-stroke"
      />
    </g>
  </g>
</template>

<script setup>
import {DEPOSIT_AMOUNT} from '@/game/deposits.js'

const ORE_CHUNKS = [
  {x: -16, y: -12, size: 10, angle: 20},
  {x: 10, y: -18, size: 8, angle: 50},
  {x: 16, y: 8, size: 12, angle: 10},
  {x: -8, y: 14, size: 9, angle: 70},
  {x: 2, y: -2, size: 7, angle: 35},
  {x: -20, y: 6, size: 6, angle: 60},
]
const MIN_RICHNESS_OPACITY = 0.35

defineProps({
  deposits: {type: Array, required: true},
  tileSize: {type: Number, required: true},
})

defineEmits(['command'])

const getRichness = (deposit) => {
  return MIN_RICHNESS_OPACITY + (1 - MIN_RICHNESS_OPACITY) * deposit.amount / DEPOSIT_AMOUNT
}
</script>

<style scoped lang="scss">
.deposit-field__deposit {
  cursor: crosshair;
}
</style>
