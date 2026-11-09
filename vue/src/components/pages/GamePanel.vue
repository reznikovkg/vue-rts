<template>
  <nav class="game-panel" aria-label="Панель навигации">
    <section>
      <h2>Игра</h2>
      <div class="buttons">
        <button type="button" :class="{ active: paused }" :disabled="gameOver" @click="emit('pause', !paused)">
          {{ paused ? 'Продолжить' : 'Пауза' }} (P)
        </button>
      </div>
      <label class="scenario">
        Сценарий
        <select v-model="chosenScenario">
          <option v-for="(scenario, index) in scenarios" :key="index" :value="index">
            {{ scenario.name }}
          </option>
        </select>
      </label>
      <p>{{ scenarios[chosenScenario].description }}</p>
      <div class="buttons">
        <button type="button" @click="emit('scenario', chosenScenario)">Запустить сценарий</button>
      </div>
    </section>
    <section>
      <h2>Группа игрока</h2>
      <div class="buttons">
        <button
            v-for="group in groups"
            :key="group"
            type="button"
            :class="{ active: playerGroup === group }"
            @click="emit('player-group', group)"
        >
          <span class="swatch" :style="{ background: groupColor(group) }" />
          Группа {{ group }}
        </button>
      </div>
    </section>
    <section>
      <h2>Строительство</h2>
      <div class="buttons">
        <button
            v-for="size in buildingSizes"
            :key="size"
            type="button"
            :class="{ active: buildSize === size }"
            @click="emit('build', size)"
        >
          Здание {{ size }}×{{ size }}
        </button>
        <button v-if="buildSize" type="button" @click="emit('cancel-build')">Отмена</button>
      </div>
      <p v-if="buildSize">ЛКМ по карте — поставить здание, ПКМ — отмена.</p>
    </section>
    <section v-if="building">
      <h2>Здание {{ building.size }}×{{ building.size }}</h2>
      <p>Группа {{ building.group }} · здоровье: {{ building.health }}/{{ building.maxHealth }}</p>
      <div class="buttons">
        <button type="button" @click="emit('spawn')">Создать персонажа</button>
      </div>
    </section>
    <section v-if="units.length">
      <h2 v-if="units.length === 1">Персонаж #{{ units[0].id }}</h2>
      <h2 v-else>Выбрано персонажей: {{ units.length }}</h2>
      <dl v-if="units.length === 1">
        <dt>Группа</dt>
        <dd>{{ units[0].group }}</dd>
        <dt>Здоровье</dt>
        <dd>{{ units[0].health }}/{{ units[0].maxHealth }}</dd>
        <dt>Сила</dt>
        <dd>{{ units[0].power }}</dd>
        <dt>Скорость</dt>
        <dd>{{ units[0].speed }}</dd>
        <dt>Скорость атаки</dt>
        <dd>{{ units[0].attackSpeed }}</dd>
        <dt>Местность</dt>
        <dd>{{ units[0].terrain === 'water' ? 'вода' : 'суша' }}</dd>
      </dl>
      <div class="buttons">
        <button type="button" class="danger" @click="emit('destroy')">Самоуничтожение</button>
      </div>
    </section>
  </nav>
</template>

<script setup lang="ts">
import type { MapObject } from '@/game/occupancy'
import type { Unit } from '@/game/Unit'
import { ref, watch } from 'vue'
import { groupColor } from '@/game/groups'
import { scenarios } from '@/game/scenarios'

const props = defineProps<{
  buildSize: number | null
  building?: MapObject
  units: Unit[]
  groups: number[]
  playerGroup: number
  paused: boolean
  scenarioIndex: number
  gameOver: boolean
}>()
const emit = defineEmits<{
  build: [size: number]
  'cancel-build': []
  spawn: []
  destroy: []
  'player-group': [group: number]
  pause: [paused: boolean]
  scenario: [index: number]
}>()

const chosenScenario = ref(props.scenarioIndex)
watch(() => props.scenarioIndex, index => chosenScenario.value = index)

const buildingSizes = [1, 2, 3, 4]
</script>

<style scoped lang="scss">
.game-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin: 16px 0;
  padding: 12px 16px;
  border: 1px solid #66805b;
  background: #2c3d29;
  color: #f0f4e7;

  h2 {
    margin: 0 0 8px;
    font-size: 16px;
  }

  p {
    max-width: 320px;
    margin: 0 0 8px;
  }

  dl {
    display: grid;
    grid-template-columns: auto auto;
    gap: 2px 12px;
    margin: 0 0 8px;
  }

  dd {
    margin: 0;
  }

  .scenario {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 8px 0;

    select {
      padding: 2px 4px;
      border: 1px solid #b9cba5;
      background: #354c2e;
      color: inherit;
    }
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  button {
    padding: 4px 12px;
    border: 1px solid #b9cba5;
    background: #354c2e;
    color: inherit;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }

    &.active {
      border-color: #ffe08a;
      color: #ffe08a;
    }

    .swatch {
      display: inline-block;
      width: 10px;
      height: 10px;
      margin-right: 4px;
      border: 1px solid #303b31;
      border-radius: 50%;
    }

    &.danger {
      border-color: #e65a50;
      color: #ffb3ad;
    }
  }
}
</style>
