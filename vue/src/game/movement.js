import {getDistance} from './geometry.js'

export function moveUnitTowardsTarget(unit, deltaSeconds) {
    if (unit.target === null) {
        return
    }

    const distanceLeft = getDistance(unit.position, unit.target)

    const stepLength = unit.type.speed * deltaSeconds

    if (stepLength >= distanceLeft) {
        unit.position.x = unit.target.x
        unit.position.y = unit.target.y

        unit.target = null
        return
    }

    const stepRatio = stepLength / distanceLeft


    unit.position.x += (unit.target.x - unit.position.x) * stepRatio
    unit.position.y += (unit.target.y - unit.position.y) * stepRatio
}
