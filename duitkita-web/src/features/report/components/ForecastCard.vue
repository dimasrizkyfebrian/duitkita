<script setup lang="ts">
import { computed } from 'vue'
import IconTrendingUp from '@/shared/icons/IconTrendingUp.vue'
import { formatRupiahShort } from '@/shared/utils/currency'
import type { Forecast } from '../types'

const props = defineProps<{ forecast: Forecast | null; loading: boolean }>()

const current = computed(() => props.forecast?.current_month ?? null)
const overBudget = computed(
  () =>
    !!current.value &&
    current.value.budget > 0 &&
    current.value.projected_total > current.value.budget,
)

const noData = computed(
  () =>
    !props.forecast || (props.forecast.confidence === 0 && props.forecast.projected_total === 0),
)
const nextLabel = computed(() => {
  const f = props.forecast
  if (!f) return ''
  if (f.projected_low === f.projected_high) return formatRupiahShort(f.projected_total)
  return `${formatRupiahShort(f.projected_low)}–${formatRupiahShort(f.projected_high)}`
})

const confidenceDots = computed(() => {
  const c = props.forecast?.confidence ?? 0
  if (c >= 0.75) return 3
  if (c >= 0.5) return 2
  if (c > 0) return 1
  return 0
})
const confidenceLabel = computed(() => {
  const dots = confidenceDots.value
  if (dots === 0) return 'Belum cukup data'
  if (dots === 1) return 'Keyakinan rendah'
  if (dots === 2) return 'Keyakinan menengah'
  return 'Keyakinan tinggi'
})
</script>

<template>
  <article class="rounded-3xl border border-white/10 bg-white/5 p-4">
    <div class="flex items-center gap-1.5">
      <IconTrendingUp class="text-sky h-3.5 w-3.5" />
      <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">Prediksi</p>
    </div>

    <div v-if="loading" class="mt-3 h-20 animate-pulse rounded-2xl bg-white/5"></div>

    <template v-else>
      <div v-if="current" class="mt-2">
        <p class="text-sky/60 text-[0.6875rem] font-semibold">Akhir bulan ini</p>
        <p
          data-current-total
          class="text-[1.125rem] font-extrabold tabular-nums"
          :class="overBudget ? 'text-danger' : 'text-white'"
        >
          ~{{ formatRupiahShort(current.projected_total) }}
        </p>
        <p v-if="current.budget > 0" class="text-sky/50 text-[0.6875rem] tabular-nums">
          dari budget {{ formatRupiahShort(current.budget) }}
        </p>
      </div>

      <div class="mt-3 border-t border-white/10 pt-3">
        <p class="text-sky/60 text-[0.6875rem] font-semibold">Bulan depan</p>
        <p v-if="!noData" class="text-[0.9375rem] font-extrabold text-white tabular-nums">
          {{ nextLabel }}
        </p>
        <div class="mt-1.5 flex items-center gap-1">
          <span
            v-for="n in 3"
            :key="n"
            class="h-1.5 w-1.5 rounded-full"
            :class="n <= confidenceDots ? 'bg-sky' : 'bg-white/15'"
          ></span>
          <span class="text-sky/60 ml-1 text-[0.6875rem] font-semibold">{{ confidenceLabel }}</span>
        </div>
      </div>
    </template>
  </article>
</template>
