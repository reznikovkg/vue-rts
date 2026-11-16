interface BuildOptions {
  enqueue: (event: Record<string, unknown>) => void
  buildMode: any
  activeGroup: any
  gameField: any
  screenToWorld: (screenX: number, screenY: number) => { x: number, y: number }
}

export const useBuildMode = ({
  enqueue,
  buildMode,
  activeGroup,
  gameField,
  screenToWorld,
}: BuildOptions) => {
  const handleBuildClick = (event: MouseEvent) => {
    if (!buildMode.value || !gameField.value) return false

    const rect = gameField.value.getBoundingClientRect()
    const position = screenToWorld(
      event.clientX - rect.left,
      event.clientY - rect.top,
    )

    enqueue({
      type: 'build',
      buildingType: buildMode.value,
      position,
      groupId: activeGroup.value,
    })

    return true
  }

  return {
    handleBuildClick,
  }
}
