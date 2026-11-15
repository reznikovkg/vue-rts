<!-- Компонент для отрисовки крыши в виде пирамиды для статичных объектов -->
<template>
  <div
      v-for="(part, index) in parts"
      :key="'roof' + index"
      :class="part.class"
      :style="part.style" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { lineStyle, worldToScreen } from '@/game/coords'
import type { ObjectType, Point } from '@/game/types'

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
  const slopes = (...styles: object[]) => styles.map((style) => ({ class: 'pyramid-roof__slope', style }))
  const edges = (...styles: object[]) => styles.map((style) => ({ class: 'pyramid-roof__edge', style }))
  return [
    ...slopes(polygon([back, left, peak], fill, 0.8), polygon([back, right, peak], fill, 0.6)),
    ...edges(lineStyle(back, left), lineStyle(back, right), lineStyle(back, peak)),
    ...slopes(polygon([left, front, peak], fill, 1), polygon([front, right, peak], fill, 0.7)),
    ...edges(lineStyle(left, peak), lineStyle(front, peak), lineStyle(right, peak)),
  ]
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.pyramid-roof {
  // склоны и рёбра - прямые дети корня game-static-object:
  // выделение и стройку ловят селекторы по родителю внутри миксинов
  &__slope {
    position: absolute;

    @include when-state('game-static-object', 'constructing', opacity, $ghost-opacity);
  }

  &__edge {
    transform-origin: 0 50%;

    @include line;
    @include when-selected('game-static-object', border-color);
    @include when-state('game-static-object', 'constructing', opacity, $ghost-opacity);
  }
}
</style>
