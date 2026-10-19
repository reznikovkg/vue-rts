<template>
  <div class="game">
    <GamePanel />
    <GameMap />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import GameMap from '@/components/game/GameMap.vue'
import GamePanel from '@/components/game/GamePanel.vue'
import { TICK_MS, CAMERA_SPEED } from '@/game/config'

const store = useStore()
const keys = new Set()
let timer = null

const onKeyDown = (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
  if (e.code === 'Escape') store.commit('game/SET_BUILD_TYPE', null)
  if (e.code.startsWith('Arrow')) e.preventDefault()
  keys.add(e.code)
}
const onKeyUp = (e) => keys.delete(e.code)

const loop = () => {
  const dx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
  const dy = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
  if (dx || dy) store.commit('game/MOVE_CAMERA', { dx: -dx * CAMERA_SPEED, dy: -dy * CAMERA_SPEED })
  store.dispatch('game/tick', TICK_MS / 1000)
}

onMounted(() => {
  store.commit('game/LOAD_SCENARIO', 0)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  timer = setInterval(loop, TICK_MS)
})

onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<style scoped>
.game {
  position: fixed;
  inset: 0;
  display: flex;
  background: #0b1320;
}
</style>
