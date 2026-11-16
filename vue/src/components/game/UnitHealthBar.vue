<template>
  <div v-if="maxHealth" class="unit-health">
    <div
      class="unit-health__fill"
      :class="healthClass"
      :style="{ width: `${percent}%` }"
    />
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

const healthClass = computed(() => {
  if (percent.value <= 25) return 'unit-health__fill--low'
  if (percent.value <= 60) return 'unit-health__fill--medium'
  return 'unit-health__fill--high'
})
</script>

<style scoped lang="scss">
.unit-health {
  position: absolute;
  left: 50%;
  top: -9px;
  width: 32px;
  height: 5px;
  border: 1px solid rgba(0, 0, 0, 0.65);
  background: rgba(0, 0, 0, 0.5);
  transform: translateX(-50%);
  pointer-events: none;
  overflow: hidden;
}

.unit-health__fill {
  height: 100%;
  transition: width 0.12s linear;

  &--high {
    background: #5bd16b;
  }

  &--medium {
    background: #e0b23c;
  }

  &--low {
    background: #d6534c;
  }
}
</style>
