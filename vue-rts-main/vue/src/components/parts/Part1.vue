<template >
  <div>
    ЧАСТЬ 1 {{ id }}
  </div>
</template >

<script setup lang="ts" >
const props = defineProps({
  id: {
    type: Number,
    default: 0
  }
})
</script >

<style scoped >

</style >
