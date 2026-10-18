<template>
  <div class="game-page">
    <GameField />
    <InfoPanel />
  </div>
</template>

<script setup lang="ts">
import GameField from '../game/GameField.vue'
import InfoPanel from '../game/InfoPanel.vue'
</script>

<style scoped>
.game-page {
  position: fixed;
  inset: 0;
}
</style>
