<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { RtsEngine } from '../../game/RtsEngine';
import { Unit } from '../../game/entities';

const canvasRef = ref(null);
let engine = null;

const camX = ref(0);
const camY = ref(0);
const zoomVal = ref(1);
let hudInterval = null;

const resizeCanvas = () => {
  if (!canvasRef.value) return;
  canvasRef.value.width = canvasRef.value.parentElement?.clientWidth || window.innerWidth;
  canvasRef.value.height = (canvasRef.value.parentElement?.clientHeight || window.innerHeight) - 60;
};

onMounted(() => {
  if (!canvasRef.value) return;
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  engine = new RtsEngine(canvasRef.value);
  engine.start();

  hudInterval = window.setInterval(() => {
    if (engine) {
      camX.value = Math.round(engine.cameraX);
      camY.value = Math.round(engine.cameraY);
      zoomVal.value = Math.round(engine.zoom * 100) / 100;
    }
  }, 100);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
  if (hudInterval) clearInterval(hudInterval);
  engine?.destroy();
});

const spawnUnit = () => {
  if (!engine) return;
  const newId = `unit_${Date.now()}`;
  const randX = engine.cameraX + (Math.random() - 0.5) * 200;
  const randY = engine.cameraY + (Math.random() - 0.5) * 200;
  engine.entities.push(new Unit(newId, randX, randY, '#f97316'));
};

const resetCamera = () => {
  if (!engine) return;
  engine.cameraX = 0;
  engine.cameraY = 0;
  engine.zoom = 1;
};
</script>

<template>
  <div class="rts-container">
    <header class="hud-bar">
      <div class="stats">
        <span>Камера: <strong>({{ camX }}, {{ camY }})</strong></span>
        <span>Зум: <strong>{{ zoomVal }}x</strong></span>
        <span>Сущностей: <strong>{{ engine?.entities.length ?? 0 }}</strong></span>
      </div>
      <div class="actions">
        <button @click="spawnUnit">+ Создать юнита</button>
        <button @click="resetCamera">Центр (0,0)</button>
      </div>
      <div class="hints">
        <span>ЛКМ — Выбрать</span> |
        <span>ПКМ — Приказ идти</span> |
        <span>WASD / Стрелки / Колесо — Камера</span>
      </div>
    </header>

    <div class="viewport">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<style scoped>
.rts-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
  overflow: hidden;
  user-select: none;
}

.hud-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: #1e293b;
  border-bottom: 2px solid #334155;
  font-family: monospace;
  font-size: 14px;
  height: 60px;
  box-sizing: border-box;
}

.stats span {
  margin-right: 15px;
}

.actions button {
  background: #3b82f6;
  color: #ffffff;
  border: none;
  padding: 6px 12px;
  margin-right: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.actions button:hover {
  background: #2563eb;
}

.hints {
  color: #94a3b8;
  font-size: 12px;
}

.viewport {
  flex: 1;
  position: relative;
  width: 100%;
  height: calc(100% - 60px);
}

canvas {
  display: block;
  background-color: #111827;
  cursor: crosshair;
}
</style>