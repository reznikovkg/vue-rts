<template>
  <g class="effects-layer">
    <template v-for="effect in drawnEffects" :key="effect.id">
      <line
          v-if="effect.type === EFFECT_TYPES.SHOT"
          :stroke-opacity="effect.fade"
          :x1="effect.from.x"
          :x2="effect.to.x"
          :y1="effect.from.y"
          :y2="effect.to.y"
          stroke="#222"
          stroke-width="2"
      />
      <circle
          v-else
          :cx="effect.center.x"
          :cy="effect.center.y"
          :r="effect.radius"
          :stroke-opacity="effect.fade"
          fill="none"
          stroke="#222"
          stroke-width="3"
      />
    </template>
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {EFFECT_TYPES} from '@/game/effects.js'
import {worldToIso} from '@/game/projection.js'

const props = defineProps({
  effects: {type: Array, required: true},
})

const toScreen = (point, height) => {
  const groundPoint = worldToIso(point)
  return {x: groundPoint.x, y: groundPoint.y - height}
}

const describeEffect = (effect) => {
  const fade = effect.secondsLeft / effect.duration

  if (effect.type === EFFECT_TYPES.SHOT) {
    return {
      id: effect.id,
      type: effect.type,
      fade: fade,
      from: toScreen(effect.from, effect.fromHeight),
      to: toScreen(effect.to, effect.toHeight),
    }
  }

  return {
    id: effect.id,
    type: effect.type,
    fade: fade,
    center: toScreen(effect.position, effect.height),
    radius: effect.size * (1 - fade),
  }
}

const drawnEffects = computed(() => {
  const result = []
  for (let index = 0; index < props.effects.length; index++) {
    result.push(describeEffect(props.effects[index]))
  }
  return result
})
</script>

<style scoped lang="scss">
.effects-layer {
  pointer-events: none;
}
</style>
