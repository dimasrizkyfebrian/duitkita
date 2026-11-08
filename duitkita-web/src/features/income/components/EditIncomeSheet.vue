<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import AccountPicker from '@/features/account/components/AccountPicker.vue'
import { useAccounts } from '@/features/account/composables/useAccounts'
import { todayIso } from '@/features/account/utils/balance'
import { deleteIncome, updateIncome } from '../api/income.api'
import { useIncomes } from '../composables/useIncomes'
import type { Income, IncomeSource } from '../types'
import { INCOME_SOURCES } from '../utils/sources'

const props = defineProps<{ income: Income | null }>()

const emit = defineEmits<{ saved: []; deleted: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()
const dateId = useId()
const sourceLabelId = useId()
const { activeAccounts, reload: reloadAccounts } = useAccounts()
const { reload: reloadIncomes } = useIncomes()

// An income already on an archived account keeps that account selectable
// (and selected), so editing its amount doesn't quietly drop the account —
// it just can't be moved onto a different archived one.
const pickableAccounts = computed(() => {
  const current = props.income?.account
  if (current?.archived && !activeAccounts.value.some((a) => a.id === current.id)) {
    return [...activeAccounts.value, current]
  }
  return activeAccounts.value
})

const source = ref<IncomeSource>('salary')
const amount = ref(0)
const note = ref('')
const incomeDate = ref(todayIso())
const accountId = ref('')
const saving = ref(false)
const confirmingDelete = ref(false)
const deleting = ref(false)

const maxDate = todayIso()

watch(
  open,
  (isOpen) => {
    if (!isOpen || !props.income) return
    source.value = props.income.source
    amount.value = props.income.amount
    note.value = props.income.note ?? ''
    incomeDate.value = props.income.income_date.slice(0, 10)
    accountId.value = props.income.account_id ?? ''
    confirmingDelete.value = false
  },
  { immediate: true },
)

async function onSubmit() {
  if (!props.income || amount.value <= 0) return

  saving.value = true
  try {
    // Sent whole rather than diffed: an emptied note field is a real
    // instruction to clear it, which a diff would silently drop.
    await updateIncome(props.income.id, {
      source: source.value,
      amount: amount.value,
      income_date: incomeDate.value,
      // '' takes it off its account, same as an emptied note.
      account_id: accountId.value,
      note: note.value,
    })
    toast.success('Pemasukan udah diperbarui.')
    reloadIncomes()
    // The account's balance just moved.
    reloadAccounts()
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal memperbarui pemasukan.'))
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!props.income) return
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }

  deleting.value = true
  try {
    await deleteIncome(props.income.id)
    toast.success('Pemasukan udah dihapus.')
    reloadIncomes()
    reloadAccounts()
    open.value = false
    emit('deleted')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal menghapus pemasukan.'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Ubah pemasukan">
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

      <AccountPicker v-model="accountId" :accounts="pickableAccounts" label="Ke akun" />

      <BaseInput v-model="note" label="Catatan" placeholder="Misalnya: gaji Oktober" />

      <BaseButton
        type="submit"
        :loading="saving"
        :disabled="amount <= 0"
        loading-label="Menyimpan..."
      >
        Simpan perubahan
      </BaseButton>

      <div class="flex flex-col gap-2">
        <BaseButton
          type="button"
          variant="ghost"
          class="text-danger!"
          :loading="deleting"
          loading-label="Menghapus..."
          @click="onDelete"
        >
          {{ confirmingDelete ? 'Yakin? Tap lagi buat hapus' : 'Hapus pemasukan' }}
        </BaseButton>
        <button
          v-if="confirmingDelete"
          type="button"
          class="text-muted min-h-11 py-1 text-center text-[0.8125rem] font-semibold"
          @click="confirmingDelete = false"
        >
          Batal
        </button>
      </div>
    </form>
  </BottomSheet>
</template>
