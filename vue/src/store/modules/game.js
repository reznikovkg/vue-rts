import { ISO_X_RATIO, ISO_Y_RATIO } from '../../utils/isometric';

// Размер всего ромбовидного поля на экране (в пикселях)
const getFieldSize = (state) => {
  const sum = state.gridWidth + state.gridHeight;
  return {
    width: sum * state.cellSize * ISO_X_RATIO,
    height: sum * state.cellSize * ISO_Y_RATIO,
  };
};

// Камера не должна уезжать за границы поля
const clampCamera = (state) => {
  const field = getFieldSize(state);
  const maxX = Math.max(0, field.width - state.viewport.width);
  const maxY = Math.max(0, field.height - state.viewport.height);
  state.camera.x = Math.min(Math.max(state.camera.x, 0), maxX);
  state.camera.y = Math.min(Math.max(state.camera.y, 0), maxY);
};

export default {
  namespaced: true,

  state: () => ({
    cellSize: 64,
    gridWidth: 30,
    gridHeight: 30,

    // Размер видимой области (обновляет компонент поля)
    viewport: { width: 0, height: 0 },

    // Объекты хранят только то, что они ЕСТЬ сейчас:
    // x, y - текущее положение в мировых координатах (плоских, в пикселях мира).
    gameObjects: [
      { id: 1, type: 'character', x: 900, y: 880, speed: 120, color: '#4ade80' },
      { id: 2, type: 'character', x: 1010, y: 840, speed: 80, color: '#60a5fa' },
      { id: 3, type: 'character', x: 880, y: 1000, speed: 150, color: '#f87171' },
      { id: 4, type: 'building', x: 1060, y: 1060, speed: 0, color: '#a78bfa' },
    ],

    // Отдельный список событий - то, что объекты должны СДЕЛАТЬ.
    // Событие движения: { id, type: 'move', objectId, targetX, targetY }
    // Когда объект дошёл до цели, событие удаляется.
    events: [],
    nextEventId: 1,

    selectedObjectId: null,
    camera: { x: 0, y: 0 },
  }),

  getters: {
    // Клетки поля: просто номера столбца и строки
    cells: (state) => {
      const cells = [];
      for (let y = 0; y < state.gridHeight; y++) {
        for (let x = 0; x < state.gridWidth; x++) {
          cells.push({ x, y });
        }
      }
      return cells;
    },

    // Сдвиг по X, чтобы левый угол ромба не уходил в отрицательные координаты
    fieldOffsetX: (state) => {
      return state.gridHeight * state.cellSize * ISO_X_RATIO;
    },
    fieldWidth: (state) => {
      return getFieldSize(state).width;
    },
    fieldHeight: (state) => {
      return getFieldSize(state).height;
    },
    // Размеры мира без проекции (нужны, чтобы ограничить цель движения)
    worldWidth: (state) => {
      return state.gridWidth * state.cellSize;
    },
    worldHeight: (state) => {
      return state.gridHeight * state.cellSize;
    },
  },

  mutations: {
    SELECT_OBJECT: (state, id) => {
      state.selectedObjectId = id;
    },
    DESELECT: (state) => {
      state.selectedObjectId = null;
    },
    SET_VIEWPORT: (state, { width, height }) => {
      state.viewport.width = width;
      state.viewport.height = height;
      clampCamera(state);
    },
    CENTER_CAMERA: (state) => {
      const field = getFieldSize(state);
      state.camera.x = (field.width - state.viewport.width) / 2;
      state.camera.y = (field.height - state.viewport.height) / 2;
      clampCamera(state);
    },
    MOVE_CAMERA: (state, { dx, dy }) => {
      state.camera.x += dx;
      state.camera.y += dy;
      clampCamera(state);
    },
    UPDATE_OBJECT_POSITION: (state, { id, x, y }) => {
      const obj = state.gameObjects.find((o) => o.id === id);
      if (!obj) {
        return;
      }
      obj.x = x;
      obj.y = y;
    },
    // новый приказ движения заменяет старый приказ этого же объекта
    SET_MOVE_EVENT: (state, { objectId, targetX, targetY }) => {
      state.events = state.events.filter((e) => e.objectId !== objectId);
      state.events.push({
        id: state.nextEventId,
        type: 'move',
        objectId,
        targetX,
        targetY,
      });
      state.nextEventId += 1;
    },
    REMOVE_EVENT: (state, eventId) => {
      state.events = state.events.filter((e) => e.id !== eventId);
    },
  },

  actions: {
    setViewport: ({ commit }, size) => {
      commit('SET_VIEWPORT', size);
    },
    centerCamera: ({ commit }) => {
      commit('CENTER_CAMERA');
    },
    selectObject: ({ commit }, obj) => {
      if (obj.type === 'building') {
        return;
      }
      commit('SELECT_OBJECT', obj.id);
    },
    deselectAll: ({ commit }) => {
      commit('DESELECT');
    },
    // Приказ "идти в точку": стор только записывает событие, ничего не двигает
    orderMove: ({ commit, state, getters }, { x, y }) => {
      const selected = state.gameObjects.find((o) => o.id === state.selectedObjectId);
      if (!selected || selected.type === 'building') {
        return;
      }

      // цель не может быть за пределами карты
      const targetX = Math.min(Math.max(x, 0), getters.worldWidth);
      const targetY = Math.min(Math.max(y, 0), getters.worldHeight);
      commit('SET_MOVE_EVENT', { objectId: selected.id, targetX, targetY });
    },
    // Камера: компонент сам считает, на сколько сдвинуть (клавиши, мышь, край экрана).
    // В стор приходит уже готовый сдвиг dx, dy в пикселях экрана.
    moveCamera: ({ commit }, { dx, dy }) => {
      if (dx === 0 && dy === 0) {
        return;
      }
      commit('MOVE_CAMERA', { dx, dy });
    },
    // Применяем все события движения к объектам (один кадр).
    // Расчёт тот же: dx / dy / distance / step.
    moveObjects: ({ commit, state }, deltaTime) => {
      // копия списка, потому что внутри цикла мы удаляем события
      const moveEvents = state.events.filter((e) => e.type === 'move');

      moveEvents.forEach((event) => {
        const obj = state.gameObjects.find((o) => o.id === event.objectId);
        if (!obj) {
          commit('REMOVE_EVENT', event.id);
          return;
        }

        const dx = event.targetX - obj.x;
        const dy = event.targetY - obj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const step = obj.speed * deltaTime;

        if (step >= distance) {
          // дошёл: ставим ровно в цель и закрываем событие
          commit('UPDATE_OBJECT_POSITION', { id: obj.id, x: event.targetX, y: event.targetY });
          commit('REMOVE_EVENT', event.id);
          return;
        }

        commit('UPDATE_OBJECT_POSITION', {
          id: obj.id,
          x: obj.x + (dx / distance) * step,
          y: obj.y + (dy / distance) * step,
        });
      });
    },
    // Один кадр: сначала камера, и только когда она отработала - объекты.
    // dispatch возвращает Promise, поэтому порядок задаём через .then
    tick: ({ dispatch }, { cameraDelta, deltaTime }) => {
      return dispatch('moveCamera', cameraDelta).then(() => {
        return dispatch('moveObjects', deltaTime);
      });
    },
  },
};
