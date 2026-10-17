// Изометрическая (ромбовидная) проекция.
//
// Игровой мир - это обычная плоская система координат (worldX, worldY).
// Вся логика (движение, скорость, расстояние) считается в ней.
// Только при отрисовке мы переводим мировые координаты в координаты экрана.
// Никакого rotate/skew у элементов нет, поэтому содержимое клеток не искажается.

// Клетка мира 1x1 превращается в ромб шириной 1 и высотой 0.5 (классика 2:1).
export const ISO_X_RATIO = 0.5;
export const ISO_Y_RATIO = 0.25;

export interface Point {
  x: number;
  y: number;
}

// мир -> экран (чтобы нарисовать объект)
export const worldToScreen = (worldX: number, worldY: number, offsetX = 0): Point => {
  return {
    x: (worldX - worldY) * ISO_X_RATIO + offsetX,
    y: (worldX + worldY) * ISO_Y_RATIO,
  };
};

// экран -> мир (чтобы понять, куда игрок кликнул на самом деле)
export const screenToWorld = (screenX: number, screenY: number, offsetX = 0): Point => {
  const diff = (screenX - offsetX) / ISO_X_RATIO; // worldX - worldY
  const sum = screenY / ISO_Y_RATIO; // worldX + worldY

  return {
    x: (sum + diff) / 2,
    y: (sum - diff) / 2,
  };
};
