<template>
  <button
    class="self-destruct"
    type="button"
    :disabled="!selectedUnitIds.length"
    @click="selfDestruct"
  >
    Самоуничтожение
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'

const store = useStore()
const selectedUnitIds = computed(
  () => store.state.game.selectedUnitIds as number[],
)

const selfDestruct = () => {
  if (!selectedUnitIds.value.length) return

  store.commit('events/enqueue', {
    type: 'selfDestruct',
    unitIds: [...selectedUnitIds.value],
  })
}
</script>

<style scoped lang="scss">
.self-destruct {
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: #a33b32;
  color: #fff;
  cursor: pointer;
  font-family: Arial, sans-serif;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}
</style>
