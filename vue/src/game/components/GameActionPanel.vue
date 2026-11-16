<template>
  <aside v-if="hasActions" class="game-panel game-action-panel">
    <template v-if="canSpawn">
      <p class="game-panel__title">Спавн</p>
      <div class="game-panel__row">
        <button type="button" class="game-panel__btn" @click="onSpawnClick">
          {{ spawnLabel }}
        </button>
      </div>
    </template>

    <template v-if="isUnitSelected">
      <p
          class="game-panel__title"
          :class="{ 'game-panel__title--spaced': canSpawn }"
      >
        Персонаж
      </p>
      <div class="game-panel__row">
        <button
            type="button"
            class="game-panel__btn game-panel__btn--danger"
            @click="onDestroyClick"
        >
          Самоуничтожение
        </button>
      </div>
    </template>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { getUnitTypeConfig } from '@/game/config/unitTypes.js'

const store = useStore()
const selectedObject = computed(() => store.getters['units/selectedObject'])
const canSpawn = computed(() => store.getters['units/canSpawnFromSelected'])
const selectedUnits = computed(() => store.getters['units/selectedUnits'])
const isUnitSelected = computed(() => selectedUnits.value.length > 0)
const hasActions = computed(() => canSpawn.value || isUnitSelected.value)
const spawnLabel = computed(() => {
  const unitType = selectedObject.value?.spawnUnitType
  const label = unitType ? getUnitTypeConfig(unitType)?.label : null
  return `Создать ${label ?? 'юнита'}`
})

function onSpawnClick() {
  store.dispatch('units/spawnNearSelected')
}

function onDestroyClick() {
  store.dispatch('units/destroySelected')
}
</script>

<style scoped lang="scss">
@use './gamePanel.scss';

.game-action-panel {
  left: 50%;
  transform: translateX(-50%);
  max-width: min(220px, max(0px, calc(100vw - 520px)));
  font-size: clamp(11px, 1.2vw, 13px);
}

.game-panel__btn--danger {
  border-color: #a55;
  background: #3a1f1f;

  &:hover {
    border-color: #d77;
  }
}
</style>