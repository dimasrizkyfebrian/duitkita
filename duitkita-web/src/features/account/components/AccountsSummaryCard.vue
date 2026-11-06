<script setup lang="ts">
import { computed, ref } from 'vue'
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

const amountText = computed(() => displayBalance(totalBalance.value, hidden.value))

// The logos sit beside the amount, centred with the chevron. They're wide
// wordmark tiles, so two of them only fit next to a short amount on a card
// that isn't narrow: a revealed total of "Rp 100.000.000" or longer, or a
// narrow phone (the @container rules below), gets one logo instead, and the
// amount is never cut off. "+N" counts the accounts left out.
const LONG_AMOUNT = 14
const roomForTwo = computed(() => amountText.value.length < LONG_AMOUNT)
const first = computed(() => activeAccounts.value[0])
const second = computed(() => (roomForTwo.value ? activeAccounts.value[1] : undefined))
const moreAfterOne = computed(() => activeAccounts.value.length - 1)
const moreAfterTwo = computed(() => activeAccounts.value.length - 2)
</script>

<template>
  <!-- The whole card opens the sheet, but the eye button inside it must not,
       and a button can't sit inside another button. So the opening button is
       stretched over the card and the eye button sits above it. -->
  <div
    class="@container relative mt-3 flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3.5 transition-colors has-[>button:active]:bg-white/10"
  >
    <button
      type="button"
      class="focus-visible:ring-azure/30 absolute inset-0 rounded-3xl focus-visible:ring-4 focus-visible:outline-none"
      aria-label="Buka akun saya"
      @click="sheetOpen = true"
    ></button>

    <div class="pointer-events-none min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">
          Akun saya
        </p>
        <BalanceToggle
          v-if="hasAnyBalance"
          tone="dark"
          class="pointer-events-auto relative -my-2"
        />
      </div>
      <p
        v-if="loading && activeAccounts.length === 0"
        class="mt-1.5 h-5 w-28 animate-pulse rounded bg-white/10"
      ></p>
      <p
        v-else-if="hasAnyBalance"
        class="mt-1 text-[1.0625rem] font-extrabold whitespace-nowrap text-white tabular-nums"
      >
        {{ amountText }}
      </p>
      <p v-else-if="activeAccounts.length > 0" class="mt-1 text-[0.875rem] font-bold text-white">
        {{ activeAccounts.length }} akun
      </p>
      <p v-else class="text-sky/80 mt-1 text-[0.8125rem] leading-snug">
        Catat pengeluaran dari rekening atau e-wallet mana
      </p>
    </div>

    <div v-if="first" class="pointer-events-none flex shrink-0 items-center gap-1">
      <span data-logo><AccountLogo :institution="first.institution" size="sm" /></span>
      <span v-if="second" data-logo class="hidden @min-[19rem]:block">
        <AccountLogo :institution="second.institution" size="sm" />
      </span>
      <!-- Shown when only the first logo is: always without room for two,
           otherwise only on a narrow card. -->
      <span
        v-if="moreAfterOne > 0"
        data-more
        class="text-sky flex h-[1.625rem] min-w-[1.625rem] items-center justify-center rounded-md bg-white/10 px-1.5 text-[0.6875rem] font-bold tabular-nums"
        :class="second ? '@min-[19rem]:hidden' : ''"
      >
        +{{ moreAfterOne }}
      </span>
      <span
        v-if="second && moreAfterTwo > 0"
        data-more
        class="text-sky hidden h-[1.625rem] min-w-[1.625rem] items-center justify-center rounded-md bg-white/10 px-1.5 text-[0.6875rem] font-bold tabular-nums @min-[19rem]:flex"
      >
        +{{ moreAfterTwo }}
      </span>
    </div>
    <span v-else class="text-sky pointer-events-none shrink-0 text-[0.8125rem] font-bold">
      Tambah
    </span>
    <IconChevronRight class="text-sky/50 pointer-events-none h-4 w-4 shrink-0" aria-hidden="true" />
  </div>

  <ManageAccountsSheet v-model:open="sheetOpen" />
</template>
