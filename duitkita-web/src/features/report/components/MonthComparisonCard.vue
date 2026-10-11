<script setup lang="ts">
import IconTrendingUp from '@/shared/icons/IconTrendingUp.vue'
import { formatRupiah, formatRupiahShort } from '@/shared/utils/currency'
import type { CategoryComparisonItem } from '../composables/useMonthComparison'

defineProps<{
  periodLabel: string
  loading: boolean
  totalCurrent: number
  totalPrevious: number
  totalDeltaPct: number | null
  categories: CategoryComparisonItem[]
}>()
</script>

<template>
  <article class="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
    <p class="text-[0.9375rem] font-extrabold text-white">{{ periodLabel }} vs bulan lalu</p>

    <div v-if="loading" class="mt-4 h-28 animate-pulse rounded-2xl bg-white/5"></div>

    <p
      v-else-if="totalCurrent === 0 && totalPrevious === 0"
      class="text-sky/60 mt-3 text-[0.8125rem]"
    >
      Belum ada data buat dibandingin.
    </p>

    <template v-else>
      <div class="mt-4 flex items-end justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">
            Total {{ periodLabel }}
          </p>
          <p class="mt-1.5 text-[1.5rem] leading-none font-extrabold tabular-nums text-white">
            {{ formatRupiah(totalCurrent) }}
          </p>
          <p class="text-sky/50 mt-1.5 text-[0.75rem]">
            Bulan lalu: {{ formatRupiah(totalPrevious) }}
          </p>
        </div>

        <span
          v-if="totalDeltaPct !== null"
          class="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.75rem] font-bold tabular-nums"
          :class="totalDeltaPct > 0 ? 'text-danger' : 'text-success'"
        >
          <IconTrendingUp class="h-3 w-3" :class="totalDeltaPct <= 0 ? '-scale-y-100' : ''" />
          {{ Math.abs(totalDeltaPct) }}%
        </span>
        <span v-else class="text-sky/50 shrink-0 text-[0.75rem]"> Belum ada data bulan lalu </span>
      </div>

      <ul v-if="categories.length > 0" class="mt-4 divide-y divide-white/5 border-t border-white/5">
        <li
          v-for="c in categories"
          :key="c.category_id"
          class="flex items-center justify-between gap-3 py-2.5"
        >
          <div class="min-w-0 flex-1">
            <p class="truncate text-[0.8125rem] font-bold text-white">{{ c.name }}</p>
            <p class="text-sky/50 mt-0.5 text-[0.6875rem]">
              {{ formatRupiahShort(c.current) }} vs {{ formatRupiahShort(c.previous) }} bulan lalu
            </p>
          </div>

          <span v-if="c.deltaPct === null" class="text-sky/50 shrink-0 text-[0.75rem] font-bold">
            Baru
          </span>
          <span
            v-else
            class="inline-flex shrink-0 items-center gap-1 text-[0.75rem] font-bold tabular-nums"
            :class="c.deltaPct > 0 ? 'text-danger' : 'text-success'"
          >
            <IconTrendingUp class="h-3 w-3" :class="c.deltaPct <= 0 ? '-scale-y-100' : ''" />
            {{ Math.abs(c.deltaPct) }}%
          </span>
        </li>
      </ul>
    </template>
  </article>
</template>
