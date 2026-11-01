let nextObjectId = 1

function generateObjectId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `game-object-${Date.now()}-${nextObjectId++}`
}

/** Creates a plain, Vuex-friendly game object that can be extended by type. */
export function createGameObject({
  id = generateObjectId(),
  type = 'unit',
  wx = 0,
  wy = 0,
  radius = 16,
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
    destination: destination ? { wx: destination.wx, wy: destination.wy } : null,
    stats: { ...stats },
    ...properties,
  }
}

export function createUnit(config = {}) {
  return createGameObject({ type: 'unit', ...config })
}

export function createBuilding(config = {}) {
  return createGameObject({ type: 'building', ...config, stats: { speed: 0, ...config.stats } })
}
