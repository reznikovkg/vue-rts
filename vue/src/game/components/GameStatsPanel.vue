<template>
  <aside v-if="selectedCount > 1" class="game-panel game-stats-panel">
    <p class="game-panel__title">Выбрано: {{ selectedCount }}</p>
  </aside>
  <aside v-else-if="selectedObject" class="game-panel game-stats-panel">
    <p class="game-panel__title">{{ title }}</p>
    <dl class="game-stats-panel__list">
      <template v-if="isUnit">
        <div class="game-stats-panel__row">
          <dt>Очки жизни</dt>
          <dd>{{ hpLabel }}</dd>
        </div>
        <div class="game-stats-panel__row">
          <dt>Сила</dt>
          <dd>{{ formatStat(stats.attack) }}</dd>
        </div>
        <div class="game-stats-panel__row">
          <dt>Скорость</dt>
          <dd>{{ formatStat(stats.speed) }}</dd>
        </div>
        <div class="game-stats-panel__row">
          <dt>Скорость атаки</dt>
          <dd>{{ formatStat(stats.attackSpeed) }}</dd>
        </div>
      </template>
      <template v-else-if="isBuilding">
        <div class="game-stats-panel__row">
          <dt>Размер</dt>
          <dd>{{ sizeLabel }}</dd>
        </div>
        <div class="game-stats-panel__row">
          <dt>Очки жизни</dt>
          <dd>{{ hpLabel }}</dd>
        </div>
      </template>
    </dl>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILDING_TYPES } from '@/game/config/buildingTypes.js'
import { getUnitTypeConfig } from '@/game/config/unitTypes.js'

const store = useStore()
const selectedObject = computed(() => store.getters['units/selectedObject'])
const selectedCount = computed(() => store.getters['units/selectedIds'].length)
const isUnit = computed(() => selectedObject.value?.type === 'unit')
const isBuilding = computed(() => selectedObject.value?.type === 'building')
const stats = computed(() => selectedObject.value?.stats ?? {})

const hpLabel = computed(() => {
  const maxHp = selectedObject.value?.maxHp
  const hp = formatStat(stats.value.hp)
  return typeof maxHp === 'number' ? `${hp} / ${formatStat(maxHp)}` : hp
})

const title = computed(() => {
  const object = selectedObject.value
  if (!object) return ''
  if (object.type === 'unit') {
    return getUnitTypeConfig(object.unitType)?.label ?? 'юнит'
  }
  if (object.type === 'building') {
    return BUILDING_TYPES[object.buildingType]?.label ?? 'здание'
  }
  return '—'
})

const sizeLabel = computed(() => {
  const sizeN = selectedObject.value?.sizeN
  if (typeof sizeN !== 'number' || Number.isNaN(sizeN)) return '—'
  return `${sizeN}x${sizeN}`
})

function formatStat(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(2)))
}
</script>

<style scoped lang="scss">
@use './gamePanel.scss';

.game-stats-panel {
  right: 12px;
  max-width: 240px;
}

.game-stats-panel__list {
  margin: 0;
}

.game-stats-panel__row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 4px;

  &:last-child {
    margin-bottom: 0;
  }

  dt,
  dd {
    margin: 0;
  }

  dd {
    font-variant-numeric: tabular-nums;
  }
}
</style>