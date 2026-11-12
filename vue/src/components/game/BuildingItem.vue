<template>
  <div
    class="building"
    :class="{ 'building--selected': isSelected }"
    :style="style"
    @click.stop="() => onClick()"
  ></div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { groupById } from '@/config/game';

const props = defineProps({
  building: { type: Object, required: true }
});

const store = useStore();
const isSelected = computed(() =>
  store.getters['game/isBuildingSelected'](props.building.id)
);

const style = computed(() => {
  const b = props.building;

  const width = b.width ?? b.size;
  const height = b.height ?? b.size;

  return {
    left: `${b.position.x - width / 2}px`,
    top: `${b.position.y - height / 2}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: groupById(b.group).color
  };
});

const onClick = () => store.dispatch('events/clickBuilding', props.building.id);
</script>

<style scoped lang="scss">
.building {
  position: absolute;
  border: 1px solid #1a1a1a;
  cursor: pointer;

  &--selected {
    border-color: #8a6010;
    box-shadow: 0 0 0 2px #8a6010;
  }
}
</style>