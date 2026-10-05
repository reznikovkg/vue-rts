import {BUILDING_TYPES, UNIT_TYPES} from './entityTypes.js'
import {createBuilding, createUnit} from './entities.js'



export function createStartingEntities() {
    return [
        createBuilding(BUILDING_TYPES.TOWN_CENTER, {x: 0, y: 0}),
        createBuilding(BUILDING_TYPES.HOUSE, {x: -320, y: -96}),
        createBuilding(BUILDING_TYPES.HOUSE, {x: 320, y: 160}),

        createUnit(UNIT_TYPES.VILLAGER, {x: -64, y: 200}),
        createUnit(UNIT_TYPES.VILLAGER, {x: 0, y: 200}),
        createUnit(UNIT_TYPES.VILLAGER, {x: 64, y: 200}),

        createUnit(UNIT_TYPES.SOLDIER, {x: -200, y: 260}),
        createUnit(UNIT_TYPES.SCOUT, {x: 200, y: 260}),
    ]
}
