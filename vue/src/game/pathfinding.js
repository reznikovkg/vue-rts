import { MAP_SIZE as N } from './config.js'

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]]

export function nextStep(unit, terrain, occ, distFn) {
  const start = unit.y * N + unit.x
  const prev = new Int16Array(N * N).fill(-2)
  prev[start] = -1
  const queue = [start]
  let best = start
  let bestD = distFn(unit.x, unit.y)

  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]
    const cx = cur % N
    const cy = (cur - cx) / N
    const d = distFn(cx, cy)
    if (d < bestD) { bestD = d; best = cur }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue
      const n = ny * N + nx
      if (prev[n] !== -2 || terrain[ny][nx] !== unit.terrain || occ.has(n)) continue
      prev[n] = cur
      queue.push(n)
    }
  }

  if (best === start) return null
  let cur = best
  while (prev[cur] !== start) cur = prev[cur]
  return { x: cur % N, y: (cur - (cur % N)) / N }
}
