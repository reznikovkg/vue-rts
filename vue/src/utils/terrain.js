import { TERRAIN_AREAS, TERRAIN_TYPES } from '@/config/game';

/**
 * Проверяет, находится ли точка внутри многоугольника.
 */
export const isPointInPolygon = (x, y, points) => {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];

    const intersects =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
};

/**
 * Определяет тип местности по мировым координатам.
 */
export const getTerrainAt = (x, y) => {
  for (const area of TERRAIN_AREAS) {
    if (isPointInPolygon(x, y, area.points)) {
      return area.type;
    }
  }

  return TERRAIN_TYPES.LAND;
};