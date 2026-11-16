export const SCENARIOS = [
  {
    id: "three_factions",
    name: "Столкновение трёх групп",
    units: [
      // Белая группа
      [-8, -10, "group1", "land", "swordsman"],
      [-7, -10, "group1", "land", "archer"],
      [-8, -9, "group1", "land", "heavy"],
      [-3, -6, "group1", "water"],

      // Красная группа
      [8, -12, "group2", "land", "swordsman"],
      [9, -12, "group2", "land", "archer"],
      [9, -11, "group2", "land", "heavy"],
      [6, -5, "group2", "water"],

      // Синяя группа
      [-8, 8, "group3", "land", "swordsman"],
      [-7, 8, "group3", "land", "archer"],
      [-8, 9, "group3", "land", "heavy"],
      [-5, 5, "group3", "water"],
    ],

    buildings: [
      // Белая группа
      { type: "barrack", x: -11, y: -13, group: "group1" },
      { type: "house", x: -9, y: -13, group: "group1" },
      { type: "ship", x: -6, y: -5, group: "group1", orientation: "horizontal" },

      // Красная группа
      { type: "barrack", x: 11, y: -13, group: "group2" },
      { type: "house", x: 11, y: -10, group: "group2" },
      { type: "ship", x: 6, y: -4, group: "group2" },

      // Синяя группа
      { type: "barrack", x: -13, y: 11, group: "group3" },
      { type: "fort", x: -10, y: 11, group: "group3" },
      { type: "ship", x: -4, y: 5, group: "group3", orientation: "horizontal" },
    ],
  },
  {
    id: "two_factions",
    name: "Противостояние",
    units: [
      [-9, 9, "group1", "land", "swordsman"],
      [-8, 9, "group1", "land", "archer"],
      [-9, 10, "group1", "land", "heavy"],
      [-8, 10, "group1", "land", "archer"],
      [-7, 10, "group1", "land", "swordsman"],
      [-4, 2, "group1", "water", "swordsman"],

      [9, -9, "group2", "land", "swordsman"],
      [8, -9, "group2", "land", "archer"],
      [9, -10, "group2", "land", "heavy"],
      [8, -10, "group2", "land", "archer"],
      [7, -10, "group2", "land", "swordsman"],
      [4, -2, "group2", "water", "swordsman"],
    ],
    buildings: [
      { type: "barrack", x: -13, y: 11, group: "group1" },
      { type: "house", x: -12, y: 9, group: "group1" },
      { type: "fort", x: -10, y: 11, group: "group1" },
      { type: "ship", x: -6, y: 0, group: "group1" },

      { type: "barrack", x: 11, y: -13, group: "group2" },
      { type: "house", x: 11, y: -10, group: "group2" },
      { type: "fort", x: 7, y: -14, group: "group2" },
      { type: "ship", x: 5, y: -2, group: "group2" },
    ],
  },
];
