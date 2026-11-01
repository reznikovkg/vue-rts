<template>
  <g
      class="game-world-object"
      :transform="`translate(${position.px} ${position.py})`"
  >
    <ellipse
        v-if="selected"
        class="game-world-object__selection"
        :rx="ring.rx"
        :ry="ring.ry"
    />
    <circle
        r="8"
        class="game-world-object__marker"
    />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { worldToProjectedPlane } from '../world/coordinates.js'
import {ISO_TILE_HEIGHT, ISO_TILE_WIDTH, WORLD_GRID_SIZE} from "@/game/world/worldUnits.js";

const props = defineProps({
  wx: {
    type: Number,
    required: true,
  },
  wy: {
    type: Number,
    required: true,
  },
  radius: {
    type: Number,
    default: 16,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const store = useStore()
const camera = computed(() => store.getters['camera/camera'])

const position = computed(() =>
  worldToProjectedPlane(props.wx, props.wy, camera.value),
)
const ring = computed(() => {
  const k = (props.radius * Math.SQRT2) / WORLD_GRID_SIZE
  return {rx: k * (ISO_TILE_WIDTH / 2), ry: k * (ISO_TILE_HEIGHT / 2)}
})
</script>

<style scoped lang="scss">
.game-world-object__selection {
  fill: rgba(120, 255, 120, 0.2);
  stroke: #7dff7d;
  stroke-width: 1px;
}
.game-world-object__marker {
  fill: #c9a227;
  stroke: #1a1208;
  stroke-width: 2;
}
</style>
