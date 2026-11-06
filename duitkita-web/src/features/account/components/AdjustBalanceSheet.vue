<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { formatRupiah } from '@/shared/utils/currency'
import { adjustBalance } from '../api/account.api'
import { formatSignedRupiah } from '../utils/balance'
import type { Account } from '../types'

const props = defineProps<{ account: Account | null }>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()

const actual = ref(0)
const note = ref('')
const loading = ref(false)

const current = computed(() => props.account?.balance ?? 0)
const delta = computed(() => actual.value - current.value)

watch(open, (isOpen) => {
  if (!isOpen) return
  actual.value = current.value
  note.value = ''
})

async function onSubmit() {
  if (!props.account || delta.value === 0) return
  loading.value = true
  try {
    await adjustBalance(props.account.id, {
      new_balance: actual.value,
      note: note.value.trim() || undefined,
    })
    toast.success('Saldo udah disesuaikan.')
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyesuaiin saldo.'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Sesuaikan saldo">
    <form v-if="account" class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <div class="rounded-2xl bg-black/3 px-4 py-3">
        <p class="text-muted text-[0.75rem] font-semibold">Saldo {{ account.name }} di DuitKita</p>
        <p class="text-ink mt-0.5 text-[1.125rem] font-extrabold tabular-nums">
          {{ formatRupiah(current) }}
        </p>
      </div>

      <CurrencyInput v-model="actual" label="Saldo asli sekarang" />

      <p class="text-[0.8125rem] leading-snug" :class="delta === 0 ? 'text-muted' : 'text-ink'">
        <template v-if="delta === 0">Udah sama, gak ada yang perlu disesuaikan.</template>
        <template v-else>
          Selisih <span class="font-extrabold tabular-nums">{{ formatSignedRupiah(delta) }}</span>
          dicatat sebagai penyesuaian. Saldo awal dan catatan lama gak berubah.
        </template>
      </p>

      <BaseInput
        v-model="note"
        label="Catatan (opsional)"
        placeholder="Misalnya: lupa nyatat parkir"
      />

      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="delta === 0"
        loading-label="Menyimpan..."
      >
        Sesuaikan saldo
      </BaseButton>
    </form>
  </BottomSheet>
</template>
