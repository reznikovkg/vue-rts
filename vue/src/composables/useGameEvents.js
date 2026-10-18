import { onBeforeUnmount, onMounted } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'

export const useGameEvents = () => {
  const store = useStore()
  const handlers = {
    [EVENTS.SELECT]: (id) => store.dispatch('game/select', id),
    [EVENTS.MOVE]: (point) => store.dispatch('game/moveSelected', point),
  }
  onMounted(() => Object.entries(handlers).forEach(([event, handler]) => bus.on(event, handler)))
  onBeforeUnmount(() => Object.entries(handlers).forEach(([event, handler]) => bus.off(event, handler)))
}
