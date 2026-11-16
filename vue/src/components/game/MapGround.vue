<template>
  <!-- поле, клетки и оси в координатах мира (рисуется внутри <g> с матрицей камеры) -->
  <defs>
    <clipPath id="map-clip">
      <polygon :points="points" />
    </clipPath>

    <!-- трава: плитка 4 x 4 клетки с пятнами, чтобы поле не было одной заливкой -->
    <pattern id="grass" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" class="map-ground__grass" />
      <circle v-for="(tuft, index) in GRASS_TUFTS" :key="index" v-bind="tuft" />
    </pattern>

    <!-- вода: волны, плитка медленно едет, поэтому вода живая -->
    <pattern id="water" patternUnits="userSpaceOnUse" width="3" height="3">
      <rect width="3" height="3" class="map-ground__water" />
      <path d="M0 0.8q0.375 -0.3 0.75 0t0.75 0t0.75 0t0.75 0M0 2.3q0.375 -0.3 0.75 0t0.75 0t0.75 0t0.75 0" class="map-ground__wave" />
      <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="3 0" dur="8s" repeatCount="indefinite" />
    </pattern>

    <!-- ель: ствол и три яруса хвои, рисуется стоя (см. UPRIGHT) -->
    <g id="spruce" class="map-ground__spruce">
      <rect x="-0.08" y="-0.35" width="0.16" height="0.35" class="map-ground__trunk" />
      <path d="M-0.6 -0.3L0 -1.3L0.6 -0.3Z" class="map-ground__needles" />
      <path d="M-0.48 -0.9L0 -1.8L0.48 -0.9Z" class="map-ground__needles map-ground__needles--mid" />
      <path d="M-0.34 -1.45L0 -2.25L0.34 -1.45Z" class="map-ground__needles map-ground__needles--top" />
    </g>

    <!-- вершина горы: светлый и теневой склоны, снежная шапка -->
    <g id="peak">
      <path d="M-0.9 0L-0.05 -1.5L0.15 0Z" class="map-ground__peak" />
      <path d="M0.15 0L-0.05 -1.5L0.9 0Z" class="map-ground__peak map-ground__peak--shade" />
      <path d="M-0.05 -1.5L-0.32 -1.02L-0.14 -1.1L-0.02 -0.98L0.1 -1.08L0.24 -1.02Z" class="map-ground__snow" />
    </g>

    <!-- мелочь на траве -->
    <g id="bush">
      <circle cx="-0.18" cy="-0.16" r="0.2" class="map-ground__bush" />
      <circle cx="0.16" cy="-0.15" r="0.18" class="map-ground__bush" />
      <circle cx="0" cy="-0.28" r="0.2" class="map-ground__bush map-ground__bush--light" />
    </g>
    <g id="rock">
      <path d="M-0.3 0L-0.24 -0.2L-0.05 -0.3L0.2 -0.22L0.3 0Z" class="map-ground__rock" />
      <path d="M-0.05 -0.3L0.2 -0.22L0.3 0L0.1 0Z" class="map-ground__rock map-ground__rock--shade" />
    </g>
    <g id="stump">
      <rect x="-0.14" y="-0.22" width="0.28" height="0.22" class="map-ground__trunk" />
      <ellipse cx="0" cy="-0.22" rx="0.14" ry="0.06" class="map-ground__cut" />
    </g>
  </defs>

  <polygon :points="points" fill="url(#grass)" />
  <g clip-path="url(#map-clip)">
    <!-- берег: узкая илистая полоса по краю воды, на сушу заходит всего на четверть клетки -->
    <path :d="water" class="map-ground__shore" />
    <path :d="water" fill="url(#water)" />
    <path :d="forestFloor" class="map-ground__forest" />
    <path :d="mountainFloor" class="map-ground__mountain" />
    <path :d="grid" class="map-ground__grid" />
  </g>
  <polygon :points="points" class="map-ground__edge" />
  <line v-bind="axisX" class="map-ground__axis map-ground__axis--x" />
  <line v-bind="axisY" class="map-ground__axis map-ground__axis--y" />

  <!-- кусты и камни, лес вокруг карты и рощи на ней: только картинка -->
  <use v-for="(item, index) in scenery" :key="index" v-bind="item" class="map-ground__tree" />
</template>

<script setup>
import { computed } from 'vue'
import { TERRAIN_TYPES, terrainAt, terrainPath } from '@/game/map'
import { forestAround, scatterDecor, terrainScenery, toPoints } from '@/game/visuals'

const props = defineProps({
  map: { type: Object, required: true },
})

