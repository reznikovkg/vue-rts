<template>
  <div class="controls-row header">
    <strong>RTS · группа {{ activeGroup }}</strong>
    <div class="header-actions">
      <button type="button" @click="$emit('togglePause')">
        {{ isPaused ? 'Продолжить' : 'Пауза' }}
      </button>
      <button
        type="button"
        :aria-expanded="isExpanded"
        @click="$emit('toggleExpanded')"
      >
        {{ isExpanded ? 'Свернуть' : 'Панель' }}
      </button>
    </div>
  </div>

  <div class="controls-row">
    <label for="scenario">Сценарий</label>
    <select id="scenario" :value="scenario" @change="changeScenario">
      <option value="skirmish">Стычка</option>
      <option value="crossfire">Перекрёстный бой</option>
    </select>
  </div>
</template>

<script setup lang="ts">
interface Props {
  activeGroup: number
  isPaused: boolean
  isExpanded: boolean
  scenario: string
}

defineProps<Props>()

const emit = defineEmits<{
  togglePause: []
  toggleExpanded: []
  changeScenario: [scenario: string]
}>()

function changeScenario(event: Event) {
  const target = event.target
  if (target instanceof HTMLSelectElement) {
    emit('changeScenario', target.value)
  }
}
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  gap: 6px;
}
</style>
