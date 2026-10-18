// Размер мира постоянный и не зависит от размера видимой области.
export const worldWidth = 3200
export const worldHeight = 2400
export const gridSize = 40
export const tileWidth = 64
export const tileHeight = 32

export function worldToScreen(x: number, y: number) {
    return {
        x: ((x - y) / gridSize) * tileWidth / 2,
        y: ((x + y) / gridSize) * tileHeight / 2,
    }
}

export function screenToWorld(x: number, y: number) {
    return {
        x: (x / tileWidth + y / tileHeight) * gridSize,
        y: (y / tileHeight - x / tileWidth) * gridSize,
    }
}

export const projectedWidth = ((worldWidth + worldHeight) / gridSize) * tileWidth / 2
export const projectedHeight = ((worldWidth + worldHeight) / gridSize) * tileHeight / 2
export const mapOutline = [
    worldToScreen(-worldWidth / 2, -worldHeight / 2),
    worldToScreen(worldWidth / 2, -worldHeight / 2),
    worldToScreen(worldWidth / 2, worldHeight / 2),
    worldToScreen(-worldWidth / 2, worldHeight / 2),
].map(point => `${point.x},${point.y}`).join(' ')

type Point = {
    x: number
    y: number
}

type GridLine = {
    start: Point
    end: Point
    isAxis: boolean
}

export const gridLines: GridLine[] = []

for (let x = -worldWidth / 2 + gridSize; x < worldWidth / 2; x += gridSize) {
    gridLines.push({
        start: worldToScreen(x, -worldHeight / 2),
        end: worldToScreen(x, worldHeight / 2),
        isAxis: x === 0,
    })
}
for (let y = -worldHeight / 2 + gridSize; y < worldHeight / 2; y += gridSize) {
    gridLines.push({
        start: worldToScreen(-worldWidth / 2, y),
        end: worldToScreen(worldWidth / 2, y),
        isAxis: y === 0,
    })
}
