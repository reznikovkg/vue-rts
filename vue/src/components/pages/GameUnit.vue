<template>
  <g v-if="unit.selected && queuePoints.length" class="queue" pointer-events="none">
    <polyline :points="queueLine" fill="none" stroke="#ffe08a" stroke-width="1.5" stroke-dasharray="6 4" />
    <g v-for="(point, index) in queuePoints" :key="index" :transform="`translate(${point.x} ${point.y})`">
      <ellipse rx="9" ry="5" fill="#243421" stroke="#ffe08a" stroke-width="1.5" />
      <text y="3.5" text-anchor="middle" fill="#ffe08a" font-size="10">{{ index + 1 }}</text>
    </g>
  </g>
  <ellipse
      v-if="moveEvent"
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
      @click.stop="emit('select', $event.shiftKey)"
      @contextmenu.stop.prevent="emit('target', $event.shiftKey)"
      @keydown.enter.stop.prevent="emit('select', $event.shiftKey)"
      @keydown.space.stop.prevent="emit('select', $event.shiftKey)"
  >
    <ellipse v-if="unit.selected" rx="18" ry="9" fill="none" stroke="#ffe08a" stroke-width="2" />
    <circle
        cy="-10"
        :r="UNIT_RADIUS - 1"
        :fill="groupColor(unit.group)"
        :stroke="unit.terrain === 'water' ? '#d8f4ff' : '#493618'"
        :stroke-dasharray="unit.terrain === 'water' ? '4 2' : undefined"
        stroke-width="2"
    />
    <g v-if="unit.health < unit.maxHealth" pointer-events="none">
      <rect x="-12" y="-29" width="24" height="4" fill="#303b31" />
      <rect x="-12" y="-29" :width="24 * unit.health / unit.maxHealth" height="4" fill="#e65a50" />
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Unit, MoveEvent } from '@/game/Unit'
import { UNIT_RADIUS } from '@/game/occupancy'
import { worldToScreen } from '@/game/map'
import { groupColor } from '@/game/groups'

const props = defineProps<{ unit: Unit; moveEvent?: MoveEvent; queue?: MoveEvent[] }>()
const emit = defineEmits<{ select: [additive: boolean]; target: [queue: boolean] }>()

const unitScreen = computed(() => worldToScreen(props.unit.x, props.unit.y))
const targetScreen = computed(() => worldToScreen(
  props.moveEvent?.x ?? props.unit.x,
  props.moveEvent?.y ?? props.unit.y,
))
const queuePoints = computed(() => (props.queue ?? []).map(move => worldToScreen(move.x, move.y)))
const queueLine = computed(() => [targetScreen.value, ...queuePoints.value]
  .map(point => `${point.x},${point.y}`).join(' '))
</script>

<style scoped lang="scss">
.unit {
  cursor: pointer;

  &:focus:not(:focus-visible) {
    outline: none;
  }
}
</style>
