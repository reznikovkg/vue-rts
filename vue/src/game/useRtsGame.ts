import { computed, reactive, ref } from 'vue';
import { isoToWorld, worldToIso, TILE_H, TILE_W, type Vec2 } from './iso';
import { createBuilding, createUnit, type Entity, type Unit, type Building } from './entities';
import { findPath } from './pathfinding';

export const useRtsGame = () => {
  // ===== Состояние =====
  const cameraX = ref(0);
  const cameraY = ref(0);
  const zoom = ref(1);
  const MIN_ZOOM = 0.35;
  const MAX_ZOOM = 2.5;

  const viewportW = ref(0);
  const viewportH = ref(0);

  const entities = reactive<Entity[]>([]);

  interface Marker { id: number; x: number; y: number; born: number }
  const markers = ref<Marker[]>([]);
  let markerSeq = 0;

  const keys: Record<string, boolean> = {};
  let isPanning = false;
  let panLastX = 0;
  let panLastY = 0;

  let rafId: number | null = null;
  let lastTime = 0;

  // ===== Координаты =====
  const screenToIso = (sx: number, sy: number): Vec2 => ({
    x: cameraX.value + (sx - viewportW.value / 2) / zoom.value,
    y: cameraY.value + (sy - viewportH.value / 2) / zoom.value,
  });

  const isoToScreen = (ix: number, iy: number): Vec2 => ({
    x: (ix - cameraX.value) * zoom.value + viewportW.value / 2,
    y: (iy - cameraY.value) * zoom.value + viewportH.value / 2,
  });

  const worldToScreen = (wx: number, wy: number): Vec2 => {
    const iso = worldToIso(wx, wy);
    return isoToScreen(iso.x, iso.y);
  };

  const screenToWorld = (sx: number, sy: number): Vec2 => {
    const iso = screenToIso(sx, sy);
    return isoToWorld(iso.x, iso.y);
  };

  // ===== Камера =====
  const panByScreen = (dx: number, dy: number) => {
    cameraX.value -= dx / zoom.value;
    cameraY.value -= dy / zoom.value;
  };

  const zoomAt = (sx: number, sy: number, factor: number) => {
    const oldZoom = zoom.value;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZoom * factor));
    if (newZoom === oldZoom) return;
    const isoBefore = screenToIso(sx, sy);
    zoom.value = newZoom;
    cameraX.value = isoBefore.x - (sx - viewportW.value / 2) / newZoom;
    cameraY.value = isoBefore.y - (sy - viewportH.value / 2) / newZoom;
  };

  const resetCamera = () => {
    cameraX.value = 0;
    cameraY.value = 0;
    zoom.value = 1;
  };

  const updateCameraFromKeys = (dt: number) => {
    const speed = (600 * dt) / zoom.value;
    if (keys['w'] || keys['arrowup']) cameraY.value -= speed;
    if (keys['s'] || keys['arrowdown']) cameraY.value += speed;
    if (keys['a'] || keys['arrowleft']) cameraX.value -= speed;
    if (keys['d'] || keys['arrowright']) cameraX.value += speed;
  };

  // ===== Хит-тест и выбор =====
  const hitTest = (ent: Entity, sx: number, sy: number): boolean => {
    const pos = worldToScreen(ent.x, ent.y);
    if (ent.kind === 'unit') {
      const bodyCY = pos.y - 17 * zoom.value;
      const r = ent.radius * zoom.value;
      return Math.hypot(sx - pos.x, sy - bodyCY) <= r;
    }
    
    const halfW = 34 * zoom.value;
    const top = pos.y - 60 * zoom.value;
    const bottom = pos.y + 16 * zoom.value;
    
    return Math.abs(sx - pos.x) <= halfW && sy >= top && sy <= bottom;
  };

  const getEntityAt = (sx: number, sy: number): Entity | null => {
    for (let i = entities.length - 1; i >= 0; i--) {
      const ent = entities[i]!;
      if (hitTest(ent, sx, sy)) return ent;
    }
    return null;
  };

  const selectAt = (sx: number, sy: number, additive = false) => {
    const hit = getEntityAt(sx, sy);
    if (!additive) for (const e of entities) e.isSelected = false;
    if (hit) hit.isSelected = additive ? !hit.isSelected : true;
  };

  // №7 Добавлена поддержка множественного выделения с зажатым Shift (параметр additive)
  const selectInBox = (sx1: number, sy1: number, sx2: number, sy2: number, additive = false) => {
    if (!additive) for (const e of entities) e.isSelected = false;
    const minX = Math.min(sx1, sx2);
    const maxX = Math.max(sx1, sx2);
    const minY = Math.min(sy1, sy2);
    const maxY = Math.max(sy1, sy2);

    for (const ent of entities) {
      if (ent.kind !== 'unit') continue;
      const pos = worldToScreen(ent.x, ent.y);
      const bodyCY = pos.y - 17 * zoom.value;

      if (pos.x >= minX && pos.x <= maxX && bodyCY >= minY && bodyCY <= maxY) {
        ent.isSelected = true; // Выделяем юнитов, попавших в рамку
      }
    }
  };

  //  Проверка препятствий 
  const isBlocked = (tx: number, ty: number): boolean => {
    for (const ent of entities) {
      if (ent.kind === 'building') {
        if (Math.round(ent.x) === tx && Math.round(ent.y) === ty) {
          return true;
        }
      }
    }
    return false;
  };

  //  Приказы (ПКМ) 
  // №12: Добавлен параметр useQueue (проверяет зажатие клавиши Shift на мышке)
  const commandMoveTo = (sx: number, sy: number, useQueue = false) => {
    const target = screenToWorld(sx, sy);
    const selectedUnits = entities.filter((e): e is Unit => e.kind === 'unit' && e.isSelected);
    const selectedBuildings = entities.filter((e): e is Building => e.kind === 'building' && e.isSelected);

    // Двигаем юнитов
    if (selectedUnits.length > 0) {
      selectedUnits.forEach((u, idx) => {
        let tx = target.x;
        let ty = target.y;

        // Если выделено больше одного юнита, распределяем их цели по спирали
        if (selectedUnits.length > 1) {
          const angle = idx * 2.39996; // Золотой угол
          const radius = 0.6 * Math.sqrt(idx);
          tx += Math.cos(angle) * radius;
          ty += Math.sin(angle) * radius;
        }

        if (useQueue) {
          // Если Shift зажат, добавляем приказ в конец очереди команд
          u.commandsQueue.push({ type: 'MOVE', x: tx, y: ty });
        } else {
          // Если Shift не зажат, полностью сбрасываем старую очередь и выполняем команду сразу
          u.commandsQueue = [];
          u.path = findPath(u.x, u.y, tx, ty, isBlocked);
        }
      });
    }

    // Переставляем домики (применяем тот же принцип очереди)
    if (selectedBuildings.length > 0) {
      selectedBuildings.forEach((b, idx) => {
        const a = (idx / selectedBuildings.length) * Math.PI * 2;
        const r = selectedBuildings.length > 1 ? 1.5 : 0;
        const tx = Math.round(target.x + Math.cos(a) * r);
        const ty = Math.round(target.y + Math.sin(a) * r);

        const occupied = entities.some(
          (e) => e.kind === 'building' && e.id !== b.id && Math.round(e.x) === tx && Math.round(e.y) === ty
        );

        if (!occupied) {
          if (useQueue) {
            b.commandsQueue.push({ type: 'MOVE', x: tx, y: ty });
          } else {
            b.commandsQueue = [];
            b.path = [{ x: tx, y: ty }];
          }
        }
      });
    }

    markers.value.push({ id: ++markerSeq, x: target.x, y: target.y, born: performance.now() });
  };

  // ===== Расталкивание юнитов (Soft Collision) =====
  const resolveCollisions = () => {
    const units = entities.filter((e): e is Unit => e.kind === 'unit');
    const minDist = 0.8;

    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const u1 = units[i]!;
        const u2 = units[j]!;
        const dx = u2.x - u1.x;
        const dy = u2.y - u1.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0 && dist < minDist) {
          const u1Moving = u1.path.length > 0;
          const u2Moving = u2.path.length > 0;

          let weight1 = 0.5;
          let weight2 = 0.5;

          if (u1Moving && !u2Moving) {
            weight1 = 0.1; 
            weight2 = 0.9; 
          } else if (!u1Moving && u2Moving) {
            weight1 = 0.9; 
            weight2 = 0.1; 
          }

          const totalWeight = weight1 + weight2;
          const push = (minDist - dist);
          const pushX = (dx / dist) * push;
          const pushY = (dy / dist) * push;

          u1.x -= pushX * (weight1 / totalWeight);
          u1.y -= pushY * (weight1 / totalWeight);
          u2.x += pushX * (weight2 / totalWeight);
          u2.y += pushY * (weight2 / totalWeight);
        }
      }
    }
  };

  // Обновление (Юниты и Здания)
  //№12: Добавлена логика цепочки (выполнение следующего действия по завершении текущего)
  const updateEntities = (dt: number) => {
    for (const ent of entities) {
      // Если текущий путь пуст, проверяем, есть ли отложенные команды в очереди
      if (ent.path.length === 0) {
        if (ent.commandsQueue && ent.commandsQueue.length > 0) {
          const nextCmd = ent.commandsQueue.shift()!; // Извлекаем самую первую команду из очереди
          
          if (nextCmd.type === 'MOVE') {
            if (ent.kind === 'unit') {
              // Находим путь до следующей точки
              ent.path = findPath(ent.x, ent.y, nextCmd.x, nextCmd.y, isBlocked);
            } else {
              ent.path = [{ x: nextCmd.x, y: nextCmd.y }];
            }
          }
        }
        continue;
      }

      const target = ent.path[0]!;
      const dx = target.x - ent.x;
      const dy = target.y - ent.y;
      const dist = Math.hypot(dx, dy);
      const step = ent.speed * dt;

      if (dist <= step) {
        ent.x = target.x;
        ent.y = target.y;
        ent.path.shift();
      } else {
        ent.x += (dx / dist) * step;
        ent.y += (dy / dist) * step;
      }
    }
  };

  const cleanupMarkers = () => {
    const now = performance.now();
    markers.value = markers.value.filter((m) => now - m.born < 900);
  };

  const loop = (time: number) => {
    if (!lastTime) lastTime = time;
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    updateCameraFromKeys(dt);
    updateEntities(dt);
    resolveCollisions();
    cleanupMarkers();

    rafId = requestAnimationFrame(loop);
  };

  // Ввод и Lifecycle 
  const onKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === 'Shift') {
      keys['shift'] = true;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    // Сбрасываем состояние клавиши, когда игрок её отпускает
    keys[e.key.toLowerCase()] = false;
    
    if (e.key === 'Shift') {
      keys['shift'] = false;
    }
  };

  const onBlur = () => {
    // Очищаем все зажатые клавиши, если пользователь переключился на другое окно
    for (const k in keys) keys[k] = false;
    isPanning = false;
  };

  return {
    cameraX,
    cameraY,
    zoom,
    viewportW,
    viewportH,
    entities,
    markers,
    panByScreen,
    zoomAt,
    resetCamera,
    screenToIso,
    isoToScreen,
    worldToScreen,
    screenToWorld,
    selectAt,
    selectInBox,
    commandMoveTo,
    loop,
    onKeyDown,
    onKeyUp,
    onBlur,
  };
};