// пятна травы внутри плитки, координаты и радиус в клетках
const DARK = 'map-ground__tuft'
const LIGHT = 'map-ground__tuft map-ground__tuft--light'
const GRASS_TUFTS = [
  { cx: 0.4, cy: 0.6, r: 0.18, class: DARK },
  { cx: 1.7, cy: 0.3, r: 0.12, class: LIGHT },
  { cx: 2.9, cy: 1.2, r: 0.22, class: DARK },
  { cx: 0.9, cy: 2.1, r: 0.14, class: LIGHT },
  { cx: 2.2, cy: 2.7, r: 0.16, class: DARK },
  { cx: 3.5, cy: 3.4, r: 0.12, class: LIGHT },
  { cx: 1.2, cy: 3.5, r: 0.2, class: DARK },
]

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

const points = computed(() => toPoints(props.map.outline))
const water = computed(() => terrainPath(props.map, TERRAIN_TYPES.WATER))
const forestFloor = computed(() => terrainPath(props.map, TERRAIN_TYPES.FOREST))
const mountainFloor = computed(() => terrainPath(props.map, TERRAIN_TYPES.MOUNTAIN))

// все украшения одним списком: мелочь на траве, ели вокруг карты, горы, рощи
const isFreeLand = (p) => terrainAt(props.map, p) === TERRAIN_TYPES.LAND
const toSpruce = (tree) => ({ ...tree, href: '#spruce' })
const scenery = computed(() => [
  ...scatterDecor(props.map.bounds, isFreeLand),
  ...forestAround(props.map.outline).map(toSpruce),
  ...terrainScenery(props.map.terrain, TERRAIN_TYPES.MOUNTAIN, '#peak', { every: 2, minScale: 1.6, spread: 1.4 }),
  ...terrainScenery(props.map.terrain, TERRAIN_TYPES.FOREST, '#spruce'),
])
const axisX = computed(() => ({ x1: props.map.bounds.minX, y1: 0, x2: props.map.bounds.maxX, y2: 0 }))
const axisY = computed(() => ({ x1: 0, y1: props.map.bounds.minY, x2: 0, y2: props.map.bounds.maxY }))

// все линии клеток одним path: M - начало линии, V/H - вертикальная/горизонтальная до
const grid = computed(() => {
  const { minX, minY, maxX, maxY } = props.map.bounds
  const xs = range(Math.ceil(minX), Math.floor(maxX)).map((x) => `M${x} ${minY}V${maxY}`)
  const ys = range(Math.ceil(minY), Math.floor(maxY)).map((y) => `M${minX} ${y}H${maxX}`)
  return [...xs, ...ys].join('')
})
</script>

<style scoped lang="scss">
// non-scaling-stroke: толщина линий в пикселях экрана, а не в клетках
.map-ground {
  // холодный лес: трава с синевой, свинцовая вода, илистый берег
  &__grass {
    fill: #3f5f40;
  }

  &__tuft {
    fill: #34503a;

    &--light {
      fill: #4c6e4a;
    }
  }

  &__water {
    fill: #3d5c6b;
  }

  &__wave {
    fill: none;
    stroke: rgba(255, 255, 255, 0.18);
    stroke-width: 0.07;
  }

  &__shore {
    fill: none;
    stroke: #6b6a5a;
    stroke-width: 0.5;
    stroke-linejoin: round;
  }

  &__grid {
    fill: none;
    stroke: rgba(0, 0, 0, 0.08);
    vector-effect: non-scaling-stroke;
  }

  &__edge {
    fill: none;
    stroke: #1a2a20;
    stroke-width: 3;
    vector-effect: non-scaling-stroke;
  }

  &__tree {
    pointer-events: none;
  }

  &__forest {
    fill: #263b2c;
  }

  &__mountain {
    fill: #4d5254;
  }

  &__peak {
    fill: #858c90;
    stroke: rgba(0, 0, 0, 0.4);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;

    &--shade {
      fill: #5a6064;
    }
  }

  &__snow {
    fill: #e3e9ec;
  }

  &__bush {
    fill: #2f4a33;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;

    &--light {
      fill: #3b5b3d;
    }
  }

  &__rock {
    fill: #7d8287;
    stroke: rgba(0, 0, 0, 0.4);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;

    &--shade {
      fill: #5c6166;
    }
  }

  &__cut {
    fill: #b8946a;
  }

  &__trunk {
    fill: #3b2a1e;
  }

  &__needles {
    fill: #1d3a2c;
    stroke: rgba(0, 0, 0, 0.35);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;

    &--mid {
      fill: #234634;
    }

    &--top {
      fill: #2a523d;
    }
  }

  &__axis {
    stroke-width: 2;
    stroke-opacity: 0.6;
    vector-effect: non-scaling-stroke;

    &--x {
      stroke: #e04848;
    }

    &--y {
      stroke: #3a7be0;
    }
  }
}
</style>
