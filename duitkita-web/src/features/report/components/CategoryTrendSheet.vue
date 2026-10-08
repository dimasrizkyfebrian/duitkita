<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import { formatRupiah, formatRupiahShort } from '@/shared/utils/currency'
import { getCategoryTrend, getRollover } from '../api/report.api'
import { fillTrailingMonths } from '../utils/trend'
import type { TrendPoint } from '../types'

const TREND_MONTHS = 6

const props = defineProps<{
  categoryId: string | null
  categoryName: string
  year: number
  month: number
}>()

const open = defineModel<boolean>('open', { required: true })

const loading = ref(true)
const points = ref<TrendPoint[]>([])
const rollover = ref<number | null>(null)

function monthLabel(p: TrendPoint) {
  return new Date(p.year, p.month - 1).toLocaleDateString('id-ID', { month: 'short' })
}

watch(open, async (isOpen) => {
  if (!isOpen || !props.categoryId) return

  loading.value = true
  rollover.value = null
  try {
    const [trendRes, rolloverRes] = await Promise.all([
      getCategoryTrend(props.categoryId, TREND_MONTHS),
      getRollover(props.categoryId, props.year, props.month),
    ])
    points.value = fillTrailingMonths(trendRes.points, TREND_MONTHS)
    rollover.value = rolloverRes.rollover_amount
  } catch (err) {
    console.warn('[report] failed to load category detail:', err)
    points.value = []
  } finally {
    loading.value = false
  }
})

const maxTotal = () => Math.max(...points.value.map((p) => p.total), 1)

const rolloverHint = () =>
  (rollover.value ?? 0) > 0
    ? 'Ini yang masih bisa kamu pakai sampai akhir bulan.'
    : 'Budgetnya udah abis kepake bulan ini.'
</script>

<template>
  <BottomSheet v-model:open="open" :title="categoryName">
    <div v-if="loading" class="flex flex-col gap-3">
      <div class="h-32 animate-pulse rounded-2xl bg-black/5"></div>
      <div class="h-10 animate-pulse rounded-2xl bg-black/5"></div>
    </div>

    <div v-else class="flex flex-col gap-5 pb-2">
      <div>
        <p class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
          Tren 6 bulan terakhir
        </p>

        <div
          v-if="points.length === 0"
          class="border-hairline mt-3 rounded-2xl border border-dashed px-4 py-6 text-center"
        >
          <p class="text-muted text-[0.8125rem]">Belum ada riwayat buat kategori ini.</p>
        </div>

        <div v-else class="mt-3 flex h-28 items-end gap-2">
          <div
            v-for="p in points"
            :key="`${p.year}-${p.month}`"
            class="flex flex-1 flex-col items-center gap-1.5"
          >
            <span class="text-ink text-[0.625rem] font-bold tabular-nums">
              {{ p.total > 0 ? formatRupiahShort(p.total) : '' }}
            </span>
            <div class="flex h-20 w-full items-end">
              <div
                class="bg-azure w-full rounded-md transition-[height] duration-500"
                :style="{
                  height: `${Math.max((p.total / maxTotal()) * 100, p.total > 0 ? 6 : 2)}%`,
                }"
              ></div>
            </div>
            <span class="text-muted text-[0.6875rem] font-semibold">{{ monthLabel(p) }}</span>
          </div>
        </div>
      </div>

      <div v-if="rollover !== null" class="bg-mist/60 rounded-2xl p-4">
        <p class="text-navy text-[0.8125rem] font-bold">
          Sisa budget bulan ini: {{ formatRupiah(rollover) }}
        </p>
        <p class="text-muted mt-1 text-[0.75rem] leading-relaxed">{{ rolloverHint() }}</p>
      </div>
    </div>
  </BottomSheet>
</template>
