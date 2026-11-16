import { createInitialState } from './initialState'

export const handlePause = (state, event) => {
  state.isPaused = typeof event.isPaused === 'boolean'
    ? event.isPaused
    : !state.isPaused
}

export const handleScenario = (state, event) => {
  Object.assign(state, createInitialState(event.name))
}
