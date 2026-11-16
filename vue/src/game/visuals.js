// помощники для рисования в svg: все в координатах мира, камера сама делает из них ромбы

// список точек -> строка для <polygon points>
export const toPoints = (points) => points.map((p) => `${p.x},${p.y}`).join(' ')

// прямоугольник { minX, maxX, minY, maxY } -> атрибуты <rect>
export const rectOf = (box) => ({ x: box.minX, y: box.minY, width: box.maxX - box.minX, height: box.maxY - box.minY })

// поднять точку на высоту h: на экране вверх это сдвиг на -h по обеим осям мира
const lift = (p, h) => ({ x: p.x - h, y: p.y - h })

// объемная коробка: две видимые стены (ближние к зрителю) и крыша
export const boxFaces = (box, height) => {
  const top = { x: box.minX, y: box.minY }
  const right = { x: box.maxX, y: box.minY }
  const bottom = { x: box.maxX, y: box.maxY }
  const left = { x: box.minX, y: box.maxY }
  return {
    left: toPoints([left, bottom, lift(bottom, height), lift(left, height)]),
    right: toPoints([right, bottom, lift(bottom, height), lift(right, height)]),
    roof: toPoints([top, right, bottom, left].map((p) => lift(p, height))),
  }
}

// внутри группы с этой матрицей изометрия отменяется: рисуем стоячие фигурки как на экране
// 1 единица = половина ширины клетки, y вниз, (0, 0) - точка на земле
export const UPRIGHT = 'matrix(0.5 -0.5 1 1 0 0)'

// фигурки персонажей смотрят вправо; part - кусок фигурки, от него зависит цвет
export const FIGURES = {
  // оборотень: волк в профиль
  slow: [
    { tag: 'path', part: 'dark', d: 'M-0.4 -0.55Q-0.62 -0.62 -0.66 -0.86Q-0.5 -0.66 -0.34 -0.62Z' },
    { tag: 'rect', part: 'dark', x: -0.36, y: -0.45, width: 0.11, height: 0.45 },
    { tag: 'rect', part: 'dark', x: -0.18, y: -0.45, width: 0.11, height: 0.45 },
    { tag: 'rect', part: 'dark', x: 0.12, y: -0.45, width: 0.11, height: 0.45 },
    { tag: 'rect', part: 'dark', x: 0.28, y: -0.45, width: 0.11, height: 0.45 },
    { tag: 'ellipse', part: 'body', cx: -0.02, cy: -0.56, rx: 0.44, ry: 0.24 },
    { tag: 'ellipse', part: 'body', cx: 0.2, cy: -0.68, rx: 0.2, ry: 0.2 },
    { tag: 'path', part: 'body', d: 'M0.26 -0.84L0.36 -1L0.42 -0.82L0.66 -0.68L0.6 -0.58L0.32 -0.56Z' },
    { tag: 'circle', part: 'wolf-eye', cx: 0.46, cy: -0.74, r: 0.035 },
  ],
  // вампир: плащ с высоким воротником
  fast: [
    { tag: 'path', part: 'body', d: 'M-0.32 0Q-0.28 -0.5 -0.17 -0.88L0.17 -0.88Q0.28 -0.5 0.32 0Q0 -0.1 -0.32 0Z' },
    { tag: 'path', part: 'lining', d: 'M0.02 -0.86L0.14 -0.04L-0.04 -0.05Z' },
    { tag: 'path', part: 'dark', d: 'M-0.2 -0.86L-0.3 -1.2L-0.06 -0.94ZM0.2 -0.86L0.3 -1.2L0.06 -0.94Z' },
    { tag: 'circle', part: 'pale', cx: 0.02, cy: -1.06, r: 0.16 },
    { tag: 'path', part: 'hair', d: 'M-0.15 -1.08Q-0.12 -1.26 0.03 -1.25Q0.18 -1.24 0.18 -1.1L0.08 -1.15L0.02 -1.07L-0.04 -1.14Z' },
    { tag: 'circle', part: 'eye', cx: 0.1, cy: -1.05, r: 0.03 },
  ],
  // ловец: в долбленке с острогой
  swimmer: [
    { tag: 'path', part: 'pole', d: 'M0.05 -0.6L0.5 -1.15M0.5 -1.15L0.41 -1.07M0.5 -1.15L0.51 -1.03' },
    { tag: 'path', part: 'wood', d: 'M-0.52 -0.16Q0 0.1 0.52 -0.16L0.44 -0.28L-0.44 -0.28Z' },
    { tag: 'path', part: 'body', d: 'M-0.15 -0.28L-0.11 -0.74L0.12 -0.74L0.16 -0.28Z' },
    { tag: 'circle', part: 'skin', cx: 0.01, cy: -0.86, r: 0.13 },
    { tag: 'path', part: 'dark', d: 'M-0.14 -0.86Q0.01 -1.07 0.16 -0.86L0.1 -0.92Q0.01 -0.99 -0.08 -0.92Z' },
  ],
}

