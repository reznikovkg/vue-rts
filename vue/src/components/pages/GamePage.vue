<template>
  <div class="game-page">
    <GameField />
    <SelectionPanel class="game-page__panel" />
    <RouterLink class="game-page__exit" :to="{ name: $routes.INDEX }">Выход</RouterLink>
  </div>
</template>

<script setup>
import GameField from '@/components/game/GameField.vue'
import SelectionPanel from '@/components/game/SelectionPanel.vue'
import { useGameEvents } from '@/composables/useGameEvents'

useGameEvents()
</script>

<style scoped lang="scss">
// на весь экран, поверх общей сетки #project из main.css
.game-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  user-select: none;

  &__panel {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
  }

  &__exit {
    position: absolute;
    top: 8px;
    right: 8px;
  }
}
</style>