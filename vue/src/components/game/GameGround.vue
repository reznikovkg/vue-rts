<template>
  <!-- земля карты: ромб с сеткой клеток -->
  <div class="ground" :style="groundStyle" />

  <!-- местность: горизонтальные ряды одинаковых клеток карты (суша не рисуется) -->
  <div
      v-for="run in terrainRuns"
      :key="run.key"
      class="terrain-zone"
      :class="'terrain-zone--' + run.cls"
      :style="runStyle(run)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { MAP } from '@/game/config'
import { CELL_LAKE, CELL_MOUNTAIN, CELL_RIVER_H, CELL_RIVER_V, CELL_SAND, TERRAIN_COLS, TERRAIN_ROWS } from '@/game/terrain'
import type { TerrainMap } from '@/game/terrain'

// Плитка текстуры местности
const TEXTURE_SIZE = 250

const store = useStore()

const groundStyle = {
  left: -MAP.width / 2 + 'px',
  top: -MAP.height / 2 + 'px',
  width: MAP.width + 'px',
  height: MAP.height + 'px',
  backgroundSize: `${MAP.cell}px ${MAP.cell}px, ${MAP.cell}px ${MAP.cell}px, ${TEXTURE_SIZE}px ${TEXTURE_SIZE}px`,
}

// класс рендера по коду клетки: суша не рисуется - под ней видна трава земли
const RUN_CLASS: Record<number, string> = {
  [CELL_SAND]: 'sand',
  [CELL_LAKE]: 'lake',
  [CELL_RIVER_H]: 'river',
  [CELL_RIVER_V]: 'river-v',
  [CELL_MOUNTAIN]: 'mountain',
}

interface TerrainRun {
  key: string
  cls: string
  col: number
  row: number
  cols: number
  rows: number
}

// Прямоугольники одинаковых клеток: сначала ряды строки, затем соседние строки
const terrainRuns = computed<TerrainRun[]>(() => {
  const map: TerrainMap = store.getters['world/getTerrainMap']
  const finished: TerrainRun[] = []
  // открытые прямоугольники, продолжаемые в следующую строку: ключ cls:col:width
  const open = new Map<string, TerrainRun>()
  for (let row = 0; row < TERRAIN_ROWS; row++) {
    let start = -1
    let cls = ''
    const extended = new Set<string>()
    for (let col = 0; col <= TERRAIN_COLS; col++) {
      const nextCls = col < TERRAIN_COLS ? RUN_CLASS[map.cells[row * TERRAIN_COLS + col]] ?? '' : ''
      if (nextCls === cls) continue
      if (start >= 0 && cls) {
        const key = `${cls}:${start}:${col - start}`
        extended.add(key)
        const rect = open.get(key)
        if (rect) {
          rect.rows++
        } else {
          open.set(key, { key: `${key}:${row}`, cls, col: start, row, cols: col - start, rows: 1 })
        }
      }
      start = col
      cls = nextCls
    }
    for (const [key, rect] of open) {
      if (!extended.has(key)) {
        finished.push(rect)
        open.delete(key)
      }
    }
  }
  for (const rect of open.values()) finished.push(rect)
  return finished
})

// Прямоугольник в мировых координатах. Точка поворота - центр карты (мировой ноль)
const runStyle = (run: TerrainRun) => {
  const left = -MAP.width / 2 + run.col * MAP.cell
  const top = -MAP.height / 2 + run.row * MAP.cell
  return {
    left: left + 'px',
    top: top + 'px',
    width: run.cols * MAP.cell + 'px',
    height: run.rows * MAP.cell + 'px',
    transformOrigin: `${-left}px ${-top}px`,
    backgroundPosition: `${-(left + MAP.width / 2) % TEXTURE_SIZE}px ${-(top + MAP.height / 2) % TEXTURE_SIZE}px`,
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/mixins' as *;

.ground {
  position: absolute;
  background-color: $ground-color;
  background-image:
    linear-gradient(to right, $grid-line-color 1px, transparent 1px),
    linear-gradient(to bottom, $grid-line-color 1px, transparent 1px),
    url('../../assets/grass.svg');

  // ромбовидная карта
  @include iso-flat;
}

.terrain-zone {
  position: absolute;
  background-size: 250px 250px;

  // как у .ground: ромбовидная зона в изометрии
  @include iso-flat;

  // озеро: спокойная глубокая вода
  &--lake {
    background-color: $water-color;
    background-image: url('../../assets/lake.svg');
  }

  // река: та же вода, но плитка с полосами течения вдоль оси x
  &--river {
    background-color: $water-color;
    background-image: url('../../assets/river.svg');
  }

  // вертикальная река: та же плитка, течение вдоль оси y
  &--river-v {
    background-color: $water-color;
    background-image: url('../../assets/river-vertical.svg');
  }

  // песок: декоративный берег, проходим как суша
  &--sand {
    background-color: $sand-color;
    background-image: url('../../assets/sand.svg');
  }

  // горы: непроходимая скалистая местность с пиками
  &--mountain {
    background-image: url('../../assets/mountain.svg');
  }
}
</style>
