<template>
  <div class="selection-panel">
    <template v-if="entity">
      <b>{{ type.name }}</b>
      <span v-if="type.speed">, скорость {{ type.speed }} кл/с</span>
      <span>, клетка ({{ Math.floor(entity.x) }}, {{ Math.floor(entity.y) }})</span>
    </template>
    <template v-else>
      ЛКМ - выбрать, ПКМ - идти, WASD / край экрана / свайп - камера, щипок / Ctrlколесо - масштаб
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { typeOf } from '@/game/entities'

const store = useStore()
const entity = computed(() => store.getters['game/getSelected'][0] ?? null)
const type = computed(() => entity.value && typeOf(entity.value))
</script>

<style scoped lang="scss">
.selection-panel {
  padding: 6px 12px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #e6e6e6;
  font-size: 13px;
  white-space: nowrap;
}
</style>