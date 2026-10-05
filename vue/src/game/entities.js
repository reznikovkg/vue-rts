import {ENTITY_KINDS} from './entityTypes.js'

let nextEntityId = 1

function takeNextEntityId() {
    const id = nextEntityId
    nextEntityId++
    return id
}

export function createUnit(type, position) {
    return {
        id: takeNextEntityId(),
        kind: ENTITY_KINDS.UNIT,
        type: type,
        position: {x: position.x, y: position.y},
        health: type.maxHealth,
        target: null,
    }
}

export function createBuilding(type, position) {
    return {
        id: takeNextEntityId(),
        kind: ENTITY_KINDS.BUILDING,
        type: type,
        position: {x: position.x, y: position.y},
        health: type.maxHealth,
    }
}

export function isUnit(entity) {
    return entity.kind === ENTITY_KINDS.UNIT
}

export function isBuilding(entity) {
    return entity.kind === ENTITY_KINDS.BUILDING
}
