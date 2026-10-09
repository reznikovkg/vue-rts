const TURN_SPEED_RADIANS_PER_SECOND = 8
const FULL_TURN = Math.PI * 2

function getShortestAngleDifference(fromAngle, toAngle) {
    let difference = (toAngle - fromAngle) % FULL_TURN
    if (difference > Math.PI) {
        difference -= FULL_TURN
    }
    if (difference < -Math.PI) {
        difference += FULL_TURN
    }
    return difference
}

export function turnTowardsHeading(unit, deltaSeconds) {
    const difference = getShortestAngleDifference(unit.facing, unit.heading)
    const maxTurn = TURN_SPEED_RADIANS_PER_SECOND * deltaSeconds

    if (Math.abs(difference) <= maxTurn) {
        unit.facing = unit.heading
        return
    }
    unit.facing += difference > 0 ? maxTurn : -maxTurn
}
