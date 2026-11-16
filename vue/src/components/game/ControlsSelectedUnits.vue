<template>
  <div v-if="units.length" class="selected-units">
    <div class="selected-units__title">
      Выбранные юниты: {{ units.length }}
    </div>
    <div
      v-for="unit in units"
      :key="unit.id"
      class="selected-units__row"
    >
      <span>#{{ unit.id }}</span>
      <span>HP {{ unit.health }} / {{ unit.maxHealth }}</span>
      <span>АТК {{ unit.attackPower }}</span>
      <span>СКОР {{ unit.speed }}</span>
      <span>СКОР АТК {{ unit.attackSpeed }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const units = computed(() => store.getters['game/selectedUnits'] as any[])
</script>

<style scoped lang="scss">
.selected-units {
  position: absolute;
  left: 20px;
  bottom: 90px;
  width: 330px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(16, 24, 32, 0.9);
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 12px;
  z-index: 10000;
}

.selected-units__title {
  margin-bottom: 6px;
  font-weight: 700;
}

.selected-units__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
