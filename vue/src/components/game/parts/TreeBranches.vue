<template>
  <div
      v-for="(branch, index) in branches"
      :key="'branch' + index"
      class="branch"
      :style="branch" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ObjectType } from '@/game/types'

// ветки ёлки: пары палок от оси ствола в обе стороны
const props = defineProps<{
  type: ObjectType
}>()

const BRANCH_PAIRS = 4
// угол наклона веток вниз
const BRANCH_ANGLE = 25

const branches = computed(() => {
  const { wallHeight = 0, branchColor } = props.type
  const result = []
  for (let i = 0; i < BRANCH_PAIRS; i++) {
    const y = wallHeight * (0.3 + i * 0.2)
    const length = wallHeight * 0.35 * (1 - i * 0.2)
    for (const angle of [BRANCH_ANGLE, 180 - BRANCH_ANGLE]) {
      result.push({
        top: -y + 'px',
        width: length + 'px',
        backgroundColor: branchColor,
        transform: `rotate(${angle}deg)`,
      })
    }
  }
  return result
})
</script>

<style scoped lang="scss">
.branch {
  position: absolute;
  left: 0;
  height: 4px;
  margin-top: -2px;
  border-radius: 2px;
  transform-origin: 0 50%;

  // для выделения веток
  .selected > & {
    box-shadow: 0 0 0 2px #fff;
  }
}
</style>
