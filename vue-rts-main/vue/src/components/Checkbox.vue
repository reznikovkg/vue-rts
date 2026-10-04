<template>
  <div>
    <input v-model="check" type="checkbox" @change="(e) => addV(6, e)"> {{ v }} // {{ v2 }} //
    <span :class="check ? 'checkbox__label--green' : 'checkbox__label--red'">Wow! ({{ props.way }}) // {{ v3 }}</span>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import mitt, { EVENT_NAMES } from '../plugins/mitt'

const props = defineProps({
  way: {
    default: 0,
    type: Number
  }
})

const emits = defineEmits(['change'])
const emitter = mitt

const v = ref(0)
const check = ref(true)

const v2 = computed(() => v.value * 2)
const v3 = inject('v')

const addV = (p, e = null) => {
  v.value += p
  emits('change', v.value)

  if (emitter && typeof emitter.emit === 'function' && EVENT_NAMES?.CHANGE) {
    emitter.emit(EVENT_NAMES.CHANGE)
  }
}

onMounted(() => {
  console.log('Checkbox', props.way)
})
</script>

<style scoped>
.checkbox__label--red {
  color: red;
}
.checkbox__label--green {
  color: green;
}
</style>