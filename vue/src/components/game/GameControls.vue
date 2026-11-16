<template>
  <div class="game-controls">
    <div class="game-controls__title">Строительство</div>

    <div class="game-controls__row">
      <button
        v-for="(definition, type) in buildingTypes"
        :key="type"
        class="game-controls__button"
        :class="{ 'game-controls__button--active': buildMode === type }"
        type="button"
        @click="startBuild(type)"
      >
        {{ definition.name }} {{ definition.size }}×{{ definition.size }}
      </button>
    </div>

    <div v-if="buildMode" class="game-controls__hint">
      Выберите свободную клетку на карте.
      <button
        class="game-controls__cancel"
        type="button"
        @click="cancelBuild"
      >
        Отмена
      </button>
    </div>

    <div class="game-controls__title game-controls__title--actions">
      Действия
    </div>

    <div class="game-controls__row">
      <ControlsSelfDestruct />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILDING_TYPES } from '@/store/game/buildings'
import ControlsSelfDestruct from './ControlsSelfDestruct.vue'

const store = useStore()

const buildingTypes = BUILDING_TYPES
const buildMode = computed(() => store.state.game.buildMode as string | null)

const startBuild = (type: string) => {
  store.commit('events/enqueue', {
    type: 'buildMode',
    buildingType: buildMode.value === type ? null : type,
  })
}

const cancelBuild = () => {
  store.commit('events/enqueue', {
    type: 'buildMode',
    buildingType: null,
  })
}
</script>

<style scoped lang="scss">
.game-controls {
  position: absolute;
  left: 20px;
  bottom: 20px;
  width: 360px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(16, 24, 32, 0.92);
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 13px;
  z-index: 10000;
}

.game-controls__title {
  margin-bottom: 8px;
  font-weight: 700;

  &--actions {
    margin-top: 12px;
  }
}

.game-controls__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.game-controls__button {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: #2b3b4b;
  color: #fff;
  cursor: pointer;
  font-family: Arial, sans-serif;

  &--active {
    border-color: #ffffff;
    background: #3d5f82;
  }
}

.game-controls__hint {
  margin-top: 8px;
  color: #d8e4ef;
}

.game-controls__cancel {
  margin-left: 8px;
  padding: 5px 8px;
  border: 0;
  border-radius: 5px;
  background: #6c4b4b;
  color: #fff;
  cursor: pointer;
}
</style>
