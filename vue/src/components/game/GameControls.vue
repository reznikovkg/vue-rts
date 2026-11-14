<template>
  <div class="game-controls">
    <div v-if="!started" class="game-controls__banner game-controls__banner--menu">
      <div>Выберите сценарий</div>
      <button
          v-for="s in scenarios"
          :key="s.id"
          class="game-controls__button"
          @mousedown.prevent
          @click="() => startScenario(s.id)">
        {{ s.name }}
      </button>
    </div>

    <template v-else>
      <div class="game-controls__bar">
        <button v-if="!isGameOver" class="game-controls__button" @mousedown.prevent @click="() => togglePause()">
          {{ paused ? 'Продолжить' : 'Пауза' }}
        </button>
        <button class="game-controls__button" @mousedown.prevent @click="() => startScenario(scenarioId)">Перезапуск</button>
        <button class="game-controls__button" @mousedown.prevent @click="() => openMenu()">Меню</button>
      </div>

      <div v-if="paused && !isGameOver" class="game-controls__banner">Пауза</div>

      <div v-if="isGameOver" class="game-controls__banner game-controls__banner--menu">
        <div>Игра окончена</div>
        <div v-if="winner">Победила группа {{ winner }}</div>
        <div v-else>Ничья: на карте никого не осталось</div>
        <button class="game-controls__button" @mousedown.prevent @click="() => startScenario(scenarioId)">Начать заново</button>
        <button class="game-controls__button" @mousedown.prevent @click="() => openMenu()">Меню</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { SCENARIOS } from '@/game/scenarios'

const store = useStore()
const scenarios = SCENARIOS
const started = computed<boolean>(() => store.getters['game/getStarted'])
const paused = computed<boolean>(() => store.getters['game/getPaused'])
const scenarioId = computed<string>(() => store.getters['game/getScenarioId'])
const isGameOver = computed<boolean>(() => store.getters['game/isGameOver'])
const winner = computed<number | null>(() => store.getters['game/getWinner'])

const togglePause = () => {
  store.dispatch('game/togglePause')
}

const startScenario = (id: string) => {
  store.dispatch('game/loadScenario', id)
}

const openMenu = () => {
  store.dispatch('game/openMenu')
}

// пауза на пробел
const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Space' && !e.repeat && started.value && !isGameOver.value) {
    e.preventDefault()
    togglePause()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.game-controls {
  position: absolute;
  inset: 0;
  pointer-events: none;

  &__bar {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    gap: 8px;
    pointer-events: auto;
  }

  &__button {
    padding: 6px 12px;
    border: 0;
    border-radius: $button-radius;
    background: $panel-background;
    color: $panel-text-color;
    cursor: pointer;

    &:hover {
      background: $panel-background-hover;
    }
  }

  &__banner {
    position: absolute;
    top: 40%;
    left: 50%;
    padding: 16px 28px;
    transform: translate(-50%, -50%);
    border-radius: $banner-radius;
    background: $banner-background;
    color: $panel-text-color;
    font-size: 24px;
    text-align: center;

    &--menu {
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: auto;
    }
  }
}
</style>
