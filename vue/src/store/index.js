import { createStore } from 'vuex'
import game from './game'
import world from './world'
import selection from './selection'
import events from './events'
import camera from './camera'
import engine from './engine'
import construction from './construction'

export default createStore({
  modules: {
    game,
    world,
    selection,
    events,
    camera,
    engine,
    construction,
  },
})
