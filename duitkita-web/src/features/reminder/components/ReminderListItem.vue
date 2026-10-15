<script setup lang="ts">
import { computed } from 'vue'
import IconBell from '@/shared/icons/IconBell.vue'
import { formatRupiah } from '@/shared/utils/currency'
import type { Reminder } from '../types'

const props = defineProps<{ reminder: Reminder }>()
defineEmits<{ tap: [] }>()

function daysUntil(dueDateIso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDateIso)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

const dueLabel = computed(() => {
  if (props.reminder.status === 'done') {
    return new Date(props.reminder.due_date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const diff = daysUntil(props.reminder.due_date)
  if (diff < 0) return `Terlambat ${Math.abs(diff)} hari`
  if (diff === 0) return 'Hari ini'
  if (diff === 1) return 'Besok'
  return `${diff} hari lagi`
})

const badgeClass = computed(() => {
  if (props.reminder.status === 'overdue') return 'bg-danger/15 text-danger'
  if (props.reminder.status === 'done') return 'text-muted bg-black/[0.04]'
  return 'bg-azure/15 text-azure'
})

const iconWrapClass = computed(() => {
  if (props.reminder.status === 'overdue') return 'bg-danger/15 text-danger'
  if (props.reminder.status === 'done') return 'text-muted bg-white/10'
  return 'bg-azure/20 text-sky'
})
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-left transition-colors active:bg-white/10"
    :class="reminder.status === 'done' ? 'opacity-60' : ''"
    @click="$emit('tap')"
  >
    <span
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      :class="iconWrapClass"
      aria-hidden="true"
    >
      <IconBell class="h-5 w-5" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[0.875rem] font-bold text-white">{{ reminder.title }}</p>
      <p class="mt-0.5 flex items-center gap-1.5 text-[0.75rem]">
        <span class="rounded-full px-2 py-0.5 text-[0.6875rem] font-bold" :class="badgeClass">
          {{ dueLabel }}
        </span>
      </p>
    </div>
    <p
      v-if="reminder.amount"
      class="shrink-0 text-[0.8125rem] font-extrabold text-white tabular-nums"
    >
      {{ formatRupiah(reminder.amount) }}
    </p>
  </button>
</template>
