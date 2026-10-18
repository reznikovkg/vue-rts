<template>
  <ellipse
      v-if="unit.x !== unit.targetX || unit.y !== unit.targetY"
      :cx="targetScreen.x"
      :cy="targetScreen.y"
      rx="7"
      ry="4"
      fill="none"
      stroke="#ffe08a"
      stroke-width="2"
      pointer-events="none"
  />
  <g
      class="unit"
      :transform="`translate(${unitScreen.x} ${unitScreen.y})`"
      role="button"
      aria-label="Персонаж"
      :aria-pressed="unit.selected"
      tabindex="0"
      @click.stop="emit('select')"
      @keydown.enter.stop.prevent="emit('select')"
      @keydown.space.stop.prevent="emit('select')"
  >
    <ellipse v-if="unit.selected" rx="18" ry="9" fill="none" stroke="#ffe08a" stroke-width="2" />
    <circle cy="-10" r="10" fill="#ffd376" stroke="#493618" stroke-width="2" />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Unit } from '@/game/Unit'
import { worldToScreen } from '@/game/map'

const props = defineProps<{ unit: Unit }>()
const emit = defineEmits<{ select: [] }>()

const unitScreen = computed(() => worldToScreen(props.unit.x, props.unit.y))
const targetScreen = computed(() => worldToScreen(props.unit.targetX, props.unit.targetY))
</script>

<style scoped lang="scss">
.unit {
  cursor: pointer;

  &:focus:not(:focus-visible) {
    outline: none;
  }
}
</style>
