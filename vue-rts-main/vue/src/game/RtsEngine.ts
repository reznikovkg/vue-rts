import { Entity, Unit } from './entities';

export class RtsEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Камера
  public cameraX: number = 0; 
  public cameraY: number = 0; 
  public zoom: number = 1.0;
  private minZoom = 0.4;
  private maxZoom = 2.0;

  // Игровой цикл
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private animFrameId: number | null = null;

  // Состояние ввода
  private keys: Record<string, boolean> = {};
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartCamX: number = 0;
  private panStartCamY: number = 0;

  // Сущности
  public entities: Entity[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не удалось получить CanvasRenderingContext2D');
    this.ctx = context;

    this.bindEvents();
    this.initDefaultEntities();
  }

  private initDefaultEntities() {
    // Несколько начальных юнитов вокруг центра координат
    this.entities.push(new Unit('unit_1', -60, -40, '#2563eb'));
    this.entities.push(new Unit('unit_2', 50, 30, '#dc2626'));
    this.entities.push(new Unit('unit_3', -20, 80, '#16a34a'));
  }

  // Преобразование координат 
  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    return {
      x: (screenX - cx) / this.zoom + this.cameraX,
      y: (screenY - cy) / this.zoom + this.cameraY,
    };
  }

  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    return {
      x: (worldX - this.cameraX) * this.zoom + cx,
      y: (worldY - this.cameraY) * this.zoom + cy,
    };
  }

  // Управление событиями ввода
  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public destroy() {
    this.stop();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = this.screenToWorld(screenX, screenY);

    // Панорамирование камеры средней кнопкой мыши
    if (e.button === 1) {
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panStartCamX = this.cameraX;
      this.panStartCamY = this.cameraY;
      e.preventDefault();
      return;
    }

// Левый клик: Выделение юнита
    if (e.button === 0) {
      let found: Entity | null = null;
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const ent = this.entities[i];
        if (ent && ent.contains(world.x, world.y)) {
          found = ent;
          break;
        }
      }

      this.entities.forEach((ent) => (ent.isSelected = false));
      if (found) {
        found.isSelected = true;
      }
    }

    // Правый клик: Приказ переместиться выбранным юнитам
    if (e.button === 2) {
      const selectedUnits = this.entities.filter(
        (ent): ent is Unit => ent.isSelected && ent instanceof Unit
      );

      // Если выделено несколько юнитов, слегка распределяем их вокруг цели
      selectedUnits.forEach((unit, idx) => {
        const offsetAngle = (idx / (selectedUnits.length || 1)) * Math.PI * 2;
        const offsetRadius = selectedUnits.length > 1 ? 25 : 0;
        const targetX = world.x + Math.cos(offsetAngle) * offsetRadius;
        const targetY = world.y + Math.sin(offsetAngle) * offsetRadius;
        unit.setDestination(targetX, targetY);
      });
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isPanning) {
      const dx = (e.clientX - this.panStartX) / this.zoom;
      const dy = (e.clientY - this.panStartY) / this.zoom;
      this.cameraX = this.panStartCamX - dx;
      this.cameraY = this.panStartCamY - dy;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 1) {
      this.isPanning = false;
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * zoomFactor));
    this.zoom = newZoom;
  };

  // Обновление логики камеры от клавиатуры
  private updateCamera(dt: number) {
    const camSpeed = (500 / this.zoom) * dt;
    if (this.keys['w'] || this.keys['arrowup']) this.cameraY -= camSpeed;
    if (this.keys['s'] || this.keys['arrowdown']) this.cameraY += camSpeed;
    if (this.keys['a'] || this.keys['arrowleft']) this.cameraX -= camSpeed;
    if (this.keys['d'] || this.keys['arrowright']) this.cameraX += camSpeed;
  }

  // Цикл отрисовки 
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    const loop = (time: number) => {
      if (!this.isRunning) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private update(dt: number) {
    this.updateCamera(dt);
    for (const ent of this.entities) {
      ent.update(dt);
    }
  }

  private render() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.save();
    // Сдвиг в центр экрана и трансформация камеры
    this.ctx.translate(width / 2, height / 2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.cameraX, -this.cameraY);

    // 1. Отрисовка координатной сетки (бесконечное поле)
    this.renderGrid();

    // 2. Оси координат и центр (0, 0)
    this.renderAxes();

    // 3. Сущности
    for (const ent of this.entities) {
      ent.render(this.ctx);
    }

    this.ctx.restore();
  }

  private renderGrid() {
    const gridSize = 64;
    const viewWidth = this.canvas.width / this.zoom;
    const viewHeight = this.canvas.height / this.zoom;

    const startX = Math.floor((this.cameraX - viewWidth / 2) / gridSize) * gridSize;
    const endX = Math.ceil((this.cameraX + viewWidth / 2) / gridSize) * gridSize;
    const startY = Math.floor((this.cameraY - viewHeight / 2) / gridSize) * gridSize;
    const endY = Math.ceil((this.cameraY + viewHeight / 2) / gridSize) * gridSize;

    this.ctx.beginPath();
    this.ctx.strokeStyle = '#2d3748';
    this.ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += gridSize) {
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
    }
    this.ctx.stroke();
  }

  private renderAxes() {
    // Главные координатные оси поля
    this.ctx.lineWidth = 2;

    // Ось X
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    this.ctx.moveTo(-10000, 0);
    this.ctx.lineTo(10000, 0);
    this.ctx.stroke();

    // Ось Y
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
    this.ctx.moveTo(0, -10000);
    this.ctx.lineTo(0, 10000);
    this.ctx.stroke();

    // Метка центра (0, 0)
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.font = '12px monospace';
    this.ctx.fillText('(0, 0)', 8, -8);
  }
}