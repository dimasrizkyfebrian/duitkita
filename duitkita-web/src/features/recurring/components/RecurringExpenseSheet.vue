<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import type { Category } from '@/features/category/types'
import {
  createRecurringExpense,
  deleteRecurringExpense,
  pauseRecurringExpense,
  resumeRecurringExpense,
  updateRecurringExpense,
} from '../api/recurring.api'
import type { RecurringExpense, RecurringScheduleType } from '../types'

const props = defineProps<{
  existing?: RecurringExpense | null
  categories: Category[]
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()

const isEdit = computed(() => Boolean(props.existing))

const WEEKDAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

// Each chip group is labelled by its own heading rather than wrapped in a
// fieldset — BottomSheet already lays the form out, and a fieldset would
// bring default styling that has to be undone anyway.
const categoryLabelId = useId()
const scheduleTypeLabelId = useId()
const weekdayLabelId = useId()
const monthlyDayId = useId()

const categoryId = ref('')
const amount = ref(0)
const note = ref('')
const scheduleType = ref<RecurringScheduleType>('monthly')
const scheduleDay = ref(1)
const loading = ref(false)

const confirmingDelete = ref(false)
const deleting = ref(false)
const togglingActive = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  confirmingDelete.value = false

  if (props.existing) {
    categoryId.value = props.existing.category_id
    amount.value = props.existing.amount
    note.value = props.existing.note ?? ''
    scheduleType.value = props.existing.schedule_type
    scheduleDay.value = props.existing.schedule_day
  } else {
    categoryId.value = props.categories[0]?.id ?? ''
    amount.value = 0
    note.value = ''
    scheduleType.value = 'monthly'
    scheduleDay.value = 1
  }
})

// Switching schedule type while creating needs a day that's actually valid
// for that type — a leftover weekday index (0-6) read as a day-of-month
// would silently create a "every 1st/2nd" schedule instead of what the
// chip the user is looking at says.
watch(scheduleType, (type) => {
  scheduleDay.value = type === 'weekly' ? new Date().getDay() : 1
})

const selectedCategory = computed(() => props.categories.find((c) => c.id === categoryId.value))

const isValid = computed(() => {
  if (!categoryId.value || amount.value <= 0) return false
  if (scheduleType.value === 'monthly') return scheduleDay.value >= 1 && scheduleDay.value <= 31
  return scheduleDay.value >= 0 && scheduleDay.value <= 6
})

async function onSubmit() {
  if (!isValid.value) return

  loading.value = true
  try {
    if (isEdit.value && props.existing) {
      await updateRecurringExpense(props.existing.id, {
        amount: amount.value,
        // Sent even when empty — that's what clears a note the user wiped.
        note: note.value,
        schedule_day: scheduleDay.value,
      })
      toast.success('Pengeluaran rutin udah diubah.')
    } else {
      await createRecurringExpense({
        category_id: categoryId.value,
        amount: amount.value,
        note: note.value || undefined,
        schedule_type: scheduleType.value,
        schedule_day: scheduleDay.value,
      })
      toast.success('Pengeluaran rutin udah dibuat.')
    }
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyimpen pengeluaran rutin.'))
  } finally {
    loading.value = false
  }
}

async function onToggleActive() {
  if (!props.existing) return
  togglingActive.value = true
  try {
    if (props.existing.is_active) {
      await pauseRecurringExpense(props.existing.id)
      toast.success('Pengeluaran rutin dipause.')
    } else {
      await resumeRecurringExpense(props.existing.id)
      toast.success('Pengeluaran rutin dilanjutin lagi.')
    }
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal mengubah status pengeluaran rutin.'))
  } finally {
    togglingActive.value = false
  }
}

