<template>
  <div class="game-page">
    <div class="hint">
      Стрелки / WASD — двигать камеру. ЛКМ по юниту — выбрать. ПКМ по полю — отправить выбранного юнита в точку.
    </div>

    <div class="viewport" ref="viewportRef">
      <div
        class="field"
        ref="fieldRef"
        :style="fieldStyle"
        @click.left="onFieldClick"
        @contextmenu.prevent="onFieldRightClick"
      >
        <!-- Клетки игрового поля (сетка) -->
        <div
          v-for="cell in cells"
          :key="'cell-' + cell.x + '-' + cell.y"
          class="cell"
          :class="{ 'cell--dark': (cell.x + cell.y) % 2 === 0 }"
          :style="getCellStyle(cell)"
        ></div>

        <!-- Игровые объекты: персонажи и здания -->
        <div
          v-for="obj in gameObjects"
          :key="obj.id"
          class="game-object"
          :class="[
            'game-object--' + obj.type,
            { 'game-object--selected': obj.id === selectedObjectId }
          ]"
          :style="getObjectStyle(obj)"
          @click.left.stop="onObjectClick(obj)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';

// ======================================================
// НАСТРОЙКИ ПОЛЯ
// ======================================================
// Размер одной клетки сетки в пикселях
const CELL_SIZE = 50;

// Размер поля в клетках. Поле специально сделано больше,
// чем видно на экране - для этого и нужна камера (см. ниже).
// Чтобы расширить поле - достаточно увеличить эти два числа,
// остальной код трогать не нужно (поле не "захардкожено").
const GRID_WIDTH = 30;
const GRID_HEIGHT = 30;

// ======================================================
// ТИПЫ ДАННЫХ
// ======================================================
interface Cell {
  x: number;
  y: number;
}

// Один объект на поле: персонаж или здание.
// В будущем сюда легко добавить новые поля (hp, damage, name...)
// или новые значения type, не трогая остальную логику.
interface GameObject {
  id: number;
  type: 'character' | 'building';
  x: number; // мировая координата X в пикселях
  y: number; // мировая координата Y в пикселях
  targetX: number | null; // точка, куда юнит сейчас идёт (null = никуда не идёт)
  targetY: number | null;
  speed: number; // пикселей в секунду - у разных юнитов может быть разная скорость
  color: string;
}

// ======================================================
// СТРОИМ СЕТКУ ПОЛЯ (два вложенных цикла - строим Array из Object)
// ======================================================
const cells: Cell[] = [];
for (let y = 0; y < GRID_HEIGHT; y++) {
  for (let x = 0; x < GRID_WIDTH; x++) {
    cells.push({ x: x, y: y });
  }
}

function getCellStyle(cell: Cell) {
  return {
    position: 'absolute' as const,
    left: cell.x * CELL_SIZE + 'px',
    top: cell.y * CELL_SIZE + 'px',
    width: CELL_SIZE + 'px',
    height: CELL_SIZE + 'px',
  };
}

// ======================================================
// ИГРОВЫЕ ОБЪЕКТЫ (персонажи и здания)
// ======================================================
// reactive - удобно для массива объектов, которые постоянно
// меняются сами по себе (двигаются каждый кадр)
const gameObjects = reactive<GameObject[]>([
  { id: 1, type: 'character', x: 100, y: 100, targetX: null, targetY: null, speed: 120, color: '#4ade80' },
  { id: 2, type: 'character', x: 200, y: 150, targetX: null, targetY: null, speed: 80,  color: '#60a5fa' },
  { id: 3, type: 'character', x: 150, y: 250, targetX: null, targetY: null, speed: 150, color: '#f87171' },
  // здание - у него никогда не задаётся targetX/targetY, поэтому оно просто не двигается
  { id: 4, type: 'building',  x: 400, y: 300, targetX: null, targetY: null, speed: 0,   color: '#a78bfa' },
]);

function getObjectStyle(obj: GameObject) {
  const size = obj.type === 'building' ? CELL_SIZE * 1.4 : CELL_SIZE * 0.6;
  return {
    position: 'absolute' as const,
    left: obj.x - size / 2 + 'px',
    top: obj.y - size / 2 + 'px',
    width: size + 'px',
    height: size + 'px',
    backgroundColor: obj.color,
  };
}

// ======================================================
// ВЫБОР ЮНИТА (ЛКМ)
// ======================================================
const selectedObjectId = ref<number | null>(null);

