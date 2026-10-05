<template>
  <div class="game-page">
    <canvas ref="canvas" class="game-page__canvas" @contextmenu.prevent />

    <div class="game-page__panel">
      <template v-if="selected">
        <b>{{ selected.name }}</b> , скорость {{ selected.speed }} кл/с
      </template>
      <template v-else>
        Нажмите на персонажа, чтобы выбрать
      </template>
    </div>

    <RouterLink class="game-page__exit" :to="{ name: $routes.INDEX }">Выход</RouterLink>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Game, type SelectedInfo } from '@/game/Game'

const canvas = ref<HTMLCanvasElement | null>(null)
const selected = ref<SelectedInfo | null>(null)

// игра обычный объект, не ref, vue за ней следить не нужно
let game: Game | null = null

onMounted(() => {
  game = new Game(canvas.value!, (info) => (selected.value = info))
})

onBeforeUnmount(() => game?.destroy())
</script>

<style scoped lang="scss">
// на всю страницу растянуто, чтобы перекрыть 
.game-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #0b0d10;
  user-select: none;

  &__canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__panel {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    padding: 6px 12px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.6);
    color: #e6e6e6;
    font-size: 13px;
    white-space: nowrap;
  }

  &__exit {
    position: absolute;
    top: 8px;
    right: 8px;
  }
}
</style>
