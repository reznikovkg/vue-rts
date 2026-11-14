import { makeBuilding, makeUnit } from './helpers'
import type { Scenario } from '@/game/types'

// битва: две базы, воины идут к центру, но не друг на друга
export const BATTLE: Scenario = {
  id: 'battle',
  name: 'Битва',
  objects: [
    makeBuilding(1, 'castle', 1, -600, 0),
    makeBuilding(2, 'castle', 2, 600, 0),
    { id: 3, type: 'tree', group: 0, position: { x: 0, y: -250 } },
    { id: 4, type: 'tree', group: 0, position: { x: 0, y: 250 } },
  ],
  units: [
    makeUnit(5, 'warrior', 1, -350, -60),
    makeUnit(6, 'warrior', 1, -350, 60),
    makeUnit(7, 'worker', 1, -420, 0),
    makeUnit(8, 'warrior', 2, 350, -60),
    makeUnit(9, 'warrior', 2, 350, 60),
    makeUnit(10, 'worker', 2, 420, 0),
  ],
  terrain: [],
  events: [
    { at: 3, unitId: 8, target: { x: 60, y: -60 } },
    { at: 3, unitId: 9, target: { x: 60, y: 60 } },
    { at: 6, unitId: 5, target: { x: -60, y: -60 } },
    { at: 6, unitId: 6, target: { x: -60, y: 60 } },
  ],
}
