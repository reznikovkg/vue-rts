<template >
  Вторая

  <div v-if="id">Это страница ID: {{ id }}</div>
  <div v-else>
    Это пустая страница

    <br >
    <br >

    Возможно, вы искали это: <br >
    <RouterLink :to="{ name: ROUTE_NAME.SECOND_P, params: { id: 505 } }" >ID 505</RouterLink> //
    <RouterLink :to="{ name: ROUTE_NAME.SECOND_P, params: { id: 1024 } }" >ID 1024</RouterLink>
  </div>
</template >

<script setup lang="ts" >
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { ROUTE_NAME } from '@/router'

const route = useRoute()

const id = computed(() => route.params.id)
</script >

<style scoped >

</style >
