// Мир плоский, в мировых координатах: (0, 0) — центр карты, X — вправо-вниз, Y — влево-вниз на экране.
// На экран мир выводится изометрически: квадратная клетка мира становится ромбом TILE_WIDTH × TILE_HEIGHT.
export const TILE_WIDTH = 64
export const TILE_HEIGHT = 32

// Данные карты: размер в мировых единицах и шаг сетки. Хранятся в Vuex-модуле game.
export const createMap = (width, height, gridSize) => ({ width, height, gridSize })

export const worldToScreen = (x, y, gridSize) => ({
  x: ((x - y) / gridSize) * TILE_WIDTH / 2,
  y: ((x + y) / gridSize) * TILE_HEIGHT / 2,
})

export const screenToWorld = (x, y, gridSize) => ({
  x: (x / TILE_WIDTH + y / TILE_HEIGHT) * gridSize,
  y: (y / TILE_HEIGHT - x / TILE_WIDTH) * gridSize,
})

export const clampToMap = (point, map) => ({
  x: Math.max(-map.width / 2, Math.min(map.width / 2, point.x)),
  y: Math.max(-map.height / 2, Math.min(map.height / 2, point.y)),
})

// Размер ромба карты на экране
export const getProjectedSize = (map) => ({
  width: ((map.width + map.height) / map.gridSize) * TILE_WIDTH / 2,
  height: ((map.width + map.height) / map.gridSize) * TILE_HEIGHT / 2,
})

// Углы прямоугольника мира → точки ромба для <polygon points>
export const toPolygonPoints = (corners, gridSize) => corners
  .map(corner => worldToScreen(corner.x, corner.y, gridSize))
  .map(point => `${point.x},${point.y}`)
  .join(' ')

export const getMapOutline = (map) => toPolygonPoints([
  { x: -map.width / 2, y: -map.height / 2 },
  { x: map.width / 2, y: -map.height / 2 },
  { x: map.width / 2, y: map.height / 2 },
  { x: -map.width / 2, y: map.height / 2 },
], map.gridSize)

export const getGridLines = (map) => {
  const lines = []
  const halfWidth = map.width / 2
  const halfHeight = map.height / 2
  for (let x = -halfWidth + map.gridSize; x < halfWidth; x += map.gridSize) {
    lines.push({
      start: worldToScreen(x, -halfHeight, map.gridSize),
      end: worldToScreen(x, halfHeight, map.gridSize),
      isAxis: x === 0,
    })
  }
  for (let y = -halfHeight + map.gridSize; y < halfHeight; y += map.gridSize) {
    lines.push({
      start: worldToScreen(-halfWidth, y, map.gridSize),
      end: worldToScreen(halfWidth, y, map.gridSize),
      isAxis: y === 0,
    })
  }
  return lines
}
