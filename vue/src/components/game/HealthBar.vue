<template>
  <g class="health-bar" :transform="'translate(' + -width / 2 + ' ' + -height + ')'">
    <rect :width="width" fill="#fff" height="4" stroke="#000" stroke-width="0.5"/>
    <rect :fill="color" :width="width * health / maxHealth" height="4"/>
  </g>
</template>

<script setup>
defineProps({
  health: {type: Number, required: true},
  maxHealth: {type: Number, required: true},
  width: {type: Number, required: true},
  height: {type: Number, required: true},
  color: {type: String, required: true},
})
</script>

<style scoped lang="scss">
.health-bar {
  pointer-events: none;
}
</style>
