import { OBJECT_TYPES, UNIT_TYPES } from './config'
import type { StaticObject, Unit } from './types'

export const ATTACK_RANGE = 50 // минимальная дальность атаки между центрами юнитов
export const CLICK_RADIUS = 20 // радиус поиска юнита под правым кликом

// Дальность атаки пары юнитов: корпуса не дают сблизиться центрам ближе
// полусуммы ширин, а путь заканчивается на центре свободной клетки (клетка 50).
// Поэтому у пар шире базы дальность - контакт корпусов плюс клетка запаса,
// иначе корабли останавливаются на контакте, не добрав до дальности атаки
export const attackRange = (unit: Unit, target: Unit): number => {
  const contact = (UNIT_TYPES[unit.type].width + UNIT_TYPES[target.type].width) / 2
  return contact <= ATTACK_RANGE ? ATTACK_RANGE : contact + ATTACK_RANGE
}

// Здание можно атаковать: это статический объект с hp (у деревьев и мостов hp нет)
export const isAttackableBuilding = (object: StaticObject): boolean =>
  Object.hasOwn(OBJECT_TYPES, object.type) && object.hp !== undefined

// Расстояние от центра юнита до стен здания
export const distanceToBuilding = (unit: Unit, building: StaticObject): number => {
  const type = OBJECT_TYPES[building.type]
  const dx = Math.max(Math.abs(unit.position.x - building.position.x) - type.width / 2, 0)
  const dy = Math.max(Math.abs(unit.position.y - building.position.y) - type.height / 2, 0)
  return Math.hypot(dx, dy)
}
