<template>
  <div class="game-root">
    <canvas
        ref="canvasRef"
        class="game-canvas"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @contextmenu.prevent
    ></canvas>

    <div class="hud">
      <div>Камера: {{ Math.round(camera.x) }}, {{ Math.round(camera.y) }}</div>
      <div>Юнит: {{ selectedUnit ? `#${selectedUnit.id} (${selectedUnit.type})` : 'нет' }}</div>
      <div>FPS: {{ fps }}</div>
      <div class="hint">WASD / стрелки / край экрана — движение камеры. ЛКМ — выбрать. ПКМ — приказ идти.</div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, reactive, ref } from 'vue';

import { world } from '../game/world.js';
import { render } from '../game/render.js';
import { createCamera, updateCamera } from '../game/camera.js';
import { screenToWorld } from '../game/iso.js';
import { UNIT_SELECT_RADIUS } from '../game/constants.js';

const canvasRef = ref(null);
const camera = reactive(createCamera());

const selectedUnit = ref(null);
const fps = ref(0);

let ctx = null;
let canvasW = 0;
let canvasH = 0;
let rafId = null;
let lastTime = 0;

// Состояние мыши
const keys = new Set();
const mouse = { x: 0, y: 0, inside: false };

// ---------- Инициализация сцены ----------
function initScene() {
  world.reset();
  world.spawnUnit(0, 0, '#e0b050');
  world.spawnUnit(-3, 2, '#4f88c0');
  world.spawnUnit(4, -2, '#c05050');
  world.spawnUnit(2, 3, '#50b060');
}

function update(dt) {
  updateCamera(camera, dt, keys, mouse, canvasW, canvasH);
  world.update(dt);
}

let fpsAccum = 0;
let fpsFrames = 0;
function loop(t) {
  if (!lastTime) lastTime = t;
  const dt = Math.min((t - lastTime) / 1000, 0.1);
  lastTime = t;

  update(dt);
  render(ctx, camera, canvasW, canvasH, world.units);

  // FPS
  fpsAccum += dt;
  fpsFrames++;
  if (fpsAccum >= 0.5) {
    fps.value = Math.round(fpsFrames / fpsAccum);
    fpsAccum = 0;
    fpsFrames = 0;
  }

  rafId = requestAnimationFrame(loop);
}

// ---------- Ввод ----------
function getMousePos(e) {
  const rect = canvasRef.value.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onMouseDown(e) {
  const p = getMousePos(e);
  const w = screenToWorld(p.x, p.y, camera, canvasW, canvasH);

  if (e.button === 0) {
    // Выбор
    const picked = world.pickUnitAt(w.x, w.y, UNIT_SELECT_RADIUS);
    world.clearSelection();
    if (picked) {
      picked.selected = true;
      selectedUnit.value = picked;
    } else {
      selectedUnit.value = null;
    }
  } else if (e.button === 2) {
    // Приказ идти
    if (selectedUnit.value) {
      selectedUnit.value.setTarget(w.x, w.y);
    }
  }
}

function onMouseMove(e) {
  const p = getMousePos(e);
  mouse.x = p.x;
  mouse.y = p.y;
  mouse.inside = true;
}

function onKeyDown(e) {
  keys.add(e.code);
}
function onKeyUp(e) {
  keys.delete(e.code);
}
function onBlur() {
  keys.clear();
}
function onMouseLeave() {
  mouse.inside = false;
}

// ---------- Resize ----------
function resize() {
  const canvas = canvasRef.value;
  const dpr = window.devicePixelRatio || 1;
  canvasW = canvas.clientWidth;
  canvasH = canvas.clientHeight;
  canvas.width = Math.round(canvasW * dpr);
  canvas.height = Math.round(canvasH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d');
  resize();
  initScene();

  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvasRef.value.addEventListener('mouseleave', onMouseLeave);

  rafId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('blur', onBlur);
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('mouseleave', onMouseLeave);
  }
});
</script>

<style scoped>
.game-root {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #111;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.hud {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.55);
  color: #eee;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  border-radius: 8px;
  line-height: 1.5;
  pointer-events: none;
  user-select: none;
}

.hint {
  margin-top: 6px;
  color: #aaa;
  max-width: 320px;
}
</style>