// --- здания ---

const at = (x, y, h = 0) => lift({ x, y }, h)
const face = (part, points) => ({ part, points: toPoints(points) })
const centerOf = (b) => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 })
const shrink = (b, d) => ({ minX: b.minX + d, minY: b.minY + d, maxX: b.maxX - d, maxY: b.maxY - d })
const corners = (b) => [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }]

// две ближние стены коробки от высоты from до to
const walls = (b, to, from = 0) => [
  face('wall-left', [at(b.minX, b.maxY, from), at(b.maxX, b.maxY, from), at(b.maxX, b.maxY, to), at(b.minX, b.maxY, to)]),
  face('wall-right', [at(b.maxX, b.minY, from), at(b.maxX, b.maxY, from), at(b.maxX, b.maxY, to), at(b.maxX, b.minY, to)]),
]
const lid = (b, h, part = 'roof') => face(part, corners(b).map((p) => at(p.x, p.y, h)))

// двускатная крыша, конек вдоль x
const gable = (b, h, rise) => {
  const mid = (b.minY + b.maxY) / 2
  return [
    face('roof-back', [at(b.minX, b.minY, h), at(b.maxX, b.minY, h), at(b.maxX, mid, h + rise), at(b.minX, mid, h + rise)]),
    face('wall-right', [at(b.maxX, b.minY, h), at(b.maxX, b.maxY, h), at(b.maxX, mid, h + rise)]),
    face('roof', [at(b.minX, b.maxY, h), at(b.maxX, b.maxY, h), at(b.maxX, mid, h + rise), at(b.minX, mid, h + rise)]),
  ]
}

// острая крыша-пирамида
const spire = (b, h, rise) => {
  const c = centerOf(b)
  const top = at(c.x, c.y, h + rise)
  return [
    face('roof-back', [at(b.minX, b.minY, h), at(b.maxX, b.minY, h), top]),
    face('roof-back', [at(b.minX, b.minY, h), at(b.minX, b.maxY, h), top]),
    face('roof', [at(b.minX, b.maxY, h), at(b.maxX, b.maxY, h), top]),
    face('roof-side', [at(b.maxX, b.minY, h), at(b.maxX, b.maxY, h), top]),
  ]
}

// окно или дверь на ближней стене: левой (вдоль x) или правой (вдоль y)
const onLeft = (part, b, x1, x2, z1, z2) => face(part, [at(x1, b.maxY, z1), at(x2, b.maxY, z1), at(x2, b.maxY, z2), at(x1, b.maxY, z2)])
const onRight = (part, b, y1, y2, z1, z2) => face(part, [at(b.maxX, y1, z1), at(b.maxX, y2, z1), at(b.maxX, y2, z2), at(b.maxX, y1, z2)])

// флаг клана: древко и полотнище, вправо по экрану
const flagAt = (p, h) => {
  const top = at(p.x, p.y, h + 0.9)
  return {
    pole: { x1: at(p.x, p.y, h).x, y1: at(p.x, p.y, h).y, x2: top.x, y2: top.y },
    cloth: toPoints([[0, 0], [0.325, -0.225], [0.675, 0.125], [0.35, 0.35]].map(([dx, dy]) => ({ x: top.x + dx, y: top.y + dy }))),
  }
}

