<template>
  <div class="game-result">
    <h2>Игра завершена</h2>
    <p v-if="result?.winner">
      Победила группа {{ result.winner }}
    </p>
    <p v-else>
      Ничья: не осталось групп
    </p>
    <button type="button" @click="$emit('restart', scenario)">
      Начать заново
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  result?: { winner: number | null } | null
  scenario?: string
}>()

defineEmits<{
  restart: [scenario: string]
}>()
</script>

<style scoped lang="scss">
.game-result {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-family: Arial, sans-serif;
  z-index: 20000;
}


.game-result button {
  padding: 9px 14px;
  border: 0;
  border-radius: 6px;
  background: #3d7f4a;
  color: #fff;
  cursor: pointer;
  font-family: Arial, sans-serif;
}

</style>
