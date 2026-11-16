<template>
  <g
      class="game-destination"
      :transform="`translate(${position.px} ${position.py})`"
  >
    <ellipse class="game-destination__ring" rx="14" ry="7" />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { worldToProjectedPlane } from '../world/coordinates.js'

const props = defineProps({
  wx: {
    type: Number,
    required: true,
  },
  wy: {
    type: Number,
    required: true,
  },
})

const store = useStore()
const camera = computed(() => store.getters['camera/camera'])

const position = computed(() =>
    worldToProjectedPlane(props.wx, props.wy, camera.value),
)
</script>

<style scoped lang="scss">
.game-destination__ring {
  fill: rgba(255, 255, 255, 0.12);
  stroke: #fff;
  stroke-width: 2;
  stroke-dasharray: 5 3;
}
</style>