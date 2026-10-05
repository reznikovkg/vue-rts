export class Unit {
    constructor({ id, x, y, speed = 80, radius = 14, color = '#e0b050' }) {
        this.id = id;
        this.x = x; //координаты
        this.y = y;
        this.speed = speed;
        this.radius = radius;
        this.color = color;
        this.targetX = x;
        this.targetY = y;
        this.moving = false;
        this.type = 'villager';
        this.selected = false;
    }

    setTarget(x, y) {// куда идти
        this.targetX = x;
        this.targetY = y;
        this.moving = true;
    }

    update(dt) {
        if (!this.moving) return;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.moving = false;
            return;
        }
        const step = this.speed * dt;
        if (step >= dist) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.moving = false;
        } else {
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }
    }
}