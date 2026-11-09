<template>
  <div class="selection-panel">
    <div class="selection-panel__info">
      <template v-if="!objects.length">
       <div>Ничего не выбрано</div>
       <div class="selection-panel__build">
         <span>Строительство:</span>
         <button @mousedown.prevent @click="emit('start-build', 'HOUSE')">Дом (1x1)</button>
         <button @mousedown.prevent @click="emit('start-build', 'TOWER')">Башня (2x2)</button>
     </div>
</template>
      <template v-else-if="objects.length === 1">
        <b>{{ objects[0].type.name }}</b>
        <div>{{ getGroupName(objects[0].group) }}</div>
        <div>Здоровье: {{ objects[0].health }} / {{ objects[0].type.maxHealth }}</div>
        <div v-if="objects[0].type.speed">Скорость: {{ objects[0].type.speed }}</div>
        <div v-if="objects[0].type.attack">
          Атака: {{ objects[0].type.attack.damage }} урона раз в {{ objects[0].type.attack.interval }} с
        </div>
                <!-- Выводим силу и скорость передвижения (только для юнитов) -->
        <div v-if="objects[0].kind === 'unit'">Сила: {{ objects[0].type.strength }}</div>

        <div>Позиция: {{ Math.round(objects[0].x) }}, {{ Math.round(objects[0].y) }}</div>

        <!-- Кнопка самоуничтожения. Показывается только для юнитов. -->
        <button
          v-if="objects[0].kind === 'unit'"
          class="btn-destroy"
          @click="handleSelfDestruct(objects[0].id)"
        >
          Самоуничтожиться
        </button>
        <div v-if="objects[0].type.spawns?.length" class="selection-panel__spawn">
          <button
              v-for="key in objects[0].type.spawns"
              :key="key"
              type="button"
              @mousedown.prevent
              @click="emit('spawn', { buildingId: objects[0].id, unitType: key })"
          >
            {{ UNIT_TYPES[key].name }}
          </button>
        </div>
      </template>
      <template v-else>
        <b>Выбрано: {{ objects.length }}</b>
        <div v-for="(count, name) in counts" :key="name">{{ name }} × {{ count }}</div>
      </template>
    </div>
    <div class="selection-panel__hint">
      ЛКМ — выбрать, Shift+ЛКМ — добавить/убрать из выбора<br>
      Рамка — выбрать группу, Shift+рамка — добавить группу к выбору<br>
      ПКМ — идти (всем выбранным), ПКМ по чужой группе — атаковать, Shift+ПКМ — в очередь, Esc — снять выбор<br>
      Пробел — пауза. Камера: WASD / стрелки / курсор у края / зажатое колесо, масштаб — колесо мыши<br>
      <RouterLink :to="{ name: $routes.INDEX }">В меню</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { UNIT_TYPES, getGroupName } from '@/game/objects.js'

const props = defineProps({
  objects: { type: Array, required: true },
})

const emit = defineEmits(['spawn', 'start-build'])
// Импортируем хранилище (Store), чтобы иметь доступ к экшенам игры
import { useStore } from 'vuex'
const store = useStore()
// Функция для обработки нажатия на кнопку самоуничтожения
const handleSelfDestruct = (unitId) => {
  // Спрашиваем подтверждение, чтобы случайно не убить юнита
  if (confirm('Вы уверены, что хотите уничтожить юнита?')) {
    // Вызываем экшен destroyObject из модуля game, передавая ID юнита
    store.dispatch('game/destroyObject', unitId)
  }
}

const counts = computed(() => props.objects.reduce((result, object) => {
  result[object.type.name] = (result[object.type.name] || 0) + 1
  return result
}, {}))
</script>

<style scoped lang="scss">
.selection-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  // Постоянная высота: при смене выбора карта над панелью не меняет размер
  flex-shrink: 0;
  box-sizing: border-box;
  height: 176px;
  padding: 8px 16px;
  border-top: 1px solid #66805b;
  background: #1b2719;
  color: #f0f4e7;

  &__info {
    overflow-y: auto;
  }

  &__spawn {
    display: flex;
    gap: 8px;
    margin-top: 6px;

    button {
      padding: 4px 12px;
      border: 1px solid #66805b;
      background: #243421;
      color: #f0f4e7;
      cursor: pointer;

      &:hover {
        background: #354c2e;
      }
    }
  }

  &__hint {
    color: #b9cba5;
    text-align: right;
  }

    &__build {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    align-items: center;

    button {
      padding: 4px 12px;
      border: 1px solid #66805b;
      background: #243421;
      color: #f0f4e7;
      cursor: pointer;
      &:hover { background: #354c2e; }
    }
  }
}
// Стили для красной кнопки самоуничтожения
.btn-destroy {
  margin-top: 8px;
  padding: 4px 12px;
  background: #d6453a; // Красный цвет (опасность/удаление)
  color: white;
  border: 1px solid #ff6b5a;
  cursor: pointer;
  border-radius: 4px;
  
  // Эффект при наведении мыши
  &:hover { 
    background: #b0352b; 
  }
}
</style>
