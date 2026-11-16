import {
  MAP_TILES,
  GRID_STEP,
  TERRAIN_TYPES,
} from '@/config/game';

// Клеточная карта: по умолчанию вся территория — суша.
export const TERRAIN_GRID = Array.from(
  { length: MAP_TILES },
  () => Array(MAP_TILES).fill(TERRAIN_TYPES.LAND)
);

/**
 * Получает тип местности конкретной клетки.
 */
export const getTerrainCell = (column, row) => {
  if (
    column < 0 ||
    column >= MAP_TILES ||
    row < 0 ||
    row >= MAP_TILES
  ) {
    return null;
  }

  return TERRAIN_GRID[row][column];
};

/**
 * Изменяет тип местности конкретной клетки.
 */
export const setTerrainCell = (column, row, type) => {
  if (
    column < 0 ||
    column >= MAP_TILES ||
    row < 0 ||
    row >= MAP_TILES
  ) {
    return false;
  }

  TERRAIN_GRID[row][column] = type;
  return true;
};
/**
 * Преобразует мировые координаты в координаты клетки.
 */
export const worldToCell = (x, y) => {
  const column = Math.floor((x + MAP_TILES * GRID_STEP / 2) / GRID_STEP);
  const row = Math.floor((y + MAP_TILES * GRID_STEP / 2) / GRID_STEP);

  return { column, row };
};

/**
 * Возвращает мировые координаты центра клетки.
 */
export const cellToWorld = (column, row) => {
  return {
    x: -MAP_TILES * GRID_STEP / 2 + (column + 0.5) * GRID_STEP,
    y: -MAP_TILES * GRID_STEP / 2 + (row + 0.5) * GRID_STEP,
  };
};
/**
 * Получает тип местности по мировым координатам.
 */
export const getTerrainCellAt = (x, y) => {
  const { column, row } = worldToCell(x, y);
  return getTerrainCell(column, row);
};
/**
 * Заполняет клеточную карту водой по списку координат.
 */
export const generateLake = (waterCells) => {
  waterCells.forEach(([column, row]) => {
    setTerrainCell(column, row, TERRAIN_TYPES.WATER);
  });
};


// Контур центрального озера.
// Формат: [строка, начальная колонка, конечная колонка].
const LAKE_ROW_RANGES = [
  [8, 11, 19],
  [9, 9, 21],
  [10, 8, 22],
  [11, 7, 22],
  [12, 7, 23],
  [13, 7, 23],
  [14, 6, 23],
  [15, 6, 23],
  [16, 6, 23],
  [17, 7, 23],
  [18, 7, 22],
  [19, 8, 22],
  [20, 9, 21],
  [21, 11, 19],
];

// Преобразуем диапазоны в список координат клеток.
export const LAKE_CELLS = LAKE_ROW_RANGES.flatMap(
  ([row, start, end]) =>
    Array.from(
      { length: end - start + 1 },
      (_, index) => [start + index, row]
    )
);

// Заполняем клетки озера водой.
generateLake(LAKE_CELLS);


/**
 * Проверяет, является ли клетка водной.
 */
export const isWaterCell = (column, row) => {
  return getTerrainCell(column, row) === TERRAIN_TYPES.WATER;
};

/**
 * Получает границы всех водных клеток.
 * Возвращает только те стороны клеток, которые соприкасаются с сушей.
 */
export const getWaterCellEdges = () => {
  const edges = [];

  for (let row = 0; row < MAP_TILES; row++) {
    for (let column = 0; column < MAP_TILES; column++) {
      if (!isWaterCell(column, row)) continue;

      const left = -MAP_TILES * GRID_STEP / 2 + column * GRID_STEP;
      const top = -MAP_TILES * GRID_STEP / 2 + row * GRID_STEP;
      const right = left + GRID_STEP;
      const bottom = top + GRID_STEP;

      if (!isWaterCell(column, row - 1)) {
        edges.push([[left, top], [right, top]]);
      }

      if (!isWaterCell(column + 1, row)) {
        edges.push([[right, top], [right, bottom]]);
      }

      if (!isWaterCell(column, row + 1)) {
        edges.push([[right, bottom], [left, bottom]]);
      }

      if (!isWaterCell(column - 1, row)) {
        edges.push([[left, bottom], [left, top]]);
      }
    }
  }

  return edges;
};


/**
 * Соединяет граничные отрезки водных клеток в замкнутые контуры.
 */
export const getWaterContours = () => {
  const edges = getWaterCellEdges();
  const contours = [];

  const pointKey = ([x, y]) => `${x},${y}`;

  const edgeMap = new Map();

  edges.forEach(([start, end]) => {
    const key = pointKey(start);

    if (!edgeMap.has(key)) {
      edgeMap.set(key, []);
    }

    edgeMap.get(key).push(end);
  });

  const usedEdges = new Set();

  edges.forEach(([start, end]) => {
    const firstKey = `${pointKey(start)}>${pointKey(end)}`;

    if (usedEdges.has(firstKey)) return;

    const contour = [start];
    let current = end;

    usedEdges.add(firstKey);

    while (pointKey(current) !== pointKey(start)) {
      contour.push(current);

      const nextPoints = edgeMap.get(pointKey(current)) || [];
      const next = nextPoints.find((point) => {
        const key = `${pointKey(current)}>${pointKey(point)}`;
        return !usedEdges.has(key);
      });

      if (!next) break;

      usedEdges.add(`${pointKey(current)}>${pointKey(next)}`);
      current = next;
    }

    if (pointKey(current) === pointKey(start)) {
      contours.push(contour);
    }
  });

  return contours;
};

