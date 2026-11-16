<template>
  <main>
    <h1>Прототип RTS</h1>
    <p>Изометрическая карта, камера, выбор и перемещение юнитов по очереди точек, здания.</p>
    <p>Выберите сценарий:</p>
    <ul class="scenario-list">
      <li v-for="scenario in scenarios" :key="scenario.id">
        <RouterLink :to="{ name: $routes.GAME, query: { scenario: scenario.id } }">{{ scenario.name }}</RouterLink>
        <span>{{ scenario.description }}</span>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { SCENARIOS } from '@/game/scenarios.js'

const scenarios = SCENARIOS
</script>

<style scoped lang="scss">
.scenario-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }

  span {
    color: #66805b;
  }
}
</style>
