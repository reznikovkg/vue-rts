<template>
  <!-- туман: полупрозрачные клочья медленно плывут поверх карты, на игру не влияют -->
  <g class="map-fog">
    <defs>
      <radialGradient id="fog">
        <stop offset="0" stop-color="#dfe8ec" stop-opacity="0.38" />
        <stop offset="0.5" stop-color="#dfe8ec" stop-opacity="0.18" />
        <stop offset="1" stop-color="#dfe8ec" stop-opacity="0" />
      </radialGradient>
    </defs>
    <g v-for="(patch, index) in patches" :key="index" :transform="patch.transform">
      <ellipse :rx="patch.rx" :ry="patch.ry" fill="url(#fog)">
        <animateTransform attributeName="transform" type="translate" :values="patch.drift" :dur="patch.dur" repeatCount="indefinite" />
      </ellipse>
    </g>
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { fogPatches } from '@/game/visuals'

const store = useStore()
const patches = computed(() => fogPatches(store.getters['game/getMap'].bounds))
</script>

<style scoped lang="scss">
.map-fog {
  pointer-events: none;
}
</style>
