<template>
  <div
    class="game-object"
    :class="[{ selected: object.selected }, `type-${object.type}`]"
    :style="style"
    @click.stop="onClick"
  >
    <div class="unit-body"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  object: { type: Object, required: true }
})
const emit = defineEmits(['select'])

const style = computed(() => ({
  left: `${props.object.x}px`,
  top: `${props.object.y}px`
}))

function onClick() {
  emit('select', props.object.id)
}
</script>

<style lang="scss" scoped>
.game-object {
  position: absolute;
  width: 32px;
  height: 32px;
  margin-left: -16px;
  margin-top: -16px;
  cursor: pointer;
  pointer-events: auto;

  &.selected { outline: 2px solid #ffd700; outline-offset: 2px; }
  &.type-building .unit-body {
    border-radius: 4px;
    background: radial-gradient(circle at 30% 30%, #c8a06a, #7a5a2b);
  }
}

.unit-body {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #6cf, #2a6fdb);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}
</style>