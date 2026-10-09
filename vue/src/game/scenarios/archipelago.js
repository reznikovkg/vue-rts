import {createMap, TERRAIN_TYPES, tileToWorldCenter} from '../map.js'
import {createBase, createBaseDeposits, createDeposits, isInsideAnyCircle, MIRRORS} from './baseLayout.js'

const MAP_SIZE = 40

const ISLANDS = [
    {center: {column: 9, row: 9}, radius: 7},
    {center: {column: 30, row: 30}, radius: 7},
    {center: {column: 29, row: 9}, radius: 4},
    {center: {column: 10, row: 30}, radius: 4},
]

const CONTESTED_DEPOSITS = [
    {column: 29, row: 9},
    {column: 30, row: 9},
    {column: 10, row: 30},
    {column: 9, row: 30},
]

const BASE_LAYOUT = {
    buildings: [
        {type: 'CORE', column: 6, row: 6},
        {type: 'SHIPYARD', column: 14, row: 9},
        {type: 'AIRFIELD', column: 5, row: 11},
    ],
    deposits: [
        {column: 11, row: 12},
        {column: 12, row: 12},
        {column: 11, row: 13},
        {column: 12, row: 13},
    ],
    units: [
        {type: 'GLIDER', column: 10, row: 6},
        {type: 'GLIDER', column: 11, row: 6},
        {type: 'BOAT', column: 17, row: 9},
        {type: 'BOAT', column: 17, row: 11},
        {type: 'MECH', column: 8, row: 12},
    ],
}

function getArchipelagoTerrain(column, row) {
    if (isInsideAnyCircle(column, row, ISLANDS)) {
        return TERRAIN_TYPES.LAND
    }
    return TERRAIN_TYPES.WATER
}

export function createArchipelagoScenario() {
    const map = createMap(MAP_SIZE, MAP_SIZE, getArchipelagoTerrain)

    const entities = [].concat(
        createBase(map, BASE_LAYOUT, 1, MIRRORS.NONE),
        createBase(map, BASE_LAYOUT, 2, MIRRORS.BOTH),
    )

    const deposits = [].concat(
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.NONE),
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.BOTH),
        createDeposits(map, CONTESTED_DEPOSITS),
    )

    return {
        map: map,
        entities: entities,
        deposits: deposits,
        cameraStart: tileToWorldCenter(map, {column: 10, row: 10}),
    }
}
