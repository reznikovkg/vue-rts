const ISO_ANGLE_DEGREES = 45
const ISO_VERTICAL_SCALE = 0.5
const ISO_ANGLE_RADIANS = ISO_ANGLE_DEGREES * Math.PI / 180
const ISO_COS = Math.cos(ISO_ANGLE_RADIANS)
const ISO_SIN = Math.sin(ISO_ANGLE_RADIANS)

export const ISO_GROUND_TRANSFORM = 'scale(1 ' + ISO_VERTICAL_SCALE + ') rotate(' + ISO_ANGLE_DEGREES + ')'

export function worldToIso(point) {
    return {
        x: point.x * ISO_COS - point.y * ISO_SIN,
        y: (point.x * ISO_SIN + point.y * ISO_COS) * ISO_VERTICAL_SCALE,
    }
}

export function isoToWorld(point) {
    const unsquashedY = point.y / ISO_VERTICAL_SCALE

    return {
        x: point.x * ISO_COS + unsquashedY * ISO_SIN,
        y: unsquashedY * ISO_COS - point.x * ISO_SIN,
    }
}

export function getIsoDepth(point) {
    return point.x + point.y
}

export function pointsToSvgString(points) {
    let result = ''
    for (let index = 0; index < points.length; index++) {
        result += points[index].x + ',' + points[index].y + ' '
    }
    return result
}
