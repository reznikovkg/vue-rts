<template>
  <div v-if="selectedBuilding" class="controls-section">
    <strong>Выбрано</strong>
    <span>{{ selectedBuilding.name }} · HP {{ Math.ceil(selectedBuilding.health) }}</span>
    <button
      type="button"
      :disabled="selectedBuilding.groupId !== activeGroup"
      @click="spawnUnit"
    >
      Создать персонажа
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const activeGroup = computed(() => store.state.game.activeGroup as number)
const selectedBuilding = computed(() =>
  store.getters['game/selectedBuilding'] as {
    id: number
    groupId: number
    name: string
    health: number
  } | null,
)

function spawnUnit() {
  if (!selectedBuilding.value) return

  store.commit('events/enqueue', {
    type: 'spawn',
    buildingId: selectedBuilding.value.id,
  })
}
</script>
