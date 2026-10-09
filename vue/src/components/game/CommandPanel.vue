<template>
  <div class="command-panel">
    <div class="command-panel__section">
      <div v-if="selectedEntities.length === 0">Nothing selected</div>
      <template v-else-if="singleEntity !== null">
        <div><b>{{ singleEntity.type.name }}</b> ({{ GROUPS[singleEntity.groupId].name }})</div>
        <div>Health: {{ Math.ceil(singleEntity.health) }} / {{ singleEntity.type.maxHealth }}</div>
        <template v-if="isUnit(singleEntity)">
          <div>Movement: {{ singleEntity.type.movement }}, speed {{ singleEntity.type.speed }}</div>
          <div>Damage: {{ singleEntity.type.damage }}, attacks/s {{ singleEntity.type.attacksPerSecond }}</div>
          <div>Range: {{ singleEntity.type.attackRange }}</div>
          <div v-if="singleEntity.type.miningCapacity > 0">
            Cargo: {{ Math.floor(singleEntity.cargo) }} / {{ singleEntity.type.miningCapacity }}
          </div>
        </template>
        <template v-else>
          <div>Size: {{ singleEntity.type.size }}x{{ singleEntity.type.size }}</div>
          <div v-if="singleEntity.constructionProgress < 1">
            Under construction: {{ Math.floor(singleEntity.constructionProgress * 100) }}%
          </div>
        </template>
      </template>
      <template v-else>
        <div><b>{{ selectedEntities.length }} units selected</b></div>
        <div v-for="line in selectionSummary" :key="line.name">{{ line.name }} x{{ line.count }}</div>
      </template>
    </div>

    <div class="command-panel__section command-panel__actions">
      <template v-if="placement !== null">
        <div>Placing {{ BUILDING_TYPES[placement.typeKey].name }}: LMB - place, RMB / Esc - cancel</div>
        <div>
          <button @click="cancelPlacement">Cancel</button>
        </div>
      </template>
      <template v-else-if="selectedEntities.length > 0">
        <div v-if="population !== null">
          Ore: {{ Math.floor(ore) }}, population: {{ population.used }} / {{ population.capacity }}
        </div>
        <div v-if="spawnOptions.length > 0">
          Spawn:
          <button
              v-for="option in spawnOptions"
              :key="option.key"
              :disabled="option.blocker !== null"
              @click="spawnUnit(option.key)"
          >
            {{ option.name }} ({{ UNIT_TYPES[option.key].cost }})
          </button>
          <span v-for="option in spawnOptions" :key="option.key + '-blocker'">
            <template v-if="option.blocker === SPAWN_BLOCKERS.COOLDOWN"> ready in {{ option.cooldownLeft }}s</template>
            <template v-else-if="option.blocker !== null"> {{ option.blocker }}</template>
          </span>
        </div>
        <div>
          Build:
          <button
              v-for="key in CONSTRUCTIBLE_BUILDING_KEYS"
              :key="key"
              :disabled="ore < BUILDING_TYPES[key].cost"
              @click="startPlacement(key)"
          >
            {{ BUILDING_TYPES[key].name }} {{ BUILDING_TYPES[key].size }}x{{ BUILDING_TYPES[key].size }}
            ({{ BUILDING_TYPES[key].cost }})
          </button>
        </div>
        <div>
          <button @click="selfDestruct">Self-destruct</button>
        </div>
      </template>
    </div>

    <div class="command-panel__section command-panel__hint">
      <div>LMB - select, drag - box select, Shift - add to selection</div>
      <div>RMB - move / attack, Shift+RMB - queue, Ctrl+RMB - attack-move</div>
      <div>RMB on ore with gliders - mine</div>
      <div>WASD / arrows / middle drag - camera, wheel - zoom</div>
    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue'
import {useStore} from 'vuex'
import {BUILDING_TYPES, CONSTRUCTIBLE_BUILDING_KEYS, UNIT_TYPES} from '@/game/entityTypes.js'
import {isUnit} from '@/game/entities.js'
import {GROUPS} from '@/game/groups.js'
import {SPAWN_BLOCKERS} from '@/game/spawn.js'

const store = useStore()

const selectedEntities = computed(() => store.getters['game/getSelectedEntities'])
const placement = computed(() => store.getters['game/getPlacement'])
const population = computed(() => store.getters['game/getSelectionPopulation'])
const ore = computed(() => store.getters['game/getSelectionOre'])
const spawnOptions = computed(() => store.getters['game/getSpawnOptions'])

const singleEntity = computed(() => {
  if (selectedEntities.value.length !== 1) {
    return null
  }
  return selectedEntities.value[0]
})

const selectionSummary = computed(() => {
  const lines = []
  for (let index = 0; index < selectedEntities.value.length; index++) {
    const name = selectedEntities.value[index].type.name
    let line = null
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      if (lines[lineIndex].name === name) {
        line = lines[lineIndex]
      }
    }
    if (line === null) {
      lines.push({name: name, count: 1})
    } else {
      line.count++
    }
  }
  return lines
})

const spawnUnit = (unitTypeKey) => {
  store.dispatch('game/spawnUnit', {buildingId: singleEntity.value.id, unitTypeKey: unitTypeKey})
}

const startPlacement = (typeKey) => {
  store.dispatch('game/startPlacement', {typeKey: typeKey, groupId: selectedEntities.value[0].groupId})
}

const cancelPlacement = () => {
  store.dispatch('game/cancelPlacement')
}

const selfDestruct = () => {
  store.dispatch('game/selfDestructSelected')
}
</script>

<style scoped lang="scss">
.command-panel {
  display: flex;
  justify-content: space-between;
  min-height: 130px;
  padding: 8px;
  border-top: 1px solid #000;
  background: #eee;
  color: #000;

  &__section {
    flex: 1;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__hint {
    color: #555;
    text-align: right;
  }
}
</style>
