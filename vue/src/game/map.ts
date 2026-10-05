// игровое поле, координаты в клетках
// выбрали (0, 0) за центр карты а поле задается многоугольником,
// поэтому размер и форма могут быть любыми

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export class GameMap {
  // прямоугольник вокруг карты, нужен камере
  readonly bounds: Bounds

  constructor(readonly outline: Point[]) {
    const xs = outline.map((p) => p.x)
    const ys = outline.map((p) => p.y)
    this.bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
  }

  // точка внутри многоугольника (считаем пересечения луча с границей)
  contains(p: Point): boolean {
    let inside = false
    const pts = this.outline
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i]
      const b = pts[j]
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }
}

// квадратная карта с центром в (0, 0), в изометрии выглядит как ромб
export function createSquareMap(size: number): GameMap {
  const h = size / 2
  return new GameMap([
    { x: -h, y: -h },
    { x: h, y: -h },
    { x: h, y: h },
    { x: -h, y: h },
  ])
}
