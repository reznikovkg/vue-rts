import {
  UNIT_STATS,
  UNIT_RADIUS,
  MAP_SIZE,
  EDGE_PADDING,
  GRID_STEP,
  BUILDING_TYPES,
  groupById,
  MOVEMENT_TYPES,
} from '@/config/game';
import { getTerrainAt } from '@/utils/terrain';
import { buildPath } from '@/utils/pathfinding';
import { useIsoMath } from '@/composables/useIsoMath';

const { worldToScreen } = useIsoMath();

const LIMIT = MAP_SIZE / 2 - UNIT_RADIUS - EDGE_PADDING;
const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));

const buildingType = (type) => BUILDING_TYPES.find((b) => b.type === type);

let nextUnitId = 1;
let nextBuildingId = 1;

const unit = (
  tileX,
  tileY,
  group = "group1",
  movementType = MOVEMENT_TYPES.LAND
) => ({
  id: nextUnitId++,
  position: { x: tileX * GRID_STEP, y: tileY * GRID_STEP },
  target: null,
  path: [],
  pathIndex: 0,
  targetQueue: [],
  group,
  movementType,
  ...UNIT_STATS,
  maxHp: UNIT_STATS.hp,
  damagedAt: null,
  screen: { x: 0, y: 0 },
});

const getBuildingDimensions = (type) => ({
  width: (type.width ?? type.size) * GRID_STEP,
  height: (type.height ?? type.size) * GRID_STEP,
});

const snapToGrid = (world, type) => {
  const width = type.width ?? type.size;
  const height = type.height ?? type.size;

  return {
    x: (Math.floor(world.x / GRID_STEP) + width / 2) * GRID_STEP,
    y: (Math.floor(world.y / GRID_STEP) + height / 2) * GRID_STEP,
  };
};
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
      y: center.y + (row - offset) * SPACING,
    });
  }
  return slots;
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

const BRIDGE_START = { x: -178, y: -170 };
const BRIDGE_END = { x: 83, y: -172 };
const BRIDGE_WIDTH = 23;

const isBridgeAt = (x, y) => {
  const dx = BRIDGE_END.x - BRIDGE_START.x;
  const dy = BRIDGE_END.y - BRIDGE_START.y;

  const t = Math.max(
    0,
    Math.min(
      1,
      ((x - BRIDGE_START.x) * dx + (y - BRIDGE_START.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );

  const nearestX = BRIDGE_START.x + t * dx;
  const nearestY = BRIDGE_START.y + t * dy;

  return Math.hypot(x - nearestX, y - nearestY) <= BRIDGE_WIDTH;
};

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
    const dl = position.x - a.left,
      dr = a.right - position.x;
    const dt = position.y - a.top,
      db = a.bottom - position.y;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) position = { ...position, x: a.left - r };
    else if (m === dr) position = { ...position, x: a.right + r };
    else if (m === dt) position = { ...position, y: a.top - r };
    else position = { ...position, y: a.bottom + r };
  });
  return position;
};



const findSpawnPosition = (building, buildings, units) => {
  const half = building.size / 2;
  const distance = half + UNIT_RADIUS + 4;

  // Сначала проверяем стороны здания, затем диагонали.
  const offsets = [
    [distance, 0],
    [-distance, 0],
    [0, distance],
    [0, -distance],
    [distance, distance],
    [-distance, distance],
    [distance, -distance],
    [-distance, -distance],
  ];

  for (const [dx, dy] of offsets) {
    const x = building.position.x + dx;
    const y = building.position.y + dy;

    // Не выходим за границы карты.
    if (Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) continue;

    // Не создаём юнита внутри здания.
    if (collidesWithBuildings(x, y, UNIT_RADIUS, buildings)) continue;

    // Не создаём юнита поверх другого юнита.
    const overlapsUnit = units.some((unit) => {
      const ux = unit.position.x - x;
      const uy = unit.position.y - y;

      return Math.hypot(ux, uy) < UNIT_RADIUS * 2 + 2;
    });

    if (overlapsUnit) continue;

    return { x, y };
  }

  return null;
};

