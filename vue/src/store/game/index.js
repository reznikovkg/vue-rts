import {markRaw} from 'vue'
import {findScenario, SCENARIOS} from '@/game/scenarios/index.js'
import {GAME_STATUSES, getAliveGroupIds} from '@/game/gameStatus.js'
import {
    createCamera,
    moveCameraByScreenOffset,
    screenToWorld,
    worldToScreen,
    zoomCameraAtScreenPoint
} from '@/game/camera.js'
import {isPointInBounds} from '@/game/geometry.js'
import {BUILDING_TYPES, UNIT_TYPES} from '@/game/entityTypes.js'
import {findEntityById, isBuilding, isFlyingUnit, isUnit} from '@/game/entities.js'
import {
    createAttackEvent,
    createAttackMoveEvent,
    createMineEvent,
    createMoveEvent,
    EVENT_TYPES,
    getEventsOfActor,
    removeEventsOfActor
} from '@/game/events.js'
import {getFormationTargets} from '@/game/formation.js'
import {areEnemies} from '@/game/groups.js'
import {canPlaceBuilding, getFootprintArea, getPlacementOrigin} from '@/game/placement.js'
import {getGroupPopulation} from '@/game/population.js'
import {getIsoDepth} from '@/game/projection.js'
import {advanceWorld} from '@/game/simulation.js'
import {getSpawnBlocker} from '@/game/spawn.js'
import {createWorldView} from '@/game/view.js'
import {createAiState} from '@/game/ai.js'
import {tryPlaceBuilding, trySpawnUnit} from '@/game/commands.js'
import {findDepositById} from '@/game/deposits.js'
import {canAfford, createResources, getOre} from '@/game/economy.js'
import {createFog, isPointVisible, isSeenByFogOwner, refreshFog} from '@/game/fog.js'
import {EFFECT_TYPES} from '@/game/effects.js'

const PLAYER_GROUP_ID = 1

const MUTATIONS = {
    SET_VIEWPORT: 'SET_VIEWPORT',
    MOVE_CAMERA: 'MOVE_CAMERA',
    ZOOM_CAMERA: 'ZOOM_CAMERA',
    SET_SELECTION: 'SET_SELECTION',
    ADD_EVENT: 'ADD_EVENT',
    CLEAR_ACTOR_EVENTS: 'CLEAR_ACTOR_EVENTS',
    ADD_ENTITY: 'ADD_ENTITY',
    SPAWN_UNIT: 'SPAWN_UNIT',
    PLACE_BUILDING: 'PLACE_BUILDING',
    SET_AI_ENABLED: 'SET_AI_ENABLED',
    SET_FOG_ENABLED: 'SET_FOG_ENABLED',
    SET_AI_FROZEN: 'SET_AI_FROZEN',
    DESTROY_ENTITIES: 'DESTROY_ENTITIES',
    SET_PLACEMENT: 'SET_PLACEMENT',
    ADVANCE_TIME: 'ADVANCE_TIME',
    LOAD_SCENARIO: 'LOAD_SCENARIO',
    SET_STATUS: 'SET_STATUS',
}

function compareByDepth(firstEntity, secondEntity) {
    return getIsoDepth(firstEntity.position) - getIsoDepth(secondEntity.position)
}

function isOnGround(entity) {
    return !isFlyingUnit(entity)
}

function getAiGroupIds(groupIds, isAiEnabled) {
    if (!isAiEnabled) {
        return []
    }
    return groupIds.filter((groupId) => groupId !== PLAYER_GROUP_ID)
}

function createPlayerFog(world, isFogEnabled) {
    if (!isFogEnabled) {
        return null
    }
    world.fog = createFog(world.map, PLAYER_GROUP_ID)
    refreshFog(world)
    return world.fog
}

function isEffectSeen(fog, map, effect) {
    if (effect.type === EFFECT_TYPES.SHOT) {
        return isPointVisible(fog, map, effect.from) || isPointVisible(fog, map, effect.to)
    }
    return isPointVisible(fog, map, effect.position)
}

function filterSeenItems(state, items) {
    const fog = state.world.fog
    if (fog === null) {
        return items
    }
    return items.filter((item) => isSeenByFogOwner(fog, state.world.map, item))
}

function createWorld(scenario, isAiEnabled, isFogEnabled, isAiFrozen) {
    const groupIds = getAliveGroupIds(scenario.entities)
    const world = markRaw({
        map: scenario.map,
        entities: scenario.entities,
        deposits: scenario.deposits,
        resources: createResources(groupIds),
        aiGroups: createAiState(getAiGroupIds(groupIds, isAiEnabled)),
        isAiFrozen: isAiFrozen,
        fog: null,
        events: [],
        effects: [],
        pathPlanningBudget: 0,
    })
    createPlayerFog(world, isFogEnabled)
    return world
}

