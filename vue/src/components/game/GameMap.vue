<template>
  <div class="iso-map">
    <div
      v-for="tile in tiles"
      :key="tile.id"
      class="iso-tile"
      :class="[
        `iso-tile--${tile.type}`,
        { 'iso-tile--alt': (tile.col + tile.row) % 2 !== 0 },
      ]"
      :style="{
        left: `${worldToScreenX(tile.x, tile.y)}px`,
        top: `${worldToScreenY(tile.x, tile.y)}px`,
      }"
    />

    <GameBuilding
      v-for="building in buildings"
      :key="building.id"
      :building-id="building.id"
      :group-id="building.groupId"
      :name="building.name"
      :health="building.health"
      :max-health="building.maxHealth"
      :size="building.size"
      :selected="building.id === selectedBuildingId"
      :x="worldToScreenX(building.x, building.y)"
      :y="worldToScreenY(building.x, building.y)"
      :style="{
        zIndex: Math.round(
          worldToScreenY(building.x, building.y) +
          (building.size * tileSize) / 4 +
          12,
        ),
      }"
      @select="$emit('selectBuilding', building.id)"
    />

    <GameUnit
      v-for="unit in units"
      :key="unit.id"
      :unit-id="unit.id"
      :group-id="unit.groupId"
      :health="unit.health"
      :max-health="unit.maxHealth"
      :selected="selectedUnitIds.includes(unit.id)"
      :x="worldToScreenX(unit.x, unit.y)"
      :y="worldToScreenY(unit.x, unit.y)"
      :style="{ zIndex: Math.round(worldToScreenY(unit.x, unit.y) + 12) }"
      @select="$emit('selectUnit', unit.id, $event)"
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
import GameBuilding from './GameBuilding.vue'
import GameUnit from './GameUnit.vue'

interface Position {
  x: number
  y: number
}

interface Tile {
  id: string
  col: number
  row: number
  x: number
  y: number
  type: 'land' | 'water'
}

interface Building {
  id: number
  groupId: number
  name: string
  health: number
  maxHealth: number
  size: number
  x: number
  y: number
}

interface Unit {
  id: number
  groupId: number
  health: number
  maxHealth: number
  x: number
  y: number
}

interface Props {
  tiles: Tile[]
  buildings: Building[]
  units: Unit[]
  selectedUnitIds: number[]
  selectedBuildingId: number | null
  targetPosition: Position | null
  worldToScreenX: (x: number, y: number) => number
  worldToScreenY: (x: number, y: number) => number
  tileSize: number
}

defineProps<Props>()

defineEmits<{
  selectUnit: [unitId: number, event: MouseEvent]
  selectBuilding: [buildingId: number]
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/tokens' as tokens;

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
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  outline: 1px solid rgba(25, 50, 20, 0.2);

  &--land {
    background: tokens.$color-grass;
  }

  &--land.iso-tile--alt {
    background: tokens.$color-grass-alt;
  }

  &--water {
    background: #327ba0;
  }

  &--water.iso-tile--alt {
    background: #3989ad;
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
  border: 2px solid tokens.$color-white;
  border-radius: 50%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    background: tokens.$color-white;
    transform: translate(-50%, -50%);
  }

  &::before {
    width: 2px;
    height: 28px;
  }

  &::after {
    width: 28px;
    height: 2px;
  }
}
</style>
