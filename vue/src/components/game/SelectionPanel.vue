<template>
  <div class="selection-panel">
    <template v-if="multiple">
      <strong>Выбрано: {{ selected.length }}</strong>
      <span> — {{ selectedSummary }}</span>
    </template>

    <template v-else-if="entity">
      <div class="selection-panel__heading">
        <strong>{{ type.name }}</strong>
        <span class="selection-panel__group" :style="groupStyle">{{ groupName }}</span>
      </div>
      <div class="selection-panel__details">
        <span>Здоровье: <strong>{{ entity.hp }} / {{ type.maxHp }}</strong></span>
        <template v-if="entityIsUnit">
          <span>Сила: <strong>{{ type.attack }}</strong></span>
          <span>Ходьба: <strong>{{ type.speed }} кл/с</strong></span>
          <span>Атака: <strong>{{ type.attackSpeed }} уд/с</strong></span>
        </template>
        <span>Клетка: <strong>{{ cell }}</strong></span>
      </div>

      <!-- недостроенное здание показывает прогресс вместо найма -->
      <div v-if="constructing" class="selection-panel__actions">
        <span>Строится: {{ buildPercent }}%</span>
        <div class="selection-panel__progress">
          <div class="selection-panel__progress-fill" :style="progressStyle"></div>
        </div>
      </div>
      <template v-else>
        <div v-for="spawn in spawnOptions" :key="spawn.type" class="selection-panel__actions">
          <span>Создать: {{ spawn.name }}</span>
          <button
            v-for="count in SPAWN_COUNTS"
            :key="count"
            type="button"
            class="selection-panel__spawn"
            :disabled="finished"
            @click="onSpawn(spawn.type, count)"
          >×{{ count }}</button>
        </div>
      </template>

      <div v-if="entityIsUnit" class="selection-panel__actions">
        <span>{{ orderStatus }} · Команд: {{ orders.length }}</span>
        <button v-if="canSelfDestruct" type="button" class="selection-panel__destroy" @click="onSelfDestruct">
          Самоуничтожение
        </button>
      </div>
    </template>

    <!-- выбраны бойцы: на какой клан их отправить, кнопка цвета клана -->
    <div v-if="attackOptions.length" class="selection-panel__actions">
      <span>Атаковать клан:</span>
      <button
        v-for="option in attackOptions"
        :key="option.id"
        type="button"
        class="selection-panel__clan"
        :style="option.style"
        @click="onAttackGroup(option.id)"
      >{{ option.name }}</button>
    </div>

    <template v-if="emptySelection">
      <span class="selection-panel__hint">ЛКМ — выбрать · рамка — несколько · ПКМ — идти / атаковать · Shift + ПКМ — в очередь · WASD — камера</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { isBuilt, isUnit, typeOf, UNIT_TYPES } from '@/game/entities'
import { PHASES } from '@/store/game'

const SPAWN_COUNTS = [1, 5, 10]

const props = defineProps({
  actions: { type: Object, required: true },
})

const store = useStore()
const selected = computed(() => store.getters['game/getSelected'])
const emptySelection = computed(() => !selected.value.length)
const multiple = computed(() => selected.value.length > 1)
const entity = computed(() => selected.value[0] ?? null)
const entityIsUnit = computed(() => !!entity.value && isUnit(entity.value))
const type = computed(() => entity.value && typeOf(entity.value))
const group = computed(() => entity.value && store.getters['game/getGroup'](entity.value.groupId))
const groupName = computed(() => group.value?.name)
const groupStyle = computed(() => ({ borderColor: group.value?.color, color: group.value?.color }))
const orders = computed(() => (entity.value ? store.getters['game/getUnitEvents'](entity.value.id) : []))
const finished = computed(() => store.state.game.phase === PHASES.FINISHED)
const canSelfDestruct = computed(() => entityIsUnit.value && !finished.value)
const cell = computed(() => `${Math.floor(entity.value.x)}, ${Math.floor(entity.value.y)}`)

// несколько выбранных: сколько каких типов
const selectedSummary = computed(() => {
  const counts = {}
  selected.value.forEach((item) => {
    const name = typeOf(item).name
    counts[name] = (counts[name] ?? 0) + 1
  })
  return Object.entries(counts).map(([name, count]) => `${name} ×${count}`).join(', ')
})

const spawnOptions = computed(() => {
  const spawns = type.value?.spawns
  const types = Array.isArray(spawns) ? spawns : spawns ? [spawns] : []
  return types.map((spawnType) => ({ type: spawnType, name: UNIT_TYPES[spawnType].name }))
})

// выбрано недостроенное здание
const constructing = computed(() => !!entity.value && !entityIsUnit.value && !isBuilt(entity.value))
const buildPercent = computed(() => (constructing.value ? Math.floor(entity.value.progress * 100) : 0))
const progressStyle = computed(() => ({ width: `${buildPercent.value}%` }))

const orderStatus = computed(() => {
  if (!orders.value.length) return 'Ожидает приказа'
  return orders.value[0].type === 'attack' ? 'Атакует противника' : 'Перемещается'
})

// кланы, которые можно атаковать: живые и не единственный клан всех выбранных бойцов
const attackOptions = computed(() => {
  const units = selected.value.filter(isUnit)
  if (!units.length || finished.value) return []
  const ownGroups = new Set(units.map((unit) => unit.groupId))
  const aliveGroups = new Set(store.state.game.entities.map((item) => item.groupId))
  return store.state.game.groups
    .filter((clan) => aliveGroups.has(clan.id) && !(ownGroups.size === 1 && ownGroups.has(clan.id)))
    .map((clan) => ({ id: clan.id, name: clan.name, style: { borderColor: clan.color, color: clan.color } }))
})

const onAttackGroup = (groupId) => props.actions.attackGroup(groupId)
const onSpawn = (spawnType, count) => props.actions.spawn({ id: entity.value.id, count, type: spawnType })
const onSelfDestruct = () => props.actions.selfDestruct(entity.value.id)
</script>

<style scoped lang="scss">
@use '@/assets/game-ui' as ui;

.selection-panel {
  @include ui.panel;
  padding: 6px 10px;
  text-align: center;

  strong {
    color: #fff;
  }

  &__heading,
  &__details,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 4px 10px;
  }

  &__heading {
    margin-bottom: 4px;
    font-size: 13px;

    strong {
      @include ui.title;
      font-size: 13px;
    }
  }

  &__actions {
    margin-top: 10px;

    span {
      color: ui.$muted;
    }
  }

  &__group {
    padding: 1px 7px;
    border: 1px solid;
    border-radius: 4px;
    font-size: 12px;
  }

  &__progress {
    width: 120px;
    height: 8px;
    border: 1px solid ui.$border;
    border-radius: 4px;
    background: #0b0f12;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #5fa89a, ui.$accent);
  }

  &__spawn {
    @include ui.button;
    padding: 3px 8px;
  }

  &__hint {
    color: ui.$muted;
    font-size: 11px;
  }

  &__clan {
    @include ui.button;
    padding: 3px 8px;
    font-size: 12px;
  }

  &__destroy {
    @include ui.button;
    border-color: ui.$danger;
    background: linear-gradient(180deg, #7a3330 0%, #55211f 100%);

    &:hover:not(:disabled) {
      background: linear-gradient(180deg, #934039 0%, #672826 100%);
    }
  }
}
</style>
