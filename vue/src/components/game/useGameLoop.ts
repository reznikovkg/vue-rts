export const useGameLoop = (
  store: any,
  updateCamera: (deltaTime: number) => void,
) => {
  let animationFrameId = 0
  let previousTime = 0

  const gameLoop = (time: number) => {
    if (!previousTime) previousTime = time

    const deltaTime = Math.min((time - previousTime) / 1000, 0.05)
    previousTime = time

    updateCamera(deltaTime)
    store.dispatch('game/advanceFrame', deltaTime)
    animationFrameId = requestAnimationFrame(gameLoop)
  }

  const start = () => {
    animationFrameId = requestAnimationFrame(gameLoop)
  }

  const stop = () => {
    cancelAnimationFrame(animationFrameId)
  }

  return {
    start,
    stop,
  }
}
