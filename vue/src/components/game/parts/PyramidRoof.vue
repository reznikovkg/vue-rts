<template>
  <div
      v-for="(part, index) in parts"
      :key="'roof' + index"
      :class="part.class"
      :style="part.style" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { worldToScreen } from '@/game/coords'
import type { ObjectType, Point } from '@/game/types'

// крыша-пирамида над стенами статичного объекта
const props = defineProps<{
  type: ObjectType
}>()

const polygon = (points: Point[], color: string, brightness: number) => {
  const left = Math.min(...points.map((p) => p.x))
  const top = Math.min(...points.map((p) => p.y))
  return {
    left: left + 'px',
    top: top + 'px',
    width: Math.max(...points.map((p) => p.x)) - left + 'px',
    height: Math.max(...points.map((p) => p.y)) - top + 'px',
    backgroundColor: color,
    filter: `brightness(${brightness})`,
    clipPath: `polygon(${points.map((p) => `${p.x - left}px ${p.y - top}px`).join(', ')})`,
  }
}

// ребро крыши
const edge = (from: Point, to: Point) => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return {
    left: from.x + 'px',
    top: from.y + 'px',
    width: Math.hypot(dx, dy) + 'px',
    transform: `rotate(${Math.atan2(dy, dx)}rad)`,
  }
}

const parts = computed(() => {
  const { width, height, color, wallHeight = 0, roofHeight = 0, roofColor } = props.type
  const corner = (x: number, y: number): Point => {
    const point = worldToScreen({ x, y })
    return { x: point.x, y: point.y - wallHeight }
  }
  const back = corner(-width / 2, -height / 2)
  const left = corner(-width / 2, height / 2)
  const right = corner(width / 2, -height / 2)
  const front = corner(width / 2, height / 2)
  const peak = { x: 0, y: -wallHeight - roofHeight }
  const fill = roofColor ?? color
  const slopes = (...styles: object[]) => styles.map((style) => ({ class: 'slope', style }))
  const edges = (...styles: object[]) => styles.map((style) => ({ class: 'edge', style }))
  return [
    ...slopes(polygon([back, left, peak], fill, 0.8), polygon([back, right, peak], fill, 0.6)),
    ...edges(edge(back, left), edge(back, right), edge(back, peak)),
    ...slopes(polygon([left, front, peak], fill, 1), polygon([front, right, peak], fill, 0.7)),
    ...edges(edge(left, peak), edge(front, peak), edge(right, peak)),
  ]
})
</script>

<style scoped lang="scss">
// скат крыши
.slope {
  position: absolute;
}

.edge {
  position: absolute;
  height: 0;
  margin-top: -1px;
  border-top: 2px solid rgba(0, 0, 0, 1);
  transform-origin: 0 50%;

  .selected > & {
    border-color: #fff;
  }
}
</style>
