export const TILE_SIZE = 50
export const MAP_RADIUS = 30

export const isWater = (col, row) =>
  row > -22 &&
  row < 22 &&
  Math.abs(col - Math.round(row * 0.35)) <= 1

export const createTerrain = () => {
  const tiles = []

  for (let row = -MAP_RADIUS; row <= MAP_RADIUS; row += 1) {
    for (let col = -MAP_RADIUS; col <= MAP_RADIUS; col += 1) {
      tiles.push({
        id: `${col}:${row}`,
        col,
        row,
        x: col * TILE_SIZE,
        y: row * TILE_SIZE,
        type: isWater(col, row) ? 'water' : 'land',
      })
    }
  }

  return tiles
}

export const cellIndex = (col, row) =>
  (row + MAP_RADIUS) * (MAP_RADIUS * 2 + 1) + col + MAP_RADIUS

export const indexCell = (index) => {
  const width = MAP_RADIUS * 2 + 1

  return {
    col: (index % width) - MAP_RADIUS,
    row: Math.floor(index / width) - MAP_RADIUS,
  }
}

export const tileAt = (state, col, row) => {
  if (Math.abs(col) > MAP_RADIUS || Math.abs(row) > MAP_RADIUS) {
    return null
  }

  return state.terrain[cellIndex(col, row)]
}

export const worldToCell = (x, y) => ({
  col: Math.round(x / TILE_SIZE),
  row: Math.round(y / TILE_SIZE),
})

export const cellToWorld = (col, row) => ({
  x: col * TILE_SIZE,
  y: row * TILE_SIZE,
})

export const buildingCoversCell = (building, col, row) =>
  col >= building.gridX &&
  col < building.gridX + building.size &&
  row >= building.gridY &&
  row < building.gridY + building.size
