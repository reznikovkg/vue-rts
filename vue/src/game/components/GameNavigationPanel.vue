<template>
  <aside class="game-panel game-nav-panel">
    <p class="game-panel__title">Группа</p>
    <div class="game-panel__row">
      <button
        v-for="group in availableGroups"
        :key="group"
        type="button"
        class="game-panel__btn"
        :class="{ 'game-panel__btn--active': activeGroup === group }"
        :style="{ borderColor: groupColor(group) }"
        @click="onGroupClick(group)"
      >
        {{ group }}
      </button>
    </div>

    <p class="game-panel__title game-panel__title--spaced">Постройка</p>
    <div class="game-panel__row">
      <button
        v-for="option in buildOptions"
        :key="option.sizeN"
        type="button"
        class="game-panel__btn"
        :class="{ 'game-panel__btn--active': isBuildOptionActive(option) }"
        @click="onBuildOptionClick(option)"
      >
        {{ option.label }} {{ option.sizeN }}x{{ option.sizeN }}
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILD_OPTIONS } from '@/game/config/buildingTypes.js'
import { getGroupColor } from '@/game/config/groups.js'

const buildOptions = BUILD_OPTIONS

const store = useStore()
const buildMode = computed(() => store.getters['units/buildMode'])
const activeGroup = computed(() => store.getters['units/activeGroup'])
const availableGroups = computed(() => store.getters['units/availableGroups'])

function groupColor(group) {
  return getGroupColor(group)
}

function isBuildOptionActive(option) {
  return buildMode.value.active && buildMode.value.buildingType === option.buildingType
}

function onGroupClick(group) {
  store.dispatch('units/setActiveGroup', group)
}

function onBuildOptionClick(option) {
  store.dispatch('units/toggleBuildOption', option)
}
</script>

<style scoped lang="scss">
@use './gamePanel.scss';

.game-nav-panel {
  left: 12px;
  max-width: 240px;
}

.game-panel__btn--active {
  border-color: #7dff7d;
  background: #1f3a1f;
}
</style>
