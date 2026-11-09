<template>
  <g
      class="building"
      role="button"
      aria-label="Здание"
      :aria-pressed="selected"
      tabindex="0"
      @click.stop="emit('select')"
      @contextmenu.stop.prevent="emit('target', $event.shiftKey)"
      @keydown.enter.stop.prevent="emit('select')"
      @keydown.space.stop.prevent="emit('select')"
  >
    <polygon
        :points="points"
        :fill="groupColor(object.group)"
        fill-opacity="0.6"
        :stroke="selected ? '#ffe08a' : '#303b31'"
        stroke-width="2"
    />
    <text pointer-events="none" :x="top.x" :y="top.y - 8" text-anchor="middle" fill="#fff" font-size="11">
      {{ object.health }}/{{ object.maxHealth }} HP
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { objectCorners, type MapObject } from '@/game/occupancy'
import { groupColor } from '@/game/groups'

const props = defineProps<{ object: MapObject; selected?: boolean }>()
const emit = defineEmits<{ select: []; target: [queue: boolean] }>()
const corners = computed(() => objectCorners(props.object))
const points = computed(() => corners.value.map(point => `${point.x},${point.y}`).join(' '))
const top = computed(() => corners.value[0])
</script>

<style scoped lang="scss">
.building {
  cursor: pointer;

  &:focus:not(:focus-visible) {
    outline: none;
  }
}
</style>
