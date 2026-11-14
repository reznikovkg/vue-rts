import { OBJECT_TYPES, UNIT_TYPES } from '@/game/config'
import { ATTACK_RANGE, CLICK_RADIUS, attackRange, distanceToBuilding, isAttackableBuilding } from '@/game/combat'
import { clampUnitTarget } from '@/game/movement'
import { unitFootprint } from '@/game/spatial'

// Хранилище текущих событий (формат - GameEvent в game/types.ts).
// Игрок и сценарии только создают события, а применяет их к элементам карты игровой цикл (engine/tick):
// событие move при старте прокладывает юниту маршрут (A* из game/pathfinding), а когда юнит дошёл - завершается.
// Событие attack гонится за целью (юнит или здание): в радиусе атаки юнит стоит и бьёт, завершается смертью цели.

const MUTATIONS = {
  ADD: 'ADD',
  REMOVE: 'REMOVE',
  REMOVE_BY_ACTOR: 'REMOVE_BY_ACTOR',
  CLEAR: 'CLEAR',
  SET_STARTED: 'SET_STARTED',
  SET_STATUS: 'SET_STATUS',
  SET_NEXT: 'SET_NEXT',
  SET_TARGET: 'SET_TARGET',
  SET_EVENT_TARGET: 'SET_EVENT_TARGET',
}

export const EVENT_STATUS = {
  ACTIVE: 'active',
  WAITING: 'waiting',
}

// расстояние между юнитами в строю
const FORMATION_STEP = 40

// сколько маршрутов прокладываем за один кадр: дальний A* заметно дороже мгновенного,
// и большая группа растягивается на пару кадров вместо одного длинного зависания
const ROUTES_PER_TICK = 4

// Точки для группы юнитов вокруг point: квадратный строй, чтобы юниты не сбивались в одну точку
const formationTargets = (units, point) => {
  const columns = Math.ceil(Math.sqrt(units.length))
  const rows = Math.ceil(units.length / columns)
  const spacing = Math.max(FORMATION_STEP, ...units.map((unit) => UNIT_TYPES[unit.type].width + 8))
  return units.map((unit, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    return clampUnitTarget(unit, {
      x: point.x + (column - (columns - 1) / 2) * spacing,
      y: point.y + (row - (rows - 1) / 2) * spacing,
    })
  })
}

