<template>
  <!-- маршрут и будущие точки видны только у выбранного персонажа -->
  <template v-if="selected">
    <polyline v-if="route" :points="route" class="map-unit__route" />
    <circle v-for="(point, index) in waypoints" :key="index" :cx="point.x" :cy="point.y" r="0.23" class="map-unit__waypoint" />

    <!-- красный пунктир - активный приказ атаки -->
    <line v-if="attackLine" v-bind="attackLine" class="map-unit__attack-line" />

    <!-- куда идет выбранный: квадрат в конце пути -->
    <rect v-if="finishBox" v-bind="finishBox" class="map-unit__target" />
  </template>

  <!-- персонаж - стоячая фигурка, корабль - корпус, вписанный в круг столкновений -->
  <g
    class="map-unit"
    :class="classes"
    :style="colorStyle"
    @mousedown.left.exact.stop="onSelect"
    @mousedown.left.shift.exact.stop="onToggle"
  >
    <polygon v-if="hull" :points="hull" class="map-unit__hull" />
    <g v-else :transform="place">
      <!-- поворот к цели, затем анимация позы: transform у этих групп не пересекается -->
      <g :transform="facing">
        <g class="map-unit__pose" :class="pose">
          <component :is="shape.tag" v-for="(shape, index) in figure" :key="index" v-bind="shape" />
        </g>
      </g>
    </g>
  </g>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { shipPoints, UNIT_TYPES } from '@/game/entities'
import { colorOf } from '@/game/groups'
import { FIGURES, toPoints, UPRIGHT } from '@/game/visuals'

const FINISH_SIZE = 0.5
const HIT_TIME = 200 // мс, вспышка при попадании

