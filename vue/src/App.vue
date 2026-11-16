<template>
  <GameViewport />
</template>

<script setup>
import GameViewport from '@/components/game/GameViewport.vue';
</script>

<style lang="scss">
/* Игра занимает весь экран: документ не скроллится, фон под вьюпортом тёмный */
html,
body {
  height: 100%;
  overflow: hidden;
  background: #000;
}
</style>