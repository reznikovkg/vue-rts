<template>
  <div class="selection-panel">
    <template v-if="selected.length > 1">
      <strong>Выбрано: {{ selected.length }}</strong>
      <span> — {{ groups }}</span>
    </template>
    <template v-else-if="entity">
      <div class="selection-panel__heading">
        <strong>{{ type.name }}</strong>
        <span class="selection-panel__group" :style="{ borderColor: group?.color, color: group?.color }">
          {{ group?.name }}
        </span>
      </div>
      <div class="selection-panel__details">
        <span>Здоровье: <strong>{{ entity.hp }} / {{ type.maxHp }}</strong></span>
        <template v-if="isUnit(entity)">
          <span>Сила: <strong>{{ type.attack }}</strong></span>
          <span>Ходьба: <strong>{{ type.speed }} кл/с</strong></span>
          <span>Атака: <strong>{{ type.attackSpeed }} уд/с</strong></span>
        </template>
        <span>Клетка: <strong>{{ Math.floor(entity.x) }}, {{ Math.floor(entity.y) }}</strong></span>
      </div>
      <div v-for="spawnType in spawnTypes" :key="spawnType" class="selection-panel__actions">
        <span>Создать: {{ UNIT_TYPES[spawnType].name }}</span>
        <button
          v-for="count in SPAWN_COUNTS" :key="count" type="button" class="selection-panel__spawn"
          :disabled="phase === 'finished'"
          @click="bus.emit(EVENTS.SPAWN, { id: entity.id, count, type: spawnType })"
        >×{{ count }}</button>
      </div>
      <div v-if="isUnit(entity)" class="selection-panel__actions">
        <span>
          {{ orders.length ? (orders[0].type === 'attack' ? 'Атакует противника' : 'Перемещается') : 'Ожидает приказа' }} · Команд: {{ orders.length }}
        </span>
        <button v-if="phase !== 'finished'" type="button" class="selection-panel__destroy" @click="bus.emit(EVENTS.SELF_DESTRUCT, entity.id)">
          Самоуничтожение
        </button>
      </div>
    </template>
    <template v-else>
      <strong>Управление:</strong> ЛКМ — выбрать · Рамка / Shift + ЛКМ — несколько · ПКМ — идти / атаковать другую группу · Shift + ПКМ — в очередь · Пробел — пауза · WASD — камера · Ctrl + колесо — масштаб
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { bus, EVENTS } from '@/game/bus'
import { isUnit, typeOf, UNIT_TYPES } from '@/game/entities'

const store = useStore()
const SPAWN_COUNTS = [1, 5, 10]
const selected = computed(() => store.getters['game/getSelected'])
const entity = computed(() => selected.value[0] ?? null)
const groups = computed(() => {
  const counts = {}
  selected.value.forEach((entity) => {
    const name = typeOf(entity).name
    counts[name] = (counts[name] ?? 0) + 1
  })
  return Object.entries(counts).map(([name, count]) => `${name} ×${count}`).join(', ')
})
const type = computed(() => entity.value && typeOf(entity.value))
const spawnTypes = computed(() => {
  const spawns = type.value?.spawns
  return Array.isArray(spawns) ? spawns : spawns ? [spawns] : []
})
const group = computed(() => entity.value && store.getters['game/getGroup'](entity.value.groupId))
const orders = computed(() => entity.value ? store.getters['game/getUnitEvents'](entity.value.id) : [])
const phase = computed(() => store.state.game.phase)
</script>

<style scoped lang="scss">
.selection-panel {
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 9px;
  background: rgba(17, 22, 27, 0.92);
  color: #e6e6e6;
  font-size: 13px;
  text-align: center;
  box-shadow: 0 4px 22px rgba(0, 0, 0, 0.32);

  &__heading, &__details, &__actions {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 16px;
  }

  &__heading { font-size: 15px; margin-bottom: 7px; }
  &__details strong { color: #fff; }
  &__actions { margin-top: 10px; }
  &__actions span { color: #b6c2cd; }
  &__group { padding: 1px 7px; border: 1px solid; border-radius: 4px; font-size: 12px; }
  &__spawn {
    padding: 3px 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    color: inherit;
    background: #222a31;
    font: inherit;
    cursor: pointer;
  }

  &__destroy {
    padding: 6px 10px;
    border: 1px solid #d96161;
    border-radius: 5px;
    color: #ffe2e2;
    background: #693232;
    font: inherit;
    cursor: pointer;
  }

  &__destroy:hover { background: #8c3333; }
}
</style>
