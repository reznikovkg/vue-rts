import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomePage from '@/components/pages/HomePage.vue'
import SecondPage from '@/components/pages/SecondPage.vue'

export const ROUTE_NAME = {
  HOME: 'HOME',
  SECOND: 'SECOND',
  SECOND_P: 'SECOND_P',
}

export const routes: Readonly<RouteRecordRaw[]> = [
  {
    name: ROUTE_NAME.HOME,
    path: '/',
    component: HomePage
  },
  {
    name: ROUTE_NAME.SECOND,
    path: '/second',
    component: SecondPage
  },
  {
    name: ROUTE_NAME.SECOND_P,
    path: '/second/:id',
    component: SecondPage
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
