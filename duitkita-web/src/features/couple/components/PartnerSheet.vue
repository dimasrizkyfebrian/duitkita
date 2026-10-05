<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import * as coupleApi from '../api/couple.api'
import type { Couple, Invitation } from '../types'

const emit = defineEmits<{ changed: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()

const loading = ref(true)
const partner = ref<Couple | null>(null)
const incoming = ref<Invitation[]>([])

const email = ref('')
const sending = ref(false)
const actingOnId = ref<string | null>(null)
const confirmingUnlink = ref(false)
const unlinking = ref(false)

watch(open, (isOpen) => {
  if (isOpen) load()
})

async function load() {
  loading.value = true
  confirmingUnlink.value = false
  try {
    const [partnerRes, incomingRes] = await Promise.allSettled([
      coupleApi.getPartner(),
      coupleApi.listIncomingInvitations(),
    ])
    partner.value = partnerRes.status === 'fulfilled' ? partnerRes.value : null
    incoming.value = incomingRes.status === 'fulfilled' ? incomingRes.value : []
  } finally {
    loading.value = false
  }
}

async function onInvite() {
  sending.value = true
  try {
    await coupleApi.sendInvitation(email.value)
    toast.success(`Undangan udah dikirim ke ${email.value}.`)
    email.value = ''
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal ngirim undangan.'))
  } finally {
    sending.value = false
  }
}

async function onAccept(invitation: Invitation) {
  actingOnId.value = invitation.id
  try {
    await coupleApi.acceptInvitation(invitation.id)
    toast.success(`Yes, kamu udah nyambung sama ${invitation.sender?.name ?? 'pasangan'}!`)
    emit('changed')
    await load()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nerima undangan.'))
  } finally {
    actingOnId.value = null
  }
}

async function onReject(invitation: Invitation) {
  actingOnId.value = invitation.id
  try {
    await coupleApi.rejectInvitation(invitation.id)
    toast.success('Undangan udah ditolak.')
    incoming.value = incoming.value.filter((i) => i.id !== invitation.id)
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nolak undangan.'))
  } finally {
    actingOnId.value = null
  }
}

async function onUnlink() {
  if (!confirmingUnlink.value) {
    confirmingUnlink.value = true
    return
  }
  unlinking.value = true
  try {
    await coupleApi.unlinkPartner()
    toast.success('Hubungan udah diputuskan.')
    partner.value = null
    confirmingUnlink.value = false
    emit('changed')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal mutusin hubungan.'))
  } finally {
    unlinking.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Pasangan">
    <div v-if="loading" class="flex flex-col gap-3">
      <div class="h-16 animate-pulse rounded-2xl bg-black/5"></div>
    </div>

    <div v-else-if="partner" class="flex flex-col gap-5">
      <div class="border-hairline flex items-center gap-3 rounded-2xl border p-4">
        <span
          class="bg-mist text-navy flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-extrabold"
        >
          {{ partner.partner.name.charAt(0) }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-ink truncate text-[0.9375rem] font-bold">{{ partner.partner.name }}</p>
          <p class="text-muted truncate text-[0.75rem]">{{ partner.partner.email }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <BaseButton
          variant="ghost"
          class="text-danger!"
          :loading="unlinking"
          loading-label="Memutuskan..."
          @click="onUnlink"
        >
          {{ confirmingUnlink ? 'Yakin? Tap lagi buat putusin' : 'Putuskan hubungan' }}
        </BaseButton>
        <button
          v-if="confirmingUnlink"
          type="button"
          class="text-muted text-center text-[0.8125rem] font-semibold"
          @click="confirmingUnlink = false"
        >
          Batal
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col gap-6">
      <div v-if="incoming.length > 0" class="flex flex-col gap-3">
        <span class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
          Undangan masuk
        </span>
        <div
          v-for="invitation in incoming"
          :key="invitation.id"
          class="border-hairline flex items-center gap-3 rounded-2xl border p-3.5"
        >
          <span
            class="bg-mist text-navy flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-extrabold"
          >
            {{ (invitation.sender?.name ?? '?').charAt(0) }}
          </span>
          <p class="text-ink min-w-0 flex-1 truncate text-[0.8125rem] font-bold">
            {{ invitation.sender?.name ?? 'Seseorang' }}
          </p>
          <div class="flex shrink-0 gap-2">
            <button
              type="button"
              class="text-azure text-[0.8125rem] font-bold disabled:opacity-40"
              :disabled="actingOnId === invitation.id"
              @click="onAccept(invitation)"
            >
              Terima
            </button>
            <button
              type="button"
              class="text-muted text-[0.8125rem] font-bold disabled:opacity-40"
              :disabled="actingOnId === invitation.id"
              @click="onReject(invitation)"
            >
              Tolak
            </button>
          </div>
        </div>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="onInvite">
        <BaseInput
          v-model="email"
          label="Undang pasangan"
          type="email"
          placeholder="email@pasangan.com"
          hint="Nanti dia perlu nerima undangan ini dulu."
          required
        />
        <BaseButton type="submit" :loading="sending" :disabled="!email" loading-label="Mengirim...">
          Kirim undangan
        </BaseButton>
      </form>
    </div>
  </BottomSheet>
</template>
