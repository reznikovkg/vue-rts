export type EntityType = 'unit' | 'building';

export interface EntityStats {
  hp: number;
  maxHp: number;
  speed: number;       
  attack?: number;
  sightRadius?: number;
}

export abstract class Entity {
  public id: string;
  public type: EntityType;
  public x: number;    
  public y: number;    
  public size: number; // Радиус/габариты для кликов и отрисовки
  public isSelected: boolean = false;
  public stats: EntityStats;

  constructor(id: string, type: EntityType, x: number, y: number, size: number, stats: EntityStats) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.size = size;
    this.stats = stats;
  }

  public abstract update(dt: number): void;
  public abstract render(ctx: CanvasRenderingContext2D): void;

  // Проверка попадания клика в объект
  public contains(worldX: number, worldY: number): boolean {
    const dx = this.x - worldX;
    const dy = this.y - worldY;
    return Math.hypot(dx, dy) <= this.size;
  }
}

export class Unit extends Entity {
  public targetX: number | null = null;
  public targetY: number | null = null;
  public color: string;

  constructor(id: string, x: number, y: number, color: string = '#3b82f6') {
    super(id, 'unit', x, y, 16, {
      hp: 100,
      maxHp: 100,
      speed: 180, // Пикселей в секунду
    });
    this.color = color;
  }

  public setDestination(targetX: number, targetY: number) {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  public update(dt: number) {
    if (this.targetX === null || this.targetY === null) return;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    const step = this.stats.speed * dt;
    if (dist <= step) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.targetX = null;
      this.targetY = null;
    } else {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Кольцо выделения
    if (this.isSelected) {
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 4, this.size + 4, (this.size + 4) * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Тень под юнитом
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 6, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // Тело юнита
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Индикатор направления к цели
    if (this.targetX !== null && this.targetY !== null && this.isSelected) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.targetX, this.targetY);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.targetX, this.targetY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
    }

    ctx.restore();
  }
}