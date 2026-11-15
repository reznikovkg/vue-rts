<!-- Основной компонент игрового поля -->
<template>
  <div
      ref="screenView"
      class="screen-view"
      :class="{ 'screen-view--paused': paused }"
      @mousedown.left.capture="placeBuilding"
      @mousedown.left="(event) => startSelect(event)"
      @mousedown.middle.prevent="(event) => startDrag(event)"
      @mousedown.right="(event) => startFollow(event)"
      @contextmenu.prevent
      @mousemove="(event) => saveMouse(event)"
      @mouseleave="() => resetMouse()">

    <div class="screen-view__world" :style="worldStyle">
      <GameGround />

      <div class="screen-view__layer screen-view__layer--objects">
        <!-- Уничтоженный объект не пропадает сразу, а проигрывает анимацию destroy -->
        <TransitionGroup name="destroy">
          <GameStaticObject
              v-for="o in staticObjects"
              :key="o.id"
              :object="o"
              :type="OBJECT_TYPES[o.type]"
              :selected="selectedIds.includes(o.id)"
              @select="select(o.id)"/>
        </TransitionGroup>
      </div>

      <!-- Настилы мостов: отдельный слой между судами, проходящими под мостом,
           и юнитами на настиле (z-index слоёв - в стилях ниже) -->
      <div class="screen-view__layer screen-view__layer--bridges">
        <TransitionGroup name="destroy">
          <GameStaticObject
              v-for="o in bridges"
              :key="o.id"
              :object="o"
              :type="OBJECT_TYPES[o.type]"
              :selected="selectedIds.includes(o.id)"
              @select="select(o.id)"/>
        </TransitionGroup>
      </div>

      <!-- Приказы выбранных юнитов: путь и точка назначения -->
      <UnitOrders />

      <!-- Кто кого атакует: линия от атакующего к текущей позиции цели -->
      <div
          v-for="attack in attacks"
          :key="'attack-line-' + attack.id"
          class="screen-view__attack-line"
          :style="attack.lineStyle" />

      <TransitionGroup name="destroy">
        <GameUnit
            v-for="u in units"
            :key="u.id"
            :unit="u"
            :type="UNIT_TYPES[u.type]"
            :selected="selectedIds.includes(u.id)"
            @select="(additive) => selectUnit(u.id, additive)"/>
      </TransitionGroup>

      <div
          v-for="attack in attacks"
          :key="'attack-mark-' + attack.id"
          class="screen-view__attack-mark"
          :style="attack.markStyle" />

      <BuildingPreview
          v-if="buildingType && buildingConfig && buildingPlacement"
          :type-id="buildingType"
          :type="buildingConfig"
          :placement="buildingPlacement"
          :group="buildingGroup" />
    </div>

    <div
        v-if="selectionBox"
        class="screen-view__selection-box"
        :style="selectionBoxStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore } from 'vuex'
import GameGround from './GameGround.vue'
import GameStaticObject from './GameStaticObject.vue'
import GameUnit from './GameUnit.vue'
import UnitOrders from './UnitOrders.vue'
import BuildingPreview from './BuildingPreview.vue'
import type { BuildingPlacement } from '@/game/building'
import { CAMERA, OBJECT_TYPES, UNIT_TYPES } from '@/game/config'
import { lineStyle, screenToWorld, worldToScreen } from '@/game/coords'
import { unitIdsInsideBox } from '@/game/spatial'
import type { ScreenBox } from '@/game/spatial'
import type { BuildingType, Point, StaticObject, Unit } from '@/game/types'

// Рамка считается рамкой, только если мышь заметно сдвинули, иначе это обычный клик
const MIN_SELECTION_PX = 5
// При зажатой ПКМ точка назначения обновляется не чаще, чем раз в столько миллисекунд
const FOLLOW_INTERVAL_MS = 150

// Перетаскивание камеры средней кнопкой мыши
let dragging = false
let dragLast: Point = { x: 0, y: 0 }

// Окно игры: принимает ввод мыши и передаёт его в стор (выбор, приказы, камера).
// Игровой логики здесь нет: элементы карты, события и камера живут в сторе, а рисуют их дочерние компоненты.
// Объекты и юниты передаются пропсами: уничтоженный объект ещё проигрывает анимацию destroy со своими последними данными
const store = useStore()
// Объекты по слоям: мосты рисуются своим слоем выше судов под настилом (см. screen-view__layer--bridges)
const staticObjects = computed<StaticObject[]>(() =>
    store.getters['world/getObjects'].filter((o: StaticObject) => !OBJECT_TYPES[o.type]?.passable))
const bridges = computed<StaticObject[]>(() =>
    store.getters['world/getObjects'].filter((o: StaticObject) => OBJECT_TYPES[o.type]?.passable))
const units = computed<Unit[]>(() => store.getters['world/getUnits'])
const selectedIds = computed<number[]>(() => store.getters['selection/getSelectedIds'])
const selectedUnits = computed<Unit[]>(() => store.getters['selection/getSelectedUnits'])
const buildingType = computed<string | null>(() => store.getters['construction/getTypeId'])
const buildingConfig = computed<BuildingType | null>(() => store.getters['construction/getType'])
const buildingPlacement = computed<BuildingPlacement | null>(() => store.getters['construction/getPlacement'])
const buildingGroup = computed<number>(() => store.getters['construction/getGroup'])

