<template>
  <div class="build-panel">
    <div class="build-panel__title">Стройка</div>
    <select :value="buildGroupId" class="build-panel__group" aria-label="Клан для строительства" @change="onGroupChange">
      <option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name }}</option>
    </select>

    <!-- кнопки по разделам: здания и лодки; повторное нажатие отменяет стройку -->
    <template v-for="section in sections" :key="section.title">
      <div class="build-panel__title">{{ section.title }}</div>
      <button
        v-for="item in section.items"
        :key="item.key"
        type="button"
        class="build-panel__item"
        :class="item.classes"
        :style="item.style"
        :disabled="finished"
        @click="onBuildClick(item.key)"
      >
        <!-- значок цвета выбранного клана: кубик здания или корпус лодки -->
        <svg class="build-panel__icon" viewBox="0 0 20 20">
          <polygon v-if="item.ship" points="1,10 5,6 15,6 19,10 15,14 5,14" class="build-panel__icon-roof" />
          <template v-else>
            <polygon points="2,7 10,11 10,18 2,14" class="build-panel__icon-left" />
            <polygon points="18,7 10,11 10,18 18,14" class="build-panel__icon-right" />
            <polygon points="10,3 18,7 10,11 2,7" class="build-panel__icon-roof" />
          </template>
        </svg>
        <span class="build-panel__name">{{ item.name }}</span>
        <span class="build-panel__size">{{ item.size }}</span>
      </button>
    </template>

    <div class="build-panel__hint">
      <template v-if="placement">ЛКМ - поставить<br>Shift + ЛКМ - еще одно<br>ПКМ / Esc - отмена</template>
      <template v-else>Выберите здание</template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILDING_TYPES, UNIT_TYPES } from '@/game/entities'
import { colorOf } from '@/game/groups'
import { PHASES } from '@/store/game'

const props = defineProps({
  actions: { type: Object, required: true },
})

const store = useStore()
const groups = computed(() => store.state.game.groups)
const buildGroupId = computed(() => store.state.game.buildGroupId)
const buildGroup = computed(() => store.getters['game/getGroup'](buildGroupId.value))
const finished = computed(() => store.state.game.phase === PHASES.FINISHED)
const placement = computed(() => store.getters['game/getPlacement'])

const toItem = (key, type) => ({
  key,
  name: type.name,
  ship: !!type.ship,
  size: type.ship ? type.size : `${type.size}×${type.size}`,
  classes: { 'build-panel__item--active': placement.value?.type === key },
  style: { '--color': colorOf(buildGroup.value) },
})

const sections = computed(() => [
  {
    title: 'Здания',
    items: Object.entries(BUILDING_TYPES).map(([key, type]) => toItem(key, type)),
  },
  {
    title: 'Лодки',
    items: Object.entries(UNIT_TYPES).filter(([, type]) => type.ship).map(([key, type]) => toItem(key, type)),
  },
])

const onGroupChange = (e) => store.dispatch('game/setBuildGroup', e.target.value)
const onBuildClick = (key) => props.actions.startPlacement(key)
</script>

<style scoped lang="scss">
@use '@/assets/game-ui' as ui;

.build-panel {
  @include ui.panel;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 140px;
  padding: 7px;

  &__title {
    @include ui.title;
    margin-top: 4px;
  }

  &__group {
    @include ui.button;
  }

  &__item {
    @include ui.button;
    display: flex;
    align-items: center;
    gap: 6px;
    text-align: left;

    &--active {
      border-color: ui.$accent;
      box-shadow: 0 0 0 1px ui.$accent, 0 0 10px rgba(127, 209, 193, 0.45);
    }
  }

  &__icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;

    polygon {
      stroke: rgba(0, 0, 0, 0.6);
      stroke-width: 0.8;
    }
  }

  &__icon-left {
    fill: color-mix(in srgb, var(--color), #000 22%);
  }

  &__icon-right {
    fill: color-mix(in srgb, var(--color), #000 42%);
  }

  &__icon-roof {
    fill: color-mix(in srgb, var(--color), #fff 12%);
  }

  &__name {
    flex: 1;
  }

  &__size {
    color: ui.$muted;
    font-size: 12px;
  }

  &__hint {
    margin-top: 4px;
    color: ui.$muted;
    font-size: 12px;
    line-height: 1.4;
  }
}
</style>
