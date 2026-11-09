import { Unit } from './Unit'
import { snapObject, type MapObject } from './occupancy'
import type { Terrain } from './terrain'

type UnitSetup = {
  x: number
  y: number
  group: number
  speed?: number
  terrain?: Terrain
  health?: number
  power?: number
  attackSpeed?: number
}

type ObjectSetup = {
  x: number
  y: number
  size: number
  group: number
}

export type Scenario = {
  name: string
  description: string
  units: UnitSetup[]
  objects: ObjectSetup[]
  aggressiveGroups: number[]
}

const squad = (x: number, y: number, group: number, count: number, extra: Partial<UnitSetup> = {}) =>
  Array.from({ length: count }, (_, index) => ({
    x: x + (index % 2) * 60,
    y: y + Math.floor(index / 2) * 60,
    group,
    ...extra,
  }))

export const scenarios: Scenario[] = [
  {
    name: 'Песочница',
    description: 'Две группы стоят на месте и ждут приказов.',
    units: [
      { x: 80, y: 80, group: 1, speed: 150 },
      { x: -240, y: -120, group: 1, speed: 110 },
      { x: 360, y: -160, group: 2, speed: 190 },
      { x: -200, y: 280, group: 1, speed: 130, terrain: 'water' },
    ],
    objects: [
      { x: 160, y: 80, size: 2, group: 1 },
      { x: 480, y: -280, size: 2, group: 2 },
    ],
    aggressiveGroups: [],
  },
  {
    name: 'Встречный бой',
    description: 'Шесть быстрых бойцов против пяти крепких сходятся в центре и дерутся без участия игрока.',
    units: [
      ...squad(-760, -600, 1, 6, { speed: 170 }),
      ...squad(700, -600, 2, 5, { speed: 110, health: 130, power: 14 }),
    ],
    objects: [],
    aggressiveGroups: [1, 2],
  },
  {
    name: 'Оборона базы',
    description: 'Восемь врагов идут к базе игрока. У защитников меньше бойцов, но они сильнее.',
    units: [
      ...squad(640, -460, 1, 4, { speed: 150, power: 20, health: 140 }),
      ...squad(-1000, -900, 2, 8, { speed: 120 }),
    ],
    objects: [
      { x: 820, y: -620, size: 3, group: 1 },
    ],
    aggressiveGroups: [2],
  },
  {
    name: 'Все против всех',
    description: 'Три базы с отрядами нападают на ближайших врагов, пока не останется одна группа.',
    units: [
      ...squad(-880, -700, 1, 4, { speed: 140 }),
      ...squad(820, -700, 2, 4, { speed: 140 }),
      ...squad(820, 580, 3, 4, { speed: 140 }),
    ],
    objects: [
      { x: -1000, y: -800, size: 2, group: 1 },
      { x: 1000, y: -800, size: 2, group: 2 },
      { x: 1000, y: 800, size: 2, group: 3 },
    ],
    aggressiveGroups: [1, 2, 3],
  },
]

export const createScenario = (scenario: Scenario) => {
  const units = scenario.units.map((setup, index) => {
    const unit = new Unit(index + 1, setup.x, setup.y, setup.speed ?? 140, setup.terrain, setup.group)
    unit.maxHealth = unit.health = setup.health ?? unit.health
    unit.power = setup.power ?? unit.power
    unit.attackSpeed = setup.attackSpeed ?? unit.attackSpeed
    return unit
  })
  const objects: MapObject[] = scenario.objects.map((setup, index) => {
    const health = 150 * setup.size
    return {
      id: index + 1,
      ...snapObject(setup.x, setup.y, setup.size),
      size: setup.size,
      group: setup.group,
      maxHealth: health,
      health,
    }
  })
  return { units, objects }
}
