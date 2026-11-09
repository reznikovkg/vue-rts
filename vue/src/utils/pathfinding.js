import { MAP_SIZE, UNIT_RADIUS } from '@/config/game';
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

export const buildPath = (start, target, buildings, radius = UNIT_RADIUS) => {
  if (hasLineOfSight(start.x, start.y, target.x, target.y, buildings, radius)) {
    return [{ x: target.x, y: target.y }];
  }
  const raw = astar(start.x, start.y, target.x, target.y, buildings);
  if (!raw) return [{ x: target.x, y: target.y }];
  return smoothPath(start, raw, buildings, radius);
};