export function clamp(value, min, max) {
    if (value < min) {
        return min
    }
    if (value > max) {
        return max
    }
    return value
}

export function getDistance(from, to) {
    const deltaX = to.x - from.x
    const deltaY = to.y - from.y
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
}

export function isPointInBounds(point, bounds) {
    const isInsideX = point.x >= bounds.minX && point.x <= bounds.maxX
    const isInsideY = point.y >= bounds.minY && point.y <= bounds.maxY
    return isInsideX && isInsideY
}