function onObjectClick(obj: GameObject) {
  // здания выбирать не даём - двигать их всё равно некуда
  if (obj.type === 'building') return;
  selectedObjectId.value = obj.id;
}

function onFieldClick() {
  // клик по пустому полю - снимаем выбор
  selectedObjectId.value = null;
}

// ======================================================
// ПРИКАЗ НА ДВИЖЕНИЕ (ПКМ)
// ======================================================
const fieldRef = ref<HTMLElement | null>(null);
const viewportRef = ref<HTMLElement | null>(null);

function onFieldRightClick(event: MouseEvent) {
  if (selectedObjectId.value === null) return;

  const selected = gameObjects.find((o) => o.id === selectedObjectId.value);
  if (!selected || selected.type === 'building') return;

  // getBoundingClientRect() уже учитывает смещение камеры (transform),
  // поэтому координаты клика относительно поля = мировые координаты объекта
  const rect = fieldRef.value!.getBoundingClientRect();
  const worldX = event.clientX - rect.left;
  const worldY = event.clientY - rect.top;

  selected.targetX = worldX;
  selected.targetY = worldY;
}

// ======================================================
// КАМЕРА (стрелки / WASD)
// ======================================================
const camera = reactive({ x: 0, y: 0 });
const CAMERA_SPEED = 400; // пикселей в секунду

const pressedKeys = new Set<string>();

function onKeyDown(e: KeyboardEvent) {
  pressedKeys.add(e.key.toLowerCase());
}
function onKeyUp(e: KeyboardEvent) {
  pressedKeys.delete(e.key.toLowerCase());
}

const fieldStyle = computed(() => ({
  position: 'absolute' as const,
  width: GRID_WIDTH * CELL_SIZE + 'px',
  height: GRID_HEIGHT * CELL_SIZE + 'px',
  transform: `translate(${-camera.x}px, ${-camera.y}px)`,
}));

// ======================================================
// ИГРОВОЙ ЦИКЛ (requestAnimationFrame)
// Каждый кадр: двигаем камеру + двигаем все объекты к их целям
// ======================================================
let lastTime = 0;
let animationFrameId = 0;

function gameLoop(time: number) {
  const deltaTime = lastTime === 0 ? 0 : (time - lastTime) / 1000; // в секундах
  lastTime = time;

  moveCamera(deltaTime);
  moveObjects(deltaTime);

  animationFrameId = requestAnimationFrame(gameLoop);
}

function moveCamera(deltaTime: number) {
  const distance = CAMERA_SPEED * deltaTime;

  if (pressedKeys.has('arrowup') || pressedKeys.has('w')) camera.y -= distance;
  if (pressedKeys.has('arrowdown') || pressedKeys.has('s')) camera.y += distance;
  if (pressedKeys.has('arrowleft') || pressedKeys.has('a')) camera.x -= distance;
  if (pressedKeys.has('arrowright') || pressedKeys.has('d')) camera.x += distance;
}

function moveObjects(deltaTime: number) {
  for (const obj of gameObjects) {
    if (obj.targetX === null || obj.targetY === null) continue;

    // то же самое dx/dy/distance, что мы считали раньше вручную в консоли
    const dx = obj.targetX - obj.x;
    const dy = obj.targetY - obj.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const step = obj.speed * deltaTime;

    if (step >= distance) {
      // дошли до цели (или шаг больше оставшегося расстояния) - ставим точно в точку
      obj.x = obj.targetX;
      obj.y = obj.targetY;
      obj.targetX = null;
      obj.targetY = null;
    } else {
      // двигаем на маленький шаг в направлении цели (нормализованный вектор * шаг)
      obj.x += (dx / distance) * step;
      obj.y += (dy / distance) * step;
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  animationFrameId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.game-page {
  width: 100%;
  height: 100vh;
  background: #111827;
  overflow: hidden;
}

.hint {
  color: #e5e7eb;
  font-family: sans-serif;
  padding: 10px 16px;
  font-size: 14px;
}

.viewport {
  position: relative;
  width: 100%;
  height: calc(100vh - 40px);
  overflow: hidden;
}

.field {
  background: #1f2937;
}

.cell {
  box-sizing: border-box;
  border: 1px solid #374151;
}

.cell--dark {
  background: #263142;
}

.game-object {
  border-radius: 6px;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.game-object--character {
  border-radius: 50%;
}

.game-object--building {
  border-radius: 4px;
}

.game-object--selected {
  box-shadow: 0 0 0 3px #fde047;
}
</style>
