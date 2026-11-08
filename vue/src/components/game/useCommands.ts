interface CommandContext {
  selectedUnitIds: { value: number[] }
  localPosition: (event: MouseEvent) => { x: number, y: number } | null
  screenToWorld: (x: number, y: number) => { x: number, y: number }
  enqueue: (event: Record<string, unknown>) => void
}

export const useCommands = (context: CommandContext) => {
  const handleRightClick = (event: MouseEvent) => {
    const targetElement = event.target
    if (
      targetElement instanceof Element &&
      targetElement.closest('.game-controls, .game-result')
    ) {
      return
    }

    const entityElement = targetElement instanceof Element
      ? targetElement.closest<HTMLElement>('[data-entity-type]')
      : null

    if (entityElement && context.selectedUnitIds.value.length > 0) {
      context.enqueue({
        type: 'attack',
        unitIds: context.selectedUnitIds.value,
        targetType: entityElement.dataset.entityType,
        targetId: Number(entityElement.dataset.entityId),
        append: event.shiftKey,
      })
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
  }

  const handleGroupKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()

    if (/^[1-3]$/.test(key)) {
      const groupId = Number(key)
      if (event.ctrlKey) {
        context.enqueue({
          type: 'assignGroup',
          unitIds: context.selectedUnitIds.value,
          groupId,
        })
      } else {
        context.enqueue({ type: 'selectGroup', groupId })
      }
    }
  }

  return {
    handleRightClick,
    handleGroupKeyDown,
  }
}
