<!-- Компонент для отрисовки юнитов -->
<template>
  <div
      class="game-unit"
      :class="[shapeClass, { 'game-unit--selected': selected, 'game-unit--walking': walking, 'game-unit--attacking': attacking }]"
      :style="style"
      @mousedown.left.stop="(event) => pushEmit(event)">
    <!-- плавающие суда стоят прямо в воде: у них нет тени на воде -->
    <div v-if="shape === 'human'" class="game-unit__shadow" />

    <!-- пеший юнит: человечек из css-фигур, стоит ногами в точке position -->
    <template v-if="shape === 'human'">
      <div class="game-unit__leg game-unit__leg--left" />
      <div class="game-unit__leg game-unit__leg--right" />
      <div class="game-unit__body" :style="{ backgroundColor: type.color }" />
      <div class="game-unit__arm game-unit__arm--left" />
      <!-- в правой руке топор: этой рукой юнит бьёт -->
      <div class="game-unit__arm game-unit__arm--right">
        <div class="game-unit__axe" />
      </div>
      <div class="game-unit__head" :style="{ backgroundColor: type.color }" />
    </template>

    <!--
      лодка и корабль: корпус нарисован сверху (нос вдоль локальной оси x)
      и спроецирован в изометрию той же worldToScreen, что и земля.
      Курс хранится в мировых радианах (unit.facing), поэтому кадров на 4 стороны нет:
      корпус плавно поворачивается по направлению движения
    -->
    <div v-else class="game-unit__vessel" :style="anchorStyle">
      <svg class="game-unit__deck" :viewBox="viewBox" :width="vesselSize" :height="vesselSize" :style="deckStyle">
        <!-- борт под палубой: тот же силуэт, сдвинутый вниз по экрану -->
        <polygon :points="geometry.hullPoints('keel')" :fill="keelColor" />

        <!-- корпус и палуба -->
        <polygon :points="geometry.hullPoints('hull')" :fill="type.color" />
        <polygon :points="geometry.hullPoints('deck')" :fill="deckColor" />

        <!-- лодка: планшири носа и кормы, банки гребцов и румпель -->
        <g v-if="shape === 'boat'">
          <line
              v-for="(bench, index) in geometry.benches"
              :key="'bench' + index"
              :x1="bench.x1" :y1="bench.y1" :x2="bench.x2" :y2="bench.y2"
              stroke="#a56a2a" stroke-width="3" stroke-linecap="round" />
          <line
              :x1="geometry.tiller.x1" :y1="geometry.tiller.y1" :x2="geometry.tiller.x2" :y2="geometry.tiller.y2"
              stroke="#5b3614" stroke-width="3" stroke-linecap="round" />
        </g>

        <!-- корабль: стволы, две башни главного калибра, мостик и основание трубы -->
        <g v-else>
          <line
              v-for="(barrel, index) in geometry.barrels"
              :key="'barrel' + index"
              :x1="barrel.x1" :y1="barrel.y1" :x2="barrel.x2" :y2="barrel.y2"
              stroke="#374151" stroke-width="4" stroke-linecap="round" />
          <circle
              v-for="(turret, index) in geometry.turrets"
              :key="'turret' + index"
              :cx="turret.x" :cy="turret.y" :r="turret.r"
              fill="#9ca3af" stroke="#1f2937" stroke-width="2" />
          <polygon :points="geometry.hullPoints('bridge')" fill="#9ca3af" stroke="#1f2937" stroke-width="2" />
          <ellipse :cx="geometry.funnelAnchor.x" :cy="geometry.funnelAnchor.y" rx="8" ry="5.5" fill="#374151" stroke="#1f2937" stroke-width="2" />
        </g>

        <!-- контур корпуса: у выбранного судна белый -->
        <polygon :points="geometry.hullPoints('hull')" fill="none"
                 :stroke="selected ? '#fff' : 'rgba(0, 0, 0, 0.55)'"
                 :stroke-width="selected ? 2 : 1.5" />
      </svg>

      <!-- вертикальные части стоят в проекции своей точки палубы, но не наклоняются -->
      <div class="game-unit__upright" :style="uprightStyle">
        <template v-if="shape === 'warship'">
          <div class="game-unit__smoke" :class="{ 'game-unit__smoke--moving': walking }" />
          <div class="game-unit__stack" />
        </template>
        <template v-else>
          <div class="game-unit__flag" :style="{ backgroundColor: groupColor(unit.group) }" />
          <div class="game-unit__mast" />
        </template>
      </div>
    </div>

    <HpBar :hp="unit.hp" :max-hp="type.maxHp" :group="unit.group" :width="barWidth" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import HpBar from './HpBar.vue'
import { groupColor } from '@/game/config'
import { depthZIndex, worldToScreen } from '@/game/coords'
import { overlaps, unitFootprint } from '@/game/spatial'
import { bridgesOf } from '@/game/terrain'
import { BOAT_DIMS, WARSHIP_DIMS, vesselGeometry } from '@/game/vessel'
import type { Unit, UnitType } from '@/game/types'

