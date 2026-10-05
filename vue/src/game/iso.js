import { CELL_HALF_W, CELL_HALF_H } from './constants.js';

export function cellToWorld(col, row) {
    return {
        x: (col - row) * CELL_HALF_W,
        y: (col + row) * CELL_HALF_H,
    };
}

export function worldToCell(x, y) {
    return {
        col: (x / CELL_HALF_W + y / CELL_HALF_H) / 2,
        row: (y / CELL_HALF_H - x / CELL_HALF_W) / 2,
    };
}

export function worldToScreen(x, y, camera, canvasW, canvasH) {
    return {
        sx: x - camera.x + canvasW / 2,
        sy: y - camera.y + canvasH / 2,
    };
}

export function screenToWorld(sx, sy, camera, canvasW, canvasH) {
    return {
        x: sx - canvasW / 2 + camera.x,
        y: sy - canvasH / 2 + camera.y,
    };
}