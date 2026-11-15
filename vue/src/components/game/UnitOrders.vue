<!-- Компонент для поддержки очереди приказов выбранных юнитов  -->
<template>
  <template v-for="order in orders" :key="order.id">
    <div
        v-for="(style, index) in order.pathStyles"
        :key="index"
        class="unit-orders__path-line"
        :class="{ 'unit-orders__path-line--queued': order.queued }"
        :style="style" />
    <div
        class="unit-orders__target-mark"
        :class="{ 'unit-orders__target-mark--queued': order.queued }"
        :style="order.targetStyle" />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { lineStyle, worldToScreen } from '@/game/coords'
import type { GameEvent, Point, Unit } from '@/game/types'

// Приказы выбранных юнитов: только рисует события и маршруты из стора, ничего не меняет
const store = useStore()
const selectedUnits = computed<Unit[]>(() => store.getters['selection/getSelectedUnits'])

// ломаная по точкам мира: отрезки пути и метка в последней точке
const toOrder = (id: number, worldPoints: Point[], queued: boolean) => {
  const points = worldPoints.map(worldToScreen)
  const to = points[points.length - 1]
  return {
    id,
    queued,
    targetStyle: {
      left: to.x + 'px',
      top: to.y + 'px',
    },
    pathStyles: points.slice(1).map((point, index) => lineStyle(points[index], point)),
  }
}

const orders = computed(() => {
  const result = []
  for (const unit of selectedUnits.value) {
    const queue: GameEvent[] = store.getters['events/getByActor'](unit.id)
    let from = unit.position
    for (const event of queue) {
      if (event.type !== 'move' || !event.target) {
        continue
      }
      // текущее событие: маршрут в обход препятствий; следующие по очереди - прямо от прошлой точки
      if (event.started && unit.target) {
        result.push(toOrder(event.id, [unit.position, ...(unit.path ?? [unit.target])], false))
        from = unit.target
      } else {
        result.push(toOrder(event.id, [from, event.target], event.status === 'waiting'))
        from = event.target
      }
    }
  }
  return result
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.unit-orders {
  &__path-line {
    transform-origin: left center;
    pointer-events: none;
    z-index: $z-orders;

    @include line(dashed, rgba($selected-color, 0.7));

    // следующие точки очереди бледнее текущей
    &--queued {
      opacity: 0.5;
    }
  }

  &__target-mark {
    z-index: $z-orders;

    @include target-mark($selected-color);

    // следующие точки очереди бледнее текущей
    &--queued {
      opacity: 0.5;
    }
  }
}
</style>
