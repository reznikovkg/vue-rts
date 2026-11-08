export const GRID_STEP = 48;
export const ISO_ROTATION_DEG = 45;
export const ISO_SCALE_Y = 0.5;

export const MAP_TILES = 30;
export const MAP_SIZE = MAP_TILES * GRID_STEP;

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1.6;
export const CAMERA_SPEED = 1650;

export const UNIT_RADIUS = 14;
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

// Здания квадратные NxN: size — сторона в клетках сетки, hp — очки жизни
export const BUILDING_TYPES = [
  { type: "house", label: "Дом", size: 1, hp: 200 },
  { type: "barrack", label: "Казарма", size: 2, hp: 400 },
  { type: "fort", label: "Крепость", size: 3, hp: 800 },
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
