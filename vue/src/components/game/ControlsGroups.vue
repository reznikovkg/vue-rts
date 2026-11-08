<template>
  <div class="controls-section groups-section">
    <div class="controls-row groups">
      <button
        v-for="group in groups"
        :key="group"
        type="button"
        :class="{ active: group === activeGroup }"
        @click="selectGroup(group)"
      >
        Группа {{ group }}
      </button>
    </div>
    <small>
      Группа {{ activeGroup }}: {{ groupUnits.length }} персонаж(а) · суммарно HP
      {{ totalHealth }}
    </small>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

interface Unit {
  id: number
  groupId: number
  health: number
}

const store = useStore()
const groups = [1, 2, 3]
const activeGroup = computed(() => store.state.game.activeGroup as number)
const units = computed(() => store.state.game.units as Unit[])

const groupUnits = computed(() =>
  units.value.filter(unit => unit.groupId === activeGroup.value),
)

const totalHealth = computed(() =>
  Math.ceil(groupUnits.value.reduce((sum, unit) => sum + unit.health, 0)),
)

const selectGroup = (groupId: number) => {
  store.commit('events/enqueue', { type: 'selectGroup', groupId })
}
</script>

<style scoped lang="scss">
.groups button {
  flex: 1;
}

.groups-section small {
  display: block;
}
</style>
