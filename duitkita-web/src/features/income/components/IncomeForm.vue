<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AccountPicker from '@/features/account/components/AccountPicker.vue'
import { useAccounts } from '@/features/account/composables/useAccounts'
import { todayIso } from '@/features/account/utils/balance'
import {
  getLastUsedAccountId,
  pickDefaultAccountId,
  setLastUsedAccountId,
} from '@/features/account/utils/lastUsedAccount'
import { createIncome } from '../api/income.api'
import { useIncomes } from '../composables/useIncomes'
import type { IncomeSource } from '../types'
import { INCOME_SOURCES } from '../utils/sources'

const emit = defineEmits<{ created: [] }>()

const toast = useToast()
const dateId = useId()
const sourceLabelId = useId()
const auth = useAuthStore()
const { activeAccounts, reload: reloadAccounts } = useAccounts()
const { reload: reloadIncomes } = useIncomes()

function defaultAccountId() {
  const userId = auth.user?.id
  if (!userId) return ''
  return pickDefaultAccountId(getLastUsedAccountId(userId, 'income'), activeAccounts.value)
}

// The sheet around this form unmounts it on close, so every open starts from
// a fresh setup — no reset watcher needed.
const source = ref<IncomeSource>('salary')
const amount = ref(0)
const note = ref('')
const incomeDate = ref(todayIso())
const accountId = ref(defaultAccountId())
// '' is both "nothing picked yet" and an explicit "Tanpa akun", so track
// whether the user has touched the picker since the form appeared.
const accountPicked = ref(false)
const loading = ref(false)

const maxDate = todayIso()

// Accounts may still be loading when the form first appears — apply the
// remembered default once they arrive, unless the user already picked
// (including picking "Tanpa akun"). A pick that stopped being active (archived
// from another sheet) falls back to "Tanpa akun" so saving doesn't fail.
watch(activeAccounts, (accounts) => {
  if (!accountPicked.value) {
    accountId.value = defaultAccountId()
  } else if (accountId.value && !accounts.some((a) => a.id === accountId.value)) {
    accountId.value = ''
  }
})

async function onSubmit() {
  if (amount.value <= 0) return

  loading.value = true
  try {
    await createIncome({
      source: source.value,
      amount: amount.value,
      income_date: incomeDate.value,
      account_id: accountId.value || undefined,
      note: note.value || undefined,
    })
    if (auth.user && activeAccounts.value.length > 0) {
      setLastUsedAccountId(auth.user.id, accountId.value, 'income')
    }
    toast.success('Pemasukan udah dicatat.')
    reloadIncomes()
    // The account's balance just moved.
    if (accountId.value) reloadAccounts()
    emit('created')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyatat pemasukan.'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
    <CurrencyInput v-model="amount" label="Besaran pemasukan" />

    <div class="flex flex-col gap-2">
      <span
        :id="sourceLabelId"
        class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
      >
        Sumber
      </span>
      <div class="flex flex-wrap gap-2" role="group" :aria-labelledby="sourceLabelId">
        <button
          v-for="option in INCOME_SOURCES"
          :key="option.value"
          type="button"
          :aria-pressed="source === option.value"
          class="rounded-control focus-visible:ring-azure/30 min-h-11 border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none"
          :class="
            source === option.value
              ? 'border-navy bg-navy text-white'
              : 'border-hairline text-ink bg-white'
          "
          @click="source = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <label
        :for="dateId"
        class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
      >
        Tanggal
      </label>
      <input
        :id="dateId"
        v-model="incomeDate"
        type="date"
        :max="maxDate"
        required
        class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
      />
    </div>

    <AccountPicker
      v-model="accountId"
      :accounts="activeAccounts"
      label="Ke akun"
      @update:model-value="accountPicked = true"
    />

    <BaseInput v-model="note" label="Catatan" placeholder="Misalnya: gaji Oktober" />

    <BaseButton
      type="submit"
      :loading="loading"
      :disabled="amount <= 0"
      loading-label="Menyimpan..."
    >
      Catat pemasukan
    </BaseButton>
  </form>
</template>
