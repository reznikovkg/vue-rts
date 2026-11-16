export const BUILDING_HEALTH = {
  barracks: 500,
  outpost: 800,
}

export const getBuildingHealth = (type) =>
  BUILDING_HEALTH[type] ?? 100
