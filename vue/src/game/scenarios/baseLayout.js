import {BUILDING_TYPES, UNIT_TYPES} from '../entityTypes.js'
import {createBuilding, createUnit} from '../entities.js'
import {tileToWorldCenter} from '../map.js'
import {createDeposit, DEPOSIT_AMOUNT} from '../deposits.js'

export const MIRRORS = {
    NONE: {columns: false, rows: false},
    COLUMNS: {columns: true, rows: false},
    ROWS: {columns: false, rows: true},
    BOTH: {columns: true, rows: true},
}

function mirrorTile(map, column, row, size, mirror) {
    return {
        column: mirror.columns ? map.columns - column - size : column,
        row: mirror.rows ? map.rows - row - size : row,
    }
}

export function createBase(map, layout, groupId, mirror) {
    const entities = []

    for (let index = 0; index < layout.buildings.length; index++) {
        const placement = layout.buildings[index]
        const buildingType = BUILDING_TYPES[placement.type]
        const originTile = mirrorTile(map, placement.column, placement.row, buildingType.size, mirror)
        entities.push(createBuilding(buildingType, map, originTile, groupId, true))
    }

    for (let index = 0; index < layout.units.length; index++) {
        const placement = layout.units[index]
        const tile = mirrorTile(map, placement.column, placement.row, 1, mirror)
        entities.push(createUnit(UNIT_TYPES[placement.type], tileToWorldCenter(map, tile), groupId))
    }

    return entities
}

export function createBaseDeposits(map, layout, mirror) {
    const deposits = []
    for (let index = 0; index < layout.deposits.length; index++) {
        const placement = layout.deposits[index]
        deposits.push(createDeposit(map, mirrorTile(map, placement.column, placement.row, 1, mirror), DEPOSIT_AMOUNT))
    }
    return deposits
}

export function createDeposits(map, tiles) {
    const deposits = []
    for (let index = 0; index < tiles.length; index++) {
        deposits.push(createDeposit(map, tiles[index], DEPOSIT_AMOUNT))
    }
    return deposits
}

export function isInsideCircle(column, row, center, radius) {
    const columnDistance = column - center.column
    const rowDistance = row - center.row
    return columnDistance * columnDistance + rowDistance * rowDistance < radius * radius
}

export function isInsideAnyCircle(column, row, circles) {
    for (let index = 0; index < circles.length; index++) {
        if (isInsideCircle(column, row, circles[index].center, circles[index].radius)) {
            return true
        }
    }
    return false
}
