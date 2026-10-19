import { MAP_SIZE } from './config.js'

export function createMap() {
  const terrain = []
  for (let y = 0; y < MAP_SIZE; y++) {
    const row = []
    for (let x = 0; x < MAP_SIZE; x++) {
      const dx = x - 11.5
      const dy = y - 11.5
      row.push(dx * dx + dy * dy < 16 ? 'water' : 'land')
    }
    terrain.push(row)
  }
  const rocks = [
    [3, 4], [4, 4], [5, 4], [18, 6], [19, 6], [7, 18], [8, 18], [8, 19],
    [17, 17], [18, 17], [18, 18], [12, 2], [12, 3],
  ].map(([x, y]) => ({ x, y }))
  return { terrain, rocks }
}
