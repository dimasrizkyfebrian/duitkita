<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import IconDownload from '@/shared/icons/IconDownload.vue'
import { useToast } from '@/shared/composables/useToast'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { createExport, getExport, getExportDownloadUrl } from '../api/report.api'

// Scoped to "personal" only — report_export_service currently renders a
// personal report regardless of the requested scope, so a "couple" export
// would silently hand back the wrong PDF. Re-enable once that's fixed
// server-side.
const props = defineProps<{ year: number; month: number; periodLabel: string }>()

const toast = useToast()

type State = 'idle' | 'processing' | 'ready' | 'failed'
const state = ref<State>('idle')
const downloadUrl = ref<string | null>(null)
let pollTimer: ReturnType<typeof setTimeout> | null = null

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

async function poll(exportId: string, attemptsLeft: number) {
  if (attemptsLeft <= 0) {
    state.value = 'failed'
    toast.error('Laporannya kelamaan disiapkan. Coba lagi ya.')
    return
  }

  try {
    const res = await getExport(exportId)
    if (res.status === 'completed') {
      const { url } = await getExportDownloadUrl(exportId)
      downloadUrl.value = url
      state.value = 'ready'
      return
    }
    if (res.status === 'failed') {
      state.value = 'failed'
      toast.error('Gagal menyiapkan laporan PDF.')
      return
    }
  } catch (err) {
    state.value = 'failed'
    toast.error(apiErrorMessage(err, 'Gagal menyiapkan laporan PDF.'))
    return
  }

  pollTimer = setTimeout(() => poll(exportId, attemptsLeft - 1), 2000)
}

async function onCreate() {
  state.value = 'processing'
  downloadUrl.value = null
  try {
    const exportRes = await createExport({
      format: 'pdf',
      year: props.year,
      month: props.month,
      scope: 'personal',
    })
    poll(exportRes.id, 15)
  } catch (err) {
    state.value = 'failed'
    toast.error(apiErrorMessage(err, 'Gagal membuat laporan PDF.'))
  }
}

onUnmounted(stopPolling)
</script>

<template>
  <div class="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
    <div class="flex items-center gap-3">
      <span
        class="bg-white/10 text-sky flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      >
        <IconDownload class="h-4 w-4" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-[0.875rem] font-bold text-white">Laporan PDF</p>
        <p class="text-sky/60 text-[0.75rem]">{{ periodLabel }} · versi kamu sendiri</p>
      </div>
    </div>

    <button
      v-if="state === 'idle' || state === 'failed'"
      type="button"
      class="rounded-control bg-white/10 active:bg-white/15 py-2.5 text-[0.8125rem] font-bold text-white transition-colors"
      @click="onCreate"
    >
      {{ state === 'failed' ? 'Coba lagi' : 'Buat laporan PDF' }}
    </button>

    <p
      v-else-if="state === 'processing'"
      class="text-sky/60 flex items-center gap-2 text-[0.8125rem]"
    >
      <span
        class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      ></span>
      Sedang disiapkan...
    </p>

    <a
      v-else
      :href="downloadUrl ?? '#'"
      target="_blank"
      rel="noopener"
      class="rounded-control bg-navy active:bg-ink-soft block py-2.5 text-center text-[0.8125rem] font-bold text-white transition-colors"
    >
      Unduh sekarang
    </a>
  </div>
</template>
