<template>
  <div class="game-hud">
    <span><b>{{ scenario.name }}</b></span>
    <span>Ore: {{ Math.floor(playerOre) }}</span>
    <span v-if="status === GAME_STATUSES.PAUSED">Paused</span>
    <button :disabled="!canTogglePause" @click="togglePause">
      {{ status === GAME_STATUSES.PAUSED ? 'Resume' : 'Pause' }} (P)
    </button>
    <button v-if="isAiEnabled" @click="toggleAiFrozen">AI: {{ isAiFrozen ? 'frozen' : 'active' }}</button>
    <button @click="toggleFog">Fog: {{ isFogEnabled ? 'on' : 'off' }}</button>
    <button @click="openMenu">Menu</button>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useStore} from 'vuex'
import {GAME_STATUSES} from '@/game/gameStatus.js'

const store = useStore()

const status = computed(() => store.getters['game/getStatus'])
const scenario = computed(() => store.getters['game/getCurrentScenario'])
const playerOre = computed(() => store.getters['game/getPlayerOre'])
const isFogEnabled = computed(() => store.getters['game/getIsFogEnabled'])
const isAiEnabled = computed(() => store.getters['game/getIsAiEnabled'])
const isAiFrozen = computed(() => store.getters['game/getIsAiFrozen'])

const toggleAiFrozen = () => {
  store.dispatch('game/setAiFrozen', !isAiFrozen.value)
}

const toggleFog = () => {
  store.dispatch('game/setFogEnabled', !isFogEnabled.value)
}

const canTogglePause = computed(() => {
  return status.value === GAME_STATUSES.RUNNING || status.value === GAME_STATUSES.PAUSED
})

const togglePause = () => {
  store.dispatch('game/togglePause')
}

const openMenu = () => {
  store.dispatch('game/openMenu')
}
</script>

<style scoped lang="scss">
.game-hud {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border: 1px solid #000;
  background: #eee;
  color: #000;
}
</style>
