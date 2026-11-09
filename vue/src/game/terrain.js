// Местность карты. Пока единственный тип — озеро в центре карты; юниты (без флага canSwim)
// и здания не могут находиться на воде. inflation — запас от кромки воды (для проверки пути).
export const isWater = (x, y, inflation = 0) =>
  x > -200 - inflation && x < 200 + inflation &&
  y > -200 - inflation && y < 200 + inflation
