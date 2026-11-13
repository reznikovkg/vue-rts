import { onMounted, onUnmounted } from 'vue';

export const useGameLoop = (callback) => {
  let rafId = null;
  let lastTime = 0;

  const loop = (time) => {
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;

    lastTime = time;
    callback(dt);
    rafId = requestAnimationFrame(loop);
  };

  onMounted(() => {
    rafId = requestAnimationFrame(loop);
  });

  onUnmounted(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });
};