import {
  UNIT_COLLISION_RADIUS,
  UNIT_SEPARATION,
  positionIntersectsCircle,
  segmentIntersectsCircle,
  toCollisionSpace,
} from './collision'

export const BUILDING_COLLISION_MARGIN = UNIT_COLLISION_RADIUS
export const BUILDING_VISUAL_WIDTH = 280
export const BUILDING_VISUAL_HEIGHT = 250

export function getBuildingCollisionRadius(building, additionalClearance = 0) {
  const scale = building.size / 4.5
  const halfWidth = BUILDING_VISUAL_WIDTH * scale / 2
  const halfHeight = BUILDING_VISUAL_HEIGHT * scale / 2

  return Math.hypot(halfWidth, halfHeight) +
    BUILDING_COLLISION_MARGIN +
    additionalClearance
}

export function positionIntersectsBuilding(
  position,
  building,
  additionalClearance = 0,
) {
  return positionIntersectsCircle(position, {
    x: building.x,
    y: building.y,
    radius: getBuildingCollisionRadius(building, additionalClearance),
  })
}

export function getCollisionCircles(state, unitId) {
  return [
    ...state.buildings.map(building => ({
      ...toCollisionSpace(building),
      radius: getBuildingCollisionRadius(building),
      building,
    })),
    ...state.units
      .filter(unit => unit.id !== unitId)
      .map(unit => ({
        ...toCollisionSpace(unit),
        radius: UNIT_SEPARATION,
      })),
  ]
}

export function isMovementBlocked(state, unit, start, end) {
  return getCollisionCircles(state, unit.id).some(circle =>
    segmentIntersectsCircle(start, end, circle),
  )
}
