import { TILE_SIZE, buildingCoversCell, tileAt } from './terrain'
import { getBuildingHealth } from './buildingHealth'
import { positionIntersectsBuilding } from './buildingCollision'

export const BUILDING_TYPES = {
  barracks: { name: 'Казарма', size: 2 },
  outpost: { name: 'Пост', size: 3 },
}

export function createBuilding(id, groupId, type, gridX, gridY) {
  const definition = BUILDING_TYPES[type]
  const centerOffset = (definition.size - 1) / 2
  const health = getBuildingHealth(type)

  return {
    id,
    type,
    groupId,
    x: (gridX + centerOffset) * TILE_SIZE,
    y: (gridY + centerOffset) * TILE_SIZE,
    gridX,
    gridY,
    size: definition.size,
    name: definition.name,
    health,
    maxHealth: health,
  }
}

export function canBuildAt(state, type, gridX, gridY) {
  const definition = BUILDING_TYPES[type]
  if (!definition) return false

  const centerOffset = (definition.size - 1) / 2
  const proposedBuilding = {
    x: (gridX + centerOffset) * TILE_SIZE,
    y: (gridY + centerOffset) * TILE_SIZE,
    gridX,
    gridY,
    size: definition.size,
  }

  if (state.units.some(unit =>
    positionIntersectsBuilding(unit, proposedBuilding),
  )) {
    return false
  }

  for (let row = gridY; row < gridY + definition.size; row++) {
    for (let col = gridX; col < gridX + definition.size; col++) {
      const tile = tileAt(state, col, row)
      if (!tile || tile.type !== 'land') return false

      if (state.buildings.some(building => buildingCoversCell(building, col, row))) {
        return false
      }
    }
  }

  return true
}
