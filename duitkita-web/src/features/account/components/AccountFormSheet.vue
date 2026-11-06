<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import BaseToggle from '@/shared/components/BaseToggle.vue'
import CurrencyInput from '@/shared/components/CurrencyInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { createAccount, listInstitutions, updateAccount } from '../api/account.api'
import { todayIso } from '../utils/balance'
import AccountLogo from './AccountLogo.vue'
import type { Account, Institution, InstitutionType } from '../types'

const props = defineProps<{
  // When set, the sheet renames that account (and can give it an opening
  // balance if it has none yet) instead of creating a new one.
  existing?: Account | null
}>()

const emit = defineEmits<{ saved: [account: Account] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()
const institutionLabelId = useId()
const dateId = useId()

const isEdit = computed(() => Boolean(props.existing))
// Once an account has an opening balance, the number only moves through
// "Sesuaikan saldo" — the form stops offering it.
const canSetOpeningBalance = computed(
  () => !props.existing || props.existing.opening_balance === null,
)

const institutions = ref<Institution[]>([])
const institutionId = ref('')
const search = ref('')
const name = ref('')
const withBalance = ref(false)
const openingBalance = ref(0)
const openingDate = ref(todayIso())
const loading = ref(false)

const maxDate = todayIso()

// The name follows the picked institution until the user types their own —
// "ShopeePay" is a fine default, but "ShopeePay Kerja" must survive picking
// a different institution afterwards.
let autoName = ''

watch(open, async (isOpen) => {
  if (!isOpen) return
  search.value = ''
  withBalance.value = false
  openingBalance.value = 0
  openingDate.value = todayIso()
  if (props.existing) {
    institutionId.value = props.existing.institution.id
    name.value = props.existing.name
    autoName = ''
    return
  }
  institutionId.value = ''
  name.value = ''
  autoName = ''
  if (institutions.value.length === 0) {
    try {
      institutions.value = await listInstitutions()
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Gagal muat daftar bank dan e-wallet.'))
    }
  }
})

function pickInstitution(institution: Institution) {
  institutionId.value = institution.id
  if (name.value === '' || name.value === autoName) {
    name.value = institution.name
    autoName = institution.name
  }
}

const GROUPS: { type: InstitutionType; label: string }[] = [
  { type: 'cash', label: 'Tunai' },
  { type: 'bank', label: 'Bank' },
  { type: 'ewallet', label: 'E-wallet' },
]

const groups = computed(() => {
  const q = search.value.trim().toLowerCase()
  const matching = q
    ? institutions.value.filter((i) => i.name.toLowerCase().includes(q))
    : institutions.value
  return GROUPS.map((g) => ({ ...g, items: matching.filter((i) => i.type === g.type) })).filter(
    (g) => g.items.length > 0,
  )
})

const isValid = computed(() => Boolean(institutionId.value) && name.value.trim() !== '')

async function onSubmit() {
  if (!isValid.value) return

  const balance =
    withBalance.value && canSetOpeningBalance.value
      ? { opening_balance: openingBalance.value, opening_balance_date: openingDate.value }
      : {}

  loading.value = true
  try {
    let saved: Account
    if (props.existing) {
      saved = await updateAccount(props.existing.id, { name: name.value.trim(), ...balance })
      toast.success('Akun udah diperbarui.')
    } else {
      saved = await createAccount({
        institution_id: institutionId.value,
        name: name.value.trim(),
        ...balance,
      })
      toast.success(`${saved.name} udah ditambahin.`)
    }
    open.value = false
    emit('saved', saved)
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal nyimpen akun.'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" :title="isEdit ? 'Ubah akun' : 'Tambah akun'">
    <form class="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-1" @submit.prevent="onSubmit">
      <div v-if="!isEdit" class="flex flex-col gap-2">
        <span
          :id="institutionLabelId"
          class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
        >
          Bank atau e-wallet
        </span>
        <input
          v-model="search"
          type="search"
          placeholder="Cari, misalnya BCA atau GoPay"
          aria-label="Cari bank atau e-wallet"
          class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3 text-[0.875rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
        />
        <div role="group" :aria-labelledby="institutionLabelId" class="flex flex-col gap-3">
          <div v-for="group in groups" :key="group.type" class="flex flex-col gap-1.5">
            <span class="text-muted text-[0.6875rem] font-bold">{{ group.label }}</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="institution in group.items"
                :key="institution.id"
                type="button"
                :aria-pressed="institutionId === institution.id"
                class="rounded-control focus-visible:ring-azure/30 flex items-center gap-1.5 border px-3 py-2 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none"
                :class="
                  institutionId === institution.id
                    ? 'border-navy bg-navy text-white'
                    : 'border-hairline text-ink bg-white'
                "
                @click="pickInstitution(institution)"
              >
                <AccountLogo :institution="institution" size="sm" />
                {{ institution.name }}
              </button>
            </div>
          </div>
          <p
            v-if="institutions.length > 0 && groups.length === 0"
            class="text-muted text-[0.8125rem]"
          >
            Gak ketemu. Coba kata kunci lain ya.
          </p>
        </div>
      </div>
      <div v-else-if="existing" class="flex items-center gap-3 rounded-2xl bg-black/3 px-4 py-3">
        <AccountLogo :institution="existing.institution" size="lg" />
        <span class="text-ink text-[0.875rem] font-bold">{{ existing.institution.name }}</span>
      </div>

      <BaseInput
        v-model="name"
        label="Nama akun"
        placeholder="Misalnya: ShopeePay Pribadi"
        hint="Biar gampang dibedain kalau punya lebih dari satu akun di tempat yang sama."
      />

      <template v-if="canSetOpeningBalance">
        <BaseToggle
          v-model="withBalance"
          label="Isi saldo awal (opsional)"
          description="Tanpa saldo, akun tetap bisa dipakai buat nyatat. Saldo cuma kepakai buat laporan."
        />
        <template v-if="withBalance">
          <CurrencyInput v-model="openingBalance" label="Saldo awal" />
          <div class="flex flex-col gap-2">
            <label
              :for="dateId"
              class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase"
            >
              Saldo per tanggal
            </label>
            <input
              :id="dateId"
              v-model="openingDate"
              type="date"
              :max="maxDate"
              required
              :aria-describedby="`${dateId}-hint`"
              class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
            />
            <p :id="`${dateId}-hint`" class="text-muted text-[0.8125rem] leading-snug">
              Pengeluaran sebelum tanggal ini gak ngurangin saldo, karena saldo awalnya udah ngitung
              itu.
            </p>
          </div>
        </template>
      </template>
      <p v-else class="text-muted text-[0.8125rem] leading-snug">
        Saldonya diubah lewat "Sesuaikan saldo" di detail akun, biar riwayatnya tetap rapi.
      </p>

      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="!isValid"
        loading-label="Menyimpan..."
      >
        {{ isEdit ? 'Simpan perubahan' : 'Tambah akun' }}
      </BaseButton>
    </form>
  </BottomSheet>
</template>
