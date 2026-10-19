// игровой цикл: onFrame(dt) перед каждой отрисовкой экрана, dt в секундах
// dt не больше 0.1, иначе после свернутой вкладки все телепортируются

import { onBeforeUnmount, onMounted } from 'vue'

export const useGameLoop = (onFrame) => {
  let frameId = 0
  let lastTime = 0

  const frame = (now) => {
    if (lastTime) onFrame(Math.min((now - lastTime) / 1000, 0.1))
    lastTime = now
    frameId = requestAnimationFrame(frame)
  }

  onMounted(() => (frameId = requestAnimationFrame(frame)))
  onBeforeUnmount(() => cancelAnimationFrame(frameId))
}
