import {ENTITY_KINDS, MOVEMENT_TYPES} from './entityTypes.js'
import {tileToWorld} from './map.js'

let nextEntityId = 1

function takeNextEntityId() {
    const id = nextEntityId
    nextEntityId++
    return id
}

export function createUnit(type, position, groupId) {
    return {
        id: takeNextEntityId(),
        kind: ENTITY_KINDS.UNIT,
        type: type,
        groupId: groupId,
        position: {x: position.x, y: position.y},
        heading: 0,
        facing: 0,
        isMoving: false,
        altitude: type.cruiseAltitude,
        attackCooldown: 0,
        scanCooldown: 0,
        cargo: 0,
        isMining: false,
        health: type.maxHealth,
    }
}

const CONSTRUCTION_START_HEALTH_FRACTION = 0.1

export function createBuilding(type, map, originTile, groupId, isAlreadyConstructed) {
    const corner = tileToWorld(map, originTile)
    const sideLength = type.size * map.tileSize

    return {
        id: takeNextEntityId(),
        kind: ENTITY_KINDS.BUILDING,
        type: type,
        groupId: groupId,
        tile: {column: originTile.column, row: originTile.row},
        footprint: {
            minX: corner.x,
            maxX: corner.x + sideLength,
            minY: corner.y,
            maxY: corner.y + sideLength,
        },
        position: {
            x: corner.x + sideLength / 2,
            y: corner.y + sideLength / 2,
        },
        constructionProgress: isAlreadyConstructed ? 1 : 0,
        health: isAlreadyConstructed ? type.maxHealth : type.maxHealth * CONSTRUCTION_START_HEALTH_FRACTION,
        spawnCooldown: 0,
        attackCooldown: 0,
        scanCooldown: 0,
        targetId: null,
        facing: 0,
    }
}

export function isConstructed(building) {
    return building.constructionProgress >= 1
}

export function getConstructionHealthGain(building, progressGain) {
    return building.type.maxHealth * (1 - CONSTRUCTION_START_HEALTH_FRACTION) * progressGain
}

export function isUnit(entity) {
    return entity.kind === ENTITY_KINDS.UNIT
}

export function isBuilding(entity) {
    return entity.kind === ENTITY_KINDS.BUILDING
}

export function isFlyingUnit(entity) {
    return isUnit(entity) && entity.type.movement === MOVEMENT_TYPES.AIR
}

export function findEntityById(entities, id) {
    for (let index = 0; index < entities.length; index++) {
        if (entities[index].id === id) {
            return entities[index]
        }
    }
    return null
}

export function getEntityHitHeight(entity) {
    if (isBuilding(entity)) {
        return entity.type.height / 2
    }
    return entity.altitude + entity.type.radius
}

export function canFight(entity) {
    return entity.type.damage > 0
}
