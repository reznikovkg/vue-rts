export interface Point {
  x: number
  y: number
}

export interface ObjectType {
  name: string
  width: number
  height: number
  color: string
}

export interface UnitType extends ObjectType {
  speedPxPerSecond: number
}

// любой игровой объект
export interface GameObject extends Point {
  id: number
  type: string
}

// статичный объект на карте
export interface StaticObject extends GameObject {
  type: string // из OBJECT_TYPES
}

// движущийся объект (юнит)
export interface Unit extends GameObject {
  type: string // из UNIT_TYPES
  target: Point | null // целевая точка при перемещении, null у стоящего объекта
}
