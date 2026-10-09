<template>
  <g
      :class="{'building--under-construction': isUnderConstruction}"
      class="building"
      @mousedown.left.stop="$emit('select', building.id, $event.shiftKey)"
      @mousedown.right.stop="$emit('command', building.id, $event.shiftKey)"
  >
    <polygon :points="faces.left" fill="#8a8a8a" stroke="#000"/>
    <polygon :points="faces.right" fill="#a8a8a8" stroke="#000"/>
    <polygon
        :points="faces.top"
        :stroke-dasharray="isUnderConstruction ? '6 6' : 'none'"
        :stroke-width="isSelected ? 3 : 1"
        fill="#c4c4c4"
        stroke="#000"
    />

    <g :transform="'translate(0 ' + -visibleHeight + ')'">
      <g :transform="ISO_GROUND_TRANSFORM">
        <rect
            v-for="(rect, index) in roofDecals.rects"
            :key="'rect-' + index"
            :fill="rect.fill"
            :height="rect.height"
            :width="rect.width"
            :x="rect.x"
            :y="rect.y"
        />
        <circle
            v-for="(circle, index) in roofDecals.circles"
            :key="'circle-' + index"
            :cx="circle.x"
            :cy="circle.y"
            :fill="circle.fill"
            :r="circle.radius"
        />
      </g>
    </g>

    <g v-if="isTurret" :transform="'translate(0 ' + -visibleHeight + ')'">
      <g v-for="slice in TURRET_SLICES" :key="slice.lift" :transform="'translate(0 ' + -slice.lift + ')'">
        <g :transform="ISO_GROUND_TRANSFORM">
          <g :transform="turretHeadTransform">
            <rect :fill="getColor(slice.color)" height="10" width="30" x="0" y="-5"/>
            <circle :fill="getColor(slice.color)" r="14"/>
          </g>
        </g>
      </g>
      <g :transform="'translate(0 ' + -TURRET_TOP_LIFT + ')'">
        <g :transform="ISO_GROUND_TRANSFORM">
          <g :transform="turretHeadTransform">
            <rect :fill="getColor('dark')" height="10" stroke="#000" stroke-opacity="0.5" width="30" x="0" y="-5"/>
            <circle :fill="getColor('body')" r="14" stroke="#000" stroke-opacity="0.5"/>
            <circle :fill="groupColor" r="5"/>
          </g>
        </g>
      </g>
    </g>

    <template v-if="!isUnderConstruction">
      <g
          v-for="(vent, index) in ventScreenPoints"
          :key="'vent-' + index"
          :transform="'translate(' + vent.x + ' ' + vent.y + ')'"
          class="building__smoke-source"
      >
        <circle v-for="begin in SMOKE_PUFF_BEGINS" :key="begin" fill="#e6e6e6">
          <animate :begin="begin" attributeName="cx" dur="3s" repeatCount="indefinite" values="0; 4"/>
          <animate :begin="begin" attributeName="cy" dur="3s" repeatCount="indefinite" values="0; -36"/>
          <animate :begin="begin" attributeName="r" dur="3s" repeatCount="indefinite" values="2.5; 10"/>
          <animate :begin="begin" attributeName="opacity" dur="3s" repeatCount="indefinite" values="0.6; 0"/>
        </circle>
      </g>
    </template>

    <g :transform="'translate(' + center.x + ' ' + center.y + ')'">
      <g v-if="isUnderConstruction" :transform="'translate(0 ' + -(visibleHeight + 30) + ')'" class="building__progress">
        <text fill="#000" font-size="12" text-anchor="middle" y="-4">
          {{ Math.floor(building.constructionProgress * 100) }}%
        </text>
      </g>
      <HealthBar
          v-if="isSelected || isUnderConstruction || building.health < building.type.maxHealth"
          :color="groupColor"
          :health="building.health"
          :height="visibleHeight + 16"
          :max-health="building.type.maxHealth"
          :width="building.type.size * 24"
      />
    </g>
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {getGroupColor} from '@/game/groups.js'
import {ISO_GROUND_TRANSFORM, pointsToSvgString, worldToIso} from '@/game/projection.js'
import {BUILDING_SPRITES} from '@/sprites/buildingSprites.js'
import {SPRITE_COLORS} from '@/sprites/unitSprites.js'
import HealthBar from './HealthBar.vue'

