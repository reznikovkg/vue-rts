<template>
  <div
    class="unit"
    :class="{ selected }"
    :style="unitStyle"
    :data-unit-id="unitId"
    @click.stop="$emit('select', $event)"
  >
    <div class="unit-shadow" />

    <div class="unit-body">
      <div class="unit-head" />
      <div class="unit-body-shape" />
    </div>

    <UnitHealthBar :health="health" :max-health="maxHealth" />

    <div v-if="selected" class="selection-circle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UnitHealthBar from './UnitHealthBar.vue'

interface Props {
  unitId: number
  x: number
  y: number
  selected: boolean
  color?: string
  health?: number
  maxHealth?: number
}

const props = withDefaults(defineProps<Props>(), {
  color: '#4f7cff',
  health: undefined,
  maxHealth: undefined,
})

defineEmits<{
  select: [event: MouseEvent]
}>()

const unitStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  '--unit-color': props.color,
}))
</script>

<style scoped lang="scss">
@use '@/assets/styles/tokens' as tokens;

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
  border: 1px solid rgba(0, 0, 0, 0.35);
  border-radius: 8px 8px 4px 4px;
  background: var(--unit-color, #4f7cff);
  transform: translateX(-50%);
}

.selection-circle {
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 36px;
  height: 16px;
  border: 2px solid tokens.$color-selection;
  border-radius: 50%;
  transform: translateX(-50%);
  pointer-events: none;
}
</style>
