import {getClosestPointOfEntity, getDistanceToEntity} from './combat.js'
import {findDepositById, findNearestDeposit} from './deposits.js'
import {addOre} from './economy.js'
import {isBuilding, isConstructed} from './entities.js'
import {createMoveEvent, MINING_PHASES} from './events.js'
import {getDistance} from './geometry.js'
import {runMoveEvent} from './movement.js'

const DRILLING_DISTANCE = 20
const UNLOADING_DISTANCE = 40

function findNearestDropOff(world, unit) {
    let nearestDropOff = null
    let nearestDistance = Infinity

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        const isOwnDropOff = isBuilding(entity) && entity.groupId === unit.groupId && entity.type.acceptsOre
        if (!isOwnDropOff || !isConstructed(entity)) {
            continue
        }

        const distance = getDistanceToEntity(unit.position, entity)
        if (distance < nearestDistance) {
            nearestDistance = distance
            nearestDropOff = entity
        }
    }
    return nearestDropOff
}

function flyTo(world, unit, event, point, deltaSeconds) {
    const isApproachOutdated = event.approach === null || getDistance(event.approach.target, point) > 1
    if (isApproachOutdated) {
        event.approach = createMoveEvent(unit.id, point)
    }
    if (runMoveEvent(world, unit, event.approach, deltaSeconds)) {
        event.approach = null
    }
}

function findTargetDeposit(world, unit, event) {
    const deposit = findDepositById(world.deposits, event.depositId)
    if (deposit !== null && deposit.amount > 0) {
        return deposit
    }

    const nearestDeposit = findNearestDeposit(world.deposits, unit.position)
    if (nearestDeposit !== null) {
        event.depositId = nearestDeposit.id
    }
    return nearestDeposit
}

function drill(unit, deposit, deltaSeconds) {
    const freeSpace = unit.type.miningCapacity - unit.cargo
    const minedAmount = Math.min(unit.type.miningRate * deltaSeconds, freeSpace, deposit.amount)
    deposit.amount -= minedAmount
    unit.cargo += minedAmount
    unit.isMining = true
}

function runToDepositPhase(world, unit, event, deltaSeconds) {
    const deposit = findTargetDeposit(world, unit, event)
    if (deposit === null) {
        if (unit.cargo > 0) {
            event.phase = MINING_PHASES.DELIVERING
            return false
        }
        return true
    }

    if (getDistance(unit.position, deposit.position) > DRILLING_DISTANCE) {
        flyTo(world, unit, event, deposit.position, deltaSeconds)
        return false
    }

    drill(unit, deposit, deltaSeconds)
    if (unit.cargo >= unit.type.miningCapacity) {
        event.phase = MINING_PHASES.DELIVERING
        event.approach = null
    }
    return false
}

function runDeliveringPhase(world, unit, event, deltaSeconds) {
    const dropOff = findNearestDropOff(world, unit)
    if (dropOff === null) {
        return true
    }

    if (getDistanceToEntity(unit.position, dropOff) > UNLOADING_DISTANCE) {
        flyTo(world, unit, event, getClosestPointOfEntity(unit.position, dropOff), deltaSeconds)
        return false
    }

    addOre(world, unit.groupId, Math.floor(unit.cargo))
    unit.cargo = 0
    event.phase = MINING_PHASES.TO_DEPOSIT
    event.approach = null
    return false
}

export function runMineEvent(world, unit, event, deltaSeconds) {
    if (unit.type.miningCapacity === 0) {
        return true
    }
    if (event.phase === MINING_PHASES.DELIVERING) {
        return runDeliveringPhase(world, unit, event, deltaSeconds)
    }
    return runToDepositPhase(world, unit, event, deltaSeconds)
}
