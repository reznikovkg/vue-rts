<template>
  <div class="game-result">
    <strong>
      {{ result.winner ? `Победила группа ${result.winner}` : 'Ничья' }}
    </strong>
    <button type="button" @click="$emit('restart', scenario)">
      Начать заново
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  result: { winner: number | null }
  scenario: string
}

defineProps<Props>()

defineEmits<{
  restart: [scenario: string]
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/tokens' as tokens;

.game-result {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.65);
  color: tokens.$color-white;
  font-size: 24px;
  z-index: 3000;

  button {
    padding: 8px 14px;
    cursor: pointer;
  }
}
</style>
