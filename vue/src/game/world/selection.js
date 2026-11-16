export function pointInConvexPolygon(wx, wy, corners) {
    let side = 0
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i]
        const b = corners[(i + 1) % corners.length]
        const cross = (b.wx - a.wx) * (wy - a.wy) - (b.wy - a.wy) * (wx - a.wx)
        if (cross === 0) continue
        const sign = Math.sign(cross)
        if (side === 0) side = sign
        else if (sign !== side) return false
    }
    return true
}