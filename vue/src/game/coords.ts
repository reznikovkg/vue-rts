import { MAP } from './config'
import type { Point } from './types'

// Мир - обычный прямоугольник с (0,0) в центре карты, а на экране он рисуется в изометрии (ромбом).
// Проекция: поворот на 45 градусов и сжатие по вертикали в 2 раза.
export const ISO_SCALE = Math.SQRT1_2

// мировые координаты -> пиксели на экране относительно центра карты
export const worldToScreen = (point: Point): Point => ({
  x: (point.x - point.y) * ISO_SCALE,
  y: ((point.x + point.y) * ISO_SCALE) / 2,
})

// обратный перевод: пиксели на экране относительно центра карты -> мировые координаты
export const screenToWorld = (point: Point): Point => ({
  x: (point.x + 2 * point.y) / (2 * ISO_SCALE),
  y: (2 * point.y - point.x) / (2 * ISO_SCALE),
})

// порядок отрисовки по точке на экране
export const depthZIndex = (screenPoint: Point): number => Math.round(screenPoint.y) + MAP.width + MAP.height

// ближайшая точка внутри карты (в мировых координатах)
export const clampToMap = (point: Point): Point => ({
  x: Math.max(-MAP.width / 2, Math.min(MAP.width / 2, point.x)),
  y: Math.max(-MAP.height / 2, Math.min(MAP.height / 2, point.y)),
})
