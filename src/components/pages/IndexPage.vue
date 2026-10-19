<template>
  <div class="index-page">
    <div class="hud">
      Выбрано юнитов: {{ selectedCount }}
    </div>
    
    <GameMap 
      @tick="onTick" 
      @command="onCommand" 
      @background-click="clearSelection"
    >
      <GameUnit
        v-for="unit in units"
        :key="unit.id"
        :unit="unit"
        @select="selectUnit(unit, $event)"
      />
    </GameMap>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import GameMap from './GameMap.vue'
import GameUnit from '../GameUnit.vue'
import { Unit } from '@/game/Unit'

const units = ref<Unit[]>([])
const selectedCount = computed(() => units.value.filter(u => u.selected).length)

onMounted(() => {
  const palette = ['#4a90e2', '#e2b04a', '#7ed321', '#e24a8a', '#9b6ee2']
  for (let i = 0; i < 12; i++) {
    units.value.push(new Unit(
      (Math.random() - 0.5) * 800, 
      (Math.random() - 0.5) * 800, 
      150 + Math.random() * 100, 
      palette[i % palette.length], 
      i
    ))
  }
})

const onTick = (delta: number) => {
  units.value.forEach(unit => unit.update(delta))
}

const selectUnit = (unit: Unit, event: MouseEvent) => {
  if (!event.shiftKey) {
    units.value.forEach(u => u.selected = false)
  }
  unit.selected = true
}

const clearSelection = () => {
  units.value.forEach(u => u.selected = false)
}

const onCommand = (x: number, y: number) => {
  const selected = units.value.filter(u => u.selected)
  if (selected.length === 0) return

  if (selected.length === 1) {
    selected[0].moveTo(x, y)
  } else {
    const R = 15 + Math.sqrt(selected.length) * 10
    selected.forEach((u, i) => {
      const angle = (i / selected.length) * Math.PI * 2
      u.moveTo(x + Math.cos(angle) * R, y + Math.sin(angle) * R)
    })
  }
}
</script>

<style scoped lang="scss">
.index-page {
  position: relative;
  width: 100vw;
  height: 100vh;

  .hud {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 10;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-family: sans-serif;
    pointer-events: none;
  }
}
</style>