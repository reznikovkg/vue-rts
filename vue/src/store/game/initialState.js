import { TILE_SIZE, createTerrain } from './terrain'
import { createUnit } from './units'
import { createBuilding } from './buildings'

export const createInitialState = (scenario = 'skirmish') => {
  const state = {
    terrain: createTerrain(),
    buildings: [],
    units: [],
    selectedUnitIds: [],
    selectedBuildingId: null,
    targetPosition: null,
    activeGroup: 1,
    buildMode: null,
    isPaused: false,
    scenario,
    result: null,
    nextUnitId: 1,
    nextBuildingId: 1,
  }

  const addBuilding = (groupId, type, gridX, gridY) => {
    state.buildings.push(createBuilding(
      state.nextBuildingId++,
      groupId,
      type,
      gridX,
      gridY,
    ))
  }

  const addUnit = (groupId, x, y) => {
    state.units.push(createUnit(state.nextUnitId++, groupId, x, y))
  }

  if (scenario === 'crossfire') {
    addBuilding(1, 'barracks', -8, 0)
    addBuilding(2, 'barracks', 8, 0)
    addUnit(1, -8 * TILE_SIZE, -5 * TILE_SIZE)
    addUnit(1, -7 * TILE_SIZE, -5 * TILE_SIZE)
    addUnit(2, 8 * TILE_SIZE, 5 * TILE_SIZE)
    addUnit(2, 7 * TILE_SIZE, 5 * TILE_SIZE)
    return state
  }

  addBuilding(1, 'barracks', -6, 0)
  addBuilding(2, 'barracks', 12, 8)
  addUnit(1, -8 * TILE_SIZE, 2 * TILE_SIZE)
  addUnit(1, 8 * TILE_SIZE, -6 * TILE_SIZE)
  addUnit(1, 0, 8 * TILE_SIZE)
  addUnit(2, 12 * TILE_SIZE, 3 * TILE_SIZE)

  return state
}
