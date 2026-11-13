import { createStore } from 'vuex'

import game from './modules/game'
import map from './modules/map'
import events from './modules/events'
import frame from './modules/frame'

export default createStore({
  modules: {
    game,
    map,
    events,
    frame
    // list
  }
})