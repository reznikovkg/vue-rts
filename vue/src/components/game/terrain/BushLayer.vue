<template>
  <g>
    <defs>
      <!-- Маска: кустарники только на суше -->
      <mask id="bush-land-mask" maskUnits="userSpaceOnUse">
        <rect
          x="0"
          y="0"
          :width="mapSize"
          :height="mapSize"
          fill="white"
        />

        <path
          v-for="(path, index) in waterPaths"
          :key="`water-mask-${index}`"
          :d="path"
          fill="black"
        />
      </mask>

      <!-- Основные скопления кустарников -->
      <filter id="bush-base" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.009 0.012"
          numOctaves="3"
          seed="42"
          result="noise"
        />

        <feColorMatrix
          in="noise"
          type="matrix"
          values="
            0 0 0 0 0.08
            0 0 0 0 0.19
            0 0 0 0 0.07
            1.8 1.8 1.8 0 -2.45
          "
        />

        <feGaussianBlur stdDeviation="2" />
      </filter>

      <!-- Более тёмные заросли внутри скоплений -->
      <filter id="bush-dark" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.016 0.014"
          numOctaves="2"
          seed="76"
          result="noise"
        />

        <feColorMatrix
          in="noise"
          type="matrix"
          values="
            0 0 0 0 0.04
            0 0 0 0 0.11
            0 0 0 0 0.035
            2 2 2 0 -2.8
          "
        />

        <feGaussianBlur stdDeviation="1.5" />
      </filter>
    </defs>

    <g mask="url(#bush-land-mask)">
      <!-- Основная масса кустарников -->
      <rect
        x="0"
        y="0"
        :width="mapSize"
        :height="mapSize"
        fill="#294b27"
        filter="url(#bush-base)"
        opacity="0.85"
      />

      <!-- Тёмные участки зарослей -->
      <rect
        x="0"
        y="0"
        :width="mapSize"
        :height="mapSize"
        fill="#172f1b"
        filter="url(#bush-dark)"
        opacity="0.75"
      />
    </g>
  </g>
</template>

<script setup>
defineProps({
  mapSize: {
    type: Number,
    required: true
  },
  waterPaths: {
    type: Array,
    required: true
  }
});
</script>
