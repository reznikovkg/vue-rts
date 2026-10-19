<template>
  <div
    class="unit"
    :class="{ selected }"
    :style="unitStyle"
    @click.stop="$emit('select')"
  >
    <div class="unit-shadow" />

    <div class="unit-body">
      <div class="unit-head" />
      <div class="unit-body-shape" />
    </div>

    <div v-if="selected" class="selection-circle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  x: number
  y: number
  selected: boolean
}

const props = defineProps<Props>()

defineEmits<{
  select: []
}>()

const unitStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
}))
</script>

<style scoped lang="scss">
.unit {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 50px;
  transform: translate(-50%, -75%);
  cursor: pointer;
  z-index: 10;
}

.unit-shadow {
  position: absolute;
  left: 50%;
  bottom: 1px;
  width: 28px;
  height: 12px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  transform: translateX(-50%);
}

.unit-body {
  position: absolute;
  left: 50%;
  bottom: 5px;
  width: 24px;
  height: 36px;
  transform: translateX(-50%);
}

.unit-head {
  position: absolute;
  left: 50%;
  top: 0;
  width: 14px;
  height: 14px;
  border: 1px solid #8b6548;
  border-radius: 50%;
  background: #d6a77a;
  transform: translateX(-50%);
}

.unit-body-shape {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 22px;
  height: 25px;
  border: 1px solid #304b9c;
  border-radius: 8px 8px 4px 4px;
  background: #4f7cff;
  transform: translateX(-50%);
}

.selection-circle {
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 36px;
  height: 16px;
  border: 2px solid #72ff72;
  border-radius: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}
</style>