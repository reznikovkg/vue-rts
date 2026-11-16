<template>
  <div class="game-page">
    <GameField :actions="actions" />
    <BuildPanel class="game-page__build" :actions="actions" />

    <div class="game-page__toolbar">
      <div class="game-page__header">
        <div class="game-page__title">Битва кланов</div>
        <RouterLink class="game-page__exit" :to="{ name: $routes.INDEX }">Выход</RouterLink>
      </div>
      <div class="game-page__controls">
        <button type="button" class="game-page__primary" :disabled="finished" @click="togglePause">{{ pauseLabel }}</button>
        <button type="button" @click="restart">Заново</button>
      </div>
      <div class="game-page__info">
        {{ phaseLabel }} · {{ timeLabel }} <span class="game-page__shortcut">Пробел — пауза</span>
      </div>

      <div class="game-page__divider"></div>
      <div class="game-page__header">
        <div class="game-page__title">Кланы</div>
        <button type="button" class="game-page__add" :disabled="finished" @click="addGroup">+ Клан</button>
      </div>
      <!-- кланов может быть сколько угодно: длинный список прокручивается -->
      <div class="game-page__groups">
        <div v-for="row in groupRows" :key="row.id" class="game-page__group" :class="row.classes">
          <i class="game-page__dot" :style="row.dotStyle"></i>
          <span>{{ row.name }}</span>
          <span class="game-page__count">{{ row.units }} бойц. · {{ row.buildings }} зд.</span>
        </div>
      </div>
    </div>

    <div v-if="finished" class="game-page__result">
      <div class="game-page__result-title">Игра окончена</div>
      <div v-if="winner" class="game-page__winner">
        <i class="game-page__dot" :style="winnerDotStyle"></i>
        Победил {{ winner.name }}
      </div>
      <div v-else class="game-page__winner">Ничья — все кланы уничтожены</div>
      <button type="button" class="game-page__primary" @click="restart">Играть заново</button>
    </div>

    <!-- луна над лесом, только украшение -->
    <div class="game-page__moon"></div>

    <SelectionPanel class="game-page__panel" :actions="actions" />
    <MiniMap class="game-page__minimap" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useStore } from 'vuex'
import BuildPanel from '@/components/game/BuildPanel.vue'
import GameField from '@/components/game/GameField.vue'
import MiniMap from '@/components/game/MiniMap.vue'
import SelectionPanel from '@/components/game/SelectionPanel.vue'
import { PHASES } from '@/store/game'
import { isBuilding, isUnit } from '@/game/entities'
import { useGameEvents } from '@/composables/useGameEvents'

const PHASE_LABELS = {
  [PHASES.READY]: 'Подготовка',
  [PHASES.RUNNING]: 'Идёт бой',
  [PHASES.PAUSED]: 'Пауза',
  [PHASES.FINISHED]: 'Завершено',
}
const PAUSE_LABELS = {
  [PHASES.RUNNING]: 'Пауза',
  [PHASES.PAUSED]: 'Продолжить',
}

const store = useStore()
const actions = useGameEvents()
const phase = computed(() => store.state.game.phase)
const finished = computed(() => phase.value === PHASES.FINISHED)
const groups = computed(() => store.state.game.groups)

const winner = computed(() => groups.value.find((group) => group.id === store.state.game.winnerGroupId))
const winnerDotStyle = computed(() => ({ background: winner.value?.color }))

// строка группы: сколько осталось бойцов и зданий, выбыла ли группа
const groupRows = computed(() => groups.value.map((group) => {
  const entities = store.state.game.entities.filter((entity) => entity.groupId === group.id)
  return {
    id: group.id,
    name: group.name,
    dotStyle: { background: group.color },
    units: entities.filter(isUnit).length,
    buildings: entities.filter(isBuilding).length,
    classes: { 'game-page__group--eliminated': !entities.length },
  }
}))

const phaseLabel = computed(() => PHASE_LABELS[phase.value])
const pauseLabel = computed(() => PAUSE_LABELS[phase.value] ?? 'Запустить')
const timeLabel = computed(() => {
  const time = Math.floor(store.state.game.elapsedSeconds)
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`
})

// заново - новая партия с тем же числом кланов
const restart = () => store.dispatch('game/newGame')
const togglePause = () => store.dispatch('game/togglePause')
const addGroup = () => store.dispatch('game/addGroup')

// пробел - пауза, но не когда фокус на кнопке или списке
const onKeydown = (event) => {
  if (event.code !== 'Space' || event.repeat || event.target.closest('button, select, input, textarea')) return
  event.preventDefault()
  togglePause()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped lang="scss">
@use '@/assets/game-ui' as ui;

$gap: 8px;
$build-width: 140px;
$minimap-width: 168px;

// на весь экран, поверх общей сетки #project из main.css
.game-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  user-select: none;

  button,
  select {
    @include ui.button;
  }

  &__build {
    position: absolute;
    top: $gap;
    left: $gap;
    max-height: calc(100vh - 150px);
    overflow-y: auto;
  }

  &__toolbar {
    @include ui.panel;
    position: absolute;
    top: $gap;
    right: $gap;
    width: 215px;
    max-width: calc(100vw - #{$gap * 2});
    padding: 8px;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  &__title {
    @include ui.title;
    margin-bottom: 8px;
  }

  &__exit {
    color: ui.$muted;
    font-size: 12px;

    &:hover {
      color: ui.$text;
    }
  }

  &__controls {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;

    select {
      flex: 1;
      min-width: 0;
    }

    button {
      flex: 1;
    }
  }

  &__add {
    padding: 2px 8px;
    font-size: 12px;
  }

  &__primary {
    border-color: ui.$silver;
    background: linear-gradient(180deg, #4b6070 0%, #2f3e4a 100%);
  }

  &__info {
    color: ui.$muted;
    font-size: 12px;
  }

  &__shortcut {
    opacity: 0.75;
  }

  &__divider {
    margin: 12px 0 9px;
    border-top: 1px solid ui.$border;
  }

  &__groups {
    max-height: 150px;
    overflow-y: auto;
  }

  &__group {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;

    &--eliminated {
      opacity: 0.4;
      text-decoration: line-through;
    }
  }

  &__dot {
    display: inline-block;
    flex-shrink: 0;
    width: 11px;
    height: 11px;
    border: 1px solid rgba(0, 0, 0, 0.6);
    border-radius: 50%;
  }

  &__count {
    margin-left: auto;
    color: ui.$muted;
    font-size: 11px;
  }

  // нижняя панель от стройки до миникарты
  &__panel {
    position: absolute;
    bottom: $gap;
    left: $build-width + $gap * 2;
    right: $minimap-width + $gap * 2;
  }

  &__moon {
    position: absolute;
    top: 18px;
    left: 50%;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: radial-gradient(circle at 38% 38%, #f4f6f0 0%, #d9ded6 55%, #b9c0bb 100%);
    box-shadow: 0 0 30px 10px rgba(220, 232, 240, 0.25);
    opacity: 0.85;
    pointer-events: none;
    transform: translateX(-50%);
  }

  &__minimap {
    position: absolute;
    right: $gap;
    bottom: $gap;
  }

  &__result {
    @include ui.panel;
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 260px;
    padding: 24px 32px;
    transform: translate(-50%, -50%);
    text-align: center;
  }

  &__result-title {
    @include ui.title;
    margin-bottom: 12px;
    font-size: 22px;
  }

  &__winner {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
  }
}
</style>
