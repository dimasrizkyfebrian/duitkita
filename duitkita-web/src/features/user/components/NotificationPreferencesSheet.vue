<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseToggle from '@/shared/components/BaseToggle.vue'
import { useToast } from '@/shared/composables/useToast'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { getNotificationPreferences, updateNotificationPreferences } from '../api/user.api'
import type { NotificationPreferences } from '../types'

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()

const loading = ref(true)
const prefs = ref<NotificationPreferences | null>(null)
// Tracks which single toggle is mid-save so only that row disables, not the
// whole sheet — each toggle saves independently (PATCH with just that key).
const saving = reactive<Record<keyof NotificationPreferences, boolean>>({
  budget_alert: false,
  partner_activity: false,
  weekly_summary: false,
  reminder_alert: false,
  recurring_alert: false,
})

watch(open, (isOpen) => {
  if (isOpen) load()
})

async function load() {
  loading.value = true
  try {
    prefs.value = await getNotificationPreferences()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal muat preferensi notifikasi.'))
  } finally {
    loading.value = false
  }
}

async function onToggle(key: keyof NotificationPreferences, value: boolean) {
  if (!prefs.value) return
  const previous = prefs.value[key]
  prefs.value[key] = value
  saving[key] = true
  try {
    await updateNotificationPreferences({ [key]: value })
  } catch (err) {
    prefs.value[key] = previous
    toast.error(apiErrorMessage(err, 'Gagal nyimpen preferensi.'))
  } finally {
    saving[key] = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Preferensi notifikasi">
    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-black/5"></div>
    </div>

    <div
      v-else-if="prefs"
      class="border-hairline divide-hairline flex flex-col divide-y rounded-2xl border px-4"
    >
      <BaseToggle
        :model-value="prefs.budget_alert"
        label="Alert budget"
        description="Notif kalau pengeluaran mendekati atau lewat limit budget."
        :disabled="saving.budget_alert"
        @update:model-value="onToggle('budget_alert', $event)"
      />
      <BaseToggle
        :model-value="prefs.partner_activity"
        label="Aktivitas pasangan"
        description="Notif kalau pasangan nyatet pengeluaran baru."
        :disabled="saving.partner_activity"
        @update:model-value="onToggle('partner_activity', $event)"
      />
      <BaseToggle
        :model-value="prefs.weekly_summary"
        label="Ringkasan mingguan"
        description="Rekap pengeluaran kamu tiap minggu."
        :disabled="saving.weekly_summary"
        @update:model-value="onToggle('weekly_summary', $event)"
      />
      <BaseToggle
        :model-value="prefs.reminder_alert"
        label="Alert pengingat"
        description="Notif pas pengingat yang kamu atur udah waktunya."
        :disabled="saving.reminder_alert"
        @update:model-value="onToggle('reminder_alert', $event)"
      />
      <BaseToggle
        :model-value="prefs.recurring_alert"
        label="Alert pengeluaran berulang"
        description="Notif pas pengeluaran rutin bulanan tercatat otomatis."
        :disabled="saving.recurring_alert"
        @update:model-value="onToggle('recurring_alert', $event)"
      />
    </div>
  </BottomSheet>
</template>
