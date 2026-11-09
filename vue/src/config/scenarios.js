export const SCENARIOS = [
  {
    id: "three_factions",
    name: "Столкновение трёх групп",
  units: [
    // Белая группа
    [-8, -10, "group1"],
    [-7, -10, "group1"],
    [-8, -9, "group1"],
    [-2, -13, "group1", "water"],

    // Красная группа
    [8, -5, "group2"],
    [9, -5, "group2"],
    [8, -4, "group2"],
    [12, 9, "group2", "water"],

    // Синяя группа
    [-8, 8, "group3"],
    [-7, 8, "group3"],
    [-8, 9, "group3"],
    [0, 8, "group3", "water"],
  ],

  buildings: [
    // Белая группа
    { type: "barrack", x: -11, y: -13, group: "group1" },
    { type: "house", x: -9, y: -13, group: "group1" },

    // Красная группа
    { type: "barrack", x: 11, y: -7, group: "group2" },
    { type: "house", x: 6, y: -7, group: "group2" },

    // Синяя группа
    { type: "barrack", x: -11, y: 11, group: "group3" },
    { type: "fort", x: -6, y: 11, group: "group3" },
  ],
  },
  {
    id: "two_factions",
    name: "Противостояние",
    units: [
      [-8, 0, "group1"],
      [-8, 1, "group1"],
      [-8, 2, "group1"],
      [-7, 1, "group1"],
      [-7, 2, "group1"],
[0, -10, "group1", "water"],
      [8, 0, "group2"],
      [8, 1, "group2"],
      [8, 2, "group2"],
      [7, 1, "group2"],
      [7, 2, "group2"],
    ],
    buildings: [
      { type: "barrack", x: -11, y: 0, group: "group1" },
      { type: "house", x: -11, y: 4, group: "group1" },
      { type: "fort", x: -11, y: -4, group: "group1" },

      { type: "barrack", x: 11, y: 0, group: "group2" },
      { type: "house", x: 11, y: 4, group: "group2" },
      { type: "fort", x: 11, y: -4, group: "group2" },
    ],
  },
];
