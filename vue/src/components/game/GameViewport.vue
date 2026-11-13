<template>
  <div
    ref="viewportRef"
    class="game-viewport"
    @contextmenu.prevent="($event) => onRightClick($event)"
    @wheel.prevent="($event) => onWheel($event)"
    @mousedown="($event) => onMouseDown($event)"
    @mousemove="($event) => onMouseMove($event)"
    @mouseup="($event) => onMouseUp($event)"
    @mouseleave="() => onMouseUp()"
  >
    <GameWorld />

    <!-- Хпбары: отдельный слой в экранных координатах, вне изометрии мира.
         Видны только у объектов в фокусе — выделенных юнитов и выбранного здания -->
    <HealthBar
      v-for="unit in focusedUnits"
      :key="'hp' + unit.id"
      :hp="unit.hp"
      :max-hp="unit.maxHp"
      :screen="unit.screen"
      :width="HEALTH_BAR.unitWidth"
      :offset="HEALTH_BAR.unitOffset"
      :style="{ zIndex: Z_INDEX.HEALTH_BAR }"
    />
    <HealthBar
      v-for="b in focusedBuildings"
      :key="'hpb' + b.id"
      :hp="b.hp"
      :max-hp="b.maxHp"
      :screen="b.screen"
      :width="b.width ?? b.size"
      :offset="(b.height ?? b.size) / 4 + HEALTH_BAR.buildingOffset"
      :style="{ zIndex: Z_INDEX.HEALTH_BAR }"
    />

    <BuildPanel />
    <StatsPanel />

    <!-- Рамка выделения — рисуется поверх всего в экранных координатах -->
    <div
      v-if="selectionRect"
      class="game-viewport__selection"
      :style="selectionStyle"
    ></div>
    <div class="game-viewport__topbar">
      <div class="game-viewport__game-info">
        <span class="game-viewport__game-title">
          {{ currentScenario?.name || "RTS Simulator" }}
        </span>
      </div>

      <div class="game-viewport__game-actions">
        <button class="game-viewport__action" @click="togglePause">
          {{ isPaused ? "Продолжить" : "Пауза" }}
        </button>

        <button class="game-viewport__action" @click="openScenarioMenu">
          Новая игра
        </button>
      </div>
    </div>
    <div
      v-if="showScenarioMenu"
      class="game-viewport__overlay game-viewport__overlay--start"
    >
      <div class="game-viewport__menu">
        <h2 class="game-viewport__menu-title">Новая игра</h2>
        <p class="game-viewport__menu-text">Выберите сценарий</p>

        <select v-model="selectedScenarioId" class="game-viewport__select">
          <option
            v-for="scenario in SCENARIOS"
            :key="scenario.id"
            :value="scenario.id"
          >
            {{ scenario.name }}
          </option>
        </select>

        <button
          class="game-viewport__action game-viewport__action--primary"
          @click="startScenario()"
        >
          Начать игру
        </button>
      </div>
    </div>
    <div v-if="isPaused && !showScenarioMenu" class="game-viewport__overlay">
      <div class="game-viewport__menu">
        <h2 class="game-viewport__menu-title">Пауза</h2>

        <button
          class="game-viewport__action game-viewport__action--primary"
          @click="resumeGame"
        >
          Продолжить
        </button>

        <button
          class="game-viewport__action"
          @click="startScenario(currentScenarioId)"
        >
          Перезапустить сценарий
        </button>

        <button class="game-viewport__action" @click="openScenarioMenu">
          Выбрать сценарий
        </button>
      </div>
    </div>
    <div class="game-viewport__controls" :style="controlsStyle">
      <div class="game-viewport__row">
        <span class="game-viewport__key">↑ ↓ ← → / WASD</span>
        <span class="game-viewport__desc">Камера</span>
      </div>
      <div class="game-viewport__row">
        <span class="game-viewport__key">Колесо</span>
        <span class="game-viewport__desc">Зум</span>
      </div>
      <div class="game-viewport__row">
        <span class="game-viewport__key">ЛКМ</span>
        <span class="game-viewport__desc">Выбрать / поставить</span>
      </div>
      <div class="game-viewport__row">
        <span class="game-viewport__key">ЛКМ + drag</span>
        <span class="game-viewport__desc">Выделить группу</span>
      </div>
      <div class="game-viewport__row">
        <span class="game-viewport__key">ПКМ</span>
        <span class="game-viewport__desc">Идти / атаковать</span>
      </div>
      <div class="game-viewport__row">
        <span class="game-viewport__key">Shift + ПКМ</span>
        <span class="game-viewport__desc">Точка маршрута</span>
      </div>
      <div class="game-viewport__row">
        <span class="game-viewport__key">Tab / Shift + Tab</span>
        <span class="game-viewport__desc">Перебор юнитов</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import GameWorld from "./GameWorld.vue";
