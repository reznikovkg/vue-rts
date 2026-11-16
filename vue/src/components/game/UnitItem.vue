<template>
  <div
    class="unit"
    :class="{ 'unit--selected': isSelected, 'unit--focused': isFocused }"
    :style="style"
    @click.stop="() => onClick()"
  ></div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { UNIT_RADIUS, groupById } from '@/config/game';

const props = defineProps({
  unit: { type: Object, required: true }
});

const store = useStore();
const isSelected = computed(() => store.getters['game/isUnitSelected'](props.unit.id));
// Юнит, выбранный для просмотра характеристик (Tab внутри выделения)
const isFocused = computed(
  () => isSelected.value && store.state.game.focusedUnitId === props.unit.id
);
// Фон юнита — цвет его группы
const color = computed(() => groupById(props.unit.group).color);

const style = computed(() => ({
  left: `${props.unit.position.x}px`,
  top: `${props.unit.position.y}px`,
  width: `${UNIT_RADIUS * 2}px`,
  height: `${UNIT_RADIUS * 2}px`,
  marginLeft: `${-UNIT_RADIUS}px`,
  marginTop: `${-UNIT_RADIUS}px`,
  background: color.value
}));

const onClick = () => store.dispatch('events/clickUnit', props.unit.id);
</script>

<style scoped lang="scss">
.unit {
  position: absolute;
  border-radius: 50%;
  border: 1px solid #1a1a1a;
  cursor: pointer;
  transition: transform 0.08s;

  &--selected {
    border-color: #8a6010;
    box-shadow: 0 0 0 2px #8a6010;
  }

  &--focused {
    border-color: #a0d0ff;
    box-shadow:
      0 0 0 2px #a0d0ff,
      0 0 0 4px rgba(160, 208, 255, 0.4);
  }

  &:hover {
    transform: scale(1.1);
  }
}
</style>