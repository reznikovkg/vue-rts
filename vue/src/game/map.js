// игровое поле, координаты в клетках, (0, 0) это центр карты
// поле задается многоугольником, поэтому размер и форма могут быть любыми

const toBounds = (outline) => {
  const xs = outline.map((p) => p.x)
  const ys = outline.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

export const TERRAIN_TYPES = { LAND: 'land', WATER: 'water' }

// тип клетки по умолчанию - суша, остальные клетки храним отдельно
export const createMap = (outline, terrain = {}) => ({ outline, bounds: toBounds(outline), terrain })

// квадрат с центром в (0, 0), в изометрии выглядит как ромб
export const createSquareMap = (size) => {
  const h = size / 2
  const terrain = {}
  for (let x = Math.floor(size / 12); x < Math.floor(size / 4); x++) {
    for (let y = -Math.floor(size / 12); y < Math.floor(size / 12); y++) {
      terrain[`${x},${y}`] = TERRAIN_TYPES.WATER
    }
  }
  return createMap(
    [
      { x: -h, y: -h },
      { x: h, y: -h },
      { x: h, y: h },
      { x: -h, y: h },
    ],
    terrain,
  )
}

// точка внутри многоугольника: луч вправо, нечетное число пересечений с границей - внутри
export const containsPoint = (map, p) => {
  const pts = map.outline
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]
    const b = pts[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export const terrainAt = (map, p) =>
  containsPoint(map, p) ? map.terrain[`${Math.floor(p.x)},${Math.floor(p.y)}`] ?? TERRAIN_TYPES.LAND : null

// проверяем все клетки под персонажем, чтобы он не заходил краем на чужую местность
export const canStandOnTerrain = (map, p, radius, terrain, areas = []) => {
  const matches = (point) => containsPoint(map, point) && (
    terrainAt(map, point) === terrain ||
    areas.some((box) => point.x >= box.minX && point.x < box.maxX && point.y >= box.minY && point.y < box.maxY)
  )
  for (let x = Math.floor(p.x - radius); x <= Math.floor(p.x + radius); x++) {
    for (let y = Math.floor(p.y - radius); y <= Math.floor(p.y + radius); y++) {
      const nearestX = Math.min(x + 1, Math.max(x, p.x))
      const nearestY = Math.min(y + 1, Math.max(y, p.y))
      if (Math.hypot(p.x - nearestX, p.y - nearestY) < radius && !matches({ x: x + 0.5, y: y + 0.5 })) {
        return false
      }
    }
  }
  return matches(p)
}