import BuildPanel from "./BuildPanel.vue";
import StatsPanel from "./StatsPanel.vue";
import HealthBar from "./HealthBar.vue";
import { useGameLoop } from "@/composables/useGameLoop";
import { Z_INDEX, HEALTH_BAR } from "@/config/game";
import { SCENARIOS } from "@/config/scenarios";

const store = useStore();
const selectedScenarioId = ref(SCENARIOS[0].id);
const currentScenarioId = ref(null);

const showScenarioMenu = ref(true);
const showPauseMenu = ref(false);

const currentScenario = computed(() =>
  SCENARIOS.find((item) => item.id === selectedScenarioId.value),
);

const startScenario = (scenarioId = selectedScenarioId.value) => {
  const scenario = SCENARIOS.find((item) => item.id === scenarioId);

  if (!scenario) return;

  selectedScenarioId.value = scenario.id;
  currentScenarioId.value = scenario.id;

  store.dispatch("events/clearEvents");
  store.dispatch("game/resetForScenario");
  store.dispatch("map/loadScenario", scenario);

  showScenarioMenu.value = false;
  showPauseMenu.value = false;
};

const togglePause = () => {
  store.dispatch("game/togglePause");
};

const openScenarioMenu = () => {
  store.dispatch("game/setPaused", true);
  showScenarioMenu.value = true;
  showPauseMenu.value = false;
};

const resumeGame = () => {
  store.dispatch("game/setPaused", false);
  showPauseMenu.value = false;
};

const viewportRef = ref(null);

const isPaused = computed(() => store.state.game.isPaused);

// Пересчёт кадра целиком выполняется в сторе
useGameLoop((dt) => {
  store.dispatch("frame/run", dt);
});

