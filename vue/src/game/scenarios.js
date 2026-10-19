export const SCENARIOS = [
  {
    name: 'Две группы',
    buildings: [['barracks', 2, 2, 1], ['dock', 5, 9, 1], ['barracks', 20, 20, 2], ['dock', 16, 11, 2]],
    units: [
      ['soldier', 5, 2, 1], ['soldier', 5, 3, 1], ['soldier', 5, 5, 1], ['soldier', 4, 6, 1], ['boat', 9, 11, 1],
      ['soldier', 18, 20, 2], ['soldier', 18, 21, 2], ['soldier', 17, 19, 2], ['soldier', 19, 18, 2], ['boat', 14, 12, 2],
    ],
  },
  {
    name: 'Три группы',
    buildings: [['barracks', 1, 1, 1], ['barracks', 21, 1, 2], ['barracks', 11, 20, 3]],
    units: [
      ['soldier', 4, 1, 1], ['soldier', 4, 2, 1], ['soldier', 1, 4, 1],
      ['soldier', 19, 1, 2], ['soldier', 19, 2, 2], ['soldier', 22, 4, 2],
      ['soldier', 9, 20, 3], ['soldier', 14, 20, 3], ['soldier', 11, 18, 3],
    ],
  },
  {
    name: 'Обход стены',
    buildings: [['wall', 9, 19, 2], ['wall', 9, 20, 2], ['wall', 9, 21, 2], ['wall', 9, 22, 2], ['wall', 9, 23, 2]],
    units: [
      ['soldier', 3, 20, 1], ['soldier', 3, 21, 1], ['soldier', 4, 22, 1],
      ['soldier', 14, 21, 2], ['soldier', 14, 22, 2],
    ],
  },
  { name: 'Пустая карта', buildings: [], units: [] },
]
