export const world = {
  width: 2000,
  height: 1400,
}

export type Point = {
  x: number
  y: number
}

export const screenToWorld = (x: number, y: number, camera: Point): Point => ({
  x: Math.round(x + camera.x - world.width / 2),
  y: Math.round(world.height / 2 - y - camera.y),
})
