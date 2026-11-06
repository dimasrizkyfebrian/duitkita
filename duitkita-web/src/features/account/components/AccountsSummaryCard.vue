<script setup lang="ts">
import { ref } from 'vue'
import { formatRupiah } from '@/shared/utils/currency'
import IconChevronRight from '@/shared/icons/IconChevronRight.vue'
import { useAccounts } from '../composables/useAccounts'
import AccountLogo from './AccountLogo.vue'
import ManageAccountsSheet from './ManageAccountsSheet.vue'

// The home-screen entry point to accounts. Kept self-contained (it owns its
// sheet and reads the shared account list itself) so DashboardView only has
// to place it.
const { activeAccounts, totalBalance, hasAnyBalance, loading } = useAccounts()
const sheetOpen = ref(false)

// Logos are wide wordmark tiles, so they sit side by side instead of
// overlapping; two fit next to the balance on a phone, the rest is "+N".
const MAX_LOGOS = 2
</script>

<template>
  <button
    type="button"
    class="mt-3 flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3.5 text-left transition-colors active:bg-white/10"
    @click="sheetOpen = true"
  >
    <div class="min-w-0 flex-1">
      <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">Akun saya</p>
      <p
        v-if="loading && activeAccounts.length === 0"
        class="mt-1.5 h-5 w-28 animate-pulse rounded bg-white/10"
      ></p>
      <p
        v-else-if="hasAnyBalance"
        class="mt-1 text-[1.0625rem] font-extrabold text-white tabular-nums"
      >
        {{ formatRupiah(totalBalance) }}
      </p>
      <p v-else-if="activeAccounts.length > 0" class="mt-1 text-[0.875rem] font-bold text-white">
        {{ activeAccounts.length }} akun
      </p>
      <p v-else class="text-sky/80 mt-1 text-[0.8125rem] leading-snug">
        Catat pengeluaran dari rekening atau e-wallet mana
      </p>
    </div>

    <div v-if="activeAccounts.length > 0" class="flex shrink-0 items-center gap-1">
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
    <span v-else class="text-sky shrink-0 text-[0.8125rem] font-bold">Tambah</span>
    <IconChevronRight class="text-sky/50 h-4 w-4 shrink-0" aria-hidden="true" />
  </button>

  <ManageAccountsSheet v-model:open="sheetOpen" />
</template>
