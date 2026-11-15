<!-- Компонент для отрисовки статических объектов (здания, деревья) -->
<template>
  <div
      class="game-static-object"
      :class="[{ 'game-static-object--selected': selected, 'game-static-object--constructing': construction !== null }, typeClass]"
      :style="style"
      @mousedown.left.stop="() => pushEmit()"
  >
    <div class="game-static-object__wall game-static-object__wall--left" :style="faces.leftWall" />
    <div class="game-static-object__wall game-static-object__wall--right" :style="faces.rightWall" />
    <div class="game-static-object__top" :style="faces.top" />
    <Battlements v-if="type.roofHeight && type.roofType === 'battlements'" :type="type" />
    <PyramidRoof v-else-if="type.roofHeight" :type="type" />
    <TreeBranches v-if="type.branchColor" :type="type" />
    <ProductionBar
        v-if="production"
        :progress="production.elapsed / production.duration"
        :offset="hpBarOffset"
        :width="hpBarWidth" />
    <!-- стройка и производство не бывают одновременно: спавн заблокирован, пока здание строится -->
    <ProductionBar
        v-if="construction"
        :progress="construction.elapsed / construction.duration"
        :offset="hpBarOffset"
        :width="hpBarWidth" />
    <HpBar
        v-if="object.hp !== undefined && maxHp !== null"
        :hp="object.hp"
        :max-hp="maxHp"
        :group="object.group"
        :offset="hpBarOffset"
        :width="hpBarWidth" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import HpBar from './HpBar.vue'
import ProductionBar from './ProductionBar.vue'
import Battlements from './parts/Battlements.vue'
import PyramidRoof from './parts/PyramidRoof.vue'
import TreeBranches from './parts/TreeBranches.vue'
import { depthZIndex, ISO_SCALE, worldToScreen } from '@/game/coords'
import type { BuildingType, ObjectType, ProductionJob, StaticObject } from '@/game/types'

// статичный объект на карте (здание, дерево): объёмная коробка с точкой привязки в центре основания
// Компонент только рисует: данные объекта приходят из стора world через GameField и не меняются здесь
const props = defineProps<{
  object: StaticObject
  type: ObjectType | BuildingType
  selected: boolean
}>()

const store = useStore()

// модификатор типа на корне: у мостов с настилом верх получает рисунок досок
const typeClass = computed(() => (props.type.image ? `game-static-object--${props.object.type}` : null))

// что здание создаёт сейчас: полоска производства над полоской жизней
const production = computed<ProductionJob | null>(() => store.getters['world/getProductionByBuilding'](props.object.id))

// строится ли здание сейчас (null = построено): полоска стройки на месте полоски производства
const construction = computed(() => store.getters['world/getConstructionByObject'](props.object.id))

// событие для родителя (GameField): если на объект кликнули, его надо выбрать
const emit = defineEmits<{ select: [] }>()
const pushEmit = () => emit('select')

const maxHp = computed(() => ('maxHp' in props.type ? props.type.maxHp : null))

// ширина полоски жизней на одну клетку размера здания: чем больше здание, тем шире полоска
const HP_BAR_PX_PER_CELL = 30

const hpBarWidth = computed(() => ('size' in props.type ? props.type.size * HP_BAR_PX_PER_CELL : undefined))

// высота самой верхней точки объекта над точкой привязки, чтобы полоска жизней не налезала на объект
const hpBarOffset = computed(() => {
  const { width, height, wallHeight = 0, roofHeight = 0, roofType } = props.type
  const backCorner = -worldToScreen({ x: -width / 2, y: -height / 2 }).y
  if (roofType === 'battlements') {
    return wallHeight + backCorner + roofHeight
  }
  return wallHeight + Math.max(backCorner, roofHeight)
})

const style = computed(() => {
  const point = worldToScreen(props.object.position)
  return {
    left: point.x + 'px',
    top: point.y + 'px',
    zIndex: depthZIndex(point),
  }
})

const faces = computed(() => {
  const { width, height, color } = props.type
  const wallHeight = props.type.wallHeight ?? 0
  const left = worldToScreen({ x: -width / 2, y: height / 2 })
  const front = worldToScreen({ x: width / 2, y: height / 2 })
  return {
    // стена вдоль оси x мира: от левого угла вправо-вниз к ближнему
    leftWall: {
      left: left.x + 'px',
      top: left.y - wallHeight + 'px',
      width: width + 'px',
      height: wallHeight + 'px',
      backgroundColor: color,
      transform: `matrix(${ISO_SCALE}, ${ISO_SCALE / 2}, 0, 1, 0, 0)`,
    },
    // стена вдоль оси y мира: от ближнего угла вправо-вверх
    rightWall: {
      left: front.x + 'px',
      top: front.y - wallHeight + 'px',
      width: height + 'px',
      height: wallHeight + 'px',
      backgroundColor: color,
      transform: `matrix(${ISO_SCALE}, ${-ISO_SCALE / 2}, 0, 1, 0, 0)`,
    },
    // верх - основание, поднятое на высоту стен; у моста настил рисует модификатор game-static-object--bridge
    top: {
      left: -width / 2 + 'px',
      top: -height / 2 - wallHeight + 'px',
      width: width + 'px',
      height: height + 'px',
      backgroundColor: color,
    },
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.game-static-object {
  position: absolute;
  width: 0;
  height: 0;
  cursor: pointer;

  // стены: скос изометрии, дальняя (правая) темнее
  &__wall {
    @include face('game-static-object');
    @include wall;

    &--right {
      @include wall(true);
    }
  }

  // верх - основание, поднятое на высоту стен; изометрия для ромбовидности
  &__top {
    @include face('game-static-object');
    @include iso-flat;
  }

  // недостроенное здание полупрозрачно, как превью при выборе места
  &--constructing {
    .game-static-object__wall,
    .game-static-object__top {
      opacity: $ghost-opacity;
    }
  }

  // настил моста: доски на всю площадь верха
  &--bridge,
  &--bridge-vertical {
    .game-static-object__top {
      background-size: 100% 100%;
    }
  }

  &--bridge .game-static-object__top {
    background-image: url('../../assets/bridge.svg');
  }

  &--bridge-vertical .game-static-object__top {
    background-image: url('../../assets/bridge-vertical.svg');
  }
}
</style>
