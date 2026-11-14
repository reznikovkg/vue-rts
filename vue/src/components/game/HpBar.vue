<template>
  <div class="hp-bar" :style="barStyle">
    <div class="hp-fill" :style="fillStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { groupColor } from '@/game/config'

// полоска жизней над объектом, рамка - цвет группы
// offset - на сколько пикселей объект поднимается над точкой привязки (стены + крыша у зданий)
// width - ширина полоски в пикселях
const props = withDefaults(defineProps<{
  hp: number
  maxHp: number
  group: number
  offset?: number
  width?: number
}>(), { offset: 0, width: 36 })

const ratio = computed(() => Math.max(0, Math.min(1, props.hp / props.maxHp)))

const barStyle = computed(() => ({
  top: -props.offset - 14 + 'px',
  width: props.width + 'px',
  borderColor: groupColor(props.group),
}))

const fillStyle = computed(() => {
  let color = '#ef4444'
  if (ratio.value > 0.6) {
    color = '#22c55e'
  }
  else if (ratio.value > 0.3) {
    color = '#eab308'
  }
  return { width: ratio.value * 100 + '%', backgroundColor: color }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.hp-bar {
  position: absolute;
  left: 50%;
  height: 6px;
  box-sizing: border-box;
  border: $outline-width solid $outline-color;
  background: $hp-bar-background;
  transform: translateX(-50%);
}

.hp-fill {
  height: 100%;
}
</style>
