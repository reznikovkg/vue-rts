<template>
  <div class="page">
    <h1>RTS Prototype</h1>

    <div>
      <RouterLink to="/game">
        To Game
      </RouterLink>
    </div>

    <div>
      <RouterLink to="/example">
        To Example
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped lang="scss">
.page {
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;

  padding: 40px;

  background: #021306;
  color: white;
}
</style>