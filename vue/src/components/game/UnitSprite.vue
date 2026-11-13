<template>
  <div
    class="unit-sprite"
    :class="{ 'unit-sprite--selected': isSelected }"
    :style="style"
    @click="() => onClick($event)"
  >
    <div class="unit-sprite__shadow"></div>
    <div class="unit-sprite__body">
      <div class="unit-sprite__face unit-sprite__face--top"></div>
      <div class="unit-sprite__face unit-sprite__face--left"></div>
      <div class="unit-sprite__face unit-sprite__face--right"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { useIsoMath } from '@/composables/useIsoMath';

const props = defineProps({ unit: { type: Object, required: true } });
const store = useStore();
const { gridToScreen } = useIsoMath();

const isSelected = computed(() => store.getters['game/isUnitSelected'](props.unit.id));

const style = computed(() => {
  const { screenX, screenY } = gridToScreen(props.unit.x, props.unit.y);
  return { left: `${screenX}px`, top: `${screenY}px` };
});

const onClick = (event) => {
  event.stopPropagation();
  store.dispatch('events/clickUnit', props.unit.id);
};
</script>

<style scoped lang="scss">
.unit-sprite {
  position: absolute;
  width: 40px;
  height: 55px;
  transform: translate(-50%, -100%);
  cursor: pointer;

  &:hover &__body {
    transform: translateY(-2px);
  }

  &__shadow {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 34px;
    height: 16px;
    background: rgba(0, 0, 0, 0.35);
    border-radius: 50%;
    transform: translate(-50%, 50%);
    filter: blur(1px);
  }

  &__body {
    position: absolute;
    left: 50%;
    bottom: 8px;
    width: 40px;
    height: 40px;
    margin-left: -20px;
    transition: transform 0.1s;
  }

  &__face {
    position: absolute;
    inset: 0;

    &--top {
      background: #e89c7c;
      clip-path: polygon(50% 0, 100% 25%, 50% 50%, 0 25%);
    }

    &--left {
      background: #8a3018;
      clip-path: polygon(0 25%, 50% 50%, 50% 100%, 0 75%);
    }

    &--right {
      background: #b04a28;
      clip-path: polygon(50% 50%, 100% 25%, 100% 75%, 50% 100%);
    }
  }

  &--selected {
    .unit-sprite__face--top {
      background: #ffd870;
    }

    .unit-sprite__face--left {
      background: #b08020;
    }

    .unit-sprite__face--right {
      background: #d0a040;
    }
  }
}
</style>