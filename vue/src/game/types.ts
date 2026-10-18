export interface Point {
  x: number
  y: number
}

export interface ObjectType {
  name: string
  width: number
  height: number
  color: string
  wallHeight?: number
  roofHeight?: number
  roofColor?: string
  roofType?: 'pyramid' | 'battlements'
  branchColor?: string   // цвет веток (если применим)
}

// здание: квадрат size × size клеток
export interface BuildingType extends ObjectType {
  size: number // сторона квадрата в клетках сетки
  maxHp: number
}

export interface UnitType extends ObjectType {
  speedPxPerSecond: number
  maxHp: number
  strength: number // урон за один удар
  attackSpeed: number // ударов в секунду
}

// любой игровой объект
export interface GameObject {
  id: number
  type: string
  position: Point
  group: number // 0 - нейтральный объект (например, дерево), 1, 2, 3... - группы игроков
}

// статичный объект на карте
export interface StaticObject extends GameObject {
  type: string // из OBJECT_TYPES
  hp?: number // только у зданий
}

// движущийся объект (юнит)
export interface Unit extends GameObject {
  type: string // из UNIT_TYPES
  hp: number
  target: Point | null // целевая точка при перемещении, null у стоящего объекта
}
