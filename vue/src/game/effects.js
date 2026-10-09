export const EFFECT_TYPES = {
    SHOT: 'shot',
    EXPLOSION: 'explosion',
}

const SHOT_DURATION_SECONDS = 0.12
const EXPLOSION_DURATION_SECONDS = 0.5

let nextEffectId = 1

function takeNextEffectId() {
    const id = nextEffectId
    nextEffectId++
    return id
}

export function createShotEffect(from, fromHeight, to, toHeight) {
    return {
        id: takeNextEffectId(),
        type: EFFECT_TYPES.SHOT,
        from: {x: from.x, y: from.y},
        fromHeight: fromHeight,
        to: {x: to.x, y: to.y},
        toHeight: toHeight,
        secondsLeft: SHOT_DURATION_SECONDS,
        duration: SHOT_DURATION_SECONDS,
    }
}

export function createExplosionEffect(position, height, size) {
    return {
        id: takeNextEffectId(),
        type: EFFECT_TYPES.EXPLOSION,
        position: {x: position.x, y: position.y},
        height: height,
        size: size,
        secondsLeft: EXPLOSION_DURATION_SECONDS,
        duration: EXPLOSION_DURATION_SECONDS,
    }
}

export function advanceEffects(effects, deltaSeconds) {
    const activeEffects = []
    for (let index = 0; index < effects.length; index++) {
        const effect = effects[index]
        effect.secondsLeft -= deltaSeconds
        if (effect.secondsLeft > 0) {
            activeEffects.push(effect)
        }
    }
    return activeEffects
}
