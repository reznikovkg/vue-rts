<template>
  <g v-if="health < maxHealth" pointer-events="none">
    <rect :x="-width / 2" :y="y" :width="width" height="4" fill="#1b2719" />
    <rect :x="-width / 2" :y="y" :width="width * health / maxHealth" height="4" :fill="color" />
  </g>
</template>

<script setup>
import { computed } from 'vue'

// Полоска здоровья над объектом; показывается, только когда объект ранен
const props = defineProps({
  health: { type: Number, required: true },
  maxHealth: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
})

const color = computed(() => props.health / props.maxHealth > 0.5 ? '#6fd06a' : props.health / props.maxHealth > 0.25 ? '#e0c23a' : '#d6453a')
</script>
