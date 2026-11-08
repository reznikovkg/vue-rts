<template>
  <div class="building-health">
    <span :style="{ width: `${healthPercent}%` }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  health: number
  maxHealth: number
}

const props = defineProps<Props>()

const healthPercent = computed(() =>
  Math.max(0, Math.min(100, (props.health / props.maxHealth) * 100)),
)
</script>

<style scoped lang="scss">
.building-health {
  position: absolute;
  left: 50%;
  top: 148px;
  width: 80px;
  height: 6px;
  background: #351f1f;
  transform: translateX(-50%);
  z-index: 6;

  span {
    display: block;
    height: 100%;
    background: #54df63;
  }
}
</style>
