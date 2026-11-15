
import { TERRAIN_TYPES } from '@/config/game';
import { getTerrainCellAt } from '@/utils/terrainGrid';

/**
 * Определяет тип местности по мировым координатам.
 */
export const getTerrainAt = (x, y) => {
  return getTerrainCellAt(x, y) ?? TERRAIN_TYPES.LAND;
};
