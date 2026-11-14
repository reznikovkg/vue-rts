import { makeUnit } from './helpers'
import type { Scenario } from '@/game/types'

// дуэль: два воина, второй идёт к центру через 2 секунды
export const DUEL: Scenario = {
  id: 'duel',
  name: 'Дуэль',
  objects: [
    { id: 1, type: 'tree', group: 0, position: { x: 0, y: -200 } },
  ],
  units: [
    makeUnit(2, 'warrior', 1, -200, 0),
    makeUnit(3, 'warrior', 2, 200, 0),
  ],
  terrain: [],
  events: [
    { at: 2, unitId: 3, target: { x: 0, y: 0 } },
  ],
}
