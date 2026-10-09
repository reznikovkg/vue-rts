import {isTileInsideMap, tileToWorld, tileToWorldCenter, worldToTile} from './map.js'
import {getDistance} from './geometry.js'
import {isBuilding} from './entities.js'

export const FOG_STATES = {
    HIDDEN: 0,
    EXPLORED: 1,
    VISIBLE: 2,
}

const FOG_UPDATE_INTERVAL_SECONDS = 0.2

export function createFog(map, groupId) {
    return {
        groupId: groupId,
        tiles: new Array(map.columns * map.rows).fill(FOG_STATES.HIDDEN),
        version: 0,
        secondsUntilUpdate: 0,
    }
}

function revealAround(fog, map, center, radius) {
    const firstTile = worldToTile(map, {x: center.x - radius, y: center.y - radius})
    const lastTile = worldToTile(map, {x: center.x + radius, y: center.y + radius})

    for (let column = firstTile.column; column <= lastTile.column; column++) {
        for (let row = firstTile.row; row <= lastTile.row; row++) {
            const tile = {column: column, row: row}
            if (isTileInsideMap(map, tile) && getDistance(center, tileToWorldCenter(map, tile)) <= radius) {
                fog.tiles[row * map.columns + column] = FOG_STATES.VISIBLE
            }
        }
    }
}

export function refreshFog(world) {
    const fog = world.fog
    for (let index = 0; index < fog.tiles.length; index++) {
        if (fog.tiles[index] === FOG_STATES.VISIBLE) {
            fog.tiles[index] = FOG_STATES.EXPLORED
        }
    }

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (entity.groupId === fog.groupId && entity.health > 0) {
            revealAround(fog, world.map, entity.position, entity.type.sightRange)
        }
    }
    fog.version++
}

export function advanceFog(world, deltaSeconds) {
    if (!world.fog) {
        return
    }
    world.fog.secondsUntilUpdate -= deltaSeconds
    if (world.fog.secondsUntilUpdate > 0) {
        return
    }
    world.fog.secondsUntilUpdate = FOG_UPDATE_INTERVAL_SECONDS
    refreshFog(world)
}

function getTileFogState(fog, map, point) {
    const tile = worldToTile(map, point)
    if (!isTileInsideMap(map, tile)) {
        return FOG_STATES.HIDDEN
    }
    return fog.tiles[tile.row * map.columns + tile.column]
}

export function isPointVisible(fog, map, point) {
    return fog === null || getTileFogState(fog, map, point) === FOG_STATES.VISIBLE
}

export function isPointExplored(fog, map, point) {
    return fog === null || getTileFogState(fog, map, point) !== FOG_STATES.HIDDEN
}

export function isSeenByFogOwner(fog, map, item) {
    if (fog === null || item.groupId === fog.groupId) {
        return true
    }
    if (item.groupId !== undefined && !isBuilding(item)) {
        return isPointVisible(fog, map, item.position)
    }
    return isPointExplored(fog, map, item.position)
}

const SEAM_OVERLAP = 1

function getRunPath(map, row, firstColumn, lastColumn) {
    const corner = tileToWorld(map, {column: firstColumn, row: row})
    const width = (lastColumn - firstColumn + 1) * map.tileSize + SEAM_OVERLAP
    const height = map.tileSize + SEAM_OVERLAP
    return 'M ' + corner.x + ' ' + corner.y + ' h ' + width + ' v ' + height + ' h ' + -width + ' Z '
}

export function buildTilesPath(map, tiles, fogState) {
    let path = ''

    for (let row = 0; row < map.rows; row++) {
        let runStartColumn = null
        for (let column = 0; column <= map.columns; column++) {
            const isIncluded = column < map.columns && tiles[row * map.columns + column] === fogState
            if (isIncluded && runStartColumn === null) {
                runStartColumn = column
            }
            if (!isIncluded && runStartColumn !== null) {
                path += getRunPath(map, row, runStartColumn, column - 1)
                runStartColumn = null
            }
        }
    }
    return path
}

export function buildExploredAreaPath(map, tiles) {
    return buildTilesPath(map, tiles, FOG_STATES.EXPLORED) + buildTilesPath(map, tiles, FOG_STATES.VISIBLE)
}

export function isTileExploredIn(map, tiles, tile) {
    if (!isTileInsideMap(map, tile)) {
        return false
    }
    return tiles === null || tiles[tile.row * map.columns + tile.column] !== FOG_STATES.HIDDEN
}
