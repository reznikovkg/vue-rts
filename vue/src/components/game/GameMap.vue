<template>
  <div class="game-map">
    <div class="iso-map">
      <div
        v-for="tile in tiles"
        :key="tile.id"
        class="iso-tile"
        :class="{
          'iso-tile--alt': (tile.col + tile.row) % 2 !== 0,
          'iso-tile--water': tile.type === 'water',
        }"
        :style="{
          left: `${worldToScreenX(tile.x, tile.y)}px`,
          top: `${worldToScreenY(tile.x, tile.y)}px`,
        }"
      />
    </div>

    <GameBuilding
      v-for="building in buildings"
      :key="building.id"
      :building-id="building.id"
      :x="worldToScreenX(building.x, building.y)"
      :y="worldToScreenY(building.x, building.y)"
      :size="building.size"
      :selected="selectedBuildingId === building.id"
      :color="getGroupColor(building.groupId)"
      :health="building.health"
      :max-health="building.maxHealth"
      :style="{
        zIndex: Math.round(worldToScreenY(building.x, building.y) + 60),
      }"
      @select="handleSelectBuilding(building.id, $event)"
    />

    <GameUnit
      v-for="unit in units"
      :key="unit.id"
      :unit-id="unit.id"
      :x="worldToScreenX(unit.x, unit.y)"
      :y="worldToScreenY(unit.x, unit.y)"
      :selected="selectedUnitIds.includes(unit.id)"
      :color="getGroupColor(unit.groupId)"
      :health="unit.health"
      :max-health="unit.maxHealth"
      :style="{
        zIndex: Math.round(worldToScreenY(unit.x, unit.y) + 12),
      }"
      @select="handleSelectUnit(unit.id, $event)"
    />

    <div
      v-if="targetPosition"
      class="target"
      :style="{
        left: `${worldToScreenX(targetPosition.x, targetPosition.y)}px`,
        top: `${worldToScreenY(targetPosition.x, targetPosition.y)}px`,
      }"
    >
      <div class="target-cross" />
    </div>
  </div>
</template>

<script setup lang="ts">
import GameUnit from './GameUnit.vue'
import GameBuilding from './GameBuilding.vue'
import { getGroupColor } from '@/store/game/groups'

defineProps<{
  tiles: any[]
  buildings: any[]
  units: any[]
  selectedUnitIds: number[]
  selectedBuildingId: number | null
  targetPosition: { x: number, y: number } | null
  worldToScreenX: (worldX: number, worldY: number) => number
  worldToScreenY: (worldX: number, worldY: number) => number
}>()

const emit = defineEmits<{
  'select-unit': [unitId: number, event: MouseEvent]
  'select-building': [buildingId: number, event: MouseEvent]
}>()

const handleSelectUnit = (unitId: number, event: MouseEvent) => {
  emit('select-unit', unitId, event)
}

const handleSelectBuilding = (buildingId: number, event: MouseEvent) => {
  emit('select-building', buildingId, event)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/tokens' as tokens;

.game-map {
  position: absolute;
  inset: 0;
}

.iso-map {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.iso-tile {
  position: absolute;
  width: 50px;
  height: 25px;
  transform: translate(-50%, -50%);
  background: tokens.$color-grass;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  outline: 1px solid rgba(25, 50, 20, 0.2);

  &--alt {
    background: tokens.$color-grass-alt;
  }

  &--water {
    background: #4f9ccc;
  }
}

.target {
  position: absolute;
  width: 20px;
  height: 20px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1000;
}

.target-cross {
  position: absolute;
  inset: 0;
  border: 2px solid white;
  border-radius: 50%;
}

.target-cross::before,
.target-cross::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  background: white;
  transform: translate(-50%, -50%);
}

.target-cross::before {
  width: 2px;
  height: 28px;
}

.target-cross::after {
  width: 28px;
  height: 2px;
}
</style>
