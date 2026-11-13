import {
  MAP_SIZE,
  UNIT_RADIUS,
  TERRAIN_TYPES,
  MOVEMENT_TYPES,
  ATTACK_RANGE,
} from '@/config/game';
import { getTerrainAt } from '@/utils/terrain';

const CELL = UNIT_RADIUS;
const GRID_LIMIT = Math.floor((MAP_SIZE / 2 - UNIT_RADIUS) / CELL);

// Сколько сторон цели может занять группа атакующих юнитов
export const ATTACK_SLOTS = 8;
// Минимальный шаг между точками вокруг цели, чтобы юниты не встали друг на друга
const ATTACK_MIN_GAP = UNIT_RADIUS * 2 + 6;

// Координаты моста в мировых координатах
const BRIDGE_START = { x: -170, y: -170 };
const BRIDGE_END = { x: 75, y: -172 };
const BRIDGE_WIDTH = 23;

// Проверяем, находится ли точка на мосту
const isBridgeAt = (x, y) => {
  const dx = BRIDGE_END.x - BRIDGE_START.x;
  const dy = BRIDGE_END.y - BRIDGE_START.y;

  const lengthSquared = dx * dx + dy * dy;

  const t = Math.max(
    0,
    Math.min(
      1,
      ((x - BRIDGE_START.x) * dx + (y - BRIDGE_START.y) * dy) / lengthSquared
    )
  );

  const closestX = BRIDGE_START.x + t * dx;
  const closestY = BRIDGE_START.y + t * dy;

  return Math.hypot(x - closestX, y - closestY) <= BRIDGE_WIDTH;
};

// Проверяем доступность местности для конкретного юнита
const canMoveOnTerrain = (x, y, movementType) => {
  const terrain = getTerrainAt(x, y);

  if (movementType === MOVEMENT_TYPES.WATER) {
    return terrain === TERRAIN_TYPES.WATER;
  }

  return terrain === TERRAIN_TYPES.LAND || isBridgeAt(x, y);
};

const cellBlocked = (cx, cy, buildings, movementType) => {
  if (Math.abs(cx) > GRID_LIMIT || Math.abs(cy) > GRID_LIMIT) return true;

  const wx = cx * CELL;
  const wy = cy * CELL;

  if (!canMoveOnTerrain(wx, wy, movementType)) return true;

  return buildings.some((b) => {
    const width = b.width ?? b.size;
    const height = b.height ?? b.size;

    const halfWidth = width / 2 + UNIT_RADIUS;
    const halfHeight = height / 2 + UNIT_RADIUS;

    return (
      wx >= b.position.x - halfWidth &&
      wx <= b.position.x + halfWidth &&
      wy >= b.position.y - halfHeight &&
      wy <= b.position.y + halfHeight
    );
  });
};

const nearestFreeCell = (cx, cy, buildings, movementType) => {
  if (!cellBlocked(cx, cy, buildings, movementType)) {
    return { x: cx, y: cy };
  }

  for (let r = 1; r <= 6; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;

        if (!cellBlocked(cx + dx, cy + dy, buildings, movementType)) {
          return { x: cx + dx, y: cy + dy };
        }
      }
    }
  }

  return null;
};

const astar = (sx, sy, ex, ey, buildings, movementType) => {
  const sc = nearestFreeCell(
    Math.round(sx / CELL),
    Math.round(sy / CELL),
    buildings,
    movementType
  );

  const ec = nearestFreeCell(
    Math.round(ex / CELL),
    Math.round(ey / CELL),
    buildings,
    movementType
  );

  if (!sc || !ec) return null;

  if (sc.x === ec.x && sc.y === ec.y) {
    return [{ x: ex, y: ey }];
  }

  const key = (x, y) => x + ',' + y;

  const open = [{ x: sc.x, y: sc.y, f: 0 }];
  const came = new Map();
  const g = new Map([[key(sc.x, sc.y), 0]]);

  const dirs = [
    [0, -1, 1],
    [0, 1, 1],
    [-1, 0, 1],
    [1, 0, 1],
    [-1, -1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [1, 1, 1.414],
  ];

  let iter = 0;

  while (open.length && iter < 20000) {
    iter++;

    let bi = 0;

    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bi].f) bi = i;
    }

    const cur = open.splice(bi, 1)[0];

    if (cur.x === ec.x && cur.y === ec.y) {
      const raw = [];
      let ck = key(cur.x, cur.y);
      let node = { x: cur.x, y: cur.y };

      while (came.has(ck)) {
        raw.unshift({ x: node.x * CELL, y: node.y * CELL });

        node = came.get(ck);
        ck = key(node.x, node.y);
      }

      raw.push({ x: ex, y: ey });

      return raw;
    }

    for (const [dx, dy, cost] of dirs) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;

      if (cellBlocked(nx, ny, buildings, movementType)) continue;

      // Не разрешаем проходить по диагонали через углы препятствий
      if (dx !== 0 && dy !== 0) {
        if (
          cellBlocked(cur.x + dx, cur.y, buildings, movementType) ||
          cellBlocked(cur.x, cur.y + dy, buildings, movementType)
        ) {
          continue;
        }
      }

      const nk = key(nx, ny);
      const tg = g.get(key(cur.x, cur.y)) + cost;

      if (tg < (g.has(nk) ? g.get(nk) : Infinity)) {
        came.set(nk, { x: cur.x, y: cur.y });
        g.set(nk, tg);

        const h = Math.hypot(ec.x - nx, ec.y - ny);

        open.push({ x: nx, y: ny, f: tg + h });
      }
    }
  }

  return null;
};

