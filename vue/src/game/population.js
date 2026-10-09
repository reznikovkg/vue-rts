import {isBuilding, isConstructed, isUnit} from './entities.js'

export function getGroupPopulation(entities, groupId) {
    const population = {used: 0, capacity: 0}

    for (let index = 0; index < entities.length; index++) {
        const entity = entities[index]
        if (entity.groupId !== groupId) {
            continue
        }

        if (isUnit(entity)) {
            population.used += entity.type.populationCost
        }
        if (isBuilding(entity) && isConstructed(entity)) {
            population.capacity += entity.type.populationSupply
        }
    }

    return population
}
