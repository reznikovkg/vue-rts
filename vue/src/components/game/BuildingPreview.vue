<template>
  <div
      class="building-preview"
      :class="{ 'building-preview--valid': placement.valid }"
      :style="style">
    <div class="building-preview__footprint" :style="footprintStyle" />
    <div class="building-preview__model">
      <GameStaticObject :object="object" :type="type" :selected="false" />
    </div>
    <div class="building-preview__label" :style="labelStyle" role="status">
      {{ placement.valid ? 'ЛКМ — построить' : placement.reason }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GameStaticObject from './GameStaticObject.vue'
import { MAP } from '@/game/config'
import { worldToScreen } from '@/game/coords'
import type { BuildingPlacement } from '@/game/building'
import type { BuildingType, StaticObject } from '@/game/types'

const props = defineProps<{
  typeId: string
  type: BuildingType
  placement: BuildingPlacement
  group: number
}>()

// Модель рисуется относительно центра превью, её позиция локальная
const object = computed<StaticObject>(() => ({
  id: 0, type: props.typeId, group: props.group, position: { x: 0, y: 0 },
}))
const style = computed(() => {
  const point = worldToScreen(props.placement.position)
  return { left: point.x + 'px', top: point.y + 'px' }
})
const footprintStyle = computed(() => ({
  left: -props.type.width / 2 + 'px',
  top: -props.type.height / 2 + 'px',
  width: props.type.width + 'px',
  height: props.type.height + 'px',
  backgroundSize: `${MAP.cell}px ${MAP.cell}px`,
}))
const labelStyle = computed(() => ({
  top: worldToScreen({ x: props.type.width / 2, y: props.type.height / 2 }).y + 12 + 'px',
}))
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.building-preview {
  position: absolute;
  z-index: 10000;
  color: $danger-color;
  pointer-events: none;

  &--valid {
    color: $action-color;
  }

  &__footprint {
    position: absolute;
    box-sizing: border-box;
    border: 3px solid currentColor;
    background-color: color-mix(in srgb, currentColor 30%, transparent);
    background-image:
        linear-gradient(to right, currentColor 1px, transparent 1px),
        linear-gradient(to bottom, currentColor 1px, transparent 1px);
    transform: scaleY(0.5) rotate(45deg);
  }

  &__model {
    opacity: 0.45;
  }

  &__label {
    position: absolute;
    left: 0;
    padding: 4px 8px;
    border-radius: 4px;
    background: $panel-background-hover;
    font-size: 13px;
    white-space: nowrap;
    transform: translateX(-50%);
  }
}
</style>
