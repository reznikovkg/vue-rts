<template>
  <aside class="panel">
    <h3>RTS</h3>

    <section>
      <button @click="store.commit('game/SET_PAUSED', !game.paused)">
        {{ game.paused ? '▶ Продолжить' : '⏸ Пауза' }}
      </button>
      <div class="row">
        <button v-for="(s, i) in SCENARIOS" :key="s.name" @click="store.commit('game/LOAD_SCENARIO', i)">
          {{ s.name }}
        </button>
      </div>
      <p v-if="game.gameOver" class="over">
        Игра окончена. {{ game.winner ? 'Победила группа ' + game.winner : 'Победителей нет' }}
      </p>
    </section>

    <section>
      <h4>Постройка</h4>
      <div class="row">
        Группа:
        <button
          v-for="g in GROUPS" :key="g"
          :class="{ active: game.group === g }"
          :style="{ borderColor: GROUP_COLORS[g] }"
          @click="store.commit('game/SET_GROUP', g)"
        >{{ g }}</button>
      </div>
      <div class="row">
        <button
          v-for="(b, key) in BUILDING_TYPES" :key="key"
          :class="{ active: game.buildType === key }"
          @click="store.commit('game/SET_BUILD_TYPE', key)"
        >{{ b.icon }} {{ b.name }} {{ b.size }}×{{ b.size }}</button>
      </div>
      <small v-if="game.buildType">ЛКМ по суше — поставить, ПКМ / Esc — отмена</small>
    </section>

    <section>
      <h4>Выбрано</h4>
      <div v-if="selUnits.length">
        <div>Юнитов: {{ selUnits.length }}</div>
        <div v-if="selUnits.length === 1">
          {{ UNIT_TYPES[selUnits[0].type].name }}, группа {{ selUnits[0].group }}<br>
          HP {{ selUnits[0].hp }}/{{ selUnits[0].maxHp }}, сила {{ selUnits[0].strength }},
          скорость {{ selUnits[0].speed }}, атака {{ selUnits[0].attackSpeed }}/с
        </div>
        <button @click="store.commit('game/DESTROY', selUnits.map(u => u.id))">💥 Самоуничтожение</button>
      </div>
      <div v-else-if="selBuilding">
        {{ BUILDING_TYPES[selBuilding.type].name }}, группа {{ selBuilding.group }}<br>
        HP {{ selBuilding.hp }}/{{ selBuilding.maxHp }}
        <div v-if="BUILDING_TYPES[selBuilding.type].spawn">
          <button @click="store.dispatch('game/spawn', selBuilding.id)">
            Создать: {{ UNIT_TYPES[BUILDING_TYPES[selBuilding.type].spawn].name }}
          </button>
        </div>
      </div>
      <small v-else>ничего</small>
    </section>

    <small class="help">
      ЛКМ — выбор, рамка — область, Shift — добавить к выбору.<br>
      ПКМ — идти / атаковать врага (другая группа), Shift+ПКМ — добавить в очередь.<br>
      WASD / стрелки — камера.
    </small>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { SCENARIOS } from '@/game/scenarios'
import { GROUPS, GROUP_COLORS, UNIT_TYPES, BUILDING_TYPES } from '@/game/config'

const store = useStore()
const game = computed(() => store.state.game)
const selected = computed(() => store.getters['game/selectedEntities'])
const selUnits = computed(() => selected.value.filter(e => e.kind === 'unit'))
const selBuilding = computed(() => selected.value.find(e => e.kind === 'building'))
</script>

<style scoped>
.panel {
  width: 260px;
  padding: 12px;
  background: #1f2430;
  color: #eee;
  font: 14px sans-serif;
  overflow: auto;
  box-sizing: border-box;
}
h3, h4 { margin: 0 0 6px; }
section { margin-bottom: 14px; }
.row { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin: 6px 0; }
button {
  background: #2f3646; color: #eee;
  border: 2px solid #475069; border-radius: 4px;
  padding: 4px 8px; cursor: pointer;
}
button.active { background: #475069; }
.over { color: #facc15; font-weight: bold; }
small { color: #9aa3b5; display: block; }
.help { margin-top: 10px; line-height: 1.5; }
</style>
