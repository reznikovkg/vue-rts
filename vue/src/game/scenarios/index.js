import {createArchipelagoScenario} from './archipelago.js'
import {createDuelScenario} from './duel.js'
import {createFourCornersScenario} from './fourCorners.js'
import {createRiverValleyScenario} from './riverValley.js'

export const SCENARIOS = [
    {
        key: 'RIVER_VALLEY',
        name: 'River Valley',
        description: '3 groups. A river with a single ford and a lake.',
        create: createRiverValleyScenario,
    },
    {
        key: 'ARCHIPELAGO',
        name: 'Archipelago',
        description: '2 groups on islands.',
        create: createArchipelagoScenario,
    },
    {
        key: 'DUEL',
        name: 'Duel',
        description: '2 groups on a small field.',
        create: createDuelScenario,
    },
    {
        key: 'FOUR_CORNERS',
        name: 'Four Corners',
        description: '4 groups in the corners around a central lake.',
        create: createFourCornersScenario,
    },
]

export function findScenario(key) {
    for (let index = 0; index < SCENARIOS.length; index++) {
        if (SCENARIOS[index].key === key) {
            return SCENARIOS[index]
        }
    }
    return null
}
