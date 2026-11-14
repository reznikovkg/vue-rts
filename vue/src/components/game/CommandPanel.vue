<template>
  <div
      v-if="isRunning"
      class="command-panel"
      @mousedown.stop
      @contextmenu.prevent="cancelBuilding">
    <div class="command-panel__title">Строительство</div>
    <div class="command-panel__groups">
      <button
          v-for="group in groups"
          :key="group"
          class="command-panel__group"
          :aria-pressed="selectedGroup === group"
          :style="{ backgroundColor: groupColor(group) }"
          :title="groupTitle(group)"
          @mousedown.prevent
          @click="chooseGroup(group)">
        {{ group }}
      </button>
    </div>
    <div class="command-panel__buildings">
      <button
          v-for="building in buildings"
          :key="building.id"
          class="command-panel__button command-panel__button--build"
          :aria-pressed="buildingType === building.id"
          :disabled="paused || isBuildingAtLimit(building.id)"
          @mousedown.prevent
          @click="startBuilding(building.id)">
        {{ building.name }} {{ building.size }}×{{ building.size }}
        ({{ buildingCount(building.id) }}/{{ building.maxPerGroup }})
      </button>
    </div>
    <template v-if="buildingType">
      <div class="command-panel__hint">ЛКМ — построить<br>ПКМ или Esc — отменить</div>
      <button class="command-panel__button command-panel__button--cancel" @click="cancelBuilding">Отмена</button>
    </template>
    <button
        v-for="command in commands"
        :key="command.id"
        class="command-panel__button"
        :class="{ 'command-panel__button--spawn': command.action === 'world/spawnUnit' }"
        :disabled="command.action === 'world/spawnUnit' && (isProducing || isConstructing || isAtLimit(command.payload))"
        @mousedown.prevent
        @click="() => run(command)">
      <span
          v-if="production !== null && production.unitType === command.payload"
          class="command-panel__progress"
          :style="{ width: progressPercent + '%' }" />
      <span class="command-panel__label">{{ buttonLabel(command) }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { COMMANDS, GROUP_PALETTE, OBJECT_TYPES, UNIT_TYPES, PLAYER_GROUP, groupColor } from '@/game/config'
import { getBuildingType } from '@/game/building'
import type { Command, ProductionJob, StaticObject, Unit } from '@/game/types'

const store = useStore()
const isRunning = computed<boolean>(() => store.getters['game/isRunning'])
const paused = computed<boolean>(() => store.getters['game/getPaused'])
const buildingType = computed<string | null>(() => store.getters['construction/getTypeId'])
const buildings = Object.keys(OBJECT_TYPES).flatMap((id) => {
  const type = getBuildingType(id)
  return type ? [{ id, name: type.name, size: type.size, maxPerGroup: type.maxPerGroup }] : []
})
const startBuilding = (typeId: string) => store.dispatch('construction/start', typeId)
const cancelBuilding = () => store.dispatch('construction/cancel')

// Группа, от имени которой строятся здания: по кнопке на каждый цвет палитры
const selectedGroup = computed<number>(() => store.getters['construction/getGroup'])
const groups = GROUP_PALETTE.map((_, index) => index + 1)
const chooseGroup = (group: number) => store.dispatch('construction/setGroup', group)
const groupTitle = (group: number) => group === PLAYER_GROUP ? `Группа ${group} (игрок)` : `Группа ${group}`

// Сколько живых зданий этого типа уже есть у выбранной группы: у каждой группы свой лимит
const buildingCount = (typeId: string) =>
    store.getters['world/countObjectsOfType'](selectedGroup.value, typeId)
const isBuildingAtLimit = (typeId: string) => {
  const type = getBuildingType(typeId)
  return type !== null && buildingCount(typeId) >= type.maxPerGroup
}
const selectedUnits = computed(() => store.getters['selection/getSelectedUnits'])
const selected = computed<StaticObject | Unit | null>(() => store.getters['selection/getSelected'])

// Задание производства выбранного здания (null - здание сейчас ничего не создаёт):
// Пока идёт, кнопки спавна заблокированы, на кнопке создаваемого юнита растёт заливка
const production = computed<ProductionJob | null>(() => {
  const building = selected.value
  if (!building) {
    return null
  }
  return store.getters['world/getProductionByBuilding'](building.id)
})
const isProducing = computed(() => production.value !== null)

// Недостроенное здание пока не создаёт юнитов: кнопки спавна заблокированы до конца стройки
const isConstructing = computed(() => {
  const building = selected.value
  return building !== null && store.getters['world/getConstructionByObject'](building.id) !== null
})
const progressPercent = computed(() => {
  const job = production.value
  if (!job) {
    return 0
  }
  return Math.floor(Math.min(1, job.elapsed / job.duration) * 100)
})

// Сколько юнитов этого типа уже живо у группы выбранного здания: у каждой группы свой лимит
const unitCount = (unitType?: string) => {
  const building = selected.value
  if (!building || unitType === undefined) {
    return 0
  }
  return store.getters['world/countUnitsOfType'](building.group, unitType)
}

// Лимит юнитов этого типа у группы достигнут: кнопку спавна блокируем
const isAtLimit = (unitType?: string) =>
    unitType !== undefined && unitCount(unitType) >= UNIT_TYPES[unitType].maxPerGroup

// Подпись кнопки спавна: счётчик по лимиту, а во время производства - проценты готовности
const buttonLabel = (command: Command) => {
  if (command.action !== 'world/spawnUnit' || command.payload === undefined) {
    return command.label
  }
  if (production.value && production.value.unitType === command.payload) {
    return `${command.label} (${progressPercent.value}%)`
  }
  return `${command.label} (${unitCount(command.payload)}/${UNIT_TYPES[command.payload].maxPerGroup})`
}

// Кнопки спавна выбранного здания: по одной на каждый тип юнита из spawns
const spawnCommands = computed<Command[]>(() => {
  const building = selected.value
  if (!building || !(building.type in OBJECT_TYPES)) {
    return []
  }
  const type = OBJECT_TYPES[building.type]
  const spawns = 'spawns' in type ? type.spawns ?? [] : []
  return spawns.map((unitType) => ({
    id: 'spawn-' + unitType,
    label: 'Создать: ' + UNIT_TYPES[unitType].name,
    action: 'world/spawnUnit',
    payload: unitType,
  }))
})

const commands = computed<Command[]>(() => {
  // В меню и после конца игры кнопок нет
  if (!isRunning.value) {
    return []
  }
  if (selectedUnits.value.length > 0) {
    return [COMMANDS.destroy]
  }
  return spawnCommands.value
})

const run = (command: Command) => {
  store.dispatch(command.action, command.payload)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.command-panel {
  position: absolute;
  right: 30px;
  bottom: 30px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  background: $panel-background;
  border-radius: $panel-radius;

  &__title {
    color: $panel-text-color;
    font-weight: bold;
  }

  &__groups {
    display: flex;
    gap: 6px;
  }

  // Кнопка выбора группы: цвет группы из палитры, выбранная обведена кольцом
  &__group {
    width: 26px;
    padding: 4px 0;
    border: 0;
    border-radius: $button-radius;
    color: $panel-text-color;
    font-weight: bold;
    cursor: pointer;
    opacity: 0.55;

    &[aria-pressed='true'] {
      opacity: 1;
      box-shadow: inset 0 0 0 2px #fff;
    }
  }

  &__buildings {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  &__hint {
    color: $panel-text-color;
    font-size: 13px;
  }

  &__button {
    position: relative;
    padding: 6px 12px;
    border: 0;
    border-radius: $button-radius;
    background: $danger-color;
    color: $panel-text-color;
    cursor: pointer;

    &:hover {
      background: $danger-color-hover;
    }

    &:disabled {
      cursor: default;
      opacity: 0.8;
    }

    &--spawn {
      background: $action-color;

      &:hover {
        background: $action-color-hover;
      }
    }

    &--build {
      background: $action-color;

      &:hover,
      &[aria-pressed='true'] {
        background: $action-color-hover;
      }

      &[aria-pressed='true'] {
        box-shadow: inset 0 0 0 2px $selected-color;
      }
    }

    &--cancel {
      background: #475569;
    }
  }

  // Заливка готовности прямо на кнопке создаваемого юнита
  &__progress {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.35);
    pointer-events: none;
  }

  // Подпись над заливкой прогресса
  &__label {
    position: relative;
  }
}
</style>