const getScreenPoint = (event) => {
  const rect = viewportRef.value.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

// Ввод -> события кадра
const getGameKey = (event) => {
  if (event.code.startsWith("Key")) {
    return event.code.slice(3).toLowerCase();
  }

  return event.key;
};

// Элементы форм не перехватываем: в них Tab — навигация по интерфейсу
const isFormElement = (element) =>
  Boolean(element?.closest?.("input, select, textarea"));

const onKeyDown = (event) => {
  if (event.key === "Tab" && !isFormElement(event.target)) {
    event.preventDefault();
    store.dispatch("game/focusUnit", event.shiftKey ? -1 : 1);
    return;
  }

  store.dispatch("events/keyDown", getGameKey(event));
};

const onKeyUp = (event) => {
  store.dispatch("events/keyUp", getGameKey(event));
};

const onMouseDown = (event) => {
  if (event.button !== 0) return;
  store.dispatch("events/startDrag", getScreenPoint(event));
};

const onMouseMove = (event) => {
  const point = getScreenPoint(event);
  store.dispatch("events/updateCursor", point);
  store.dispatch("events/updateDrag", point);
};

// Отпускание ЛКМ завершает выделение; ПКМ и mouseleave выделение не трогают
const onMouseUp = (event) => {
  if (event && event.button !== 0) return;
  store.dispatch("events/endDrag");
};

const onRightClick = (event) => {
  store.dispatch("events/moveSelected", {
    cursor: getScreenPoint(event),
    isShift: event.shiftKey,
  });
};

const onWheel = (event) => {
  store.dispatch("events/wheel", {
    cursor: getScreenPoint(event),
    deltaY: event.deltaY,
  });
};

// Отрисовка состояния из стора
const units = computed(() => store.state.map.units);
const buildings = computed(() => store.state.map.buildings);
// Игровое время кадра — зависимость для автоскрытия хпбара после урона
const gameFrame = computed(() => store.state.game.frame);

// Хпбар виден, если объект в фокусе (выделен) или недавно получал урон
const isBarVisible = (object, isFocused) => {
  if (isFocused) return true;
  if (object.damagedAt === null) return false;
  return (
    (gameFrame.value.time - object.damagedAt) * 1000 <
    HEALTH_BAR.damageVisibleMs
  );
};

const focusedUnits = computed(() => {
  const ids = store.state.game.selectedUnitIds;
  return units.value.filter((u) => isBarVisible(u, ids.includes(u.id)));
});

const focusedBuildings = computed(() => {
  const id = store.state.game.selectedBuildingId;
  return buildings.value.filter((b) => isBarVisible(b, b.id === id));
});

const selectionRect = computed(() => store.getters["game/getSelectionRect"]);
const selectionStyle = computed(() => ({
  left: `${selectionRect.value.x1}px`,
  top: `${selectionRect.value.y1}px`,
  width: `${selectionRect.value.x2 - selectionRect.value.x1}px`,
  height: `${selectionRect.value.y2 - selectionRect.value.y1}px`,
  zIndex: Z_INDEX.SELECTION_RECT,
}));

const controlsStyle = { zIndex: Z_INDEX.CONTROLS_PANEL };

const updateViewport = () => {
  const rect = viewportRef.value.getBoundingClientRect();
  store.dispatch("game/setViewport", {
    width: rect.width,
    height: rect.height,
  });
};

onMounted(() => {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", updateViewport);
  updateViewport();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("resize", updateViewport);
});
</script>

<style scoped lang="scss">
.game-viewport {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #c0c0c0;
  user-select: none;
  cursor: crosshair;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  &__selection {
    position: absolute;
    border: 2px solid rgba(80, 180, 255, 0.9);
    background: rgba(80, 180, 255, 0.18);
    pointer-events: none;
  }

  &__controls {
    position: absolute;
    top: 90px;
    right: 24px;
    padding: 1vw 1.3vw;
    background: rgba(15, 15, 15, 0.82);
    color: #e8e8e8;
    border-radius: 10px;
    font-size: clamp(16px, 0.9vw, 27px);
    line-height: 1.75;
    min-width: clamp(300px, 18.5vw, 480px);
    pointer-events: none;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  }

  &__row {
    display: flex;
    justify-content: space-between;
    gap: 1.2vw;
    white-space: nowrap;
  }

  &__key {
    color: #a0d0ff;
    font-weight: 600;
  }

  &__desc {
    color: #d0d0d0;
  }

  &__topbar {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(15, 15, 15, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: #e8e8e8;
    z-index: 100;
  }

  &__game-title {
    font-size: 17px;
    font-weight: 600;
  }

  &__game-actions {
    display: flex;
    gap: 8px;
  }

  &__action {
    padding: 9px 14px;
    border: 1px solid #555;
    border-radius: 7px;
    background: #252525;
    color: #e8e8e8;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      background: #414141;
    }

    &--primary {
      background: #315779;
      border-color: #6b9bc8;

      &:hover {
        background: #3d719e;
      }
    }
  }

  &__overlay {
    position: absolute;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.45);
    pointer-events: auto;

    &--start {
      align-items: flex-start;
      justify-content: center;
      padding-top: 100px;
    }
  }

  &__menu {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: min(380px, calc(100% - 32px));
    padding: 28px;
    background: #202020;
    border: 1px solid #555;
    border-radius: 12px;
    color: #e8e8e8;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  &__menu-title {
    margin: 0;
    font-size: 24px;
  }

  &__menu-text {
    margin: 0;
    color: #aaa;
  }

  &__select {
    width: 100%;
    padding: 11px;
    border: 1px solid #555;
    border-radius: 7px;
    background: #303030;
    color: #eee;
    font-size: 15px;
  }
}
</style>
