// шина событий игры (mitt)
// компоненты сообщают что произошло, а обрабатывает это одно место - useGameEvents
// новые действия (атака, стройка, очередь приказов) - новое событие здесь и обработчик там

import mitt from 'mitt'

export const EVENTS = {
  SELECT: 'select', // id объекта или null - снять выбор
  MOVE: 'move', // точка экрана, куда идти
}

export const bus = mitt()
