import { worldToScreen } from './map'

export type Terrain = 'land' | 'water'

// A small lake in world coordinates. Everything outside it is land.
export const waterArea = { left: -400, right: 0, top: 80, bottom: 480 }

export const getTerrain = (x: number, y: number): Terrain =>
  x >= waterArea.left && x <= waterArea.right && y >= waterArea.top && y <= waterArea.bottom
    ? 'water' : 'land'

export const overlapsWater = (left: number, top: number, right: number, bottom: number) =>
  left < waterArea.right && right > waterArea.left && top < waterArea.bottom && bottom > waterArea.top

export const waterOutline = [
  worldToScreen(waterArea.left, waterArea.top),
  worldToScreen(waterArea.right, waterArea.top),
  worldToScreen(waterArea.right, waterArea.bottom),
  worldToScreen(waterArea.left, waterArea.bottom),
].map(point => `${point.x},${point.y}`).join(' ')
