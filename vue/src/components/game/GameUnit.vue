<template>
  <div
      class="game-unit"
      :class="{ selected, walking }"
      :style="style"
      @mousedown.left.stop="() => pushEmit()">
    <div class="shadow" />
    <div class="leg left" />
    <div class="leg right" />
    <div class="body" :style="{ backgroundColor: type.color }" />
    <div class="arm left" />
    <div class="arm right" />
    <div class="head" :style="{ backgroundColor: type.color }" />
    <HpBar :hp="unit.hp" :max-hp="type.maxHp" :group="unit.group" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HpBar from './HpBar.vue'
import { depthZIndex, worldToScreen } from '@/game/coords'
import type { Unit, UnitType } from '@/game/types'

// юнит: человечек из css-фигур, стоит ногами в точке position
const props = defineProps<{
  unit: Unit
  type: UnitType
  selected: boolean
}>()

// событие для родителя (GameField): если на юнита кликнули, его надо выбрать
const emit = defineEmits<{ select: [] }>()
const pushEmit = () => emit('select')

// юнит идёт, пока у него есть цель: тогда включается анимация рук и ног
const walking = computed(() => props.unit.target !== null)

const style = computed(() => {
  const point = worldToScreen(props.unit.position)
  return {
    left: point.x - props.type.width / 2 + 'px',
    top: point.y - props.type.height + 'px',
    width: props.type.width + 'px',
    height: props.type.height + 'px',
    zIndex: depthZIndex(point),
  }
})
</script>

<style scoped lang="scss">
.game-unit {
  position: absolute;
  cursor: pointer;
}

.shadow {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  aspect-ratio: 2 / 1;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  transform: translateY(50%);
}

.leg {
  position: absolute;
  bottom: 0;
  width: 4px;
  height: 32%;
  border-radius: 2px;
  background: #000;
  transform-origin: top center;

  &.left {
    left: 25%;
    --step-a: 25deg;
    --step-b: -25deg;
  }

  &.right {
    right: 25%;
    --step-a: -25deg;
    --step-b: 25deg;
  }

  .selected > & {
    background: #fff;
  }
}

// руки юнитлов = палки от плеч
.arm {
  position: absolute;
  top: 34%;
  width: 4px;
  height: 34%;
  border-radius: 2px;
  background: #000;
  transform-origin: top center;

  // руки машут
  &.left {
    left: 0;
    transform: rotate(25deg);
    --step-a: 5deg;
    --step-b: 50deg;
  }

  &.right {
    right: 0;
    transform: rotate(-25deg);
    --step-a: -50deg;
    --step-b: -5deg;
  }

  .selected > & {
    background: #fff;
  }
}

// ходьба из двух кадров
.walking > .leg,
.walking > .arm {
  animation: walk 0.4s steps(1) infinite;
}

@keyframes walk {
  0% {
    transform: rotate(var(--step-a));
  }

  50% {
    transform: rotate(var(--step-b));
  }
}

.body,
.head {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid rgba(0, 0, 0, 1);
  border-radius: 50%;
  background-image: radial-gradient(
    circle at 35% 28%,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0) 40%,
    rgba(0, 0, 0, 0.4) 100%
  );

  .selected > & {
    border-color: #fff;
  }
}

.body {
  left: 0;
  top: 26%;
  width: 100%;
  height: 50%;
}

.head {
  left: 22%;
  top: 0;
  width: 56%;
  aspect-ratio: 1;
}
</style>
