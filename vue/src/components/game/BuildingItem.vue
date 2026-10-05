<template>
  <rect
      :fill="building.type.color"
      :height="building.type.height"
      :stroke-dasharray="isSelected ? '6 6' : 'none'"
      :width="building.type.width"
      :x="building.position.x - building.type.width / 2"
      :y="building.position.y - building.type.height / 2"
      class="building"
      stroke="#000"
      @mousedown.left.stop="$emit('select', building.id)"
  />
</template>

<script setup>
defineProps(
    {
      building: {
        type: Object,
        required: true
      },
      isSelected: {type: Boolean, default: false},
    }
)

defineEmits(
    ['select'])
</script>

<style scoped lang="scss">
.building {
  cursor: pointer;
}
</style>
