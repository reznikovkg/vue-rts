import { CELL_HALF_W, CELL_HALF_H } from './constants.js';
import { cellToWorld, worldToCell, worldToScreen, screenToWorld } from './iso.js';

function drawCell(ctx, sx, sy, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(sx, sy - CELL_HALF_H);
    ctx.lineTo(sx + CELL_HALF_W, sy);
    ctx.lineTo(sx, sy + CELL_HALF_H);
    ctx.lineTo(sx - CELL_HALF_W, sy);
    ctx.closePath();
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

export function drawGrid(ctx, camera, canvasW, canvasH) {
    const corners = [
        screenToWorld(0, 0, camera, canvasW, canvasH),
        screenToWorld(canvasW, 0, camera, canvasW, canvasH),
        screenToWorld(0, canvasH, camera, canvasW, canvasH),
        screenToWorld(canvasW, canvasH, camera, canvasW, canvasH),
    ];

    let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
    for (const c of corners) {
        const t = worldToCell(c.x, c.y);
        minCol = Math.min(minCol, t.col);
        maxCol = Math.max(maxCol, t.col);
        minRow = Math.min(minRow, t.row);
        maxRow = Math.max(maxRow, t.row);
    }

    const pad = 3;
    minCol = Math.floor(minCol) - pad;
    maxCol = Math.ceil(maxCol) + pad;
    minRow = Math.floor(minRow) - pad;
    maxRow = Math.ceil(maxRow) + pad;

    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            const { x, y } = cellToWorld(col, row);
            const { sx, sy } = worldToScreen(x, y, camera, canvasW, canvasH);

            const stroke = 'rgba(0,0,0,0.25)';
            drawCell(ctx, sx, sy, null, stroke);
        }
    }
}

export function drawUnit(ctx, u, camera, canvasW, canvasH) {
    const { sx, sy } = worldToScreen(u.x, u.y, camera, canvasW, canvasH);

    ctx.beginPath();
    ctx.arc(sx, sy, u.radius, 0, Math.PI * 2);
    ctx.fillStyle = u.color;
    ctx.fill();
    ctx.strokeStyle = u.selected ? '#fff' : 'rgba(0,0,0,0.5)';
    ctx.lineWidth = u.selected ? 3 : 1.5;
    ctx.stroke();

    if (u.selected && u.moving) {
        const t = worldToScreen(u.targetX, u.targetY, camera, canvasW, canvasH);
        ctx.beginPath();
        ctx.arc(t.sx, t.sy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffe066';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(t.sx, t.sy);
        ctx.strokeStyle = 'rgba(255,224,102,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

export function render(ctx, camera, canvasW, canvasH, units) {
    ctx.fillStyle = '#4a7a44';
    ctx.fillRect(0, 0, canvasW, canvasH);
    drawGrid(ctx, camera, canvasW, canvasH);
    for (const u of units) drawUnit(ctx, u, camera, canvasW, canvasH);
}

