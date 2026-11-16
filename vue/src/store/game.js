// Все элементы карты, очередь событий и состояние партии хранятся во Vuex.
// Компоненты отображают готовое состояние, а TICK применяет события кадра.

import { cameraMatrix, createCamera, panCamera, screenToWorld, worldToScreen, zoomCamera } from '../game/camera.js'
import { containsPoint, createSquareMap } from '../game/map.js'
import { BUILDING_TYPES, canAttack, createBuilding, createUnit, isBuilding, isBuilt, isUnit, typeOf, UNIT_TYPES } from '../game/entities.js'
import { addOrders, ORDER_TYPES } from '../game/events.js'
import { advanceFrame } from '../game/frame.js'
import { createGroup } from '../game/groups.js'
import { createBase, createBattle, DEFAULT_GROUP_COUNT, planAttacks } from '../game/scenarios.js'
import { getGameResult, remainingGroups } from '../game/result.js'
import { canPlaceBuilding, shipyardDirection, snapToGrid } from '../game/placement.js'
import { assignSlots, formationSlots, insideRect, toggleId, toRect } from '../game/selection.js'
import { findSpawnPoint } from '../game/spawn.js'

const MAP_SIZE = 120
const byDepth = (a, b) => a.x + a.y - (b.x + b.y)

// персонаж за зданием, если стоит за его дальней стороной (и не вышел за ближнюю)
const isBehind = (unit, building) => {
  const half = typeOf(building).size / 2
  if (unit.x > building.x + half || unit.y > building.y + half) return false
  return unit.x < building.x - half || unit.y < building.y - half
}

// глубина для порядка рисования: у зданий и далеких персонажей x + y,
// персонажа рядом со зданием ставим строго перед ним или за ним
const drawDepth = (entity, buildings) => {
  if (isBuilding(entity)) return entity.x + entity.y
  return buildings.reduce((depth, building) => {
    const reach = typeOf(building).size / 2 + 1
    if (Math.abs(entity.x - building.x) > reach || Math.abs(entity.y - building.y) > reach) return depth
    const center = building.x + building.y
    return isBehind(entity, building) ? Math.min(depth, center - 0.01) : Math.max(depth, center + 0.01)
  }, entity.x + entity.y)
}

export const PHASES = { READY: 'ready', RUNNING: 'running', PAUSED: 'paused', FINISHED: 'finished' }

export const MUTATIONS = {
  SET_VIEWPORT: 'SET_VIEWPORT',
  SET_CAMERA: 'SET_CAMERA',
  SET_SELECTED: 'SET_SELECTED',
  ADD_ORDERS: 'ADD_ORDERS',
  REMOVE_ENTITY: 'REMOVE_ENTITY',
  NEW_GAME: 'NEW_GAME',
  SET_ORDERS: 'SET_ORDERS',
  SET_PHASE: 'SET_PHASE',
  TICK: 'TICK',
  ADD_ENTITY: 'ADD_ENTITY',
  SET_PLACEMENT: 'SET_PLACEMENT',
  SET_BUILD_GROUP: 'SET_BUILD_GROUP',
  ADD_GROUP: 'ADD_GROUP',
}

// Если была уничтожена последняя сущность предпоследней группы, игра окончена.
const finishIfNeeded = (state) => {
  const result = getGameResult(state.entities)
  if (!result.finished) return
  state.phase = PHASES.FINISHED
  state.winnerGroupId = result.winnerGroupId
  state.events = []
  state.placement = null
}

// новый приказ без очереди: персонаж бросает текущую цель и путь
const resetUnits = (state, unitIds) => {
  state.entities.filter((entity) => unitIds.includes(entity.id)).forEach((unit) => {
    unit.activeEventId = null
    unit.target = null
    unit.path = []
    unit.attackTargetId = null
    unit.attackCooldown = 0
  })
}

const map = createSquareMap(MAP_SIZE)

