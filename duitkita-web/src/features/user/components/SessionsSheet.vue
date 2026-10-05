<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import { useToast } from '@/shared/composables/useToast'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { listSessions, revokeOtherSessions, revokeSession } from '../api/user.api'
import type { Session } from '../types'

const open = defineModel<boolean>('open', { required: true })
const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const sessions = ref<Session[]>([])
const revokingId = ref<string | null>(null)
const confirmingRevokeOthers = ref(false)
const revokingOthers = ref(false)

watch(open, (isOpen) => {
  if (isOpen) load()
})

async function load() {
  loading.value = true
  confirmingRevokeOthers.value = false
  try {
    sessions.value = await listSessions()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal muat daftar sesi.'))
  } finally {
    loading.value = false
  }
}

// The backend's own is_current is always false (the access token carries no
// session identity) — "this device" is determined client-side instead, by
// comparing against the session id the auth store captured at login.
function isCurrent(session: Session) {
  return session.id === auth.sessionId
}

const otherSessionsCount = computed(() => sessions.value.filter((s) => !isCurrent(s)).length)

async function onRevoke(session: Session) {
  revokingId.value = session.id
  try {
    await revokeSession(session.id)
    sessions.value = sessions.value.filter((s) => s.id !== session.id)
    toast.success('Sesi berhasil di-logout.')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal logout sesi itu.'))
  } finally {
    revokingId.value = null
  }
}

async function onRevokeOthers() {
  if (!confirmingRevokeOthers.value) {
    confirmingRevokeOthers.value = true
    return
  }
  if (!auth.sessionId) return

  revokingOthers.value = true
  try {
    await revokeOtherSessions(auth.sessionId)
    sessions.value = sessions.value.filter((s) => isCurrent(s))
    toast.success('Semua perangkat lain udah di-logout.')
    confirmingRevokeOthers.value = false
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal logout perangkat lain.'))
  } finally {
    revokingOthers.value = false
  }
}

function deviceLabel(userAgent?: string): string {
  if (!userAgent) return 'Perangkat tidak dikenal'
  if (/iPhone|iPad/.test(userAgent)) return 'iPhone / iPad'
  if (/Android/.test(userAgent)) return 'Android'
  if (/Macintosh/.test(userAgent)) return 'Mac'
  if (/Windows/.test(userAgent)) return 'Windows'
  return 'Perangkat lain'
}

function formatLastActive(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Sesi aktif">
    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-2xl bg-black/5"></div>
    </div>

    <div v-else class="flex flex-col gap-5">
      <div v-if="otherSessionsCount > 0" class="flex flex-col gap-2">
        <BaseButton
          variant="ghost"
          class="text-danger!"
          :loading="revokingOthers"
          loading-label="Memproses..."
          @click="onRevokeOthers"
        >
          {{
            confirmingRevokeOthers
              ? 'Yakin? Tap lagi buat logout semua'
              : 'Logout dari perangkat lain'
          }}
        </BaseButton>
        <button
          v-if="confirmingRevokeOthers"
          type="button"
          class="text-muted py-1 text-center text-[0.8125rem] font-semibold"
          @click="confirmingRevokeOthers = false"
        >
          Batal
        </button>
      </div>

      <ul class="border-hairline divide-hairline flex flex-col divide-y rounded-2xl border px-4">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="flex items-center justify-between gap-3 py-3.5"
        >
          <div class="min-w-0 flex-1">
            <p class="text-ink flex items-center gap-2 text-[0.875rem] font-bold">
              {{ deviceLabel(session.user_agent) }}
              <span
                v-if="isCurrent(session)"
                class="bg-mist text-navy rounded-full px-2 py-0.5 text-[0.625rem] font-bold"
              >
                Perangkat ini
              </span>
            </p>
            <p class="text-muted mt-0.5 truncate text-[0.75rem]">
              {{ session.ip_address || 'IP tidak diketahui' }} · Aktif
              {{ formatLastActive(session.last_active_at) }}
            </p>
          </div>
          <button
            v-if="!isCurrent(session)"
            type="button"
            class="text-danger shrink-0 text-[0.8125rem] font-bold disabled:opacity-40"
            :disabled="revokingId === session.id"
            @click="onRevoke(session)"
          >
            Keluar
          </button>
        </li>
      </ul>
    </div>
  </BottomSheet>
</template>
