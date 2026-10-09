import {BUILDING_TYPES, UNIT_TYPES} from '../entityTypes.js'
import {createBuilding, createUnit} from '../entities.js'
import {createMap, TERRAIN_TYPES, tileToWorldCenter} from '../map.js'
import {createDeposits, isInsideAnyCircle} from './baseLayout.js'

const DEPOSIT_TILES = [
    {column: 4, row: 14},
    {column: 5, row: 14},
    {column: 4, row: 15},
    {column: 5, row: 15},
    {column: 40, row: 42},
    {column: 41, row: 42},
    {column: 40, row: 43},
    {column: 41, row: 43},
    {column: 39, row: 3},
    {column: 40, row: 3},
    {column: 39, row: 4},
    {column: 40, row: 4},
    {column: 22, row: 24},
    {column: 23, row: 24},
    {column: 22, row: 25},
    {column: 23, row: 25},
]

const LAKE_CENTER = {column: 34, row: 14}
const LAKE_RADIUS = 7
const RIVER_BASE_ROW = 30
const FORD_COLUMNS = {from: 20, to: 22}
const MOUNTAINS = [
    {center: {column: 6, row: 22}, radius: 2.5},
    {center: {column: 9, row: 23}, radius: 2.5},
    {center: {column: 26, row: 20}, radius: 2},
    {center: {column: 27, row: 23}, radius: 2},
]

function isLakeTile(column, row) {
    const columnDistance = column - LAKE_CENTER.column
    const rowDistance = row - LAKE_CENTER.row
    return columnDistance * columnDistance + rowDistance * rowDistance < LAKE_RADIUS * LAKE_RADIUS
}

function isRiverTile(column, row) {
    if (column >= FORD_COLUMNS.from && column <= FORD_COLUMNS.to) {
        return false
    }
    const riverRow = RIVER_BASE_ROW + Math.round(Math.sin(column / 5) * 3)
    return Math.abs(row - riverRow) <= 1
}

function getRiverValleyTerrain(column, row) {
    if (isLakeTile(column, row) || isRiverTile(column, row)) {
        return TERRAIN_TYPES.WATER
    }
    if (isInsideAnyCircle(column, row, MOUNTAINS)) {
        return TERRAIN_TYPES.MOUNTAIN
    }
    return TERRAIN_TYPES.LAND
}

export function createRiverValleyScenario() {
    const map = createMap(48, 48, getRiverValleyTerrain)

    const atTile = (column, row) => tileToWorldCenter(map, {column: column, row: row})

    const entities = [
        createBuilding(BUILDING_TYPES.CORE, map, {column: 8, row: 8}, 1, true),
        createBuilding(BUILDING_TYPES.FACTORY, map, {column: 14, row: 9}, 1, true),
        createUnit(UNIT_TYPES.MECH, atTile(10, 14), 1),
        createUnit(UNIT_TYPES.MECH, atTile(12, 14), 1),
        createUnit(UNIT_TYPES.MECH, atTile(14, 14), 1),
        createUnit(UNIT_TYPES.GLIDER, atTile(17, 15), 1),
        createUnit(UNIT_TYPES.BOAT, atTile(31, 14), 1),

        createBuilding(BUILDING_TYPES.CORE, map, {column: 36, row: 38}, 2, true),
        createBuilding(BUILDING_TYPES.FACTORY, map, {column: 30, row: 40}, 2, true),
        createUnit(UNIT_TYPES.MECH, atTile(32, 37), 2),
        createUnit(UNIT_TYPES.MECH, atTile(34, 37), 2),
        createUnit(UNIT_TYPES.MECH, atTile(36, 36), 2),

        createBuilding(BUILDING_TYPES.AIRFIELD, map, {column: 42, row: 2}, 3, true),
        createBuilding(BUILDING_TYPES.SHIPYARD, map, {column: 39, row: 8}, 3, true),
        createBuilding(BUILDING_TYPES.HABITAT, map, {column: 44, row: 10}, 3, true),
        createUnit(UNIT_TYPES.GLIDER, atTile(44, 7), 3),
        createUnit(UNIT_TYPES.GLIDER, atTile(46, 7), 3),
        createUnit(UNIT_TYPES.BOAT, atTile(36, 12), 3),
    ]

    return {
        map: map,
        entities: entities,
        deposits: createDeposits(map, DEPOSIT_TILES),
        cameraStart: atTile(14, 13),
    }
}
