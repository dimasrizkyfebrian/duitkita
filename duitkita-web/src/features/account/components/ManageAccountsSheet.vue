<script setup lang="ts">
import { computed, ref } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import { displayBalance } from '../utils/balance'
import { useBalanceVisibility } from '../composables/useBalanceVisibility'
import { useAccounts } from '../composables/useAccounts'
import AccountLogo from './AccountLogo.vue'
import AccountFormSheet from './AccountFormSheet.vue'
import AccountDetailSheet from './AccountDetailSheet.vue'
import BalanceToggle from './BalanceToggle.vue'
import type { Account } from '../types'

const open = defineModel<boolean>('open', { required: true })
const { activeAccounts, archivedAccounts, totalBalance, hasAnyBalance, loading, reload } =
  useAccounts()
const { hidden } = useBalanceVisibility()

const showArchived = ref(false)
const formOpen = ref(false)
const detailOpen = ref(false)
const detailId = ref<string | null>(null)

const visibleArchived = computed(() => (showArchived.value ? archivedAccounts.value : []))

function openDetail(account: Account) {
  detailId.value = account.id
  detailOpen.value = true
}

async function afterCreate(account: Account) {
  await reload()
  openDetail(account)
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Akun saya">
    <div class="flex flex-col gap-3 pb-1">
      <div v-if="hasAnyBalance" class="rounded-2xl bg-black/3 px-4 py-3">
        <p class="text-muted text-[0.75rem] font-semibold">Total saldo di DuitKita</p>
        <div class="mt-0.5 flex items-center gap-2">
          <p class="text-ink text-[1.25rem] font-extrabold tabular-nums">
            {{ displayBalance(totalBalance, hidden) }}
          </p>
          <BalanceToggle />
        </div>
      </div>

      <button
        type="button"
        class="border-azure/30 text-azure active:bg-mist/40 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed p-3.5 text-[0.875rem] font-bold transition-colors"
        @click="formOpen = true"
      >
        + Tambah rekening atau dompet
      </button>

      <div
        v-if="loading && activeAccounts.length === 0"
        class="h-16 animate-pulse rounded-2xl bg-black/5"
      ></div>

      <p v-else-if="activeAccounts.length === 0" class="text-muted text-[0.875rem] leading-relaxed">
        Belum ada akun. Tambahin rekening bank, e-wallet, atau tunai biar kelihatan pengeluaran kamu
        keluar dari mana.
      </p>

      <ul class="flex flex-col gap-2">
        <li v-for="account in [...activeAccounts, ...visibleArchived]" :key="account.id">
          <button
            type="button"
            class="border-hairline active:bg-mist/40 flex w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-colors"
            :class="account.archived ? 'opacity-60' : ''"
            @click="openDetail(account)"
          >
            <AccountLogo :institution="account.institution" />
            <span class="min-w-0 flex-1">
              <span class="text-ink block truncate text-[0.875rem] font-bold">
                {{ account.name }}
              </span>
              <span class="text-muted block truncate text-[0.75rem]">
                {{ account.institution.name
                }}<template v-if="account.archived"> · Diarsipkan</template>
              </span>
            </span>
            <span
              class="shrink-0 text-[0.8125rem] font-bold tabular-nums"
              :class="account.balance === null ? 'text-muted' : 'text-ink'"
            >
              {{
                account.balance === null
                  ? 'Saldo belum diisi'
                  : displayBalance(account.balance, hidden)
              }}
            </span>
          </button>
        </li>
      </ul>

      <button
        v-if="archivedAccounts.length > 0"
        type="button"
        class="text-muted py-1 text-center text-[0.8125rem] font-semibold"
        @click="showArchived = !showArchived"
      >
        {{
          showArchived
            ? 'Sembunyikan yang diarsipkan'
            : `Tampilkan yang diarsipkan (${archivedAccounts.length})`
        }}
      </button>
    </div>

    <AccountFormSheet v-model:open="formOpen" @saved="afterCreate" />
    <AccountDetailSheet v-model:open="detailOpen" :account-id="detailId" />
  </BottomSheet>
</template>
