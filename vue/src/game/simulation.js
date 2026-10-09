import {advanceAi} from './ai.js'
import {updateAltitude} from './altitude.js'
import {rebuildBuildingGrid} from './collision.js'
import {engageNearbyEnemy, runAttackEvent, runAttackMoveEvent} from './combat.js'
import {advanceBuildings} from './construction.js'
import {removeEmptyDeposits} from './deposits.js'
import {advanceEffects, createExplosionEffect} from './effects.js'
import {canFight, getEntityHitHeight, isBuilding, isUnit} from './entities.js'
import {EVENT_TYPES, findActiveEvent, removeEventsById, removeEventsOfActor} from './events.js'
import {turnTowardsHeading} from './facing.js'
import {advanceFog} from './fog.js'
import {runMineEvent} from './mining.js'
import {runMoveEvent} from './movement.js'
import {advanceTurrets} from './turrets.js'

const MAX_PATHS_PLANNED_PER_FRAME = 6

function runEvent(world, actor, event, deltaSeconds) {
    if (event.type === EVENT_TYPES.MOVE) {
        return runMoveEvent(world, actor, event, deltaSeconds)
    }
    if (event.type === EVENT_TYPES.ATTACK) {
        return runAttackEvent(world, actor, event, deltaSeconds)
    }
    if (event.type === EVENT_TYPES.ATTACK_MOVE) {
        return runAttackMoveEvent(world, actor, event, deltaSeconds)
    }
    if (event.type === EVENT_TYPES.MINE) {
        return runMineEvent(world, actor, event, deltaSeconds)
    }
    return true
}

function reactToNearbyEnemy(world, unit, deltaSeconds) {
    if (!canFight(unit)) {
        return
    }
    const attackEvent = engageNearbyEnemy(world, unit, deltaSeconds)
    if (attackEvent !== null) {
        world.events.push(attackEvent)
    }
}

function updateUnits(world, deltaSeconds) {
    const finishedEventIds = []

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (!isUnit(entity) || entity.health <= 0) {
            continue
        }

        entity.attackCooldown = Math.max(entity.attackCooldown - deltaSeconds, 0)
        entity.isMoving = false
        entity.isMining = false

        updateAltitude(world, entity, deltaSeconds)

        const activeEvent = findActiveEvent(world.events, entity.id)
        if (activeEvent === null) {
            reactToNearbyEnemy(world, entity, deltaSeconds)
        } else if (runEvent(world, entity, activeEvent, deltaSeconds)) {
            finishedEventIds.push(activeEvent.id)
        }

        turnTowardsHeading(entity, deltaSeconds)
    }

    if (finishedEventIds.length > 0) {
        world.events = removeEventsById(world.events, finishedEventIds)
    }
}

function getExplosionSize(entity) {
    if (isBuilding(entity)) {
        return entity.type.size * 24
    }
    return entity.type.radius * 2
}

function removeDestroyedEntities(world) {
    const survivors = []

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (entity.health > 0) {
            survivors.push(entity)
            continue
        }

        world.effects.push(createExplosionEffect(entity.position, getEntityHitHeight(entity), getExplosionSize(entity)))
        world.events = removeEventsOfActor(world.events, entity.id)
    }

    if (survivors.length !== world.entities.length) {
        world.entities = survivors
    }
}

export function advanceWorld(world, deltaSeconds) {
    world.pathPlanningBudget = MAX_PATHS_PLANNED_PER_FRAME

    advanceAi(world, deltaSeconds)
    rebuildBuildingGrid(world)
    advanceBuildings(world, deltaSeconds)
    advanceTurrets(world, deltaSeconds)
    updateUnits(world, deltaSeconds)
    removeDestroyedEntities(world)
    removeEmptyDeposits(world)
    advanceFog(world, deltaSeconds)

    world.effects = advanceEffects(world.effects, deltaSeconds)
}
