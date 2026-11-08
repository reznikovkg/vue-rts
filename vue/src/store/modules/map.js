import {
  UNIT_STATS, UNIT_RADIUS, MAP_SIZE, EDGE_PADDING, GRID_STEP, BUILDING_TYPES, groupById
} from '@/config/game';
import { useIsoMath } from '@/composables/useIsoMath';

const { worldToScreen } = useIsoMath();

const LIMIT = MAP_SIZE / 2 - UNIT_RADIUS - EDGE_PADDING;
const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));

const buildingType = (type) => BUILDING_TYPES.find((b) => b.type === type);

let nextUnitId = 1;
let nextBuildingId = 1;

const unit = (tileX, tileY, group = 'group1') => ({
  id: nextUnitId++,
  position: { x: tileX * GRID_STEP, y: tileY * GRID_STEP },
  target: null,
  path: [],
  pathIndex: 0,
  targetQueue: [],
  group,
  ...UNIT_STATS,
  maxHp: UNIT_STATS.hp,
  damagedAt: null,
  screen: { x: 0, y: 0 }
});

const buildingSize = (size) => size * GRID_STEP;
const snapToGrid = (world, size) => ({
  x: (Math.floor(world.x / GRID_STEP) + size / 2) * GRID_STEP,
  y: (Math.floor(world.y / GRID_STEP) + size / 2) * GRID_STEP
});

const computeFormationSlots = (center, count) => {
  const SPACING = UNIT_RADIUS * 2 + 6;
  if (count === 1) return [{ x: center.x, y: center.y }];
  const side = Math.ceil(Math.sqrt(count));
  const offset = (side - 1) / 2;
  const slots = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / side);
    const col = i % side;
    slots.push({
      x: center.x + (col - offset) * SPACING,
      y: center.y + (row - offset) * SPACING
    });
  }
  return slots;
};

const aabb = (b) => ({
  left: b.position.x - b.size / 2,
  right: b.position.x + b.size / 2,
  top: b.position.y - b.size / 2,
  bottom: b.position.y + b.size / 2
});

const collidesWithBuildings = (x, y, r, buildings) => {
  return buildings.some((b) => {
    const a = aabb(b);
    const cx = Math.max(a.left, Math.min(x, a.right));
    const cy = Math.max(a.top, Math.min(y, a.bottom));
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy < r * r;
  });
};

const resolveCollisions = (x, y, r, buildings) => {
  let position = { x, y };
  buildings.forEach((b) => {
    const a = aabb(b);
    const cx = Math.max(a.left, Math.min(position.x, a.right));
    const cy = Math.max(a.top, Math.min(position.y, a.bottom));
    const dx = position.x - cx;
    const dy = position.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      position = { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
      return;
    }
    const dl = position.x - a.left, dr = a.right - position.x;
    const dt = position.y - a.top, db = a.bottom - position.y;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) position = { ...position, x: a.left - r };
    else if (m === dr) position = { ...position, x: a.right + r };
    else if (m === dt) position = { ...position, y: a.top - r };
    else position = { ...position, y: a.bottom + r };
  });
  return position;
};

const hasLineOfSight = (x1, y1, x2, y2, buildings, radius) => {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / (radius / 2)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (collidesWithBuildings(x, y, radius, buildings)) return false;
  }
  return true;
};

const CELL = UNIT_RADIUS;
const GRID_LIMIT = Math.floor((MAP_SIZE / 2 - UNIT_RADIUS) / CELL);

const cellBlocked = (cx, cy, buildings) => {
  if (Math.abs(cx) > GRID_LIMIT || Math.abs(cy) > GRID_LIMIT) return true;
  const wx = cx * CELL;
  const wy = cy * CELL;
  return buildings.some((b) => {
    const h = b.size / 2 + UNIT_RADIUS;
    return wx >= b.position.x - h && wx <= b.position.x + h &&
      wy >= b.position.y - h && wy <= b.position.y + h;
  });
};

