import type { Bounds, Point } from './map'

const TILE_WIDTH = 64 // ширина клетки-ромба при zoom = 1
const MIN_ZOOM = 0.1 // при таком отдалении видно всю карту
const MAX_ZOOM = 3

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export class Camera {
  // точка мира в центре экрана
  x = 0
  y = 0
  zoom = 1
  // размер экрана в css пикселях
  width = 0
  height = 0

  private get scale(): number {
    return (TILE_WIDTH / 2) * this.zoom
  }

  worldToScreen(wx: number, wy: number): Point {
    const dx = wx - this.x
    const dy = wy - this.y
    return {
      x: (dx - dy) * this.scale + this.width / 2,
      y: ((dx + dy) * this.scale) / 2 + this.height / 2,
    }
  }

  screenToWorld(sx: number, sy: number): Point {
    const a = (sx - this.width / 2) / this.scale // dx - dy
    const b = ((sy - this.height / 2) * 2) / this.scale // dx + dy
    return { x: this.x + (a + b) / 2, y: this.y + (b - a) / 2 }
  }

  // длина в клетках
  toScreenLength(length: number): number {
    return length * this.scale * Math.SQRT2
  }

  // сдвиг на dx, dy пикселей экрана
  pan(dx: number, dy: number): void {
    const p = this.screenToWorld(this.width / 2 + dx, this.height / 2 + dy)
    this.x = p.x
    this.y = p.y
  }

  // зум к курсору
  // точка под курсором остается на месте
  zoomAt(sx: number, sy: number, factor: number): void {
    const before = this.screenToWorld(sx, sy)
    this.zoom = clamp(this.zoom * factor, MIN_ZOOM, MAX_ZOOM)
    const after = this.screenToWorld(sx, sy)
    this.x += before.x - after.x
    this.y += before.y - after.y
  }

  // не даем уехать за карту
  clampTo(b: Bounds): void {
    this.x = clamp(this.x, b.minX, b.maxX)
    this.y = clamp(this.y, b.minY, b.maxY)
  }
}
