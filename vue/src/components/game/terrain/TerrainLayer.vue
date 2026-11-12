<template>
  <svg
    class="terrain-layer"
    :width="MAP_SIZE"
    :height="MAP_SIZE"
    :viewBox="`0 0 ${MAP_SIZE} ${MAP_SIZE}`"
    overflow="hidden"
  >
    <defs>
      <!-- Размытие песчаного берега -->
      <filter id="shore-blur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="16" />
      </filter>

      <!-- Светлая открытая почва -->
      <filter id="soil-patches" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.004 0.005"
          numOctaves="2"
          seed="12"
          result="noise"
        />

        <feColorMatrix
          in="noise"
          type="matrix"
          values="
            0 0 0 0 0.42
            0 0 0 0 0.34
            0 0 0 0 0.20
            1.1 1.1 1.1 0 -1.55
          "
        />

        <feGaussianBlur stdDeviation="4" />
      </filter>

      <!-- Тёмная открытая почва -->
      <filter id="soil-patches-dark" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.004 0.005"
          numOctaves="2"
          seed="27"
          result="noise"
        />

        <feColorMatrix
          in="noise"
          type="matrix"
          values="
            0 0 0 0 0.12
            0 0 0 0 0.09
            0 0 0 0 0.05
            1.5 1.5 1.5 0 -2.0
          "
        />

        <feGaussianBlur stdDeviation="4" />
      </filter>

      <!-- Градиент глубины воды -->
      <linearGradient id="water-depth" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#245d83" />
        <stop offset="45%" stop-color="#397da5" />
        <stop offset="100%" stop-color="#1d5279" />
      </linearGradient>

      <!-- Неровная текстура воды -->
      <filter id="water-texture" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.012 0.035"
          numOctaves="2"
          seed="18"
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="saturate"
          values="0"
          result="grayNoise"
        />
        <feBlend 
          in="SourceGraphic" 
          in2="grayNoise" 
          mode="soft-light" 
        />
      </filter>

      <!-- Ограничиваем эффекты границами реки -->
      <clipPath id="water-clip">
        <path
          v-for="(area, index) in TERRAIN_AREAS"
          :key="`water-clip-${index}`"
          :d="terrainPath(area.points)"
        />
      </clipPath>
    </defs>

    <!-- Тёмные участки открытой почвы -->
    <rect
      x="0"
      y="0"
      :width="MAP_SIZE"
      :height="MAP_SIZE"
      fill="#302416"
      filter="url(#soil-patches-dark)"
      opacity="0.9"
    />

    <!-- Светлые участки открытой почвы -->
    <rect
      x="0"
      y="0"
      :width="MAP_SIZE"
      :height="MAP_SIZE"
      fill="#6b5733"
      filter="url(#soil-patches)"
      opacity="0.7"
    />
    <!-- Кустарники -->
    <BushLayer
      :map-size="MAP_SIZE"
      :water-paths="waterPaths"
    />

    <!-- Широкий внешний переход в землю -->
    <path
      v-for="(area, index) in TERRAIN_AREAS"
      :key="`sand-outer-${index}`"
      :d="terrainPath(area.points)"
      fill="none"
      stroke="#756b49"
      stroke-width="90"
      stroke-linejoin="round"
      stroke-linecap="round"
      filter="url(#shore-blur)"
      opacity="0.75"
    />

    <!-- Средний слой песка -->
    <path
      v-for="(area, index) in TERRAIN_AREAS"
      :key="`sand-middle-${index}`"
      :d="terrainPath(area.points)"
      fill="none"
      stroke="#a18e65"
      stroke-width="62"
      stroke-linejoin="round"
      stroke-linecap="round"
      filter="url(#shore-blur)"
      opacity="0.85"
    />

    <!-- Светлый песок непосредственно у воды -->
    <path
      v-for="(area, index) in TERRAIN_AREAS"
      :key="`sand-inner-${index}`"
      :d="terrainPath(area.points)"
      fill="none"
      stroke="#bba77c"
      stroke-width="34"
      stroke-linejoin="round"
      stroke-linecap="round"
      filter="url(#shore-blur)"
      opacity="0.9"
    />

    <!-- Вода -->
    <path
      v-for="(area, index) in TERRAIN_AREAS"
      :key="`water-${index}`"
      class="terrain-layer__water"
      :d="terrainPath(area.points)"
      :fill="TERRAIN_COLORS[area.type]"
    />

    <!-- Глубина и неоднородность воды -->
    <g clip-path="url(#water-clip)">
      <rect
        x="0"
        y="0"
        :width="MAP_SIZE"
        :height="MAP_SIZE"
        fill="url(#water-depth)"
        opacity="0.55"
      />

      <!-- Мягкая текстура водной поверхности -->
      <rect
        x="0"
        y="0"
        :width="MAP_SIZE"
        :height="MAP_SIZE"
        fill="#397da5"
        filter="url(#water-texture)"
        opacity="0.22"
      />
    </g>

    <!-- Нижняя часть моста: тень и основание -->
    <g class="terrain-layer__bridge">
      <!-- Переходы к берегам -->
      <path
        d="M 542 550 L 558 550 M 787 548 L 803 548"
        stroke="#77766d"
        stroke-width="40"
        stroke-linecap="butt"
        opacity="0.8"
      />

      <!-- Мягкая тень -->
      <path
        d="M 550 550 L 795 548"
        stroke="#172d36"
        stroke-width="52"
        stroke-linecap="butt"
        opacity="0.35"
      />

      <!-- Каменное основание -->
      <path
        d="M 550 550 L 795 548"
        stroke="#77766d"
        stroke-width="46"
        stroke-linecap="butt"
      />
    </g>
  </svg>
</template>

<script setup>
import { MAP_SIZE, TERRAIN_AREAS, TERRAIN_COLORS } from '@/config/game';
import BushLayer from './BushLayer.vue';

const terrainPath = (points) => {
  const coords = points.map(([x, y]) => ({
    x: x + MAP_SIZE / 2,
    y: y + MAP_SIZE / 2
  }));

  const isEdgePoint = (p) =>
    p.x <= 0 || p.x >= MAP_SIZE ||
    p.y <= 0 || p.y >= MAP_SIZE;

  const midpoint = (a, b) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  });

  const count = coords.length;
  const first = midpoint(coords[count - 1], coords[0]);

  let path = `M ${first.x} ${first.y}`;

  for (let i = 0; i < count; i++) {
    const current = coords[i];
    const next = coords[(i + 1) % count];
    const middle = midpoint(current, next);

    const sameEdge =
      (current.x === next.x && (current.x === 0 || current.x === MAP_SIZE)) ||
      (current.y === next.y && (current.y === 0 || current.y === MAP_SIZE));

    if (sameEdge) {
      path += ` L ${next.x} ${next.y}`;
    } else if (isEdgePoint(current) && isEdgePoint(next)) {
      path += ` L ${next.x} ${next.y}`;
    } else {
      path += ` Q ${current.x} ${current.y} ${middle.x} ${middle.y}`;
    }
  }

  return path + ' Z';
};

const waterPaths = TERRAIN_AREAS.map((area) => terrainPath(area.points));
</script>

<style scoped lang="scss">
.terrain-layer {
  position: absolute;
  left: -720px;
  top: -720px;
  pointer-events: none;
  overflow: hidden;

  &__water {
    stroke: rgba(170, 210, 225, 0.8);
    stroke-width: 5px;
    stroke-linejoin: round;
  }
}
</style>

