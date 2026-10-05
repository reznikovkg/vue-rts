import {createDefaultMap} from '@/game/map.js'
import {createStartingEntities} from '@/game/scenario.js'
import {createCamera, moveCameraByScreenOffset, screenToWorld, zoomCameraAtScreenPoint} from '@/game/camera.js'
import {isPointInBounds} from '@/game/geometry.js'
import {isBuilding, isUnit} from '@/game/entities.js'
import {moveUnitTowardsTarget} from '@/game/movement.js'

const MUTATIONS = {
    SET_VIEWPORT: 'SET_VIEWPORT',
    MOVE_CAMERA: 'MOVE_CAMERA',
    ZOOM_CAMERA: 'ZOOM_CAMERA',
    SELECT_ENTITY: 'SELECT_ENTITY',
    SET_UNIT_TARGET: 'SET_UNIT_TARGET',
    ADVANCE_TIME: 'ADVANCE_TIME',
}

function findEntityById(entities, id) {
    for (let index = 0; index < entities.length; index++) {
        if (entities[index].id === id) {
            return entities[index]
        }
    }
    return null
}

export default {
    namespaced: true,
    state() {
        return {
            map: createDefaultMap(),
            entities: createStartingEntities(),
            selectedEntityId: null,
            camera: createCamera(),
            viewport: {width: 0, height: 0},
        }
    },
    getters: {
        getMap: (state) => state.map,
        getCamera: (state) => state.camera,
        getViewport: (state) => state.viewport,
        getUnits: (state) => state.entities.filter(isUnit),
        getBuildings: (state) => state.entities.filter(isBuilding),
        getSelectedEntity: (state) => findEntityById(state.entities, state.selectedEntityId),
    },
    mutations: {
        [MUTATIONS.SET_VIEWPORT]: (state, size) => {
            state.viewport.width = size.width
            state.viewport.height = size.height
        },
        [MUTATIONS.MOVE_CAMERA]: (state, screenOffset) => {
            moveCameraByScreenOffset(state.camera, screenOffset, state.map.bounds)
        },
        [MUTATIONS.ZOOM_CAMERA]: (state, payload) => {
            zoomCameraAtScreenPoint(state.camera, state.viewport, payload.screenPoint, payload.zoomFactor, state.map.bounds)
        },
        [MUTATIONS.SELECT_ENTITY]: (state, id) => {
            state.selectedEntityId = id
        },
        [MUTATIONS.SET_UNIT_TARGET]: (state, payload) => {
            const unit = findEntityById(state.entities, payload.unitId)
            unit.target = payload.target
        },
        [MUTATIONS.ADVANCE_TIME]: (state, deltaSeconds) => {
            for (let index = 0; index < state.entities.length; index++) {
                const entity = state.entities[index]
                if (isUnit(entity)) {
                    moveUnitTowardsTarget(entity, deltaSeconds)
                }
            }
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
        selectEntity: (store, id) => {
            store.commit(MUTATIONS.SELECT_ENTITY, id)
        },
        clearSelection: (store) => {
            store.commit(MUTATIONS.SELECT_ENTITY, null)
        },
        orderSelectedUnitToScreenPoint: (store, screenPoint) => {
            const selectedEntity = store.getters.getSelectedEntity
            if (selectedEntity === null || !isUnit(selectedEntity)) {
                return
            }

            const target = screenToWorld(store.state.camera, store.state.viewport, screenPoint)
            if (!isPointInBounds(target, store.state.map.bounds)) {
                return
            }

            store.commit(MUTATIONS.SET_UNIT_TARGET, {unitId: selectedEntity.id, target: target})
        },
        advanceTime: (store, deltaSeconds) => {
            store.commit(MUTATIONS.ADVANCE_TIME, deltaSeconds)
        },
    },
}
