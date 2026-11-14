import { makeBuilding, makeUnit } from './helpers'
import type { Scenario } from '@/game/types'

// три стороны: у каждой группы свой дом и по два юнита
export const THREE_SIDES: Scenario = {
    id: 'three-sides',
    name: 'Три стороны',
    objects: [
        makeBuilding(1, 'house', 1, -400, 0),
        makeBuilding(2, 'house', 2, 400, 0),
        makeBuilding(3, 'house', 3, 0, -400),
        { id: 4, type: 'tree', group: 0, position: { x: 0, y: 0 } },
    ],
    units: [
        makeUnit(5, 'warrior', 1, -300, 0),
        makeUnit(6, 'worker', 1, -300, 60),
        makeUnit(7, 'warrior', 2, 300, 0),
        makeUnit(8, 'worker', 2, 300, 60),
        makeUnit(9, 'warrior', 3, 0, -300),
        makeUnit(10, 'worker', 3, 60, -300),
    ],
    terrain: [],
    events: [],
}