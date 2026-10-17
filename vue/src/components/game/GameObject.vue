<template>
  <div
    class="game-object"
    :style="rootStyle"
    @mousedown.left.stop
    @click.left.stop="() => $emit('select', obj)"
  >
    <!-- Персонаж: круг + тень на земле -->
    <template v-if="obj.type === 'character'">
      <div
        class="game-object__shadow"
        :class="{ 'game-object__shadow--selected': isSelected }"
        :style="shadowStyle"
      ></div>
      <div class="game-object__body" :style="bodyStyle"></div>
    </template>

    <!-- Здание: блок из трёх граней (верх, левая, правая) -->
    <template v-else>
      <div class="game-object__building" :style="buildingStyle">
        <div class="game-object__face" :style="faceTop"></div>
        <div class="game-object__face" :style="faceLeft"></div>
        <div class="game-object__face" :style="faceRight"></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { worldToScreen } from '../../utils/isometric';

const props = defineProps<{
  obj: { id: number; type: string; x: number; y: number; color: string };
  cellSize: number;
  offsetX: number;
  isSelected: boolean;
}>();

defineEmits(['select']);

// x, y объекта - это мировые координаты точки на земле.
// Для экрана переводим их через проекцию.
const screen = computed(() => worldToScreen(props.obj.x, props.obj.y, props.offsetX));

// Порядок отрисовки: чем больше (x + y), тем объект "ближе" к камере и тем выше он лежит.
// Благодаря этому юнит за зданием скрывается за ним, а юнит перед зданием виден поверх него.
const rootStyle = computed(() => ({
  left: screen.value.x + 'px',
  top: screen.value.y + 'px',
  zIndex: Math.floor(props.obj.x + props.obj.y) + 10,
}));

// ---------- персонаж ----------
const unitSize = computed(() => props.cellSize * 0.45);

const bodyStyle = computed(() => ({
  width: unitSize.value + 'px',
  height: unitSize.value + 'px',
  left: -unitSize.value / 2 + 'px',
  top: -unitSize.value * 1.1 + 'px',
  backgroundColor: props.obj.color,
}));

const shadowStyle = computed(() => ({
  width: unitSize.value * 1.3 + 'px',
  height: unitSize.value * 0.65 + 'px',
  left: -unitSize.value * 0.65 + 'px',
  top: -unitSize.value * 0.32 + 'px',
}));

// ---------- здание ----------
const wallHeight = computed(() => props.cellSize * 0.75);

const buildingStyle = computed(() => {
  const w = props.cellSize;
  const h = wallHeight.value;
  return {
    width: w + 'px',
    height: w / 2 + h + 'px',
    left: -w / 2 + 'px',
    top: -(w / 4) - h + 'px',
  };
});

const face = (points: string, brightness: number) => {
  return {
    clipPath: `polygon(${points})`,
    backgroundColor: props.obj.color,
    filter: `brightness(${brightness})`,
  };
};

const faceTop = computed(() => {
  const w = props.cellSize;
  return face(`${w / 2}px 0, ${w}px ${w / 4}px, ${w / 2}px ${w / 2}px, 0 ${w / 4}px`, 1.15);
});

const faceLeft = computed(() => {
  const w = props.cellSize;
  const h = wallHeight.value;
  return face(`0 ${w / 4}px, ${w / 2}px ${w / 2}px, ${w / 2}px ${w / 2 + h}px, 0 ${w / 4 + h}px`, 0.8);
});

const faceRight = computed(() => {
  const w = props.cellSize;
  const h = wallHeight.value;
  return face(`${w / 2}px ${w / 2}px, ${w}px ${w / 4}px, ${w}px ${w / 4 + h}px, ${w / 2}px ${w / 2 + h}px`, 0.6);
});
</script>

<style scoped lang="scss">
.game-object {
  position: absolute;
  width: 0;
  height: 0;
  cursor: pointer;

  &__body {
    position: absolute;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
  }

  &__shadow {
    position: absolute;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.4);
    box-sizing: border-box;

    /* выбранный юнит: жёлтое кольцо на земле */
    &--selected {
      border: 3px solid #fde047;
      background: rgba(253, 224, 71, 0.18);
    }
  }

  &__building {
    position: absolute;
  }

  &__face {
    position: absolute;
    inset: 0;
  }
}
</style>