// Юнит: у пеших - человечек, у водных - лодка или корабль; точка position - центр на воде.
// Компонент только рисует: данные юнита приходят из стора world через GameField и не меняются здесь
const props = defineProps<{
  unit: Unit
  type: UnitType
  selected: boolean
}>()

const store = useStore()

// Судно на прямоугольнике моста проходит под настилом: z-index 1 ниже слоя мостов
// (z-index 2 в GameField). Пешие ходят по настилу и остаются выше него
const underBridge = computed(() => props.type.terrain === 'water' &&
  bridgesOf(store.getters['world/getObjects'])
    .some((bridge) => overlaps(unitFootprint(props.unit), bridge)))

// Событие для родителя (GameField): если на юнита кликнули, его надо выбрать
// С зажатым shift юнит добавляется к выбору или убирается из него
const emit = defineEmits<{ select: [additive: boolean] }>()
const pushEmit = (event: MouseEvent) => emit('select', event.shiftKey)

// Ожидание свободного пути сохраняет цель, но не включает анимацию ходьбы
const walking = computed(() => !!props.unit.target && !!props.unit.path?.length && !props.unit.blockedFor)

// Атака: юнит в режиме атаки и дошёл до цели (приказ движения снят), стоит и бьёт
const attacking = computed(() => !!props.unit.isAttacking && !props.unit.target)

// Темп удара из attackSpeed: период одного замаха в секундах
const strikePeriod = computed(() => (props.type.attackSpeed > 0 ? 1 / props.type.attackSpeed : 1))

// Как рисовать юнит: по умолчанию человечек, у лодок и кораблей - свой силуэт
const shape = computed(() => props.type.shape ?? 'human')

// модификатор формы на корне: анимации судов вешаются на класс game-unit--boat/--warship
const shapeClass = computed(() => (shape.value === 'human' ? null : `game-unit--${shape.value}`))

// Полоска жизней у больших кораблей шире, у пехоты остаётся прежней
const barWidth = computed(() => Math.round(Math.min(84, Math.max(36, props.type.width * 0.6))))

// Курс судна в мировых радианах: 0 - нос в +x мира. Стоящее судно сохраняет последний курс
const facing = computed(() => props.unit.facing ?? Math.PI / 4)

// Корпус в плане: длина от кормы до носа и ширина в борт, в мировых пикселях
const dims = computed(() => (shape.value === 'warship' ? WARSHIP_DIMS : BOAT_DIMS))

// Вся геометрия судна (контуры, банки, башни) - чистая функция из vessel.ts
const geometry = computed(() => vesselGeometry(props.unit.position, facing.value, dims.value))

const vesselSize = computed(() => geometry.value.size)
const viewBox = computed(() => `${-vesselSize.value / 2} ${-vesselSize.value / 2} ${vesselSize.value} ${vesselSize.value}`)

// Якорь в центре рамки юнита: корпус нарисован вокруг точки position
// и остаётся внутри кликабельной рамки (иначе svg уходил ниже и ловил клики соседей)
const anchorStyle = {
  position: 'absolute' as const,
  left: '50%',
  top: '50%',
}

// svg центрируется на якоре: его центр - точка на воде
const deckStyle = computed(() => ({
  position: 'absolute' as const,
  left: '0',
  top: '0',
  transform: 'translate(-50%, -50%)',
}))

// Вертикальная часть встаёт в точку палубы (координаты от якоря, ось y вверх отрицательная)
const uprightStyle = computed(() => ({
  position: 'absolute' as const,
  left: geometry.value.funnelAnchor.x + 'px',
  bottom: -geometry.value.funnelAnchor.y + 'px',
}))

const deckColor = computed(() => (shape.value === 'warship' ? '#6b7280' : '#8b5a2b'))
const keelColor = 'rgba(20, 20, 20, 0.6)'

