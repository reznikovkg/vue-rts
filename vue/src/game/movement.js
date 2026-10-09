import {canUnitStandAt, hasClearLine, isTileWalkableFor} from './collision.js'
import {getDistance} from './geometry.js'
import {tileToWorldCenter, worldToTile} from './map.js'
import {findPath} from './pathfinding.js'

const ARRIVAL_DISTANCE = 2
const REPATH_AFTER_BLOCKED_SECONDS = 0.6
const GIVE_UP_DISTANCE = 96
const MAX_SECONDS_NEAR_TARGET = 3
const MAX_SECONDS_WITHOUT_PROGRESS = 8
const MIN_PROGRESS_DISTANCE = 8
const SKIP_OCCUPIED_WAYPOINT_DISTANCE = 64
const AVOIDANCE_ANGLES = [Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4]

function planPath(world, unit, event) {
    const startTile = worldToTile(world.map, unit.position)
    const goalTile = worldToTile(world.map, event.target)
    const isWalkable = (tile) => isTileWalkableFor(world, tile, unit.type.movement)
    const result = findPath(world.map, startTile, goalTile, isWalkable)

    const waypoints = []
    for (let index = 0; index < result.tiles.length; index++) {
        waypoints.push(tileToWorldCenter(world.map, result.tiles[index]))
    }

    if (result.isGoalReached) {
        if (waypoints.length > 0) {
            waypoints.pop()
        }
        waypoints.push({x: event.target.x, y: event.target.y})
    } else {
        retargetToReachablePoint(unit, event, waypoints)
    }

    event.path = smoothPath(world, unit, waypoints)
    event.pathIndex = 0
    event.blockedSeconds = 0
}

function retargetToReachablePoint(unit, event, waypoints) {
    if (waypoints.length === 0) {
        event.target = {x: unit.position.x, y: unit.position.y}
        return
    }
    const lastWaypoint = waypoints[waypoints.length - 1]
    event.target = {x: lastWaypoint.x, y: lastWaypoint.y}
    event.closestDistance = Infinity
}

function tryPlanPath(world, unit, event) {
    if (world.pathPlanningBudget <= 0) {
        return false
    }
    world.pathPlanningBudget--
    planPath(world, unit, event)
    return true
}

function findFarthestVisibleIndex(world, unit, from, waypoints, startIndex) {
    let farthestIndex = startIndex
    while (farthestIndex + 1 < waypoints.length && hasClearLine(world, unit, from, waypoints[farthestIndex + 1])) {
        farthestIndex++
    }
    return farthestIndex
}

function smoothPath(world, unit, waypoints) {
    const smoothedWaypoints = []
    let anchor = unit.position
    let index = 0

    while (index < waypoints.length) {
        const farthestIndex = findFarthestVisibleIndex(world, unit, anchor, waypoints, index)
        smoothedWaypoints.push(waypoints[farthestIndex])
        anchor = waypoints[farthestIndex]
        index = farthestIndex + 1
    }

    return smoothedWaypoints
}

function skipVisibleWaypoints(world, unit, event) {
    event.pathIndex = findFarthestVisibleIndex(world, unit, unit.position, event.path, event.pathIndex)
}

function tryStep(world, unit, angle, stepLength) {
    const candidate = {
        x: unit.position.x + Math.cos(angle) * stepLength,
        y: unit.position.y + Math.sin(angle) * stepLength,
    }
    if (!canUnitStandAt(world, unit, candidate)) {
        return false
    }

    unit.position.x = candidate.x
    unit.position.y = candidate.y
    unit.heading = angle
    unit.isMoving = true
    return true
}

function trySidestepToSide(world, unit, directAngle, stepLength, side) {
    for (let index = 0; index < AVOIDANCE_ANGLES.length; index++) {
        if (tryStep(world, unit, directAngle + AVOIDANCE_ANGLES[index] * side, stepLength)) {
            return true
        }
    }
    return false
}

