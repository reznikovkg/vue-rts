import {createMap, TERRAIN_TYPES, tileToWorldCenter} from '../map.js'
import {createBase, createBaseDeposits, isInsideAnyCircle, MIRRORS} from './baseLayout.js'

const MAP_SIZE = 24
const ROCKS = [
    {center: {column: 11.5, row: 8}, radius: 1.6},
    {center: {column: 11.5, row: 15}, radius: 1.6},
]

const BASE_LAYOUT = {
    buildings: [
        {type: 'HABITAT', column: 2, row: 2},
        {type: 'FACTORY', column: 2, row: 5},
    ],
    deposits: [
        {column: 2, row: 10},
        {column: 3, row: 10},
        {column: 2, row: 11},
        {column: 3, row: 11},
    ],
    units: [
        {type: 'MECH', column: 6, row: 3},
        {type: 'MECH', column: 6, row: 5},
        {type: 'MECH', column: 7, row: 4},
        {type: 'MECH', column: 6, row: 7},
    ],
}

function getDuelTerrain(column, row) {
    if (isInsideAnyCircle(column, row, ROCKS)) {
        return TERRAIN_TYPES.MOUNTAIN
    }
    return TERRAIN_TYPES.LAND
}

export function createDuelScenario() {
    const map = createMap(MAP_SIZE, MAP_SIZE, getDuelTerrain)

    const entities = [].concat(
        createBase(map, BASE_LAYOUT, 1, MIRRORS.NONE),
        createBase(map, BASE_LAYOUT, 2, MIRRORS.BOTH),
    )

    const deposits = [].concat(
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.NONE),
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.BOTH),
    )

    return {
        map: map,
        entities: entities,
        deposits: deposits,
        cameraStart: tileToWorldCenter(map, {column: 12, row: 12}),
    }
}