const style = computed(() => {
  const point = worldToScreen(props.unit.position)
  // пеший стоит ногами в точке position, поэтому рамка поднята на всю высоту;
  // у судна position - центр корпуса на воде, рамка центрируется на нём
  const top = shape.value === 'human' ? point.y - props.type.height : point.y - props.type.height / 2
  return {
    left: point.x - props.type.width / 2 + 'px',
    top: top + 'px',
    width: props.type.width + 'px',
    height: props.type.height + 'px',
    zIndex: underBridge.value ? 1 : depthZIndex(point),
    '--strike-period': strikePeriod.value + 's',
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

// углы шага ног для двух кадров анимации
$leg-step: 25deg;

.game-unit {
  position: absolute;
  cursor: pointer;

  &__shadow {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    aspect-ratio: 2 / 1;
    border-radius: 50%;
    background: $shadow-color;
    transform: translateY(50%);
  }

  &__leg {
    bottom: 0;

    @include limb('game-unit', 32%);

    &--left {
      left: 25%;
      --step-a: #{$leg-step};
      --step-b: #{-$leg-step};
    }

    &--right {
      right: 25%;
      --step-a: #{-$leg-step};
      --step-b: #{$leg-step};
    }
  }

  // Руки вращаются вокруг плеч
  &__arm {
    top: 34%;

    @include limb('game-unit', 34%);

    &--left {
      left: 0;
      transform: rotate(25deg);
      --step-a: 5deg;
      --step-b: 50deg;
    }

    &--right {
      right: 0;
      transform: rotate(-25deg);
      --step-a: -50deg;
      --step-b: -5deg;
    }
  }

  // Топор в правой руке: рукоять из-под кулака, лезвие у конца.
  // Рука вращается вокруг плеча - топор идёт по дуге удара
  &__axe {
    position: absolute;
    left: 0;
    bottom: -8px;
    width: 4px;
    height: 15px;
    border-radius: 2px;
    background: #7c4a1e;

    // лезвие: стальной полумесяц, режущая кромка наружу от тела -
    // она ведёт взмах, когда рука бьёт поперёк тела
    &::after {
      content: '';
      position: absolute;
      left: -7px;
      bottom: -1px;
      width: 9px;
      height: 8px;
      border-radius: 70% 20% 20% 70%;
      background: linear-gradient(to right, #e5e7eb, #9ca3af);
    }
  }

  &__body,
  &__head {
    position: absolute;
    background-image: radial-gradient(
      circle at 35% 28%,
      rgba($selected-color, 0.6) 0%,
      rgba($selected-color, 0) 40%,
      rgba($outline-color, 0.4) 100%
    );

    @include outlined('game-unit', 50%);
  }

  &__body {
    left: 0;
    top: 26%;
    width: 100%;
    height: 50%;
  }

  &__head {
    left: 22%;
    top: 0;
    width: 56%;
    aspect-ratio: 1;
  }

  // Судно: корпус лежит в плоскости воды.
  // Рисунок прозрачен для мыши: клики ловит рамка юнита, иначе большой svg
  // перехватывал бы нажатия у соседних юнитов
  &__vessel {
    pointer-events: none;
  }

  &__deck {
    overflow: visible;
  }

  // Мачта лодки: вертикальная стойка с флагом цвета группы
  &__mast {
    width: 2px;
    height: 34px;
    margin-left: -1px;
    background: #3f2a14;
  }

  &__flag {
    position: absolute;
    left: 1px;
    bottom: 34px;
    width: 14px;
    height: 10px;
    clip-path: polygon(0 0, 100% 0, 60% 50%, 100% 100%, 0 100%);
    box-shadow: 0 0 0 1px rgba($outline-color, 0.5);
  }

  // Труба корабля: вертикальный цилиндр и дым над ним
  &__stack {
    width: 12px;
    height: 30px;
    margin-left: -6px;
    border: 1px solid rgba($outline-color, 0.6);
    border-top: 4px solid #111827;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(to right, #374151, #9ca3af, #374151);
  }

  &__smoke {
    position: absolute;
    left: 4px;
    bottom: 30px;
    width: 26px;
    height: 16px;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(220, 220, 220, 0.75), rgba(220, 220, 220, 0));
    opacity: 0.45;

    // дым идёт, пока корабль на ходу
    &--moving {
      animation: drift 2.4s ease-out infinite;
    }
  }

  // Ходьба из двух кадров
  &--walking > &__leg,
  &--walking > &__arm {
    animation: walk 0.4s steps(1) infinite;
  }

  // Удар пешего: замах правой рукой наружу и взмах поперёк тела,
  // темп - период из attackSpeed юнита
  &--attacking > &__arm--right {
    animation: strike var(--strike-period, 1s) ease-in-out infinite;
  }
}

// Качка судна на ходу: корпус плавно покачивается
.game-unit--boat.game-unit--walking .game-unit__deck,
.game-unit--warship.game-unit--walking .game-unit__deck {
  animation: bob 2.2s ease-in-out infinite;
}

@keyframes walk {
  0% {
    transform: rotate(var(--step-a));
  }

  50% {
    transform: rotate(var(--step-b));
  }
}

@keyframes strike {
  0%,
  100% {
    transform: rotate(-25deg);
  }

  35% {
    transform: rotate(-100deg);
  }

  50%,
  65% {
    transform: rotate(35deg);
  }
}

@keyframes bob {
  0%,
  100% {
    transform: translate(-50%, -50%) translateY(0) rotate(-0.6deg);
  }

  50% {
    transform: translate(-50%, -50%) translateY(-2px) rotate(0.6deg);
  }
}

// Выстрел судна: короткая отдача корпуса в такт ударам
.game-unit--boat.game-unit--attacking .game-unit__deck,
.game-unit--warship.game-unit--attacking .game-unit__deck {
  animation: recoil var(--strike-period, 1s) ease-out infinite;
}

@keyframes recoil {
  0%,
  100% {
    transform: translate(-50%, -50%) translateY(0) rotate(0deg);
  }

  12% {
    transform: translate(-50%, -50%) translateY(2px) rotate(1.2deg);
  }
}

@keyframes drift {
  0% {
    transform: translateX(0) scale(1);
    opacity: 0.8;
  }

  100% {
    transform: translateX(14px) scale(1.8);
    opacity: 0;
  }
}
</style>
