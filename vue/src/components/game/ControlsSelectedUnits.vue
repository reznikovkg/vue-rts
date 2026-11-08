<template>
  <div v-if="selectedUnits.length && !selectedBuilding" class="controls-section">
    <strong>Выбрано</strong>
    <span>{{ selectedUnits.length }} персонаж(а) · группа {{ selectedUnits[0].groupId }}</span>
    <span v-if="selectedUnits.length === 1">
      HP {{ Math.ceil(selectedUnits[0].health) }} · атака {{ selectedUnits[0].attackPower }}
      · скорость {{ selectedUnits[0].speed }} · перезарядка {{ selectedUnits[0].attackSpeed }}/с
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const selectedUnits = computed(() =>
  store.getters['game/selectedUnits'] as Array<{
    groupId: number
    health: number
    attackPower: number
    speed: number
    attackSpeed: number
  }>,
)
const selectedBuilding = computed(() => store.getters['game/selectedBuilding'])
</script>
