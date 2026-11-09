// Подготовленные сценарии: расстановка зданий и юнитов по группам.
// Объект задается строкой [kind, TYPE_KEY, x, y, group]. Запуск сценария пересоздаёт состояние модуля game.
import { createMap, worldToScreen } from './map.js'
import { UNIT_TYPES, BUILDING_TYPES, createUnit, createBuilding } from './objects.js'

export const SCENARIOS = [
  {
    id: 'sandbox',
    name: 'Песочница',
    description: 'Своя база и две вражеские группы рядом.',
    objects: [
      ['building', 'TOWN_CENTER', -600, -400, 1],
      ['building', 'HOUSE', -800, -200, 1],
      ['building', 'BARRACKS', -500, -100, 1],
      ['unit', 'VILLAGER', -450, -300, 1],
      ['unit', 'VILLAGER', -400, -350, 1],
      ['unit', 'VILLAGER', -350, -400, 1],
      ['unit', 'MILITIA', -500, -200, 1],
      ['unit', 'MILITIA', -450, -10, 1],
      ['unit', 'SCOUT', -500, -600, 1],
      // Группа 2 — справа
      ['building', 'TOWN_CENTER', 700, -300, 2],
      ['building', 'BARRACKS', 760, 0, 2],
      ['unit', 'VILLAGER', 520, -320, 2],
      ['unit', 'VILLAGER', 520, -260, 2],
      ['unit', 'MILITIA', 560, -80, 2],
      ['unit', 'MILITIA', 560, -20, 2],
      ['unit', 'MILITIA', 600, 40, 2],
      // Группа 3 — снизу
      ['building', 'HOUSE', -200, 600, 3],
      ['building', 'BARRACKS', 80, 640, 3],
      ['unit', 'MILITIA', -60, 480, 3],
      ['unit', 'MILITIA', 0, 480, 3],
      ['unit', 'SCOUT', 60, 480, 3],
      ['unit', 'SCOUT', 120, 480, 3],
    ],
  },
  {
    id: 'duel',
    name: 'Дуэль',
    description: 'Две группы в противоположных углах карты.',
    objects: [
      // Группа 1 — верхний угол
      ['building', 'TOWN_CENTER', -1150, -950, 1],
      ['building', 'BARRACKS', -1350, -770, 1],
      ['building', 'HOUSE', -970, -1130, 1],
      ['unit', 'VILLAGER', -950, -850, 1],
      ['unit', 'MILITIA', -890, -810, 1],
      ['unit', 'MILITIA', -1000, -800, 1],
      ['unit', 'SCOUT', -830, -900, 1],
      // Группа 2 — нижний угол
      ['building', 'TOWN_CENTER', 1150, 950, 2],
      ['building', 'BARRACKS', 1350, 770, 2],
      ['building', 'HOUSE', 970, 1130, 2],
      ['unit', 'VILLAGER', 950, 850, 2],
      ['unit', 'MILITIA', 890, 810, 2],
      ['unit', 'MILITIA', 1000, 800, 2],
      ['unit', 'SCOUT', 830, 900, 2],
    ],
  },
  {
    id: 'threeway',
    name: 'Три группы',
    description: 'Три группы у трёх углов ромба карты.',
    objects: [
      // Группа 1 — верхний угол
      ['building', 'TOWN_CENTER', -1150, -950, 1],
      ['building', 'HOUSE', -1330, -790, 1],
      ['unit', 'VILLAGER', -900, -930, 1],
      ['unit', 'MILITIA', -960, -870, 1],
      ['unit', 'SCOUT', -840, -1010, 1],
      // Группа 2 — левый угол
      ['building', 'TOWN_CENTER', -1150, 950, 2],
      ['building', 'HOUSE', -1330, 790, 2],
      ['unit', 'VILLAGER', -900, 930, 2],
      ['unit', 'MILITIA', -960, 870, 2],
      ['unit', 'SCOUT', -840, 1010, 2],
      // Группа 3 — нижний угол
      ['building', 'TOWN_CENTER', 1150, 950, 3],
      ['building', 'HOUSE', 1330, 790, 3],
      ['unit', 'VILLAGER', 900, 930, 3],
      ['unit', 'MILITIA', 960, 870, 3],
      ['unit', 'SCOUT', 840, 1010, 3],
    ],
  },
]

// Шесть групп по кругу: у каждой городской центр, казармы и отряд из шести юнитов
const createCircleOfGroups = (count, radius) => Array.from({ length: count }, (_, index) => {
  const group = index + 1
  const angle = (index / count) * 2 * Math.PI
  const x = Math.round(Math.cos(angle) * radius)
  const y = Math.round(Math.sin(angle) * radius)
  const toCenter = { x: -Math.cos(angle), y: -Math.sin(angle) }
  const at = (distance, side) => [
    Math.round(x + toCenter.x * distance - toCenter.y * side),
    Math.round(y + toCenter.y * distance + toCenter.x * side),
  ]
  return [
    ['building', 'TOWN_CENTER', x, y, group],
    ['building', 'BARRACKS', ...at(0, 200), group],
    ['unit', 'VILLAGER', ...at(140, -40), group],
    ['unit', 'VILLAGER', ...at(140, 0), group],
    ['unit', 'MILITIA', ...at(140, 40), group],
    ['unit', 'MILITIA', ...at(180, -40), group],
    ['unit', 'MILITIA', ...at(180, 0), group],
    ['unit', 'SCOUT', ...at(180, 40), group],
  ]
}).flat()

SCENARIOS.push({
  id: 'sixway',
  name: 'Шесть групп',
  description: 'Шесть групп по кругу, у каждой база и отряд.',
  objects: createCircleOfGroups(6, 900),
})

export const getScenario = (id) => SCENARIOS.find(scenario => scenario.id === id)

// Начальное состояние модуля game для сценария
export const createScenarioState = (id) => {
  const scenario = getScenario(id) ?? SCENARIOS[0]
  const elements = scenario.objects.map(([kind, type, x, y, group]) => kind === 'unit'
    ? createUnit(UNIT_TYPES[type], x, y, group)
    : createBuilding(BUILDING_TYPES[type], x, y, group))
  const groups = new Set(elements.map(element => element.group))
  return {
    map: createMap(3200, 2400, 40),
    scenarioId: scenario.id,
    // Сколько групп было на карте при запуске; конец игры проверяется только если их было несколько
    startedGroups: groups.size,
    // Точка экрана, на которую камера встаёт при запуске сценария — центр базы группы 1
    homeView: createHomeView(elements, 40),
    elements,
    events: [],
    selectedIds: [],
    paused: false,
    gameOver: null,
  }
}

// Центр масс объектов группы 1 в экранных (изометрических) координатах
const createHomeView = (elements, gridSize) => {
  const home = elements.filter(element => element.group === 1)
  const source = home.length ? home : elements
  if (!source.length) return { x: 0, y: 0 }
  const x = source.reduce((sum, element) => sum + element.x, 0) / source.length
  const y = source.reduce((sum, element) => sum + element.y, 0) / source.length
  return worldToScreen(x, y, gridSize)
}
