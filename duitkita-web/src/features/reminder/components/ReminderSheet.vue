<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import {
  createReminder,
  deleteReminder,
  markReminderDone,
  snoozeReminder,
  updateReminder,
} from '../api/reminder.api'
import type { Reminder } from '../types'

const props = defineProps<{
  // When set, the sheet edits that existing reminder instead of creating a
  // new one — same form, different endpoints underneath.
  existing?: Reminder | null
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()
const dueDateId = useId()
const snoozeDateId = useId()

const isEdit = computed(() => Boolean(props.existing))
const remindOptions = [0, 1, 3, 7] as const

function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const title = ref('')
const amount = ref(0)
const dueDate = ref(todayIso())
const remindBeforeDays = ref<number>(1)
const loading = ref(false)

const confirmingDelete = ref(false)
const deleting = ref(false)
const markingDone = ref(false)

const snoozing = ref(false)
const snoozeDate = ref(todayIso())
const snoozeSaving = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  confirmingDelete.value = false
  snoozing.value = false

  if (props.existing) {
    title.value = props.existing.title
    amount.value = props.existing.amount ?? 0
    dueDate.value = props.existing.due_date.slice(0, 10)
    remindBeforeDays.value = props.existing.remind_before_days
  } else {
    title.value = ''
    amount.value = 0
    dueDate.value = todayIso()
    remindBeforeDays.value = 1
  }
})

async function onSubmit() {
  if (!title.value.trim() || !dueDate.value) return

  loading.value = true
  try {
    if (isEdit.value && props.existing) {
      await updateReminder(props.existing.id, {
        title: title.value.trim(),
        amount: amount.value > 0 ? amount.value : undefined,
        due_date: dueDate.value,
        remind_before_days: remindBeforeDays.value,
      })
      toast.success('Pengingat udah diubah.')
    } else {
      await createReminder({
        title: title.value.trim(),
        amount: amount.value > 0 ? amount.value : undefined,
        due_date: dueDate.value,
        remind_before_days: remindBeforeDays.value,
      })
      toast.success('Pengingat udah dibuat.')
    }
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyimpen pengingat.'))
  } finally {
    loading.value = false
  }
}

function onSnoozeStart() {
  snoozing.value = true
  snoozeDate.value = dueDate.value
}

async function onMarkDone() {
  if (!props.existing) return
  markingDone.value = true
  try {
    await markReminderDone(props.existing.id)
    toast.success(`${props.existing.title} udah ditandai lunas.`)
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal menandai lunas.'))
  } finally {
    markingDone.value = false
  }
}

async function onSnoozeConfirm() {
  if (!props.existing || !snoozeDate.value) return
  snoozeSaving.value = true
  try {
    await snoozeReminder(props.existing.id, { snoozed_until: snoozeDate.value })
    toast.success('Pengingat diundur.')
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal mengundur pengingat.'))
  } finally {
    snoozeSaving.value = false
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
    await deleteReminder(props.existing.id)
    toast.success(`${props.existing.title} udah dihapus.`)
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal menghapus pengingat.'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" :title="isEdit ? 'Ubah pengingat' : 'Pengingat baru'">
    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <BaseInput v-model="title" label="Judul" placeholder="Misalnya: Bayar listrik" required />

      <CurrencyInput v-model="amount" label="Nominal (opsional)" />

      <div class="flex flex-col gap-2">
        <label
          :for="dueDateId"
          class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
        >
          Jatuh tempo
        </label>
        <input
          :id="dueDateId"
          v-model="dueDate"
          type="date"
          required
          class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
          Ingetin berapa hari sebelumnya
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in remindOptions"
            :key="option"
            type="button"
            class="rounded-control border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors"
            :class="
              remindBeforeDays === option
                ? 'border-navy bg-navy text-white'
                : 'border-hairline text-ink bg-white'
            "
            @click="remindBeforeDays = option"
          >
            {{ option === 0 ? 'Pas harinya' : `${option} hari` }}
          </button>
        </div>
      </div>

      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="!title.trim() || !dueDate"
        loading-label="Menyimpan..."
      >
        {{ isEdit ? 'Simpan perubahan' : 'Buat pengingat' }}
      </BaseButton>

      <div v-if="isEdit && existing" class="flex flex-col gap-2">
        <BaseButton
          v-if="existing.status !== 'done'"
          type="button"
          variant="ghost"
          :loading="markingDone"
          loading-label="Menandai..."
          @click="onMarkDone"
        >
          Tandai lunas
        </BaseButton>

        <template v-if="existing.status !== 'done'">
          <BaseButton v-if="!snoozing" type="button" variant="ghost" @click="onSnoozeStart">
            Ingetin lagi nanti
          </BaseButton>
          <div v-else class="flex flex-col gap-3 rounded-2xl bg-black/[0.03] p-3.5">
            <div class="flex flex-col gap-2">
              <label
                :for="snoozeDateId"
                class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
              >
                Ingetin lagi tanggal
              </label>
              <input
                :id="snoozeDateId"
                v-model="snoozeDate"
                type="date"
                class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
              />
            </div>
            <div class="flex gap-2">
              <BaseButton
                type="button"
                :loading="snoozeSaving"
                loading-label="Menyimpan..."
                @click="onSnoozeConfirm"
              >
                Simpan
              </BaseButton>
              <button
                type="button"
                class="text-muted px-3 text-[0.8125rem] font-semibold"
                @click="snoozing = false"
              >
                Batal
              </button>
            </div>
          </div>
        </template>

        <BaseButton
          type="button"
          variant="ghost"
          class="text-danger!"
          :loading="deleting"
          loading-label="Menghapus..."
          @click="onDelete"
        >
          {{ confirmingDelete ? 'Yakin? Tap lagi buat hapus' : 'Hapus pengingat' }}
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
