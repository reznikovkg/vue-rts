import { DEFAULT_UNIT_STATS } from '../world/stats.js'

export const UNIT_TYPES = {
  soldier: {
    label: 'пехотинец',
    radius: 16,
    stats: { ...DEFAULT_UNIT_STATS },
  },
  scout: {
    label: 'разведчик',
    radius: 14,
    stats: { ...DEFAULT_UNIT_STATS, speed: 180, attack: 6, hp: 70 },
  },
}

export function getUnitTypeConfig(unitType) {
  return UNIT_TYPES[unitType] ?? null
}
