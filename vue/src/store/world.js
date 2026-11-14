import START_UNITS, {OBJECT_TYPES, START_OBJECTS, UNIT_TYPES} from '@/game/config'
import {SCENARIOS} from '@/game/scenarios'
import {advanceUnits, orderUnit} from '@/game/movement'
import {getBuildingError, getBuildingType} from '@/game/building'
import {bridgesOf, buildTerrainMap, isFootprintTerrainPassable} from '@/game/terrain'
import {findNearestFreePosition, isAreaFree, staticFootprint, unitFootprint} from '@/game/spatial'

// Хранилище всех элементов карты: статичные объекты (здания, деревья), юниты и зоны местности.
// Состояние модуля - это CollisionWorld

const MUTATIONS = {
    LOAD: 'LOAD',
    ADD_OBJECT: 'ADD_OBJECT',
    REMOVE_OBJECT: 'REMOVE_OBJECT',
    SET_UNIT_TARGET: 'SET_UNIT_TARGET',
    MOVE_UNITS: 'MOVE_UNITS',
    APPLY_DAMAGE: 'APPLY_DAMAGE',
    STOP_UNIT: 'STOP_UNIT',
    STOP_ATTACK: 'STOP_ATTACK',
    START_PRODUCTION: 'START_PRODUCTION',
    TICK_PRODUCTION: 'TICK_PRODUCTION',
    REMOVE_PRODUCTION: 'REMOVE_PRODUCTION',
    START_CONSTRUCTION: 'START_CONSTRUCTION',
    TICK_CONSTRUCTION: 'TICK_CONSTRUCTION',
    REMOVE_CONSTRUCTION: 'REMOVE_CONSTRUCTION',
}

// Новый юнит появляется на своей местности, в том числе на проходимом настиле моста
const fitsTerrain = (state, kind, object, area) =>
    isFootprintTerrainPassable(area, state.terrainMap,
        kind === 'unit' ? UNIT_TYPES[object.type].terrain : 'land', bridgesOf(state.objects))

const nextId = (objects, units) => Math.max(0, ...objects.map((object) => object.id), ...units.map((unit) => unit.id)) + 1

const canAddObject = (state, {kind, object}) => {
    if (!object || !Number.isSafeInteger(object.id) || object.id <= 0 ||
        !Number.isInteger(object.group) || object.group < 0) return false
    // ID общий для юнитов и статичных объектов
    if ([...state.objects, ...state.units].some((item) => item.id === object.id)) return false
    if (kind === 'unit' && Object.hasOwn(UNIT_TYPES, object.type)) {
        return Number.isFinite(object.hp) && object.hp > 0 && isAreaFree(state, unitFootprint(object)) &&
            fitsTerrain(state, kind, object, unitFootprint(object))
    }
    if (kind === 'static' && Object.hasOwn(OBJECT_TYPES, object.type)) {
        const type = OBJECT_TYPES[object.type]
        if ('size' in type) {
            return Number.isFinite(object.hp) && object.hp > 0 && getBuildingError(state, staticFootprint(object)) === ''
        }
        return (!('maxHp' in type) || (Number.isFinite(object.hp) && object.hp > 0)) &&
            isAreaFree(state, staticFootprint(object)) && fitsTerrain(state, kind, object, staticFootprint(object))
    }
    return false
}

// Можно ли сейчас менять мир: сценарий идёт и не на паузе
const isActive = (rootState, rootGetters) => rootGetters['game/isRunning'] && !rootState.game.paused

// Юнит, готовый появиться из здания: объект юнита и ближайшая свободная позиция рядом.
// null - если свободного места нет, спавн повторится в следующем кадре
const makeSpawnedUnit = (state, building, unitType) => {
    const unitStats = UNIT_TYPES[unitType]
    const unit = {
        id: state.nextObjectId,
        type: unitType,
        group: building.group,
        hp: unitStats.maxHp,
        position: building.position,
        target: null,
    }
    // Ищем от центра здания: первое свободное место окажется вплотную к нему
    const position = findNearestFreePosition(state, unitFootprint(unit), {
        accept: (point) => fitsTerrain(state, 'unit', unit, unitFootprint({...unit, position: point})),
    })
    return position ? {...unit, position} : null
}

