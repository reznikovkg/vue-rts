export interface Point {
  x: number
  y: number
}

// тип местности; горы непроходимы для всех юнитов
export type TerrainType = 'land' | 'water' | 'mountain'

// тип зоны на карте: озеро и река (оба - вода для юнитов) или горы;
// песчаный берег не задаётся вручную - он генерируется вокруг воды при сборке карты
export type TerrainZoneType = 'lake' | 'river' | 'mountain'

// прямоугольная зона местности из клеток MAP.cell × MAP.cell:
// col/row - левый верхний угол от левого верхнего угла карты, cols/rows - размер в клетках
export interface TerrainZone {
  type: TerrainZoneType
  col: number
  row: number
  cols: number
  rows: number
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
  image?: string         // картинка верха объекта вместо цвета: имя файла из assets (настил моста)
  passable?: boolean     // true — по объекту можно ходить: он не препятствие, вода под ним проходима (мост)
}

// Здание: квадрат size × size клеток
export interface BuildingType extends ObjectType {
  size: number // сторона квадрата в клетках сетки
  maxHp: number
  spawns?: string[]
  maxPerGroup: number // максимум живых зданий этого типа у одной группы: строительство запрещается
  buildSeconds: number // сколько секунд здание строится после установки
}

export interface UnitType extends ObjectType {
  speedPxPerSecond: number
  maxHp: number
  strength: number // урон за один удар
  attackSpeed: number // ударов в секунду
  buildSeconds: number // сколько секунд здание создаёт юнита этого типа
  maxPerGroup: number // максимум живых юнитов этого типа у одной группы: спавн останавливается
  terrain?: TerrainType | 'both' // где юнит может ходить, по умолчанию 'both' - везде
  shape?: 'human' | 'boat' | 'warship' // как рисовать юнит, по умолчанию 'human' - человечек
  footprint?: number // сторона квадрата столкновений; по умолчанию width (у длинных кораблей уже спрайта)
}

// Задание производства: здание buildingId создаёт юнита типа unitType,
// прошло elapsed из duration секунд (створ world/updateProduction, юнит появится у здания)
export interface ProductionJob {
  buildingId: number
  unitType: string
  elapsed: number
  duration: number
}

// Задание строительства: здание objectId строится, прошло elapsed из duration секунд
// (стор world/updateConstruction снимает задание, когда время выйдет; здание погибло - снято в destroyObject)
export interface ConstructionJob {
  objectId: number
  elapsed: number
  duration: number
}

// Любой игровой объект
export interface GameObject {
  id: number
  type: string
  position: Point
  group: number // 0 - нейтральный объект (например, дерево), 1, 2, 3... - группы игроков
}

// Статичный объект на карте
export interface StaticObject extends GameObject {
  type: string // из OBJECT_TYPES
  hp?: number // только у зданий
}

// Движущийся объект (юнит)
export interface Unit extends GameObject {
  type: string // из UNIT_TYPES
  hp: number
  // Маршрут, проложенный событием move (стор events): куда юнит идёт сейчас, null у стоящего.
  // Сам приказ хранится в событии, здесь только состояние движения
  target: Point | null
  path?: Point[] | null // точки пути в обход препятствий, последняя совпадает с target
  blockedFor?: number // время ожидания до повторного поиска пути, секунды
  targetId?: number | null // цель атаки (id юнита или здания), null - обычное движение
  isAttacking?: boolean // true, пока юнит в режиме атаки
  facing?: number // куда смотрит нос (лицо), радианы в мировых координатах: 0 - +x, PI/2 - +y
}

// Событие - действие объекта: «идти в точку», «атаковать цель» (П10) и т.д.
// Игрок и сценарии создают события, а игровой цикл каждый кадр применяет активные события к элементам карты.
export type GameEventType = 'move' | 'attack'

// active - выполняется сейчас; waiting - ждёт завершения предыдущего события в цепочке (П12)
export type GameEventStatus = 'active' | 'waiting'

export interface GameEvent {
  id: number
  type: GameEventType
  actorId: number // кто выполняет: id юнита
  target: Point | null // точка назначения (move, attack - куда идти)
  targetId: number | null // объект-цель атаки: юнит или здание
  status: GameEventStatus
  started: boolean // маршрут уже проложен (move, attack)
  nextId: number | null // событие, которое начнётся после этого (П12)
}

// Событие сценария: в момент at (секунды) юнит идёт в точку target
export interface ScenarioEvent {
  at: number
  unitId: number
  target: Point
}

// Сценарий: расстановка на старте, зоны местности и события по времени
export interface Scenario {
  id: string
  name: string
  objects: StaticObject[]
  units: Unit[]
  terrain: TerrainZone[] // зоны местности этого сценария в клетках; [] - чистая суша
  events: ScenarioEvent[]
}

// Кнопка в панели команд
export interface Command {
  id: string
  label: string
  action: string // название action в сторе
  payload?: string
}
