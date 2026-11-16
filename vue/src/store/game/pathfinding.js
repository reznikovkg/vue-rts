import {
  MAP_RADIUS,
  TILE_SIZE,
  cellIndex,
  indexCell,
} from './terrain'
import { isCellBlocked } from './occupancy'

const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

const heuristicDistance = (fromCol, fromRow, toCol, toRow) => {
  const deltaX = Math.abs(toCol - fromCol)
  const deltaY = Math.abs(toRow - fromRow)
  const diagonal = Math.min(deltaX, deltaY)

  return Math.max(deltaX, deltaY) + (Math.SQRT2 - 1) * diagonal
}

const pushOpenNode = (heap, node) => {
  let index = heap.length
  heap.push(node)

  while (index > 0) {
    const parent = Math.floor((index - 1) / 2)
    if (heap[parent].score <= node.score) break
    heap[index] = heap[parent]
    index = parent
  }

  heap[index] = node
}

const popOpenNode = (heap) => {
  const first = heap[0]
  const last = heap.pop()

  if (heap.length > 0 && last) {
    let index = 0

    while (true) {
      const left = index * 2 + 1
      const right = left + 1
      if (left >= heap.length) break

      const child = right < heap.length &&
        heap[right].score < heap[left].score
        ? right
        : left
      if (heap[child].score >= last.score) break

      heap[index] = heap[child]
      index = child
    }

    heap[index] = last
  }

  return first
}

const getWalkableCell = (
  state,
  unitId,
  reservedCells,
  col,
  row,
) => {
  if (Math.abs(col) > MAP_RADIUS || Math.abs(row) > MAP_RADIUS) {
    return false
  }

  return !isCellBlocked(state, col, row, unitId, reservedCells)
}

export const getPath = (
  state,
  unit,
  destination,
  reservedCells = new Set(),
  destinationRange = Infinity,
) => {
  const startCol = Math.round(unit.x / TILE_SIZE)
  const startRow = Math.round(unit.y / TILE_SIZE)
  const startIndex = cellIndex(startCol, startRow)
  const targetCol = Math.round(destination.x / TILE_SIZE)
  const targetRow = Math.round(destination.y / TILE_SIZE)
  const totalCells = (MAP_RADIUS * 2 + 1) ** 2
  const previous = new Int32Array(totalCells).fill(-1)
  const distance = new Float64Array(totalCells).fill(Infinity)
  const visited = new Uint8Array(totalCells)
  const open = []

  distance[startIndex] = 0
  pushOpenNode(open, {
    index: startIndex,
    cost: 0,
    score: heuristicDistance(startCol, startRow, targetCol, targetRow),
  })

  while (open.length > 0) {
    const node = popOpenNode(open)

    if (node.cost !== distance[node.index] || visited[node.index]) {
      continue
    }

    visited[node.index] = 1
    const current = indexCell(node.index)

    for (const [deltaCol, deltaRow] of NEIGHBORS) {
      const col = current.col + deltaCol
      const row = current.row + deltaRow

      if (!getWalkableCell(
        state,
        unit.id,
        reservedCells,
        col,
        row,
      )) {
        continue
      }

      const diagonal = deltaCol !== 0 && deltaRow !== 0

      if (
        diagonal &&
        (
          !getWalkableCell(
            state,
            unit.id,
            reservedCells,
            current.col + deltaCol,
            current.row,
          ) ||
          !getWalkableCell(
            state,
            unit.id,
            reservedCells,
            current.col,
            current.row + deltaRow,
          )
        )
      ) {
        continue
      }

      const nextIndex = cellIndex(col, row)

      if (visited[nextIndex]) continue

      const nextCost = distance[node.index] +
        (diagonal ? Math.SQRT2 : 1)

      if (nextCost >= distance[nextIndex]) continue

      distance[nextIndex] = nextCost
      previous[nextIndex] = node.index
      pushOpenNode(open, {
        index: nextIndex,
        cost: nextCost,
        score: nextCost + heuristicDistance(
          col,
          row,
          targetCol,
          targetRow,
        ),
      })
    }
  }

  const candidates = []

  for (let radius = 0; radius <= 6; radius += 1) {
    for (let row = targetRow - radius; row <= targetRow + radius; row += 1) {
      for (let col = targetCol - radius; col <= targetCol + radius; col += 1) {
        if (
          Math.max(
            Math.abs(col - targetCol),
            Math.abs(row - targetRow),
          ) !== radius
        ) {
          continue
        }

        if (!getWalkableCell(
          state,
          unit.id,
          reservedCells,
          col,
          row,
        )) {
          continue
        }

        const worldPosition = {
          x: col * TILE_SIZE,
          y: row * TILE_SIZE,
        }
        const worldDistance = Math.hypot(
          worldPosition.x - destination.x,
          worldPosition.y - destination.y,
        )

        if (worldDistance > destinationRange) continue

        const index = cellIndex(col, row)

        if (Number.isFinite(distance[index])) {
          candidates.push({
            index,
            radius,
            distance: distance[index],
          })
        }
      }
    }
  }

  candidates.sort((first, second) =>
    first.radius - second.radius ||
    first.distance - second.distance,
  )

  const destinationIndex = candidates[0]?.index

  if (destinationIndex === undefined) {
    return []
  }

  const path = []
  let currentIndex = destinationIndex

  while (currentIndex !== startIndex && currentIndex !== -1) {
    const cell = indexCell(currentIndex)
    path.unshift({
      x: cell.col * TILE_SIZE,
      y: cell.row * TILE_SIZE,
    })
    currentIndex = previous[currentIndex]
  }

  return path
}
