<template>
  <main class="game">
    <div class="topbar">
      <span>Координаты: {{ pointer.x }}, {{ pointer.y }}</span>
    </div>
    <div
      ref="viewport"
      class="viewport"
      @click="selected = null"
      @contextmenu.prevent="moveSelected"
      @mousemove="updatePointer"
      @mouseleave="clearPointer"
    >
      <div class="world" :style="worldStyle">
        <div class="axis horizontal"></div>
        <div class="axis vertical"></div>
        <div class="origin">0, 0</div>
        <GameEntity
          v-for="entity in entities"
          :key="entity.id"
          :entity="entity"
          :selected="selected?.id === entity.id"
          @select="selected = $event"
        />
        <div v-if="destination" class="destination" :style="destinationStyle"></div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import GameEntity from '@/components/game/GameEntity.vue'
import { useCamera } from '@/composables/useCamera'
import { useEntityMovement } from '@/composables/useEntityMovement'
import { createEntities, type Entity } from '@/game/entities'
import { screenToWorld, world } from '@/game/world'
import type { Point } from '@/game/world'

const viewport = ref<HTMLElement | null>(null)
const pointer = ref({ x: 0, y: 0 })
const selected = ref<Entity | null>(null)
const destination = ref<Point | null>(null)
const entities = reactive<Entity[]>(createEntities())
const { camera, clearPointer, setPointer } = useCamera(viewport)
const { boundedTarget, move } = useEntityMovement(entities)
const worldStyle = computed(() => ({
  width: `${world.width}px`,
  height: `${world.height}px`,
  left: `${-camera.value.x}px`,
  top: `${-camera.value.y}px`,
}))
const destinationStyle = computed(() => ({
  left: `${destination.value!.x + world.width / 2 - 8}px`,
  top: `${world.height / 2 - destination.value!.y - 8}px`,
}))

const eventToWorld = (event: MouseEvent) => {
  const bounds = viewport.value!.getBoundingClientRect()
  return screenToWorld(event.clientX - bounds.left, event.clientY - bounds.top, camera.value)
}

const updatePointer = (event: MouseEvent) => {
  const bounds = viewport.value!.getBoundingClientRect()
  const x = event.clientX - bounds.left
  const y = event.clientY - bounds.top
  setPointer(x, y)
  pointer.value = screenToWorld(x, y, camera.value)
}

const moveSelected = (event: MouseEvent) => {
  if (!selected.value || selected.value.speed <= 0) return
  destination.value = boundedTarget(selected.value, eventToWorld(event))
  move(selected.value, destination.value)
}
</script>
