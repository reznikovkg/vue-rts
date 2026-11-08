export function useGameLoop(store, updateCamera) {
  let animationFrameId = 0
  let previousTime = 0

  function gameLoop(time: number) {
    if (!previousTime) previousTime = time
    const deltaTime = Math.min((time - previousTime) / 1000, 0.05)
    previousTime = time

    updateCamera(deltaTime)
    store.dispatch('game/advanceFrame', deltaTime)
    animationFrameId = requestAnimationFrame(gameLoop)
  }

  function start() {
    animationFrameId = requestAnimationFrame(gameLoop)
  }

  function stop() {
    cancelAnimationFrame(animationFrameId)
  }

  return {
    start,
    stop,
  }
}
