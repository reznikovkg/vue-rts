<template>
  <div
    class="game-cell"
    :class="{ 'game-cell--dark': (cell.x + cell.y) % 2 === 0 }"
    :style="style"
  ></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { worldToScreen } from '../../utils/isometric';

const props = defineProps<{
  cell: { x: number; y: number };
  cellSize: number;
  offsetX: number;
}>();

const style = computed(() => {
  // центр клетки в мировых координатах, затем проекция на экран
  const center = worldToScreen(
    (props.cell.x + 0.5) * props.cellSize,
    (props.cell.y + 0.5) * props.cellSize,
    props.offsetX
  );

  // ромб 2:1; чуть меньше клетки, чтобы между ромбами была тонкая линия сетки
  const width = props.cellSize - 2;
  const height = props.cellSize / 2 - 1;

  return {
    left: center.x - width / 2 + 'px',
    top: center.y - height / 2 + 'px',
    width: width + 'px',
    height: height + 'px',
  };
});
</script>

<style scoped lang="scss">
.game-cell {
  position: absolute;
  /* ромб через clip-path: элемент не поворачивается, только обрезается */
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: #1f3a2f;

  &--dark {
    background: #1a3228;
  }
}
</style>
