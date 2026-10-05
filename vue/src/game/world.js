import { Unit } from './unit.js';
import { cellToWorld } from './iso.js';

export const world = {
    units: [],
    nextUnitId: 1,

    reset() {
        this.units.length = 0;
        this.nextUnitId = 1;
    },

    spawnUnit(col, row, color) {
        const { x, y } = cellToWorld(col, row);
        const u = new Unit({ id: this.nextUnitId++, x, y, color });
        this.units.push(u);
        return u;
    },

    update(dt) {
        for (const u of this.units) u.update(dt);
    },

    pickUnitAt(x, y, radius) {
        let best = null, bestDist = Infinity;
        for (const u of this.units) {
            const d = Math.hypot(u.x - x, u.y - y);
            if (d <= Math.max(radius, u.radius) && d < bestDist) {
                best = u; bestDist = d;
            }
        }
        return best;
    },

    clearSelection() {
        for (const u of this.units) u.selected = false;
    },
};
