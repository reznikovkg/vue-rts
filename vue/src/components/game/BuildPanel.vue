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
    <div v-if="buildType?.type === 'ship'" class="build-panel__orientation">
      <button
        class="build-panel__orientation-btn"
        :class="{ 'build-panel__orientation-btn--active': buildOrientation === 'vertical' }"
        @click.stop="store.dispatch('game/setBuildOrientation', 'vertical')"
      >
        1×2
      </button>

      <button
        class="build-panel__orientation-btn"
        :class="{ 'build-panel__orientation-btn--active': buildOrientation === 'horizontal' }"
        @click.stop="store.dispatch('game/setBuildOrientation', 'horizontal')"
      >
        2×1
      </button>
    </div>
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
const buildType = computed(() => store.state.game.buildType);
const buildOrientation = computed(() => store.state.game.buildOrientation);
const groupColor = computed(() => groupById(buildGroup.value).color);

const isActive = (type) => store.state.game.buildType === type;

const itemStyle = (type) => {
  let width = type.width ?? type.size;
  let height = type.height ?? type.size;

  if (type.type === "ship" && buildOrientation.value === "horizontal") {
    [width, height] = [height, width];
  }

  return {
    "--icon-width": `${width * BUILD_ICON_TILE}px`,
    "--icon-height": `${height * BUILD_ICON_TILE}px`,
    "--icon-color": groupColor.value,
  };
};

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

  &__title {
    margin-bottom: 8px;
    color: #a0d0ff;
    font-size: clamp(14px, 0.9vw, 22px);
    font-weight: 600;
  }

  &__groups {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  &__group {
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

    &--active,
    &--active:hover {
      opacity: 1;
      box-shadow: 0 0 0 2px #a0d0ff;
    }
  }

  &__item {
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
      width: var(--icon-width);
      height: var(--icon-height);
      background: var(--icon-color);
      border: 1px solid #1a1a1a;
    }

    &:hover {
      background: #2c2c2c;
    }

    &--active,
    &--active:hover {
      border-color: #a0d0ff;
      background: #1b3550;
    }
  }

  &__size {
    margin-left: auto;
    color: #909090;
    font-size: 0.85em;
  }

  &__orientation {
    display: flex;
    gap: 8px;
    margin-top: 8px;

    &-btn {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid #3a3a3a;
      border-radius: 6px;
      background: #202020;
      color: #e8e8e8;
      cursor: pointer;

      &:hover {
        background: #2c2c2c;
      }

      &--active,
      &--active:hover {
        border-color: #a0d0ff;
        background: #1b3550;
      }
    }
  }
}
</style>
