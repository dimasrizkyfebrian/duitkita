<script setup lang="ts">
import { computed } from 'vue'
import IconRepeat from '@/shared/icons/IconRepeat.vue'
import { formatRupiah } from '@/shared/utils/currency'
import type { Category } from '@/features/category/types'
import type { RecurringExpense } from '../types'

const props = defineProps<{ item: RecurringExpense; category?: Category }>()
defineEmits<{ tap: [] }>()

const WEEKDAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const scheduleLabel = computed(() => {
  if (props.item.schedule_type === 'weekly') {
    return `Setiap ${WEEKDAY_LABELS[props.item.schedule_day]}`
  }
  return `Setiap tanggal ${props.item.schedule_day}`
})

const nextRunLabel = computed(() => {
  if (!props.item.is_active) return 'Dipause'
  return `Berikutnya ${new Date(props.item.next_run_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })}`
})
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-colors active:bg-white/10"
    :class="!item.is_active ? 'opacity-60' : ''"
    @click="$emit('tap')"
  >
    <span
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[1.0625rem]"
      :class="item.is_active ? 'bg-azure/20 text-sky' : 'text-muted bg-white/10'"
      aria-hidden="true"
    >
      <span v-if="category?.icon">{{ category.icon }}</span>
      <IconRepeat v-else class="h-5 w-5" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[0.875rem] font-bold text-white">
        {{ category?.name ?? 'Pengeluaran rutin' }}
      </p>
      <p class="text-sky/60 mt-0.5 truncate text-[0.75rem]">{{ scheduleLabel }}</p>
    </div>
    <div class="shrink-0 text-right">
      <p class="text-[0.8125rem] font-extrabold text-white tabular-nums">
        {{ formatRupiah(item.amount) }}
      </p>
      <p
        class="mt-0.5 text-[0.6875rem] font-bold"
        :class="item.is_active ? 'text-sky/60' : 'text-muted'"
      >
        {{ nextRunLabel }}
      </p>
    </div>
  </button>
</template>
