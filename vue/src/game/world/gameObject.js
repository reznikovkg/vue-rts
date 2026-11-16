import { DEFAULT_GROUP } from '../config/groups.js'
import { DEFAULT_BUILDING_STATS, DEFAULT_UNIT_STATS } from './stats.js'

let nextObjectId = 1

function generateObjectId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `game-object-${Date.now()}-${nextObjectId++}`
}

export function createGameObject({
                                   id = generateObjectId(),
                                   type = 'unit',
                                   wx = 0,
                                   wy = 0,
                                   radius = 16,
                                   group = DEFAULT_GROUP,
                                   stats = {},
                                   destination = null,
                                   ...properties
                                 } = {}) {
  return {
    id,
    type,
    wx,
    wy,
    radius,
    group,
    destination: destination ? { wx: destination.wx, wy: destination.wy } : null,
    stats: { ...stats },
    ...properties,
  }
}

export function createUnit(config = {}) {
  const { stats = {}, ...rest } = config
  const mergedStats = { ...DEFAULT_UNIT_STATS, ...stats }
  return createGameObject({
    type: 'unit',
    ...rest,
    stats: mergedStats,
    maxHp: mergedStats.hp,
  })
}

export function createBuilding(config = {}) {
  const { stats = {}, sizeN = 1, ...rest } = config
  const mergedStats = { ...DEFAULT_BUILDING_STATS, ...stats, speed: 0 }
  return createGameObject({
    type: 'building',
    sizeN: Math.max(1, sizeN),
    ...rest,
    stats: mergedStats,
    maxHp: mergedStats.hp,
  })
}