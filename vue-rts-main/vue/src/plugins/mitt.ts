import mitt from 'mitt'

const emitter = mitt()

export const EVENT_NAMES = {
  CHANGE: 'CHANGE'
}

export default emitter
