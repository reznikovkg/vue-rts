<template>
  <div class="game-page">
    <GameMap
        :build-mode="buildMode"
        @build-here="onBuildHere"
        @tick="delta => store.dispatch('game/tick', delta)"
        @background-click="clearSelection"
        @cancel="clearSelection"
        @select-area="area => store.dispatch('game/selectArea', area)"
        @command="point => store.dispatch('game/commandSelected', point)"
        @toggle-pause="togglePause"
    >
      <template v-for="object in objects" :key="object.id">
        <GameBuilding
            v-if="isBuilding(object)"
            :building="object"
            :grid-size="map.gridSize"
            :selected="isSelected(object.id)"
            @select="event => select(object.id, event)"
        />
        <GameUnit
            v-else
            :unit="object"
            :grid-size="map.gridSize"
            :selected="isSelected(object.id)"
            :waypoints="waypointsById[object.id] || []"
            @select="event => select(object.id, event)"
        />
      </template>
    </GameMap>
    <div v-if="paused" class="game-page__pause">Пауза — пробел, чтобы продолжить</div>
    <button type="button" class="game-page__pause-toggle" @mousedown.prevent @click="togglePause">
      {{ paused ? 'Продолжить' : 'Пауза' }}
    </button>
    <div v-if="gameOver" class="game-page__gameover">
      <div class="game-page__gameover-card">
        <h2>{{ gameOver.winner ? `Победила ${getGroupName(gameOver.winner)}` : 'Ничья' }}</h2>
        <p>На карте остались объекты только одной группы.</p>
        <div class="game-page__gameover-actions">
          <button type="button" @click="restart">Заново</button>
          <RouterLink :to="{ name: $routes.INDEX }">В меню</RouterLink>
        </div>
      </div>
    </div>
    <SelectionPanel 
      :objects="selected" 
      @spawn="payload => store.dispatch('game/spawn', payload)" 
      @start-build="startBuildingMode" />
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import GameMap from '@/components/game/GameMap.vue'
import GameUnit from '@/components/game/GameUnit.vue'
import GameBuilding from '@/components/game/GameBuilding.vue'
import SelectionPanel from '@/components/game/SelectionPanel.vue'
import { isBuilding, getGroupName } from '@/game/objects.js'
import { getScenario } from '@/game/scenarios.js'

const route = useRoute()
const store = useStore()
const map = computed(() => store.getters['game/getMap'])
const objects = computed(() => store.getters['game/getDrawOrder'])
const selected = computed(() => store.getters['game/getSelected'])
const paused = computed(() => store.getters['game/isPaused'])
const gameOver = computed(() => store.getters['game/getGameOver'])
const scenarioId = computed(() => store.getters['game/getScenarioId'])
const waypointsById = computed(() => {
  const points = {}
  store.getters['game/getElements'].forEach(element => {
    points[element.id] = store.getters['game/getWaypoints'](element.id)
  })
  return points
})
const isSelected = (id) => store.getters['game/isSelected'](id)

// Shift+клик — добавить/убрать объект из выбора; Shift+клик по фону выбор не сбрасывает
const select = (id, event) => store.dispatch('game/select', { id, additive: Boolean(event?.shiftKey) })
const clearSelection = (event) => {
  if (event?.shiftKey) return
  buildMode.value = null // Esc и клик по фону также отменяют режим стройки
  store.dispatch('game/clearSelection')
}
const togglePause = () => store.dispatch('game/togglePause')

const buildMode = ref(null)

const startBuildingMode = (type) => {
  buildMode.value = type
}

const onBuildHere = ({ type, x, y }) => {
  store.dispatch('game/build', { buildingType: type, x, y })
  buildMode.value = null // Выключаем режим стройки после клика
}

// Сценарий приходит из меню параметром /game?scenario=...
const startScenario = (id) => {
  if (typeof id === 'string' && getScenario(id)) store.dispatch('game/start', id)
}
const restart = () => startScenario(scenarioId.value)

onMounted(() => startScenario(route.query.scenario))
watch(() => route.query.scenario, (id) => startScenario(id))
</script>

<style scoped lang="scss">
.game-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.game-page__pause {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 18px;
  border: 1px solid #66805b;
  background: rgba(27, 39, 25, 0.9);
  color: #f0f4e7;
  pointer-events: none;
}

.game-page__pause-toggle {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 18px;
  border: 1px solid #66805b;
  background: rgba(27, 39, 25, 0.9);
  color: #f0f4e7;
  cursor: pointer;

  &:hover {
    background: #354c2e;
  }
}

.game-page__gameover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 22, 14, 0.72);
}

.game-page__gameover-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 40px;
  border: 1px solid #66805b;
  background: #1b2719;
  color: #f0f4e7;
  text-align: center;

  h2 {
    margin: 0;
  }

  p {
    margin: 0 0 8px;
    color: #b9cba5;
  }
}

.game-page__gameover-actions {
  display: flex;
  gap: 12px;
  align-items: center;

  button {
    padding: 6px 18px;
    border: 1px solid #66805b;
    background: #243421;
    color: #f0f4e7;
    cursor: pointer;

    &:hover {
      background: #354c2e;
    }
  }

  a {
    color: #ffe08a;
  }
}
</style>
