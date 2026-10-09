<template>
  <g
      :transform="'translate(' + screenPosition.x + ' ' + screenPosition.y + ')'"
      class="unit"
      @mousedown.left.stop="$emit('select', unit.id, $event.shiftKey)"
      @mousedown.right.stop="$emit('command', unit.id, $event.shiftKey)"
  >
    <ellipse
        v-if="isSelected"
        :rx="unit.type.radius + 6"
        :ry="(unit.type.radius + 6) / 2"
        fill="none"
        stroke="#000"
        stroke-dasharray="3 3"
        vector-effect="non-scaling-stroke"
    />
    <UnitSprite
        :altitude="unit.altitude"
        :facing="getDrawnFacing(unit.facing)"
        :group-id="unit.groupId"
        :is-mining="unit.isMining"
        :is-moving="unit.isMoving"
        :radius="unit.type.radius"
        :sprite-key="unit.type.sprite"
    />
    <HealthBar
        v-if="isSelected || unit.health < unit.type.maxHealth"
        :color="getGroupColor(unit.groupId)"
        :health="unit.health"
        :height="unit.altitude + unit.type.radius + 20"
        :max-health="unit.type.maxHealth"
        :width="unit.type.radius * 2"
    />
  </g>
</template>

<script setup>
import {computed} from 'vue'
import {getGroupColor} from '@/game/groups.js'
import {worldToIso} from '@/game/projection.js'
import HealthBar from './HealthBar.vue'
import UnitSprite from './UnitSprite.vue'

const props = defineProps({
  unit: {type: Object, required: true},
  isSelected: {type: Boolean, default: false},
})

defineEmits(['select', 'command'])

const FACING_STEP_RADIANS = Math.PI / 36

const getDrawnFacing = (facing) => {
  return Math.round(facing / FACING_STEP_RADIANS) * FACING_STEP_RADIANS
}

const screenPosition = computed(() => worldToIso(props.unit.position))
</script>

<style scoped lang="scss">
.unit {
  cursor: pointer;
}
</style>
