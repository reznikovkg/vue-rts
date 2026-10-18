<template>
  <main>
    <h1>Игровое поле</h1>
    <p>Карта {{ worldWidth }} × {{ worldHeight }} · шаг сетки {{ gridSize }}</p>
    <p>Камера: удерживайте WASD или стрелки.</p>
    <p>ЛКМ по персонажу — выбрать, по пустому месту — снять выбор. ПКМ — идти к точке.</p>

    <GameMap
        @tick="delta => unit.update(delta)"
        @background-click="unit.selected = false"
        @command="onCommand"
    >
      <GameUnit :unit="unit" @select="unit.selected = true" />
    </GameMap>

    <RouterLink :to="{ name: $routes.EXAMPLE }">Пример Vuex</RouterLink>
  </main>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import GameMap from '@/components/pages/GameMap.vue'
import GameUnit from '@/components/pages/GameUnit.vue'
import { Unit } from '@/game/Unit'
import { worldWidth, worldHeight, gridSize } from '@/game/map'

const unit = reactive(new Unit(80, 80, 150))

const onCommand = (x: number, y: number) => {
  if (unit.selected) unit.moveTo(x, y)
}
</script>