function finishIfOneGroupLeft(state) {
    const aliveGroupIds = getAliveGroupIds(state.world.entities)
    if (aliveGroupIds.length > 1) {
        return
    }
    state.status = GAME_STATUSES.FINISHED
    state.isGameInProgress = false
    state.winnerGroupId = aliveGroupIds.length === 1 ? aliveGroupIds[0] : null
}

function refreshView(state) {
    state.view = markRaw(createWorldView(state.world, state.view))
}

function findEntitiesByIds(entities, ids) {
    const foundEntities = []
    for (let index = 0; index < ids.length; index++) {
        const entity = findEntityById(entities, ids[index])
        if (entity !== null) {
            foundEntities.push(entity)
        }
    }
    return foundEntities
}

function getEntityIds(entities) {
    const ids = []
    for (let index = 0; index < entities.length; index++) {
        ids.push(entities[index].id)
    }
    return ids
}

function getEventPoint(view, event) {
    if (event.type === EVENT_TYPES.ATTACK) {
        const target = findEntityById(view.entities, event.targetId)
        if (target === null) {
            return null
        }
        return target.position
    }
    if (event.type === EVENT_TYPES.MINE) {
        const deposit = findDepositById(view.deposits, event.depositId)
        if (deposit === null) {
            return null
        }
        return deposit.position
    }
    return event.target
}

function getRoute(view, unit) {
    const points = [unit.position]
    const unitEvents = getEventsOfActor(view.events, unit.id)

    for (let index = 0; index < unitEvents.length; index++) {
        const point = getEventPoint(view, unitEvents[index])
        if (point !== null) {
            points.push(point)
        }
    }
    return {unitId: unit.id, points: points}
}

function isPointInScreenRect(point, rect) {
    const isInsideX = point.x >= rect.minX && point.x <= rect.maxX
    const isInsideY = point.y >= rect.minY && point.y <= rect.maxY
    return isInsideX && isInsideY
}

function getSelectedUnitIds(state) {
    const selectedEntities = findEntitiesByIds(state.world.entities, state.selectedEntityIds)
    const unitIds = []
    for (let index = 0; index < selectedEntities.length; index++) {
        if (isUnit(selectedEntities[index])) {
            unitIds.push(selectedEntities[index].id)
        }
    }
    return unitIds
}

function addUniqueIds(targetIds, idsToAdd) {
    for (let index = 0; index < idsToAdd.length; index++) {
        if (!targetIds.includes(idsToAdd[index])) {
            targetIds.push(idsToAdd[index])
        }
    }
}

function giveOrder(store, unit, event, isQueued) {
    if (!isQueued) {
        store.commit(MUTATIONS.CLEAR_ACTOR_EVENTS, unit.id)
    }
    store.commit(MUTATIONS.ADD_EVENT, event)
}

function describeSpawnOption(world, building, unitTypeKey) {
    const unitType = UNIT_TYPES[unitTypeKey]
    return {
        key: unitTypeKey,
        name: unitType.name,
        blocker: getSpawnBlocker(world, building, unitType),
        cooldownLeft: Math.ceil(building.spawnCooldown),
    }
}

