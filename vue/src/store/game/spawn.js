import { TILE_SIZE } from './terrain'
import { isCellBlocked } from './occupancy'
import { positionIntersectsBuilding } from './buildingCollision'
import { createUnit } from './units'

export const SPAWN_BUILDING_CLEARANCE = 24

export function findSpawnPosition(state, building) {
  const candidates = []

  for (let ring = 1; ring <= 8; ring++) {
    const minCol = building.gridX - ring
    const maxCol = building.gridX + building.size - 1 + ring
    const minRow = building.gridY - ring
    const maxRow = building.gridY + building.size - 1 + ring

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (row !== minRow && row !== maxRow && col !== minCol && col !== maxCol) {
          continue
        }

        if (isCellBlocked(state, col, row, -1, new Set())) continue

        const position = { x: col * TILE_SIZE, y: row * TILE_SIZE }
        if (state.buildings.some(item =>
          positionIntersectsBuilding(position, item, SPAWN_BUILDING_CLEARANCE),
        )) {
          continue
        }

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

  candidates.sort((a, b) =>
    a.distance - b.distance || a.row - b.row || a.col - b.col,
  )
  const spawn = candidates[0]

  return spawn ? { x: spawn.col * TILE_SIZE, y: spawn.row * TILE_SIZE } : null
}

export function handleSpawn(state, event) {
  const building = state.buildings.find(item =>
    item.id === event.buildingId &&
    item.id === state.selectedBuildingId &&
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
