<script setup lang="ts">
import BaseButton from '@/shared/components/BaseButton.vue'
import { incomeSourceLabel } from '@/features/income/utils/sources'
import { useBalanceVisibility } from '../composables/useBalanceVisibility'
import { displaySignedBalance } from '../utils/balance'
import { formatYmd } from '../utils/date'
import type { AccountTransaction } from '../types'

defineProps<{
  items: AccountTransaction[]
  hasMore: boolean
  loadingMore: boolean
}>()

defineEmits<{ more: [] }>()

const { hidden } = useBalanceVisibility()

function rowLabel(tx: AccountTransaction) {
  if (tx.kind === 'income') return incomeSourceLabel(tx.label)
  if (tx.kind === 'adjustment') return 'Penyesuaian saldo'
  return tx.label
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <ul class="divide-hairline flex flex-col divide-y">
      <li
        v-for="tx in items"
        :key="`${tx.kind}-${tx.id}`"
        :data-testid="`tx-${tx.id}`"
        class="flex items-center justify-between gap-3 py-2.5"
        :class="tx.before_opening ? 'opacity-50' : ''"
      >
        <div class="min-w-0">
          <p class="text-ink truncate text-[0.8125rem] font-bold">{{ rowLabel(tx) }}</p>
          <p v-if="tx.note" class="text-muted truncate text-[0.75rem]">{{ tx.note }}</p>
          <p class="text-muted text-[0.6875rem]">
            {{ formatYmd(tx.date)
            }}<template v-if="tx.before_opening"> · sebelum saldo awal</template>
          </p>
        </div>
        <p
          data-testid="tx-amount"
          class="shrink-0 text-[0.8125rem] font-extrabold tabular-nums"
          :class="tx.amount > 0 ? 'text-success' : 'text-ink'"
        >
          {{ displaySignedBalance(tx.amount, hidden) }}
        </p>
      </li>
    </ul>
    <BaseButton
      v-if="hasMore"
      variant="ghost"
      :loading="loadingMore"
      loading-label="Memuat..."
      @click="$emit('more')"
    >
      Muat lagi
    </BaseButton>
  </div>
</template>
