<template>
  <div v-if="status === GAME_STATUSES.MENU || status === GAME_STATUSES.FINISHED" class="game-overlay">
    <div class="game-overlay__window">
      <template v-if="status === GAME_STATUSES.FINISHED">
        <h2 v-if="winnerGroupId !== null">{{ GROUPS[winnerGroupId].name }} wins</h2>
        <h2 v-else>Draw</h2>
        <div class="game-overlay__buttons">
          <button @click="restartScenario">Restart</button>
          <button @click="openMenu">Menu</button>
        </div>
      </template>

      <template v-else>
        <h2>Scenarios</h2>
        <label>
          <input :checked="isAiEnabled" type="checkbox" @change="setAiEnabled($event.target.checked)">
          AI controls groups 2+ (you play group 1)
        </label>
        <label>
          <input :checked="isFogEnabled" type="checkbox" @change="setFogEnabled($event.target.checked)">
          Fog of war
        </label>
        <div v-for="scenario in scenarios" :key="scenario.key" class="game-overlay__scenario">
          <div>
            <div><b>{{ scenario.name }}</b></div>
            <div>{{ scenario.description }}</div>
          </div>
          <button @click="startScenario(scenario.key)">Start</button>
        </div>
        <div v-if="isGameInProgress" class="game-overlay__buttons">
          <button @click="continueGame">Continue</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useStore} from 'vuex'
import {GAME_STATUSES} from '@/game/gameStatus.js'
import {GROUPS} from '@/game/groups.js'

const store = useStore()

const status = computed(() => store.getters['game/getStatus'])
const scenarios = computed(() => store.getters['game/getScenarios'])
const winnerGroupId = computed(() => store.getters['game/getWinnerGroupId'])
const isGameInProgress = computed(() => store.getters['game/getIsGameInProgress'])
const isAiEnabled = computed(() => store.getters['game/getIsAiEnabled'])
const isFogEnabled = computed(() => store.getters['game/getIsFogEnabled'])

const setFogEnabled = (isEnabled) => {
  store.dispatch('game/setFogEnabled', isEnabled)
}

const setAiEnabled = (isEnabled) => {
  store.dispatch('game/setAiEnabled', isEnabled)
}

const startScenario = (scenarioKey) => {
  store.dispatch('game/startScenario', scenarioKey)
}

const restartScenario = () => {
  store.dispatch('game/restartScenario')
}

const openMenu = () => {
  store.dispatch('game/openMenu')
}

const continueGame = () => {
  store.dispatch('game/continueGame')
}
</script>

<style scoped lang="scss">
.game-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);

  &__window {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 420px;
    padding: 12px;
    border: 1px solid #000;
    background: #eee;
    color: #000;
  }

  &__scenario {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    border-top: 1px solid #ccc;
  }

  &__buttons {
    display: flex;
    gap: 8px;
  }
}
</style>
