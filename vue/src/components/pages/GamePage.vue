<template>
  <div class="game-page">
    <GameField />
    <BuildPanel class="game-page__build" />

    <div class="game-page__toolbar">
      <div class="game-page__title">Сценарий</div>
      <div class="game-page__controls">
        <select v-model="chosenScenario" aria-label="Выбрать сценарий">
          <option v-for="scenario in SCENARIOS" :key="scenario.id" :value="scenario.id">
            {{ scenario.name }} · {{ scenario.groupCount }} гр.
          </option>
        </select>
        <button type="button" @click="loadScenario">Загрузить</button>
      </div>
      <div class="game-page__controls">
        <button
          type="button"
          class="game-page__primary"
          :disabled="phase === PHASES.FINISHED"
          @click="store.dispatch('game/togglePause')"
        >
          {{ phase === PHASES.RUNNING ? 'Пауза' : phase === PHASES.PAUSED ? 'Продолжить' : 'Запустить' }}
        </button>
        <button type="button" @click="store.dispatch('game/loadScenario', scenarioId)">Заново</button>
      </div>
      <div class="game-page__info">
        {{ phaseLabel }} · {{ timeLabel }} <span class="game-page__shortcut">Пробел — пауза</span>
      </div>
      <div class="game-page__divider"></div>
      <div class="game-page__title">Группы</div>
      <div v-for="group in groups" :key="group.id" class="game-page__group" :class="{ 'game-page__group--eliminated': !groupCounts[group.id]?.total }">
        <i class="game-page__dot" :style="{ background: group.color }"></i>
        <span>{{ group.name }}</span>
        <span class="game-page__count">{{ groupCounts[group.id]?.units }} бойц. · {{ groupCounts[group.id]?.buildings }} зд.</span>
      </div>
    </div>

    <div v-if="phase === PHASES.FINISHED" class="game-page__result">
      <div class="game-page__result-title">Игра окончена</div>
      <div v-if="winner" class="game-page__winner">
        <i class="game-page__dot" :style="{ background: winner.color }"></i>
        Победила {{ winner.name.toLowerCase() }}
      </div>
      <div v-else class="game-page__winner">Ничья — все группы уничтожены</div>
      <button type="button" class="game-page__primary" @click="store.dispatch('game/loadScenario', scenarioId)">
        Играть заново
      </button>
    </div>

    <SelectionPanel class="game-page__panel" />
    <RouterLink class="game-page__exit" :to="{ name: $routes.INDEX }">Выход</RouterLink>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useStore } from 'vuex'
import BuildPanel from '@/components/game/BuildPanel.vue'
import GameField from '@/components/game/GameField.vue'
import SelectionPanel from '@/components/game/SelectionPanel.vue'
import { SCENARIOS } from '@/game/scenarios'
import { PHASES } from '@/store/game'
import { isBuilding, isUnit } from '@/game/entities'
import { useGameEvents } from '@/composables/useGameEvents'

const store = useStore()
const chosenScenario = ref(store.state.game.scenarioId)
const scenarioId = computed(() => store.state.game.scenarioId)
const phase = computed(() => store.state.game.phase)
const groups = computed(() => store.state.game.groups)
const winner = computed(() => groups.value.find((group) => group.id === store.state.game.winnerGroupId))
const groupCounts = computed(() => Object.fromEntries(groups.value.map((group) => {
  const entities = store.state.game.entities.filter((entity) => entity.groupId === group.id)
  return [group.id, {
    units: entities.filter(isUnit).length,
    buildings: entities.filter(isBuilding).length,
    total: entities.length,
  }]
})))
const phaseLabel = computed(() => ({
  [PHASES.READY]: 'Подготовка',
  [PHASES.RUNNING]: 'Идёт бой',
  [PHASES.PAUSED]: 'Пауза',
  [PHASES.FINISHED]: 'Завершено',
})[phase.value])
const timeLabel = computed(() => {
  const time = Math.floor(store.state.game.elapsedSeconds)
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`
})
const loadScenario = () => store.dispatch('game/loadScenario', chosenScenario.value)
const onKeydown = (event) => {
  if (event.code !== 'Space' || event.repeat || event.target.closest('button, select, input, textarea')) return
  event.preventDefault()
  store.dispatch('game/togglePause')
}

useGameEvents()
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
.game-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  user-select: none;

  &__build {
    position: absolute;
    top: 12px;
    left: 12px;
    max-height: calc(100vh - 24px);
    overflow-y: auto;
  }

  &__toolbar {
    position: absolute;
    top: 40px;
    right: 12px;
    width: 285px;
    max-width: calc(100vw - 24px);
    padding: 13px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    background: rgba(17, 22, 27, 0.94);
    box-shadow: 0 4px 22px rgba(0, 0, 0, 0.32);
    color: #e6e6e6;
    font-size: 13px;
  }

  &__title { margin-bottom: 7px; font-weight: 600; color: #fff; }
  &__controls { display: flex; gap: 6px; margin-bottom: 8px; }
  &__controls select { flex: 1; min-width: 0; }
  &__controls button { flex: 1; }
  &__controls select, &__controls button, &__result button {
    padding: 7px 9px;
    border-radius: 5px;
    border: 1px solid #4c5863;
    color: #e6e6e6;
    background: #29323a;
    font: inherit;
    cursor: pointer;
  }
  &__controls button:hover, &__result button:hover { background: #394752; }
  &__primary { background: #24506d !important; border-color: #3e87ad !important; }
  &__primary:hover { background: #30698d !important; }
  button:disabled { opacity: 0.45; cursor: default; }
  &__info { color: #c4d1db; font-size: 12px; }
  &__shortcut { color: #8e9eaa; }
  &__divider { border-top: 1px solid #39434d; margin: 12px 0 9px; }
  &__group { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  &__group--eliminated { opacity: 0.4; text-decoration: line-through; }
  &__dot { display: inline-block; flex-shrink: 0; width: 11px; height: 11px; border-radius: 50%; }
  &__count { margin-left: auto; color: #a6b2bd; font-size: 11px; }
  &__panel {
    position: absolute;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100vw - 24px);
  }
  &__exit { position: absolute; top: 8px; right: 8px; }
  &__result {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 24px 32px;
    min-width: 245px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    background: rgba(17, 22, 27, 0.97);
    color: #e6e6e6;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
  }
  &__result-title { font-size: 21px; font-weight: 600; margin-bottom: 10px; }
  &__winner { display: flex; justify-content: center; align-items: center; gap: 8px; margin-bottom: 15px; }
}
</style>
