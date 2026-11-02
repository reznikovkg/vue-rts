<template>
  <div class="selection-panel">
    <!-- выбрано несколько: сколько и каких -->
    <template v-if="selected.length > 1">
      <b>Выбрано: {{ selected.length }}</b>
      <span>&nbsp;- {{ groups }}</span>
    </template>
    <template v-else-if="entity">
      <b>{{ type.name }}</b>
      <span v-if="type.speed">, скорость {{ type.speed }} кл/с</span>
      <span>, клетка ({{ Math.floor(entity.x) }}, {{ Math.floor(entity.y) }})</span>

      <!-- здание, которое создает персонажей: кнопки спавна блоками -->
      <template v-for="spawnType in spawnTypes" :key="spawnType">
        <span class="selection-panel__label">Создать: {{ UNIT_TYPES[spawnType].name }}</span>
        <button
          v-for="count in SPAWN_COUNTS"
          :key="count"
          type="button"
          class="selection-panel__action"
          @click="bus.emit(EVENTS.SPAWN, { id: entity.id, count, type: spawnType })"
        >
          ×{{ count }}
        </button>
      </template>
    </template>
    <template v-else>
      ЛКМ - выбрать, рамка / Shift+ЛКМ - несколько, ПКМ - идти, WASD / край экрана / свайп - камера, щипок / Ctrl+колесо - масштаб
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { typeOf, UNIT_TYPES } from '@/game/entities'

const SPAWN_COUNTS = [1, 5, 10] // сколько персонажей создает одна кнопка

const store = useStore()
const selected = computed(() => store.getters['game/getSelected'])
const entity = computed(() => selected.value[0] ?? null)
// "Медленный ×2, Быстрый ×1"
const groups = computed(() => {
  const counts = {}
  selected.value.forEach((e) => {
    const name = typeOf(e).name
    counts[name] = (counts[name] ?? 0) + 1
  })
  return Object.entries(counts)
    .map(([name, count]) => `${name} ×${count}`)
    .join(', ')
})
const type = computed(() => entity.value && typeOf(entity.value))
const spawnTypes = computed(() => {
  const spawns = type.value?.spawns
  return Array.isArray(spawns) ? spawns : spawns ? [spawns] : []
})
</script>

<style scoped lang="scss">
.selection-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding: 6px 12px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: #e6e6e6;
  font-size: 13px;
  white-space: nowrap;

  &__label {
    margin-left: 10px;
  }

  &__action {
    margin-left: 6px;
    padding: 3px 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    color: inherit;
    background: #222a31;
    font: inherit;
    cursor: pointer;

    &:hover {
      background: #2d3740;
    }
  }
}
</style>
