import mitt from 'mitt'

export const EVENTS = {
  SELECT: 'select', // id объекта или null - снять выбор
  MOVE: 'move', // точка экрана, куда идти
}

export const bus = mitt()
