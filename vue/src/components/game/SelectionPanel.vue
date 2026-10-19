<template>
  <div class="selection-panel">
    <div class="selection-panel__info">
      <template v-if="!objects.length">Ничего не выбрано</template>
      <template v-else-if="objects.length === 1">
        <b>{{ objects[0].type.name }}</b>
        <div>Здоровье: {{ objects[0].health }} / {{ objects[0].type.maxHealth }}</div>
        <div v-if="objects[0].type.speed">Скорость: {{ objects[0].type.speed }}</div>
        <div>Позиция: {{ Math.round(objects[0].x) }}, {{ Math.round(objects[0].y) }}</div>
      </template>
      <template v-else>
        <b>Выбрано: {{ objects.length }}</b>
        <div v-for="(count, name) in counts" :key="name">{{ name }} × {{ count }}</div>
      </template>
    </div>
    <div class="selection-panel__hint">
      ЛКМ — выбрать, рамка — выбрать группу, ПКМ — идти, Esc — снять выбор<br>
      Камера: WASD / стрелки / курсор у края / зажатое колесо, масштаб — колесо мыши<br>
      <RouterLink :to="{ name: $routes.INDEX }">В меню</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  objects: { type: Array, required: true },
})

const counts = computed(() => props.objects.reduce((result, object) => {
  result[object.type.name] = (result[object.type.name] || 0) + 1
  return result
}, {}))
</script>

<style scoped lang="scss">
.selection-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  min-height: 110px;
  padding: 8px 16px;
  border-top: 1px solid #66805b;
  background: #1b2719;
  color: #f0f4e7;

  &__hint {
    color: #b9cba5;
    text-align: right;
  }
}
</style>
