<template>
  <div v-if="maxHealth" class="building-health">
    <div
      class="building-health__fill"
      :style="{ width: `${percent}%` }"
    />
    <span class="building-health__label">{{ health }} / {{ maxHealth }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  health?: number
  maxHealth?: number
}

const props = defineProps<Props>()

const percent = computed(() => {
  if (!props.maxHealth) return 0
  return Math.max(0, Math.min(100, (props.health ?? 0) / props.maxHealth * 100))
})
</script>

<style scoped lang="scss">
.building-health {
  position: absolute;
  left: 50%;
  top: 62px;
  width: 120px;
  height: 9px;
  border: 1px solid rgba(0, 0, 0, 0.65);
  background: rgba(0, 0, 0, 0.5);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 6;
  overflow: hidden;
}

.building-health__fill {
  height: 100%;
  background: #5bd16b;
}

.building-health__label {
  position: absolute;
  left: 50%;
  top: 10px;
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 10px;
  text-shadow: 0 1px 2px #000;
  transform: translateX(-50%);
  white-space: nowrap;
}
</style>
