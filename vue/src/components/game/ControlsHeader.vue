<template>
  <div class="controls-header">
    <div class="controls-header__row">
      <strong>RTS</strong>
      <span>Сценарий: {{ scenario }}</span>
      <span v-if="isPaused" class="controls-header__paused">Пауза</span>
    </div>

    <div class="controls-header__row">
      <button
        class="controls-header__button"
        type="button"
        @click="togglePause"
      >
        {{ isPaused ? 'Продолжить' : 'Пауза' }}
      </button>
      <button
        v-for="name in scenarios"
        :key="name"
        class="controls-header__button"
        type="button"
        @click="startScenario(name)"
      >
        {{ name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

defineProps<{
  scenario?: string
}>()

const scenarios = ['skirmish', 'crossfire']
const store = useStore()
const isPaused = computed(() => store.state.game.isPaused as boolean)

const togglePause = () => {
  store.commit('events/enqueue', {
    type: 'pause',
    isPaused: !isPaused.value,
  })
}

const startScenario = (name: string) => {
  store.commit('events/enqueue', {
    type: 'scenario',
    name,
  })
}

</script>

<style scoped lang="scss">
.controls-header {
  position: absolute;
  right: 20px;
  top: 20px;
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(16, 24, 32, 0.86);
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 14px;
  z-index: 10000;
}


.controls-header__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.controls-header__paused {
  color: #e0b23c;
  font-weight: 700;
}

.controls-header__button {
  padding: 6px 9px;
  border: 0;
  border-radius: 5px;
  background: #2b3b4b;
  color: #fff;
  cursor: pointer;
  font-family: Arial, sans-serif;
}

</style>
