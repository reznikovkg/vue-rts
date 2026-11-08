import { computed, ref } from 'vue'

interface Position {
  x: number
  y: number
}

interface SelectionContext {
  units: { value: Array<{ id: number, x: number, y: number }> }
  selectedUnitIds: { value: number[] }
  worldToScreenX: (x: number, y: number) => number
  worldToScreenY: (x: number, y: number) => number
  screenToWorld: (x: number, y: number) => Position
  localPosition: (event: MouseEvent) => Position | null
  enqueue: (event: Record<string, unknown>) => void
  gameField: { value: HTMLElement | null }
}

export function useSelection(context: SelectionContext) {
  const dragStart = ref<Position | null>(null)
  const dragCurrent = ref<Position | null>(null)

  const selectionBox = computed(() => dragStart.value && dragCurrent.value)

  const selectionBoxStyle = computed(() => {
    if (!dragStart.value || !dragCurrent.value) return {}

    return {
      left: `${Math.min(dragStart.value.x, dragCurrent.value.x)}px`,
      top: `${Math.min(dragStart.value.y, dragCurrent.value.y)}px`,
      width: `${Math.abs(dragCurrent.value.x - dragStart.value.x)}px`,
      height: `${Math.abs(dragCurrent.value.y - dragStart.value.y)}px`,
    }
  })

  function selectUnit(unitId: number, event: MouseEvent) {
    context.enqueue({
      type: 'select',
      unitIds: [unitId],
      append: event.shiftKey,
    })
  }

  function selectBuilding(buildingId: number) {
    context.enqueue({ type: 'select', buildingId })
  }

  function handleMouseDown(event: MouseEvent) {
    if (event.button !== 0 || !context.gameField.value) return

    const target = event.target
    if (target instanceof Element && target.closest('.game-controls, .game-result')) return
    if (target instanceof Element && target.closest('[data-entity-type]')) return

    const point = context.localPosition(event)
    if (!point) return

    dragStart.value = point
    dragCurrent.value = point
  }

  function handleMouseMove(event: MouseEvent) {
    if (!dragStart.value) return
    dragCurrent.value = context.localPosition(event)
  }

  function handleMouseUp(event: MouseEvent) {
    if (!dragStart.value || !dragCurrent.value) return

    const start = dragStart.value
    const end = dragCurrent.value
    const moved = Math.hypot(end.x - start.x, end.y - start.y) > 5

    if (moved) {
      const left = Math.min(start.x, end.x)
      const right = Math.max(start.x, end.x)
      const top = Math.min(start.y, end.y)
      const bottom = Math.max(start.y, end.y)
      const unitIds = context.units.value
        .filter((unit: { id: number, x: number, y: number }) => {
          const x = context.worldToScreenX(unit.x, unit.y)
          const y = context.worldToScreenY(unit.x, unit.y)

          return x >= left && x <= right && y >= top && y <= bottom
        })
        .map((unit: { id: number }) => unit.id)

      context.enqueue({ type: 'select', unitIds, append: event.shiftKey })
    } else if (context.selectedUnitIds.value.length > 0) {
      const point = context.localPosition(event)
      if (point) {
        context.enqueue({
          type: 'move',
          unitIds: context.selectedUnitIds.value,
          destination: context.screenToWorld(point.x, point.y),
          append: event.shiftKey,
        })
      }
    }

    dragStart.value = null
    dragCurrent.value = null
  }

  function handleMouseLeave() {
    if (!dragStart.value) return
    dragStart.value = null
    dragCurrent.value = null
  }

  return {
    dragStart,
    dragCurrent,
    selectionBox,
    selectionBoxStyle,
    selectUnit,
    selectBuilding,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  }
}
