<template>
  <div class="game-page">
    <div class="game-page__field">
      <GameField/>
      <GameHud/>
      <GameOverlay/>
    </div>
    <CommandPanel/>
  </div>
</template>

<script setup>
import GameField from '@/components/game/GameField.vue'
import GameHud from '@/components/game/GameHud.vue'
import GameOverlay from '@/components/game/GameOverlay.vue'
import CommandPanel from '@/components/game/CommandPanel.vue'
</script>

<style scoped lang="scss">
.game-page {
  display: flex;
  flex-direction: column;
  height: 100vh;

  &__field {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
  }
}
</style>
