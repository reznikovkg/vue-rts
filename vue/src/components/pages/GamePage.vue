<template>
  <div class="game-page">
    <GameMap
      @tile-click="onTileClick"
      @tile-right-click="onTileRightClick"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useStore } from 'vuex'
import GameMap from '@/components/GameMap.vue'

const store = useStore()

onMounted(() => {
  store.dispatch('gameObjects/createObject', {
    type: 'unit',
    x: 0,
    y: 0,
    speed: 150
  })
  store.dispatch('gameObjects/createObject', {
    type: 'unit',
    x: 100,
    y: 100,
    speed: 80
  })
  store.dispatch('gameObjects/createObject', {
    type: 'building',
    x: -150,
    y: 80,
    speed: 0
  })
})

function onTileClick(tile) {
  const objects = store.state.gameObjects.objects
  const hit = objects.find(obj =>
    Math.hypot(obj.x - tile.worldX, obj.y - tile.worldY) < 32
  )
  if (hit)
    store.dispatch('gameObjects/selectObject', hit.id)
  else
    store.commit('gameObjects/DESELECT_ALL')
}

function onTileRightClick(tile) {
  const selected = store.getters['gameObjects/selectedObject']
  if (selected && selected.movable) {
    store.dispatch('gameObjects/moveSelectedTo', {
      x: tile.worldX,
      y: tile.worldY
    })
  }
}
</script>

<style scoped>
  .game-page {
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
</style>