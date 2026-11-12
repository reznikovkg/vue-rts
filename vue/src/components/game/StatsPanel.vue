<template>
  <div v-if="hasContent" class="stats-panel" :style="style">
    <div class="stats-panel__title">{{ title }}</div>

    <!-- Здание -->
    <div v-if="selectedBuilding" class="stats-panel__body">
      <button
        v-if="selectedBuilding.type === 'barrack'"
        class="stats-panel__spawn"
        @click="spawnUnit"
      >
        Создать юнита
      </button>
      <div class="stats-panel__row" v-for="row in buildingRows" :key="row.label">
        <span class="stats-panel__label">{{ row.label }}</span>
        <span class="stats-panel__value">{{ row.value }}</span>
      </div>
    </div>

    <!-- Один юнит: полные характеристики -->
    <div v-else-if="singleUnitRows" class="stats-panel__body">
      <div class="stats-panel__row" v-for="row in singleUnitRows" :key="row.label">
        <span class="stats-panel__label">{{ row.label }}</span>
        <span class="stats-panel__value">{{ row.value }}</span>
      </div>
    </div>

    <!-- Отряд: сводка фиксированной высоты + юнит, выбранный по Tab -->
    <div v-else-if="squad" class="stats-panel__body">
      <div class="stats-panel__row">
        <span class="stats-panel__label">Здоровье</span>
        <span class="stats-panel__value">
          {{ squad.totalHp }} / {{ squad.totalMaxHp }}
        </span>
      </div>

      <div class="stats-panel__bar">
        <div
          class="stats-panel__bar-fill"
          :style="{ width: `${squadHpPercent}%` }"
        ></div>
      </div>

      <div class="stats-panel__row">
        <span class="stats-panel__label">Типы</span>
        <span class="stats-panel__value">{{ typeSummary }}</span>
      </div>

      <div v-if="groupSummary" class="stats-panel__row">
        <span class="stats-panel__label">Группы</span>
        <span class="stats-panel__value">{{ groupSummary }}</span>
      </div>

      <div class="stats-panel__metrics">
        <span
          class="stats-panel__metric"
          v-for="metric in squadMetrics"
          :key="metric.label"
        >
          <span class="stats-panel__label">{{ metric.label }}</span>
          <span class="stats-panel__value">{{ metric.value }}</span>
        </span>
      </div>

      <div class="stats-panel__hint">Tab — характеристики юнита</div>

      <div v-if="focusedUnit" class="stats-panel__focus">
        <div class="stats-panel__focus-title">
          <span>{{ focusedUnit.label }}</span>
          <span class="stats-panel__focus-index">
            {{ focusedIndex }} / {{ squad.count }}
          </span>
        </div>

        <div class="stats-panel__row">
          <span class="stats-panel__label">Здоровье</span>
          <span class="stats-panel__value">
            {{ focusedUnit.hp }} / {{ focusedUnit.maxHp }}
          </span>
        </div>

        <div class="stats-panel__bar">
          <div
            class="stats-panel__bar-fill"
            :style="{ width: `${focusedHpPercent}%` }"
          ></div>
        </div>

        <div class="stats-panel__metrics">
          <span
            class="stats-panel__metric"
            v-for="metric in focusedMetrics"
            :key="metric.label"
          >
            <span class="stats-panel__label">{{ metric.label }}</span>
            <span class="stats-panel__value">{{ metric.value }}</span>
          </span>
        </div>
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

const percent = (value, max) =>
  max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

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

const unitCount = computed(() => selectedUnitIds.value.length);

const buildingRows = computed(() =>
  selectedBuilding.value
    ? store.getters["map/getBuildingStats"](selectedBuilding.value.id) ?? []
    : [],
);

// Полные характеристики показываем, когда выбран ровно один юнит
const singleUnitRows = computed(() => {
  if (unitCount.value !== 1) return null;

  return store.getters["map/getStats"](selectedUnitIds.value)[0] ?? null;
});

// Сводка отряда: фиксированный набор строк при любом количестве юнитов
const squad = computed(() =>
  unitCount.value > 1
    ? store.getters["map/getSquadStats"](selectedUnitIds.value)
    : null,
);

const typeSummary = computed(() =>
  squad.value
    ? squad.value.types.map((item) => `${item.label} ×${item.count}`).join(" · ")
    : "",
);

// Строка групп нужна только при смешанном выделении
const groupSummary = computed(() => {
  const groups = squad.value?.groups ?? [];

  if (groups.length < 2) return "";

  return groups.map((item) => `${item.label} ×${item.count}`).join(" · ");
});

const squadHpPercent = computed(() =>
  squad.value ? percent(squad.value.totalHp, squad.value.totalMaxHp) : 0,
);

const squadMetrics = computed(() =>
  squad.value
    ? [
        { label: "Сила", value: squad.value.totalStrength },
        { label: "Скорость", value: squad.value.speed },
        { label: "Атака", value: `${squad.value.attackSpeed}/с` },
      ]
    : [],
);

// Юнит внутри выделения, на которого переключились по Tab
const focusedUnit = computed(() => {
  const id = store.state.game.focusedUnitId;
  if (!id) return null;

  const unit = store.state.map.units.find((item) => item.id === id);
  if (!unit || !selectedUnitIds.value.includes(unit.id)) return null;

  return unit;
});

const focusedIndex = computed(() =>
  focusedUnit.value
    ? selectedUnitIds.value.indexOf(focusedUnit.value.id) + 1
    : 0,
);

const focusedHpPercent = computed(() =>
  focusedUnit.value ? percent(focusedUnit.value.hp, focusedUnit.value.maxHp) : 0,
);

const focusedMetrics = computed(() => {
  const unit = focusedUnit.value;
  if (!unit) return [];

  return [
    { label: "Сила", value: unit.strength },
    { label: "Скорость", value: unit.speed },
    { label: "Атака", value: `${unit.attackSpeed}/с` },
  ];
});

const hasContent = computed(
  () =>
    Boolean(selectedBuilding.value) ||
    Boolean(singleUnitRows.value) ||
    Boolean(squad.value),
);

const title = computed(() => {
  if (selectedBuilding.value) return "Здание";
  if (unitCount.value > 1) return `Выделено юнитов: ${unitCount.value}`;
  return "Юнит";
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
  line-height: 1.45;
  pointer-events: none;
  min-width: clamp(260px, 18vw, 460px);
  max-height: calc(100vh - 190px);
  overflow: hidden;

  &__title {
    margin-bottom: 6px;
    color: #a0d0ff;
    font-weight: 600;
  }

  &__body {
    & + & {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #3a3a3a;
    }
  }

  &__row {
    display: flex;
    justify-content: space-between;
    gap: 1.5vw;
    white-space: nowrap;
  }

  &__label {
    color: #d0d0d0;
  }

  &__value {
    color: #ffffff;
    font-weight: 600;
  }

  &__spawn {
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

  &__bar {
    height: 6px;
    margin: 4px 0 6px;
    background: #c0392b;
    border-radius: 3px;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    background: #3ec46d;
    transition: width 0.2s;
  }

  &__metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1vw;
    margin-top: 4px;
  }

  &__metric {
    display: inline-flex;
    gap: 0.4em;
    white-space: nowrap;
  }

  &__hint {
    margin-top: 6px;
    color: #8a8a8a;
    font-size: 0.8em;
  }

  &__focus {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #3a3a3a;
  }

  &__focus-title {
    display: flex;
    justify-content: space-between;
    gap: 1.5vw;
    color: #a0d0ff;
    font-weight: 600;
  }

  &__focus-index {
    color: #7aa8cc;
    font-weight: 500;
  }
}
</style>
