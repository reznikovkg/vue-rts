export const STARTING_ORE = 250

export function createResources(groupIds) {
    const resources = {}
    for (let index = 0; index < groupIds.length; index++) {
        resources[groupIds[index]] = STARTING_ORE
    }
    return resources
}

export function getOre(world, groupId) {
    return world.resources[groupId] || 0
}

export function canAfford(world, groupId, cost) {
    return getOre(world, groupId) >= cost
}

export function spendOre(world, groupId, cost) {
    world.resources[groupId] = getOre(world, groupId) - cost
}

export function addOre(world, groupId, amount) {
    world.resources[groupId] = getOre(world, groupId) + amount
}

export function collectPassiveIncome(world, building, deltaSeconds) {
    if (building.type.oreIncomePerSecond) {
        addOre(world, building.groupId, building.type.oreIncomePerSecond * deltaSeconds)
    }
}
