import {findNearestEnemy, getDistanceToEntity, isScanDue, shoot} from './combat.js'
import {canFight, findEntityById, isBuilding, isConstructed} from './entities.js'

function findTurretTarget(world, turret, deltaSeconds) {
    const currentTarget = findEntityById(world.entities, turret.targetId)
    const isCurrentTargetValid = currentTarget !== null
        && currentTarget.health > 0
        && getDistanceToEntity(turret.position, currentTarget) <= turret.type.attackRange

    if (isCurrentTargetValid) {
        return currentTarget
    }
    if (!isScanDue(turret, deltaSeconds)) {
        return null
    }

    const newTarget = findNearestEnemy(world, turret, turret.type.attackRange)
    turret.targetId = newTarget === null ? null : newTarget.id
    return newTarget
}

function advanceTurret(world, turret, deltaSeconds) {
    turret.attackCooldown = Math.max(turret.attackCooldown - deltaSeconds, 0)

    const target = findTurretTarget(world, turret, deltaSeconds)
    if (target === null) {
        return
    }

    turret.facing = Math.atan2(target.position.y - turret.position.y, target.position.x - turret.position.x)
    if (turret.attackCooldown <= 0) {
        shoot(world, turret, target)
    }
}

export function advanceTurrets(world, deltaSeconds) {
    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (isBuilding(entity) && canFight(entity) && isConstructed(entity) && entity.health > 0) {
            advanceTurret(world, entity, deltaSeconds)
        }
    }
}
