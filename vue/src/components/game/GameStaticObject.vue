<template>
  <div
      class="static-object"
      :class="{ selected }"
      :style="style"
      @mousedown.left.stop="() => pushEmit()"/>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MAP, OBJECT_TYPES } from '@/game/config'
import type { StaticObject } from '@/game/types'

const props = defineProps<{
  object: StaticObject
  selected: boolean
}>()

// событие для родителя (GameField): если на объект кликнули, его надо выбрать
const emit = defineEmits<{ select: [] }>()
const pushEmit = () => emit('select')

// стили, которые зависят от данных объекта (координаты, размер, цвет), поэтому тут, а не в <style>
const style = computed(() => {
  const type = OBJECT_TYPES[props.object.type]
  // (0,0) мира находится в центре карты, поэтому прибавляем половину карты
  return {
    left: props.object.x + MAP.width / 2 - type.width / 2 + 'px',
    top: props.object.y + MAP.height / 2 - type.height / 2 + 'px',
    width: type.width + 'px',
    height: type.height + 'px',
    background: type.color,
  }
})

</script>

<style scoped lang="scss">
.static-object {
  position: absolute;
  border: 2px solid rgba(0, 0, 0, 1);
  cursor: pointer;
}

.selected {
  border-color: #fff;
}
</style>
