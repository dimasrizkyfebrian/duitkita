<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ shares: number[] }>()

// The caller groups anything past the top 4 into one "Lainnya" slice, so
// there are never more than 5 shares — matched 1:1 here rather than cycled,
// otherwise slice 5 would silently repeat slice 1's color. Mirrors the
// legend dot colors in ReportView — keep both in sync.
const colorClasses = [
  'stroke-azure',
  'stroke-sky',
  'stroke-mist',
  'stroke-white/40',
  'stroke-white/15',
]

const radius = 30
const circumference = 2 * Math.PI * radius

const segments = computed(() => {
  let offsetAccum = 0
  return props.shares.map((share, i) => {
    const length = (Math.max(share, 0) / 100) * circumference
    const segment = {
      colorClass: colorClasses[i % colorClasses.length],
      length,
      offset: offsetAccum,
    }
    offsetAccum += length
    return segment
  })
})
</script>

<template>
  <svg viewBox="0 0 72 72" class="-rotate-90">
    <circle cx="36" cy="36" r="30" fill="none" class="stroke-white/10" stroke-width="11" />
    <circle
      v-for="(segment, i) in segments"
      :key="i"
      cx="36"
      cy="36"
      r="30"
      fill="none"
      stroke-width="11"
      :class="segment.colorClass"
      :stroke-dasharray="`${segment.length} ${circumference - segment.length}`"
      :stroke-dashoffset="-segment.offset"
    />
  </svg>
</template>
