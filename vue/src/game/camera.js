import {clamp} from './geometry.js'

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3

const ISO_ROTATION_DEGREES = 45
const ISO_VERTICAL_SCALE = 0.5
const ISO_ROTATION_RADIANS = ISO_ROTATION_DEGREES * Math.PI / 180
const ISO_COS = Math.cos(ISO_ROTATION_RADIANS)
const ISO_SIN = Math.sin(ISO_ROTATION_RADIANS)

export function createCamera() {
    return {
        x: 0,
        y: 0,
        zoom: 1,
    }
}

function screenOffsetToWorldOffset(screenOffset, zoom) {
    const unscaledX = screenOffset.x / zoom
    const unsquashedY = screenOffset.y / zoom / ISO_VERTICAL_SCALE

    return {
        x: unscaledX * ISO_COS + unsquashedY * ISO_SIN,
        y: unsquashedY * ISO_COS - unscaledX * ISO_SIN,
    }
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
    const translateToCenter = 'translate(' + viewport.width / 2 + ' ' + viewport.height / 2 + ')'
    const scale = 'scale(' + camera.zoom + ')'
    const isometry = 'scale(1 ' + ISO_VERTICAL_SCALE + ') rotate(' + ISO_ROTATION_DEGREES + ')'
    const translateToCamera = 'translate(' + -camera.x + ' ' + -camera.y + ')'
    return translateToCenter + ' ' + scale + ' ' + isometry + ' ' + translateToCamera
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
