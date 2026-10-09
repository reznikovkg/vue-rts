import {isTileInsideMap} from './map.js'

const STRAIGHT_COST = 1
const DIAGONAL_COST = Math.SQRT2

const NEIGHBOR_OFFSETS = [
    {column: 1, row: 0},
    {column: -1, row: 0},
    {column: 0, row: 1},
    {column: 0, row: -1},
    {column: 1, row: 1},
    {column: 1, row: -1},
    {column: -1, row: 1},
    {column: -1, row: -1},
]

function getTileIndex(map, tile) {
    return tile.row * map.columns + tile.column
}

function getTileByIndex(map, index) {
    return {
        column: index % map.columns,
        row: Math.floor(index / map.columns),
    }
}

function estimateCost(fromTile, toTile) {
    const columnDistance = Math.abs(fromTile.column - toTile.column)
    const rowDistance = Math.abs(fromTile.row - toTile.row)
    const diagonalSteps = Math.min(columnDistance, rowDistance)
    const straightSteps = Math.max(columnDistance, rowDistance) - diagonalSteps

    return diagonalSteps * DIAGONAL_COST + straightSteps * STRAIGHT_COST
}

function takeCheapestOpenIndex(openIndexes, estimatedTotalCosts) {
    let cheapestPosition = 0
    for (let position = 1; position < openIndexes.length; position++) {
        if (estimatedTotalCosts[openIndexes[position]] < estimatedTotalCosts[openIndexes[cheapestPosition]]) {
            cheapestPosition = position
        }
    }

    const cheapestIndex = openIndexes[cheapestPosition]
    openIndexes.splice(cheapestPosition, 1)
    return cheapestIndex
}

function canStepTo(map, fromTile, offset, isWalkable) {
    const targetTile = {column: fromTile.column + offset.column, row: fromTile.row + offset.row}
    if (!isTileInsideMap(map, targetTile) || !isWalkable(targetTile)) {
        return false
    }

    const isDiagonal = offset.column !== 0 && offset.row !== 0
    if (!isDiagonal) {
        return true
    }

    const horizontalTile = {column: fromTile.column + offset.column, row: fromTile.row}
    const verticalTile = {column: fromTile.column, row: fromTile.row + offset.row}
    return isWalkable(horizontalTile) && isWalkable(verticalTile)
}

function buildPath(map, previousIndexes, startIndex, endIndex) {
    const reversedPath = []
    let currentIndex = endIndex

    while (currentIndex !== startIndex) {
        reversedPath.push(getTileByIndex(map, currentIndex))
        currentIndex = previousIndexes[currentIndex]
    }

    const path = []
    for (let index = reversedPath.length - 1; index >= 0; index--) {
        path.push(reversedPath[index])
    }
    return path
}

const MAX_GOAL_SEARCH_RING = 6

function findNearestWalkableTile(map, tile, isWalkable) {
    if (isWalkable(tile)) {
        return tile
    }

    for (let ring = 1; ring <= MAX_GOAL_SEARCH_RING; ring++) {
        for (let columnOffset = -ring; columnOffset <= ring; columnOffset++) {
            for (let rowOffset = -ring; rowOffset <= ring; rowOffset++) {
                const candidate = {column: tile.column + columnOffset, row: tile.row + rowOffset}
                const isOnRing = Math.max(Math.abs(columnOffset), Math.abs(rowOffset)) === ring
                if (isOnRing && isTileInsideMap(map, candidate) && isWalkable(candidate)) {
                    return candidate
                }
            }
        }
    }
    return tile
}

export function findPath(map, startTile, requestedGoalTile, isWalkable) {
    const goalTile = findNearestWalkableTile(map, requestedGoalTile, isWalkable)
    const tileCount = map.columns * map.rows
    const costsFromStart = new Array(tileCount).fill(Infinity)
    const estimatedTotalCosts = new Array(tileCount).fill(Infinity)
    const previousIndexes = new Array(tileCount).fill(-1)
    const isClosed = new Array(tileCount).fill(false)

    const startIndex = getTileIndex(map, startTile)
    const goalIndex = getTileIndex(map, goalTile)

    costsFromStart[startIndex] = 0
    estimatedTotalCosts[startIndex] = estimateCost(startTile, goalTile)

    const openIndexes = [startIndex]
    let closestIndex = startIndex
    let closestRemainingCost = estimatedTotalCosts[startIndex]

    while (openIndexes.length > 0) {
        const currentIndex = takeCheapestOpenIndex(openIndexes, estimatedTotalCosts)
        if (isClosed[currentIndex]) {
            continue
        }
        isClosed[currentIndex] = true

        const currentTile = getTileByIndex(map, currentIndex)
        const remainingCost = estimateCost(currentTile, goalTile)
        if (remainingCost < closestRemainingCost) {
            closestRemainingCost = remainingCost
            closestIndex = currentIndex
        }
        if (currentIndex === goalIndex) {
            break
        }

        for (let offsetIndex = 0; offsetIndex < NEIGHBOR_OFFSETS.length; offsetIndex++) {
            const offset = NEIGHBOR_OFFSETS[offsetIndex]
            if (!canStepTo(map, currentTile, offset, isWalkable)) {
                continue
            }

            const neighborTile = {column: currentTile.column + offset.column, row: currentTile.row + offset.row}
            const neighborIndex = getTileIndex(map, neighborTile)
            const isDiagonal = offset.column !== 0 && offset.row !== 0
            const stepCost = isDiagonal ? DIAGONAL_COST : STRAIGHT_COST
            const costThroughCurrent = costsFromStart[currentIndex] + stepCost

            if (costThroughCurrent < costsFromStart[neighborIndex]) {
                costsFromStart[neighborIndex] = costThroughCurrent
                estimatedTotalCosts[neighborIndex] = costThroughCurrent + estimateCost(neighborTile, goalTile)
                previousIndexes[neighborIndex] = currentIndex
                openIndexes.push(neighborIndex)
            }
        }
    }

    const isRequestedGoalReached = closestIndex === goalIndex
        && goalTile.column === requestedGoalTile.column
        && goalTile.row === requestedGoalTile.row

    return {
        tiles: buildPath(map, previousIndexes, startIndex, closestIndex),
        isGoalReached: isRequestedGoalReached,
    }
}
