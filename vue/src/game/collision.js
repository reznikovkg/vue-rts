import {MOVEMENT_TYPES} from './entityTypes.js'
import {isBuilding, isUnit} from './entities.js'
import {getDistance} from './geometry.js'
import {getTerrain, isTileInsideMap, TERRAIN_TYPES, worldToTile} from './map.js'

function isTerrainSuitable(terrain, movementType) {
    if (movementType === MOVEMENT_TYPES.GROUND) {
        return terrain === TERRAIN_TYPES.LAND
    }
    if (movementType === MOVEMENT_TYPES.NAVAL) {
        return terrain === TERRAIN_TYPES.WATER
    }
    return true
}

export function isTileUnderBuilding(entities, tile) {
    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index]
        if (!isBuilding(entity)) {
            continue
        }

        const isInsideColumns = tile.column >= entity.tile.column && tile.column < entity.tile.column + entity.type.size
        const isInsideRows = tile.row >= entity.tile.row && tile.row < entity.tile.row + entity.type.size
        if (isInsideColumns && isInsideRows) {
            return true
        }
    }
    return false
}

export function rebuildBuildingGrid(world) {
    const grid = new Array(world.map.columns * world.map.rows).fill(false)

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (!isBuilding(entity)) {
            continue
        }
        for (let column = entity.tile.column; column < entity.tile.column + entity.type.size; column++) {
            for (let row = entity.tile.row; row < entity.tile.row + entity.type.size; row++) {
                grid[row * world.map.columns + column] = true
            }
        }
    }

    world.buildingGrid = grid
}

function isTileOccupiedByBuilding(world, tile) {
    if (world.buildingGrid === undefined) {
        return isTileUnderBuilding(world.entities, tile)
    }
    return world.buildingGrid[tile.row * world.map.columns + tile.column]
}

export function isTileWalkableFor(world, tile, movementType) {
    if (!isTileInsideMap(world.map, tile)) {
        return false
    }
    if (movementType === MOVEMENT_TYPES.AIR) {
        return true
    }
    if (!isTerrainSuitable(getTerrain(world.map, tile), movementType)) {
        return false
    }
    return !isTileOccupiedByBuilding(world, tile)
}

const CLEAR_LINE_SAMPLE_STEP = 16

function isUnitAreaWalkable(world, unit, center) {
    const radius = unit.type.radius
    const corners = [
        {x: center.x - radius, y: center.y - radius},
        {x: center.x + radius, y: center.y - radius},
        {x: center.x + radius, y: center.y + radius},
        {x: center.x - radius, y: center.y + radius},
    ]

    for (let index = 0; index < corners.length; index++) {
        const cornerTile = worldToTile(world.map, corners[index])
        if (!isTileWalkableFor(world, cornerTile, unit.type.movement)) {
            return false
        }
    }
    return true
}

export function hasClearLine(world, unit, from, to) {
    const distance = getDistance(from, to)
    const sampleCount = Math.ceil(distance / CLEAR_LINE_SAMPLE_STEP)

    for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex++) {
        const progress = sampleIndex / sampleCount
        const samplePoint = {
            x: from.x + (to.x - from.x) * progress,
            y: from.y + (to.y - from.y) * progress,
        }
        if (!isUnitAreaWalkable(world, unit, samplePoint)) {
            return false
        }
    }
    return true
}

function isSameHeightLayer(firstUnit, secondUnit) {
    const isFirstFlying = firstUnit.type.movement === MOVEMENT_TYPES.AIR
    const isSecondFlying = secondUnit.type.movement === MOVEMENT_TYPES.AIR
    return isFirstFlying === isSecondFlying
}

function isPushingIntoUnit(unit, candidatePosition, otherUnit) {
    const minimalDistance = unit.type.radius + otherUnit.type.radius
    const candidateDistance = getDistance(candidatePosition, otherUnit.position)
    if (candidateDistance >= minimalDistance) {
        return false
    }

    const currentDistance = getDistance(unit.position, otherUnit.position)
    return candidateDistance < currentDistance
}

export function canUnitStandAt(world, unit, position) {
    const tile = worldToTile(world.map, position)
    if (!isTileWalkableFor(world, tile, unit.type.movement)) {
        return false
    }

    for (let index = 0; index < world.entities.length; index++) {
        const otherEntity = world.entities[index]
        if (otherEntity.id === unit.id || !isUnit(otherEntity) || !isSameHeightLayer(unit, otherEntity)) {
            continue
        }
        if (isPushingIntoUnit(unit, position, otherEntity)) {
            return false
        }
    }

    return true
}

export function canPlaceUnitAt(world, unitType, position) {
    const tile = worldToTile(world.map, position)
    if (!isTileWalkableFor(world, tile, unitType.movement)) {
        return false
    }

    const isFlying = unitType.movement === MOVEMENT_TYPES.AIR
    for (let index = 0; index < world.entities.length; index++) {
        const otherEntity = world.entities[index]
        if (!isUnit(otherEntity)) {
            continue
        }

        const isOtherFlying = otherEntity.type.movement === MOVEMENT_TYPES.AIR
        const minimalDistance = unitType.radius + otherEntity.type.radius
        if (isFlying === isOtherFlying && getDistance(position, otherEntity.position) < minimalDistance) {
            return false
        }
    }
    return true
}

export function isAreaFreeOfGroundUnits(world, area) {
    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (!isUnit(entity) || entity.type.movement === MOVEMENT_TYPES.AIR) {
            continue
        }

        const radius = entity.type.radius
        const isInsideX = entity.position.x + radius > area.minX && entity.position.x - radius < area.maxX
        const isInsideY = entity.position.y + radius > area.minY && entity.position.y - radius < area.maxY
        if (isInsideX && isInsideY) {
            return false
        }
    }
    return true
}
