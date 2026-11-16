import { TILE_SIZE } from './terrain'
import { getBuildingHealth } from './buildingHealth'

export const BUILDING_TYPES = {
  barracks: {
    name: 'Казарма',
    size: 2,
  },
  outpost: {
    name: 'Пост',
    size: 3,
  },
}

export const createBuilding = (id, groupId, type, gridX, gridY) => {
  const definition = BUILDING_TYPES[type] ?? BUILDING_TYPES.barracks
  const centerOffset = (definition.size - 1) / 2
  let health = 100
  
  health = getBuildingHealth(type)
  
  return {
    id,
    type,
    groupId,
    gridX,
    gridY,
    size: definition.size,
    name: definition.name,
    x: (gridX + centerOffset) * TILE_SIZE,
    y: (gridY + centerOffset) * TILE_SIZE,
    health,
    maxHealth: health,
  }
}
