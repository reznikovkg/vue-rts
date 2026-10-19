<template>
  <g>
    <ellipse
        v-if="target"
        :cx="target.x"
        :cy="target.y"
        rx="7"
        ry="4"
        fill="none"
        stroke="#ffe08a"
        stroke-width="2"
        pointer-events="none"
    />
    <g
        class="game-unit"
        :transform="`translate(${position.x} ${position.y})`"
        role="button"
        :aria-label="unit.type.name"
        :aria-pressed="selected"
        tabindex="0"
        @click.stop="emit('select')"
        @keydown.enter.stop.prevent="emit('select')"
        @keydown.space.stop.prevent="emit('select')"
    >
      <ellipse
          v-if="selected"
          :rx="unit.type.radius * 1.8"
          :ry="unit.type.radius * 0.9"
          fill="none"
          stroke="#ffe08a"
          stroke-width="2"
      />
      <circle
          :cy="-unit.type.radius"
          :r="unit.type.radius"
          :fill="unit.type.color"
          stroke="#493618"
          stroke-width="2"
      />
    </g>
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { worldToScreen } from '@/game/map.js'

const props = defineProps({
  unit: { type: Object, required: true },
  gridSize: { type: Number, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const position = computed(() => worldToScreen(props.unit.x, props.unit.y, props.gridSize))
const target = computed(() => props.unit.target && worldToScreen(props.unit.target.x, props.unit.target.y, props.gridSize))
</script>

<style scoped lang="scss">
.game-unit {
  cursor: pointer;

  &:focus:not(:focus-visible) {
    outline: none;
  }
}
</style>
