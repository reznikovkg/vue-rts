<template>
  <div class="game-page">
    <GameField />
  </div>
</template>

<script setup lang="ts">
import GameField from '@/components/game/GameField.vue'
</script>

<style scoped lang="scss">
.game-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>