const aabb = (b) => {
  const width = b.width ?? b.size;
  const height = b.height ?? b.size;

  return {
    left: b.position.x - width / 2,
    right: b.position.x + width / 2,
    top: b.position.y - height / 2,
    bottom: b.position.y + height / 2,
  };
};

export const collidesWithBuildings = (x, y, r, buildings) => {
  return buildings.some((b) => {
    const a = aabb(b);

    const cx = Math.max(a.left, Math.min(x, a.right));
    const cy = Math.max(a.top, Math.min(y, a.bottom));

    const dx = x - cx;
    const dy = y - cy;

    return dx * dx + dy * dy < r * r;
  });
};

const hasLineOfSight = (
  x1,
  y1,
  x2,
  y2,
  buildings,
  radius,
  movementType
) => {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / (radius / 2)));

  for (let i = 1; i < steps; i++) {
    const t = i / steps;

    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;

    if (collidesWithBuildings(x, y, radius, buildings)) return false;
    if (!canMoveOnTerrain(x, y, movementType)) return false;
  }

  return true;
};

const smoothPath = (start, raw, buildings, radius, movementType) => {
  if (!raw || raw.length === 0) return [];

  const points = [start, ...raw];
  const result = [];

  let anchor = 0;

  while (anchor < points.length - 1) {
    let far = anchor + 1;

    for (let j = points.length - 1; j > anchor + 1; j--) {
      if (
        hasLineOfSight(
          points[anchor].x,
          points[anchor].y,
          points[j].x,
          points[j].y,
          buildings,
          radius,
          movementType
        )
      ) {
        far = j;
        break;
      }
    }

    result.push(points[far]);
    anchor = far;
  }

  return result;
};

export const buildPath = (
  start,
  target,
  buildings,
  radius = UNIT_RADIUS,
  movementType = MOVEMENT_TYPES.LAND
) => {
  if (!canMoveOnTerrain(target.x, target.y, movementType)) {
    return [];
  }

  if (
    hasLineOfSight(
      start.x,
      start.y,
      target.x,
      target.y,
      buildings,
      radius,
      movementType
    )
  ) {
    return [{ x: target.x, y: target.y }];
  }

  const raw = astar(
    start.x,
    start.y,
    target.x,
    target.y,
    buildings,
    movementType
  );

  if (!raw) return [];

  return smoothPath(start, raw, buildings, radius, movementType);
};

// Путь к цели атаки.
// Вокруг цели строится кольцо из слотов (точек, откуда юнит достаёт цель),
// каждый юнит занимает свою сторону: занятые слоты передаются в occupied.
// Возвращает { path, slot }, где slot — занятая юнитом сторона цели.
export const buildAttackPath = (
  start,
  target,
  buildings,
  movementType,
  targetType,
  options = {}
) => {
  const requestedSlots = Math.max(1, Math.floor(options.slots ?? ATTACK_SLOTS));
  const occupied = options.occupied ?? [];

  const width =
    targetType === "unit"
      ? UNIT_RADIUS * 2
      : target.width ?? target.size;

  const height =
    targetType === "unit"
      ? UNIT_RADIUS * 2
      : target.height ?? target.size;

  // Кольцо точек вокруг цели строго на дистанции атаки:
  // дальше — юнит не достанет цель, ближе — упрётся в саму цель
  const halfWidth = width / 2 + ATTACK_RANGE;
  const halfHeight = height / 2 + ATTACK_RANGE;

  // Сколько точек помещается вокруг цели, чтобы юниты не встали друг на друга
  const perimeter = Math.PI * (halfWidth + halfHeight);
  const capacity = Math.max(1, Math.floor(perimeter / ATTACK_MIN_GAP));
  const slotCount = Math.min(requestedSlots, capacity);

  // Направление от цели на юнита: с этой стороны начинаем искать свободный слот
  const naturalAngle = Math.atan2(
    (start.y - target.position.y) / halfHeight,
    (start.x - target.position.x) / halfWidth
  );

  const slots = [];

  for (let slot = 0; slot < slotCount; slot++) {
    const angle = (slot / slotCount) * Math.PI * 2;

    slots.push({
      slot,
      angle,
      delta: Math.abs(
        Math.atan2(
          Math.sin(angle - naturalAngle),
          Math.cos(angle - naturalAngle)
        )
      ),
    });
  }

  // Ближайшие по направлению стороны цели проверяем первыми
  slots.sort((a, b) => a.delta - b.delta);

  let fallback = null;

  for (const candidate of slots) {
    const point = {
      x: target.position.x + Math.cos(candidate.angle) * halfWidth,
      y: target.position.y + Math.sin(candidate.angle) * halfHeight,
    };

    const path = buildPath(
      start,
      point,
      buildings,
      UNIT_RADIUS,
      movementType
    );

    if (path.length === 0) continue;

    if (!occupied.includes(candidate.slot)) {
      return { path, slot: candidate.slot };
    }

    // Все стороны заняты — запоминаем самый короткий путь как запасной вариант
    if (!fallback) {
      fallback = { path, slot: candidate.slot };
    }
  }

  return fallback ?? { path: [], slot: null };
};