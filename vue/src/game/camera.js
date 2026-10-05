import { CAMERA_EDGE_SPEED, EDGE_MARGIN } from './constants.js';

export function createCamera() {
    return { x: 0, y: 0 };
}

export function updateCamera(camera, dt, keys, mouse, canvasW, canvasH) {
    let dx = 0, dy = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;

    if (mouse.inside) {
        if (mouse.x < EDGE_MARGIN) dx -= 1;
        if (mouse.x > canvasW - EDGE_MARGIN) dx += 1;
        if (mouse.y < EDGE_MARGIN) dy -= 1;
        if (mouse.y > canvasH - EDGE_MARGIN) dy += 1;
    }

    if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        camera.x += (dx / len) * CAMERA_EDGE_SPEED * dt;
        camera.y += (dy / len) * CAMERA_EDGE_SPEED * dt;
    }
}
