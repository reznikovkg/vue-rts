import {isTileUnderBuilding} from './collision.js'
import {tryPlaceBuilding, trySpawnUnit} from './commands.js'
import {getDistanceToEntity} from './combat.js'
import {findNearestDeposit} from './deposits.js'
import {canAfford, getOre} from './economy.js'
import {BUILDING_TYPES, UNIT_TYPES} from './entityTypes.js'
import {canFight, isBuilding, isConstructed, isUnit} from './entities.js'
import {createAttackMoveEvent, createMineEvent, EVENT_TYPES, findActiveEvent} from './events.js'
import {areEnemies} from './groups.js'
import {canPlaceBuilding} from './placement.js'
import {getGroupPopulation} from './population.js'

const THINK_INTERVAL_SECONDS = 1
const TARGET_MINER_COUNT = 3
const EXTRA_GLIDER_COUNT = 2
const FIRST_WAVE_SIZE = 6
const PEACEFUL_SECONDS = 180
const WAVE_SIZE_GROWTH = 3
const DEFENSE_RADIUS = 600
const MAX_TURRET_COUNT = 3
const MAX_FACTORY_COUNT = 2
const MAX_HABITAT_COUNT = 4
const FREE_POPULATION_RESERVE = 2
const PLACEMENT_SEARCH_RINGS = 12


export function createAiState(groupIds) {
    const aiGroups = []

    for (let index = 0; index < groupIds.length; index++) {

        aiGroups.push({
            groupId: groupIds[index],
            secondsUntilThinking: index * 0.3,
            secondsUntilFirstWave: PEACEFUL_SECONDS,
            nextWaveSize: FIRST_WAVE_SIZE,
        })
    }
    return aiGroups
}

function isMiner(world, unit) {
    const activeEvent = findActiveEvent(world.events, unit.id)
    return activeEvent !== null
        && activeEvent.type === EVENT_TYPES.MINE
}

function describeGroup(world, groupId) {
    const group = {
        buildings: [],
        miners: [],
        idleGliders: [],
        army: [],
        idleArmy: [],

        anchor: null
    }

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (entity.groupId !== groupId
            || entity.health <= 0) {
            continue
        }

        if (isBuilding(entity)) {
            group.buildings.push(entity)
            if (group.anchor === null || entity.type === BUILDING_TYPES.CORE) {
                group.anchor = entity
            }
            continue
        }

        const isIdle = findActiveEvent(world.events, entity.id) === null

        if (isMiner(world, entity)) {
            group.miners.push(entity)
            continue
        }

        if (isIdle && entity.type.miningCapacity > 0) {
            group.idleGliders.push(entity)
        }

        if (canFight(entity)) {
            group.army.push(entity)
            if (isIdle) {
                group.idleArmy.push(entity)
            }
        }
    }
    return group
}

function countBuildings(buildings, buildingType) {
    let count = 0
    for (let index = 0; index < buildings.length; index++) {
        if (buildings[index].type === buildingType) {
            count++
        }
    }
    return count
}

function countUnits(world, groupId, unitType) {
    let count = 0
    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]

        if (isUnit(entity)
            && entity.groupId === groupId
            && entity.type === unitType) {
            count++
        }
    }
    return count
}

function isAnythingUnderConstruction(buildings) {
    for (let index = 0; index < buildings.length; index++) {
        if (!isConstructed(buildings[index])) {
            return true
        }
    }
    return false
}

function assignMiners(world, group) {
    let minerCount = group.miners.length
    for (let index = 0; index < group.idleGliders.length && minerCount < TARGET_MINER_COUNT; index++) {
        const glider = group.idleGliders[index]
        const deposit = findNearestDeposit(world.deposits, glider.position)
        if (deposit === null) {
            return
        }
        world.events.push(createMineEvent(glider.id, deposit.id))
        group.idleArmy = group.idleArmy.filter((unit) => unit.id !== glider.id)
        minerCount++
    }
}

function chooseBuildingToConstruct(world, groupId, group) {
    if (isAnythingUnderConstruction(group.buildings)) {
        return null
    }

    const population = getGroupPopulation(world.entities, groupId)
    const buildings = group.buildings
    const hasGliders = countUnits(world, groupId, UNIT_TYPES.GLIDER) > 0
    if (!hasGliders && countBuildings(buildings, BUILDING_TYPES.AIRFIELD) === 0) {
        return BUILDING_TYPES.AIRFIELD
    }
    if (population.capacity - population.used <= FREE_POPULATION_RESERVE
        && countBuildings(buildings, BUILDING_TYPES.HABITAT) < MAX_HABITAT_COUNT) {
        return BUILDING_TYPES.HABITAT
    }
    if (countBuildings(buildings, BUILDING_TYPES.FACTORY) === 0) {
        return BUILDING_TYPES.FACTORY
    }
    if (countBuildings(buildings, BUILDING_TYPES.AIRFIELD) === 0) {
        return BUILDING_TYPES.AIRFIELD
    }
    if (countBuildings(buildings, BUILDING_TYPES.TURRET) < MAX_TURRET_COUNT) {
        return BUILDING_TYPES.TURRET
    }
    if (countBuildings(buildings, BUILDING_TYPES.FACTORY) < MAX_FACTORY_COUNT) {
        return BUILDING_TYPES.FACTORY
    }
    return null
}

