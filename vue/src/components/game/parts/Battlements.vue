<template>
  <div
      v-for="(tooth, index) in teeth"
      :key="'tooth' + index"
      class="face wall"
      :class="{ dark: tooth.dark }"
      :style="tooth.style" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ISO_SCALE, worldToScreen } from '@/game/coords'
import type { ObjectType } from '@/game/types'

// зубцы по краям стен (крыша замка)
const props = defineProps<{
  type: ObjectType
}>()

// примерный размер зубца и промежутка между зубцами
const TOOTH_SIZE = 20

const teeth = computed(() => {
  const { width, height, color, wallHeight = 0, roofHeight = 0, roofColor } = props.type
  const fill = roofColor ?? color
  const row = (alongX: boolean, fixed: number) => {
    const length = alongX ? width : height
    const count = Math.max(2, Math.round((length / TOOTH_SIZE + 1) / 2))
    const size = length / (2 * count - 1)
    return Array.from({ length: count }, (_, index) => {
      const offset = index * 2 * size
      const start = alongX
        ? worldToScreen({ x: -width / 2 + offset, y: fixed })
        : worldToScreen({ x: fixed, y: height / 2 - offset })
      return {
        dark: !alongX,
        style: {
          left: start.x + 'px',
          top: start.y - wallHeight - roofHeight + 'px',
          width: size + 'px',
          height: roofHeight + 'px',
          backgroundColor: fill,
          transform: `matrix(${ISO_SCALE}, ${((alongX ? 1 : -1) * ISO_SCALE) / 2}, 0, 1, 0, 0)`,
        },
      }
    })
  }
  return [
    ...row(true, -height / 2),
    ...row(false, -width / 2),
    ...row(true, height / 2),
    ...row(false, width / 2),
  ]
})
</script>

<style scoped lang="scss">
@use '@/assets/iso-faces';
</style>
