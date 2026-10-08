<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import type { CategoryOverviewItem } from '@/features/dashboard/types'
import { deleteExpense, updateExpense } from '../api/expense.api'
import type { Expense } from '../types'

const props = defineProps<{
  expense: Expense | null
  // Same restriction as creating: only categories that already have a
  // budget this period, since moving an expense to a category without one
  // is rejected server-side.
  categories: CategoryOverviewItem[]
}>()

const emit = defineEmits<{ saved: []; deleted: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()
const dateId = useId()

function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const selectedId = ref('')
const amount = ref(0)
const note = ref('')
const expenseDate = ref(todayIso())
const saving = ref(false)
const confirmingDelete = ref(false)
const deleting = ref(false)

const maxDate = todayIso()

watch(open, (isOpen) => {
  if (!isOpen || !props.expense) return
  selectedId.value = props.expense.category_id
  amount.value = props.expense.amount
  note.value = props.expense.note ?? ''
  expenseDate.value = props.expense.expense_date.slice(0, 10)
  confirmingDelete.value = false
})

async function onSubmit() {
  if (!props.expense || !selectedId.value || amount.value <= 0) return

  saving.value = true
  try {
    // Sent whole rather than diffed: the server treats an unchanged
    // category/date as a no-op, and an emptied note field is a real
    // instruction to clear it, which a diff would silently drop.
    await updateExpense(props.expense.id, {
      category_id: selectedId.value,
      amount: amount.value,
      note: note.value,
      expense_date: expenseDate.value,
    })
    toast.success('Pengeluaran udah diperbarui.')
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal memperbarui pengeluaran.'))
  } finally {
    saving.value = false
  }
}

async function onDelete() {
  if (!props.expense) return
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }

  deleting.value = true
  try {
    await deleteExpense(props.expense.id)
    toast.success('Pengeluaran udah dihapus.')
    open.value = false
    emit('deleted')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal menghapus pengeluaran.'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Ubah pengeluaran">
    <form v-if="categories.length > 0" class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <div class="flex flex-col gap-2">
        <span class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
          Kategori
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="category.category_id"
            type="button"
            class="rounded-control flex items-center gap-1.5 border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors"
            :class="
              selectedId === category.category_id
                ? 'border-navy bg-navy text-white'
                : 'border-hairline text-ink bg-white'
            "
            @click="selectedId = category.category_id"
          >
            <span v-if="category.icon">{{ category.icon }}</span>
            {{ category.name }}
          </button>
        </div>
      </div>

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

      <BaseInput v-model="note" label="Catatan" placeholder="Misalnya: makan siang berdua" />

      <BaseButton
        type="submit"
        :loading="saving"
        :disabled="!selectedId || amount <= 0"
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
          {{ confirmingDelete ? 'Yakin? Tap lagi buat hapus' : 'Hapus pengeluaran' }}
        </BaseButton>
        <button
          v-if="confirmingDelete"
          type="button"
          class="text-muted py-1 text-center text-[0.8125rem] font-semibold"
          @click="confirmingDelete = false"
        >
          Batal
        </button>
      </div>
    </form>

    <p v-else class="text-muted text-[0.875rem] leading-relaxed">
      Belum ada kategori yang punya budget bulan ini.
    </p>
  </BottomSheet>
</template>
