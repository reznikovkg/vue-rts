import { createInitialState } from './initialState'
import { setSelection } from './selection'
import { orderUnits, startNextCommand } from './commands'
import { handlePause, handleScenario } from './pauseScenario'
import { handleSpawn } from './spawn'
import {
  handleBuild,
  handleBuildMode,
  handleSelfDestruct,
} from './buildActions'
import { handleAssignGroup, handleSelectGroup } from './groups'
import { updateAttack } from './combat'
import { updateMovement } from './movement'
import { finishIfGameOver } from './gameOver'

function applyEvent(state, event) {
  switch (event.type) {
    case 'select':
      setSelection(state, event.unitIds, event.buildingId, event.append)
      break
    case 'clearSelection':
      setSelection(state)
      break
    case 'pause':
      handlePause(state, event)
      break
    case 'buildMode':
      handleBuildMode(state, event)
      break
    case 'move':
      orderUnits(state, event.unitIds, {
        type: 'move',
        destination: event.destination,
      }, event.append)
      break
    case 'attack':
      orderUnits(state, event.unitIds, {
        type: 'attack',
        targetType: event.targetType,
        targetId: event.targetId,
      }, event.append)
      break
    case 'spawn':
      handleSpawn(state, event)
      break
    case 'build':
      handleBuild(state, event)
      break
    case 'selfDestruct':
      handleSelfDestruct(state, event)
      break
    case 'assignGroup':
      handleAssignGroup(state, event)
      break
    case 'selectGroup':
      handleSelectGroup(state, event)
      break
    case 'scenario':
      handleScenario(state, event)
      break
  }
}

function updateUnit(state, unit, deltaTime) {
  if (!state.units.some(current => current.id === unit.id)) return

  const command = unit.activeCommand

  if (!command) {
    if (unit.commandQueue.length) startNextCommand(state, unit)
    return
  }

  if (command.type === 'attack') {
    const handled = updateAttack(
      state,
      unit,
      command,
      deltaTime,
      startNextCommand,
    )

    if (handled) return
  }

  updateMovement(state, unit, command, deltaTime)
}

export function applyFrame(state, { deltaTime, events }) {
  events.forEach(event => applyEvent(state, event))
  if (state.isPaused || state.result) return

  state.units.slice().forEach(unit => updateUnit(state, unit, deltaTime))
  finishIfGameOver(state)
}

export function advanceFrame({ commit, rootState }, deltaTime) {
  const queuedEvents = rootState.events.queue
  const scenarioEvent = queuedEvents.find(event => event.type === 'scenario')
  let events

  if (scenarioEvent) {
    events = [scenarioEvent]
  } else if (rootState.game.isPaused || rootState.game.result) {
    const pauseIndex = queuedEvents.findIndex(event => event.type === 'pause')
    events = pauseIndex < 0
      ? []
      : queuedEvents.slice(0, pauseIndex + 1)
  } else {
    const pauseIndex = queuedEvents.findIndex(event => event.type === 'pause')
    events = pauseIndex < 0
      ? queuedEvents
      : queuedEvents.slice(0, pauseIndex + 1)
  }

  if (events.length === 0 && (rootState.game.isPaused || rootState.game.result)) {
    return
  }

  commit('applyFrame', {
    deltaTime,
    events,
  })

  const processedIds = events.some(event => event.type === 'scenario')
    ? queuedEvents.map(event => event.id)
    : events.map(event => event.id)
  commit('events/consume', processedIds, { root: true })
}
