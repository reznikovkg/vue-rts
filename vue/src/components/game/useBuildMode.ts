interface BuildContext {
  store: {
    state: {
      game: {
        buildMode: string | null
        activeGroup: number
      }
    }
  }
  localPosition: (event: MouseEvent) => { x: number, y: number } | null
  screenToWorld: (x: number, y: number) => { x: number, y: number }
  enqueue: (event: Record<string, unknown>) => void
}

export function useBuildMode(context: BuildContext) {
  function tryBuild(event: MouseEvent) {
    if (event.button !== 0) return false

    const target = event.target
    if (target instanceof Element && target.closest('.game-controls, .game-result')) {
      return true
    }
    if (target instanceof Element && target.closest('[data-entity-type]')) {
      return true
    }

    const buildMode = context.store.state.game.buildMode
    if (!buildMode) return false

    const point = context.localPosition(event)
    if (!point) return true

    context.enqueue({
      type: 'build',
      buildingType: buildMode,
      groupId: context.store.state.game.activeGroup,
      position: context.screenToWorld(point.x, point.y),
    })

    return true
  }

  return {
    tryBuild,
  }
}
