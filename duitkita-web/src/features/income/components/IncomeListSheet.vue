<script setup lang="ts">
import { ref } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BalanceToggle from '@/features/account/components/BalanceToggle.vue'
import { useAccounts } from '@/features/account/composables/useAccounts'
import { useBalanceVisibility } from '@/features/account/composables/useBalanceVisibility'
import { displayBalance } from '@/features/account/utils/balance'
import { formatRupiah } from '@/shared/utils/currency'
import { useIncomes } from '../composables/useIncomes'
import type { Income } from '../types'
import { incomeSourceLabel } from '../utils/sources'
import EditIncomeSheet from './EditIncomeSheet.vue'

const open = defineModel<boolean>('open', { required: true })
const { items } = useIncomes()
const { accountName } = useAccounts()
const { hidden } = useBalanceVisibility()

const editing = ref<Income | null>(null)
const editOpen = ref(false)

function openEdit(income: Income) {
  editing.value = income
  editOpen.value = true
}

// `income_date` is a plain calendar date. Building it from its parts keeps it
// on the same day in every timezone; `new Date('2026-11-01')` is UTC midnight
// and reads as the previous day west of Greenwich.
function formatShortDate(ymd: string) {
  const [year, month, day] = ymd.slice(0, 10).split('-').map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

function amountText(amount: number) {
  return hidden.value ? displayBalance(amount, true) : `+${formatRupiah(amount)}`
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Pemasukan bulan ini">
    <div class="flex flex-col gap-3 pb-1">
      <div class="flex items-center justify-between">
        <p class="text-muted text-[0.75rem] font-semibold">{{ items.length }} pemasukan</p>
        <BalanceToggle />
      </div>

      <p v-if="items.length === 0" class="text-muted text-[0.875rem] leading-relaxed">
        Belum ada pemasukan bulan ini.
      </p>

      <ul v-else class="flex flex-col gap-2">
        <li v-for="income in items" :key="income.id">
          <button
            type="button"
            data-income-row
            class="border-hairline active:bg-mist/40 flex min-h-11 w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-colors"
            @click="openEdit(income)"
          >
            <span class="min-w-0 flex-1">
              <span class="text-ink block truncate text-[0.875rem] font-bold">
                {{ incomeSourceLabel(income.source) }}
              </span>
              <span v-if="income.note" class="text-ink block truncate text-[0.75rem]">
                {{ income.note }}
              </span>
              <span class="text-muted block truncate text-[0.75rem]">
                {{ formatShortDate(income.income_date)
                }}<template v-if="income.account">
                  · {{ accountName(income.account_id, income.account.name) }}</template
                >
              </span>
            </span>
            <span
              data-income-amount
              class="text-success shrink-0 text-[0.8125rem] font-bold tabular-nums"
            >
              {{ amountText(income.amount) }}
            </span>
          </button>
        </li>
      </ul>
    </div>

    <EditIncomeSheet v-model:open="editOpen" :income="editing" />
  </BottomSheet>
</template>
