// игровое поле, координаты в клетках, (0, 0) это центр карты
// поле задается многоугольником, поэтому размер и форма могут быть любыми

const toBounds = (outline) => {
  const xs = outline.map((p) => p.x)
  const ys = outline.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

// лес и горы непроходимы: в них не стоят ни сухопутные, ни водные (тип клетки не совпадает ни с чьим)
export const TERRAIN_TYPES = { LAND: 'land', WATER: 'water', FOREST: 'forest', MOUNTAIN: 'mountain' }

// тип клетки по умолчанию - суша, остальные клетки храним отдельно
export const createMap = (outline, terrain = {}) => ({ outline, bounds: toBounds(outline), terrain })

// горный хребет в дальнем углу карты и скала на востоке: центр и радиус в долях половины карты
const MOUNTAINS = [
  { x: -0.88, y: -0.68, r: 0.13 },
  { x: -0.68, y: -0.88, r: 0.13 },
  { x: -0.86, y: -0.86, r: 0.12 },
  { x: 0.87, y: 0.13, r: 0.08 },
]

// рощи: центр и радиус в долях половины карты, края рваные
const GROVES = [
  { x: -0.67, y: -0.53, r: 0.1 },
  { x: -0.67, y: 0.25, r: 0.1 },
  { x: -0.17, y: -0.67, r: 0.1 },
  { x: 0.67, y: 0.42, r: 0.13 },
  { x: -0.42, y: 0.67, r: 0.12 },
  { x: 0.75, y: -0.5, r: 0.1 },
  { x: 0.08, y: 0.6, r: 0.08 },
  { x: -0.85, y: -0.08, r: 0.08 },
]

// квадрат с центром в (0, 0), в изометрии выглядит как ромб
// вода: одна извилистая река от северного края; у середины разливается в плес
// с коротким ровным западным берегом (там удобно ставить верфь), на юге мелеет ручьем и сходит на нет
const smooth = (t) => {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}
const mix = (a, b, t) => a + (b - a) * t

export const createSquareMap = (size) => {
  const h = size / 2
  const u = size / 120 // все размеры ниже придуманы для карты 120 x 120
  const terrain = {}
  const fill = (y, from, to) => {
    for (let x = Math.floor(from); x < Math.ceil(to); x++) terrain[`${x},${y}`] = TERRAIN_TYPES.WATER
  }

  // берега реки на строке y: север - петли, середина - плес, юг - ручей сужается
  const north = (y) => {
    const center = 23 + 7 * Math.sin((y + 10) / 9)
    const half = 2.6 + 0.6 * Math.sin(y / 5)
    return [center - half, center + half]
  }
  const middle = (y) => [10, 23 + 2 * Math.sin(y / 4)]
  const south = (y) => {
    const center = 19 + 4 * Math.sin((y - 6) / 6)
    const half = 2.6 - (1.6 * (y - 6)) / 20
    return [center - half, center + half]
  }
  const banks = (y) => {
    if (y < -9) {
      const t = smooth((y + 22) / 13) // от y = -22 река плавно разливается к плесу
      return north(y).map((value, i) => mix(value, middle(y)[i], t))
    }
    if (y <= 4) return middle(y)
    const t = smooth((y - 4) / 10) // после y = 4 плес сужается в ручей
    return middle(y).map((value, i) => mix(value, south(y)[i], t))
  }

  for (let y = -h; y < 26 * u; y++) {
    const [from, to] = banks(y / u)
    fill(y, from * u, to * u)
  }

  // горы и рощи пятнами на суше, края неровные за счет синуса по углу
  const blobs = (list, type) => list.forEach((blob, index) => {
    const cx = blob.x * h
    const cy = blob.y * h
    const r = blob.r * h
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) {
        const edge = r + 1.5 * Math.sin(Math.atan2(y - cy, x - cx) * 3 + index)
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < edge && !terrain[`${x},${y}`]) terrain[`${x},${y}`] = type
      }
    }
  })
  blobs(MOUNTAINS, TERRAIN_TYPES.MOUNTAIN)
  blobs(GROVES, TERRAIN_TYPES.FOREST)

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

// все клетки одной местности одним path: каждая клетка - квадрат 1 x 1
export const terrainPath = (map, type) =>
  Object.entries(map.terrain)
    .filter(([, cellType]) => cellType === type)
    .map(([cell]) => {
      const [x, y] = cell.split(',').map(Number)
      return `M${x} ${y}h1v1h-1Z`
    })
    .join('')

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
