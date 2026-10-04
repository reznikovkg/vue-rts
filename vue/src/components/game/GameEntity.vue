<template>
  <button
    class="entity"
    :class="[entity.type, { selected }]"
    :style="entityStyle"
    :title="entity.name"
    @click.stop="$emit('select', entity)"
    @contextmenu.prevent.stop
  >
    <span v-if="entity.type === 'building'">⌂</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Entity } from '@/game/entities'
import { world } from '@/game/world'

const props = withDefaults(defineProps<{
  entity: Entity
  selected?: boolean
}>(), {
  selected: false,
})

defineEmits<{ select: [entity: Entity] }>()

const entityStyle = computed(() => ({
  left: `${props.entity.x + world.width / 2 - props.entity.size / 2}px`,
  top: `${world.height / 2 - props.entity.y - props.entity.size / 2}px`,
  width: `${props.entity.size}px`,
  height: `${props.entity.size}px`,
  background: props.entity.color,
}))
</script>
