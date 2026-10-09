import {createMap, TERRAIN_TYPES, tileToWorldCenter} from '../map.js'
import {createBase, createBaseDeposits, createDeposits, isInsideAnyCircle, isInsideCircle, MIRRORS} from './baseLayout.js'

const MAP_SIZE = 44
const LAKE_CENTER = {column: 21.5, row: 21.5}
const LAKE_RADIUS = 7
const MOUNTAINS = [
    {center: {column: 21.5, row: 5}, radius: 2.5},
    {center: {column: 21.5, row: 38}, radius: 2.5},
    {center: {column: 5, row: 21.5}, radius: 2.5},
    {center: {column: 38, row: 21.5}, radius: 2.5},
]

const CONTESTED_DEPOSITS = [
    {column: 21, row: 12},
    {column: 22, row: 12},
    {column: 21, row: 31},
    {column: 22, row: 31},
    {column: 12, row: 21},
    {column: 12, row: 22},
    {column: 31, row: 21},
    {column: 31, row: 22},
]

const BASE_LAYOUT = {
    buildings: [
        {type: 'CORE', column: 3, row: 3},
        {type: 'FACTORY', column: 9, row: 3},
        {type: 'HABITAT', column: 3, row: 9},
    ],
    deposits: [
        {column: 13, row: 4},
        {column: 14, row: 4},
        {column: 13, row: 5},
        {column: 14, row: 5},
    ],
    units: [
        {type: 'MECH', column: 8, row: 8},
        {type: 'MECH', column: 10, row: 8},
        {type: 'MECH', column: 8, row: 10},
        {type: 'GLIDER', column: 12, row: 10},
    ],
}

function getFourCornersTerrain(column, row) {
    if (isInsideCircle(column, row, LAKE_CENTER, LAKE_RADIUS)) {
        return TERRAIN_TYPES.WATER
    }
    if (isInsideAnyCircle(column, row, MOUNTAINS)) {
        return TERRAIN_TYPES.MOUNTAIN
    }
    return TERRAIN_TYPES.LAND
}

export function createFourCornersScenario() {
    const map = createMap(MAP_SIZE, MAP_SIZE, getFourCornersTerrain)

    const entities = [].concat(
        createBase(map, BASE_LAYOUT, 1, MIRRORS.NONE),
        createBase(map, BASE_LAYOUT, 2, MIRRORS.COLUMNS),
        createBase(map, BASE_LAYOUT, 3, MIRRORS.ROWS),
        createBase(map, BASE_LAYOUT, 4, MIRRORS.BOTH),
    )

    const deposits = [].concat(
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.NONE),
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.COLUMNS),
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.ROWS),
        createBaseDeposits(map, BASE_LAYOUT, MIRRORS.BOTH),
        createDeposits(map, CONTESTED_DEPOSITS),
    )

    return {
        map: map,
        entities: entities,
        deposits: deposits,
        cameraStart: tileToWorldCenter(map, {column: 8, row: 8}),
    }
}
