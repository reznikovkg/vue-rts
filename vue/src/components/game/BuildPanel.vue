<template>
  <div class="build-panel">
    <div class="build-panel__title">Стройка</div>

    <!-- кнопка на каждый тип здания; повторное нажатие отменяет стройку -->
    <button
      v-for="(type, key) in BUILDING_TYPES"
      :key="key"
      type="button"
      class="build-panel__item"
      :class="{ 'build-panel__item--active': placement?.type === key }"
      @click="bus.emit(EVENTS.BUILD_START, key)"
    >
      <span>{{ type.name }}</span>
      <span class="build-panel__size">{{ type.size }}×{{ type.size }}</span>
    </button>

    <div class="build-panel__title">Корабли</div>
    <button
      v-for="(type, key) in ships"
      :key="key"
      type="button"
      class="build-panel__item"
      :class="{ 'build-panel__item--active': placement?.type === key }"
      @click="bus.emit(EVENTS.BUILD_START, key)"
    >
      <span>{{ type.name }}</span>
      <span class="build-panel__size">{{ type.size }}</span>
    </button>

    <div class="build-panel__hint">
      <template v-if="placement">ЛКМ - поставить<br>Shift + ЛКМ - еще одно<br>ПКМ / Esc - отмена</template>
      <template v-else>Выберите здание</template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { BUILDING_TYPES, UNIT_TYPES } from '@/game/entities'

const store = useStore()
const placement = computed(() => store.getters['game/getPlacement'])
const ships = Object.fromEntries(Object.entries(UNIT_TYPES).filter(([, type]) => type.ship))
</script>

<style scoped lang="scss">
.build-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 150px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 9px;
  background: rgba(17, 22, 27, 0.92);
  color: #e6e6e6;
  font-size: 13px;
  box-shadow: 0 4px 22px rgba(0, 0, 0, 0.32);

  &__title {
    font-size: 15px;
    font-weight: bold;
  }

  &__item {
    display: flex;
    justify-content: space-between;
    padding: 6px 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    color: inherit;
    background: #222a31;
    font: inherit;
    cursor: pointer;

    &:hover {
      background: #2d3740;
    }

    &--active {
      border-color: #71d4a0;
      background: #1f3a2d;
    }
  }

  &__size {
    color: #9aa7b2;
  }

  &__hint {
    color: #9aa7b2;
    font-size: 12px;
    line-height: 1.4;
  }
}
</style>
