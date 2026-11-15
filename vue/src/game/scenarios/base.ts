import START_UNITS, { START_OBJECTS, TERRAIN_ZONES } from '@/game/config'
import type { Scenario } from '@/game/types'

// базовый сценарий из config: реки, озеро и горы, без событий
export const BASE: Scenario = {
  id: 'base',
  name: 'Базовый',
  objects: START_OBJECTS,
  units: START_UNITS,
  terrain: TERRAIN_ZONES,
  events: [],
}
