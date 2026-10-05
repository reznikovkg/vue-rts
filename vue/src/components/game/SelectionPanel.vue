<template>
  <div class="selection-panel">
    <div v-if="entity === null">Nothing selected</div>
    <div v-else>
      <div><b>{{ entity.type.name }}</b> ({{ entity.kind }})</div>
      <div>Health: {{ entity.health }} / {{ entity.type.maxHealth }}</div>
      <div>Position: {{ Math.round(entity.position.x) }}, {{ Math.round(entity.position.y) }}</div>
      <div v-if="entity.type.speed">Speed: {{ entity.type.speed }}</div>
    </div>
    <div class="selection-panel__hint">
      LMB - select, RMB - move, WASD / arrows / middle drag - camera, wheel - zoom
    </div>
  </div>
</template>

<script setup>
defineProps({
  entity: {type: Object, default: null},
})
</script>

<style scoped lang="scss">
.selection-panel {
  display: flex;
  justify-content: space-between;
  height: 130px;
  padding: 8px;
  border-top: 1px solid #000;
  background: #eee;
  color: #000;

  &__hint {
    color: #555;
  }
}
</style>
