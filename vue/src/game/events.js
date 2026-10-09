export const EVENT_TYPES = {
    MOVE: 'move',
    ATTACK: 'attack',
    ATTACK_MOVE: 'attack-move',
    MINE: 'mine',
}

export const MINING_PHASES = {
    TO_DEPOSIT: 'to-deposit',
    DELIVERING: 'delivering',
}

let nextEventId = 1

function takeNextEventId() {
    const id = nextEventId
    nextEventId++
    return id
}

export function createMoveEvent(actorId, target) {
    return {
        id: takeNextEventId(),
        type: EVENT_TYPES.MOVE,
        actorId: actorId,
        target: {x: target.x, y: target.y},
        path: null,
        pathIndex: 0,
        blockedSeconds: 0,
        secondsNearTarget: 0,
        closestDistance: Infinity,
        secondsWithoutProgress: 0,
        avoidanceSide: 1,
    }
}

export function createAttackEvent(actorId, targetId, isAutomatic) {
    return {
        id: takeNextEventId(),
        type: EVENT_TYPES.ATTACK,
        actorId: actorId,
        targetId: targetId,
        isAutomatic: isAutomatic,
        approach: null,
    }
}

export function createAttackMoveEvent(actorId, target) {
    return {
        id: takeNextEventId(),
        type: EVENT_TYPES.ATTACK_MOVE,
        actorId: actorId,
        target: {x: target.x, y: target.y},
        movement: createMoveEvent(actorId, target),
        engagement: null,
    }
}

export function createMineEvent(actorId, depositId) {
    return {
        id: takeNextEventId(),
        type: EVENT_TYPES.MINE,
        actorId: actorId,
        depositId: depositId,
        phase: MINING_PHASES.TO_DEPOSIT,
        approach: null,
    }
}

export function findActiveEvent(events, actorId) {
    for (let index = 0; index < events.length; index++) {
        if (events[index].actorId === actorId) {
            return events[index]
        }
    }
    return null
}

export function getEventsOfActor(events, actorId) {
    const actorEvents = []
    for (let index = 0; index < events.length; index++) {
        if (events[index].actorId === actorId) {
            actorEvents.push(events[index])
        }
    }
    return actorEvents
}

export function removeEventsOfActor(events, actorId) {
    const remainingEvents = []
    for (let index = 0; index < events.length; index++) {
        if (events[index].actorId !== actorId) {
            remainingEvents.push(events[index])
        }
    }
    return remainingEvents
}

export function removeEventsById(events, eventIds) {
    const remainingEvents = []
    for (let index = 0; index < events.length; index++) {
        if (!eventIds.includes(events[index].id)) {
            remainingEvents.push(events[index])
        }
    }
    return remainingEvents
}