async function onDelete() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }
  if (!props.existing) return

  deleting.value = true
  try {
    await deleteRecurringExpense(props.existing.id)
    toast.success('Pengeluaran rutin udah dihapus.')
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal menghapus pengeluaran rutin.'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="isEdit ? 'Ubah pengeluaran rutin' : 'Pengeluaran rutin baru'"
  >
    <form
      v-if="isEdit || categories.length > 0"
      class="flex flex-col gap-5"
      @submit.prevent="onSubmit"
    >
      <div v-if="!isEdit" class="flex flex-col gap-2">
        <span
          :id="categoryLabelId"
          class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
        >
          Kategori
        </span>
        <div class="flex flex-wrap gap-2" role="group" :aria-labelledby="categoryLabelId">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            :aria-pressed="categoryId === category.id"
            class="rounded-control focus-visible:ring-azure/30 flex items-center gap-1.5 border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none"
            :class="
              categoryId === category.id
                ? 'border-navy bg-navy text-white'
                : 'border-hairline text-ink bg-white'
            "
            @click="categoryId = category.id"
          >
            <span v-if="category.icon">{{ category.icon }}</span>
            {{ category.name }}
          </button>
        </div>
      </div>
      <div v-else class="flex items-center gap-2 rounded-2xl bg-black/3 px-4 py-3">
        <span v-if="selectedCategory?.icon">{{ selectedCategory.icon }}</span>
        <span class="text-ink text-[0.875rem] font-bold">{{ selectedCategory?.name }}</span>
      </div>

      <CurrencyInput v-model="amount" label="Besaran" />

      <div v-if="!isEdit" class="flex flex-col gap-2">
        <span
          :id="scheduleTypeLabelId"
          class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
        >
          Pengulangan
        </span>
        <div class="flex gap-2" role="group" :aria-labelledby="scheduleTypeLabelId">
          <button
            type="button"
            :aria-pressed="scheduleType === 'weekly'"
            class="rounded-control focus-visible:ring-azure/30 flex-1 border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none"
            :class="
              scheduleType === 'weekly'
                ? 'border-navy bg-navy text-white'
                : 'border-hairline text-ink bg-white'
            "
            @click="scheduleType = 'weekly'"
          >
            Mingguan
          </button>
          <button
            type="button"
            :aria-pressed="scheduleType === 'monthly'"
            class="rounded-control focus-visible:ring-azure/30 flex-1 border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none"
            :class="
              scheduleType === 'monthly'
                ? 'border-navy bg-navy text-white'
                : 'border-hairline text-ink bg-white'
            "
            @click="scheduleType = 'monthly'"
          >
            Bulanan
          </button>
        </div>
      </div>

      <div v-if="scheduleType === 'weekly'" class="flex flex-col gap-2">
        <span
          :id="weekdayLabelId"
          class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
        >
          Harinya
        </span>
        <div class="flex flex-wrap gap-2" role="group" :aria-labelledby="weekdayLabelId">
          <button
            v-for="(label, day) in WEEKDAY_LABELS"
            :key="day"
            type="button"
            :aria-pressed="scheduleDay === day"
            class="rounded-control focus-visible:ring-azure/30 border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none"
            :class="
              scheduleDay === day
                ? 'border-navy bg-navy text-white'
                : 'border-hairline text-ink bg-white'
            "
            @click="scheduleDay = day"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <div v-else class="flex flex-col gap-2">
        <label
          :for="monthlyDayId"
          class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
        >
          Tanggalnya
        </label>
        <input
          :id="monthlyDayId"
          v-model.number="scheduleDay"
          type="number"
          inputmode="numeric"
          min="1"
          max="31"
          :aria-describedby="`${monthlyDayId}-hint`"
          class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
        />
        <p :id="`${monthlyDayId}-hint`" class="text-muted text-[0.8125rem]">
          Tanggal 29-31 otomatis nyesuaiin ke akhir bulan kalau bulannya lebih pendek.
        </p>
      </div>

      <BaseInput v-model="note" label="Catatan (opsional)" placeholder="Misalnya: token listrik" />

      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="!isValid"
        loading-label="Menyimpan..."
      >
        {{ isEdit ? 'Simpan perubahan' : 'Buat pengeluaran rutin' }}
      </BaseButton>

      <div v-if="isEdit && existing" class="flex flex-col gap-2">
        <BaseButton
          type="button"
          variant="ghost"
          :loading="togglingActive"
          loading-label="Memproses..."
          @click="onToggleActive"
        >
          {{ existing.is_active ? 'Pause' : 'Lanjutin lagi' }}
        </BaseButton>

        <BaseButton
          type="button"
          variant="ghost"
          class="text-danger!"
          :loading="deleting"
          loading-label="Menghapus..."
          @click="onDelete"
        >
          {{ confirmingDelete ? 'Yakin? Tap lagi buat hapus' : 'Hapus pengeluaran rutin' }}
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

    <p v-else class="text-muted text-[0.875rem] leading-relaxed">
      Belum ada kategori. Bikin kategori dulu sebelum bisa atur pengeluaran rutin.
    </p>
  </BottomSheet>
</template>
