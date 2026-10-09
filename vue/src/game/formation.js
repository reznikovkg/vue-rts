const FORMATION_SPACING = 56

function pushRingOffsets(offsets, ring) {
    if (ring === 0) {
        offsets.push({x: 0, y: 0})
        return
    }

    for (let column = -ring; column <= ring; column++) {
        for (let row = -ring; row <= ring; row++) {
            const isOnRing = Math.max(Math.abs(column), Math.abs(row)) === ring
            if (isOnRing) {
                offsets.push({x: column * FORMATION_SPACING, y: row * FORMATION_SPACING})
            }
        }
    }
}

export function getFormationTargets(center, count) {
    const offsets = []
    let ring = 0
    while (offsets.length < count) {
        pushRingOffsets(offsets, ring)
        ring++
    }

    const targets = []
    for (let index = 0; index < count; index++) {
        targets.push({
            x: center.x + offsets[index].x,
            y: center.y + offsets[index].y,
        })
    }
    return targets
}
