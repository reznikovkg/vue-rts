<template>
  <g
      class="game-world-object"
      :transform="`translate(${position.px} ${position.py})`"
  >
    <ellipse
        v-if="targeted"
        class="game-world-object__target"
        :rx="ring.rx"
        :ry="ring.ry"
    />
    <ellipse
        v-if="selected"
        class="game-world-object__selection"
        :rx="ring.rx"
        :ry="ring.ry"
    />
    <polygon
        v-if="isBuilding"
        class="game-world-object__building"
        :points="buildingPoints"
        :style="{ fill: fillColor }"
    />
    <circle
        v-else
        r="8"
        class="game-world-object__marker"
        :style="{ fill: fillColor }"
    />
    <g
        v-if="showHp"
        class="game-world-object__hp"
        :transform="`translate(0 ${hpBar.y})`"
    >
      <rect
          class="game-world-object__hp-back"
          :x="-hpBar.width / 2"
          y="-2"
          :width="hpBar.width"
          height="4"
      />
      <rect
          class="game-world-object__hp-fill"
          :x="-hpBar.width / 2"
          y="-2"
          :width="hpBar.width * hpRatio"
          height="4"
      />
    </g>
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { getGroupColor } from '@/game/config/groups.js'
import { worldToProjectedPlane } from '../world/coordinates.js'
import { ISO_TILE_HEIGHT, ISO_TILE_WIDTH, WORLD_GRID_SIZE } from '@/game/world/worldUnits.js'

const props = defineProps({
  wx: {
    type: Number,
    required: true,
  },
  wy: {
    type: Number,
    required: true,
  },
  radius: {
    type: Number,
    default: 16,
  },
  type: {
    type: String,
    default: 'unit',
  },
  sizeN: {
    type: Number,
    default: 1,
  },
  group: {
    type: Number,
    default: 1,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  targeted: {
    type: Boolean,
    default: false,
  },
  hp: {
    type: Number,
    default: null,
  },
  maxHp: {
    type: Number,
    default: null,
  },
})

const store = useStore()
const camera = computed(() => store.getters['camera/camera'])

const isBuilding = computed(() => props.type === 'building')
const sizeN = computed(() => Math.max(1, props.sizeN || 1))
const fillColor = computed(() => getGroupColor(props.group))

const position = computed(() =>
    worldToProjectedPlane(props.wx, props.wy, camera.value),
)

const ring = computed(() => {
  if (isBuilding.value) {
    return {
      rx: sizeN.value * (ISO_TILE_WIDTH / 2),
      ry: sizeN.value * (ISO_TILE_HEIGHT / 2),
    }
  }
  const k = (props.radius * Math.SQRT2) / WORLD_GRID_SIZE
  return { rx: k * (ISO_TILE_WIDTH / 2), ry: k * (ISO_TILE_HEIGHT / 2) }
})

const showHp = computed(
    () => Number.isFinite(props.hp) && props.maxHp > 0 && props.hp < props.maxHp,
)
const hpRatio = computed(() => Math.max(0, Math.min(1, props.hp / props.maxHp)))
const hpBar = computed(() => {
  if (isBuilding.value) {
    const halfW = sizeN.value * (ISO_TILE_WIDTH / 2)
    const halfH = sizeN.value * (ISO_TILE_HEIGHT / 2)
    return { width: halfW, y: -halfH - 8 }
  }
  return { width: 28, y: -22 }
})

const buildingPoints = computed(() => {
  const halfW = sizeN.value * (ISO_TILE_WIDTH / 2)
  const halfH = sizeN.value * (ISO_TILE_HEIGHT / 2)
  return `0,${-halfH} ${halfW},0 0,${halfH} ${-halfW},0`
})
</script>

<style scoped lang="scss">
.game-world-object__selection {
  fill: rgba(120, 255, 120, 0.2);
  stroke: #7dff7d;
  stroke-width: 1px;
}
.game-world-object__target {
  fill: rgba(255, 70, 70, 0.2);
  stroke: #ff4646;
  stroke-width: 2px;
}
.game-world-object__hp-back {
  fill: rgba(0, 0, 0, 0.7);
}
.game-world-object__hp-fill {
  fill: #5ddc5d;
}
.game-world-object__marker {
  stroke: #1a1208;
  stroke-width: 2;
}
.game-world-object__building {
  stroke: #1a1208;
  stroke-width: 2;
}
</style>