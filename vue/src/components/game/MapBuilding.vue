<template>
  <g
    class="map-building"
    :class="{ 'map-building--selected': selected }"
    @mousedown.left.exact.stop="bus.emit(EVENTS.SELECT, building.id)"
    @mousedown.left.shift.exact.stop="bus.emit(EVENTS.SELECT_TOGGLE, building.id)"
  >
    <template v-if="layout">
      <rect
        :x="layout.dock.minX" :y="layout.dock.minY"
        :width="layout.dock.maxX - layout.dock.minX" :height="layout.dock.maxY - layout.dock.minY"
        class="map-building__dock"
      />
      <rect
        v-for="(part, index) in layout.parts" :key="index"
        :x="part.minX" :y="part.minY" :width="part.maxX - part.minX" :height="part.maxY - part.minY"
        :fill="colorOf(group, building)"
      />
    </template>
    <rect
      v-else :x="building.x - type.size / 2" :y="building.y - type.size / 2"
      :width="type.size" :height="type.size" :fill="colorOf(group, building)"
    />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { BUILDING_TYPES } from '@/game/entities'
import { colorOf } from '@/game/groups'
import { shipyardLayout } from '@/game/placement'

const props = defineProps({
  building: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => BUILDING_TYPES[props.building.type])
const group = computed(() => store.getters['game/getGroup'](props.building.groupId))
const selected = computed(() => store.getters['game/isSelected'](props.building.id))
const layout = computed(() => props.building.type === 'shipyard' ? shipyardLayout(props.building) : null)
</script>

<style scoped lang="scss">
.map-building {
  stroke: rgba(0, 0, 0, 0.6);
  vector-effect: non-scaling-stroke;
  cursor: pointer;

  & > rect {
    vector-effect: non-scaling-stroke;
  }

  &__dock {
    fill: rgba(67, 139, 175, 0.45);
    stroke-dasharray: 4 3;
    vector-effect: non-scaling-stroke;
  }

  &--selected {
    stroke: #fff;
    stroke-width: 4;
  }
}
</style>
