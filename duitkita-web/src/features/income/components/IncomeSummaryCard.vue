<script setup lang="ts">
import { ref } from 'vue'
import IconChevronRight from '@/shared/icons/IconChevronRight.vue'
import BalanceToggle from '@/features/account/components/BalanceToggle.vue'
import { useBalanceVisibility } from '@/features/account/composables/useBalanceVisibility'
import { displayBalance } from '@/features/account/utils/balance'
import { useIncomes } from '../composables/useIncomes'
import IncomeListSheet from './IncomeListSheet.vue'

// The home-screen entry point to this month's income. Self-contained like
// AccountsSummaryCard: it owns its sheet and reads the shared list itself, so
// DashboardView only has to place it.
const { total, loading } = useIncomes()
const { hidden } = useBalanceVisibility()
const sheetOpen = ref(false)
</script>

<template>
  <!-- Same trick as AccountsSummaryCard: the opening button is stretched over
       the card and the eye button sits above it, since a button can't sit
       inside another button. -->
  <div
    class="relative mt-3 flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3.5 transition-colors has-[>button:active]:bg-white/10"
  >
    <button
      type="button"
      class="focus-visible:ring-azure/30 absolute inset-0 rounded-3xl focus-visible:ring-4 focus-visible:outline-none"
      aria-label="Buka pemasukan bulan ini"
      @click="sheetOpen = true"
    ></button>

    <div class="pointer-events-none min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">
          Pemasukan bulan ini
        </p>
        <!-- Its own eye: without an account balance to reveal on the accounts
             card, a total hidden by default would have no way to be shown. -->
        <BalanceToggle v-if="total > 0" tone="dark" class="pointer-events-auto relative -my-2" />
      </div>
      <p
        v-if="loading && total === 0"
        class="mt-1.5 h-5 w-28 animate-pulse rounded bg-white/10"
      ></p>
      <p
        v-else-if="total > 0"
        class="mt-1 text-[1.0625rem] font-extrabold whitespace-nowrap text-white tabular-nums"
      >
        {{ displayBalance(total, hidden) }}
      </p>
      <p v-else class="text-sky/80 mt-1 text-[0.8125rem] leading-snug">
        Catat gaji atau pemasukan lain biar kelihatan uang yang masuk
      </p>
    </div>

    <IconChevronRight class="text-sky/50 pointer-events-none h-4 w-4 shrink-0" aria-hidden="true" />
  </div>

  <IncomeListSheet v-model:open="sheetOpen" />
</template>
