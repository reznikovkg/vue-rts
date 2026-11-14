<template>
  <div class="game-page">
    <GameField />
    <InfoPanel />
    <CommandPanel />
    <GameControls />
  </div>
</template>

<script setup lang="ts">
import GameField from '../game/GameField.vue'
import InfoPanel from '../game/InfoPanel.vue'
import CommandPanel from '../game/CommandPanel.vue'
import GameControls from '../game/GameControls.vue'
</script>

<style scoped lang="scss">
.game-page {
  position: fixed;
  inset: 0;
}
</style>
