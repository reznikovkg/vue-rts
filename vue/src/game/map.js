export const TILE_SIZE = 64

export const TERRAIN_TYPES = {
    LAND: 'land',
    WATER: 'water',
    MOUNTAIN: 'mountain',
}

export const MOUNTAIN_KIND = 'mountain'

const MIN_MOUNTAIN_HEIGHT = 24
const MOUNTAIN_HEIGHT_VARIETY = 66

function getTileRandom(tile) {
    const noise = Math.sin(tile.column * 12.9898 + tile.row * 78.233) * 43758.5453
    return noise - Math.floor(noise)
}

export function getMountainHeight(tile) {
    return MIN_MOUNTAIN_HEIGHT + Math.round(getTileRandom(tile) * MOUNTAIN_HEIGHT_VARIETY)
}

function createMountainPeak(tile, tileSize, bounds) {
    const minX = bounds.minX + tile.column * tileSize
    const minY = bounds.minY + tile.row * tileSize
    return {
        id: 'mountain-' + tile.column + '-' + tile.row,
        kind: MOUNTAIN_KIND,
        tile: tile,
        height: getMountainHeight(tile),
        position: {x: minX + tileSize / 2, y: minY + tileSize / 2},
        footprint: {minX: minX, maxX: minX + tileSize, minY: minY, maxY: minY + tileSize},
    }
}

export function isMountainPeak(item) {
    return item.kind === MOUNTAIN_KIND
}

export function createMap(columns, rows, getTerrainAt) {
    const tiles = []
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            tiles.push(getTerrainAt(column, row))
        }
    }

    const halfWidth = columns * TILE_SIZE / 2
    const halfHeight = rows * TILE_SIZE / 2
    const bounds = {
        minX: -halfWidth,
        maxX: halfWidth,
        minY: -halfHeight,
        maxY: halfHeight,
    }

    const mountainPeaks = []
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            if (tiles[row * columns + column] === TERRAIN_TYPES.MOUNTAIN) {
                mountainPeaks.push(createMountainPeak({column: column, row: row}, TILE_SIZE, bounds))
            }
        }
    }

    return {
        columns: columns,
        rows: rows,
        tileSize: TILE_SIZE,
        tiles: tiles,
        bounds: bounds,
        mountainPeaks: mountainPeaks,
    }
}

export function isTileInsideMap(map, tile) {
    const isColumnInside = tile.column >= 0 && tile.column < map.columns
    const isRowInside = tile.row >= 0 && tile.row < map.rows
    return isColumnInside && isRowInside
}

export function getTerrain(map, tile) {
    return map.tiles[tile.row * map.columns + tile.column]
}

export function worldToTile(map, point) {
    return {
        column: Math.floor((point.x - map.bounds.minX) / map.tileSize),
        row: Math.floor((point.y - map.bounds.minY) / map.tileSize),
    }
}

export function tileToWorld(map, tile) {
    return {
        x: map.bounds.minX + tile.column * map.tileSize,
        y: map.bounds.minY + tile.row * map.tileSize,
    }
}

export function tileToWorldCenter(map, tile) {
    const corner = tileToWorld(map, tile)
    return {
        x: corner.x + map.tileSize / 2,
        y: corner.y + map.tileSize / 2,
    }
}

export function getTerrainRuns(map) {
    const runs = []

    for (let row = 0; row < map.rows; row++) {
        let runStartColumn = 0

        for (let column = 1; column <= map.columns; column++) {
            const runTerrain = getTerrain(map, {column: runStartColumn, row: row})
            const isRowEnd = column === map.columns
            if (!isRowEnd && getTerrain(map, {column: column, row: row}) === runTerrain) {
                continue
            }

            const corner = tileToWorld(map, {column: runStartColumn, row: row})
            runs.push({
                x: corner.x,
                y: corner.y,
                width: (column - runStartColumn) * map.tileSize,
                height: map.tileSize,
                terrain: runTerrain,
            })
            runStartColumn = column
        }
    }

    return runs
}
