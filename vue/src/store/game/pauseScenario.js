import { createInitialState } from './initialState'

export function handlePause(state, event) {
  state.isPaused = typeof event.isPaused === 'boolean'
    ? event.isPaused
    : !state.isPaused
}

export function handleScenario(state, event) {
  Object.assign(state, createInitialState(event.name))
}
