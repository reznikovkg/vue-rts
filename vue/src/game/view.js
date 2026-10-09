const RENDERED_FIELDS = ['health', 'facing', 'altitude', 'isMoving', 'isMining', 'cargo', 'constructionProgress', 'spawnCooldown']

function copyEntity(entity) {
    const copy = {...entity}
    copy.position = {x: entity.position.x, y: entity.position.y}
    return copy
}

function isCopyUpToDate(copy, entity) {
    if (copy.position.x !== entity.position.x || copy.position.y !== entity.position.y) {
        return false
    }
    for (let index = 0; index < RENDERED_FIELDS.length; index++) {
        const field = RENDERED_FIELDS[index]
        if (copy[field] !== entity[field]) {
            return false
        }
    }
    return true
}

function indexById(entities) {
    const entitiesById = {}
    for (let index = 0; index < entities.length; index++) {
        entitiesById[entities[index].id] = entities[index]
    }
    return entitiesById
}

function copyItems(items) {
    const copies = []
    for (let index = 0; index < items.length; index++) {
        copies.push({...items[index]})
    }
    return copies
}

function getFogTiles(world, previousView) {
    if (!world.fog) {
        return null
    }
    const isFogUnchanged = previousView && previousView.fogVersion === world.fog.version && previousView.fogTiles !== null
    if (isFogUnchanged) {
        return previousView.fogTiles
    }
    return world.fog.tiles.slice()
}

export function createWorldView(world, previousView) {
    const previousCopies = previousView ? indexById(previousView.entities) : {}
    const entities = []

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        const previousCopy = previousCopies[entity.id]
        if (previousCopy !== undefined && isCopyUpToDate(previousCopy, entity)) {
            entities.push(previousCopy)
        } else {
            entities.push(copyEntity(entity))
        }
    }

    return {
        entities: entities,
        events: copyItems(world.events),
        effects: copyItems(world.effects),
        deposits: copyItems(world.deposits),
        resources: {...world.resources},
        fogVersion: world.fog ? world.fog.version : 0,
        fogTiles: getFogTiles(world, previousView),
    }
}
