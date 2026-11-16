<template>
  <!-- вся карта в маленьком ромбе: объекты точками, рамка - что сейчас видно на экране -->
  <div class="mini-map">
    <svg class="mini-map__svg" :viewBox="viewBox" @mousedown.left="onPointer" @mousemove="onDrag">
      <!-- та же изометрия, что у камеры, только без сдвига и масштаба -->
      <g ref="world" transform="matrix(1 0.5 -1 0.5 0 0)">
        <polygon :points="outline" class="mini-map__ground" />
        <path :d="water" class="mini-map__water" />
        <path :d="forest" class="mini-map__forest" />
        <path :d="mountain" class="mini-map__mountain" />
        <rect v-for="dot in dots" :key="dot.id" v-bind="dot.rect" :fill="dot.color" />
        <polygon :points="frame" class="mini-map__frame" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import { screenToWorld } from '@/game/camera'
import { typeOf } from '@/game/entities'
import { TERRAIN_TYPES, terrainPath } from '@/game/map'
import { toBox } from '@/game/placement'
import { rectOf, toPoints } from '@/game/visuals'

const MIN_DOT = 3.5 // мелких персонажей рисуем крупнее, иначе их не видно

const store = useStore()
const world = ref(null)
const map = computed(() => store.getters['game/getMap'])

// границы ромба после изометрии: x' = x - y, y' = (x + y) / 2
const viewBox = computed(() => {
  const { minX, minY, maxX, maxY } = map.value.bounds
  const left = minX - maxY
  const top = (minX + minY) / 2
  return `${left} ${top} ${maxX - minY - left} ${(maxX + maxY) / 2 - top}`
})
const outline = computed(() => toPoints(map.value.outline))
const water = computed(() => terrainPath(map.value, TERRAIN_TYPES.WATER))
const forest = computed(() => terrainPath(map.value, TERRAIN_TYPES.FOREST))
const mountain = computed(() => terrainPath(map.value, TERRAIN_TYPES.MOUNTAIN))

const dots = computed(() => store.state.game.entities.map((entity) => ({
  id: entity.id,
  rect: rectOf(toBox(entity.x, entity.y, Math.max(typeOf(entity).size, MIN_DOT))),
  color: store.getters['game/getGroup'](entity.groupId)?.color ?? '#999999',
})))

// углы экрана, переведенные в координаты мира
const frame = computed(() => {
  const { camera, viewport } = store.state.game
  const corners = [
    { x: 0, y: 0 },
    { x: viewport.width, y: 0 },
    { x: viewport.width, y: viewport.height },
    { x: 0, y: viewport.height },
  ]
  return toPoints(corners.map((corner) => screenToWorld(camera, viewport, corner)))
})

// точка курсора -> координаты мира через обратную матрицу группы
const toWorld = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(world.value.getScreenCTM().inverse())

const onPointer = (e) => {
  store.dispatch('game/centerCamera', toWorld(e))
}

// тянем с зажатой кнопкой - камера едет за курсором
const onDrag = (e) => {
  if (e.buttons === 1) onPointer(e)
}
</script>

<style scoped lang="scss">
@use '@/assets/game-ui' as ui;

.mini-map {
  @include ui.panel;
  padding: 4px;

  &__svg {
    display: block;
    width: 160px;
    height: 80px;
    cursor: pointer;
  }

  &__ground {
    fill: #3f5f40;
  }

  &__water {
    fill: #3d5c6b;
  }

  &__forest {
    fill: #213528;
  }

  &__mountain {
    fill: #7b8285;
  }

  &__frame {
    fill: none;
    stroke: #fff;
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
}
</style>
