import {canAfford, spendOre} from './economy.js'
import {createBuilding, createUnit} from './entities.js'
import {canPlaceBuilding} from './placement.js'
import {findSpawnPosition, getSpawnBlocker, SPAWN_BLOCKERS} from './spawn.js'

export function trySpawnUnit(world, building, unitType) {
    if (getSpawnBlocker(world, building, unitType) !== SPAWN_BLOCKERS.NONE) {
        return null
    }

    const position = findSpawnPosition(world, building, unitType)
    if (position === null) {
        return null
    }

    const unit = createUnit(unitType, position, building.groupId)
    spendOre(world, building.groupId, unitType.cost)
    building.spawnCooldown = unitType.spawnCooldownSeconds
    world.entities.push(unit)
    return unit
}

export function tryPlaceBuilding(world, buildingType, originTile, groupId) {
    if (!canAfford(world, groupId, buildingType.cost) || !canPlaceBuilding(world, buildingType, originTile)) {
        return null
    }

    const building = createBuilding(buildingType, world.map, originTile, groupId, false)
    spendOre(world, groupId, buildingType.cost)
    world.entities.push(building)
    return building
}
