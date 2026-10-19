<template>
  <g
      class="game-building"
      role="button"
      :aria-label="building.type.name"
      :aria-pressed="selected"
      tabindex="0"
      @click.stop="emit('select')"
      @keydown.enter.stop.prevent="emit('select')"
      @keydown.space.stop.prevent="emit('select')"
  >
    <polygon :points="faces.left" :fill="building.type.color" :stroke="stroke" :stroke-width="selected ? 2 : 1" style="filter: brightness(0.8)" />
    <polygon :points="faces.right" :fill="building.type.color" :stroke="stroke" :stroke-width="selected ? 2 : 1" style="filter: brightness(0.65)" />
    <polygon :points="faces.roof" :fill="building.type.color" :stroke="stroke" :stroke-width="selected ? 2 : 1" />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { worldToScreen } from '@/game/map.js'

const props = defineProps({
  building: { type: Object, required: true },
  gridSize: { type: Number, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const stroke = computed(() => props.selected ? '#ffe08a' : '#3b2a17')

// Квадратное основание в мире → ромб на экране; стены поднимаем на высоту здания.
// На экране: north — верхний угол ромба, east — правый, south — нижний, west — левый.
const faces = computed(() => {
  const { x, y, type } = props.building
  const half = type.size / 2
  const corner = (dx, dy) => worldToScreen(x + dx, y + dy, props.gridSize)
  const north = corner(-half, -half)
  const east = corner(half, -half)
  const south = corner(half, half)
  const west = corner(-half, half)
  const up = (point) => ({ x: point.x, y: point.y - type.height })
  const toPoints = (points) => points.map(point => `${point.x},${point.y}`).join(' ')

  return {
    left: toPoints([west, south, up(south), up(west)]),
    right: toPoints([south, east, up(east), up(south)]),
    roof: toPoints([up(north), up(east), up(south), up(west)]),
  }
})
</script>

<style scoped lang="scss">
.game-building {
  cursor: pointer;

  &:focus:not(:focus-visible) {
    outline: none;
  }
}
</style>
