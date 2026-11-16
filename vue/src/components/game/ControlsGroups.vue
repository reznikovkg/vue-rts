<template>
  <div class="controls-groups">
    <div class="controls-groups__title">Группы</div>
    <div class="controls-groups__row">
      <button
        v-for="groupId in GROUP_IDS"
        :key="groupId"
        class="controls-groups__button"
        :class="{ 'controls-groups__button--active': activeGroup === groupId }"
        type="button"
        :style="{ borderColor: getGroupColor(groupId) }"
        @click="selectGroup(groupId)"
      >
        {{ groupId }}
      </button>
    </div>
    <button
      class="controls-groups__assign"
      type="button"
      :disabled="!selectedUnitIds.length"
      @click="assignGroup"
    >
      Перевести выбранных в активную группу
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { getGroupColor } from '@/store/game/groups'

const GROUP_IDS = [1, 2, 3, 4]

const store = useStore()
const activeGroup = computed(() => store.state.game.activeGroup as number)
const selectedUnitIds = computed(() => store.state.game.selectedUnitIds as number[])

const selectGroup = (groupId: number) => {
  store.commit('events/enqueue', {
    type: 'selectGroup',
    groupId
  })
}

const assignGroup = () => {
  if (!selectedUnitIds.value.length)
    return

  store.commit('events/enqueue', {
    type: 'assignGroup',
    groupId: activeGroup.value,
    unitIds: [...selectedUnitIds.value]
  })
}
</script>

<style scoped lang="scss">
.controls-groups {
  position: absolute;
  left: 20px;
  top: 20px;
  width: 230px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(16, 24, 32, 0.9);
  color: #fff;
  font-family: Arial, sans-serif;
  font-size: 12px;
  z-index: 10000;
}

.controls-groups__title {
  margin-bottom: 6px;
  font-weight: 700;
}

.controls-groups__row {
  display: flex;
  gap: 6px;
}

.controls-groups__button {
  width: 34px;
  height: 30px;
  border: 2px solid;
  border-radius: 6px;
  background: #1d2a36;
  color: #fff;
  cursor: pointer;

  &--active {
    background: #3d5f82;
  }
}

.controls-groups__assign {
  width: 100%;
  margin-top: 8px;
  padding: 7px 8px;
  border: 0;
  border-radius: 6px;
  background: #2b3b4b;
  color: #fff;
  cursor: pointer;
  font-family: Arial, sans-serif;

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
}
</style>
