export const BUILDING_HEALTH = {
  barracks: 500,
  outpost: 800,
}

export function getBuildingHealth(type) {
  return BUILDING_HEALTH[type] ?? 100
}
