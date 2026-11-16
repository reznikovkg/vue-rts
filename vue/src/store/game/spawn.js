import { TILE_SIZE, cellToWorld } from './terrain'
import { isCellBlocked } from './occupancy'
import { createUnit } from './units'

const isUnitAt = (state, position) =>
  state.units.some((unit) =>
    Math.hypot(unit.x - position.x, unit.y - position.y) < TILE_SIZE * 0.7,
  )

export const findSpawnPosition = (state, building) => {
  const candidates = []

  for (let ring = 1; ring <= 8; ring += 1) {
    const minCol = building.gridX - ring
    const maxCol = building.gridX + building.size - 1 + ring
    const minRow = building.gridY - ring
    const maxRow = building.gridY + building.size - 1 + ring

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (
          row !== minRow &&
          row !== maxRow &&
          col !== minCol &&
          col !== maxCol
        ) {
          continue
        }

        if (isCellBlocked(state, col, row, -1, new Set())) continue

        const position = cellToWorld(col, row)

        if (isUnitAt(state, position)) continue

        candidates.push({
          col,
          row,
          distance: Math.hypot(
            col - (building.gridX + building.size),
            row - (building.gridY + building.size),
          ),
        })
      }
    }

    if (candidates.length > 0) break
  }

  candidates.sort((first, second) =>
    first.distance - second.distance ||
    first.row - second.row ||
    first.col - second.col,
  )

  const spawn = candidates[0]

  return spawn ? cellToWorld(spawn.col, spawn.row) : null
}

export const handleSpawn = (state, event) => {
  const building = state.buildings.find((item) =>
    item.id === event.buildingId &&
    item.groupId === state.activeGroup,
  )

  if (!building) return

  const position = findSpawnPosition(state, building)

  if (!position) return

  state.units.push(createUnit(
    state.nextUnitId++,
    building.groupId,
    position.x,
    position.y,
  ))
}