function hasClearanceAround(world, buildingType, originTile) {
    for (let column = originTile.column - 1; column <= originTile.column + buildingType.size; column++) {
        for (let row = originTile.row - 1; row <= originTile.row + buildingType.size; row++) {
            if (isTileUnderBuilding(world.entities, {column: column, row: row})) {
                return false
            }
        }
    }
    return true
}

function findPlacementNear(world, buildingType, anchor) {
    const centerColumn = anchor.tile.column + Math.floor(anchor.type.size / 2)
    const centerRow = anchor.tile.row + Math.floor(anchor.type.size / 2)
    const halfSize = Math.floor(buildingType.size / 2)

    for (let ring = 2; ring <= PLACEMENT_SEARCH_RINGS; ring++) {
        for (let columnOffset = -ring; columnOffset <= ring; columnOffset++) {
            for (let rowOffset = -ring; rowOffset <= ring; rowOffset++) {
                const isOnRing = Math.max(Math.abs(columnOffset), Math.abs(rowOffset)) === ring
                const origin = {column: centerColumn + columnOffset - halfSize, row: centerRow + rowOffset - halfSize}
                if (isOnRing && canPlaceBuilding(world, buildingType, origin) && hasClearanceAround(world, buildingType, origin)) {
                    return origin
                }
            }
        }
    }
    return null
}

function constructBuildings(world, groupId, group) {
    if (group.anchor === null) {
        return 0
    }

    const buildingType = chooseBuildingToConstruct(world, groupId, group)
    if (buildingType === null) {
        return 0
    }
    if (!canAfford(world, groupId, buildingType.cost)) {
        return buildingType.cost
    }

    const origin = findPlacementNear(world, buildingType, group.anchor)
    if (origin !== null) {
        tryPlaceBuilding(world, buildingType, origin, groupId)
    }
    return 0
}

function chooseUnitToProduce(world, groupId, building) {
    if (building.type.spawns.includes('GLIDER')) {
        const gliderCount = countUnits(world, groupId, UNIT_TYPES.GLIDER)
        if (gliderCount < TARGET_MINER_COUNT + EXTRA_GLIDER_COUNT) {
            return UNIT_TYPES.GLIDER
        }
        return null
    }
    if (building.type.spawns.length === 0) {
        return null
    }
    return UNIT_TYPES[building.type.spawns[0]]
}

function produceUnits(world, groupId, group, reservedOre) {
    const isShortOfMiners = countUnits(world, groupId, UNIT_TYPES.GLIDER) < TARGET_MINER_COUNT
    for (let index = 0; index < group.buildings.length; index++) {
        const building = group.buildings[index]
        const unitType = chooseUnitToProduce(world, groupId, building)
        if (unitType === null) {
            continue
        }

        const isMinerPriority = isShortOfMiners && unitType === UNIT_TYPES.GLIDER
        const canSpend = getOre(world, groupId) - unitType.cost >= reservedOre
        if (isMinerPriority || (canSpend && !isShortOfMiners)) {
            trySpawnUnit(world, building, unitType)
        }
    }
}

function findNearestEnemyEntity(world, groupId, position, maxDistance, isBuildingsOnly) {
    const probe = {groupId: groupId}
    let nearestEnemy = null
    let nearestDistance = maxDistance

    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (!areEnemies(probe, entity) || entity.health <= 0 || (isBuildingsOnly && !isBuilding(entity))) {
            continue
        }
        const distance = getDistanceToEntity(position, entity)
        if (distance < nearestDistance) {
            nearestDistance = distance
            nearestEnemy = entity
        }
    }
    return nearestEnemy
}

function sendUnits(world, units, target) {
    for (let index = 0; index < units.length; index++) {
        world.events.push(createAttackMoveEvent(units[index].id, target))
    }
}

function commandArmy(world, aiGroup, group) {
    const basePosition = group.anchor !== null ? group.anchor.position : null

    if (basePosition !== null) {
        const intruder = findNearestEnemyEntity(world, aiGroup.groupId, basePosition, DEFENSE_RADIUS, false)
        if (intruder !== null) {
            sendUnits(world, group.idleArmy, intruder.position)
            return
        }
    }

    if (aiGroup.secondsUntilFirstWave > 0 || group.idleArmy.length < aiGroup.nextWaveSize) {
        return
    }

    const origin = basePosition !== null ? basePosition : group.idleArmy[0].position
    let target = findNearestEnemyEntity(world, aiGroup.groupId, origin, Infinity, true)
    if (target === null) {
        target = findNearestEnemyEntity(world, aiGroup.groupId, origin, Infinity, false)
    }
    if (target === null) {
        return
    }

    sendUnits(world, group.idleArmy, target.position)
    aiGroup.nextWaveSize += WAVE_SIZE_GROWTH
}

function thinkForGroup(world, aiGroup) {
    const group = describeGroup(world, aiGroup.groupId)
    assignMiners(world, group)

    const reservedOre = constructBuildings(world, aiGroup.groupId, group)

    produceUnits(world, aiGroup.groupId, group, reservedOre)
    commandArmy(world, aiGroup, group)
}

export function advanceAi(world, deltaSeconds) {
    if (world.isAiFrozen) {
        return
    }
    for (let index = 0; index < world.aiGroups.length; index++) {
        const aiGroup = world.aiGroups[index]


        aiGroup.secondsUntilThinking -= deltaSeconds
        aiGroup.secondsUntilFirstWave -= deltaSeconds

        if (aiGroup.secondsUntilThinking > 0) {
            continue
        }
        aiGroup.secondsUntilThinking = THINK_INTERVAL_SECONDS
        thinkForGroup(world, aiGroup)
    }
}
