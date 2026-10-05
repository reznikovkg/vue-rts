<template>
  <div class="game-page">
    <GameField/>
    <SelectionPanel :entity="selectedEntity"/>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useStore} from 'vuex'
import GameField from '@/components/game/GameField.vue'
import SelectionPanel from '@/components/game/SelectionPanel.vue'

const store = useStore()
const selectedEntity = computed(() => store.getters['game/getSelectedEntity'])
</script>

<style scoped lang="scss">
.game-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
</style>
