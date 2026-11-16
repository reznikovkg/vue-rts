<template>
  <!-- у каждого здания своя форма из граней: стены, крыши, окна; флаг цвета клана -->
  <g
    class="map-building"
    :class="classes"
    :style="colorStyle"
    @mousedown.left.exact.stop="onSelect"
    @mousedown.left.shift.exact.stop="onToggle"
  >
    <rect v-if="dock" v-bind="dock" class="map-building__dock" />
    <polygon v-for="(face, index) in faces" :key="index" v-bind="face" />

    <template v-if="look.flag">
      <line v-bind="look.flag.pole" class="map-building__pole" />
      <polygon :points="look.flag.cloth" class="map-building__flag" />
    </template>

    <!-- дым из трубы, при повреждениях - черный дым и огонь -->
    <circle v-for="puff in smoke" :key="puff.key" v-bind="puff" />
    <circle v-for="flame in fire" :key="flame.key" v-bind="flame" />
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { BUILDING_TYPES, isBuilt } from '@/game/entities'
import { colorOf } from '@/game/groups'
import { shipyardLayout, toBox } from '@/game/placement'
import { buildingLook, buildingTop, materialOf, rectOf } from '@/game/visuals'

const PUFFS = 3 // клубов дыма одновременно

const props = defineProps({
  building: { type: Object, required: true },
  actions: { type: Object, required: true },
})

const store = useStore()
const type = computed(() => BUILDING_TYPES[props.building.type])
const group = computed(() => store.getters['game/getGroup'](props.building.groupId))
const selected = computed(() => store.getters['game/isSelected'](props.building.id))
const built = computed(() => isBuilt(props.building))
const layout = computed(() => (props.building.type === 'shipyard' ? shipyardLayout(props.building) : null))
const health = computed(() => props.building.hp / type.value.maxHp)

// цвет клана уходит в css-переменную: им красятся крыши и флаг
const colorStyle = computed(() => ({ '--color': colorOf(group.value) }))
const classes = computed(() => [`map-building--${materialOf(props.building.type)}`, {
  'map-building--selected': selected.value,
  'map-building--building': !built.value,
}])

const look = computed(() => {
  const { x, y } = props.building
  const parts = layout.value ? layout.value.parts : [toBox(x, y, type.value.size)]
  return buildingLook(props.building, type.value.height, parts)
})
const faces = computed(() => look.value.faces.map((face) => ({ points: face.points, class: `map-building__${face.part}` })))
const dock = computed(() => layout.value && rectOf(layout.value.dock))

// клубы с разной задержкой, чтобы шли друг за другом
const puffsAt = (point, r, className) => Array.from({ length: PUFFS }, (_, index) => ({
  key: `${className}${index}`, cx: point.x, cy: point.y, r, class: className, style: { animationDelay: `${index * 0.8}s` },
}))

// над серединой здания: туда идет дым и огонь от повреждений
const roofPoint = computed(() => {
  const lift = buildingTop(props.building, type.value.height) * 0.7
  return { x: props.building.x - lift, y: props.building.y - lift }
})

const smoke = computed(() => {
  if (!built.value) return []
  if (health.value < 0.5) return puffsAt(roofPoint.value, 0.5, 'map-building__smoke map-building__smoke--dark')
  return look.value.chimney ? puffsAt(look.value.chimney, 0.3, 'map-building__smoke') : []
})
const fire = computed(() => (built.value && health.value < 0.25 ? puffsAt(roofPoint.value, 0.35, 'map-building__fire') : []))

const onSelect = () => props.actions.select(props.building.id)
const onToggle = () => props.actions.toggleSelected(props.building.id)
</script>

<style scoped lang="scss">
@use 'sass:list';

// материал стен: дерево, камень или земля; левая стена светлее правой
$materials: (
  wood: (#7a5a3c, #5a412b),
  stone: (#8a8f96, #63676d),
  earth: (#6a5338, #4e3d29),
);

.map-building {
  cursor: pointer;

  polygon,
  rect,
  line {
    stroke: rgba(0, 0, 0, 0.6);
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  @each $name, $colors in $materials {
    &--#{$name} {
      --wall-left: #{list.nth($colors, 1)};
      --wall-right: #{list.nth($colors, 2)};
    }
  }

  &__wall-left {
    fill: var(--wall-left);
  }

  &__wall-right {
    fill: var(--wall-right);
  }

  // крыши в цвете клана, приглушенные, чтобы не спорить с флагом
  &__roof {
    fill: color-mix(in srgb, var(--color) 65%, #1a1a1a);
  }

  &__roof-side {
    fill: color-mix(in srgb, var(--color) 45%, #1a1a1a);
  }

  &__roof-back {
    fill: color-mix(in srgb, var(--color) 35%, #1a1a1a);
  }

  &__deck {
    fill: #8a6a48;
  }

  &__moss {
    fill: #4a5e3a;
  }

  &__bare {
    fill: #9a7b55;
  }

  &__door {
    fill: #1c140d;
  }

  // теплые окна слегка мерцают
  &__window {
    fill: #ffcf6b;
    animation: window 3s ease-in-out infinite alternate;
  }

  &__pole {
    stroke: #2b2016;
    stroke-width: 2;
  }

  &__flag {
    fill: var(--color);
  }

  &__scaffold {
    fill: none;
    stroke: #c9a46a;
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }

  &__dock {
    fill: rgba(138, 106, 72, 0.55);
    stroke-dasharray: 4 3;
  }

  &__smoke,
  &__fire {
    pointer-events: none;
    transform-box: fill-box;
    transform-origin: center;
  }

  // дым поднимается: вверх на экране - это минус по обеим осям мира
  &__smoke {
    fill: rgba(215, 222, 228, 0.7);
    stroke: none;
    opacity: 0;
    animation: smoke 2.4s ease-out infinite;

    &--dark {
      fill: rgba(30, 30, 32, 0.7);
    }
  }

  &__fire {
    fill: #ff8a2a;
    stroke: #ffd36b;
    animation: fire 0.5s ease-in-out infinite alternate;
  }

  &--building {
    opacity: 0.85;
  }

  &--selected {
    polygon {
      stroke: #fff;
      stroke-width: 2;
    }
  }
}

@keyframes window {
  from {
    opacity: 0.75;
  }

  to {
    opacity: 1;
  }
}

@keyframes smoke {
  from {
    opacity: 0.8;
    transform: translate(0, 0) scale(0.6);
  }

  to {
    opacity: 0;
    transform: translate(-2px, -2px) scale(2.2);
  }
}

@keyframes fire {
  from {
    transform: scale(0.8);
  }

  to {
    transform: scale(1.2);
  }
}
</style>
