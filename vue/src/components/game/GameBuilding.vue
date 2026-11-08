<template>
  <div
    class="building"
    :class="[{ selected }, `building--group-${groupId}`]"
    :style="[buildingStyle, groupStyle]"
    v-bind="entityAttributes"
    @click.stop="$emit('select')"
  >
    <div class="building-wall building-wall--left"></div>
    <div class="building-wall building-wall--right"></div>
    <div class="building-door"></div>
    <div class="building-roof">
      <div class="roof-left"></div>
      <div class="roof-right"></div>
    </div>
    <BuildingHealthBar :health="health" :max-health="maxHealth" />
    <div v-if="selected" class="building-selection" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BuildingHealthBar from './BuildingHealthBar.vue'
import {
  getEntityAttributes,
  getGroupStyle,
} from './useGroupAppearance'

interface Props {
  buildingId: number
  groupId: number
  name: string
  health: number
  maxHealth: number
  size: number
  selected: boolean
  x: number
  y: number
}

const props = defineProps<Props>()

defineEmits<{
  select: []
}>()

const buildingStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  transform: `translate(-50%, -72%) scale(${props.size / 4.5})`,
}))

const groupStyle = computed(() => getGroupStyle(props.groupId))

const entityAttributes = computed(() => getEntityAttributes(
  'building',
  props.buildingId,
  `${props.name} · группа ${props.groupId} · HP ${Math.ceil(props.health)}`,
))
</script>

<style scoped lang="scss">
.building {
  position: absolute;
  width: 280px;
  height: 250px;
  transform-origin: center;
  pointer-events: auto;
  cursor: pointer;
  z-index: 4;
}

.building-selection {
  position: absolute;
  left: 50%;
  top: 125px;
  width: 236px;
  height: 118px;
  border: 3px solid var(--group-color);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 7;
}

.building-wall {
  position: absolute;
  top: 61px;
  width: 104px;
  height: 103px;
  border: 2px solid #65452e;
  z-index: 2;
}

.building-wall--left {
  left: 23px;
  background: linear-gradient(90deg, #c9a071, #b88b59);
  clip-path: polygon(0 0, 100% 50%, 100% 100%, 0 50%);
}

.building-wall--right {
  right: 23px;
  background: linear-gradient(90deg, #9a7049, #805536);
  clip-path: polygon(0 50%, 100% 0, 100% 50%, 0 100%);
}

.building-door {
  position: absolute;
  left: 50%;
  top: 96px;
  width: 30px;
  height: 56px;
  background: #493124;
  border: 3px solid #67452d;
  transform: translateX(-50%);
  z-index: 3;
}

.building-roof {
  position: absolute;
  left: 50%;
  top: 0;
  width: 260px;
  height: 140px;
  transform: translateX(-50%);
  z-index: 5;
}

.roof-left {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #d36b4b, #b94f38);
  clip-path: polygon(0 44%, 50% 0, 50% 100%, 0 55%);
}

.roof-right {
  position: absolute;
  inset: 0;
  background: linear-gradient(225deg, #98412f, #773326);
  clip-path: polygon(50% 0, 100% 44%, 100% 55%, 50% 100%);
}

.building-roof::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  width: 4px;
  height: 100%;
  background: rgba(70, 35, 25, 0.45);
  transform: translateX(-50%);
}
</style>