export default {
    namespaced: true,
    state() {
        const scenarioDefinition = SCENARIOS[0]
        const scenario = scenarioDefinition.create()
        const world = createWorld(scenario, false, false, false)

        return {
            scenarioKey: scenarioDefinition.key,
            status: GAME_STATUSES.MENU,
            isGameInProgress: false,
            isAiEnabled: true,
            isFogEnabled: false,
            isAiFrozen: false,
            winnerGroupId: null,
            world: world,
            view: markRaw(createWorldView(world)),
            selectedEntityIds: [],
            placement: null,
            camera: createCamera(scenario.cameraStart),
            viewport: {width: 0, height: 0},
        }
    },
    getters: {
        getStatus: (state) => state.status,
        getIsGameInProgress: (state) => state.isGameInProgress,
        getWinnerGroupId: (state) => state.winnerGroupId,
        getScenarios: () => SCENARIOS,
        getCurrentScenario: (state) => findScenario(state.scenarioKey),
        getMap: (state) => state.world.map,
        getCamera: (state) => state.camera,
        getViewport: (state) => state.viewport,
        getEffects: (state) => {
            const fog = state.world.fog
            if (fog === null) {
                return state.view.effects
            }
            return state.view.effects.filter((effect) => isEffectSeen(fog, state.world.map, effect))
        },
        getDeposits: (state) => filterSeenItems(state, state.view.deposits),
        getIsFogEnabled: (state) => state.isFogEnabled,
        getFogTiles: (state) => state.view.fogTiles,
        getIsAiEnabled: (state) => state.isAiEnabled,
        getIsAiFrozen: (state) => state.isAiFrozen,
        getPlayerOre: (state) => getOre(state.view, PLAYER_GROUP_ID),
        getSelectionOre: (state, getters) => {
            const selectedEntities = getters.getSelectedEntities
            if (selectedEntities.length === 0) {
                return null
            }
            return getOre(state.view, selectedEntities[0].groupId)
        },
        getPlacement: (state) => state.placement,
        getGroundItemsInDrawOrder: (state) => {
            const groundItems = state.view.entities.filter(isOnGround).concat(state.world.map.mountainPeaks)
            return filterSeenItems(state, groundItems).sort(compareByDepth)
        },
        getFlyingUnitsInDrawOrder: (state) => {
            return filterSeenItems(state, state.view.entities.filter(isFlyingUnit)).sort(compareByDepth)
        },
        getSelectedEntityIds: (state) => state.selectedEntityIds,
        getSelectedEntities: (state) => findEntitiesByIds(state.view.entities, state.selectedEntityIds),
        getSelectedRoutes: (state, getters) => {
            const routes = []
            const selectedEntities = getters.getSelectedEntities
            for (let index = 0; index < selectedEntities.length; index++) {
                if (isUnit(selectedEntities[index])) {
                    routes.push(getRoute(state.view, selectedEntities[index]))
                }
            }
            return routes
        },
        getSelectionPopulation: (state, getters) => {
            const selectedEntities = getters.getSelectedEntities
            if (selectedEntities.length === 0) {
                return null
            }
            return getGroupPopulation(state.view.entities, selectedEntities[0].groupId)
        },
        getSpawnOptions: (state, getters) => {
            const selectedEntities = getters.getSelectedEntities
            if (selectedEntities.length !== 1 || !isBuilding(selectedEntities[0])) {
                return []
            }

            const building = selectedEntities[0]
            const options = []
            for (let index = 0; index < building.type.spawns.length; index++) {
                options.push(describeSpawnOption(state.view, building, building.type.spawns[index]))
            }
            return options
        },
        getPlacementArea: (state) => {
            if (state.placement === null || state.placement.origin === null) {
                return null
            }
            return getFootprintArea(state.world.map, BUILDING_TYPES[state.placement.typeKey], state.placement.origin)
        },
    },
    mutations: {
        [MUTATIONS.SET_VIEWPORT]: (state, size) => {
            state.viewport.width = size.width
            state.viewport.height = size.height
        },
        [MUTATIONS.MOVE_CAMERA]: (state, screenOffset) => {
            moveCameraByScreenOffset(state.camera, screenOffset, state.world.map.bounds)
        },
        [MUTATIONS.ZOOM_CAMERA]: (state, payload) => {
            zoomCameraAtScreenPoint(state.camera, state.viewport, payload.screenPoint, payload.zoomFactor, state.world.map.bounds)
        },
        [MUTATIONS.SET_SELECTION]: (state, ids) => {
            state.selectedEntityIds = ids
        },
        [MUTATIONS.ADD_EVENT]: (state, event) => {
            state.world.events.push(event)
            refreshView(state)
        },
        [MUTATIONS.CLEAR_ACTOR_EVENTS]: (state, actorId) => {
            state.world.events = removeEventsOfActor(state.world.events, actorId)
            refreshView(state)
        },
        [MUTATIONS.ADD_ENTITY]: (state, entity) => {
            state.world.entities.push(entity)
            refreshView(state)
        },
        [MUTATIONS.SPAWN_UNIT]: (state, payload) => {
            const building = findEntityById(state.world.entities, payload.buildingId)
            if (building !== null) {
                trySpawnUnit(state.world, building, UNIT_TYPES[payload.unitTypeKey])
                refreshView(state)
            }
        },
        [MUTATIONS.PLACE_BUILDING]: (state, placement) => {
            tryPlaceBuilding(state.world, BUILDING_TYPES[placement.typeKey], placement.origin, placement.groupId)
            refreshView(state)
        },
        [MUTATIONS.SET_AI_ENABLED]: (state, isAiEnabled) => {
            state.isAiEnabled = isAiEnabled
        },
        [MUTATIONS.SET_FOG_ENABLED]: (state, isFogEnabled) => {
            state.isFogEnabled = isFogEnabled
            state.world.fog = createPlayerFog(state.world, isFogEnabled)
            refreshView(state)
        },
        [MUTATIONS.SET_AI_FROZEN]: (state, isAiFrozen) => {
            state.isAiFrozen = isAiFrozen
            state.world.isAiFrozen = isAiFrozen
        },
        [MUTATIONS.DESTROY_ENTITIES]: (state, ids) => {
            const entitiesToDestroy = findEntitiesByIds(state.world.entities, ids)
            for (let index = 0; index < entitiesToDestroy.length; index++) {
                entitiesToDestroy[index].health = 0
            }
        },
        [MUTATIONS.SET_PLACEMENT]: (state, placement) => {
            state.placement = placement
        },
        [MUTATIONS.ADVANCE_TIME]: (state, deltaSeconds) => {
            const entityCountBefore = state.world.entities.length
            advanceWorld(state.world, deltaSeconds)
            refreshView(state)

            if (state.world.entities.length !== entityCountBefore) {
                state.selectedEntityIds = getEntityIds(findEntitiesByIds(state.world.entities, state.selectedEntityIds))
                finishIfOneGroupLeft(state)
            }
        },
        [MUTATIONS.LOAD_SCENARIO]: (state, scenarioKey) => {
            const scenario = findScenario(scenarioKey).create()
            state.scenarioKey = scenarioKey
            state.world = createWorld(scenario, state.isAiEnabled, state.isFogEnabled, state.isAiFrozen)
            refreshView(state)
            state.camera = createCamera(scenario.cameraStart)
            state.selectedEntityIds = []
            state.placement = null
            state.winnerGroupId = null
            state.isGameInProgress = true
            state.status = GAME_STATUSES.RUNNING
        },
        [MUTATIONS.SET_STATUS]: (state, status) => {
            state.status = status
        },
    },
    actions: {
        setViewport: (store, size) => {
            store.commit(MUTATIONS.SET_VIEWPORT, size)
        },
        moveCamera: (store, screenOffset) => {
            store.commit(MUTATIONS.MOVE_CAMERA, screenOffset)
        },
        zoomCamera: (store, payload) => {
            store.commit(MUTATIONS.ZOOM_CAMERA, payload)
        },
        selectEntity: (store, payload) => {
            const entity = findEntityById(store.state.world.entities, payload.id)
            if (entity === null) {
                return
            }
            if (isBuilding(entity) || !payload.isAdditive) {
                store.commit(MUTATIONS.SET_SELECTION, [entity.id])
                return
            }

            const unitIds = getSelectedUnitIds(store.state)
            if (unitIds.includes(entity.id)) {
                store.commit(MUTATIONS.SET_SELECTION, unitIds.filter((id) => id !== entity.id))
                return
            }
            unitIds.push(entity.id)
            store.commit(MUTATIONS.SET_SELECTION, unitIds)
        },
        selectUnitsInScreenRect: (store, payload) => {
            const idsInRect = []
            const entities = store.state.world.entities
            for (let index = 0; index < entities.length; index++) {
                const screenPoint = worldToScreen(store.state.camera, store.state.viewport, entities[index].position)
                const isSeen = isSeenByFogOwner(store.state.world.fog, store.state.world.map, entities[index])

                if (isUnit(entities[index]) && isSeen && isPointInScreenRect(screenPoint, payload.rect)) {
                    idsInRect.push(entities[index].id)
                }
            }

            const selectedIds = payload.isAdditive ? getSelectedUnitIds(store.state) : []
            addUniqueIds(selectedIds, idsInRect)
            store.commit(MUTATIONS.SET_SELECTION, selectedIds)
        },
        clearSelection: (store) => {
            store.commit(MUTATIONS.SET_SELECTION, [])
        },
        commandSelectedToScreenPoint: (store, payload) => {
            const target = screenToWorld(store.state.camera, store.state.viewport, payload.screenPoint)
            if (!isPointInBounds(target, store.state.world.map.bounds)) {
                return
            }

            const units = findEntitiesByIds(store.state.world.entities, getSelectedUnitIds(store.state))
            const formationTargets = getFormationTargets(target, units.length)

            for (let index = 0; index < units.length; index++) {
                const event = payload.isAttackMove
                    ? createAttackMoveEvent(units[index].id, formationTargets[index])
                    : createMoveEvent(units[index].id, formationTargets[index])
                giveOrder(store, units[index], event, payload.isQueued)
            }
        },
        commandSelectedToDeposit: (store, payload) => {
            const deposit = findDepositById(store.state.world.deposits, payload.depositId)
            if (deposit === null) {
                return
            }

            const units = findEntitiesByIds(store.state.world.entities, getSelectedUnitIds(store.state))

            for (let index = 0; index < units.length; index++) {
                const unit = units[index]
                const event = unit.type.miningCapacity > 0
                    ? createMineEvent(unit.id, deposit.id)
                    : createMoveEvent(unit.id, deposit.position)
                giveOrder(store, unit, event, payload.isQueued)
            }
        },
        commandSelectedToEntity: (store, payload) => {
            const target = findEntityById(store.state.world.entities, payload.targetId)

            if (target === null) {
                return
            }

            const units = findEntitiesByIds(store.state.world.entities, getSelectedUnitIds(store.state))


            for (let index = 0; index < units.length; index++) {
                const unit = units[index]
                if (unit.id === target.id) {
                    continue
                }

                if (areEnemies(unit, target)) {
                    giveOrder(store, unit, createAttackEvent(unit.id, target.id, false), payload.isQueued)
                } else {
                    giveOrder(store, unit, createMoveEvent(unit.id, target.position), payload.isQueued)
                }
            }
        },
        selfDestructSelected: (store) => {
            store.commit(MUTATIONS.DESTROY_ENTITIES, store.state.selectedEntityIds)
        },
        spawnUnit: (store, payload) => {
            store.commit(MUTATIONS.SPAWN_UNIT, payload)
        },
        startPlacement: (store, payload) => {
            store.commit(MUTATIONS.SET_PLACEMENT, {
                typeKey: payload.typeKey,
                groupId: payload.groupId,
                origin: null,
                isValid: false,
            })
        },
        updatePlacement: (store, screenPoint) => {
            const placement = store.state.placement
            if (placement === null) {
                return
            }

            const buildingType = BUILDING_TYPES[placement.typeKey]
            const cursorWorldPoint = screenToWorld(store.state.camera, store.state.viewport, screenPoint)
            const origin = getPlacementOrigin(store.state.world.map, buildingType, cursorWorldPoint)

            store.commit(MUTATIONS.SET_PLACEMENT, {
                typeKey: placement.typeKey,
                groupId: placement.groupId,
                origin: origin,
                isValid: canPlaceBuilding(store.state.world, buildingType, origin)
                    && canAfford(store.state.world, placement.groupId, buildingType.cost),
            })
        },
        confirmPlacement: (store) => {
            const placement = store.state.placement
            if (placement === null || !placement.isValid) {
                return
            }

            store.commit(MUTATIONS.PLACE_BUILDING, placement)
            store.commit(MUTATIONS.SET_PLACEMENT, null)
        },
        cancelPlacement: (store) => {
            store.commit(MUTATIONS.SET_PLACEMENT, null)
        },
        advanceTime: (store, deltaSeconds) => {
            if (store.state.status !== GAME_STATUSES.RUNNING) {
                return
            }
            store.commit(MUTATIONS.ADVANCE_TIME, deltaSeconds)
        },
        startScenario: (store, scenarioKey) => {
            store.commit(MUTATIONS.LOAD_SCENARIO, scenarioKey)
        },
        restartScenario: (store) => {
            store.commit(MUTATIONS.LOAD_SCENARIO, store.state.scenarioKey)
        },
        togglePause: (store) => {
            if (store.state.status === GAME_STATUSES.RUNNING) {
                store.commit(MUTATIONS.SET_STATUS, GAME_STATUSES.PAUSED)
                return
            }
            if (store.state.status === GAME_STATUSES.PAUSED) {
                store.commit(MUTATIONS.SET_STATUS, GAME_STATUSES.RUNNING)
            }
        },
        openMenu: (store) => {
            store.commit(MUTATIONS.SET_STATUS, GAME_STATUSES.MENU)
        },
        setAiEnabled: (store, isAiEnabled) => {
            store.commit(MUTATIONS.SET_AI_ENABLED, isAiEnabled)
        },
        setFogEnabled: (store, isFogEnabled) => {
            store.commit(MUTATIONS.SET_FOG_ENABLED, isFogEnabled)
        },
        setAiFrozen: (store, isAiFrozen) => {
            store.commit(MUTATIONS.SET_AI_FROZEN, isAiFrozen)
        },
        continueGame: (store) => {
            store.commit(MUTATIONS.SET_STATUS, GAME_STATUSES.RUNNING)
        },
    },
}
