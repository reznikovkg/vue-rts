<template>
  <div v-if="selectedUnitIds.length && !selectedBuilding" class="controls-section">
    <strong>Действия</strong>
    <button type="button" @click="selfDestruct">
      Самоуничтожение
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const selectedUnitIds = computed(() => store.state.game.selectedUnitIds as number[])
const selectedBuilding = computed(() => store.getters['game/selectedBuilding'])

function selfDestruct() {
  store.commit('events/enqueue', {
    type: 'selfDestruct',
    unitIds: selectedUnitIds.value,
  })
}
</script>
