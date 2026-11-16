export const UNIT_STATS = {
  health: 100,
  maxHealth: 100,
  attackPower: 12,
  speed: 110,
  attackSpeed: 1,
  attackCooldown: 0,
}

export const getUnitStats = () => ({
  ...UNIT_STATS,
})
