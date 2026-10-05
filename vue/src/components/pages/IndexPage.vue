<template>
  <div class="index-page">
    <div class="content">
      Menu
      <div>
        <RouterLink :to="{ name: ROUTES.INDEX }">To do</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ROUTES } from '@/router'
</script>

<style scoped>
.index-page {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  text-align: center;
}
</style>