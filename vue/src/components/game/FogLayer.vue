<template>
  <path :d="exploredPath" class="fog-layer" fill="#0b0e1a" fill-opacity="0.45"/>
</template>

<script setup>
import {computed} from 'vue'
import {buildTilesPath, FOG_STATES} from '@/game/fog.js'

const props = defineProps({
  map: {type: Object, required: true},
  tiles: {type: Array, required: true},
})

const exploredPath = computed(() => buildTilesPath(props.map, props.tiles, FOG_STATES.EXPLORED))
</script>

<style scoped lang="scss">
.fog-layer {
  pointer-events: none;
}
</style>
