// Группы независимы: любая группа может атаковать любую другую.
// Палитра для первых четырёх сохранена близкой к исходной игре.
const PALETTE = [
  { color: '#3d8ecc', unitColors: { slow: '#3d6fb8', fast: '#37a5a0' }, buildingColors: { house: '#8a6d4b', castle: '#7d7f86' } },
  { color: '#d66565', unitColors: { slow: '#c85855', fast: '#df8b49' }, buildingColors: { house: '#9e5651', castle: '#9b596b' } },
  { color: '#e4b856', unitColors: { slow: '#d8b047', fast: '#afbf50' }, buildingColors: { house: '#b38d4b', castle: '#b49d63' } },
  { color: '#ad91e5', unitColors: { slow: '#9b7acf', fast: '#c280bb' }, buildingColors: { house: '#8873a9', castle: '#8271ad' } },
]

export const createGroup = (index) => {
  // Индекс начинается с 1; новые группы не требуют изменения логики игры.
  const color = PALETTE[index - 1] ?? {
    color: `hsl(${(index * 137.508) % 360} 65% 62%)`,
    unitColors: {
      slow: `hsl(${(index * 137.508) % 360} 60% 55%)`,
      fast: `hsl(${(index * 137.508 + 25) % 360} 65% 60%)`,
    },
    buildingColors: {
      house: `hsl(${(index * 137.508) % 360} 30% 50%)`,
      castle: `hsl(${(index * 137.508) % 360} 20% 45%)`,
    },
  }
  return { id: `group${index}`, name: `Группа ${index}`, ...color }
}

export const createGroups = (count) => Array.from({ length: count }, (_, index) => createGroup(index + 1))

export const colorOf = (group, entity) => {
  const colors = entity.kind === 'unit' ? group?.unitColors : group?.buildingColors
  return colors?.[entity.type] ?? group?.color ?? '#999999'
}
