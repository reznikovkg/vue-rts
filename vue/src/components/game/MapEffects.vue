<template>
  <!-- эффекты поверх объектов, в координатах мира; на игру не влияют, только картинка -->
  <g class="map-effects">
    <!-- удары: штрихи летят от атакующего к цели, пока он бьет -->
    <line v-for="strike in strikes" :key="strike.id" v-bind="strike.line" class="map-effects__strike" />

    <!-- погибшие: вспышка цвета группы, расходится и гаснет -->
    <circle v-for="death in deaths" :key="death.id" v-bind="death.circle" class="map-effects__death" />

    <!-- куда отдан приказ: расходящееся кольцо, красное - атака -->
    <circle v-for="marker in markers" :key="marker.id" v-bind="marker.circle" class="map-effects__marker" />
  </g>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useStore } from 'vuex'
import { screenToWorld } from '@/game/camera'
import { isUnit, typeOf } from '@/game/entities'
import { colorOf } from '@/game/groups'
import { PHASES } from '@/store/game'

const EFFECT_TIME = 700 // мс, столько же длится css-анимация
const MARKER_RADIUS = 0.7

const store = useStore()
const markers = ref([])
const deaths = ref([])
let nextId = 1

const entities = computed(() => store.state.game.entities)

// эффект живет EFFECT_TIME и сам удаляется из списка
const addEffect = (list, effect) => {
  const id = nextId++
  list.value = [...list.value, { id, ...effect }]
  setTimeout(() => {
    list.value = list.value.filter((item) => item.id !== id)
  }, EFFECT_TIME)
}

const addMarker = (point, className) => {
  addEffect(markers, { circle: { cx: point.x, cy: point.y, r: MARKER_RADIUS, class: className } })
}

// приказ идти: кольцо там, куда кликнули, если есть кого вести
const onMove = ({ point }) => {
  const hasUnits = store.getters['game/getSelected'].some(isUnit)
  if (!hasUnits) return
  const { camera, viewport } = store.state.game
  addMarker(screenToWorld(camera, viewport, point), 'map-effects__marker--move')
}

// приказ атаковать: красное кольцо на цели
const onAttack = ({ targetId }) => {
  const target = entities.value.find((entity) => entity.id === targetId)
  if (target) addMarker(target, 'map-effects__marker--attack')
}

// кто пропал из списка за кадр - погиб; при загрузке сценария вспышек не нужно
watch(entities, (now, before) => {
  if (store.state.game.phase === PHASES.READY) return
  const aliveIds = new Set(now.map((entity) => entity.id))
  before.filter((entity) => !aliveIds.has(entity.id)).forEach((entity) => {
    const color = colorOf(store.getters['game/getGroup'](entity.groupId))
    addEffect(deaths, { circle: { cx: entity.x, cy: entity.y, r: typeOf(entity).size / 2, fill: color } })
  })
})

// атакующий рядом с целью (уже не идет к ней) - рисуем удары
const strikes = computed(() => {
  const byId = new Map(entities.value.map((entity) => [entity.id, entity]))
  return entities.value
    .filter((unit) => isUnit(unit) && unit.attackTargetId !== null && !unit.target && byId.has(unit.attackTargetId))
    .map((unit) => {
      const target = byId.get(unit.attackTargetId)
      return { id: unit.id, line: { x1: unit.x, y1: unit.y, x2: target.x, y2: target.y } }
    })
})

// callbacks стора показывают маркеры приказов; при уходе с поля отписываемся
const unsubscribe = store.subscribeAction(({ type, payload }) => {
  if (type === 'game/moveSelected') onMove(payload)
  if (type === 'game/attackSelected') onAttack(payload)
})
onBeforeUnmount(unsubscribe)
</script>

<style scoped lang="scss">
.map-effects {
  pointer-events: none;

  circle {
    transform-box: fill-box;
    transform-origin: center;
    vector-effect: non-scaling-stroke;
  }

  &__strike {
    stroke: #ffe08a;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 3 12;
    vector-effect: non-scaling-stroke;
    animation: strike 0.35s linear infinite;
  }

  &__death {
    stroke: #fff3c4;
    stroke-width: 2;
    animation: death 0.7s ease-out forwards;
  }

  &__marker {
    fill: none;
    stroke-width: 3;
    animation: marker 0.7s ease-out forwards;

    &--move {
      stroke: #9cf0a0;
    }

    &--attack {
      stroke: #ff6b5e;
    }
  }
}

// уменьшаем сдвиг штриха - штрихи бегут от начала линии к концу
@keyframes strike {
  from {
    stroke-dashoffset: 15;
  }

  to {
    stroke-dashoffset: 0;
  }
}

@keyframes death {
  from {
    opacity: 0.9;
    transform: scale(1);
  }

  to {
    opacity: 0;
    transform: scale(2);
  }
}

@keyframes marker {
  from {
    opacity: 1;
    transform: scale(0.2);
  }

  to {
    opacity: 0;
    transform: scale(1.3);
  }
}
</style>