export default {
  namespaced: true,
  state: () => ({
    map,
    ...createBattle(map), // кланы, все объекты карты и подготовленные очереди
    phase: PHASES.READY,
    winnerGroupId: null,
    elapsedSeconds: 0,
    selectedIds: [],
    camera: createCamera(),
    viewport: { width: 0, height: 0 },
    placement: null,
    buildGroupId: 'group1',
  }),
  getters: {
    getMap: (state) => state.map,
    getUnits: (state) => state.entities.filter(isUnit).sort(byDepth),
    getBuildings: (state) => state.entities.filter(isBuilding).sort(byDepth),
    // здания и персонажи вместе, от дальних к ближним: ближние рисуются поверх
    getObjects: (state) => {
      const buildings = state.entities.filter(isBuilding)
      return state.entities
        .map((entity) => ({ entity, depth: drawDepth(entity, buildings) }))
        .sort((a, b) => a.depth - b.depth)
        .map(({ entity }) => entity)
    },
    getSelected: (state) => state.entities.filter((entity) => state.selectedIds.includes(entity.id)),
    isSelected: (state) => (id) => state.selectedIds.includes(id),
    getUnitEvents: (state) => (id) => state.events.filter((event) => event.unitId === id),
    getGroup: (state) => (id) => state.groups.find((group) => group.id === id),
    getRemainingGroups: (state) => remainingGroups(state.entities),
    getCameraMatrix: (state) => cameraMatrix(state.camera, state.viewport),
    toScreen: (state) => (point) => worldToScreen(state.camera, state.viewport, point),
    getPlacement: (state) => state.placement,
    isPlacementValid: (state) => {
      const placement = state.placement
      if (!placement || placement.x === null || state.phase === PHASES.FINISHED) return false
      return canPlaceBuilding(state.map, state.entities, placement.type, placement)
    },
  },
  mutations: {
    [MUTATIONS.SET_VIEWPORT]: (state, viewport) => {
      state.viewport = viewport
    },
    [MUTATIONS.SET_CAMERA]: (state, camera) => {
      state.camera = camera
    },
    [MUTATIONS.SET_SELECTED]: (state, ids) => {
      state.selectedIds = ids
    },
    [MUTATIONS.ADD_ORDERS]: (state, { unitIds, order, append }) => {
      const next = addOrders(state.events, state.nextEventId, unitIds, order, append)
      state.events = next.events
      state.nextEventId = next.nextEventId
      if (!append) resetUnits(state, unitIds)
    },
    // готовая очередь целиком; unitIds - чьи приказы заменены, они начинают заново
    [MUTATIONS.SET_ORDERS]: (state, { events, nextEventId, unitIds = [] }) => {
      state.events = events
      state.nextEventId = nextEventId
      resetUnits(state, unitIds)
    },
    [MUTATIONS.REMOVE_ENTITY]: (state, id) => {
      state.entities = state.entities.filter((entity) => entity.id !== id)
      state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id)
      state.events = state.events.filter((event) => event.unitId !== id)
      finishIfNeeded(state)
    },
    [MUTATIONS.NEW_GAME]: (state, groupCount) => {
      Object.assign(state, createBattle(state.map, groupCount), {
        phase: PHASES.READY,
        winnerGroupId: null,
        elapsedSeconds: 0,
        selectedIds: [],
        camera: createCamera(),
        placement: null,
        buildGroupId: 'group1',
      })
    },
    [MUTATIONS.SET_PHASE]: (state, phase) => {
      state.phase = phase
    },
    [MUTATIONS.TICK]: (state, dt) => {
      if (state.phase !== PHASES.RUNNING || !Number.isFinite(dt) || dt <= 0) return
      const next = advanceFrame(state.entities, state.events, dt, state.map)
      state.entities = next.entities
      state.events = next.events
      state.elapsedSeconds += dt
      const aliveIds = new Set(state.entities.map((entity) => entity.id))
      state.selectedIds = state.selectedIds.filter((id) => aliveIds.has(id))
      finishIfNeeded(state)
    },
    [MUTATIONS.ADD_ENTITY]: (state, entity) => {
      state.entities = [...state.entities, entity]
      // новый объект мог перекрыть путь; приказ сохраняем, маршрут пересчитаем в кадре
      state.entities.filter(isUnit).forEach((unit) => {
        unit.activeEventId = null
      })
    },
    [MUTATIONS.SET_PLACEMENT]: (state, placement) => {
      state.placement = placement
    },
    [MUTATIONS.SET_BUILD_GROUP]: (state, groupId) => {
      state.buildGroupId = groupId
    },
    [MUTATIONS.ADD_GROUP]: (state, group) => {
      state.groups = [...state.groups, group]
    },
  },
  actions: {
    setViewport: ({ commit }, viewport) => {
      commit(MUTATIONS.SET_VIEWPORT, viewport)
    },
    panCamera: ({ commit, state }, delta) => {
      commit(MUTATIONS.SET_CAMERA, panCamera(state.camera, state.viewport, delta, state.map.bounds))
    },
    zoomCamera: ({ commit, state }, zoom) => {
      commit(MUTATIONS.SET_CAMERA, zoomCamera(state.camera, state.viewport, zoom, state.map.bounds))
    },
    // клик по миникарте: точка мира встает в центр экрана
    centerCamera: ({ commit, state }, point) => {
      const screen = worldToScreen(state.camera, state.viewport, point)
      const delta = { dx: screen.x - state.viewport.width / 2, dy: screen.y - state.viewport.height / 2 }
      commit(MUTATIONS.SET_CAMERA, panCamera(state.camera, state.viewport, delta, state.map.bounds))
    },
    select: ({ commit, state }, id) => {
      const exists = state.entities.some((entity) => entity.id === id)
      commit(MUTATIONS.SET_SELECTED, id !== null && exists ? [id] : [])
    },
    // shift + клик: добавить объект к выбору или убрать из него
    toggleSelected: ({ commit, state }, id) => {
      if (state.entities.some((entity) => entity.id === id)) commit(MUTATIONS.SET_SELECTED, toggleId(state.selectedIds, id))
    },
    // рамка (углы в точках экрана): выбираем персонажей внутри; add (shift) - к уже выбранным
    selectArea: ({ commit, state }, { from, to, add }) => {
      const rect = toRect(from, to)
      const ids = state.entities
        .filter((entity) => isUnit(entity) && insideRect(rect, worldToScreen(state.camera, state.viewport, entity)))
        .map((entity) => entity.id)
      commit(MUTATIONS.SET_SELECTED, add ? [...new Set([...state.selectedIds, ...ids])] : ids)
    },
    moveSelected: ({ commit, state, getters }, { point, append = false }) => {
      if (state.phase === PHASES.FINISHED) return
      const target = screenToWorld(state.camera, state.viewport, point)
      if (!containsPoint(state.map, target)) return
      const units = getters.getSelected.filter(isUnit)
      // сухопутные и водные персонажи получают места только на своей местности
      const groupKey = (unit) => `${typeOf(unit).terrain}:${!!typeOf(unit).ship}`
      const groups = [...new Set(units.map(groupKey))]
      groups.forEach((key) => {
        const group = units.filter((unit) => groupKey(unit) === key)
        const { terrain, ship } = typeOf(group[0])
        const radius = Math.max(...group.map((unit) => typeOf(unit).size / 2))
        const groupIds = group.map((unit) => unit.id)
        // место в конце очереди занято уже при подготовке приказов, до первого кадра
        const obstacles = state.entities.map((entity) => {
          const last = state.events.filter((event) => event.unitId === entity.id).at(-1)
          return last?.type === ORDER_TYPES.MOVE ? { ...entity, path: [last.target] } : entity
        })
        const slots = formationSlots(state.map, obstacles, target, group.length, radius, groupIds, terrain, ship)
        assignSlots(group, slots, target).forEach(({ unit, point }) => {
          if (point) commit(MUTATIONS.ADD_ORDERS, {
            unitIds: [unit.id], order: { type: ORDER_TYPES.MOVE, target: point, groupIds }, append,
          })
          else if (!append) {
            // места не хватило - отменяем текущую очередь и оставляем персонажа на месте
            commit(MUTATIONS.ADD_ORDERS, { unitIds: [unit.id], order: { type: ORDER_TYPES.MOVE, target: { x: unit.x, y: unit.y } }, append: false })
          }
        })
      })
    },
    attackSelected: ({ commit, state, getters }, { targetId, append = false }) => {
      if (state.phase === PHASES.FINISHED) return
      const enemy = state.entities.find((entity) => entity.id === targetId)
      // Единственная проверка враждебности — разные идентификаторы групп.
      const unitIds = getters.getSelected.filter((unit) => canAttack(unit, enemy)).map((unit) => unit.id)
      if (unitIds.length) commit(MUTATIONS.ADD_ORDERS, { unitIds, order: { type: ORDER_TYPES.ATTACK, targetId }, append })
    },
    selfDestruct: ({ commit, state }, id) => {
      if (state.phase === PHASES.FINISHED) return
      const entity = state.entities.find((item) => item.id === id)
      if (entity && isUnit(entity)) commit(MUTATIONS.REMOVE_ENTITY, id)
    },
    // новая партия; без числа - столько же кланов, сколько сейчас
    newGame: ({ commit, state }, groupCount = state.groups.length || DEFAULT_GROUP_COUNT) => {
      commit(MUTATIONS.NEW_GAME, groupCount)
    },
    // выбранные бойцы идут на все объекты клана groupId, ближайшие первыми; старые приказы заменяются
    attackGroup: ({ commit, state, getters }, groupId) => {
      if (state.phase === PHASES.FINISHED) return
      const units = getters.getSelected.filter((unit) => isUnit(unit) && unit.groupId !== groupId)
      const targets = state.entities.filter((entity) => entity.groupId === groupId && entity.hp > 0)
      if (!units.length || !targets.length) return
      const next = planAttacks(state.events, state.nextEventId, units, targets, false)
      commit(MUTATIONS.SET_ORDERS, { ...next, unitIds: units.map((unit) => unit.id) })
    },
    start: ({ commit, state }) => {
      if ([PHASES.READY, PHASES.PAUSED].includes(state.phase)) commit(MUTATIONS.SET_PHASE, PHASES.RUNNING)
    },
    pause: ({ commit, state }) => {
      if (state.phase === PHASES.RUNNING) commit(MUTATIONS.SET_PHASE, PHASES.PAUSED)
    },
    togglePause: ({ dispatch, state }) => {
      if (state.phase === PHASES.RUNNING) dispatch('pause')
      else dispatch('start')
    },
    tick: ({ commit }, dt) => {
      commit(MUTATIONS.TICK, dt)
    },
    setBuildGroup: ({ commit, state }, groupId) => {
      if (state.groups.some((group) => group.id === groupId)) commit(MUTATIONS.SET_BUILD_GROUP, groupId)
    },
    // новый клан: база на свободном месте, номер больше всех прежних, поэтому id не повторяется
    // он сразу в общем бою: его бойцы идут на всех, а все прежние бойцы добавляют его в конец своих очередей
    addGroup: ({ commit, dispatch, state }) => {
      if (state.phase === PHASES.FINISHED) return
      const index = Math.max(0, ...state.groups.map((group) => Number(group.id.replace('group', '')))) + 1
      const group = createGroup(index)
      const base = createBase(state.map, state.entities, group, index)
      if (!base.length) return
      const others = state.entities.filter(isUnit)
      commit(MUTATIONS.ADD_GROUP, group)
      base.forEach((entity) => commit(MUTATIONS.ADD_ENTITY, entity))
      const joined = planAttacks(state.events, state.nextEventId, base.filter(isUnit), state.entities)
      commit(MUTATIONS.SET_ORDERS, planAttacks(joined.events, joined.nextEventId, others, base))
      commit(MUTATIONS.SET_BUILD_GROUP, group.id)
      dispatch('centerCamera', base[0])
    },
    // нажали кнопку здания: начинаем стройку, а если это здание уже строим - отменяем
    startPlacement: ({ commit, state }, type) => {
      if (state.phase === PHASES.FINISHED) return
      commit(MUTATIONS.SET_PLACEMENT, state.placement?.type === type ? null : { type, x: null, y: null })
    },
    movePlacement: ({ commit, state }, screenPoint) => {
      const point = screenToWorld(state.camera, state.viewport, screenPoint)
      const cell = snapToGrid(state.placement.type, point)
      commit(MUTATIONS.SET_PLACEMENT, { ...state.placement, ...cell })
    },
    cancelPlacement: ({ commit }) => {
      commit(MUTATIONS.SET_PLACEMENT, null)
    },
    // строим для выбранной группы; keep - не выходить из стройки (shift)
    placeBuilding: ({ commit, state, getters }, { keep = false } = {}) => {
      if (state.phase === PHASES.FINISHED || !getters.isPlacementValid) return
      const { type, x, y } = state.placement
      // корабль появляется сразу, здание начинает строиться с нуля
      const entity = UNIT_TYPES[type]?.ship
        ? createUnit(type, x, y, state.buildGroupId)
        : { ...createBuilding(type, x, y, state.buildGroupId, type === 'shipyard' ? shipyardDirection(state.map, { x, y }) : undefined), progress: 0 }
      commit(MUTATIONS.ADD_ENTITY, entity)
      if (!keep) commit(MUTATIONS.SET_PLACEMENT, null)
    },
    // каждый следующий персонаж ищет место с учетом предыдущих и наследует группу здания
    spawnUnits: ({ commit, state }, { id, count = 1, type }) => {
      if (state.phase === PHASES.FINISHED) return
      const building = state.entities.find((entity) => entity.id === id && isBuilding(entity))
      if (!building || !isBuilt(building)) return // недостроенное здание никого не создает
      const spawns = building && BUILDING_TYPES[building.type].spawns
      const types = Array.isArray(spawns) ? spawns : spawns ? [spawns] : []
      const unitType = type ?? types[0]
      if (!types.includes(unitType)) return
      for (let n = 0; n < count; n++) {
        const point = findSpawnPoint(state.map, state.entities, building, unitType)
        if (!point) return
        commit(MUTATIONS.ADD_ENTITY, createUnit(unitType, point.x, point.y, building.groupId))
      }
    },
  },
}
