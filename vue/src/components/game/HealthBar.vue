<template>
  <div class="health-bar" :style="barStyle">
    <div class="health-bar__fill" :style="{ width: `${percent}%` }"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { HEALTH_BAR } from '@/config/game';

const props = defineProps({
  hp: { type: Number, required: true },
  maxHp: { type: Number, required: true },
  // Экранные координаты объекта (центр по X, верх объекта по Y)
  screen: { type: Object, required: true },
  width: { type: Number, required: true },
  // Отступ над объектом на экране
  offset: { type: Number, required: true }
});

const percent = computed(() => {
  if (!props.maxHp) return 0;
  return Math.max(0, Math.min(100, (props.hp / props.maxHp) * 100));
});

const barStyle = computed(() => ({
  left: `${props.screen.x}px`,
  top: `${props.screen.y - props.offset}px`,
  width: `${props.width}px`,
  height: `${HEALTH_BAR.height}px`
}));
</script>

<style scoped lang="scss">
.health-bar {
  position: absolute;
  transform: translate(-50%, -100%);
  background: #c0392b;
  border: 1px solid rgba(0, 0, 0, 0.55);
  box-sizing: border-box;
  pointer-events: none;
  overflow: hidden;

  &__fill {
    height: 100%;
    background: #3ec46d;
    transition: width 0.2s;
  }
}
</style>