const paused = computed<boolean>(() => store.getters['game/getPaused'])
const isRunning = computed<boolean>(() => store.getters['game/isRunning'])
const screenView = ref<HTMLElement | null>(null)
// Камера живёт в сторе camera, игровой цикл - в сторе engine
const camera = computed<Point>(() => store.getters['camera/getPosition'])
const mouse = { x: 0, y: 0 }
let mouseInside = false
const resizeObserver = new ResizeObserver(([entry]) => {
  store.dispatch('construction/setViewport', { width: entry.contentRect.width, height: entry.contentRect.height })
})

// Ведение юнитов за курсором при зажатой ПКМ
let following = false
let lastFollowTime = 0

// Выделение рамкой юнитов
let selectStart: Point | null = null
// Рамку начали с зажатым shift: найденные юниты добавляются к уже выбранным
let selectAdditive = false
const selectionBox = ref<ScreenBox | null>(null)

const worldStyle = computed(() => ({
  transform: `translate(${-camera.value.x}px, ${-camera.value.y}px)`,
}))

// Кто кого атакует: линия от атакующего к цели и кольцо на цели (цель - юнит или здание).
// Цели может уже не быть - тогда атакующий скоро выйдет из режима атаки
const attacks = computed(() => {
  const result = []
  for (const unit of units.value) {
    if (!unit.isAttacking || unit.targetId == null) continue
    const target = store.getters['world/getById'](unit.targetId)
    if (!target) continue
    const from = worldToScreen(unit.position)
    const to = worldToScreen(target.position)
    result.push({
      id: unit.id,
      lineStyle: lineStyle(from, to),
      markStyle: {
        left: to.x + 'px',
        top: to.y + 'px',
      },
    })
  }
  return result
})

const selectionBoxStyle = computed(() => {
  const box = selectionBox.value
  if (!box) {
    return {}
  }
  return {
    left: box.left + 'px',
    top: box.top + 'px',
    width: box.width + 'px',
    height: box.height + 'px',
  }
})

const toWorld = (e: MouseEvent): Point => {
  const rect = screenView.value!.getBoundingClientRect()
  return screenToWorld({
    x: e.clientX - rect.left - rect.width / 2 + camera.value.x,
    y: e.clientY - rect.top - rect.height / 2 + camera.value.y,
  })
}

// Курсор у края экрана двигает камеру
const updateEdgeScroll = () => {
  const view = screenView.value
  if (!view || dragging || !mouseInside) {
    store.dispatch('camera/setEdgeScroll', { x: 0, y: 0 })
    return
  }
  const direction = (position: number, size: number) => {
    if (position < CAMERA.edgePx) {
      return -1
    }
    if (position > size - CAMERA.edgePx) {
      return 1
    }
    return 0
  }
  store.dispatch('camera/setEdgeScroll', {
    x: direction(mouse.x, view.clientWidth),
    y: direction(mouse.y, view.clientHeight),
  })
}

const saveMouse = (e: MouseEvent) => {
  const rect = screenView.value!.getBoundingClientRect()
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
  mouseInside = true
  if (buildingType.value) store.dispatch('construction/setCursor', mouse)
  updateEdgeScroll()
  updateSelectionBox()
}

const resetMouse = () => {
  mouseInside = false
  store.dispatch('construction/setCursor', null)
  store.dispatch('camera/setEdgeScroll', { x: 0, y: 0 })
}

// ПКМ: приказ выбранным юнитам - идти к точке строем или атаковать чужого юнита под курсором.
// С зажатым Shift приказ добавляется в конец очереди, без Shift очередь заменяется
const moveSelected = (e: MouseEvent) => {
  store.dispatch('events/orderByClick', {
    actorIds: selectedUnits.value.map((u) => u.id),
    point: toWorld(e),
    append: e.shiftKey,
  })
}

// ПКМ нажата: сразу отдаём приказ и начинаем вести юнитов за курсором
const startFollow = (e: MouseEvent) => {
  if (buildingType.value) {
    following = false
    store.dispatch('construction/cancel')
    return
  }
  moveSelected(e)
  following = true
  lastFollowTime = performance.now()
}

// Курсор двигается с зажатой ПКМ: переносим точку последнего приказа (force - без ограничения частоты)
const follow = (e: MouseEvent, force = false) => {
  if (buildingType.value) {
    following = false
  }
  if (!following) {
    return
  }
  const now = performance.now()
  if (!force && now - lastFollowTime < FOLLOW_INTERVAL_MS) {
    return
  }
  lastFollowTime = now
  store.dispatch('events/retargetMove', {
    actorIds: selectedUnits.value.map((u) => u.id),
    point: toWorld(e),
  })
}

const placeBuilding = (e: MouseEvent) => {
  if (!buildingType.value) {
    return
  }
  e.stopImmediatePropagation()
  e.preventDefault()
  selectStart = null
  selectionBox.value = null
  saveMouse(e)
  store.dispatch('construction/place')
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.code === 'Escape' && buildingType.value) {
    e.preventDefault()
    store.dispatch('construction/cancel')
  }
}

