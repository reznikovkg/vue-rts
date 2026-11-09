import type { Terrain } from './terrain'

export type MoveEvent = {
    unitId: number
    x: number
    y: number
    waypoints?: { x: number; y: number }[]
    blockedTime?: number
}

export type MoveStatus = 'arrived' | 'moving' | 'blocked'

const STEP_ANGLES = [0, 1, -1, 2, -2, 3, -3].map(index => index * Math.PI / 6)

export type AttackTarget = {
    kind: 'unit' | 'object'
    id: number
}

export type AttackEvent = {
    unitId: number
    target: AttackTarget
    cooldown: number
}

export class Unit {
    id: number
    x: number
    y: number
    speed: number
    terrain: Terrain
    group: number
    selected = false

    constructor(id: number, x: number, y: number, speed: number, terrain: Terrain = 'land', group = 1) {
        this.id = id
        this.x = x
        this.y = y
        this.speed = speed
        this.terrain = terrain
        this.group = group
    }

    update(delta: number, targetX: number, targetY: number, canMove: (x: number, y: number) => boolean): MoveStatus {
        const dx = targetX - this.x
        const dy = targetY - this.y
        const distance = Math.hypot(dx, dy)
        const step = this.speed * delta

        if (distance <= step && canMove(targetX, targetY)) {
            this.x = targetX
            this.y = targetY
            return 'arrived'
        }
        if (distance === 0) return 'arrived'

        const length = Math.min(step, distance)
        for (const angle of STEP_ANGLES) {
            const cos = Math.cos(angle)
            const sin = Math.sin(angle)
            const nextX = this.x + (dx * cos - dy * sin) / distance * length
            const nextY = this.y + (dx * sin + dy * cos) / distance * length
            if (canMove(nextX, nextY)) {
                this.x = nextX
                this.y = nextY
                return 'moving'
            }
        }
        return 'blocked'
    }

    maxHealth = 100
    health = 100
    power = 12
    attackSpeed = 1
}
