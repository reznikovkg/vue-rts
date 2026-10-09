export const SPRITE_COLORS = {
    dark: '#5f5f5f',
    body: '#a8a8a8',
    light: '#d4d4d4',
}

export const BODY_ANIMATIONS = {
    NONE: 'none',
    HOVER: 'hover',
    FLOAT: 'float',
}

export const EXHAUST_KINDS = {
    STEAM: 'steam',
    FLAME: 'flame',
    WAKE: 'wake',
}

export const EXHAUST_MOMENTS = {
    IDLE: 'idle',
    MOVING: 'moving',
}

const MECH_HULL = 'M -10 -9 L 5 -9 L 10 0 L 5 9 L -10 9 L -12 0 Z'
const GLIDER_WING = 'M 14 0 L -10 -13 L -6 0 L -10 13 Z'
const BOAT_HULL = 'M 21 0 L 11 -9 L -16 -9 L -19 0 L -16 9 L 11 9 Z'

const SPRITE_DEFINITIONS = {
    mech: {
        designRadius: 14,
        shadow: 'M -10 -13 L 7 -13 L 12 0 L 7 13 L -10 13 L -13 0 Z',
        bodyAnimation: BODY_ANIMATIONS.NONE,
        parts: [
            {d: 'M -7 -13 L 7 -13 L 7 -7 L -7 -7 Z', z: 2, extrudeFrom: 0, color: 'dark', stepPhase: '0s'},
            {d: 'M -7 7 L 7 7 L 7 13 L -7 13 Z', z: 2, extrudeFrom: 0, color: 'dark', stepPhase: '-0.25s'},
            {d: MECH_HULL, z: 8, extrudeFrom: 4, color: 'body'},
            {d: 'M 4 -7 L 15 -7 L 15 -4 L 4 -4 Z', z: 8, extrudeFrom: 7, color: 'dark'},
            {d: 'M 4 4 L 15 4 L 15 7 L 4 7 Z', z: 8, extrudeFrom: 7, color: 'dark'},
            {d: 'M -6 -5 L 3 -5 L 6 0 L 3 5 L -6 5 L -8 0 Z', z: 9, color: 'light'},
            {d: 'M -10 -2 L -7 -2 L -7 2 L -10 2 Z', z: 9, color: 'group'},
        ],
        exhausts: [
            {x: -12, y: 0, z: 8, kind: EXHAUST_KINDS.STEAM, moment: EXHAUST_MOMENTS.IDLE},
        ],
    },
    glider: {
        designRadius: 12,
        shadow: GLIDER_WING,
        bodyAnimation: BODY_ANIMATIONS.HOVER,
        parts: [
            {d: GLIDER_WING, z: 2, extrudeFrom: 0, color: 'body'},
            {d: 'M -10 -13 L -5 -10.5 L -7 -9 Z', z: 2, color: 'group'},
            {d: 'M -10 13 L -5 10.5 L -7 9 Z', z: 2, color: 'group'},
            {d: 'M 12 0 L -4 -3.5 L -8 0 L -4 3.5 Z', z: 4, extrudeFrom: 3, color: 'light'},
        ],
        exhausts: [
            {x: -8, y: 0, z: 3, kind: EXHAUST_KINDS.FLAME, moment: EXHAUST_MOMENTS.MOVING},
        ],
    },
    boat: {
        designRadius: 18,
        shadow: BOAT_HULL,
        bodyAnimation: BODY_ANIMATIONS.FLOAT,
        parts: [
            {d: BOAT_HULL, z: 4, extrudeFrom: 0, color: 'body'},
            {d: 'M 12 0 L 6 -6 L -12 -6 L -14 0 L -12 6 L 6 6 Z', z: 5, color: 'light'},
            {d: 'M -12 -2 L -7 -2 L -7 2 L -12 2 Z', z: 5, color: 'group'},
            {d: 'M 2 -1.5 L 14 -1.5 L 14 1.5 L 2 1.5 Z', z: 7, extrudeFrom: 6, color: 'dark'},
            {d: 'M 4 0 A 4 4 0 1 0 -4 0 A 4 4 0 1 0 4 0 Z', z: 8, extrudeFrom: 6, color: 'body'},
        ],
        exhausts: [
            {x: -19, y: 0, z: 0, kind: EXHAUST_KINDS.WAKE, moment: EXHAUST_MOMENTS.MOVING},
        ],
    },
}

function addSlice(layersByHeight, z, slice) {
    for (let index = 0; index < layersByHeight.length; index++) {
        if (layersByHeight[index].z === z) {
            layersByHeight[index].slices.push(slice)
            return
        }
    }
    layersByHeight.push({z: z, slices: [slice]})
}

function buildLayers(parts) {
    const layers = []

    for (let index = 0; index < parts.length; index++) {
        const part = parts[index]
        if (part.extrudeFrom !== undefined) {
            for (let z = part.extrudeFrom; z < part.z; z++) {
                addSlice(layers, z, {d: part.d, color: 'dark', stepPhase: part.stepPhase, isOutlined: false})
            }
        }
        addSlice(layers, part.z, {d: part.d, color: part.color, stepPhase: part.stepPhase, isOutlined: true})
    }

    return layers.sort((firstLayer, secondLayer) => firstLayer.z - secondLayer.z)
}

function buildSprite(definition) {
    return {
        designRadius: definition.designRadius,
        shadow: definition.shadow,
        bodyAnimation: definition.bodyAnimation,
        layers: buildLayers(definition.parts),
        exhausts: definition.exhausts,
    }
}

export const UNIT_SPRITES = {
    mech: buildSprite(SPRITE_DEFINITIONS.mech),
    glider: buildSprite(SPRITE_DEFINITIONS.glider),
    boat: buildSprite(SPRITE_DEFINITIONS.boat),
}
