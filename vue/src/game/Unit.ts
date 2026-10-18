export class Unit {
    x: number
    y: number
    speed: number
    selected = false
    targetX: number
    targetY: number

    constructor(x: number, y: number, speed: number) {
        this.x = x
        this.y = y
        this.speed = speed
        this.targetX = x
        this.targetY = y
    }

    moveTo(x: number, y: number) {
        this.targetX = x
        this.targetY = y
    }

    update(delta: number) {
        const dx = this.targetX - this.x
        const dy = this.targetY - this.y
        const distance = Math.hypot(dx, dy)
        const step = this.speed * delta

        if (distance <= step) {
            this.x = this.targetX
            this.y = this.targetY
        } else {
            this.x += dx / distance * step
            this.y += dy / distance * step
        }
    }
}
