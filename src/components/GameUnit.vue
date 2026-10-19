<template>
  <line
      v-if="unit.x !== unit.targetX || unit.y !== unit.targetY"
      :x1="unitScreen.x" :y1="unitScreen.y"
      :x2="targetScreen.x" :y2="targetScreen.y"
      stroke="rgba(110,231,255,0.5)"
      stroke-dasharray="4 4"
      pointer-events="none"
  />
  <g
      class="unit"
      :transform="`translate(${unitScreen.x} ${unitScreen.y})`"
      @click.stop="emit('select', $event)"
  >
    <ellipse v-if="unit.selected" rx="14" ry="7" fill="none" stroke="#6ee7ff" stroke-width="2" />
    <circle r="6" :fill="unit.color" stroke="#000" stroke-width="1.5" />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Unit } from '@/game/Unit'
import { worldToScreen } from '@/game/map'

const props = defineProps<{ unit: Unit }>()
const emit = defineEmits<{ select: [event: MouseEvent] }>()

const unitScreen = computed(() => worldToScreen(props.unit.x, props.unit.y))
const targetScreen = computed(() => worldToScreen(props.unit.targetX, props.unit.targetY))
</script>

<style scoped lang="scss">
.unit {
  cursor: pointer;
  transition: transform 0.05s linear;
}
</style>