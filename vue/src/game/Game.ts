// точка сборки игры

import { Camera } from './Camera'
import { createSquareMap } from './map'
import { UNIT_TYPES, createUnit, updateUnit, type Unit } from './units'

const MAP_SIZE = 120 // карта 120 x 120 клеток
const PAN_SPEED = 700 // скорость камеры пикселе в секунду
const EDGE = 16 // если курсор ближе к краю экрана то  камера едет

const COLORS = {
  background: '#0b0d10',
  grass: '#5a8a3c',
  grid: 'rgba(0, 0, 0, 0.15)',
  axisX: '#e04848',
  axisY: '#3a7be0',
  selection: '#ffffff',
  text: '#ffffff',
}

export interface SelectedInfo {
  name: string
  speed: number
}

export class Game {
  private ctx: CanvasRenderingContext2D
  private map = createSquareMap(MAP_SIZE)
  private camera = new Camera()
  private units: Unit[] = [
    createUnit('villager', -3, 0),
    createUnit('villager', 0, -3),
    createUnit('villager', 3, 0),
    createUnit('scout', 0, 4),
    createUnit('scout', 4, 4),
  ]
  private selected: Unit | null = null
  private keys = new Set<string>()
  private mouse = { x: 0, y: 0, inside: false }
  private rafId = 0
  private lastTime = 0
  private removeListeners: (() => void)[] = []

  constructor(
    private canvas: HTMLCanvasElement,
    private onSelect: (info: SelectedInfo | null) => void,
  ) {
    this.ctx = canvas.getContext('2d')!

    this.listen(window, 'keydown', (e: KeyboardEvent) => this.keys.add(e.code))
    this.listen(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.code))
    this.listen(window, 'blur', () => this.keys.clear())

    const trackMouse = (e: MouseEvent) => {
      this.mouse = { x: e.offsetX, y: e.offsetY, inside: true }
    }
    this.listen(canvas, 'mouseenter', trackMouse)
    this.listen(canvas, 'mousemove', trackMouse)
    this.listen(canvas, 'mouseleave', () => (this.mouse.inside = false))

    // если обычный клик то выбрать персонажа, мимо то снять выбор
    this.listen(canvas, 'mousedown', (e: MouseEvent) => {
      trackMouse(e)
      if (e.button === 0 && !e.ctrlKey) this.select(this.unitAt(e.offsetX, e.offsetY))
    })

    // идти в точк (пкм)
    this.listen(canvas, 'contextmenu', (e: MouseEvent) => {
      e.preventDefault()
      this.orderMove(e.offsetX, e.offsetY)
    })

