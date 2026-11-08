<script setup lang="ts">
import { computed } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import type { HealthScore, ScoreComponentKey } from '../types'
import { componentLabel, tipMessages } from '../utils/scoreTips'

const props = defineProps<{ score: HealthScore | null }>()
const open = defineModel<boolean>('open', { required: true })

const running = computed(() => props.score?.period === 'current')
const tips = computed(() => tipMessages(props.score?.tips))
// An older API sends no components; show the grade alone.
const components = computed(() => props.score?.components ?? [])

function explain(key: ScoreComponentKey) {
  switch (key) {
    case 'budget':
      return running.value
        ? 'Perkiraan total pengeluaran sampai akhir bulan, dibanding total budget.'
        : 'Total pengeluaran bulan itu, dibanding total budget.'
    case 'categories':
      return 'Seberapa banyak budget kategori yang nggak kelewatan.'
    case 'recording':
      return 'Minggu yang ada catatannya. Cukup satu catatan tiap minggu.'
  }
}

function barColor(points: number, max: number) {
  const share = max > 0 ? points / max : 0
  if (share >= 0.85) return 'bg-success'
  if (share >= 0.5) return 'bg-azure'
  return 'bg-danger'
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Skor keuangan">
    <div v-if="score" class="flex flex-col gap-5 pb-1">
      <div class="flex items-end gap-3">
        <p class="text-ink text-[2.25rem] leading-none font-extrabold">
          {{ score.grade === 'n/a' ? '–' : score.grade }}
        </p>
        <p class="text-muted pb-1 text-[0.875rem] font-bold tabular-nums">{{ score.score }}/100</p>
      </div>
      <p v-if="score.provisional" class="text-muted -mt-3 text-[0.8125rem] leading-snug">
        Skor masih sementara karena bulan baru jalan.
      </p>

      <ul v-if="components.length > 0" class="flex flex-col gap-4">
        <li v-for="c in components" :key="c.key">
          <div class="flex items-baseline justify-between gap-3">
            <p class="text-ink text-[0.875rem] font-bold">{{ componentLabel(c.key) }}</p>
            <p class="text-ink shrink-0 text-[0.8125rem] font-extrabold tabular-nums">
              {{ c.points }}/{{ c.max }}
            </p>
          </div>
          <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5">
            <div
              class="h-full rounded-full"
              :class="barColor(c.points, c.max)"
              :style="{ width: `${c.max > 0 ? (c.points / c.max) * 100 : 0}%` }"
            ></div>
          </div>
          <p class="text-muted mt-1.5 text-[0.75rem] leading-snug">{{ explain(c.key) }}</p>
        </li>
      </ul>

      <div v-if="tips.length > 0" class="flex flex-col gap-2">
        <p class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">Catatan</p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="tip in tips"
            :key="tip"
            class="text-ink rounded-2xl bg-black/3 px-4 py-3 text-[0.8125rem] leading-snug"
          >
            {{ tip }}
          </li>
        </ul>
      </div>
    </div>
  </BottomSheet>
</template>