export default {
    namespaced: true,
    state() {
        return {
            objects: structuredClone(START_OBJECTS),
            units: structuredClone(START_UNITS),
            nextObjectId: nextId(START_OBJECTS, START_UNITS),
            // До старта в меню показываем карту первого сценария - базового
            terrainMap: buildTerrainMap(SCENARIOS[0].terrain),
            // Задания производства юнитов в зданиях (ProductionJob): у здания не бывает двух сразу
            production: [],
            // Задания строительства зданий (ConstructionJob): время идёт, готовое здание считается построенным
            constructions: [],
        }
    },
    getters: {
        getObjects: (state) => state.objects,
        getUnits: (state) => state.units,
        getTerrainMap: (state) => state.terrainMap,
        getAll: (state) => [...state.objects, ...state.units],
        // Объект или юнит по id, null если такого нет
        getById: (state) => (id) => state.objects.find((o) => o.id === id) ?? state.units.find((u) => u.id === id) ?? null,
        // Группы, у которых остались юниты или здания; группа 0 не считается
        getAliveGroups: (state, getters) => [...new Set(getters.getAll.map((o) => o.group).filter((group) => group > 0))],
        // Задание производства здания по его id, null - здание ничего не создаёт
        getProductionByBuilding: (state) => (buildingId) =>
            state.production.find((job) => job.buildingId === buildingId) ?? null,
        // Задание строительства по id объекта, null - объект построен (или не здание)
        getConstructionByObject: (state) => (objectId) =>
            state.constructions.find((job) => job.objectId === objectId) ?? null,
        // Сколько живых юнитов типа unitType сейчас у группы (мёртвых в сторе не бывает - removeDead убирает каждый кадр);
        // Для лимита создания: UNIT_TYPES[unitType].maxPerGroup
        countUnitsOfType: (state) => (group, unitType) =>
            state.units.filter((u) => u.group === group && u.type === unitType).length,
        // Сколько живых зданий типа objectType сейчас у группы (разрушенные покидают стор в removeDead);
        // Для лимита строительства: OBJECT_TYPES[objectType].maxPerGroup
        countObjectsOfType: (state) => (group, objectType) =>
            state.objects.filter((o) => o.group === group && o.type === objectType).length,
    },
    mutations: {
        // Расстановка и местность сценария
        [MUTATIONS.LOAD]: (state, scenario) => {
            state.objects = structuredClone(scenario.objects)
            state.units = structuredClone(scenario.units)
            state.nextObjectId = nextId(scenario.objects, scenario.units)
            state.terrainMap = buildTerrainMap(scenario.terrain)
            state.production = []
            state.constructions = []
        },
        // Повторная проверка при добавлении: после превью место мог занять юнит
        [MUTATIONS.ADD_OBJECT]: (state, payload) => {
            if (!canAddObject(state, payload)) return
            // Отделяем позицию от запроса, в том числе реактивного объекта Vue
            const object = {...payload.object, position: {...payload.object.position}}
            if (payload.kind === 'unit') {
                object.target = null
                object.path = null
                object.blockedFor = 0
                state.units.push(object)
            } else {
                state.objects.push(object)
            }
            state.nextObjectId = Math.max(state.nextObjectId, object.id + 1)
        },
        [MUTATIONS.REMOVE_OBJECT]: (state, id) => {
            state.units = state.units.filter((u) => u.id !== id)
            state.objects = state.objects.filter((o) => o.id !== id)
        },
        // Проложить юниту маршрут к точке (вызывает стор событий при старте события move или attack);
        // Атака передаёт targetId и isAttacking, обычное движение их сбрасывает
        [MUTATIONS.SET_UNIT_TARGET]: (state, {id, target, targetId, isAttacking, reserved = []}) => {
            const unit = state.units.find((u) => u.id === id)
            if (unit) {
                orderUnit(state, unit, target, reserved)
                unit.targetId = targetId ?? null
                unit.isAttacking = isAttacking ?? false
            }
        },
        [MUTATIONS.MOVE_UNITS]: (state, secondsPassed) => {
            advanceUnits(state, secondsPassed)
        },
        // Наносим урон цели - юниту или зданию; мёртвых убирает removeDead
        [MUTATIONS.APPLY_DAMAGE]: (state, {targetId, damage}) => {
            const target = state.units.find((u) => u.id === targetId) ?? state.objects.find((o) => o.id === targetId)
            if (target) {
                target.hp -= damage
            }
        },
        // Снимаем приказ движения, режим атаки сохраняем (юнит в радиусе атаки)
        [MUTATIONS.STOP_UNIT]: (state, id) => {
            const unit = state.units.find((u) => u.id === id)
            if (unit) {
                unit.target = null
                unit.path = null
            }
        },
        // Выходим из режима атаки: цель умерла или отменена другим приказом
        [MUTATIONS.STOP_ATTACK]: (state, id) => {
            const unit = state.units.find((u) => u.id === id)
            if (unit) {
                unit.isAttacking = false
                unit.targetId = null
            }
        },
        // Здание начинает создавать юнита; одно задание на здание
        [MUTATIONS.START_PRODUCTION]: (state, job) => {
            if (state.production.some((item) => item.buildingId === job.buildingId)) return
            state.production.push({...job})
        },
        // Время производства идёт вперёд (вызывается только когда мир активен)
        [MUTATIONS.TICK_PRODUCTION]: (state, secondsPassed) => {
            state.production.forEach((job) => {
                job.elapsed += secondsPassed
            })
        },
        // Задание снято: юнит создан или здание исчезло
        [MUTATIONS.REMOVE_PRODUCTION]: (state, buildingId) => {
            state.production = state.production.filter((job) => job.buildingId !== buildingId)
        },
        // Здание начало строиться; одно задание на здание
        [MUTATIONS.START_CONSTRUCTION]: (state, job) => {
            if (state.constructions.some((item) => item.objectId === job.objectId)) return
            state.constructions.push({...job})
        },
        // Время строительства идёт вперёд (вызывается только когда мир активен)
        [MUTATIONS.TICK_CONSTRUCTION]: (state, secondsPassed) => {
            state.constructions.forEach((job) => {
                job.elapsed += secondsPassed
            })
        },
        // Задание снято: здание построено или исчезло
        [MUTATIONS.REMOVE_CONSTRUCTION]: (state, objectId) => {
            state.constructions = state.constructions.filter((job) => job.objectId !== objectId)
        },
    },
    actions: {
        // Расставить объекты и местность сценария
        load: ({commit}, scenario) => {
            commit(MUTATIONS.LOAD, scenario)
        },
        // Возвращает true при добавлении и false при отказе (для спавна и стройки)
        addObject: ({state, commit, rootState, rootGetters}, payload) => {
            if (!isActive(rootState, rootGetters) || !payload || !canAddObject(state, payload)) return false
            commit(MUTATIONS.ADD_OBJECT, payload)
            return true
        },
        // Спавн: выбранное здание начинает создавать юнита типа unitType.
        // Юнит появится рядом со зданием через UNIT_TYPES[unitType].buildSeconds секунд -
        // До этого на здании и кнопке растёт полоса прогресса (updateProduction)
        spawnUnit: ({state, commit, getters, rootGetters}, unitType) => {
            const building = rootGetters['selection/getSelected']
            if (!building || !Object.hasOwn(OBJECT_TYPES, building.type) || !Object.hasOwn(UNIT_TYPES, unitType)) {
                return false
            }
            const spawns = OBJECT_TYPES[building.type].spawns ?? []
            // Одно задание на здание: пока идёт производство, новое не начнём
            if (!spawns.includes(unitType) || state.production.some((job) => job.buildingId === building.id)) {
                return false
            }
            // Недостроенное здание пока не создаёт юнитов
            if (getters.getConstructionByObject(building.id)) {
                return false
            }
            // Лимит юнитов этого типа у группы здания достигнут
            if (getters.countUnitsOfType(building.group, unitType) >= UNIT_TYPES[unitType].maxPerGroup) {
                return false
            }
            commit(MUTATIONS.START_PRODUCTION, {
                buildingId: building.id,
                unitType,
                elapsed: 0,
                duration: UNIT_TYPES[unitType].buildSeconds,
            })
            return true
        },
        // Производство (каждый кадр из engine/tick): время заданий идёт вперёд,
        // Готовые создают юнита на ближайшем свободном месте у здания.
        // Здание погибло - задание пропадает; место занято или лимит группы достигнут -
        // Ждём и пробуем в следующем кадре
        updateProduction: ({state, commit, dispatch, getters, rootState, rootGetters}, secondsPassed) => {
            if (!isActive(rootState, rootGetters)) {
                return
            }
            commit(MUTATIONS.TICK_PRODUCTION, secondsPassed)
            state.production
                .filter((job) => job.elapsed >= job.duration)
                .forEach((job) => {
                    const building = state.objects.find((o) => o.id === job.buildingId)
                    if (!building) {
                        commit(MUTATIONS.REMOVE_PRODUCTION, job.buildingId)
                        return
                    }
                    // Лимит могли занять, пока шло производство (другое здание той же группы)
                    if (getters.countUnitsOfType(building.group, job.unitType) >= UNIT_TYPES[job.unitType].maxPerGroup) {
                        return
                    }
                    const unit = makeSpawnedUnit(state, building, job.unitType)
                    if (unit && dispatch('addObject', {kind: 'unit', object: unit})) {
                        commit(MUTATIONS.REMOVE_PRODUCTION, job.buildingId)
                    }
                })
        },
        // Уничтожить объект по id: он пропадает с карты, из выбора, вместе со своими событиями, производством и стройкой
        destroyObject: ({commit, dispatch, rootGetters}, id) => {
            commit(MUTATIONS.REMOVE_OBJECT, id)
            commit(MUTATIONS.REMOVE_PRODUCTION, id)
            commit(MUTATIONS.REMOVE_CONSTRUCTION, id)
            dispatch('selection/deselect', id, {root: true})
            dispatch('events/cancelActor', id, {root: true})
            if (!rootGetters['game/isRunning']) dispatch('construction/cancel', null, {root: true})
        },
        // Строительство: здание появляется на карте сразу и строится buildSeconds секунд.
        // Задание запускает construction/place после установки здания
        startConstruction: ({state, commit}, objectId) => {
            const object = state.objects.find((o) => o.id === objectId)
            const type = object ? getBuildingType(object.type) : null
            if (object && type) {
                commit(MUTATIONS.START_CONSTRUCTION, {
                    objectId,
                    elapsed: 0,
                    duration: type.buildSeconds,
                })
            }
        },
        // Строительство (каждый кадр из engine/tick): время заданий идёт вперёд,
        // Вышло время - задание снимается, здание построено.
        // Здание погибло - задание уже снято в destroyObject, но подстрахуемся
        updateConstruction: ({state, commit, rootState, rootGetters}, secondsPassed) => {
            if (!isActive(rootState, rootGetters)) {
                return
            }
            commit(MUTATIONS.TICK_CONSTRUCTION, secondsPassed)
            state.constructions
                .filter((job) => {
                    const building = state.objects.find((o) => o.id === job.objectId)
                    return !building || job.elapsed >= job.duration
                })
                .forEach((job) => commit(MUTATIONS.REMOVE_CONSTRUCTION, job.objectId))
        },
        // Самоуничтожение выбранных юнитов
        destroySelectedUnits: ({dispatch, rootGetters}) => {
            if (!rootGetters['game/isRunning']) {
                return
            }
            rootGetters['selection/getSelectedUnits'].forEach((unit) => dispatch('destroyObject', unit.id))
        },
        // Удаляем объекты у которых hp <= 0
        removeDead: ({state, dispatch, rootState, rootGetters}) => {
            if (!isActive(rootState, rootGetters)) {
                return
            }
            const dead = [...state.units, ...state.objects].filter((o) => o.hp !== undefined && o.hp <= 0)
            dead.forEach((o) => dispatch('destroyObject', o.id))
        },
        moveUnits: ({state, commit, rootState, rootGetters}, secondsPassed) => {
            if (!isActive(rootState, rootGetters)) {
                return
            }
            if (state.units.some((u) => u.target)) {
                commit(MUTATIONS.MOVE_UNITS, secondsPassed)
            }
        },
    },
}
