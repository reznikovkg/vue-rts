<template>
  <div
      class="unit"
      :class="{ selected }"
      :style="style"
      @mousedown.left.stop="() => pushEmit()"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MAP, UNIT_TYPES } from '@/game/config'
import type { Unit } from '@/game/types'

const props = defineProps<{
  unit: Unit
  selected: boolean
}>()

// событие для родителя (GameField): если на юнит кликнули, его надо выбрать
const emit = defineEmits<{ select: [] }>()
const pushEmit = () => emit('select')

// стили, которые зависят от данных юнита (координаты, размер, цвет), поэтому не в style
// пересчитывается, когда юнит двигается
const style = computed(() => {
  const type = UNIT_TYPES[props.unit.type]
  return {
    left: props.unit.x + MAP.width / 2 - type.width / 2 + 'px',
    top: props.unit.y + MAP.height / 2 - type.height / 2 + 'px',
    width: type.width + 'px',
    height: type.height + 'px',
    background: type.color,
  }
})
</script>

<style scoped lang="scss">
.unit {
  position: absolute;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 1);
  cursor: pointer;
}

.selected {
  border-color: #fff;
}
</style>
