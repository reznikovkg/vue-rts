// Модуль: пересчёт следующего кадра
// Кадр = применение всех событий к элементам карты и пересчёт их состояния
export default {
  namespaced: true,

  state: () => ({}),

  actions: {
    run: ({ dispatch, commit, rootState }, dt) => {
      const isPaused = rootState.game.isPaused;

      // Игровое время останавливается на паузе.
      commit("game/SET_FRAME", isPaused ? 0 : dt, { root: true });

      // 1. Обработка событий ввода.
      // Выделение объектов и управление камерой остаются доступны.
      dispatch("events/applyEvents", null, { root: true });

      // 2. Камера и зум продолжают работать.
      dispatch("game/applyInput", { dt }, { root: true });
      dispatch("game/zoomCamera", null, { root: true });

      // 3. Симуляция мира работает только без паузы.
      if (!isPaused) {
        dispatch("map/moveUnits", dt, { root: true });
      }

      // 4. Экранные позиции пересчитываются всегда.
      dispatch("map/projectToScreen", null, { root: true });

      // 5. Очистка очередей.
      dispatch("events/clearEvents", null, { root: true });
      dispatch("game/clearZoomQueue", null, { root: true });
    },
  },
};
