<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { archiveAccount, listBalanceAdjustments, unarchiveAccount } from '../api/account.api'
import { useAccounts } from '../composables/useAccounts'
import { useBalanceVisibility } from '../composables/useBalanceVisibility'
import { displayBalance, displaySignedBalance } from '../utils/balance'
import AccountLogo from './AccountLogo.vue'
import AccountFormSheet from './AccountFormSheet.vue'
import AdjustBalanceSheet from './AdjustBalanceSheet.vue'
import BalanceToggle from './BalanceToggle.vue'
import type { BalanceAdjustment } from '../types'

const props = defineProps<{ accountId: string | null }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()
const { accounts, reload } = useAccounts()
const { hidden } = useBalanceVisibility()

// Looked up from the shared list rather than passed in, so it shows the
// fresh balance as soon as an adjustment or rename reloads that list.
const account = computed(() => accounts.value.find((a) => a.id === props.accountId) ?? null)

const adjustments = ref<BalanceAdjustment[]>([])
const adjustmentsLoading = ref(false)
const confirmingArchive = ref(false)
const archiving = ref(false)
const formOpen = ref(false)
const adjustOpen = ref(false)

async function loadAdjustments() {
  if (!account.value || account.value.opening_balance === null) {
    adjustments.value = []
    return
  }
  adjustmentsLoading.value = true
  try {
    adjustments.value = await listBalanceAdjustments(account.value.id)
  } catch (err) {
    console.warn('[accounts] failed to load balance adjustments:', err)
    adjustments.value = []
  } finally {
    adjustmentsLoading.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  confirmingArchive.value = false
  loadAdjustments()
})

async function afterChange() {
  await reload()
  loadAdjustments()
}

async function onToggleArchive() {
  if (!account.value) return
  if (!account.value.archived && !confirmingArchive.value) {
    confirmingArchive.value = true
    return
  }
  archiving.value = true
  try {
    if (account.value.archived) {
      await unarchiveAccount(account.value.id)
      toast.success(`${account.value.name} aktif lagi.`)
    } else {
      await archiveAccount(account.value.id)
      toast.success(`${account.value.name} udah diarsipkan.`)
      open.value = false
    }
    confirmingArchive.value = false
    await reload()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal mengubah status akun.'))
  } finally {
    archiving.value = false
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <BottomSheet v-model:open="open" :title="account?.name ?? 'Akun'">
    <div v-if="account" class="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1">
      <div class="flex items-center gap-3">
        <AccountLogo :institution="account.institution" size="lg" />
        <div class="min-w-0 flex-1">
          <p class="text-ink truncate text-[0.875rem] font-bold">{{ account.institution.name }}</p>
          <p v-if="account.archived" class="text-muted text-[0.75rem] font-semibold">Diarsipkan</p>
        </div>
      </div>

      <div class="rounded-2xl bg-black/3 px-4 py-3.5">
        <template v-if="account.balance !== null">
          <p class="text-muted text-[0.75rem] font-semibold">Saldo di DuitKita</p>
          <div class="mt-0.5 flex items-center gap-2">
            <p class="text-ink text-[1.5rem] font-extrabold tabular-nums">
              {{ displayBalance(account.balance, hidden) }}
            </p>
            <BalanceToggle />
          </div>
          <p class="text-muted mt-1 text-[0.75rem] leading-snug">
            Dari saldo awal {{ displayBalance(account.opening_balance ?? 0, hidden) }} per
            {{ formatDate(account.opening_balance_date ?? '') }}, dikurangi pengeluaran yang kamu
            catat<template v-if="adjustments.length > 0"
              >, ditambah penyesuaian saldo di bawah</template
            >. Patokannya tetap saldo di aplikasi bank atau e-wallet kamu.
          </p>
        </template>
        <template v-else>
          <p class="text-ink text-[0.875rem] font-bold">Saldo belum diisi</p>
          <p class="text-muted mt-0.5 text-[0.75rem] leading-snug">
            Akun ini tetap bisa dipakai buat nyatat pengeluaran. Isi saldo awal kalau mau lihat sisa
            saldonya.
          </p>
        </template>
      </div>

      <div class="flex flex-col gap-2">
        <BaseButton
          v-if="account.balance !== null && !account.archived"
          type="button"
          @click="adjustOpen = true"
        >
          Sesuaikan saldo
        </BaseButton>
        <BaseButton
          v-if="!account.archived"
          type="button"
          :variant="account.balance === null ? 'primary' : 'ghost'"
          @click="formOpen = true"
        >
          {{ account.balance === null ? 'Ubah nama / isi saldo awal' : 'Ubah nama' }}
        </BaseButton>
      </div>

      <div v-if="account.opening_balance !== null" class="flex flex-col gap-2">
        <h3 class="text-ink text-[0.875rem] font-extrabold">Riwayat penyesuaian</h3>
        <div v-if="adjustmentsLoading" class="h-14 animate-pulse rounded-2xl bg-black/5"></div>
        <p v-else-if="adjustments.length === 0" class="text-muted text-[0.8125rem]">
          Belum pernah disesuaikan.
        </p>
        <ul v-else class="divide-hairline flex flex-col divide-y">
          <li
            v-for="adj in adjustments"
            :key="adj.id"
            class="flex items-center justify-between gap-3 py-2.5"
          >
            <div class="min-w-0">
              <p class="text-ink text-[0.8125rem] font-bold">{{ formatDate(adj.created_at) }}</p>
              <p v-if="adj.note" class="text-muted truncate text-[0.75rem]">{{ adj.note }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p
                class="text-[0.8125rem] font-extrabold tabular-nums"
                :class="adj.delta < 0 ? 'text-danger' : 'text-success'"
              >
                {{ displaySignedBalance(adj.delta, hidden) }}
              </p>
              <p class="text-muted text-[0.6875rem] tabular-nums">
                jadi {{ displayBalance(adj.new_balance, hidden) }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <div class="flex flex-col gap-2">
        <BaseButton
          type="button"
          variant="ghost"
          :class="account.archived ? '' : 'text-danger!'"
          :loading="archiving"
          loading-label="Memproses..."
          @click="onToggleArchive"
        >
          <template v-if="account.archived">Aktifkan lagi</template>
          <template v-else>
            {{ confirmingArchive ? 'Yakin? Tap lagi buat arsipkan' : 'Arsipkan akun' }}
          </template>
        </BaseButton>
        <p v-if="confirmingArchive" class="text-muted text-center text-[0.75rem] leading-snug">
          Akun yang diarsipkan gak muncul lagi pas nyatat, tapi catatan lamanya tetap ada.
        </p>
        <button
          v-if="confirmingArchive"
          type="button"
          class="text-muted text-center text-[0.8125rem] font-semibold"
          @click="confirmingArchive = false"
        >
          Batal
        </button>
      </div>
    </div>

    <AccountFormSheet v-model:open="formOpen" :existing="account" @saved="afterChange" />
    <AdjustBalanceSheet v-model:open="adjustOpen" :account="account" @saved="afterChange" />
  </BottomSheet>
</template>
