<script setup lang="ts">
import { ref } from 'vue'
import IconChevronRight from '@/shared/icons/IconChevronRight.vue'
import { useAccounts } from '../composables/useAccounts'
import { useBalanceVisibility } from '../composables/useBalanceVisibility'
import { displayBalance } from '../utils/balance'
import AccountLogo from './AccountLogo.vue'
import BalanceToggle from './BalanceToggle.vue'
import ManageAccountsSheet from './ManageAccountsSheet.vue'

// The home-screen entry point to accounts. Kept self-contained (it owns its
// sheet and reads the shared account list itself) so DashboardView only has
// to place it.
const { activeAccounts, totalBalance, hasAnyBalance, loading } = useAccounts()
const { hidden } = useBalanceVisibility()
const sheetOpen = ref(false)

// Logos are wide wordmark tiles, so they sit side by side instead of
// overlapping; two fit beside the label on a phone, the rest is "+N".
const MAX_LOGOS = 2
</script>

<template>
  <!-- The whole card opens the sheet, but the eye button inside it must not,
       and a button can't sit inside another button. So the opening button is
       stretched over the card and the eye button sits above it. -->
  <div
    class="relative mt-3 flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3.5 transition-colors has-[>button:active]:bg-white/10"
  >
    <button
      type="button"
      class="focus-visible:ring-azure/30 absolute inset-0 rounded-3xl focus-visible:ring-4 focus-visible:outline-none"
      aria-label="Buka akun saya"
      @click="sheetOpen = true"
    ></button>

    <div class="pointer-events-none min-w-0 flex-1">
      <!-- Label, eye and logos share the top line so the amount below gets a
           line to itself: a long total never fights the logos for room, and
           nothing shifts when it's revealed. -->
      <div class="flex items-center gap-2">
        <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">
          Akun saya
        </p>
        <BalanceToggle
          v-if="hasAnyBalance"
          tone="dark"
          class="pointer-events-auto relative -my-2"
        />
        <div v-if="activeAccounts.length > 0" class="ml-auto flex shrink-0 items-center gap-1">
          <AccountLogo
            v-for="account in activeAccounts.slice(0, MAX_LOGOS)"
            :key="account.id"
            :institution="account.institution"
            size="sm"
          />
          <span
            v-if="activeAccounts.length > MAX_LOGOS"
            class="text-sky flex h-[1.625rem] min-w-[1.625rem] items-center justify-center rounded-md bg-white/10 px-1.5 text-[0.6875rem] font-bold tabular-nums"
          >
            +{{ activeAccounts.length - MAX_LOGOS }}
          </span>
        </div>
        <span v-else class="text-sky ml-auto shrink-0 text-[0.8125rem] font-bold">Tambah</span>
      </div>
      <p
        v-if="loading && activeAccounts.length === 0"
        class="mt-1.5 h-5 w-28 animate-pulse rounded bg-white/10"
      ></p>
      <p
        v-else-if="hasAnyBalance"
        class="mt-1 truncate text-[1.0625rem] font-extrabold text-white tabular-nums"
      >
        {{ displayBalance(totalBalance, hidden) }}
      </p>
      <p v-else-if="activeAccounts.length > 0" class="mt-1 text-[0.875rem] font-bold text-white">
        {{ activeAccounts.length }} akun
      </p>
      <p v-else class="text-sky/80 mt-1 text-[0.8125rem] leading-snug">
        Catat pengeluaran dari rekening atau e-wallet mana
      </p>
    </div>

    <IconChevronRight class="text-sky/50 pointer-events-none h-4 w-4 shrink-0" aria-hidden="true" />
  </div>

  <ManageAccountsSheet v-model:open="sheetOpen" />
</template>
