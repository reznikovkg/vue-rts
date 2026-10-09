import {clamp} from './geometry.js'
import {isoToWorld, worldToIso} from './projection.js'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3

export function createCamera(position) {
    return {
        x: position.x,
        y: position.y,
        zoom: 1,
    }
}

function screenOffsetToWorldOffset(screenOffset, zoom) {
    return isoToWorld({
        x: screenOffset.x / zoom,
        y: screenOffset.y / zoom,
    })
}

function getOffsetFromScreenCenter(viewport, screenPoint) {
    return {
        x: screenPoint.x - viewport.width / 2,
        y: screenPoint.y - viewport.height / 2,
    }
}

export function screenToWorld(camera, viewport, screenPoint) {
    const screenOffset = getOffsetFromScreenCenter(viewport, screenPoint)
    const worldOffset = screenOffsetToWorldOffset(screenOffset, camera.zoom)

    return {
        x: camera.x + worldOffset.x,
        y: camera.y + worldOffset.y,
    }
}

export function getCameraTransform(camera, viewport) {
    const cameraOnScreen = worldToIso(camera)
    const translateToCenter = 'translate(' + viewport.width / 2 + ' ' + viewport.height / 2 + ')'
    const scale = 'scale(' + camera.zoom + ')'
    const translateToCamera = 'translate(' + -cameraOnScreen.x + ' ' + -cameraOnScreen.y + ')'
    return translateToCenter + ' ' + scale + ' ' + translateToCamera
}

function setCameraPosition(camera, position, bounds) {
    camera.x = clamp(position.x, bounds.minX, bounds.maxX)
    camera.y = clamp(position.y, bounds.minY, bounds.maxY)
}

export function moveCameraByScreenOffset(camera, screenOffset, bounds) {
    const worldOffset = screenOffsetToWorldOffset(screenOffset, camera.zoom)

    setCameraPosition(camera, {
        x: camera.x + worldOffset.x,
        y: camera.y + worldOffset.y,
    }, bounds)
}

export function zoomCameraAtScreenPoint(camera, viewport, screenPoint, zoomFactor, bounds) {
    const worldPointUnderCursor = screenToWorld(camera, viewport, screenPoint)

    camera.zoom = clamp(camera.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM)

    const screenOffset = getOffsetFromScreenCenter(viewport, screenPoint)
    const worldOffset = screenOffsetToWorldOffset(screenOffset, camera.zoom)

    setCameraPosition(camera, {
        x: worldPointUnderCursor.x - worldOffset.x,
        y: worldPointUnderCursor.y - worldOffset.y,
    }, bounds)
}

export function worldToScreen(camera, viewport, point) {
    const offsetOnScreen = worldToIso({x: point.x - camera.x, y: point.y - camera.y})
    return {
        x: viewport.width / 2 + offsetOnScreen.x * camera.zoom,
        y: viewport.height / 2 + offsetOnScreen.y * camera.zoom,
    }
}
