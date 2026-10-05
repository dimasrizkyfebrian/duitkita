<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { createBudget, deleteBudget, updateBudget } from '../api/budget.api'

const props = defineProps<{
  categoryId: string
  categoryName: string
  year: number
  month: number
  // When set, the sheet edits that existing budget instead of creating a
  // new one — same form, different endpoint underneath.
  existingBudgetId?: string
  existingAmount?: number
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()

const isEdit = computed(() => Boolean(props.existingBudgetId))
const amount = ref(0)
const loading = ref(false)

const confirmingDelete = ref(false)
const deleting = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    amount.value = props.existingAmount ?? 0
    confirmingDelete.value = false
  }
})

async function onSubmit() {
  if (amount.value <= 0) return
  loading.value = true
  try {
    if (isEdit.value && props.existingBudgetId) {
      await updateBudget(props.existingBudgetId, amount.value)
    } else {
      await createBudget({
        category_id: props.categoryId,
        year: props.year,
        month: props.month,
        base_amount: amount.value,
      })
    }
    toast.success(`Budget ${props.categoryName} udah ${isEdit.value ? 'diubah' : 'diatur'}.`)
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyimpen budget.'))
  } finally {
    loading.value = false
  }
}

async function onDelete() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }
  if (!props.existingBudgetId) return

  deleting.value = true
  try {
    await deleteBudget(props.existingBudgetId)
    toast.success(`Budget ${props.categoryName} udah dihapus.`)
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal menghapus budget.'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" :title="`${isEdit ? 'Ubah' : 'Atur'} budget ${categoryName}`">
    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <CurrencyInput v-model="amount" label="Budget bulan ini" />
      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="amount <= 0"
        loading-label="Menyimpan..."
      >
        Simpan budget
      </BaseButton>

      <div v-if="isEdit" class="flex flex-col gap-2">
        <BaseButton
          type="button"
          variant="ghost"
          class="text-danger!"
          :loading="deleting"
          loading-label="Menghapus..."
          @click="onDelete"
        >
          {{ confirmingDelete ? 'Yakin? Tap lagi buat hapus' : 'Hapus budget' }}
        </BaseButton>
        <button
          v-if="confirmingDelete"
          type="button"
          class="text-muted text-center text-[0.8125rem] font-semibold"
          @click="confirmingDelete = false"
        >
          Batal
        </button>
      </div>
    </form>
  </BottomSheet>
</template>
