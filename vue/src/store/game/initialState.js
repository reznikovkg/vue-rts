import { TILE_SIZE, createTerrain } from './terrain'
import { createUnit } from './units'
import { createBuilding } from './buildings'

export function createInitialState(scenario = 'skirmish') {
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

  if (scenario === 'crossfire') {
    state.buildings.push(createBuilding(state.nextBuildingId++, 1, 'barracks', -8, 0))
    state.buildings.push(createBuilding(state.nextBuildingId++, 2, 'barracks', 8, 0))
    state.units.push(createUnit(state.nextUnitId++, 1, -8 * TILE_SIZE, -5 * TILE_SIZE))
    state.units.push(createUnit(state.nextUnitId++, 1, -7 * TILE_SIZE, -5 * TILE_SIZE))
    state.units.push(createUnit(state.nextUnitId++, 2, 8 * TILE_SIZE, 5 * TILE_SIZE))
    state.units.push(createUnit(state.nextUnitId++, 2, 7 * TILE_SIZE, 5 * TILE_SIZE))
    return state
  }

  state.buildings.push(createBuilding(state.nextBuildingId++, 1, 'barracks', -6, 0))
  state.buildings.push(createBuilding(state.nextBuildingId++, 2, 'barracks', 12, 8))
  state.units.push(createUnit(state.nextUnitId++, 1, -8 * TILE_SIZE, 2 * TILE_SIZE))
  state.units.push(createUnit(state.nextUnitId++, 1, 8 * TILE_SIZE, -6 * TILE_SIZE))
  state.units.push(createUnit(state.nextUnitId++, 1, 0, 8 * TILE_SIZE))
  state.units.push(createUnit(state.nextUnitId++, 2, 12 * TILE_SIZE, 3 * TILE_SIZE))

  return state
}