    // если щипок на тачпаде приходит то делаем зум
    // если свайп то двигаем камеру
    this.listen(canvas, 'wheel', (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey) {
        const delta = Math.max(-50, Math.min(50, e.deltaY))
        this.camera.zoomAt(e.offsetX, e.offsetY, Math.exp(-delta * 0.01))
      } else {
        this.camera.pan(e.deltaX, e.deltaY)
      }
    }, { passive: false })

    this.rafId = requestAnimationFrame(this.frame)
  }

  // вызывать при уходе со страницы
  destroy(): void {
    cancelAnimationFrame(this.rafId)
    this.removeListeners.forEach((remove) => remove())
  }

  private listen(target: EventTarget, type: string, handler: (e: any) => void, options?: AddEventListenerOptions): void {
    target.addEventListener(type, handler, options)
    this.removeListeners.push(() => target.removeEventListener(type, handler, options))
  }

  private frame = (now: number): void => {
    // dt не больше 0.1, иначе после свернутой вкладки все телепортируются
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.1) : 0
    this.lastTime = now
    this.resize()
    this.update(dt)
    this.render()
    this.rafId = requestAnimationFrame(this.frame)
  }

  // подгоняем canvas под окно и под ретину
  private resize(): void {
    const dpr = window.devicePixelRatio || 1
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr)
      this.canvas.height = Math.round(h * dpr)
    }
    this.camera.width = w
    this.camera.height = h
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  private update(dt: number): void {
    // камеру двигает wasd, стрелки или курсор у края
    const { keys, mouse, camera } = this
    let dx = 0
    let dy = 0
    if (keys.has('KeyA') || keys.has('ArrowLeft') || (mouse.inside && mouse.x < EDGE)) dx -= 1
    if (keys.has('KeyD') || keys.has('ArrowRight') || (mouse.inside && mouse.x > camera.width - EDGE)) dx += 1
    if (keys.has('KeyW') || keys.has('ArrowUp') || (mouse.inside && mouse.y < EDGE)) dy -= 1
    if (keys.has('KeyS') || keys.has('ArrowDown') || (mouse.inside && mouse.y > camera.height - EDGE)) dy += 1
    if (dx || dy) {
      const len = Math.hypot(dx, dy)
      camera.pan((dx / len) * PAN_SPEED * dt, (dy / len) * PAN_SPEED * dt)
    }
    camera.clampTo(this.map.bounds)

    for (const unit of this.units) updateUnit(unit, dt)
  }

  private orderMove(sx: number, sy: number): void {
    if (!this.selected) return
    const target = this.camera.screenToWorld(sx, sy)
    if (this.map.contains(target)) this.selected.target = target
  }

  private select(unit: Unit | null): void {
    this.selected = unit
    this.onSelect(unit ? { name: UNIT_TYPES[unit.type].name, speed: UNIT_TYPES[unit.type].speed } : null)
  }

  // кто под курсором, проверяем с ближних (они нарисованы поверх)
  private unitAt(sx: number, sy: number): Unit | null {
    const nearFirst = [...this.units].sort((a, b) => b.x + b.y - (a.x + a.y))
    for (const unit of nearFirst) {
      const p = this.camera.worldToScreen(unit.x, unit.y)
      const size = this.camera.toScreenLength(UNIT_TYPES[unit.type].size)
      if (sx > p.x - size / 2 && sx < p.x + size / 2 && sy > p.y - size && sy < p.y) return unit
    }
    return null
  }

  private render(): void {
    const { ctx, camera } = this
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, camera.width, camera.height)

    // поле
    ctx.beginPath()
    for (const p of this.map.outline) {
      const s = camera.worldToScreen(p.x, p.y)
      ctx.lineTo(s.x, s.y)
    }
    ctx.closePath()
    ctx.fillStyle = COLORS.grass
    ctx.fill()

    this.drawGridAndAxes()

    // сначала дальние, потом ближние, чтобы ближние были сверху
    const farFirst = [...this.units].sort((a, b) => a.x + a.y - (b.x + b.y))
    for (const unit of farFirst) this.drawUnit(unit)
  }

  // отрезок из точки мира (x1, y1) в (x2, y2)
  private line(x1: number, y1: number, x2: number, y2: number): void {
    const a = this.camera.worldToScreen(x1, y1)
    const b = this.camera.worldToScreen(x2, y2)
    this.ctx.moveTo(a.x, a.y)
    this.ctx.lineTo(b.x, b.y)
  }

  private drawGridAndAxes(): void {
    const { ctx, camera } = this
    const b = this.map.bounds

    // здесь клеточки, обрезаем по полю
    ctx.save()
    ctx.clip()
    ctx.beginPath()
    for (let x = Math.ceil(b.minX); x <= b.maxX; x++) this.line(x, b.minY, x, b.maxY)
    for (let y = Math.ceil(b.minY); y <= b.maxY; y++) this.line(b.minX, y, b.maxX, y)
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()

    // оси через центр
    ctx.lineWidth = 2
    ctx.strokeStyle = COLORS.axisX
    ctx.beginPath()
    this.line(b.minX, 0, b.maxX, 0)
    ctx.stroke()
    ctx.strokeStyle = COLORS.axisY
    ctx.beginPath()
    this.line(0, b.minY, 0, b.maxY)
    ctx.stroke()

    // центр и подписи
    const o = camera.worldToScreen(0, 0)
    const xEnd = camera.worldToScreen(b.maxX, 0)
    const yEnd = camera.worldToScreen(0, b.maxY)
    ctx.fillStyle = COLORS.text
    ctx.beginPath()
    ctx.arc(o.x, o.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('(0, 0)', o.x + 8, o.y - 4)
    ctx.fillText('x', xEnd.x + 6, xEnd.y)
    ctx.fillText('y', yEnd.x - 14, yEnd.y)
  }

  // персонаж это квадрат с буквой, стоит нижней стороной в точке (x, y)
  private drawUnit(unit: Unit): void {
    const { ctx, camera } = this
    const type = UNIT_TYPES[unit.type]
    const p = camera.worldToScreen(unit.x, unit.y)
    const size = camera.toScreenLength(type.size)
    const left = p.x - size / 2
    const top = p.y - size

    ctx.fillStyle = type.color
    ctx.fillRect(left, top, size, size)

    ctx.fillStyle = COLORS.text
    ctx.font = `bold ${Math.round(size * 0.6)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(type.letter, p.x, p.y - size / 2)

    if (unit === this.selected) {
      // белая рамка вокруг выбранного
      ctx.strokeStyle = COLORS.selection
      ctx.lineWidth = 2
      ctx.strokeRect(left - 4, top - 4, size + 8, size + 8)

      // крестик там, куда идет
      if (unit.target) {
        const t = camera.worldToScreen(unit.target.x, unit.target.y)
        const c = 6
        ctx.beginPath()
        ctx.moveTo(t.x - c, t.y - c)
        ctx.lineTo(t.x + c, t.y + c)
        ctx.moveTo(t.x + c, t.y - c)
        ctx.lineTo(t.x - c, t.y + c)
        ctx.stroke()
      }
    }
  }
}
