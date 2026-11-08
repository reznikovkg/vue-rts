<template>
  <aside class="game-controls" :class="{ 'game-controls--collapsed': !isExpanded }">
    <ControlsHeader
      :active-group="activeGroup"
      :is-paused="isPaused"
      :is-expanded="isExpanded"
      :scenario="scenario"
      @toggle-pause="togglePause"
      @toggle-expanded="isExpanded = !isExpanded"
      @change-scenario="changeScenario"
    />

    <template v-if="isExpanded">
      <ControlsGroups />

      <ControlsBuild />
      <ControlsSelectedBuilding />
      <ControlsSelectedUnits />
      <ControlsSelfDestruct />

      <span v-if="!selectedUnitIds.length && !selectedBuilding">ничего</span>

      <div class="controls-help">
        ЛКМ — выбрать · Shift+ЛКМ — добавить · рамка — выделить · Shift+клик — очередь команд<br>
        ПКМ — двигаться / атаковать · Ctrl+1–3 — назначить группу · 1–3 — выбрать группу<br>
        WASD / стрелки — камера
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import ControlsBuild from './ControlsBuild.vue'
import ControlsGroups from './ControlsGroups.vue'
import ControlsHeader from './ControlsHeader.vue'
import ControlsSelectedBuilding from './ControlsSelectedBuilding.vue'
import ControlsSelectedUnits from './ControlsSelectedUnits.vue'
import ControlsSelfDestruct from './ControlsSelfDestruct.vue'

const store = useStore()
const isExpanded = ref(window.innerWidth > 700)
const activeGroup = computed(() => store.state.game.activeGroup as number)
const isPaused = computed(() => store.state.game.isPaused as boolean)
const scenario = computed(() => store.state.game.scenario as string)
const selectedUnitIds = computed(() => store.state.game.selectedUnitIds as number[])
const selectedBuilding = computed(() => store.getters['game/selectedBuilding'])

function togglePause() {
  store.commit('events/enqueue', { type: 'pause' })
}

function changeScenario(name: string) {
  store.commit('events/enqueue', { type: 'scenario', name })
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/tokens' as tokens;

.game-controls {
  position: absolute;
  left: 16px;
  top: 16px;
  display: grid;
  gap: 10px;
  width: min(360px, calc(100vw - 32px));
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(24, 35, 29, 0.94), rgba(8, 15, 11, 0.92));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
  color: tokens.$color-white;
  font: 13px/1.45 Arial, sans-serif;
  backdrop-filter: blur(8px);
  z-index: 2500;
}

.game-controls strong {
  color: #b7ffc1;
  letter-spacing: 0.02em;
}

.controls-row,
:deep(.controls-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  button,
  select {
    min-height: 28px;
  }
}

.game-controls button,
.game-controls select,
:deep(.game-controls button),
:deep(button),
:deep(select) {
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #f5f8f5;
  font: inherit;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

:deep(button:hover:not(:disabled)) {
  border-color: rgba(143, 255, 161, 0.75);
  background: rgba(143, 255, 161, 0.14);
}

:deep(select option) {
  color: #172019;
}

:deep(.groups button) {
  flex: 1;
}

.game-controls--collapsed {
  width: auto;
  min-width: 245px;
}

.controls-section,
:deep(.controls-section) {
  display: grid;
  gap: 5px;
  padding-top: 7px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.controls-help,
:deep(.controls-help),
:deep(small) {
  color: #d3d9d2;
  font-size: 11px;
}

:deep(button.active) {
  border-color: tokens.$color-selection;
  background: rgba(114, 255, 114, 0.16);
}

:deep(button:disabled) {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 700px) {
  .game-controls {
    left: 8px;
    top: 8px;
    max-width: calc(100vw - 16px);
    padding: 10px;
  }
}
</style>
