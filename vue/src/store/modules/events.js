import { EVENT_TYPE, DRAG_THRESHOLD, UNIT_RADIUS } from "@/config/game";
import { BUILDING_TYPES } from "@/config/game";

let nextEventId = 1;

const findTargetAtPosition = (world, units, buildings) => {
  const unit = units.find((u) => {
    const distance = Math.hypot(
      u.position.x - world.x,
      u.position.y - world.y,
    );

    return distance <= UNIT_RADIUS;
  });

  if (unit) return { ...unit, targetType: "unit" };

  const building = buildings.find((b) => {
    const width = b.width ?? b.size;
    const height = b.height ?? b.size;

    return (
      Math.abs(world.x - b.position.x) <= width / 2 &&
      Math.abs(world.y - b.position.y) <= height / 2
    );
  });

  if (building) return { ...building, targetType: "building" };

  return null;
};

const canAttackTarget = (unit, target) => {
  if (unit.group === target.group) return false;

  const targetMovementType =
    target.targetType === "unit"
      ? target.movementType
      : target.type === "ship"
        ? "water"
        : "land";

  return unit.movementType === targetMovementType;
};

// Модуль: очередь текущих событий, накопленных за кадр
export default {
  namespaced: true,

  state: () => ({
    queue: [],
  }),

  getters: {
    getEvents: (state) => state.queue,
  },

  mutations: {
    PUSH_EVENT: (state, event) => {
      state.queue.push(event);
    },

    CLEAR_EVENTS: (state) => {
      state.queue = [];
    },
  },

  actions: {
    // Постановка события в очередь — применяется при пересчёте кадра
    pushEvent: ({ commit }, { type, payload }) => {
      commit("PUSH_EVENT", { id: nextEventId++, type, payload });
    },

    clearEvents: ({ commit }) => {
      commit("CLEAR_EVENTS");
    },

    // Применение всех событий кадра к элементам карты
    applyEvents: ({ state, rootState, rootGetters, commit, dispatch }) => {
      state.queue.forEach((event) => {
        if (
          rootState.game.isPaused &&
          [
            EVENT_TYPE.MOVE_UNITS,
            EVENT_TYPE.BUILD_BUILDING,
            EVENT_TYPE.SPAWN_UNIT,
          ].includes(event.type)
        ) {
          return;
        }

        if (event.type === EVENT_TYPE.SELECT_UNITS) {
          commit("game/SET_SELECTED", event.payload.unitIds, { root: true });
          return;
        }

        if (event.type === EVENT_TYPE.SELECT_BUILDING) {
          commit("game/SET_SELECTED_BUILDING", event.payload.buildingId, {
            root: true,
          });
          return;
        }

        if (event.type === EVENT_TYPE.MOVE_UNITS) {
          const { unitIds, target } = event.payload;
          // Формация считается геттером: dispatch вернул бы Promise
          const slots = rootGetters["map/getMoveSlots"]({ unitIds, target });
          slots.forEach(({ id, target: slot }) => {
            commit("map/SET_TARGET", { id, target: slot }, { root: true });
          });
          return;
        }

        if (event.type === EVENT_TYPE.ATTACK_TARGET) {
          const { unitIds, targetId, targetType } = event.payload;

          commit(
            "map/SET_ATTACK_TARGET",
            { unitIds, targetId, targetType },
            { root: true },
          );

          return;
        }

        if (event.type === EVENT_TYPE.ZOOM_CAMERA) {
          commit("game/PUSH_ZOOM", event.payload, { root: true });
          return;
        }

        if (event.type === EVENT_TYPE.BUILD_BUILDING) {
          const { type, size, width, height, world, group } = event.payload;

          const definition = BUILDING_TYPES.find((b) => b.type === type);
          if (!definition) return;

          const orientedType = {
            ...definition,
            width: width ?? definition.width,
            height: height ?? definition.height,
          };

          if (!rootGetters["map/canPlace"](world, orientedType)) return;

          const ghost = rootGetters["map/getGhost"](world, orientedType);

          commit(
            "map/ADD_BUILDING",
            {
              type,
              size,
              width,
              height,
              group,
              position: { x: ghost.x, y: ghost.y },
            },
            { root: true },
          );
        }

        if (event.type === EVENT_TYPE.SPAWN_UNIT) {
          dispatch("map/spawnUnit", event.payload.buildingId, { root: true });
        }
      });
    },

    // Наведение курсора: нужно для призрака здания в режиме строительства
    updateCursor: ({ commit }, point) => {
      commit("game/SET_CURSOR", point, { root: true });
    },

    // События ввода: клавиши камеры
    keyDown: ({ commit }, key) => {
      if (key === "Escape") {
        commit("game/SET_BUILD_TYPE", null, { root: true });
        return;
      }
      commit("game/SET_KEY", { key, pressed: true }, { root: true });
    },

    keyUp: ({ commit }, key) => {
      commit("game/SET_KEY", { key, pressed: false }, { root: true });
    },

    // События ввода: выделение ЛКМ
    startDrag: ({ commit }, point) => {
      commit("game/START_DRAG", point, { root: true });
    },

    updateDrag: ({ commit }, point) => {
      commit(
        "game/UPDATE_DRAG",
        { point, threshold: DRAG_THRESHOLD },
        { root: true },
      );
    },

    endDrag: ({ rootState, rootGetters, dispatch }) => {
      if (!rootState.game.drag.start) return;

      if (rootState.game.buildType) {
        dispatch("placeBuilding", rootState.game.drag.current);
        dispatch("game/endDrag", null, { root: true });
        return;
      }

      const r = rootGetters["game/getSelectionRect"];
      dispatch("pushEvent", {
        type: EVENT_TYPE.SELECT_UNITS,
        payload: { unitIds: rootGetters["map/getUnitIdsByRect"](r) },
      });
      dispatch("pushEvent", {
        type: EVENT_TYPE.SELECT_BUILDING,
        payload: { buildingId: null },
      });
      dispatch("game/endDrag", null, { root: true });
    },

    // События ввода: колесо — точка мира под курсором запоминается до пересчёта кадра
    wheel: ({ rootGetters, dispatch }, { cursor, deltaY }) => {
      const worldBefore = rootGetters["game/getWorldByScreen"](cursor);
      dispatch("pushEvent", {
        type: EVENT_TYPE.ZOOM_CAMERA,
        payload: { cursor, worldBefore, deltaY },
      });
    },

    // События ввода: клик ЛКМ по юниту
    clickUnit: ({ dispatch }, unitId) => {
      dispatch("pushEvent", {
        type: EVENT_TYPE.SELECT_UNITS,
        payload: { unitIds: [unitId] },
      });
    },

    // События ввода: клик ЛКМ по зданию — показываем его характеристики
    clickBuilding: ({ dispatch }, buildingId) => {
      dispatch("pushEvent", {
        type: EVENT_TYPE.SELECT_BUILDING,
        payload: { buildingId },
      });
    },

    // Собоытия спавна
    spawnUnit: ({ rootState, dispatch }, buildingId) => {
      if (rootState.game.isPaused) return;

      dispatch("pushEvent", {
        type: EVENT_TYPE.SPAWN_UNIT,
        payload: { buildingId },
      });
    },

    // Строительство: выбранный тип здания в панели, повторный выбор отменяет режим
    pickBuilding: ({ rootState, commit }, type) => {
      const next = rootState.game.buildType === type ? null : type;
      commit("game/SET_BUILD_TYPE", next, { root: true });
    },

    // Группа, от имени которой ставим здания (свои или вражеские)
    setBuildGroup: ({ commit }, group) => {
      commit("game/SET_BUILD_GROUP", group, { root: true });
    },

    // Постановка здания по клику ЛКМ: событие применяется при пересчёте кадра
    placeBuilding: ({ rootState, rootGetters, commit, dispatch }, cursor) => {
      const type = rootState.game.buildType;
      if (!type) return;
      if (rootState.game.isPaused) return;

      const world = rootGetters["game/getWorldByScreen"](cursor);

      const horizontal =
        type.type === "ship" &&
        rootState.game.buildOrientation === "horizontal";

      const orientedType = horizontal
        ? { ...type, width: type.height, height: type.width }
        : type;

      if (!rootGetters["map/canPlace"](world, orientedType)) return;

      dispatch("pushEvent", {
        type: EVENT_TYPE.BUILD_BUILDING,
        payload: {
          type: type.type,
          size: type.size,
          width: orientedType.width,
          height: orientedType.height,
          world,
          group: rootState.game.buildGroup,
        },
      });

      commit("game/SET_BUILD_TYPE", null, { root: true });
    },

    moveSelected: (
      { rootState, rootGetters, commit, dispatch },
      { cursor, isShift },
    ) => {
      if (rootState.game.isPaused) return;
      if (rootState.game.buildType) {
        commit("game/SET_BUILD_TYPE", null, { root: true });
        return;
      }

      const unitIds = rootState.game.selectedUnitIds;
      if (unitIds.length === 0) return;

      const target = rootGetters["game/getWorldByScreen"](cursor);
      const targetObject = findTargetAtPosition(
        target,
        rootState.map.units,
        rootState.map.buildings,
      );

      if (targetObject) {
        const compatibleUnits = rootState.map.units.filter(
          (unit) =>
            unitIds.includes(unit.id) &&
            canAttackTarget(unit, targetObject),
        );

        if (compatibleUnits.length > 0) {
          dispatch("pushEvent", {
            type: EVENT_TYPE.ATTACK_TARGET,
            payload: {
              unitIds: compatibleUnits.map((unit) => unit.id),
              targetId: targetObject.id,
              targetType: targetObject.targetType,
            },
          });
          return;
        }
      }

      if (isShift) {
        unitIds.forEach((id) => {
          commit("map/ADD_TARGET_TO_QUEUE", { id, target }, { root: true });
        });
      } else {
        dispatch("pushEvent", {
          type: EVENT_TYPE.MOVE_UNITS,
          payload: { unitIds, target },
        });
      }
    },
  },
};
