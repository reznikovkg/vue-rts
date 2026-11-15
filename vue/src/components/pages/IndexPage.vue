<!-- Главная страница -->
<template>
  <div>
    <RouterLink class="start-button" :to="{ name: $routes.GAME }">
     Начать игру!
    </RouterLink>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.start-button {
  font-size: 36px;
  color: $accent;
  text-decoration: none;
  transition: 0.4s;
  padding: 3px;

  @media (hover: hover) {
    &:hover {
      background-color: $accent-hover;
    }
  }
}
</style>
