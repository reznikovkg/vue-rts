<template>
  <div
    v-if="box"
    class="selection-box"
    :style="box"
  />
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

const box = computed(() => {
  if (!props.start || !props.current) return null

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
  border: 1px solid rgba(255, 255, 255, 0.98);
  background:
    repeating-linear-gradient(
      45deg,
      rgba(79, 124, 255, 0.2),
      rgba(79, 124, 255, 0.2) 6px,
      rgba(79, 124, 255, 0.1) 6px,
      rgba(79, 124, 255, 0.1) 12px
    );
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25) inset;
  pointer-events: none;
  z-index: 2000;
}
</style>
