// игровое поле, координаты в клетках, (0, 0) это центр карты
// поле задается многоугольником, поэтому размер и форма могут быть любыми

const toBounds = (outline) => {
  const xs = outline.map((p) => p.x)
  const ys = outline.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

export const createMap = (outline) => ({ outline, bounds: toBounds(outline) })

// квадрат с центром в (0, 0), в изометрии выглядит как ромб
export const createSquareMap = (size) => {
  const h = size / 2
  return createMap([
    { x: -h, y: -h },
    { x: h, y: -h },
    { x: h, y: h },
    { x: -h, y: h },
  ])
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