const MIN_CONSTRUCTION_HEIGHT_FRACTION = 0.1
const SMOKE_PUFF_BEGINS = ['0s', '-1.5s']
const TURRET_SLICES = [{lift: 0, color: 'dark'}, {lift: 2, color: 'dark'}, {lift: 4, color: 'dark'}]
const TURRET_TOP_LIFT = 6

const props = defineProps({
  building: {type: Object, required: true},
  isSelected: {type: Boolean, default: false},
})

defineEmits(['select', 'command'])

const raise = (point, height) => {
  return {x: point.x, y: point.y - height}
}

const sprite = computed(() => BUILDING_SPRITES[props.building.type.sprite])
const center = computed(() => worldToIso(props.building.position))
const isUnderConstruction = computed(() => props.building.constructionProgress < 1)
const visibleHeight = computed(() => {
  const heightFraction = Math.max(props.building.constructionProgress, MIN_CONSTRUCTION_HEIGHT_FRACTION)
  return props.building.type.height * heightFraction
})
const groupColor = computed(() => getGroupColor(props.building.groupId))
const isTurret = computed(() => props.building.type.damage > 0)
const turretHeadTransform = computed(() => {
  const position = props.building.position
  const facingDegrees = props.building.facing * 180 / Math.PI
  return 'translate(' + position.x + ' ' + position.y + ') rotate(' + facingDegrees + ')'
})

const getColor = (colorName) => {
  if (colorName === 'group') {
    return groupColor.value
  }
  return SPRITE_COLORS[colorName]
}

const toWorldPoint = (roofPoint) => {
  const footprint = props.building.footprint
  return {
    x: footprint.minX + (footprint.maxX - footprint.minX) * roofPoint.u,
    y: footprint.minY + (footprint.maxY - footprint.minY) * roofPoint.v,
  }
}

const roofDecals = computed(() => {
  const sideLength = props.building.footprint.maxX - props.building.footprint.minX
  const rects = []
  const circles = []

  for (let index = 0; index < sprite.value.rects.length; index++) {
    const decal = sprite.value.rects[index]
    const from = toWorldPoint(decal.from)
    const to = toWorldPoint(decal.to)
    rects.push({x: from.x, y: from.y, width: to.x - from.x, height: to.y - from.y, fill: getColor(decal.color)})
  }

  for (let index = 0; index < sprite.value.circles.length; index++) {
    const decal = sprite.value.circles[index]
    const centerPoint = toWorldPoint(decal.center)
    circles.push({x: centerPoint.x, y: centerPoint.y, radius: decal.radius * sideLength, fill: getColor(decal.color)})
  }

  return {rects: rects, circles: circles}
})

const ventScreenPoints = computed(() => {
  const points = []
  for (let index = 0; index < sprite.value.vents.length; index++) {
    const ventOnGround = worldToIso(toWorldPoint(sprite.value.vents[index]))
    points.push(raise(ventOnGround, visibleHeight.value))
  }
  return points
})

const faces = computed(() => {
  const footprint = props.building.footprint
  const height = visibleHeight.value

  const backCorner = worldToIso({x: footprint.minX, y: footprint.minY})
  const rightCorner = worldToIso({x: footprint.maxX, y: footprint.minY})
  const frontCorner = worldToIso({x: footprint.maxX, y: footprint.maxY})
  const leftCorner = worldToIso({x: footprint.minX, y: footprint.maxY})

  return {
    left: pointsToSvgString([leftCorner, frontCorner, raise(frontCorner, height), raise(leftCorner, height)]),
    right: pointsToSvgString([frontCorner, rightCorner, raise(rightCorner, height), raise(frontCorner, height)]),
    top: pointsToSvgString([
      raise(backCorner, height),
      raise(rightCorner, height),
      raise(frontCorner, height),
      raise(leftCorner, height),
    ]),
  }
})
</script>

<style scoped lang="scss">
.building {
  cursor: pointer;

  &--under-construction {
    opacity: 0.6;
  }

  &__smoke-source,
  &__progress {
    pointer-events: none;
  }
}
</style>