export default {
  namespaced: true,
  state () {
    return {
      list: [],
      nextId: 1,
    }
  },
  getters: {
    getAll: (state) => state.list,
    // события, которые выполняются сейчас
    getActive: (state) => state.list.filter((e) => e.status === EVENT_STATUS.ACTIVE),
    // что объект делает сейчас (или null)
    getCurrent: (state) => (actorId) =>
      state.list.find((e) => e.actorId === actorId && e.status === EVENT_STATUS.ACTIVE) ?? null,
    // все события объекта по порядку выполнения: от текущего по ссылкам nextId
    getByActor: (state) => (actorId) => {
      const events = state.list.filter((e) => e.actorId === actorId)
      const result = []
      let event = events.find((e) => !events.some((other) => other.nextId === e.id))
      while (event) {
        result.push(event)
        event = events.find((e) => e.id === result[result.length - 1].nextId)
      }
      return result
    },
  },
  mutations: {
    [MUTATIONS.ADD]: (state, event) => {
      state.list.push({ ...event, id: state.nextId })
      state.nextId++
    },
    [MUTATIONS.REMOVE]: (state, id) => {
      state.list = state.list.filter((e) => e.id !== id)
    },
    [MUTATIONS.REMOVE_BY_ACTOR]: (state, actorId) => {
      state.list = state.list.filter((e) => e.actorId !== actorId)
    },
    [MUTATIONS.CLEAR]: (state) => {
      state.list = []
    },
    [MUTATIONS.SET_STATUS]: (state, { id, status }) => {
      const event = state.list.find((e) => e.id === id)
      if (event) {
        event.status = status
      }
    },
    [MUTATIONS.SET_NEXT]: (state, { id, nextId }) => {
      const event = state.list.find((e) => e.id === id)
      if (event) {
        event.nextId = nextId
      }
    },
    // новая точка назначения: маршрут к ней проложится заново при старте события
    [MUTATIONS.SET_TARGET]: (state, { id, target }) => {
      const event = state.list.find((e) => e.id === id)
      if (event) {
        event.target = target
        event.started = false
      }
    },
    [MUTATIONS.SET_STARTED]: (state, id) => {
      const event = state.list.find((e) => e.id === id)
      if (event) {
        event.started = true
      }
    },
    // цель события сдвинулась: атака догоняет цель по её текущей позиции
    [MUTATIONS.SET_EVENT_TARGET]: (state, { id, target }) => {
      const event = state.list.find((e) => e.id === id)
      if (event) {
        event.target = target
      }
    },
  },
  actions: {
    // Новое событие объекта.
    // append = false: прежние события объекта отменяются, новое начинается сразу.
    // append = true (Shift): событие встаёт в конец очереди и начнётся, когда завершится предыдущее
    create: ({ state, commit, getters }, { type, actorId, target = null, targetId = null, append = false }) => {
      const id = state.nextId
      if (!append) {
        commit(MUTATIONS.REMOVE_BY_ACTOR, actorId)
      }
      const queue = append ? getters.getByActor(actorId) : []
      const last = queue[queue.length - 1]
      const status = last ? EVENT_STATUS.WAITING : EVENT_STATUS.ACTIVE
      commit(MUTATIONS.ADD, { type, actorId, target, targetId, status, started: false, nextId: null })
      if (last) {
        commit(MUTATIONS.SET_NEXT, { id: last.id, nextId: id })
      }
      return id
    },
    // Приказ «идти в точку» группе юнитов (ПКМ игрока или событие сценария): каждому своя точка в строю.
    // append - добавить точку в конец очереди (Shift + ПКМ)
    orderMove: ({ dispatch, rootGetters }, { actorIds, point, append = false }) => {
      if (!rootGetters['game/isRunning'] || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
        return
      }
      const units = actorIds.map((id) => rootGetters['world/getById'](id)).filter((unit) => unit && unit.type in UNIT_TYPES)
      if (!units.length) {
        return
      }
      const targets = formationTargets(units, point)
      units.forEach((unit, index) => {
        dispatch('create', { type: 'move', actorId: unit.id, target: targets[index], append })
      })
      dispatch('startPending')
    },
    // Перенести точку последнего приказа move группы (ведение за курсором при зажатой ПКМ).
    // Очередь не трогаем: меняется только последняя точка. Юнит без приказов получает новый приказ
    retargetMove: ({ getters, commit, dispatch, rootGetters }, { actorIds, point }) => {
      if (!rootGetters['game/isRunning'] || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
        return
      }
      const units = actorIds.map((id) => rootGetters['world/getById'](id)).filter((unit) => unit && unit.type in UNIT_TYPES)
      const targets = formationTargets(units, point)
      units.forEach((unit, index) => {
        const queue = getters.getByActor(unit.id)
        const last = queue[queue.length - 1]
        if (last?.type === 'move') {
          commit(MUTATIONS.SET_TARGET, { id: last.id, target: targets[index] })
        } else {
          dispatch('create', { type: 'move', actorId: unit.id, target: targets[index], append: true })
        }
      })
      dispatch('startPending')
    },
    // Приказ по ПКМ игрока: чужой юнит под курсором или чужое здание - приказ атаки, иначе идём к точке строем.
    // append - добавить приказ в конец очереди (Shift + ПКМ)
    orderByClick: ({ dispatch, rootGetters }, { actorIds, point, append = false }) => {
      if (!rootGetters['game/isRunning'] || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
        return
      }
      const units = actorIds.map((id) => rootGetters['world/getById'](id)).filter((unit) => unit && unit.type in UNIT_TYPES)
      if (!units.length) {
        return
      }
      // Цель под курсором ищется один раз до цикла: юнит в радиусе клика,
      // иначе здание, внутри основания которого попал клик
      const clickedUnit = rootGetters['world/getUnits'].find((u) =>
        Math.abs(u.position.x - point.x) < CLICK_RADIUS && Math.abs(u.position.y - point.y) < CLICK_RADIUS)
      const clickedBuilding = clickedUnit ? null : rootGetters['world/getObjects'].find((o) => isAttackableBuilding(o) &&
        Math.abs(o.position.x - point.x) < OBJECT_TYPES[o.type].width / 2 &&
        Math.abs(o.position.y - point.y) < OBJECT_TYPES[o.type].height / 2)
      const clickedTarget = clickedUnit ?? clickedBuilding

      const attackers = clickedTarget ? units.filter((unit) => clickedTarget.group !== unit.group) : []
      // строю остаются только идущие: места в строю не уходят атакующим
      const movers = units.filter((unit) => !attackers.includes(unit))
      attackers.forEach((unit) => {
        dispatch('create', { type: 'attack', actorId: unit.id, target: { ...clickedTarget.position }, targetId: clickedTarget.id, append })
      })
      if (movers.length) {
        const targets = formationTargets(movers, point)
        movers.forEach((unit, index) => {
          dispatch('create', { type: 'move', actorId: unit.id, target: targets[index], append })
        })
      }
      dispatch('startPending')
    },
    // Запустить новые активные события движения (move и attack): проложить маршрут.
    // Юниты, начавшие движение в одном кадре, не получают одно и то же место назначения (reserved).
    // Остальные события подберёт следующий кадр: цикл зовёт startPending каждый тик
    startPending: ({ getters, commit, rootGetters }) => {
      const reserved = []
      const pending = getters.getActive.filter((e) => (e.type === 'move' || e.type === 'attack') && !e.started)
      for (const event of pending.slice(0, ROUTES_PER_TICK)) {
        commit('world/SET_UNIT_TARGET', {
          id: event.actorId,
          target: event.target,
          targetId: event.targetId,
          isAttacking: event.type === 'attack',
          reserved,
        }, { root: true })
        commit(MUTATIONS.SET_STARTED, event.id)
        const unit = rootGetters['world/getById'](event.actorId)
        if (unit?.target) {
          reserved.push({ ...unitFootprint(unit), position: unit.target })
        }
      }
    },
    // Каждый кадр до движения - атака не зависит от приказов на движение:
    // догоняем цель, в радиусе атаки стоим и бьём
    updateAttacks: ({ getters, commit, dispatch, rootGetters }, secondsPassed) => {
      for (const event of getters.getActive.filter((e) => e.type === 'attack')) {
        const unit = rootGetters['world/getById'](event.actorId)
        const target = rootGetters['world/getById'](event.targetId)
        const isUnitTarget = !!target && target.type in UNIT_TYPES
        // цель-здание: статический объект с hp (деревья и мосты атаковать нельзя)
        const isBuildingTarget = !!target && isAttackableBuilding(target)
        if (!unit || !(isUnitTarget || isBuildingTarget)) {
          // Юнит пропал или цель умерла - выходим из режима атаки
          if (unit) commit('world/STOP_ATTACK', unit.id, { root: true })
          dispatch('complete', event.id)
          continue
        }
        // Юнит в радиусе, если дошёл до корпуса цели; здание мерим до стен -
        // центр большого здания дальше от стен, чем запас дальности атаки
        const inRange = isUnitTarget
          ? Math.hypot(unit.position.x - target.position.x, unit.position.y - target.position.y) <= attackRange(unit, target)
          : distanceToBuilding(unit, target) <= ATTACK_RANGE
        if (inRange) {
          // В радиусе атаки стоим и бьём, приказ движения больше не нужен
          if (unit.target) commit('world/STOP_UNIT', unit.id, { root: true })
          const stats = UNIT_TYPES[unit.type]
          commit('world/APPLY_DAMAGE', {
            targetId: target.id,
            damage: stats.strength * stats.attackSpeed * secondsPassed,
          }, { root: true })
          continue
        }
        // Цель жива, но отошла от точки приказа дальше дальности атаки - догоняем по текущей позиции.
        const goal = event.target
        if (!goal || Math.hypot(target.position.x - goal.x, target.position.y - goal.y) > ATTACK_RANGE) {
          commit(MUTATIONS.SET_EVENT_TARGET, { id: event.id, target: { ...target.position } })
          commit('world/SET_UNIT_TARGET', {
            id: unit.id,
            target: { ...target.position },
            targetId: target.id,
            isAttacking: true,
          }, { root: true })
        }
      }
    },
    // Каждый кадр после движения: событие move выполнено, если юнит дошёл или пути нет; юнит пропал - событие тоже.
    // Следующее по очереди событие сразу получает маршрут, юнит идёт дальше без остановки
    finishArrived: ({ getters, dispatch, rootGetters }) => {
      let finished = false
      for (const event of getters.getActive.filter((e) => e.type === 'move' && e.started)) {
        const unit = rootGetters['world/getById'](event.actorId)
        if (!unit || !unit.target) {
          dispatch('complete', event.id)
          finished = true
        }
      }
      if (finished) {
        dispatch('startPending')
      }
    },
    // событие выполнено: удаляем его и запускаем следующее по цепочке
    complete: ({ state, commit }, id) => {
      const event = state.list.find((e) => e.id === id)
      if (!event) {
        return
      }
      commit(MUTATIONS.REMOVE, id)
      if (event.nextId !== null) {
        commit(MUTATIONS.SET_STATUS, { id: event.nextId, status: EVENT_STATUS.ACTIVE })
      }
    },
    // отменить все события объекта (объект уничтожен)
    cancelActor: ({ commit }, actorId) => {
      commit(MUTATIONS.REMOVE_BY_ACTOR, actorId)
    },
    // сбросить все события (новый сценарий, выход в меню)
    clear: ({ commit }) => {
      commit(MUTATIONS.CLEAR)
    },
  },
}
