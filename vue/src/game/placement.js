import {isAreaFreeOfGroundUnits, isTileUnderBuilding} from './collision.js'
import {isTileOnDeposit} from './deposits.js'
import {getTerrain, isTileInsideMap, TERRAIN_TYPES, tileToWorld, worldToTile} from './map.js'

export function getPlacementOrigin(map, buildingType, cursorWorldPoint) {
    const cursorTile = worldToTile(map, cursorWorldPoint)
    const halfSize = Math.floor(buildingType.size / 2)
    return {
        column: cursorTile.column - halfSize,
        row: cursorTile.row - halfSize,
    }
}

export function getFootprintArea(map, buildingType, originTile) {
    const corner = tileToWorld(map, originTile)
    const sideLength = buildingType.size * map.tileSize
    return {
        minX: corner.x,
        maxX: corner.x + sideLength,
        minY: corner.y,
        maxY: corner.y + sideLength,
    }
}

function isFootprintTileBuildable(world, tile) {
    if (!isTileInsideMap(world.map, tile)) {
        return false
    }
    if (getTerrain(world.map, tile) !== TERRAIN_TYPES.LAND) {
        return false
    }
    if (isTileOnDeposit(world.deposits, tile)) {
        return false
    }
    return !isTileUnderBuilding(world.entities, tile)
}

function isWaterTile(map, tile) {
    return isTileInsideMap(map, tile) && getTerrain(map, tile) === TERRAIN_TYPES.WATER
}

function hasWaterAround(map, buildingType, originTile) {
    const lastColumn = originTile.column + buildingType.size
    const lastRow = originTile.row + buildingType.size

    for (let column = originTile.column - 1; column <= lastColumn; column++) {
        for (let row = originTile.row - 1; row <= lastRow; row++) {
            if (isWaterTile(map, {column: column, row: row})) {
                return true
            }
        }
    }
    return false
}

export function canPlaceBuilding(world, buildingType, originTile) {
    for (let columnOffset = 0; columnOffset < buildingType.size; columnOffset++) {
        for (let rowOffset = 0; rowOffset < buildingType.size; rowOffset++) {
            const tile = {column: originTile.column + columnOffset, row: originTile.row + rowOffset}
            if (!isFootprintTileBuildable(world, tile)) {
                return false
            }
        }
    }

    if (!isAreaFreeOfGroundUnits(world, getFootprintArea(world.map, buildingType, originTile))) {
        return false
    }

    if (buildingType.requiresWater) {
        return hasWaterAround(world.map, buildingType, originTile)
    }
    return true
}
