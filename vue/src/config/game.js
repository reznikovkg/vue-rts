export const GRID_STEP = 48;
export const ISO_ROTATION_DEG = 45;
export const ISO_SCALE_Y = 0.5;

export const MAP_TILES = 30;
export const MAP_SIZE = MAP_TILES * GRID_STEP;

// Типы местности
export const TERRAIN_TYPES = {
  LAND: 'land',
  WATER: 'water'
};

export const MOVEMENT_TYPES = {
  LAND: 'land',
  WATER: 'water',
};
// Цвета местности
export const TERRAIN_COLORS = {
  land: '#668b45',
  water: '#397da5'
};

// Полигон водной области в мировых координатах.
// Всё пространство за пределами полигона будет сушей.

export const TERRAIN_AREAS = [
  {
    type: TERRAIN_TYPES.WATER,
    points: [
      [-380, -720],
      [-300, -720],
      [-220, -720],
      [-140, -720],
      [-70, -720],
      [0, -720],
      [15, -700],
      [35, -675],
      [65, -650],
      [95, -625],
      [120, -590],
      [145, -550],
      [165, -510],
      [180, -470],
      [180, -420],
      [170, -380],
      [150, -360],
      [70, -270],
      [40, -170],
      [100, -80],
      [180, 20],
      [240, 130],
      [300, 240],
      [380, 350],
      [470, 390],
      [560, 410],
      [650, 430],
      [720, 450],
      [850, 470],
      [950, 520],
      [950, 720],
      [180, 720],
      [150, 650],
      [100, 580],
      [20, 510],
      [-60, 420],
      [-130, 320],
      [-210, 220],
      [-240, 120],
      [-200, 20],
      [-140, -80],
      [-150, -180],
      [-190, -280],
      [-250, -380],
      [-310, -480],
      [-350, -570],
      [-380, -650],
      [-380, -720]
    ]
  }
];

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1.6;
export const CAMERA_SPEED = 1650;

export const UNIT_RADIUS = 14;
export const ATTACK_RANGE = UNIT_RADIUS * 2 + 12;
export const UNIT_SPEED = 150;
export const EDGE_PADDING = 8;

export const GROUP_LIST = [
  { id: "group1", label: "Группа 1", color: "#e0e0e0" },
  { id: "group2", label: "Группа 2", color: "#c0635a" },
  { id: "group3", label: "Группа 3", color: "#5a8ec0" },
];

// Безопасный доступ к группе: неизвестный id даёт нейтральный вид
export const groupById = (id) =>
  GROUP_LIST.find((g) => g.id === id) || GROUP_LIST[0];

// Характеристики юнита: здоровье, сила, скорость, скорость атаки (ударов в секунду)
export const UNIT_STATS = {
  hp: 100,
  strength: 10,
  speed: UNIT_SPEED,
  attackSpeed: 1,
};

export const UNIT_TYPES = {
  SWORDSMAN: {
    type: 'swordsman',
    label: 'Мечник',
    hp: 120,
    strength: 20,
    speed: UNIT_SPEED,
    attackSpeed: 1,
  },

  ARCHER: {
    type: 'archer',
    label: 'Лучник',
    hp: 80,
    strength: 12,
    speed: UNIT_SPEED,
    attackSpeed: 0.7,
  },

  HEAVY: {
    type: 'heavy',
    label: 'Тяжёлый боец',
    hp: 200,
    strength: 40,
    speed: UNIT_SPEED,
    attackSpeed: 0.5,
  },
};

// Здания квадратные NxN: size — сторона в клетках сетки, hp — очки жизни.
// Корабль — прямоугольный: width и height в клетках сетки
export const BUILDING_TYPES = [
  { type: "house", label: "Дом", size: 1, hp: 200, terrain: TERRAIN_TYPES.LAND },
  { type: "barrack", label: "Казарма", size: 2, hp: 400, terrain: TERRAIN_TYPES.LAND },
  { type: "fort", label: "Крепость", size: 3, hp: 800, terrain: TERRAIN_TYPES.LAND },
  { type: "ship", label: "Корабль", width: 1, height: 2, hp: 500, terrain: TERRAIN_TYPES.WATER },
];

// Полоска здоровья: толщина на экране и отступ над объектом
export const HEALTH_BAR = {
  height: 6,
  unitWidth: 42,
  unitOffset: 30,
  buildingOffset: 16,
  // Сколько миллисекунд полоска видна после полученного урона
  damageVisibleMs: 3000,
};

// Иконка здания в панели стройки: пикселей на клетку
export const BUILD_ICON_TILE = 12;

// Типы событий, накопленных за кадр
export const EVENT_TYPE = {
  SELECT_UNITS: "SELECT_UNITS",
  MOVE_UNITS: "MOVE_UNITS",
  ATTACK_TARGET: "ATTACK_TARGET",
  ZOOM_CAMERA: "ZOOM_CAMERA",
  BUILD_BUILDING: "BUILD_BUILDING",
  SELECT_BUILDING: "SELECT_BUILDING",
  SPAWN_UNIT: "SPAWN_UNIT",
};

// Слои отрисовки
export const Z_INDEX = {
  SELECTION_RECT: 50,
  CONTROLS_PANEL: 100,
  BUILD_PANEL: 100,
  STATS_PANEL: 100,
  HEALTH_BAR: 20,
  GHOST: 10,
};

// Зум: шаг колеса и предела
export const ZOOM_STEP = 1.15;

// Порог в пикселях, после которого зажатая ЛКМ считается перетаскиванием
export const DRAG_THRESHOLD = 4;
