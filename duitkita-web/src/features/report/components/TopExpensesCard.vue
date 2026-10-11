<script setup lang="ts">
import { formatRupiah } from '@/shared/utils/currency'
import type { CoupleTopExpenseItem, TopExpenseItem } from '../types'

const props = defineProps<{
  title: string
  items: (TopExpenseItem | CoupleTopExpenseItem)[]
  loading: boolean
  // Owner rows only exist on the couple variant — kept optional so this one
  // component serves both the personal and combined couple cards.
  showOwner?: boolean
  partnerName?: string | null
}>()

function isCoupleItem(item: TopExpenseItem | CoupleTopExpenseItem): item is CoupleTopExpenseItem {
  return 'owner' in item
}

function ownerLabel(item: TopExpenseItem | CoupleTopExpenseItem) {
  if (!props.showOwner || !isCoupleItem(item)) return null
  return item.owner === 'me' ? 'Kamu' : (props.partnerName ?? 'Pasangan')
}

function displayIcon(item: TopExpenseItem) {
  return item.category_icon || item.category_name.charAt(0)
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <article class="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
    <p class="text-[0.9375rem] font-extrabold text-white">{{ title }}</p>

    <div v-if="loading" class="mt-4 h-28 animate-pulse rounded-2xl bg-white/5"></div>

    <p v-else-if="items.length === 0" class="text-sky/60 mt-3 text-[0.8125rem]">
      Belum ada pengeluaran tercatat periode ini.
    </p>

    <ol v-else class="mt-3 divide-y divide-white/5">
      <li
        v-for="(item, index) in items"
        :key="item.expense_id"
        class="flex items-center gap-3 py-3"
      >
        <span
          class="text-sky/60 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[0.6875rem] font-extrabold tabular-nums"
          aria-hidden="true"
        >
          {{ index + 1 }}
        </span>
        <span
          class="bg-azure/20 text-sky flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9375rem]"
          aria-hidden="true"
        >
          {{ displayIcon(item) }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[0.8125rem] font-bold text-white">
            {{ item.note || item.category_name }}
          </p>
          <p class="text-sky/50 mt-0.5 truncate text-[0.6875rem]">
            <template v-if="item.note">{{ item.category_name }} · </template>
            <template v-if="ownerLabel(item)">{{ ownerLabel(item) }} · </template>
            {{ formatShortDate(item.expense_date) }}
          </p>
        </div>
        <p class="shrink-0 text-[0.8125rem] font-extrabold text-white tabular-nums">
          {{ formatRupiah(item.amount) }}
        </p>
      </li>
    </ol>
  </article>
</template>
