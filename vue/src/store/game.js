import { START_OBJECTS, START_UNITS, UNIT_TYPES } from '@/game/config'
import { clampToMap } from '@/game/coords'
import { isBlocked } from '@/game/obstacles'

const MUTATIONS = {
  SET_SELECTED_IDS: 'SET_SELECTED_IDS',
  SET_UNIT_TARGET: 'SET_UNIT_TARGET',
  MOVE_UNITS: 'MOVE_UNITS',
}

const MIN_SLIDE = 0.01
const FORMATION_STEP = 40

// состояние игры: что стоит на карте и что выбрано
export default {
  namespaced: true,
  state () {
    return {
      objects: structuredClone(START_OBJECTS),
      units: structuredClone(START_UNITS),
      selectedIds: [],
    }
  },
  getters: {
    getObjects: (state) => state.objects,
    getUnits: (state) => state.units,
    getSelectedIds: (state) => state.selectedIds,
    getSelected: (state) => {
      if (state.selectedIds.length !== 1) {
        return null
      }
      const id = state.selectedIds[0]
      return state.objects.find((o) => o.id === id) ?? state.units.find((u) => u.id === id) ?? null
    },
    getSelectedUnits: (state) => state.units.filter((u) => state.selectedIds.includes(u.id)),
  },
  mutations: {
    [MUTATIONS.SET_SELECTED_IDS]: (state, ids) => {
      state.selectedIds = ids
    },
    [MUTATIONS.SET_UNIT_TARGET]: (state, { id, target }) => {
      const unit = state.units.find((u) => u.id === id)
      if (unit) {
        unit.target = target
      }
    },
    [MUTATIONS.MOVE_UNITS]: (state, secondsPassed) => {
      for (const u of state.units) {
        if (u.target) {
          const dx = u.target.x - u.position.x
          const dy = u.target.y - u.position.y
          const dist = Math.hypot(dx, dy)
          const step = UNIT_TYPES[u.type].speedPxPerSecond * secondsPassed

          const next = dist <= step
            ? u.target
            : { x: u.position.x + (dx / dist) * step, y: u.position.y + (dy / dist) * step }

          const margin = UNIT_TYPES[u.type].width / 2
          const blocked = (point) => isBlocked(point, state.objects, margin)

          if (!blocked(next) || blocked(u.position)) {
            u.position = next
            if (next === u.target) {
              u.target = null
            }
          } else {
            const slides = []
            if (Math.abs(dx) > MIN_SLIDE) {
              slides.push({ x: u.position.x + Math.sign(dx) * Math.min(step, Math.abs(dx)), y: u.position.y })
            }
            if (Math.abs(dy) > MIN_SLIDE) {
              slides.push({ x: u.position.x, y: u.position.y + Math.sign(dy) * Math.min(step, Math.abs(dy)) })
            }
            const slide = slides.find((point) => !blocked(point))
            if (slide) {
              u.position = slide
            } else {
              u.target = null
            }
          }
        }
      }
    },
  },
  actions: {
    select: (store, id) => {
      store.commit(MUTATIONS.SET_SELECTED_IDS, id === null ? [] : [id])
    },
    selectMany: (store, ids) => {
      store.commit(MUTATIONS.SET_SELECTED_IDS, ids)
    },
    moveSelected: (store, point) => {
      const units = store.getters.getSelectedUnits
      const columns = Math.ceil(Math.sqrt(units.length))
      const rows = Math.ceil(units.length / columns)
      units.forEach((unit, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)
        store.commit(MUTATIONS.SET_UNIT_TARGET, {
          id: unit.id,
          target: clampToMap({
            x: point.x + (column - (columns - 1) / 2) * FORMATION_STEP,
            y: point.y + (row - (rows - 1) / 2) * FORMATION_STEP,
          }),
        })
      })
    },
    moveUnits: (store, secondsPassed) => {
      if (store.state.units.some((u) => u.target)) {
        store.commit(MUTATIONS.MOVE_UNITS, secondsPassed)
      }
    },
  },
}
