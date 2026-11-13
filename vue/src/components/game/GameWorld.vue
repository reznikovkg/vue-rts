<template>
  <div class="game-world" :style="worldStyle">
    <div class="game-world__outer-ground"></div>
    <div class="game-world__ground" :style="groundStyle"></div>

    <TerrainLayer />

    <!-- Маршрут юнита: прерывистая линия до конца пути. Рисуется только пока маршрут есть -->
    <template v-for="route in unitRoutes" :key="'p' + route.id">
      <div
        v-for="(segment, index) in route.segments"
        :key="'p' + route.id + '-' + index"
        class="game-world__path-line"
        :style="segment"
      ></div>
    </template>

    <div
      v-if="ghost"
      class="game-world__ghost"
      :class="{ 'game-world__ghost--invalid': !ghost.valid }"
      :style="ghostStyle"
    ></div>

    <!-- Здания -->
    <BuildingItem
      v-for="b in buildings"
      :key="b.id"
      :building="b"
    />

    <!-- Водные юниты: под мостом -->
    <UnitItem
      v-for="unit in waterUnits"
      :key="unit.id"
      :unit="unit"
    />

    <!-- Верхняя часть моста -->
    <BridgeTopLayer />

    <!-- Наземные юниты: поверх моста -->
    <UnitItem
      v-for="unit in landUnits"
      :key="unit.id"
      :unit="unit"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import UnitItem from './UnitItem.vue';
import BuildingItem from './BuildingItem.vue';
import {
  GRID_STEP,
  MAP_SIZE,
  ISO_ROTATION_DEG,
  ISO_SCALE_Y,
  Z_INDEX
} from '@/config/game';
import TerrainLayer from './terrain/TerrainLayer.vue';
import BridgeTopLayer from './terrain/BridgeTopLayer.vue';

const store = useStore();
const units = computed(() => store.state.map.units);
const buildings = computed(() => store.state.map.buildings);

const waterUnits = computed(() =>
  units.value.filter((unit) => unit.movementType === 'water')
);

const landUnits = computed(() =>
  units.value.filter((unit) => unit.movementType !== 'water')
);

// Оставшийся маршрут каждого юнита в виде отрезков для отрисовки.
const unitRoutes = computed(() => {
  const getPathSegments = store.getters['map/getPathSegments'];

  return units.value
    .filter((unit) => unit.target || (unit.path && unit.path.length > 0))
    .map((unit) => ({ id: unit.id, segments: getPathSegments(unit) }))
    .filter((route) => route.segments.length > 0);
});

const worldStyle = computed(() => {
  const { viewport, camera } = store.state.game;
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  return {
    transform:
      `translate(${cx}px, ${cy}px) ` +
      `scale(${camera.zoom}) ` +
      `scale(1, ${ISO_SCALE_Y}) ` +
      `rotate(${ISO_ROTATION_DEG}deg) ` +
      `translate(${-camera.x}px, ${-camera.y}px)`
  };
});

const groundStyle = computed(() => ({
  left:   `${-MAP_SIZE / 2}px`,
  top:    `${-MAP_SIZE / 2}px`,
  width:  `${MAP_SIZE}px`,
  height: `${MAP_SIZE}px`,
  backgroundSize: `${GRID_STEP}px ${GRID_STEP}px`
}));

// Призрак здания под курсором в режиме строительства
const ghost = computed(() => {
  const type = store.state.game.buildType;
  if (!type) return null;

  const horizontal =
    type.type === 'ship' &&
    store.state.game.buildOrientation === 'horizontal';

  const orientedType = horizontal
    ? { ...type, width: type.height, height: type.width }
    : type;

  return store.getters['map/getGhost'](
    store.getters['game/getCursorWorld'],
    orientedType
  );
});

const ghostStyle = computed(() => {
  const g = ghost.value;
  if (!g) return {};

  return {
    left: `${g.x - g.width / 2}px`,
    top: `${g.y - g.height / 2}px`,
    width: `${g.width}px`,
    height: `${g.height}px`,
    zIndex: Z_INDEX.GHOST
  };
});
</script>

<style scoped lang="scss">
.game-world {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-origin: 0 0;
  will-change: transform;

  &__outer-ground {
    position: absolute;
    left: -20000px;
    top: -20000px;
    width: 40000px;
    height: 40000px;
    background: #c0c0c0;
    pointer-events: none;
  }

  &__ground {
    position: absolute;
    background-color: #557747;
    background-image:
      radial-gradient(ellipse at 20% 30%, rgba(139, 160, 91, 0.28) 0%, transparent 38%),
      radial-gradient(ellipse at 75% 65%, rgba(35, 83, 43, 0.25) 0%, transparent 42%),
      radial-gradient(ellipse at 45% 85%, rgba(173, 157, 94, 0.16) 0%, transparent 35%),
      repeating-radial-gradient(
        circle at 30% 40%,
        rgba(255, 255, 255, 0.025) 0px,
        rgba(255, 255, 255, 0.025) 2px,
        transparent 3px,
        transparent 7px
      );
    border: 1px solid rgba(0, 0, 0, 0.6);
    box-sizing: border-box;
    pointer-events: none;
  }

  &__path-line {
    position: absolute;
    height: 0;
    border-top: 2px dashed rgba(255, 220, 80, 0.65);
    pointer-events: none;
  }

  &__ghost {
    position: absolute;
    background: rgba(110, 220, 130, 0.35);
    border: 2px solid rgba(80, 200, 100, 0.9);
    box-sizing: border-box;
    pointer-events: none;

    &--invalid {
      background: rgba(230, 90, 90, 0.35);
      border-color: rgba(220, 70, 70, 0.9);
    }
  }
}
</style>