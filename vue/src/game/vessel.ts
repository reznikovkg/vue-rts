// Геометрия судов (лодка, корабль)
import { worldToScreen } from './coords'
import type { Point } from './types'

// Корпус в плане: длина от кормы до носа и ширина в борт, в мировых пикселях
export interface VesselDims {
  length: number
  beam: number
}

export const BOAT_DIMS: VesselDims = { length: 84, beam: 34 }
export const WARSHIP_DIMS: VesselDims = { length: 150, beam: 46 }

// Доли корпуса: 0.5 по длине - нос, 0.5 по полуширине - борт
const HULL: [number, number][] = [[0.5, 0], [0.44, -0.42], [0, -0.5], [-0.44, -0.42], [-0.5, 0], [-0.44, 0.42], [0, 0.5], [0.44, 0.42]]
const DECK: [number, number][] = [[0.44, 0], [0.38, -0.34], [0, -0.4], [-0.38, -0.34], [-0.42, 0], [-0.38, 0.34], [0, 0.4], [0.38, 0.34]]

// мостик корабля: прямоугольник поперёк палубы ближе к носу
const BRIDGE: [number, number][] = [[0.08, -0.22], [0.2, -0.22], [0.2, 0.22], [0.08, 0.22]]

// Отрезок между двумя точками корпуса в координатах svg
export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface VesselGeometry {
  size: number // сторона svg с запасом под поворот корпуса
  hullPoints: (part: 'hull' | 'keel' | 'deck' | 'bridge') => string
  benches: Segment[] // банки гребцов лодки
  tiller: Segment // румпель лодки
  turrets: { x: number, y: number, r: number }[] // башни корабля
  barrels: Segment[] // стволы корабля в нос
  funnelAnchor: Point // основание трубы: здесь ставится вертикальная часть
}

// Геометрия судна
export const vesselGeometry = (position: Point, facing: number, dims: VesselDims): VesselGeometry => {
  const cos = Math.cos(facing)
  const sin = Math.sin(facing)
  const center = worldToScreen(position)

  const project = (local: Point): Point => {
    const world = {
      x: position.x + local.x * dims.length * cos - local.y * dims.beam * sin,
      y: position.y + local.x * dims.length * sin + local.y * dims.beam * cos,
    }
    const point = worldToScreen(world)
    return { x: point.x - center.x, y: point.y - center.y }
  }

  // Экранные точки контура: набор пар долей корпуса -> строка точек svg
  const outline = (points: [number, number][], shiftY = 0) =>
    points.map(([x, y]) => {
      const p = project({ x, y })
      return `${p.x.toFixed(1)},${(p.y + shiftY).toFixed(1)}`
    }).join(' ')

  const segment = (from: Point, to: Point): Segment => {
    const a = project(from)
    const b = project(to)
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }

  return {
    // Размер svg с запасом: корпус поворачивается вокруг центра, след уходит назад
    size: Math.round(dims.length * 2.2 + dims.beam),
    hullPoints: (part) => {
      switch (part) {
        case 'hull':
          return outline(HULL)
        case 'keel':
          // тот же силуэт ниже по экрану: между палубой и водой виден борт
          return outline(HULL, 7)
        case 'deck':
          return outline(DECK)
        default:
          return outline(BRIDGE)
      }
    },
    benches: [
      segment({ x: 0.16, y: -0.3 }, { x: 0.16, y: 0.3 }),
      segment({ x: -0.06, y: -0.3 }, { x: -0.06, y: 0.3 }),
    ],
    tiller: segment({ x: -0.3, y: 0.12 }, { x: -0.44, y: 0.32 }),
    turrets: [0.3, -0.14].map((x) => {
      const p = project({ x, y: 0 })
      return { x: p.x, y: p.y, r: 9 }
    }),
    barrels: [0.3, -0.14].flatMap((x) => [-0.07, 0.07].map((y) =>
      segment({ x, y }, { x: x + 0.1, y }))),
    funnelAnchor: project({ x: 0.02, y: 0 }),
  }
}
