<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import type { CategoryOverviewItem } from '@/features/dashboard/types'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import AccountPicker from '@/features/account/components/AccountPicker.vue'
import CategoryPicker from '@/features/category/components/CategoryPicker.vue'
import { useAccounts } from '@/features/account/composables/useAccounts'
import {
  getLastUsedAccountId,
  pickDefaultAccountId,
  setLastUsedAccountId,
} from '@/features/account/utils/lastUsedAccount'
import { createExpense } from '../api/expense.api'

const props = defineProps<{
  // Only categories that already have a budget this period — the backend
  // requires an expense to point at an existing monthly_budget_id.
  categories: CategoryOverviewItem[]
}>()

const emit = defineEmits<{ created: [] }>()

const toast = useToast()
const dateId = useId()
const auth = useAuthStore()
const { activeAccounts, reload: reloadAccounts } = useAccounts()

function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function defaultAccountId() {
  const userId = auth.user?.id
  if (!userId) return ''
  return pickDefaultAccountId(getLastUsedAccountId(userId), activeAccounts.value)
}

// The picker speaks `id`; budgets key their categories by `category_id`.
const pickableCategories = computed(() =>
  props.categories.map((c) => ({ id: c.category_id, name: c.name, icon: c.icon })),
)

// The sheet around this form unmounts it on close, so every open starts from
// a fresh setup — no reset watcher needed.
const selectedId = ref(props.categories[0]?.category_id ?? '')
const amount = ref(0)
const note = ref('')
const expenseDate = ref(todayIso())
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
  const category = props.categories.find((c) => c.category_id === selectedId.value)
  if (!category?.budgetId || amount.value <= 0) return

  loading.value = true
  try {
    await createExpense({
      category_id: category.category_id,
      monthly_budget_id: category.budgetId,
      amount: amount.value,
      note: note.value || undefined,
      expense_date: expenseDate.value,
      account_id: accountId.value || undefined,
    })
    if (auth.user && activeAccounts.value.length > 0) {
      setLastUsedAccountId(auth.user.id, accountId.value)
    }
    toast.success('Pengeluaran udah dicatat.')
    emit('created')
    // The account's balance just moved.
    if (accountId.value) reloadAccounts()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyatat pengeluaran.'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form v-if="categories.length > 0" class="flex flex-col gap-5" @submit.prevent="onSubmit">
    <CategoryPicker v-model="selectedId" :categories="pickableCategories" />

    <CurrencyInput v-model="amount" label="Besaran pengeluaran" />

    <div class="flex flex-col gap-2">
      <label
        :for="dateId"
        class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
      >
        Tanggal
      </label>
      <input
        :id="dateId"
        v-model="expenseDate"
        type="date"
        :max="maxDate"
        required
        class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
      />
    </div>

    <AccountPicker
      v-model="accountId"
      :accounts="activeAccounts"
      @update:model-value="accountPicked = true"
    />

    <BaseInput v-model="note" label="Catatan" placeholder="Misalnya: makan siang berdua" />

    <BaseButton
      type="submit"
      :loading="loading"
      :disabled="!selectedId || amount <= 0"
      loading-label="Menyimpan..."
    >
      Catat pengeluaran
    </BaseButton>
  </form>

  <p v-else class="text-muted text-[0.875rem] leading-relaxed">
    Belum ada kategori yang punya budget bulan ini. Atur budget dulu sebelum bisa nyatat
    pengeluaran.
  </p>
</template>
