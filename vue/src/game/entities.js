export const KINDS = { UNIT: 'unit', BUILDING: 'building' }

export const UNIT_TYPES = {
  slow: { name: 'Медленный', speed: 1.5, size: 0.8, color: '#3d6fb8' },
  fast: { name: 'Быстрый', speed: 3, size: 0.8, color: '#b8432f' },
}

export const BUILDING_TYPES = {
  house: { name: 'Дом', size: 2, color: '#8a6d4b' },
  castle: { name: 'Замок', size: 4, color: '#7d7f86' },
}

let nextId = 1

export const createUnit = (type, x, y) => ({ id: nextId++, kind: KINDS.UNIT, type, x, y, target: null })

export const createBuilding = (type, x, y) => ({ id: nextId++, kind: KINDS.BUILDING, type, x, y })

export const typeOf = (entity) => (entity.kind === KINDS.UNIT ? UNIT_TYPES : BUILDING_TYPES)[entity.type]

export const isUnit = (entity) => entity.kind === KINDS.UNIT

// стартовая расстановка (здания стоят ровно по клеткам: центр + половина размера)
export const createStartEntities = () => [
  createBuilding('castle', -8, -8),
  createBuilding('house', 7, -5),
  createUnit('slow', -2, 2),
  createUnit('slow', 0, 3),
  createUnit('fast', 3, 1),
]

export const stepToTarget = (unit, dt) => {
  const dx = unit.target.x - unit.x
  const dy = unit.target.y - unit.y
  const dist = Math.hypot(dx, dy)
  const step = UNIT_TYPES[unit.type].speed * dt
  if (dist <= step) return { x: unit.target.x, y: unit.target.y, target: null }
  return { x: unit.x + (dx / dist) * step, y: unit.y + (dy / dist) * step, target: unit.target }
}