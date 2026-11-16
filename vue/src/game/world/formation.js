import { clampWorldPointToMap } from './bounds.js'
import { WORLD_GRID_SIZE } from './worldUnits.js'

export function formationSlots(wx, wy, count, spacing = WORLD_GRID_SIZE) {
    if (count <= 0) return []
    const columns = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / columns)
    const slots = []
    for (let index = 0; index < count; index++) {
        const column = index % columns
        const row = Math.floor(index / columns)
        const inRow = row === rows - 1 ? count - row * columns : columns
        slots.push(
            clampWorldPointToMap(
                wx + (column - (inRow - 1) / 2) * spacing,
                wy + (row - (rows - 1) / 2) * spacing,
            ),
        )
    }
    return slots
}