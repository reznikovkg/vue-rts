// персонажи
// характеристики лежат в таблице (пока так)

import type { Point } from './map'

export const UNIT_TYPES = {
  villager: { name: 'Медленный', letter: 'М', speed: 1.5, size: 0.9, color: '#3d6fb8' },
  scout: { name: 'Быстрый', letter: 'Б', speed: 3, size: 1.1, color: '#b8432f' },
}

export type UnitType = keyof typeof UNIT_TYPES

export interface Unit {
  type: UnitType
  x: number
  y: number
  target: Point | null // куда идет, null если стоит
}

export function createUnit(type: UnitType, x: number, y: number): Unit {
  return { type, x, y, target: null }
}

// шаг к цели, dt в секундах
// путь за кадр = скорость * dt, поэтому скорость не зависит от fps
export function updateUnit(unit: Unit, dt: number): void {
  if (!unit.target) return
  const dx = unit.target.x - unit.x
  const dy = unit.target.y - unit.y
  const dist = Math.hypot(dx, dy)
  const step = UNIT_TYPES[unit.type].speed * dt

  if (dist <= step) {
    unit.x = unit.target.x
    unit.y = unit.target.y
    unit.target = null
  } else {
    unit.x += (dx / dist) * step
    unit.y += (dy / dist) * step
  }
}