export default {
  namespaced: true,

  state: () => ({
    units: [
      ...[
        [-2, 3],
        [4, 1],
        [6, -4],
      ].map(([x, y]) => unit(x, y, "group1")),
      ...[
        [-8, -6],
        [-7, -5],
        [-9, -5],
      ].map(([x, y]) => unit(x, y, "group2")),
      ...[
        [8, 6],
        [9, 5],
        [7, 7],
        [8, 7],
      ].map(([x, y]) => unit(x, y, "group3")),
    ],
    buildings: [],
  }),

  getters: {
    getUnitById: (state) => (id) => state.units.find((u) => u.id === id),
    getBuildings: (state) => state.buildings,
    getTerrainAt: () => ({ x, y }) => getTerrainAt(x, y),

    getStats: (state) => (unitIds) => {
      const units = state.units.filter((u) => unitIds.includes(u.id));
      if (units.length === 0) return [];
      return units.map((u) => [
        { label: "Группа", value: groupById(u.group).label },
        { label: "Здоровье", value: `${u.hp} / ${u.maxHp}` },
        { label: "Сила", value: u.strength },
        { label: "Скорость", value: u.speed },
        { label: "Скор. атаки", value: `${u.attackSpeed}/с` },
      ]);
    },

    getBuildingStats: (state) => (buildingId) => {
      const b = state.buildings.find((x) => x.id === buildingId);
      if (!b) return null;
      return [
        { label: "Группа", value: groupById(b.group).label },
        { label: "Здоровье", value: `${b.hp} / ${b.maxHp}` },
      ];
    },

    canPlace: (state) => (world, type) => {
      const c = snapToGrid(world, type);

      const { width, height } = getBuildingDimensions(type);
      const halfWidth = width / 2;
      const halfHeight = height / 2;

      const box = {
        left: c.x - halfWidth,
        right: c.x + halfWidth,
        top: c.y - halfHeight,
        bottom: c.y + halfHeight,
      };

      const limit = MAP_SIZE / 2;

      // Проверка границ карты
      if (
        box.left < -limit ||
        box.right > limit ||
        box.top < -limit ||
        box.bottom > limit
      ) {
        return false;
      }

      // Проверка всей площади постройки
      const step = 8;
      const stepsX = Math.max(1, Math.ceil(width / step));
      const stepsY = Math.max(1, Math.ceil(height / step));

      for (let i = 0; i <= stepsX; i++) {
        for (let j = 0; j <= stepsY; j++) {
          const x = box.left + (width * i) / stepsX;
          const y = box.top + (height * j) / stepsY;

          const terrain = getTerrainAt(x, y);

          if (terrain !== type.terrain || isBridgeAt(x, y)) {
            return false;
          }
        }
      }

      // Проверка столкновений с другими постройками
      return !state.buildings.some((b) => {
        const a = aabb(b);

        return (
          box.left < a.right &&
          box.right > a.left &&
          box.top < a.bottom &&
          box.bottom > a.top
        );
      });
    },

    getGhost: (state, getters) => (world, type) => {
      if (!world || !type) return null;

      const c = snapToGrid(world, type);
      const { width, height } = getBuildingDimensions(type);

      return {
        ...c,
        width,
        height,
        valid: getters.canPlace(world, type),
      };
    },

    getUnitIdsByRect: (state) => (rect) => {
      if (!rect) return [];
      return state.units
        .filter((u) => {
          const sp = u.screen;
          return (
            sp.x >= rect.x1 &&
            sp.x <= rect.x2 &&
            sp.y >= rect.y1 &&
            sp.y <= rect.y2
          );
        })
        .map((u) => u.id);
    },

    getMoveSlots:
      (state) =>
      ({ unitIds, target }) => {
        if (unitIds.length === 0) return [];
        const sorted = [...unitIds].sort((a, b) => {
          const ua = state.units.find((u) => u.id === a);
          const ub = state.units.find((u) => u.id === b);
          const da = Math.hypot(
            ua.position.x - target.x,
            ua.position.y - target.y,
          );
          const db = Math.hypot(
            ub.position.x - target.x,
            ub.position.y - target.y,
          );
          return da - db;
        });
        const slots = computeFormationSlots(target, sorted.length);
        return sorted.map((id, i) => {
          const s = resolveCollisions(
            slots[i].x,
            slots[i].y,
            UNIT_RADIUS,
            state.buildings,
          );
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
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          segments.push({
            left: `${from.x}px`,
            top: `${from.y}px`,
            width: `${len}px`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "0 50%",
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
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          segments.push({
            left: `${from.x}px`,
            top: `${from.y}px`,
            width: `${len}px`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: "0 50%",
          });
          from = to;
        }
      }

      return segments;
    },
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
      u.path = buildPath(u.position, t, state.buildings, UNIT_RADIUS, u.movementType);
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
        u.path = buildPath(
          u.position,
          nextTarget,
          state.buildings,
          UNIT_RADIUS,
          u.movementType
        );
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

    ADD_BUILDING: (state, { type, size, width, height, position, group = "group1" }) => {
      const definition = buildingType(type);
      if (!definition) return;

      state.buildings.push({
        id: "b" + nextBuildingId++,
        type,
        position,
        group,
        size: size ? size * GRID_STEP : undefined,
        width: width ? width * GRID_STEP : undefined,
        height: height ? height * GRID_STEP : undefined,
        hp: definition.hp,
        maxHp: definition.hp,
        damagedAt: null,
        screen: { x: 0, y: 0 },
      });
    },

    APPLY_DAMAGE: (state, { id, amount, time }) => {
      const target =
        state.units.find((u) => u.id === id) ||
        state.buildings.find((b) => b.id === id);
      if (!target) return;
      target.hp = Math.max(0, target.hp - amount);
      target.damagedAt = time;
    },

    ADD_UNIT: (state, { position, group, movementType = MOVEMENT_TYPES.LAND }) => {
      const newUnit = unit(0, 0, group, movementType);
      newUnit.position = position;
      state.units.push(newUnit);
    },

    CLEAR_MAP: (state) => {
      state.units = [];
      state.buildings = [];
    },
  },

  actions: {
    projectToScreen: ({ state, rootState, commit }) => {
      const { viewport, camera } = rootState.game;
      state.units.forEach((u) => {
        commit("SET_SCREEN", {
          id: u.id,
          screen: worldToScreen(u.position, viewport, camera),
        });
      });
      state.buildings.forEach((b) => {
        commit("SET_BUILDING_SCREEN", {
          id: b.id,
          screen: worldToScreen(b.position, viewport, camera),
        });
      });
    },

    loadScenario: ({ commit }, scenario) => {
      if (!scenario) return;

      commit("CLEAR_MAP");

      // Создаём юнитов с новыми ID.
      scenario.units.forEach(([x, y, group, movementType]) => {
        commit("ADD_UNIT", {
          position: { x: x * GRID_STEP, y: y * GRID_STEP },
          group,
          movementType,
        });
      });

      // Создаём здания с новыми ID.
      scenario.buildings.forEach(({ type, x, y, group }) => {
        const definition = buildingType(type);
        if (!definition) return;

        const position = snapToGrid(
          {
            x: x * GRID_STEP,
            y: y * GRID_STEP,
          },
          definition,
        );

        commit("ADD_BUILDING", {
          type,
          size: definition.size,
          width: definition.width,
          height: definition.height,
          group,
          position,
        });
      });
    },

    moveUnits: ({ state, commit }, dt) => {
      const R = UNIT_RADIUS;
      const B = state.buildings;

      state.units.forEach((u) => {
        if (!u.target) return;
        if (!u.path || u.path.length === 0) {
          u.target = null;
          u.pathIndex = 0;
          u.targetQueue = [];
          return;
        }

        let budget = u.speed * dt;

        while (budget > 0 && u.pathIndex < u.path.length) {
          const point = u.path[u.pathIndex];
          const dx = point.x - u.position.x;
          const dy = point.y - u.position.y;
          const dist = Math.hypot(dx, dy);

          if (dist <= budget) {
            commit("SET_POSITION", { id: u.id, x: point.x, y: point.y });
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
            commit("SET_POSITION", { id: u.id, x: fixed.x, y: fixed.y });
            budget = 0;
          }
        }

        if (u.pathIndex >= u.path.length) {
          if (u.targetQueue.length > 0) {
            const nextTarget = u.targetQueue.shift();
            u.path = buildPath(
              u.position,
              nextTarget,
              state.buildings,
              UNIT_RADIUS,
              u.movementType
            );
            u.pathIndex = 0;
            u.target = nextTarget;
          } else {
            commit("SET_TARGET", { id: u.id, target: null });
          }
        }
      });
    },

    spawnUnit: ({ state, commit }, buildingId) => {
      const building = state.buildings.find((item) => item.id === buildingId);

      // Спавнить могут только казармы.
      if (!building || building.type !== "barrack") return;

      const position = findSpawnPosition(
        building,
        state.buildings,
        state.units,
      );

      // Рядом нет свободного места.
      if (!position) return;

      commit("ADD_UNIT", {
        position,
        group: building.group,
      });
    },
  },
};
