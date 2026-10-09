import {canPlaceUnitAt} from './collision.js'
import {isConstructed} from './entities.js'
import {tileToWorldCenter} from './map.js'
import {getGroupPopulation} from './population.js'
import {canAfford} from './economy.js'

const MAX_SPAWN_RING = 4

function getRingTiles(building, ring) {
    const firstColumn = building.tile.column - ring
    const lastColumn = building.tile.column + building.type.size - 1 + ring
    const firstRow = building.tile.row - ring
    const lastRow = building.tile.row + building.type.size - 1 + ring

    const tiles = []
    for (let column = firstColumn; column <= lastColumn; column++) {
        for (let row = firstRow; row <= lastRow; row++) {
            const isOnBorder = column === firstColumn
                || column === lastColumn
                || row === firstRow
                || row === lastRow
            if (isOnBorder) {
                tiles.push({column: column, row: row})
            }
        }
    }
    return tiles
}

export function findSpawnPosition(world, building, unitType) {
    for (let ring = 1; ring <= MAX_SPAWN_RING; ring++) {
        const ringTiles = getRingTiles(building, ring)

        for (let index = 0; index < ringTiles.length; index++) {
            const candidate = tileToWorldCenter(world.map, ringTiles[index])
            if (canPlaceUnitAt(world, unitType, candidate)) {
                return candidate
            }
        }
    }
    return null
}

export const SPAWN_BLOCKERS = {
    NONE: null,
    UNDER_CONSTRUCTION: 'under construction',
    COOLDOWN: 'cooldown',
    POPULATION: 'population limit',
    NOT_ENOUGH_ORE: 'not enough ore',
}

export function getSpawnBlocker(world, building, unitType) {
    if (!isConstructed(building)) {
        return SPAWN_BLOCKERS.UNDER_CONSTRUCTION
    }
    if (building.spawnCooldown > 0) {
        return SPAWN_BLOCKERS.COOLDOWN
    }

    const population = getGroupPopulation(world.entities, building.groupId)

    if (population.used + unitType.populationCost > population.capacity) {
        return SPAWN_BLOCKERS.POPULATION
    }
    if (!canAfford(world, building.groupId, unitType.cost)) {
        return SPAWN_BLOCKERS.NOT_ENOUGH_ORE
    }
    return SPAWN_BLOCKERS.NONE
}
