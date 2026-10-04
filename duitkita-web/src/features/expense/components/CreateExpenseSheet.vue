<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import type { CategoryOverviewItem } from '@/features/dashboard/types'
import { createExpense } from '../api/expense.api'

const props = defineProps<{
  // Only categories that already have a budget this period — the backend
  // requires an expense to point at an existing monthly_budget_id.
  categories: CategoryOverviewItem[]
}>()

const emit = defineEmits<{ created: [] }>()

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
const loading = ref(false)

const maxDate = todayIso()

watch(open, (isOpen) => {
  if (isOpen) {
    selectedId.value = props.categories[0]?.category_id ?? ''
    amount.value = 0
    note.value = ''
    expenseDate.value = todayIso()
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
    })
    toast.success('Pengeluaran udah dicatat.')
    open.value = false
    emit('created')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyatat pengeluaran.'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Catat pengeluaran">
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
  </BottomSheet>
</template>
