<template>
  <main>
    <h1>Игровое поле</h1>
    <p>Карта {{ worldWidth }} × {{ worldHeight }} · шаг сетки {{ gridSize }}</p>
    <p>Камера: WASD или стрелки, масштаб: колесо мыши.</p>
    <p>ЛКМ по персонажу — выбрать, рамка мышью — выбрать группу, ПКМ — идти к точке.</p>

    <GameMap
        @tick="delta => units.forEach(unit => unit.update(delta))"
        @background-click="clearSelection"
        @select-area="selectArea"
        @command="onCommand"
    >
      <GameUnit v-for="(unit, index) in units" :key="index" :unit="unit" @select="selectUnit(unit)" />
    </GameMap>

    <RouterLink :to="{ name: $routes.EXAMPLE }">Пример Vuex</RouterLink>
  </main>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import GameMap from '@/components/pages/GameMap.vue'
import GameUnit from '@/components/pages/GameUnit.vue'
import { Unit } from '@/game/Unit'
import { worldWidth, worldHeight, gridSize, worldToScreen, screenToWorld } from '@/game/map'

const units = reactive([
  new Unit(80, 80, 150),
  new Unit(-240, -120, 110),
  new Unit(260, -100, 190),
])

const clearSelection = () => {
  units.forEach(unit => unit.selected = false)
}

const selectUnit = (selectedUnit: Unit) => {
  units.forEach(unit => unit.selected = unit === selectedUnit)
}

const selectArea = (left: number, top: number, right: number, bottom: number) => {
  units.forEach(unit => {
    const point = worldToScreen(unit.x, unit.y)
    unit.selected = point.x >= left && point.x <= right
      && point.y - 10 >= top && point.y - 10 <= bottom
  })
}

const onCommand = (x: number, y: number) => {
  const selected = units.filter(unit => unit.selected)
  if (!selected.length) return

  const destination = worldToScreen(x, y)
  const spacing = 20
  const columns = Math.ceil(Math.sqrt(selected.length))
  const rows = Math.ceil(selected.length / columns)

  selected.forEach((unit, index) => {
    const row = Math.floor(index / columns)
    const countInRow = Math.min(columns, selected.length - row * columns)
    const column = index % columns
    const target = screenToWorld(
      destination.x + (column - (countInRow - 1) / 2) * spacing,
      destination.y + (row - (rows - 1) / 2) * spacing,
    )
    unit.moveTo(
      Math.max(-worldWidth / 2, Math.min(worldWidth / 2, target.x)),
      Math.max(-worldHeight / 2, Math.min(worldHeight / 2, target.y)),
    )
  })
}
</script>
