export function createSquareMap(size, tileSize) {
    const halfSize = size / 2

    return {
        bounds: {
            minX: -halfSize,
            maxX: halfSize,
            minY: -halfSize,
            maxY: halfSize,
        },
        tileSize: tileSize,
    }
}

export function createDefaultMap() {
    return createSquareMap(4096, 64)
}
