<template>
  <div class="game-field">
    <div class="game-field__hint">
      Камера: зажать ЛКМ на пустом месте и тянуть, либо подвести курсор к краю экрана (стрелки / WASD тоже работают).
      ЛКМ по юниту — выбрать. ПКМ по полю — отправить выбранного юнита в точку.
    </div>

    <div
      class="game-field__viewport"
      ref="viewportRef"
      @mousedown.left="onPanStart"
      @mousemove="onViewportMove"
      @mouseleave="onViewportLeave"
    >
      <div
        class="game-field__map"
        ref="fieldRef"
        :style="fieldStyle"
        @click.left="onFieldClick"
        @contextmenu.prevent="onFieldRightClick"
      >
        <GameCell
          v-for="cell in cells"
          :key="'cell-' + cell.x + '-' + cell.y"
          :cell="cell"
          :cell-size="cellSize"
          :offset-x="offsetX"
        />

        <GameObject
          v-for="obj in gameObjects"
          :key="obj.id"
          :obj="obj"
          :cell-size="cellSize"
          :offset-x="offsetX"
          :is-selected="obj.id === selectedObjectId"
          @select="(selected) => onObjectSelect(selected)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import GameCell from './GameCell.vue';
import GameObject from './GameObject.vue';
import { screenToWorld } from '../../utils/isometric';

const store = useStore();

// Все данные лежат в сторе, компонент только показывает их и отправляет действия
const cellSize = computed(() => store.state.game.cellSize);
const cells = computed(() => store.getters['game/cells']);
const gameObjects = computed(() => store.state.game.gameObjects);
const selectedObjectId = computed(() => store.state.game.selectedObjectId);
const camera = computed(() => store.state.game.camera);
const offsetX = computed(() => store.getters['game/fieldOffsetX']);

const fieldRef = ref<HTMLElement | null>(null);
const viewportRef = ref<HTMLElement | null>(null);

const fieldStyle = computed(() => ({
  width: store.getters['game/fieldWidth'] + 'px',
  height: store.getters['game/fieldHeight'] + 'px',
  transform: `translate(${-camera.value.x}px, ${-camera.value.y}px)`,
}));

// ---------- выбор и приказ ----------
const onObjectSelect = (obj: any) => {
  store.dispatch('game/selectObject', obj);
};

const onFieldClick = () => {
  // после перетаскивания карты клик не должен снимать выделение
  if (panMoved) {
    return;
  }
  store.dispatch('game/deselectAll');
};

const onFieldRightClick = (event: MouseEvent) => {
  if (selectedObjectId.value === null) {
    return;
  }

  // getBoundingClientRect уже учитывает сдвиг камеры (transform)
  const rect = fieldRef.value!.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;

  // переводим точку экрана обратно в плоские мировые координаты
  const world = screenToWorld(screenX, screenY, offsetX.value);
  store.dispatch('game/orderMove', { x: world.x, y: world.y });
};

// ---------- ввод для камеры (это интерфейс, поэтому живёт в компоненте) ----------
const CAMERA_SPEED = 500; // пикселей экрана в секунду
const EDGE_SIZE = 20; // ширина зоны у края, где камера едет сама

let panning = false;
let panMoved = false;
let panDistance = 0;
let lastX = 0;
let lastY = 0;
let panDx = 0; // сдвиг от перетаскивания, накопленный между кадрами
let panDy = 0;

const edge = { x: 0, y: 0 };
const pressedKeys = new Set<string>();

const onPanStart = (e: MouseEvent) => {
  panning = true;
  panMoved = false;
  panDistance = 0;
  lastX = e.clientX;
  lastY = e.clientY;
};

const onWindowMouseMove = (e: MouseEvent) => {
  if (!panning) {
    return;
  }

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  panDistance += Math.abs(dx) + Math.abs(dy);
  // маленькое дрожание руки при обычном клике не считаем перетаскиванием
  if (panDistance > 5) {
    panMoved = true;
  }

  if (panMoved) {
    // карта "едет" за курсором, поэтому камера двигается в обратную сторону
    panDx -= dx;
    panDy -= dy;
  }
};

const onWindowMouseUp = () => {
  panning = false;
};

// подвод курсора к краю области - камера плавно едет в эту сторону
const onViewportMove = (e: MouseEvent) => {
  const rect = viewportRef.value!.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  edge.x = x < EDGE_SIZE ? -1 : x > rect.width - EDGE_SIZE ? 1 : 0;
  edge.y = y < EDGE_SIZE ? -1 : y > rect.height - EDGE_SIZE ? 1 : 0;
};

const onViewportLeave = () => {
  edge.x = 0;
  edge.y = 0;
};

const onKeyDown = (e: KeyboardEvent) => {
  pressedKeys.add(e.key.toLowerCase());
};
const onKeyUp = (e: KeyboardEvent) => {
  pressedKeys.delete(e.key.toLowerCase());
};

// Собираем все источники (мышь, край экрана, клавиши) в один сдвиг камеры.
// В стор уходит только готовое число dx, dy - стор про клавиши ничего не знает.
const getCameraDelta = (deltaTime: number) => {
  const distance = CAMERA_SPEED * deltaTime;

  // во время перетаскивания край экрана камеру не двигает
  let dx = panning ? 0 : edge.x * distance;
  let dy = panning ? 0 : edge.y * distance;

  if (pressedKeys.has('arrowup') || pressedKeys.has('w')) {
    dy -= distance;
  }
  if (pressedKeys.has('arrowdown') || pressedKeys.has('s')) {
    dy += distance;
  }
  if (pressedKeys.has('arrowleft') || pressedKeys.has('a')) {
    dx -= distance;
  }
  if (pressedKeys.has('arrowright') || pressedKeys.has('d')) {
    dx += distance;
  }

  dx += panDx;
  dy += panDy;
  panDx = 0;
  panDy = 0;

  return { dx, dy };
};

// ---------- игровой цикл ----------
let lastTime = 0;
let animationFrameId = 0;

const gameLoop = (time: number) => {
  const deltaTime = lastTime === 0 ? 0 : (time - lastTime) / 1000;
  lastTime = time;

  store.dispatch('game/tick', { cameraDelta: getCameraDelta(deltaTime), deltaTime });

  animationFrameId = requestAnimationFrame(gameLoop);
};

// ---------- размер видимой области ----------
let resizeObserver: ResizeObserver | null = null;
let firstResize = true;

const updateViewport = () => {
  const el = viewportRef.value;
  if (!el) {
    return;
  }
  store.dispatch('game/setViewport', { width: el.clientWidth, height: el.clientHeight });
  if (firstResize) {
    firstResize = false;
    store.dispatch('game/centerCamera');
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', onWindowMouseUp);

  resizeObserver = new ResizeObserver(updateViewport);
  resizeObserver.observe(viewportRef.value!);
  updateViewport();

  animationFrameId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', onWindowMouseUp);
  resizeObserver?.disconnect();
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped lang="scss">
.game-field {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #0b1220;
  user-select: none;

  &__hint {
    flex: none;
    color: #e5e7eb;
    font-family: sans-serif;
    font-size: 13px;
    padding: 8px 16px;
    background: #111827;
  }

  &__viewport {
    position: relative;
    flex: 1;
    overflow: hidden;
    cursor: grab;
  }

  &__map {
    position: absolute;
    left: 0;
    top: 0;
  }
}
</style>
