export const ENTITY_KINDS = {
    UNIT: 'unit',
    BUILDING: 'building',
}

export const UNIT_TYPES = {
    VILLAGER: {
        name: 'Villager',
        radius: 10,
        speed: 60,
        maxHealth: 25,
        color: '#d0d0d0',
    },
    SOLDIER: {
        name: 'Soldier',
        radius: 12,
        speed: 80,
        maxHealth: 60,
        color: '#909090',
    },
    SCOUT: {
        name: 'Scout',
        radius: 14,
        speed: 160,
        maxHealth: 45,
        color: '#606060',
    },
}

export const BUILDING_TYPES = {
    TOWN_CENTER: {
        name: 'Town Center',
        width: 256,
        height: 256,
        maxHealth: 2400,
        color: '#a0a0a0',
    },
    HOUSE: {
        name: 'House',
        width: 128,
        height: 128,
        maxHealth: 550,
        color: '#b8b8b8',
    },
}
