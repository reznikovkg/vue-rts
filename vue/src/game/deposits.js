import {getDistance} from './geometry.js'
import {tileToWorldCenter} from './map.js'

export const DEPOSIT_KIND = 'deposit'
export const DEPOSIT_AMOUNT = 600

let nextDepositId = 1

export function createDeposit(map, tile, amount) {
    const id = 'deposit-' + nextDepositId
    nextDepositId++
    return {
        id: id,
        kind: DEPOSIT_KIND,
        tile: {column: tile.column, row: tile.row},
        position: tileToWorldCenter(map, tile),
        amount: amount,
    }
}

export function isDeposit(item) {
    return item.kind === DEPOSIT_KIND
}

export function findDepositById(deposits, id) {
    for (let index = 0; index < deposits.length; index++) {
        if (deposits[index].id === id) {
            return deposits[index]
        }
    }
    return null
}

export function findNearestDeposit(deposits, position) {
    let nearestDeposit = null
    let nearestDistance = Infinity
    for (let index = 0; index < deposits.length; index++) {
        const distance = getDistance(position, deposits[index].position)
        if (deposits[index].amount > 0 && distance < nearestDistance) {
            nearestDistance = distance
            nearestDeposit = deposits[index]
        }
    }
    return nearestDeposit
}

export function isTileOnDeposit(deposits, tile) {
    for (let index = 0; index < deposits.length; index++) {
        if (deposits[index].tile.column === tile.column && deposits[index].tile.row === tile.row) {
            return true
        }
    }
    return false
}

export function removeEmptyDeposits(world) {
    const remainingDeposits = []
    for (let index = 0; index < world.deposits.length; index++) {
        if (world.deposits[index].amount > 0) {
            remainingDeposits.push(world.deposits[index])
        }
    }
    if (remainingDeposits.length !== world.deposits.length) {
        world.deposits = remainingDeposits
    }
}