const select = (id: number | null) => {
  store.dispatch('selection/select', id)
}

const selectUnit = (id: number, additive: boolean) => {
  if (additive) {
    store.dispatch('selection/toggleSelect', id)
  }
  else {
    select(id)
  }
}

const getSelectionBox = (start: Point): ScreenBox => ({
  left: Math.min(start.x, mouse.x),
  top: Math.min(start.y, mouse.y),
  width: Math.abs(mouse.x - start.x),
  height: Math.abs(mouse.y - start.y),
})

// Рамка считается рамкой, только если мышь заметно сдвинули, иначе это обычный клик
const isBigEnough = (box: ScreenBox) => box.width > MIN_SELECTION_PX || box.height > MIN_SELECTION_PX

// Левая кнопка на пустом месте: начинаем тянуть рамку (клик по объекту сюда не доходит, там stop)
const startSelect = (e: MouseEvent) => {
  if (!isRunning.value) {
    return
  }
  saveMouse(e)
  selectStart = { x: mouse.x, y: mouse.y }
  selectAdditive = e.shiftKey
}

const updateSelectionBox = () => {
  if (!selectStart) {
    return
  }
  const box = getSelectionBox(selectStart)
  selectionBox.value = isBigEnough(box) ? box : null
}

const finishSelect = () => {
  if (!selectStart || !screenView.value) {
    return
  }
  const box = getSelectionBox(selectStart)
  selectStart = null
  selectionBox.value = null

  if (!isBigEnough(box)) {
    if (!selectAdditive) {
      select(null)
    }
    return
  }
  // кто попал в рамку на экране, решает spatial; здесь только отдаём выбранные id
  const ids = unitIdsInsideBox(units.value, box, camera.value, {
    width: screenView.value.clientWidth,
    height: screenView.value.clientHeight,
  })
  store.dispatch(selectAdditive ? 'selection/addToSelection' : 'selection/selectMany', ids)
}

const startDrag = (e: MouseEvent) => {
  dragging = true
  dragLast = { x: e.clientX, y: e.clientY }
  updateEdgeScroll()
}

const onWindowMouseMove = (e: MouseEvent) => {
  follow(e)
  if (!dragging) {
    return
  }
  store.dispatch('camera/moveBy', { x: dragLast.x - e.clientX, y: dragLast.y - e.clientY })
  dragLast = { x: e.clientX, y: e.clientY }
}

const onWindowMouseUp = (e: MouseEvent) => {
  if (e.button === 0) {
    finishSelect()
  }
  if (e.button === 1) {
    dragging = false
  }
  if (e.button === 2 && following) {
    follow(e, true)
    following = false
  }
}

// Компонент появился на странице - запускаем игровой цикл
onMounted(() => {
  resizeObserver.observe(screenView.value!)
  store.dispatch('engine/start')
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
  window.addEventListener('keydown', onKeyDown)
})

// Если ушли со страницы игры - останавливаем цикл
onUnmounted(() => {
  resizeObserver.disconnect()
  store.dispatch('construction/cancel')
  store.dispatch('engine/stop')
  store.dispatch('camera/setEdgeScroll', { x: 0, y: 0 })
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.screen-view {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: $field-background;
  user-select: none;

  &__world {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 0;
    height: 0;
    will-change: transform;
  }

  // Слои карты: объекты и юниты в глубине, настилы мостов - над судами под мостом
  &__layer {
    position: absolute;

    &--objects {
      z-index: $z-objects;
    }

    &--bridges {
      z-index: $z-bridges;
    }
  }

  // Кто кого атакует: линия от атакующего к цели
  &__attack-line {
    z-index: $z-orders;
    transform-origin: left center;
    pointer-events: none;
    animation: attack-pulse 1s ease-in-out infinite;

    @include line(solid, rgba($danger-color, 0.85));
  }

  // Кольцо атаки на цели
  &__attack-mark {
    z-index: $z-orders;

    @include target-mark(rgba($danger-color, 0.9));
  }

  // Рамка выделения юнитов
  &__selection-box {
    position: absolute;
    border: 1px solid $selected-color;
    background: rgba($selected-color, 0.15);
    pointer-events: none;
  }
}

// Пауза замораживает анимации всех вложенных компонентов
.screen-view--paused :deep(*) {
  animation-play-state: paused !important;
}

// Классы Vue-перехода TransitionGroup name="destroy" - единственное исключение
// из БЭМ-именования: имена генерирует сам Vue
.destroy-leave-active {
  animation: destroy 0.4s ease-in forwards;
  transform-origin: bottom center;
  pointer-events: none;
}

@keyframes destroy {
  30% {
    transform: scale(1.15);
    filter: brightness(2);
  }
  100% {
    transform: scale(0, 0.2);
    opacity: 0;
  }
}

@keyframes attack-pulse {
  0%,
  100% {
    opacity: 0.9;
  }

  50% {
    opacity: 0.4;
  }
}
</style>
