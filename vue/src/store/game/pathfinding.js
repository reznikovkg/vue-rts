import {
  MAP_RADIUS,
  TILE_SIZE,
  cellIndex,
  indexCell,
  tileAt,
} from './terrain'
import { getCollisionCircles } from './buildingCollision'
import { collisionDistance, segmentIntersectsCircle } from './collision'
import { isCellBlocked } from './occupancy'

export function isWalkableSegment(
  state,
  start,
  end,
  unitId,
  reservedCells,
  collisionCircles,
) {
  const steps = Math.max(1, Math.ceil(
    Math.hypot(end.x - start.x, end.y - start.y) / (TILE_SIZE / 4),
  ))

  for (let step = 1; step <= steps; step++) {
    const progress = step / steps
    const position = {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    }
    const col = Math.round(position.x / TILE_SIZE)
    const row = Math.round(position.y / TILE_SIZE)
    const tile = tileAt(state, col, row)

    if (
      !tile ||
      tile.type !== 'land' ||
      reservedCells.has(`${col}:${row}`) ||
      collisionCircles.some(circle =>
        segmentIntersectsCircle(start, position, circle),
      )
    ) {
      return false
    }
  }

  return true
}

export function smoothPath(
  state,
  points,
  unitId,
  reservedCells,
  collisionCircles,
) {
  if (points.length < 3) return points.slice(1)

  const result = []
  let anchor = 0

  while (anchor < points.length - 1) {
    let next = points.length - 1

    while (
      next > anchor + 1 &&
      !isWalkableSegment(
        state,
        points[anchor],
        points[next],
        unitId,
        reservedCells,
        collisionCircles,
      )
    ) {
      next--
    }

    result.push(points[next])
    anchor = next
  }

  return result
}

export function heuristicDistance(fromCol, fromRow, toCol, toRow) {
  const deltaX = Math.abs(toCol - fromCol)
  const deltaY = Math.abs(toRow - fromRow)
  const diagonal = Math.min(deltaX, deltaY)

  return Math.max(deltaX, deltaY) + (Math.SQRT2 - 1) * diagonal
}

export function pushOpenNode(heap, node) {
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

export function popOpenNode(heap) {
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

export function getPath(
  state,
  unit,
  destination,
  reservedCells = new Set(),
  destinationRange = Infinity,
) {
  const startCol = Math.round(unit.x / TILE_SIZE)
  const startRow = Math.round(unit.y / TILE_SIZE)
  const start = cellIndex(startCol, startRow)
  const escapeStart = { x: unit.x, y: unit.y }
  const collisionCircles = getCollisionCircles(state, unit.id)
  const totalCells = (MAP_RADIUS * 2 + 1) ** 2
  const previous = new Int32Array(totalCells).fill(-1)
  const distance = new Float64Array(totalCells).fill(Infinity)
  const visited = new Uint8Array(totalCells)
  const neighbors = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]
  const targetCol = Math.round(destination.x / TILE_SIZE)
  const targetRow = Math.round(destination.y / TILE_SIZE)
  const open = []
  distance[start] = 0
  pushOpenNode(open, {
    index: start,
    cost: 0,
    score: heuristicDistance(startCol, startRow, targetCol, targetRow),
  })

  while (open.length > 0) {
    const node = popOpenNode(open)
    if (node.cost !== distance[node.index] || visited[node.index]) continue

    const currentIndex = node.index
    visited[currentIndex] = 1
    const current = indexCell(currentIndex)

    for (const [dx, dy] of neighbors) {
      const col = current.col + dx
      const row = current.row + dy

      if (Math.abs(col) > MAP_RADIUS || Math.abs(row) > MAP_RADIUS) {
        continue
      }

      const nextIndex = cellIndex(col, row)
      const currentPosition = currentIndex === start
        ? escapeStart
        : { x: current.col * TILE_SIZE, y: current.row * TILE_SIZE }
      const nextPosition = { x: col * TILE_SIZE, y: row * TILE_SIZE }
      const diagonal = dx !== 0 && dy !== 0
      const blockedCorner = diagonal && (
        isCellBlocked(
          state,
          current.col + dx,
          current.row,
          unit.id,
          reservedCells,
          escapeStart,
          collisionCircles,
        ) ||
        isCellBlocked(
          state,
          current.col,
          current.row + dy,
          unit.id,
          reservedCells,
          escapeStart,
          collisionCircles,
        )
      )

      if (
        visited[nextIndex] ||
        blockedCorner ||
        (nextIndex !== start &&
          (isCellBlocked(
            state,
            col,
            row,
            unit.id,
            reservedCells,
            escapeStart,
            collisionCircles,
          ) ||
            collisionCircles.some(circle =>
              segmentIntersectsCircle(currentPosition, nextPosition, circle),
            )))
      ) {
        continue
      }

      const nextCost = distance[currentIndex] +
        (diagonal ? Math.SQRT2 : 1)
      if (nextCost >= distance[nextIndex]) continue

      distance[nextIndex] = nextCost
      previous[nextIndex] = currentIndex
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

  for (let radius = 0; radius <= 6; radius++) {
    for (let row = targetRow - radius; row <= targetRow + radius; row++) {
      for (let col = targetCol - radius; col <= targetCol + radius; col++) {
        if (
          Math.max(Math.abs(col - targetCol), Math.abs(row - targetRow)) !== radius ||
          Math.abs(col) > MAP_RADIUS ||
          Math.abs(row) > MAP_RADIUS ||
          collisionDistance(
            { x: col * TILE_SIZE, y: row * TILE_SIZE },
            destination,
          ) > destinationRange ||
          isCellBlocked(
            state,
            col,
            row,
            unit.id,
            reservedCells,
            escapeStart,
            collisionCircles,
          )
        ) {
          continue
        }

        const index = cellIndex(col, row)
        if (Number.isFinite(distance[index])) {
          candidates.push({ index, radius })
        }
      }
    }
  }

  candidates.sort((a, b) =>
    a.radius - b.radius || distance[a.index] - distance[b.index],
  )
  const destinationIndex = candidates[0]?.index

  if (destinationIndex === undefined) {
    return null
  }

  const path = []
  let currentIndex = destinationIndex

  while (currentIndex !== start && currentIndex !== -1) {
    const cell = indexCell(currentIndex)
    path.unshift({ x: cell.col * TILE_SIZE, y: cell.row * TILE_SIZE })
    currentIndex = previous[currentIndex]
  }

  return smoothPath(
    state,
    [escapeStart, ...path],
    unit.id,
    reservedCells,
    collisionCircles,
  )
}
