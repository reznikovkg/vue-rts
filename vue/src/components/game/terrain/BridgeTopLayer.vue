<template>
  <svg
    class="bridge-top-layer"
    :width="MAP_SIZE"
    :height="MAP_SIZE"
    :viewBox="`0 0 ${MAP_SIZE} ${MAP_SIZE}`"
    overflow="hidden"
  >
    <g class="bridge-top-layer__deck">
      <!-- Дорожное полотно -->
      <path
        d="M 550 550 L 795 548"
        stroke="#b5aa91"
        stroke-width="34"
        stroke-linecap="butt"
      />

      <!-- Каменная кладка -->
      <path
        d="M 550 550 L 795 548"
        stroke="#8f8878"
        stroke-width="2"
        stroke-dasharray="12 9"
        fill="none"
      />
    </g>
  </svg>
</template>

<script setup>
import { MAP_SIZE } from '@/config/game';
</script>

<style scoped lang="scss">
.bridge-top-layer {
  position: absolute;
  left: -720px;
  top: -720px;
  pointer-events: none;
  overflow: hidden;
}
</style>