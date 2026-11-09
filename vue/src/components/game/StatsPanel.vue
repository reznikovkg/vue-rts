<template>
  <div v-if="groups.length" class="stats-panel" :style="style">
    <div class="stats-panel__title">{{ title }}</div>
    <div class="stats-panel__body" v-for="(group, i) in groups" :key="i">
      <button
        v-if="selectedBuilding?.type === 'barrack'"
        class="stats-panel__spawn"
        @click="spawnUnit"
      >
        Создать юнита
      </button>
      <div class="stats-panel__row" v-for="row in group" :key="row.label">
        <span class="stats-panel__label">{{ row.label }}</span>
        <span class="stats-panel__value">{{ row.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useStore } from "vuex";
import { Z_INDEX } from "@/config/game";

const store = useStore();
const style = { zIndex: Z_INDEX.STATS_PANEL };

const selectedUnitIds = computed(() => store.state.game.selectedUnitIds);
const selectedBuildingId = computed(() => store.state.game.selectedBuildingId);
const selectedBuilding = computed(() => {
  if (!selectedBuildingId.value) return null;

  return (
    store.state.map.buildings.find(
      (building) => building.id === selectedBuildingId.value,
    ) ?? null
  );
});

const spawnUnit = () => {
  if (selectedBuilding.value?.type !== "barrack") return;

  store.dispatch("events/spawnUnit", selectedBuildingId.value);
};
// Группы характеристик: по юниту на выделенного, иначе — здание
const groups = computed(() => {
  if (selectedUnitIds.value.length) {
    return store.getters["map/getStats"](selectedUnitIds.value).filter(Boolean);
  }
  const building = selectedBuildingId.value
    ? store.getters["map/getBuildingStats"](selectedBuildingId.value)
    : null;
  return building ? [building] : [];
});

const title = computed(() => {
  if (selectedUnitIds.value.length > 1)
    return `Выделено юнитов: ${selectedUnitIds.value.length}`;
  return selectedUnitIds.value.length ? "Юнит" : "Здание";
});
</script>

<style scoped lang="scss">
.stats-panel {
  position: absolute;
  left: 24px;
  bottom: 24px;
  padding: 1vw 1.2vw;
  background: rgba(15, 15, 15, 0.82);
  color: #e8e8e8;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: clamp(14px, 0.9vw, 22px);
  pointer-events: none;
}

.stats-panel__title {
  margin-bottom: 6px;
  color: #a0d0ff;
  font-weight: 600;
}

.stats-panel__body + .stats-panel__body {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #3a3a3a;
}

.stats-panel__row {
  display: flex;
  justify-content: space-between;
  gap: 1.5vw;
  white-space: nowrap;
}

.stats-panel__label {
  color: #d0d0d0;
}

.stats-panel__value {
  color: #ffffff;
  font-weight: 600;
}

.stats-panel__spawn {
  margin-top: 12px;
  padding: 8px 14px;
  border: 1px solid #6b9bc8;
  border-radius: 6px;
  background: #315779;
  color: white;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;
  pointer-events: auto;

  &:hover {
    background: #416f98;
  }

  &:active {
    background: #254765;
  }
}
</style>
