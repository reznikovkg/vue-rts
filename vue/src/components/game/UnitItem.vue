<template>
  <g
      class="unit"
      @mousedown.left.stop="$emit('select', unit.id)">
    <circle
        v-if="isSelected"
        :cx="unit.position.x"
        :cy="unit.position.y"
        :r="unit.type.radius + 4"
        fill="none"
        stroke="#000"
        stroke-dasharray="3 3"
    />
    <circle
        :cx="unit.position.x"
        :cy="unit.position.y"
        :fill="unit.type.color"
        :r="unit.type.radius"
        stroke="#000"
    />
  </g>
</template>

<script setup>
defineProps({
  unit: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
})

defineEmits(['select'])
</script>

<style scoped lang="scss">
.unit {
  cursor: pointer;
}
</style>
