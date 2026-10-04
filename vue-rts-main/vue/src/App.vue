<template>
  <RouterView />
</template>

<script setup>
import { ref, onMounted, provide } from 'vue'

const value = ref(100500)

const addValue = (v) => {
  value.value += v
}

provide('v', value.value)

onMounted(() => {
  console.log('App mounted')
})
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>