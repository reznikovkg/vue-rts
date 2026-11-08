export const SCENARIOS = [
  {
    id: "three_factions",
    name: "Столкновение трёх групп",
    units: [
      [-8, -5, "group1"],
      [-7, -5, "group1"],
      [-8, -4, "group1"],

      [8, -5, "group2"],
      [9, -5, "group2"],
      [8, -4, "group2"],

      [0, 8, "group3"],
      [1, 8, "group3"],
      [0, 9, "group3"],
    ],
    buildings: [
      { type: "barrack", x: -11, y: -7, group: "group1" },
      { type: "house", x: -6, y: -7, group: "group1" },

      { type: "barrack", x: 11, y: -7, group: "group2" },
      { type: "house", x: 6, y: -7, group: "group2" },

      { type: "barrack", x: 0, y: 11, group: "group3" },
      { type: "fort", x: 4, y: 11, group: "group3" },
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