const props = defineProps({
  unit: { type: Object, required: true },
  actions: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => UNIT_TYPES[props.unit.type])
const group = computed(() => store.getters['game/getGroup'](props.unit.groupId))
const selected = computed(() => store.getters['game/isSelected'](props.unit.id))
const classes = computed(() => ({ 'map-unit--selected': selected.value }))
const orders = computed(() => store.getters['game/getUnitEvents'](props.unit.id))
const colorStyle = computed(() => ({ '--color': colorOf(group.value) }))
const hull = computed(() => (type.value.ship ? shipPoints(props.unit.x, props.unit.y, type.value.size) : null))

// фигурка стоит в точке персонажа, размер по size (фигурки нарисованы для 0.8)
const place = computed(() => `translate(${props.unit.x} ${props.unit.y}) ${UPRIGHT} scale(${type.value.size / 0.8})`)
const figure = computed(() => (FIGURES[props.unit.type] ?? []).map(({ part, ...shape }) => ({ ...shape, class: `map-unit__${part}` })))

// куда смотрит: на цель атаки, иначе куда шел последний раз (вправо на экране - рост x - y)
const lastDirection = ref(1)
watch(() => props.unit.x - props.unit.y, (now, before) => {
  if (now !== before) lastDirection.value = Math.sign(now - before)
})
const enemy = computed(() => findEntity(props.unit.attackTargetId))
const facing = computed(() => {
  const direction = enemy.value ? Math.sign(enemy.value.x - enemy.value.y - (props.unit.x - props.unit.y)) || 1 : lastDirection.value
  return direction < 0 ? 'scale(-1 1)' : ''
})

// попадание: здоровье упало - короткая вспышка
const hit = ref(false)
watch(() => props.unit.hp, (now, before) => {
  if (now >= before) return
  hit.value = true
  setTimeout(() => (hit.value = false), HIT_TIME)
})

// поза: идет, бьет (стоит рядом с целью) или вспыхивает от удара
const pose = computed(() => ({
  'map-unit__pose--walk': !!props.unit.target,
  'map-unit__pose--strike': !!enemy.value && !props.unit.target,
  'map-unit__pose--hit': hit.value,
}))

const findEntity = (id) => store.state.game.entities.find((entity) => entity.id === id)

const attackTarget = computed(() => findEntity(orders.value[0]?.targetId))
const attackLine = computed(() => attackTarget.value && {
  x1: props.unit.x, y1: props.unit.y, x2: attackTarget.value.x, y2: attackTarget.value.y,
})

const finish = computed(() => (orders.value[0]?.type === 'move' ? orders.value[0].target : null))
const finishBox = computed(() => finish.value && {
  x: finish.value.x - FINISH_SIZE / 2, y: finish.value.y - FINISH_SIZE / 2, width: FINISH_SIZE, height: FINISH_SIZE,
})

// текущий путь в обход зданий, затем точки следующих приказов из очереди
const routePoints = computed(() => {
  const active = props.unit.activeEventId === orders.value[0]?.id
  const path = active && props.unit.target ? [props.unit.target, ...props.unit.path] : []
  const queued = orders.value.slice(path.length ? 1 : 0, 8)
    .map((order) => (order.type === 'move' ? order.target : findEntity(order.targetId)))
    .filter(Boolean)
  return [...path, ...queued]
})
const route = computed(() => routePoints.value.length && toPoints([props.unit, ...routePoints.value]))
const waypoints = computed(() => routePoints.value.slice(1))

const onSelect = () => props.actions.select(props.unit.id)
const onToggle = () => props.actions.toggleSelected(props.unit.id)
</script>

<style scoped lang="scss">
.map-unit {
  stroke: rgba(0, 0, 0, 0.6);
  cursor: pointer;

  * {
    vector-effect: non-scaling-stroke;
  }

  &--selected {
    stroke: #fff;
    stroke-width: 2;
  }

  // цвета частей фигурки
  &__body {
    fill: var(--color);
  }

  &__dark {
    fill: color-mix(in srgb, var(--color) 55%, #111);
  }

  &__hull {
    fill: color-mix(in srgb, var(--color) 45%, #6b4a2c);
  }

  &__wood {
    fill: #6b4a2c;
  }

  &__pole {
    fill: none;
    stroke: #8a6a48;
    stroke-width: 2;
  }

  &__pale {
    fill: #ece8e1;
  }

  &__skin {
    fill: #d8b18c;
  }

  &__hair {
    fill: #1b1b22;
  }

  &__lining {
    fill: #8c1426;
  }

  &__eye {
    fill: #ff3b3b;
    stroke: none;
  }

  &__wolf-eye {
    fill: #ffd23f;
    stroke: none;
  }

  // анимации позы: сдвиги в единицах фигурки, точка (0, 0) - ноги
  &__pose {
    &--walk {
      animation: walk 0.36s ease-in-out infinite alternate;
    }

    &--strike {
      animation: strike 0.5s ease-in-out infinite;
    }

    &--hit {
      filter: brightness(2.4);
    }
  }

  &__route,
  &__waypoint,
  &__attack-line,
  &__target {
    vector-effect: non-scaling-stroke;
    pointer-events: none;
  }

  &__route {
    fill: none;
    stroke: rgba(255, 255, 255, 0.6);
    stroke-dasharray: 4 3;
  }

  &__waypoint {
    fill: rgba(17, 22, 27, 0.75);
    stroke: #fff;
    stroke-width: 2;
  }

  &__attack-line {
    stroke: #f17777;
    stroke-width: 2;
    stroke-dasharray: 5 4;
  }

  &__target {
    fill: none;
    stroke: #fff;
    stroke-dasharray: 3 2;
  }
}

// шаг: фигурка подпрыгивает и чуть качается
@keyframes walk {
  from {
    transform: translateY(0) rotate(-3deg);
  }

  to {
    transform: translateY(-0.08px) rotate(3deg);
  }
}

// удар: выпад вперед и назад
@keyframes strike {
  0%,
  100% {
    transform: none;
  }

  40% {
    transform: translateX(0.2px) rotate(8deg);
  }
}
</style>
