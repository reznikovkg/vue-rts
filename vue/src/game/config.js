export const TILE_W = 64
export const TILE_H = 32
export const MAP_SIZE = 24
export const TICK_MS = 50
export const CAMERA_SPEED = 14

export const GROUPS = [1, 2, 3]
export const GROUP_COLORS = { 1: '#3b82f6', 2: '#ef4444', 3: '#22c55e' }

export const UNIT_TYPES = {
  soldier: { name: 'Воин', terrain: 'land', hp: 100, strength: 10, speed: 3, attackSpeed: 1, icon: '⚔️' },
  boat: { name: 'Лодка', terrain: 'water', hp: 80, strength: 15, speed: 4, attackSpeed: 0.5, icon: '⛵' },
}

export const BUILDING_TYPES = {
  wall: { name: 'Башня', size: 1, hp: 100, spawn: null, icon: '🗼' },
  barracks: { name: 'Казарма', size: 2, hp: 200, spawn: 'soldier', icon: '🏰' },
  dock: { name: 'Порт', size: 3, hp: 300, spawn: 'boat', icon: '⚓' },
}
