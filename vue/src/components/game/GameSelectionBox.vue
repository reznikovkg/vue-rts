<template>
  <div class="selection-box" :style="boxStyle" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Position {
  x: number
  y: number
}

interface Props {
  start: Position | null
  current: Position | null
}

const props = defineProps<Props>()

const boxStyle = computed(() => {
  if (!props.start || !props.current) return {}

  return {
    left: `${Math.min(props.start.x, props.current.x)}px`,
    top: `${Math.min(props.start.y, props.current.y)}px`,
    width: `${Math.abs(props.current.x - props.start.x)}px`,
    height: `${Math.abs(props.current.y - props.start.y)}px`,
  }
})
</script>

<style scoped lang="scss">
.selection-box {
  position: absolute;
  border: 1px solid #8fffa1;
  background: rgba(100, 255, 130, 0.16);
  z-index: 2000;
  pointer-events: none;
}
</style>
