<template>
  <g>
    <g :transform="getPlaneTransform(-altitude)">
      <path :d="sprite.shadow" fill="#000" fill-opacity="0.25"/>
    </g>

    <g v-if="isMining" class="unit-sprite__beam">
      <line :y1="-altitude" stroke="#b08d57" stroke-dasharray="4 3" stroke-width="2" x1="0" x2="0" y2="0">
        <animate attributeName="stroke-dashoffset" dur="0.4s" repeatCount="indefinite" values="0; 7"/>
      </line>
      <ellipse fill="#b08d57" rx="8" ry="4">
        <animate attributeName="opacity" dur="0.6s" repeatCount="indefinite" values="0.8; 0.2; 0.8"/>
      </ellipse>
    </g>

    <g>
      <animateTransform
          v-if="bodyMotion !== null"
          :dur="bodyMotion.duration"
          :values="bodyMotion.values"
          attributeName="transform"
          calcMode="spline"
          keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          keyTimes="0; 0.5; 1"
          repeatCount="indefinite"
          type="translate"
      />

      <template v-for="(exhaust, index) in planeExhausts" :key="'plane-' + index">
        <g :transform="getPlaneTransform(exhaust.z)">
          <path v-if="exhaust.kind === EXHAUST_KINDS.FLAME" :d="getFlamePath(exhaust)" fill="#f4f4f4">
            <animate attributeName="opacity" dur="0.24s" repeatCount="indefinite" values="0.5; 1; 0.5"/>
          </path>
          <circle
              v-else
              :cx="exhaust.x"
              :cy="exhaust.y"
              fill="none"
              stroke="#f4f4f4"
              vector-effect="non-scaling-stroke"
          >
            <animate attributeName="r" dur="1s" repeatCount="indefinite" values="2; 12"/>
            <animate attributeName="opacity" dur="1s" repeatCount="indefinite" values="0.8; 0"/>
          </circle>
        </g>
      </template>

      <g v-for="layer in sprite.layers" :key="layer.z" :transform="getPlaneTransform(layer.z)">
        <path
            v-for="(slice, index) in layer.slices"
            :key="index"
            :d="slice.d"
            :fill="getColor(slice.color)"
            :stroke="slice.isOutlined ? '#000' : 'none'"
            stroke-opacity="0.5"
            stroke-width="0.5"
            vector-effect="non-scaling-stroke"
        >
          <animateTransform
              v-if="isMoving && slice.stepPhase !== undefined"
              :begin="slice.stepPhase"
              attributeName="transform"
              dur="0.5s"
              repeatCount="indefinite"
              type="translate"
              values="-3 0; 3 0; -3 0"
          />
        </path>
      </g>

      <g
          v-for="(exhaust, index) in steamExhausts"
          :key="'steam-' + index"
          :transform="'translate(' + exhaust.x + ' ' + exhaust.y + ')'"
          class="unit-sprite__steam-source"
      >
        <circle v-for="begin in STEAM_PUFF_BEGINS" :key="begin" fill="#f4f4f4">
          <animate :begin="begin" attributeName="cy" dur="1.6s" repeatCount="indefinite" values="0; -18"/>
          <animate :begin="begin" attributeName="r" dur="1.6s" repeatCount="indefinite" values="1.5; 4.5"/>
          <animate :begin="begin" attributeName="opacity" dur="1.6s" repeatCount="indefinite" values="0.7; 0"/>
        </circle>
      </g>
    </g>
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {getGroupColor} from '@/game/groups.js'
import {ISO_GROUND_TRANSFORM, worldToIso} from '@/game/projection.js'
import {BODY_ANIMATIONS, EXHAUST_KINDS, EXHAUST_MOMENTS, SPRITE_COLORS, UNIT_SPRITES} from '@/sprites/unitSprites.js'

const FLAME_LENGTH = 8
const FLAME_WIDTH = 2.5
const STEAM_PUFF_BEGINS = ['0s', '-0.8s']
const BODY_MOTIONS = {
  [BODY_ANIMATIONS.HOVER]: {values: '0 0; 0 -4; 0 0', duration: '2.4s'},
  [BODY_ANIMATIONS.FLOAT]: {values: '0 0; 0 1.5; 0 0', duration: '3s'},
}

const props = defineProps({
  spriteKey: {type: String, required: true},
  facing: {type: Number, required: true},
  altitude: {type: Number, required: true},
  radius: {type: Number, required: true},
  groupId: {type: Number, required: true},
  isMoving: {type: Boolean, required: true},
  isMining: {type: Boolean, required: true},
})

const sprite = computed(() => UNIT_SPRITES[props.spriteKey])
const facingDegrees = computed(() => props.facing * 180 / Math.PI)
const spriteScale = computed(() => props.radius / sprite.value.designRadius)
const bodyMotion = computed(() => {
  const motion = BODY_MOTIONS[sprite.value.bodyAnimation]
  if (motion === undefined) {
    return null
  }
  return motion
})

const getColor = (colorName) => {
  if (colorName === 'group') {
    return getGroupColor(props.groupId)
  }
  return SPRITE_COLORS[colorName]
}

const getPlaneTransform = (z) => {
  const lift = 'translate(0 ' + -(props.altitude + z * spriteScale.value) + ')'
  const orientation = 'rotate(' + facingDegrees.value + ') scale(' + spriteScale.value + ')'
  return lift + ' ' + ISO_GROUND_TRANSFORM + ' ' + orientation
}

const getFlamePath = (exhaust) => {
  const tipX = exhaust.x - FLAME_LENGTH
  return 'M ' + exhaust.x + ' ' + (exhaust.y - FLAME_WIDTH)
      + ' L ' + tipX + ' ' + exhaust.y
      + ' L ' + exhaust.x + ' ' + (exhaust.y + FLAME_WIDTH) + ' Z'
}

const isExhaustActive = (exhaust) => {
  if (exhaust.moment === EXHAUST_MOMENTS.MOVING) {
    return props.isMoving
  }
  return !props.isMoving
}

const getExhaustScreenOffset = (exhaust) => {
  const cos = Math.cos(props.facing)
  const sin = Math.sin(props.facing)
  const scale = spriteScale.value
  const groundOffset = worldToIso({
    x: (exhaust.x * cos - exhaust.y * sin) * scale,
    y: (exhaust.x * sin + exhaust.y * cos) * scale,
  })
  return {x: groundOffset.x, y: groundOffset.y - props.altitude - exhaust.z * scale}
}

const planeExhausts = computed(() => {
  const result = []
  for (let index = 0; index < sprite.value.exhausts.length; index++) {
    const exhaust = sprite.value.exhausts[index]
    if (exhaust.kind !== EXHAUST_KINDS.STEAM && isExhaustActive(exhaust)) {
      result.push(exhaust)
    }
  }
  return result
})

const steamExhausts = computed(() => {
  const result = []
  for (let index = 0; index < sprite.value.exhausts.length; index++) {
    const exhaust = sprite.value.exhausts[index]
    if (exhaust.kind === EXHAUST_KINDS.STEAM && isExhaustActive(exhaust)) {
      result.push(getExhaustScreenOffset(exhaust))
    }
  }
  return result
})
</script>

<style scoped lang="scss">
.unit-sprite__steam-source,
.unit-sprite__beam {
  pointer-events: none;
}
</style>