function trySidestep(world, unit, event, directAngle, stepLength) {
    if (trySidestepToSide(world, unit, directAngle, stepLength, event.avoidanceSide)) {
        return
    }
    event.avoidanceSide = -event.avoidanceSide
    trySidestepToSide(world, unit, directAngle, stepLength, event.avoidanceSide)
}

function stepDirectlyTowards(world, unit, event, point, deltaSeconds) {
    const distance = getDistance(unit.position, point)
    if (distance === 0) {
        return true
    }

    const stepLength = Math.min(unit.type.speed * deltaSeconds, distance)
    const directAngle = Math.atan2(point.y - unit.position.y, point.x - unit.position.x)
    if (tryStep(world, unit, directAngle, stepLength)) {
        return true
    }

    trySidestep(world, unit, event, directAngle, stepLength)
    return false
}

function isLastWaypoint(event) {
    return event.pathIndex === event.path.length - 1
}

function handleBlocked(world, unit, event, waypoint, deltaSeconds) {
    event.blockedSeconds += deltaSeconds
    if (event.blockedSeconds < REPATH_AFTER_BLOCKED_SECONDS) {
        return false
    }

    if (getDistance(unit.position, event.target) < GIVE_UP_DISTANCE) {
        return true
    }

    const isBlockedOnlyByUnits = hasClearLine(world, unit, unit.position, waypoint)
    if (isBlockedOnlyByUnits) {
        event.blockedSeconds = 0
        return false
    }

    tryPlanPath(world, unit, event)
    return false
}

function getArrivalDistance(unit, event) {
    if (isLastWaypoint(event)) {
        return unit.type.radius
    }
    return ARRIVAL_DISTANCE
}

function isLingeringNearTarget(unit, event, deltaSeconds) {
    if (getDistance(unit.position, event.target) >= GIVE_UP_DISTANCE) {
        event.secondsNearTarget = 0
        return false
    }
    event.secondsNearTarget += deltaSeconds
    return event.secondsNearTarget >= MAX_SECONDS_NEAR_TARGET
}

function isStalled(unit, event, deltaSeconds) {
    const distance = getDistance(unit.position, event.target)
    if (distance < event.closestDistance - MIN_PROGRESS_DISTANCE) {
        event.closestDistance = distance
        event.secondsWithoutProgress = 0
        return false
    }
    event.secondsWithoutProgress += deltaSeconds
    return event.secondsWithoutProgress >= MAX_SECONDS_WITHOUT_PROGRESS
}

export function runMoveEvent(world, unit, event, deltaSeconds) {
    if (event.path === null && !tryPlanPath(world, unit, event)) {
        return false
    }
    if (isLingeringNearTarget(unit, event, deltaSeconds) || isStalled(unit, event, deltaSeconds)) {
        return true
    }
    if (event.pathIndex >= event.path.length) {
        return true
    }

    skipVisibleWaypoints(world, unit, event)
    const waypoint = event.path[event.pathIndex]
    const waypointTile = worldToTile(world.map, waypoint)
    if (!isTileWalkableFor(world, waypointTile, unit.type.movement)) {
        tryPlanPath(world, unit, event)
        return false
    }
    const isWaypointClose = getDistance(unit.position, waypoint) < SKIP_OCCUPIED_WAYPOINT_DISTANCE
    if (!isLastWaypoint(event) && isWaypointClose && !canUnitStandAt(world, unit, waypoint)) {
        event.pathIndex++
        return false
    }

    if (!stepDirectlyTowards(world, unit, event, waypoint, deltaSeconds)) {
        return handleBlocked(world, unit, event, waypoint, deltaSeconds)
    }

    event.blockedSeconds = 0
    if (getDistance(unit.position, waypoint) <= getArrivalDistance(unit, event)) {
        event.pathIndex++
    }
    return event.pathIndex >= event.path.length
}
