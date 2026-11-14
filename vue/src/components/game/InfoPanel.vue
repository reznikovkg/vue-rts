<template>
  <div class="info-panel">
    <template v-if="selected">
      <div class="name">{{ typeName }}</div>
      <div>ID: {{ selected.id }}</div>
      <div>Координаты: {{ Math.round(selected.position.x) }}, {{ Math.round(selected.position.y) }}</div>
      <div>{{ groupName }}</div>
      <template v-if="unit && unitType">
        <div>Жизни: {{ unit.hp }} / {{ unitType.maxHp }}</div>
        <div>Сила: {{ unitType.strength }}</div>
        <div>Скорость атаки: {{ unitType.attackSpeed }}</div>
        <div>Скорость: {{ unitSpeed }}</div>
        <div>Местность: {{ unitTerrain }}</div>
        <div>{{ unitAction }}</div>
      </template>
      <template v-else-if="buildingType">
        <div>Жизни: {{ selected.hp }} / {{ buildingType.maxHp }}</div>
        <div>Размер: {{ buildingType.size }}×{{ buildingType.size }}</div>
      </template>
    </template>
    <template v-else-if="selectedUnits.length > 1">
      <div class="name">Выбрано юнитов: {{ selectedUnits.length }}</div>
      <div>ПКМ — отправить группу</div>
      <div>Shift + ПКМ — добавить точку в очередь</div>
      <div>Зажать ПКМ — вести за курсором</div>
    </template>
    <template v-else>
      <div>ЛКМ — выбрать</div>
      <div>ЛКМ с протяжкой — выбрать юнитов рамкой</div>
      <div>Shift + ЛКМ — добавить или убрать юнита</div>
      <div>ПКМ — идти</div>
      <div>Shift + ПКМ — добавить точку в очередь</div>
      <div>Зажать ПКМ — вести юнитов за курсором</div>
      <div>Курсор к краю экрана — камера</div>
      <div>Зажать колёсико — двигать камеру</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { OBJECT_TYPES, UNIT_TYPES } from '@/game/config'
import type { GameEvent, StaticObject, Unit } from '@/game/types'

const store = useStore()
const selected = computed<StaticObject | Unit | null>(() => store.getters['selection/getSelected'])
const selectedUnits = computed<Unit[]>(() => store.getters['selection/getSelectedUnits'])

const unit = computed(() => {
  const selectedObject = selected.value
  if (!selectedObject) {
    return null
  }
  // есть property target есть - значит это юнит
  if ('target' in selectedObject) {
    return selectedObject
  }
  return null
})

// определяем имя объекта для отображения
const typeName = computed(() => {
  if (unit.value) {
    return UNIT_TYPES[unit.value.type].name
  }
  if (selected.value) {
    return OBJECT_TYPES[selected.value.type].name
  }
  return ''
})

const unitType = computed(() => {
  if (unit.value) {
    return UNIT_TYPES[unit.value.type]
  }
  return null
})

// характеристики зданий. у дерева и других объектов без maxHp будет null
const buildingType = computed(() => {
  if (unit.value || !selected.value) {
    return null
  }
  const type = OBJECT_TYPES[selected.value.type]
  if ('maxHp' in type) {
    return type
  }
  return null
})

const groupName = computed(() => {
  if (selected.value && selected.value.group > 0) {
    return 'Группа: ' + selected.value.group
  }
  return 'Нейтральный'
})

const unitSpeed = computed(() => {
  if (unit.value) {
    return UNIT_TYPES[unit.value.type].speedPxPerSecond
  }
})

// по какой местности юнит может ходить
const TERRAIN_NAMES = {
  land: 'суша',
  water: 'вода',
  mountain: 'горы',
  both: 'суша и вода',
}

const unitTerrain = computed(() => {
  if (unitType.value) {
    return TERRAIN_NAMES[unitType.value.terrain ?? 'both']
  }
})

// что юнит делает сейчас - по его текущему событию
const currentEvent = computed<GameEvent | null>(() => (unit.value ? store.getters['events/getCurrent'](unit.value.id) : null))

// сколько приказов ждут после текущего
const queuedCount = computed(() => (unit.value ? store.getters['events/getByActor'](unit.value.id).length - 1 : 0))

const unitAction = computed(() => {
  if (!unit.value) {
    return undefined
  }
  if (currentEvent.value?.type === 'move') {
    return queuedCount.value > 0 ? `Движется, в очереди ещё ${queuedCount.value}` : 'Движется'
  }
  return 'Стоит'
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.info-panel {
  position: absolute;
  left: 30px;
  bottom: 30px;
  min-width: 200px;
  padding: 10px 14px;
  background: $panel-background;
  color: $panel-text-color;
  border-radius: $panel-radius;
  pointer-events: none;
}

.name {
  font-weight: bold;
}
</style>
