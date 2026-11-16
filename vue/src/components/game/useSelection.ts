import { computed, ref } from 'vue'

interface Position {
  x: number
  y: number
}

interface SelectionOptions {
  gameField: any
  units: any
  worldToScreenX: (worldX: number, worldY: number) => number
  worldToScreenY: (worldX: number, worldY: number) => number
  enqueue: (event: Record<string, unknown>) => void
}

export const useSelection = ({
  gameField,
  units,
  worldToScreenX,
  worldToScreenY,
  enqueue,
}: SelectionOptions) => {
  const dragStart = ref<Position | null>(null)
  const dragCurrent = ref<Position | null>(null)

  const selectionBox = computed(() => {
    if (!dragStart.value || !dragCurrent.value) return null

    return {
      left: Math.min(dragStart.value.x, dragCurrent.value.x),
      top: Math.min(dragStart.value.y, dragCurrent.value.y),
      width: Math.abs(dragCurrent.value.x - dragStart.value.x),
      height: Math.abs(dragCurrent.value.y - dragStart.value.y),
    }
  })

  const localPosition = (event: MouseEvent): Position | null => {
    if (!gameField.value) return null

    const rect = gameField.value.getBoundingClientRect()

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return

    const position = localPosition(event)
    if (!position) return

    dragStart.value = position
    dragCurrent.value = position
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!dragStart.value) return

    dragCurrent.value = localPosition(event)
  }

  const handleMouseUp = (event: MouseEvent) => {
    if (!dragStart.value || !dragCurrent.value) return null

    const start = dragStart.value
    const end = dragCurrent.value
    const moved = Math.hypot(end.x - start.x, end.y - start.y) > 5

    if (moved) {
      const left = Math.min(start.x, end.x)
      const right = Math.max(start.x, end.x)
      const top = Math.min(start.y, end.y)
      const bottom = Math.max(start.y, end.y)

      const unitIds = units.value
        .filter((unit: any) => {
          const x = worldToScreenX(unit.x, unit.y)
          const y = worldToScreenY(unit.x, unit.y)

          return x >= left && x <= right && y >= top && y <= bottom
        })
        .map((unit: any) => unit.id)

      enqueue({
        type: 'select',
        unitIds,
        append: event.shiftKey,
      })
    }

    dragStart.value = null
    dragCurrent.value = null

    return moved
  }

  const handleMouseLeave = () => {
    dragStart.value = null
    dragCurrent.value = null
  }

  return {
    dragStart,
    dragCurrent,
    selectionBox,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  }
}
