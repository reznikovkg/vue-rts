<template>
  <div v-if="building" class="selected-building">
    <div class="selected-building__title">
      {{ building.name }} #{{ building.id }}
    </div>
    <div class="selected-building__row">
      HP: {{ building.health }} / {{ building.maxHealth }}
    </div>
    <div class="selected-building__row">
      Группа: {{ building.groupId }}
    </div>
    <button
      class="selected-building__spawn"
      type="button"
      @click="spawnUnit"
    >
      Создать юнита
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()

const building = computed(
  () => store.getters['game/selectedBuilding'] as any | null,
)

const spawnUnit = () => {
  if (!building.value) return

  store.commit('events/enqueue', {
    type: 'spawn',
    buildingId: building.value.id,
  })
}
</script>

<style scoped lang="scss">
.selected-building {
  position: absolute;
  right: 20px;
  bottom: 90px;
  width: 250px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(16, 24, 32, 0.9);
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 12px;
  z-index: 10000;
}

.selected-building__title {
  margin-bottom: 6px;
  font-weight: 700;
}

.selected-building__row {
  padding: 3px 0;
}

.selected-building__spawn {
  width: 100%;
  margin-top: 8px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: #3d7f4a;
  color: #fff;
  cursor: pointer;
  font-family: Arial, sans-serif;
}
</style>
