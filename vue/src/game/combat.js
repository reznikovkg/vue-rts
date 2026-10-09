import {createShotEffect} from './effects.js'
import {findEntityById, getEntityHitHeight, isBuilding, isUnit} from './entities.js'
import {createAttackEvent, createMoveEvent} from './events.js'
import {clamp, getDistance} from './geometry.js'
import {areEnemies} from './groups.js'
import {runMoveEvent} from './movement.js'

const CHASE_REPATH_DISTANCE = 64
const AUTOMATIC_CHASE_LEASH = 200
const AGGRESSION_RANGE_BONUS = 80
const SCAN_INTERVAL_SECONDS = 0.25

export function getClosestPointOfEntity(from, entity) {
    if (!isBuilding(entity)) {
        return entity.position
    }

    const footprint = entity.footprint
    return {
        x: clamp(from.x, footprint.minX, footprint.maxX),
        y: clamp(from.y, footprint.minY, footprint.maxY),
    }
}

export function getDistanceToEntity(from, entity) {
    const closestPoint = getClosestPointOfEntity(from, entity)
    const distance = getDistance(from, closestPoint)
    if (isBuilding(entity)) {
        return distance
    }
    return Math.max(distance - entity.type.radius, 0)
}

export function getAggressionRange(entity) {
    if (isBuilding(entity)) {
        return entity.type.attackRange
    }
    return entity.type.attackRange + AGGRESSION_RANGE_BONUS
}

export function findNearestEnemy(world, shooter, range) {
    let nearestUnit = null
    let nearestUnitDistance = Infinity
    let nearestBuilding = null
    let nearestBuildingDistance = Infinity

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (entity.health <= 0 || !areEnemies(shooter, entity)) {
            continue
        }

        const distance = getDistanceToEntity(shooter.position, entity)
        if (distance > range) {
            continue
        }
        if (isUnit(entity) && distance < nearestUnitDistance) {
            nearestUnit = entity
            nearestUnitDistance = distance
        }
        if (isBuilding(entity) && distance < nearestBuildingDistance) {
            nearestBuilding = entity
            nearestBuildingDistance = distance
        }
    }

    if (nearestUnit !== null) {
        return nearestUnit
    }
    return nearestBuilding
}

export function isScanDue(shooter, deltaSeconds) {
    shooter.scanCooldown = Math.max(shooter.scanCooldown - deltaSeconds, 0)
    if (shooter.scanCooldown > 0) {
        return false
    }
    shooter.scanCooldown = SCAN_INTERVAL_SECONDS
    return true
}

function approachTarget(world, unit, event, target, deltaSeconds) {
    const approachPoint = getClosestPointOfEntity(unit.position, target)
    const isApproachOutdated = event.approach === null
        || getDistance(event.approach.target, approachPoint) > CHASE_REPATH_DISTANCE
    if (isApproachOutdated) {
        event.approach = createMoveEvent(unit.id, approachPoint)
    }

    const isApproachFinished = runMoveEvent(world, unit, event.approach, deltaSeconds)
    return !isApproachFinished
}

export function shoot(world, shooter, target) {
    target.health = Math.max(target.health - shooter.type.damage, 0)
    shooter.attackCooldown = 1 / shooter.type.attacksPerSecond

    const hitPoint = getClosestPointOfEntity(shooter.position, target)
    world.effects.push(createShotEffect(
        shooter.position,
        getEntityHitHeight(shooter),
        hitPoint,
        getEntityHitHeight(target),
    ))
}

function isBeyondLeash(unit, event, target) {
    if (!event.isAutomatic) {
        return false
    }
    return getDistanceToEntity(unit.position, target) > unit.type.attackRange + AUTOMATIC_CHASE_LEASH
}

export function runAttackEvent(world, unit, event, deltaSeconds) {
    const target = findEntityById(world.entities, event.targetId)
    if (target === null || target.health <= 0 || isBeyondLeash(unit, event, target)) {
        return true
    }

    if (getDistanceToEntity(unit.position, target) > unit.type.attackRange) {
        const isStillApproaching = approachTarget(world, unit, event, target, deltaSeconds)
        return !isStillApproaching
    }

    event.approach = null
    unit.heading = Math.atan2(target.position.y - unit.position.y, target.position.x - unit.position.x)
    if (unit.attackCooldown <= 0) {
        shoot(world, unit, target)
    }
    return false
}

export function runAttackMoveEvent(world, unit, event, deltaSeconds) {
    if (event.engagement !== null) {
        if (!runAttackEvent(world, unit, event.engagement, deltaSeconds)) {
            return false
        }
        event.engagement = null
        event.movement = createMoveEvent(unit.id, event.target)
    }

    if (isScanDue(unit, deltaSeconds)) {
        const enemy = findNearestEnemy(world, unit, getAggressionRange(unit))
        if (enemy !== null) {
            event.engagement = createAttackEvent(unit.id, enemy.id, true)
            return false
        }
    }

    return runMoveEvent(world, unit, event.movement, deltaSeconds)
}

export function engageNearbyEnemy(world, unit, deltaSeconds) {
    if (!isScanDue(unit, deltaSeconds)) {
        return null
    }
    const enemy = findNearestEnemy(world, unit, getAggressionRange(unit))
    if (enemy === null) {
        return null
    }
    return createAttackEvent(unit.id, enemy.id, true)
}
