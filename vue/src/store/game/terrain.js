export const TILE_SIZE = 50
export const MAP_RADIUS = 30

export function isWater(col, row) {
  return row > -22 && row < 22 && Math.abs(col - Math.round(row * 0.35)) <= 1
}

export function createTerrain() {
  const tiles = []

  for (let row = -MAP_RADIUS; row <= MAP_RADIUS; row++) {
    for (let col = -MAP_RADIUS; col <= MAP_RADIUS; col++) {
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

export function cellIndex(col, row) {
  return (row + MAP_RADIUS) * (MAP_RADIUS * 2 + 1) + col + MAP_RADIUS
}

export function indexCell(index) {
  const width = MAP_RADIUS * 2 + 1

  return {
    col: (index % width) - MAP_RADIUS,
    row: Math.floor(index / width) - MAP_RADIUS,
  }
}

export function tileAt(state, col, row) {
  if (Math.abs(col) > MAP_RADIUS || Math.abs(row) > MAP_RADIUS) {
    return null
  }

  return state.terrain[cellIndex(col, row)]
}

export function buildingCoversCell(building, col, row) {
  return (
    col >= building.gridX &&
    col < building.gridX + building.size &&
    row >= building.gridY &&
    row < building.gridY + building.size
  )
}