// вид каждого здания: material - из чего стены, top - высота самой верхней точки (для полоски здоровья)
// draw(b, h) -> faces (по порядку, дальние первыми), flag, chimney - откуда идет дым
const LOOKS = {
  // вышка: столб, площадка, будка с острой крышей
  tower: {
    material: 'wood',
    top: 2.6,
    draw: (b, h) => {
      const deck = h * 0.7
      const cabin = shrink(b, 0.12)
      const c = centerOf(b)
      return {
        faces: [
          ...walls(shrink(b, 0.32), deck),
          ...walls(b, deck + 0.08, deck), lid(b, deck + 0.08, 'deck'),
          ...walls(cabin, deck + 0.5, deck + 0.08),
          onLeft('window', cabin, c.x - 0.15, c.x + 0.15, deck + 0.2, deck + 0.4),
          ...spire(shrink(b, 0.05), deck + 0.5, 0.45),
        ],
        flag: flagAt(c, deck + 0.95),
      }
    },
  },
  // хижина: двускатная крыша, дверь, окно и труба
  house: {
    material: 'wood',
    top: 2.2,
    draw: (b, h) => {
      const c = centerOf(b)
      const pipe = { minX: b.maxX - 0.6, maxX: b.maxX - 0.3, minY: b.minY + 0.3, maxY: b.minY + 0.6 }
      const [back, gableEnd, front] = gable(b, h, 0.8)
      return {
        faces: [
          ...walls(b, h),
          onLeft('door', b, c.x - 0.22, c.x + 0.22, 0, 0.62),
          onRight('window', b, c.y - 0.2, c.y + 0.2, 0.35, 0.65),
          back, ...walls(pipe, h + 1), lid(pipe, h + 1, 'wall-right'), gableEnd, front,
        ],
        chimney: at((pipe.minX + pipe.maxX) / 2, (pipe.minY + pipe.maxY) / 2, h + 1),
      }
    },
  },
  // логово: земляной холм в два уступа с черным лазом
  barracks: {
    material: 'earth',
    top: 1.6,
    draw: (b) => {
      const c = centerOf(b)
      const upper = shrink(b, 0.5)
      return {
        faces: [
          ...walls(b, 0.5), lid(b, 0.5, 'moss'),
          onLeft('door', b, c.x - 0.45, c.x + 0.45, 0, 0.42),
          ...walls(upper, 0.9, 0.5),
          ...spire(upper, 0.9, 0.55),
        ],
        flag: flagAt(c, 1.45),
      }
    },
  },
  // особняк: каменный дом с двускатной крышей и двумя башнями по бокам
  castle: {
    material: 'stone',
    top: 4,
    draw: (b, h) => {
      const main = shrink(b, 0.45)
      const c = centerOf(b)
      const left = { minX: b.minX, maxX: b.minX + 1.1, minY: b.maxY - 1.1, maxY: b.maxY }
      const right = { minX: b.maxX - 1.1, maxX: b.maxX, minY: b.minY, maxY: b.minY + 1.1 }
      const wall = h * 0.75
      const tower = h + 0.2
      const tc = centerOf(right)
      return {
        faces: [
          ...walls(main, wall),
          onLeft('door', main, c.x - 0.3, c.x + 0.3, 0, 0.8),
          onLeft('window', main, c.x - 0.95, c.x - 0.65, 0.9, 1.4),
          onLeft('window', main, c.x + 0.65, c.x + 0.95, 0.9, 1.4),
          onRight('window', main, c.y - 0.8, c.y - 0.5, 0.9, 1.4),
          onRight('window', main, c.y + 0.5, c.y + 0.8, 0.9, 1.4),
          ...gable(main, wall, 1.1),
          ...walls(left, tower), onRight('window', left, left.minY + 0.4, left.maxY - 0.4, 1.4, 1.8), ...spire(left, tower, 1.2),
          ...walls(right, tower), onLeft('window', right, right.minX + 0.4, right.maxX - 0.4, 1.4, 1.8), ...spire(right, tower, 1.2),
        ],
        flag: flagAt(tc, tower + 1.2),
        chimney: at(c.x - 0.6, c.y - 0.6, wall + 0.9),
      }
    },
  },
  // лодочный сарай: несколько длинных сараев с двускатными крышами
  shipyard: {
    material: 'wood',
    top: 1.3,
    draw: (b, h, parts) => ({
      faces: parts.flatMap((part) => [...walls(part, h), ...gable(part, h, 0.5)]),
    }),
  },
  // пристань: дощатый настил на сваях и будка с фонарем
  waterBase: {
    material: 'wood',
    top: 1.6,
    draw: (b) => {
      const hut = { minX: b.minX + 0.2, maxX: b.minX + 1.4, minY: b.minY + 0.2, maxY: b.minY + 1.4 }
      return {
        faces: [
          ...walls(b, 0.25), lid(b, 0.25, 'deck'),
          ...walls(hut, 1, 0.25), onRight('window', hut, hut.minY + 0.4, hut.maxY - 0.4, 0.5, 0.8), ...gable(hut, 1, 0.55),
        ],
        flag: flagAt({ x: b.maxX - 0.3, y: b.maxY - 0.3 }, 0.25),
      }
    },
  },
}

export const materialOf = (type) => LOOKS[type].material

// пока строится: голые стены растут вместе с progress, вокруг леса из бревен
const scaffold = (b, h, progress) => [
  ...walls(b, h * progress), lid(b, h * progress, 'bare'),
  ...corners(b).map((p) => face('scaffold', [at(p.x, p.y), at(p.x, p.y, h)])),
  face('scaffold', corners(b).map((p) => at(p.x, p.y, h))),
]

