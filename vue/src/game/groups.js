export const GROUPS = {
    1: {name: 'Group 1', color: '#5b7aa3'},
    2: {name: 'Group 2', color: '#a35b5b'},
    3: {name: 'Group 3', color: '#6b9a6b'},
    4: {name: 'Group 4', color: '#a3925b'},
}

export function getGroupColor(groupId) {
    return GROUPS[groupId].color
}

export function areEnemies(firstEntity, secondEntity) {
    return firstEntity.groupId !== secondEntity.groupId
}
