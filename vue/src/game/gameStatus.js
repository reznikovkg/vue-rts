export const GAME_STATUSES = {
    MENU: 'menu',
    RUNNING: 'running',
    PAUSED: 'paused',
    FINISHED: 'finished',
}

export function getAliveGroupIds(entities) {
    const groupIds = []
    for (let index = 0; index < entities.length; index++) {
        if (!groupIds.includes(entities[index].groupId)) {
            groupIds.push(entities[index].groupId)
        }
    }
    return groupIds
}
