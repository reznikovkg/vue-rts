import {isBuilding} from './entities.js'
import {clamp} from './geometry.js'
import {getMountainHeight, getTerrain, isTileInsideMap, TERRAIN_TYPES, worldToTile} from './map.js'

const OBSTACLE_CLEARANCE = 20
const CLIMB_START_DISTANCE = 120
const CLIMB_SPEED = 200

function isNearFootprint(position, footprint, distance) {
    const isNearX = position.x > footprint.minX - distance && position.x < footprint.maxX + distance
    const isNearY = position.y > footprint.minY - distance && position.y < footprint.maxY + distance
    return isNearX && isNearY
}

function getHighestMountainNearby(map, position) {
    const firstTile = worldToTile(map, {x: position.x - CLIMB_START_DISTANCE, y: position.y - CLIMB_START_DISTANCE})
    const lastTile = worldToTile(map, {x: position.x + CLIMB_START_DISTANCE, y: position.y + CLIMB_START_DISTANCE})
    let highestMountain = 0

    for (let column = firstTile.column; column <= lastTile.column; column++) {
        for (let row = firstTile.row; row <= lastTile.row; row++) {
            const tile = {column: column, row: row}
            if (isTileInsideMap(map, tile) && getTerrain(map, tile) === TERRAIN_TYPES.MOUNTAIN) {
                highestMountain = Math.max(highestMountain, getMountainHeight(tile))
            }
        }
    }
    return highestMountain
}

function getRequiredAltitude(world, unit) {
    let requiredAltitude = unit.type.cruiseAltitude

    const highestMountain = getHighestMountainNearby(world.map, unit.position)
    if (highestMountain > 0) {
        requiredAltitude = Math.max(requiredAltitude, highestMountain + OBSTACLE_CLEARANCE)
    }

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (!isBuilding(entity) || !isNearFootprint(unit.position, entity.footprint, CLIMB_START_DISTANCE)) {
            continue
        }
        requiredAltitude = Math.max(requiredAltitude, entity.type.height + OBSTACLE_CLEARANCE)
    }

    return requiredAltitude
}

export function updateAltitude(world, unit, deltaSeconds) {
    if (unit.type.cruiseAltitude === 0) {
        return
    }

    const maxChange = CLIMB_SPEED * deltaSeconds
    const altitudeDifference = getRequiredAltitude(world, unit) - unit.altitude
    unit.altitude += clamp(altitudeDifference, -maxChange, maxChange)
}
