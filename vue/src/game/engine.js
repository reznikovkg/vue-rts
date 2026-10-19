import { MAP_SIZE as N, UNIT_TYPES, BUILDING_TYPES } from './config.js'
import { nextStep } from './pathfinding.js'

const idx = (x, y) => y * N + x

export function makeUnit(state, type, x, y, group) {
  const t = UNIT_TYPES[type]
  return {
    id: state.nextId++, kind: 'unit', type, group, x, y, terrain: t.terrain,
    hp: t.hp, maxHp: t.hp, strength: t.strength, speed: t.speed, attackSpeed: t.attackSpeed,
    moveProgress: 1, attackProgress: 1,
  }
}

export function makeBuilding(state, type, x, y, group) {
  const t = BUILDING_TYPES[type]
  return { id: state.nextId++, kind: 'building', type, group, x, y, size: t.size, hp: t.hp, maxHp: t.hp }
}

export function distTo(target, x, y) {
  const size = target.size || 1
  const dx = Math.max(target.x - x, 0, x - (target.x + size - 1))
  const dy = Math.max(target.y - y, 0, y - (target.y + size - 1))
  return Math.max(dx, dy)
}

export function buildOccupied(state) {
  const occ = new Set()
  state.rocks.forEach(r => occ.add(idx(r.x, r.y)))
  state.buildings.forEach(b => {
    for (let dy = 0; dy < b.size; dy++) {
      for (let dx = 0; dx < b.size; dx++) occ.add(idx(b.x + dx, b.y + dy))
    }
  })
  state.units.forEach(u => occ.add(idx(u.x, u.y)))
  return occ
}

export function canPlace(state, type, x, y) {
  const size = BUILDING_TYPES[type].size
  if (x < 0 || y < 0 || x + size > N || y + size > N) return false
  const occ = buildOccupied(state)
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      if (state.terrain[y + dy][x + dx] !== 'land' || occ.has(idx(x + dx, y + dy))) return false
    }
  }
  return true
}

export function spawnUnit(state, b) {
  const typeKey = BUILDING_TYPES[b.type].spawn
  if (!typeKey) return null
  const terrain = UNIT_TYPES[typeKey].terrain
  const occ = buildOccupied(state)
  for (let r = 1; r <= 8; r++) {
    for (let y = b.y - r; y <= b.y + b.size - 1 + r; y++) {
      for (let x = b.x - r; x <= b.x + b.size - 1 + r; x++) {
        if (x < 0 || y < 0 || x >= N || y >= N || distTo(b, x, y) !== r) continue
        if (state.terrain[y][x] !== terrain || occ.has(idx(x, y))) continue
        return makeUnit(state, typeKey, x, y, b.group)
      }
    }
  }
  return null
}

const findEntity = (state, id) =>
  state.units.find(u => u.id === id) || state.buildings.find(b => b.id === id)

export function removeDead(state) {
  const dead = new Set([...state.units, ...state.buildings].filter(e => e.dead).map(e => e.id))
  if (!dead.size) return
  state.units = state.units.filter(u => !dead.has(u.id))
  state.buildings = state.buildings.filter(b => !dead.has(b.id))
  state.events = state.events.filter(e => !dead.has(e.unitId) && !dead.has(e.targetId))
  state.selected = state.selected.filter(id => !dead.has(id))
}

export function tick(state, dt) {
  const occ = buildOccupied(state)
  const finished = new Set()

  for (const u of state.units) {
    u.attackProgress = Math.min(1, u.attackProgress + u.attackSpeed * dt)
    const ev = state.events.find(e => e.unitId === u.id && !finished.has(e.id))
    if (!ev) { u.moveProgress = 1; continue }
    u.moveProgress = Math.min(1, u.moveProgress + u.speed * dt)

    let distFn
    if (ev.type === 'move') {
      if (u.x === ev.x && u.y === ev.y) { finished.add(ev.id); continue }
      distFn = (x, y) => (x - ev.x) ** 2 + (y - ev.y) ** 2
    } else {
      const target = findEntity(state, ev.targetId)
      if (!target || target.dead) { finished.add(ev.id); continue }
      if (distTo(target, u.x, u.y) <= 1) {
        if (u.attackProgress >= 1) {
          target.hp -= u.strength
          u.attackProgress = 0
          if (target.hp <= 0) target.dead = true
        }
        continue
      }
      distFn = (x, y) => distTo(target, x, y)
    }

    if (u.moveProgress < 1) continue
    const step = nextStep(u, state.terrain, occ, distFn)
    if (!step) { finished.add(ev.id); continue }
    occ.delete(idx(u.x, u.y))
    u.x = step.x
    u.y = step.y
    occ.add(idx(u.x, u.y))
    u.moveProgress -= 1
  }

  state.events = state.events.filter(e => !finished.has(e.id))
  removeDead(state)

  const groups = new Set([...state.units, ...state.buildings].map(e => e.group))
  if (groups.size > 1) state.hadFight = true
  if (state.hadFight && groups.size <= 1) {
    state.gameOver = true
    state.winner = [...groups][0] ?? null
  }
}
