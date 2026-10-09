<template>
  <g class="star-field">
    <defs>
      <pattern
          v-for="layer in layers"
          :id="layer.id"
          :key="layer.id"
          :height="layer.tileSize"
          :patternTransform="'translate(' + layer.offset.x + ' ' + layer.offset.y + ')'"
          :width="layer.tileSize"
          patternUnits="userSpaceOnUse"
      >
        <circle
            v-for="(star, index) in layer.stars"
            :key="index"
            :cx="star.x"
            :cy="star.y"
            :fill-opacity="star.brightness"
            :r="star.radius"
            fill="#fff"
        >
          <animate
              v-if="star.isTwinkling"
              :begin="-star.twinkleDelay + 's'"
              attributeName="opacity"
              dur="4s"
              repeatCount="indefinite"
              values="1; 0.2; 1"
          />
        </circle>
      </pattern>
    </defs>
    <rect :height="viewport.height" :width="viewport.width" fill="#0b0e1a"/>
    <rect
        v-for="layer in layers"
        :key="layer.id + '-fill'"
        :fill="'url(#' + layer.id + ')'"
        :height="viewport.height"
        :width="viewport.width"
    />
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {worldToIso} from '@/game/projection.js'

const LAYER_SETTINGS = [
  {id: 'stars-far', seed: 7, tileSize: 420, count: 60, maxRadius: 1, parallax: 0.04},
  {id: 'stars-near', seed: 13, tileSize: 640, count: 30, maxRadius: 1.8, parallax: 0.1},
]
const TWINKLING_STAR_STEP = 5
const MAX_TWINKLE_DELAY_SECONDS = 4

const props = defineProps({
  camera: {type: Object, required: true},
  viewport: {type: Object, required: true},
})

const createRandom = (seed) => {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

const createStars = (settings) => {
  const random = createRandom(settings.seed)
  const stars = []
  for (let index = 0; index < settings.count; index++) {
    stars.push({
      x: random() * settings.tileSize,
      y: random() * settings.tileSize,
      radius: 0.4 + random() * settings.maxRadius,
      brightness: 0.3 + random() * 0.7,
      isTwinkling: index % TWINKLING_STAR_STEP === 0,
      twinkleDelay: random() * MAX_TWINKLE_DELAY_SECONDS,
    })
  }
  return stars
}

const starsByLayer = []
for (let index = 0; index < LAYER_SETTINGS.length; index++) {
  starsByLayer.push(createStars(LAYER_SETTINGS[index]))
}

const layers = computed(() => {
  const cameraOnScreen = worldToIso(props.camera)
  const result = []
  for (let index = 0; index < LAYER_SETTINGS.length; index++) {
    const settings = LAYER_SETTINGS[index]
    result.push({
      id: settings.id,
      tileSize: settings.tileSize,
      stars: starsByLayer[index],
      offset: {
        x: -cameraOnScreen.x * settings.parallax,
        y: -cameraOnScreen.y * settings.parallax,
      },
    })
  }
  return result
})
</script>

<style scoped lang="scss">
.star-field {
  pointer-events: none;
}
</style>
