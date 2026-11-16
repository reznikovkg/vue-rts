import { useStore } from 'vuex'

interface CommandOptions {
  enqueue: (event: Record<string, unknown>) => void
  selectedUnitIds: any
  screenToWorld: (screenX: number, screenY: number) => { x: number, y: number }
}

export const useCommands = ({enqueue, selectedUnitIds, screenToWorld}: CommandOptions) => {
  const store = useStore()

  const handleRightClick = (event?: MouseEvent) => {
    if (!event) {
      enqueue({ type: 'clearSelection' })
      return
    }

    const state = store.state.game
    const target = event.target instanceof Element ? event.target.closest('[data-unit-id], [data-building-id]') : null

    if (!target || !selectedUnitIds.value.length) {
      enqueue({ type: 'clearSelection' })
      return
    }

    const unitId = target.getAttribute('data-unit-id')
    const buildingId = target.getAttribute('data-building-id')
    const targetType = unitId ? 'unit' : 'building'
    const targetId = Number(unitId ?? buildingId)

    const targetEntity = targetType === 'unit'
      ? state.units.find((unit: any) => unit.id === targetId)
      : state.buildings.find((building: any) => building.id === targetId)

    if (!targetEntity || targetEntity.groupId === state.activeGroup) {
      enqueue({ type: 'clearSelection' })
      return
    }

    enqueue({
      type: 'attack',
      unitIds: [...selectedUnitIds.value],
      targetType,
      targetId,
      destination: {
        x: targetEntity.x,
        y: targetEntity.y
      }
    })
  }

  const handleGroundClick = (event: MouseEvent, gameField: HTMLElement | null, append = false) => {
    if (!gameField || !selectedUnitIds.value.length)
      return

    const rect = gameField.getBoundingClientRect()
    const destination = screenToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top
    )

    enqueue({
      type: 'move',
      unitIds: [...selectedUnitIds.value],
      destination,
      append
    })
  }

  return {
    handleRightClick,
    handleGroundClick
  }
}
