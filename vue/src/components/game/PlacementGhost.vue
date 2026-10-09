<template>
  <rect
      :fill="isValid ? '#000' : '#a35b5b'"
      :height="area.maxY - area.minY"
      :width="area.maxX - area.minX"
      :x="area.minX"
      :y="area.minY"
      class="placement-ghost"
      fill-opacity="0.25"
      stroke="#000"
      vector-effect="non-scaling-stroke"
      stroke-dasharray="8 8"
  />
</template>

<script setup>
defineProps({
  area: {type: Object, required: true},
  isValid: {type: Boolean, required: true},
})
</script>

<style scoped lang="scss">
.placement-ghost {
  pointer-events: none;
}
</style>
