import { computed } from 'vue'

export function useGameState(store) {
  const tiles = computed(() => store.state.game.terrain)
  const buildings = computed(() => store.state.game.buildings)
  const units = computed(() => store.state.game.units)
  const selectedUnitIds = computed(
    () => store.state.game.selectedUnitIds as number[],
  )
  const selectedBuildingId = computed(
    () => store.state.game.selectedBuildingId as number | null,
  )
  const targetPosition = computed(
    () => store.state.game.targetPosition as { x: number, y: number } | null,
  )
  const scenario = computed(() => store.state.game.scenario as string)
  const result = computed(
    () => store.state.game.result as { winner: number | null } | null,
  )

  return {
    tiles,
    buildings,
    units,
    selectedUnitIds,
    selectedBuildingId,
    targetPosition,
    scenario,
    result,
  }
}
