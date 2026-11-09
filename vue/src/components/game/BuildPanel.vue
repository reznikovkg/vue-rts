<template>
  <div class="build-panel" :style="style">
    <div class="build-panel__title">Стройка</div>

    <!-- Чья постройка: свои или вражеские -->
    <div class="build-panel__groups">
      <button
        v-for="g in groups"
        :key="g.id"
        class="build-panel__group"
        :class="{ 'build-panel__group--active': g.id === buildGroup }"
        :style="{ background: g.color }"
        :title="g.label"
        @click.stop="() => store.dispatch('events/setBuildGroup', g.id)"
      ></button>
    </div>

    <button
      v-for="type in types"
      :key="type.type"
      class="build-panel__item"
      :class="{ 'build-panel__item--active': isActive(type) }"
      :style="itemStyle(type)"
      @click.stop="() => onPick(type)"
    >
      {{ type.label }}
      <span class="build-panel__size">{{ type.size }}x{{ type.size }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useStore } from "vuex";
import {
  BUILDING_TYPES,
  BUILD_ICON_TILE,
  Z_INDEX,
  GROUP_LIST,
  groupById,
} from "@/config/game";

const store = useStore();
const types = BUILDING_TYPES;
const groups = GROUP_LIST;
const style = { zIndex: Z_INDEX.BUILD_PANEL };

// Группа, от имени которой ставится здание
const buildGroup = computed(() => store.state.game.buildGroup);
const groupColor = computed(() => groupById(buildGroup.value).color);

const isActive = (type) => store.state.game.buildType === type;

// Иконка — квадрат NxN клеток в масштабе панели, окрашен в цвет выбранной группы
const itemStyle = (type) => ({
  "--icon-size": `${type.size * BUILD_ICON_TILE}px`,
  "--icon-color": groupColor.value,
});

const onPick = (type) => store.dispatch("events/pickBuilding", type);
</script>

<style scoped lang="scss">
.build-panel {
  position: absolute;
  left: 24px;
  top: 90px;
  padding: 1vw 1vw 1.2vw;
  background: rgba(15, 15, 15, 0.82);
  color: #e8e8e8;
  border-radius: 10px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.build-panel__title {
  margin-bottom: 8px;
  color: #a0d0ff;
  font-size: clamp(14px, 0.9vw, 22px);
  font-weight: 600;
}

.build-panel__groups {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.build-panel__group {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid #1a1a1a;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0.45;

  &:hover {
    opacity: 0.8;
  }

  &.build-panel__group--active {
    opacity: 1;
    box-shadow: 0 0 0 2px #a0d0ff;
  }
}

.build-panel__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 6px;
  padding: 8px 12px;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  background: #202020;
  color: #e8e8e8;
  font: inherit;
  cursor: pointer;

  &::before {
    content: "";
    width: var(--icon-size);
    height: var(--icon-size);
    background: var(--icon-color);
    border: 1px solid #1a1a1a;
  }

  &:hover {
    background: #2c2c2c;
  }

  &.build-panel__item--active {
    border-color: #a0d0ff;
    background: #1b3550;
  }
}

.build-panel__size {
  margin-left: auto;
  color: #909090;
  font-size: 0.85em;
}
</style>
