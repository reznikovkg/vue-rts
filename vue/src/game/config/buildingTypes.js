export const BUILDING_TYPES = {
  outpost: {
    label: 'аванпост',
    sizeN: 1,
    spawnUnitType: 'scout',
  },
  barracks: {
    label: 'казарма',
    sizeN: 2,
    spawnUnitType: 'soldier',
  },
  warehouse: {
    label: 'склад',
    sizeN: 3,
    spawnUnitType: null,
  },
}

export const BUILD_OPTIONS = Object.entries(BUILDING_TYPES).map(([buildingType, config]) => ({
  buildingType,
  ...config,
}))
