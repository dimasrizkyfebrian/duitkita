<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import { useToast } from '@/shared/composables/useToast'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { getSecurityAudit } from '../api/user.api'
import type { SecurityAuditEventType, SecurityAuditLog } from '../types'

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()

const loading = ref(true)
const logs = ref<SecurityAuditLog[]>([])

watch(open, (isOpen) => {
  if (isOpen) load()
})

async function load() {
  loading.value = true
  try {
    logs.value = await getSecurityAudit()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal muat log keamanan.'))
  } finally {
    loading.value = false
  }
}

const EVENT_LABELS: Record<SecurityAuditEventType, string> = {
  register_success: 'Akun dibuat',
  login_success: 'Login berhasil',
  login_failure: 'Percobaan login gagal',
  password_changed: 'Password diubah',
  session_revoked: 'Keluar dari satu perangkat',
  sessions_revoked_others: 'Keluar dari perangkat lain',
  invitation_sent: 'Undangan pasangan dikirim',
  invitation_accepted: 'Undangan pasangan diterima',
  invitation_rejected: 'Undangan pasangan ditolak',
  invitation_cancelled: 'Undangan pasangan dibatalkan',
  partner_linked: 'Terhubung dengan pasangan',
  partner_unlinked: 'Putus hubungan dengan pasangan',
}

function eventLabel(type: SecurityAuditEventType) {
  return EVENT_LABELS[type] ?? type
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Log keamanan">
    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 5" :key="n" class="h-12 animate-pulse rounded-2xl bg-black/5"></div>
    </div>

    <p v-else-if="logs.length === 0" class="text-muted text-[0.875rem] leading-relaxed">
      Belum ada aktivitas keamanan yang tercatat.
    </p>

    <ul
      v-else
      class="border-hairline divide-hairline flex max-h-[60vh] flex-col divide-y overflow-y-auto rounded-2xl border px-4"
    >
      <li v-for="log in logs" :key="log.id" class="flex items-center justify-between gap-3 py-3">
        <div class="min-w-0 flex-1">
          <p class="text-ink text-[0.875rem] font-bold">{{ eventLabel(log.event_type) }}</p>
          <p v-if="log.ip_address" class="text-muted mt-0.5 truncate text-[0.75rem]">
            {{ log.ip_address }}
          </p>
        </div>
        <p class="text-muted shrink-0 text-[0.75rem] tabular-nums">
          {{ formatDate(log.created_at) }}
        </p>
      </li>
    </ul>
  </BottomSheet>
</template>
