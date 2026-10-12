<template>
  <div>
    <RouterLink class="start-button" :to="{ name: $routes.GAME }">
     Начать игру!
    </RouterLink>
  </div>
</template>

<script setup lang="ts">

</script>

<style scoped>
.start-button {
  font-size: 36px;
}
</style>
