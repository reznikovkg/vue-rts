// шина событий игры (mitt)
// компоненты сообщают что произошло, а обрабатывает это одно место - useGameEvents
// новые действия (атака, стройка, очередь приказов) - новое событие здесь и обработчик там

import mitt from 'mitt'

export const EVENTS = {
  SELECT: 'select', // id объекта или null - снять выбор
  SELECT_TOGGLE: 'select-toggle', // id объекта: добавить к выбору или убрать (shift + клик)
  SELECT_AREA: 'select-area', // { from, to, add }: углы рамки на экране, add - к уже выбранным
  MOVE: 'move', // { point, append }: точка экрана, append - добавить в очередь
  ATTACK: 'attack', // { targetId, append }: атака объекта другой группы
  SELF_DESTRUCT: 'self-destruct', // id персонажа
  BUILD_START: 'build-start', // тип здания: начать стройку (тот же тип еще раз - отменить)
  BUILD_PLACE: 'build-place', // { keep }: поставить здание, keep - строить дальше то же
  BUILD_CANCEL: 'build-cancel', // отменить стройку
  SPAWN: 'spawn', // { id, count }: здание id создает рядом с собой count своих персонажей
}

export const bus = mitt()
