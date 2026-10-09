import {collectPassiveIncome} from './economy.js'
import {getConstructionHealthGain, isBuilding, isConstructed} from './entities.js'

function advanceBuildingConstruction(building, deltaSeconds) {
    if (isConstructed(building)) {
        return
    }

    const progressGain = Math.min(deltaSeconds / building.type.buildSeconds, 1 - building.constructionProgress)
    building.constructionProgress += progressGain
    building.health = Math.min(building.health + getConstructionHealthGain(building, progressGain), building.type.maxHealth)
}

export function advanceBuildings(world, deltaSeconds) {
    for (let index = 0; index < world.entities.length; index++) {
        const entity = world.entities[index]
        if (!isBuilding(entity) || entity.health <= 0) {
            continue
        }

        advanceBuildingConstruction(entity, deltaSeconds)
        entity.spawnCooldown = Math.max(entity.spawnCooldown - deltaSeconds, 0)
        if (isConstructed(entity)) {
            collectPassiveIncome(world, entity, deltaSeconds)
        }
    }
}