// building - здание, h - высота стен по таблице, parts - коробки (у сарая их несколько)
export const buildingLook = (building, h, parts) => {
  if ((building.progress ?? 1) < 1) return { faces: parts.flatMap((part) => scaffold(part, h, building.progress)) }
  return LOOKS[building.type].draw(parts[0], h, parts)
}

// верх здания над его центром: готовое - по виду, строящееся - по высоте стен
export const buildingTop = (building, h) => ((building.progress ?? 1) < 1 ? h * building.progress : LOOKS[building.type].top)

// --- лес вокруг карты ---

// повторяемый "случайный" разброс: одно и то же число для одного i
const noise = (i) => Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1

// ели снаружи каждой стороны карты в несколько рядов, отсортированы по глубине
export const forestAround = (outline, step = 2.2, rows = 3) => {
  const trees = []
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % outline.length]
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    // нормаль наружу: для обхода по часовой стрелке это (dy, -dx)
    const nx = (b.y - a.y) / length
    const ny = -(b.x - a.x) / length
    for (let t = 0; t < length; t += step) {
      for (let row = 0; row < rows; row++) {
        const i = trees.length + 1
        const out = 1 + row * 2 + noise(i) * 1.2
        const along = t + noise(i + 0.5) * step
        trees.push({
          x: a.x + ((b.x - a.x) * along) / length + nx * out,
          y: a.y + ((b.y - a.y) * along) / length + ny * out,
          scale: 1 + noise(i + 0.25) * 0.7,
        })
      }
    }
  })
  return trees
    .sort((p, q) => p.x + p.y - (q.x + q.y))
    .map((tree) => ({ transform: `translate(${tree.x} ${tree.y}) ${UPRIGHT} scale(${tree.scale.toFixed(2)})` }))
}

// фигурки на клетках одной местности: ель в каждой клетке леса, вершина горы через клетку
// сдвиг и разный рост, чтобы не выглядело сеткой; every - брать каждую n-ю клетку по диагонали
export const terrainScenery = (terrain, type, href, { every = 1, minScale = 0.8, spread = 0.6 } = {}) => Object.entries(terrain)
  .filter(([cell, cellType]) => cellType === type && cell.split(',').map(Number).reduce((a, b) => a + b) % every === 0)
  .map(([cell], index) => {
    const [x, y] = cell.split(',').map(Number)
    return { x: x + 0.2 + noise(index + 0.7) * 0.6, y: y + 0.2 + noise(index + 0.8) * 0.6, scale: minScale + noise(index + 0.9) * spread }
  })
  .sort((p, q) => p.x + p.y - (q.x + q.y))
  .map((item) => ({ href, transform: `translate(${item.x.toFixed(2)} ${item.y.toFixed(2)}) ${UPRIGHT} scale(${item.scale.toFixed(2)})` }))

// мелочь на траве: кусты, камни и пни; на игру не влияют, ставим только на свободную сушу
const DECOR = ['#bush', '#rock', '#stump']
export const scatterDecor = (bounds, isFree, step = 4) => {
  const items = []
  for (let x = bounds.minX + 1; x < bounds.maxX - 1; x += step) {
    for (let y = bounds.minY + 1; y < bounds.maxY - 1; y += step) {
      const i = items.length + x * 0.37 + y * 0.11
      if (noise(i) < 0.45) continue // примерно половина мест пустая
      const p = { x: x + noise(i + 0.1) * step, y: y + noise(i + 0.2) * step }
      if (!isFree(p)) continue
      items.push({ ...p, href: DECOR[Math.floor(noise(i + 0.3) * DECOR.length)], scale: 0.7 + noise(i + 0.4) * 0.6 })
    }
  }
  return items.map((item) => ({ href: item.href, transform: `translate(${item.x.toFixed(2)} ${item.y.toFixed(2)}) ${UPRIGHT} scale(${item.scale.toFixed(2)})` }))
}

// клочья тумана по всей карте: x, y в мире, размер в единицах UPRIGHT
export const fogPatches = (bounds, count = 45) => Array.from({ length: count }, (_, index) => {
  const i = index + 1
  const x = bounds.minX + noise(i) * (bounds.maxX - bounds.minX)
  const y = bounds.minY + noise(i + 0.3) * (bounds.maxY - bounds.minY)
  return {
    transform: `translate(${x} ${y}) ${UPRIGHT}`,
    rx: 10 + noise(i + 0.6) * 12,
    ry: 3 + noise(i + 0.9) * 3,
    drift: `${-3 - noise(i + 0.1) * 3} 0; ${3 + noise(i + 0.2) * 3} 0; ${-3 - noise(i + 0.1) * 3} 0`,
    dur: `${30 + Math.round(noise(i + 0.4) * 30)}s`,
  }
})