const nearestFreeCell = (cx, cy, buildings) => {
  if (!cellBlocked(cx, cy, buildings)) return { x: cx, y: cy };
  for (let r = 1; r <= 6; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (!cellBlocked(cx + dx, cy + dy, buildings)) return { x: cx + dx, y: cy + dy };
      }
    }
  }
  return null;
};

const astar = (sx, sy, ex, ey, buildings) => {
  const sc = nearestFreeCell(Math.round(sx / CELL), Math.round(sy / CELL), buildings);
  const ec = nearestFreeCell(Math.round(ex / CELL), Math.round(ey / CELL), buildings);
  if (!sc || !ec) return null;
  if (sc.x === ec.x && sc.y === ec.y) return [{ x: ex, y: ey }];

  const key = (x, y) => x + ',' + y;
  const open = [{ x: sc.x, y: sc.y, f: 0 }];
  const came = new Map();
  const g = new Map([[key(sc.x, sc.y), 0]]);
  const dirs = [
    [0, -1, 1], [0, 1, 1], [-1, 0, 1], [1, 0, 1],
    [-1, -1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [1, 1, 1.414]
  ];

  let iter = 0;
  while (open.length && iter < 20000) {
    iter++;
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
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
      const nx = cur.x + dx, ny = cur.y + dy;
      if (cellBlocked(nx, ny, buildings)) continue;
      if (dx !== 0 && dy !== 0) {
        if (cellBlocked(cur.x + dx, cur.y, buildings) || cellBlocked(cur.x, cur.y + dy, buildings)) continue;
      }
      const nk = key(nx, ny);
      const tg = (g.get(key(cur.x, cur.y)) || 0) + cost;
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

const smoothPath = (start, raw, buildings, radius) => {
  if (!raw || raw.length === 0) return [];
  const points = [start, ...raw];
  const result = [];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let far = anchor + 1;
    for (let j = points.length - 1; j > anchor + 1; j--) {
      if (hasLineOfSight(points[anchor].x, points[anchor].y, points[j].x, points[j].y, buildings, radius)) {
        far = j;
        break;
      }
    }
    result.push(points[far]);
    anchor = far;
  }
  return result;
};

const buildPath = (start, target, buildings, radius) => {
  if (hasLineOfSight(start.x, start.y, target.x, target.y, buildings, radius)) {
    return [{ x: target.x, y: target.y }];
  }
  const raw = astar(start.x, start.y, target.x, target.y, buildings);
  if (!raw) return [{ x: target.x, y: target.y }];
  return smoothPath(start, raw, buildings, radius);
};

export default {
  namespaced: true,

  state: () => ({
    units: [
      ...[[-2, 3], [4, 1], [6, -4]].map(([x, y]) => unit(x, y, 'group1')),
      ...[[-8, -6], [-7, -5], [-9, -5]].map(([x, y]) => unit(x, y, 'group2')),
      ...[[8, 6], [9, 5], [7, 7], [8, 7]].map(([x, y]) => unit(x, y, 'group3'))
    ],
    buildings: []
  }),

  getters: {
    getUnitById: (state) => (id) => state.units.find((u) => u.id === id),
    getBuildings: (state) => state.buildings,

    getStats: (state) => (unitIds) => {
      const units = state.units.filter((u) => unitIds.includes(u.id));
      if (units.length === 0) return [];
      return units.map((u) => ([
        { label: 'Группа', value: groupById(u.group).label },
        { label: 'Здоровье', value: `${u.hp} / ${u.maxHp}` },
        { label: 'Сила', value: u.strength },
        { label: 'Скорость', value: u.speed },
        { label: 'Скор. атаки', value: `${u.attackSpeed}/с` }
      ]));
    },

    getBuildingStats: (state) => (buildingId) => {
      const b = state.buildings.find((x) => x.id === buildingId);
      if (!b) return null;
      return [
        { label: 'Группа', value: groupById(b.group).label },
        { label: 'Здоровье', value: `${b.hp} / ${b.maxHp}` }
      ];
    },

    canPlace: (state) => (world, size) => {
      const c = snapToGrid(world, size);
      const half = buildingSize(size) / 2;
      const box = { left: c.x - half, right: c.x + half, top: c.y - half, bottom: c.y + half };
      const limit = MAP_SIZE / 2;
      if (box.left < -limit || box.right > limit || box.top < -limit || box.bottom > limit) return false;
      return !state.buildings.some((b) => {
        const a = aabb(b);
        return box.left < a.right && box.right > a.left && box.top < a.bottom && box.bottom > a.top;
      });
    },

    getGhost: (state, getters) => (world, type) => {
      if (!world || !type) return null;
      const c = snapToGrid(world, type.size);
      return { ...c, size: buildingSize(type.size), valid: getters.canPlace(world, type.size) };
    },

    getUnitIdsByRect: (state) => (rect) => {
      if (!rect) return [];
      return state.units
        .filter((u) => {
          const sp = u.screen;
          return sp.x >= rect.x1 && sp.x <= rect.x2 && sp.y >= rect.y1 && sp.y <= rect.y2;
        })
        .map((u) => u.id);
    },

    getMoveSlots: (state) => ({ unitIds, target }) => {
      if (unitIds.length === 0) return [];
      const sorted = [...unitIds].sort((a, b) => {
        const ua = state.units.find((u) => u.id === a);
        const ub = state.units.find((u) => u.id === b);
        const da = Math.hypot(ua.position.x - target.x, ua.position.y - target.y);
        const db = Math.hypot(ub.position.x - target.x, ub.position.y - target.y);
        return da - db;
      });
      const slots = computeFormationSlots(target, sorted.length);
      return sorted.map((id, i) => {
        const s = resolveCollisions(slots[i].x, slots[i].y, UNIT_RADIUS, state.buildings);
        return { id, target: { x: clamp(s.x), y: clamp(s.y) } };
      });
    },

    getPathSegments: () => (unit) => {
      const segments = [];
      let from = unit.position;

      // Текущий путь
      if (unit.path && unit.path.length > 0) {
        for (let i = unit.pathIndex; i < unit.path.length; i++) {
          const to = unit.path[i];
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          segments.push({
            left: `${from.x}px`,
            top: `${from.y}px`,
            width: `${len}px`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: '0 50%'
          });
          from = to;
        }
      }

      // Точки из очереди
      if (unit.targetQueue && unit.targetQueue.length > 0) {
        for (const to of unit.targetQueue) {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          segments.push({
            left: `${from.x}px`,
            top: `${from.y}px`,
            width: `${len}px`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: '0 50%'
          });
          from = to;
        }
      }

      return segments;
    }
  },

  mutations: {
    SET_TARGET: (state, { id, target }) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return;
      if (!target) {
        u.target = null;
        u.path = [];
        u.pathIndex = 0;
        u.targetQueue = [];
        return;
      }
      let t = { x: clamp(target.x), y: clamp(target.y) };

      // Если точка внутри здания — выталкиваем её на границу
      if (collidesWithBuildings(t.x, t.y, UNIT_RADIUS, state.buildings)) {
        const fixed = resolveCollisions(t.x, t.y, UNIT_RADIUS, state.buildings);
        t = { x: clamp(fixed.x), y: clamp(fixed.y) };
      }

      u.target = t;
      u.targetQueue = [];
      u.path = buildPath(u.position, t, state.buildings, UNIT_RADIUS);
      u.pathIndex = 0;
    },

    ADD_TARGET_TO_QUEUE: (state, { id, target }) => {
      const u = state.units.find((u) => u.id === id);
      if (!u) return;
      let t = { x: clamp(target.x), y: clamp(target.y) };

      // Если точка внутри здания — выталкиваем её на границу
      if (collidesWithBuildings(t.x, t.y, UNIT_RADIUS, state.buildings)) {
        const fixed = resolveCollisions(t.x, t.y, UNIT_RADIUS, state.buildings);
        t = { x: clamp(fixed.x), y: clamp(fixed.y) };
      }

      u.targetQueue.push(t);

      if (!u.target || u.pathIndex >= u.path.length) {
        const nextTarget = u.targetQueue.shift();
        u.target = nextTarget;
        u.path = buildPath(u.position, nextTarget, state.buildings, UNIT_RADIUS);
        u.pathIndex = 0;
      }
    },

    SET_POSITION: (state, { id, x, y }) => {
      const u = state.units.find((u) => u.id === id);
      if (u) {
        u.position.x = clamp(x);
        u.position.y = clamp(y);
      }
    },

    SET_SCREEN: (state, { id, screen }) => {
      const u = state.units.find((u) => u.id === id);
      if (u) u.screen = screen;
    },

    SET_BUILDING_SCREEN: (state, { id, screen }) => {
      const b = state.buildings.find((b) => b.id === id);
      if (b) b.screen = screen;
    },

    ADD_BUILDING: (state, { type, size, position, group = 'group1' }) => {
      const { hp } = buildingType(type);
      state.buildings.push({
        id: 'b' + nextBuildingId++,
        type, position, group,
        size: buildingSize(size),
        hp, maxHp: hp,
        damagedAt: null,
        screen: { x: 0, y: 0 }
      });
    },

    APPLY_DAMAGE: (state, { id, amount, time }) => {
      const target = state.units.find((u) => u.id === id) || state.buildings.find((b) => b.id === id);
      if (!target) return;
      target.hp = Math.max(0, target.hp - amount);
      target.damagedAt = time;
    }
  },

  actions: {
    projectToScreen: ({ state, rootState, commit }) => {
      const { viewport, camera } = rootState.game;
      state.units.forEach((u) => {
        commit('SET_SCREEN', { id: u.id, screen: worldToScreen(u.position, viewport, camera) });
      });
      state.buildings.forEach((b) => {
        commit('SET_BUILDING_SCREEN', { id: b.id, screen: worldToScreen(b.position, viewport, camera) });
      });
    },

    moveUnits: ({ state, commit }, dt) => {
      const R = UNIT_RADIUS;
      const B = state.buildings;

      state.units.forEach((u) => {
        if (!u.target) return;
        if (!u.path || u.path.length === 0) {
          u.path = [{ x: u.target.x, y: u.target.y }];
          u.pathIndex = 0;
        }

        let budget = u.speed * dt;

        while (budget > 0 && u.pathIndex < u.path.length) {
          const point = u.path[u.pathIndex];
          const dx = point.x - u.position.x;
          const dy = point.y - u.position.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= budget) {
            commit('SET_POSITION', { id: u.id, x: point.x, y: point.y });
            budget -= dist;
            u.pathIndex++;
          } else {
            const nx = (dx / dist) * budget;
            const ny = (dy / dist) * budget;
            let newX = u.position.x;
            let newY = u.position.y;
            if (!collidesWithBuildings(newX + nx, newY, R, B)) newX += nx;
            if (!collidesWithBuildings(newX, newY + ny, R, B)) newY += ny;
            const fixed = resolveCollisions(newX, newY, R, B);
            commit('SET_POSITION', { id: u.id, x: fixed.x, y: fixed.y });
            budget = 0;
          }
        }

        if (u.pathIndex >= u.path.length) {
          if (u.targetQueue.length > 0) {
            const nextTarget = u.targetQueue.shift();
            u.path = buildPath(u.position, nextTarget, state.buildings, UNIT_RADIUS);
            u.pathIndex = 0;
            u.target = nextTarget;
          } else {
            commit('SET_TARGET', { id: u.id, target: null });
          }
        }
      });
    }
  }
};