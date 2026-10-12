<template>
  <div class="game-page">
    <GameField v-model:selected="selected" />
    <InfoPanel :selected="selected" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import GameField from '../game/GameField.vue'
import InfoPanel from '../game/InfoPanel.vue'
import type { StaticObject, Unit } from '@/game/types'

const selected = ref<StaticObject | Unit | null>(null)
</script>

<style scoped>
.game-page {
  position: fixed;
  inset: 0;
}
</style>
