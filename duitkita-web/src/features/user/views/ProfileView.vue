<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '@/shared/components/BrandMark.vue'
import BottomNav from '@/shared/components/BottomNav.vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import ConfirmSheet from '@/shared/components/ConfirmSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import NotificationPreferencesSheet from '../components/NotificationPreferencesSheet.vue'
import SessionsSheet from '../components/SessionsSheet.vue'
import SecurityAuditSheet from '../components/SecurityAuditSheet.vue'
import IconCamera from '@/shared/icons/IconCamera.vue'
import IconPencil from '@/shared/icons/IconPencil.vue'
import IconLogout from '@/shared/icons/IconLogout.vue'
import IconLock from '@/shared/icons/IconLock.vue'
import IconBell from '@/shared/icons/IconBell.vue'
import IconHistory from '@/shared/icons/IconHistory.vue'
import IconShieldCheck from '@/shared/icons/IconShieldCheck.vue'
import IconChevronRight from '@/shared/icons/IconChevronRight.vue'
import { useToast } from '@/shared/composables/useToast'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ApiError } from '@/lib/request'
import { getPartner } from '@/features/couple/api/couple.api'
import type { Partner } from '@/features/couple/types'
import {
  changePassword,
  getAvatarUrl,
  getProfile,
  updateProfile,
  uploadAvatar,
} from '../api/user.api'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const avatarUrl = ref<string | null>(null)
const avatarBroken = ref(false)
const avatarUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function loadAvatar() {
  if (!auth.user) return
  avatarUrl.value = await getAvatarUrl(auth.user.id)
  avatarBroken.value = false
}

// Read-only glimpse of the couple link — this page isn't where you manage
// the partnership (that's the Pasangan sheet on the dashboard), just a
// warm reminder of who you're budgeting with, so the header doesn't read
// as a generic lone-user profile card.
const partner = ref<Partner | null>(null)

async function loadPartner() {
  try {
    const res = await getPartner()
    partner.value = res.partner
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) {
      console.warn('[profile] failed to load partner:', err)
    }
    partner.value = null
  }
}

const memberSince = computed(() => {
  if (!auth.user?.created_at) return null
  return new Date(auth.user.created_at).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
})

onMounted(async () => {
  loadAvatar()
  loadPartner()
  // Refreshes name/email from the server in case they changed elsewhere
  // (another device, support action) since this session's last login.
  try {
    auth.user = await getProfile()
  } catch {
    // Keep the cached value — not worth surfacing a toast just for this.
  }
})

function onPickAvatar() {
  fileInput.value?.click()
}

async function onAvatarSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  avatarUploading.value = true
  try {
    await uploadAvatar(file)
    toast.success('Foto profil udah diubah.')
    await loadAvatar()
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal ngubah foto profil.'))
  } finally {
    avatarUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const editNameOpen = ref(false)
const nameDraft = ref('')
const savingName = ref(false)

function openEditName() {
  nameDraft.value = auth.user?.name ?? ''
  editNameOpen.value = true
}

async function onSaveName() {
  const name = nameDraft.value.trim()
  if (!name) return

  savingName.value = true
  try {
    auth.user = await updateProfile(name)
    toast.success('Nama udah diubah.')
    editNameOpen.value = false
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal ngubah nama.'))
  } finally {
    savingName.value = false
  }
}

const changePasswordOpen = ref(false)
const currentPasswordDraft = ref('')
const newPasswordDraft = ref('')
const changingPassword = ref(false)

function openChangePassword() {
  currentPasswordDraft.value = ''
  newPasswordDraft.value = ''
  changePasswordOpen.value = true
}

async function onChangePassword() {
  if (!currentPasswordDraft.value || newPasswordDraft.value.length < 8) return

  changingPassword.value = true
  try {
    await changePassword(currentPasswordDraft.value, newPasswordDraft.value)
    toast.success('Password udah diubah.')
    changePasswordOpen.value = false
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal ngubah password.'))
  } finally {
    changingPassword.value = false
  }
}

const notifPrefsOpen = ref(false)
const sessionsOpen = ref(false)
const securityAuditOpen = ref(false)

const logoutConfirmOpen = ref(false)
const loggingOut = ref(false)

async function onConfirmLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
    toast.success('Kamu udah keluar. Sampai ketemu lagi!')
    router.push({ name: 'login' })
  } finally {
    loggingOut.value = false
    logoutConfirmOpen.value = false
  }
}
</script>

<template>
  <main class="bg-ink relative min-h-screen overflow-hidden">
    <!-- Light pooling behind the avatar, where this page's subject is —
         Beranda lights its top-left and Laporan its top-right. -->
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background-image:
          radial-gradient(circle at 50% 0%, rgba(33, 150, 243, 0.24), transparent 55%),
          radial-gradient(circle at 100% 85%, rgba(144, 202, 249, 0.08), transparent 45%);
      "
      aria-hidden="true"
    ></div>

    <div class="relative">
      <header class="safe-top px-5">
        <BrandMark />
      </header>

      <section class="px-5 pt-7 pb-28">
        <!-- Identity card: one clear anchor object for the page, instead of
             the name floating loose above a list of settings. -->
        <div class="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div class="flex items-start gap-4">
            <div class="relative shrink-0">
              <img
                v-if="avatarUrl && !avatarBroken"
                :src="avatarUrl"
                :alt="auth.user?.name"
                class="h-18 w-18 rounded-full object-cover ring-2 ring-white/15"
                @error="avatarBroken = true"
              />
              <span
                v-else
                class="bg-azure/20 text-sky flex h-18 w-18 items-center justify-center rounded-full text-[1.75rem] font-extrabold ring-2 ring-white/15"
                aria-hidden="true"
              >
                {{ (auth.user?.name || '?').charAt(0).toUpperCase() }}
              </span>

              <button
                type="button"
                class="bg-azure border-ink absolute -right-0.5 -bottom-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 text-white transition-opacity disabled:opacity-60"
                aria-label="Ganti foto profil"
                :disabled="avatarUploading"
                @click="onPickAvatar"
              >
                <IconCamera class="h-3.5 w-3.5" />
              </button>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onAvatarSelected"
              />
            </div>

            <div class="min-w-0 flex-1 pt-1">
              <div class="flex items-center gap-1.5">
                <h1 class="truncate text-[1.1875rem] font-extrabold text-white">
                  {{ auth.user?.name }}
                </h1>
                <button
                  type="button"
                  class="text-sky/60 shrink-0 rounded-lg p-1 transition-colors hover:text-white"
                  aria-label="Ubah nama"
                  @click="openEditName"
                >
                  <IconPencil class="h-3.5 w-3.5" />
                </button>
              </div>
              <p class="text-sky/60 mt-0.5 truncate text-[0.8125rem]">{{ auth.user?.email }}</p>
            </div>
          </div>

          <div v-if="memberSince || partner" class="mt-4 flex flex-wrap items-center gap-1.5">
            <span
              v-if="memberSince"
              class="text-sky/70 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.6875rem] font-semibold"
            >
              Gabung {{ memberSince }}
            </span>
            <span
              v-if="partner"
              class="bg-azure/20 border-azure/25 text-sky rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold"
            >
              Satu dompet sama {{ partner.name.split(' ')[0] }}
            </span>
          </div>
        </div>

        <p class="text-sky/50 mt-7 text-[0.6875rem] font-bold tracking-widest uppercase">Akun</p>
        <ul
          class="mt-2.5 divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/10 bg-white/5"
        >
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-white/5"
              @click="openChangePassword"
            >
              <span
                class="bg-azure/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              >
                <IconLock class="text-sky h-4 w-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[0.875rem] font-bold text-white">Ubah password</span>
                <span class="text-sky/50 block text-[0.75rem]">Pastikan cuma kamu yang tau</span>
              </span>
              <IconChevronRight class="text-sky/40 h-4 w-4 shrink-0" />
            </button>
          </li>

          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-white/5"
              @click="notifPrefsOpen = true"
            >
              <span
                class="bg-sky/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              >
                <IconBell class="text-sky h-4 w-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[0.875rem] font-bold text-white">Notifikasi</span>
                <span class="text-sky/50 block text-[0.75rem]"
                  >Atur pengingat & aktivitas pasangan</span
                >
              </span>
              <IconChevronRight class="text-sky/40 h-4 w-4 shrink-0" />
            </button>
          </li>
        </ul>

        <p class="text-sky/50 mt-6 text-[0.6875rem] font-bold tracking-widest uppercase">
          Keamanan
        </p>
        <ul
          class="mt-2.5 divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/10 bg-white/5"
        >
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-white/5"
              @click="sessionsOpen = true"
            >
              <span
                class="bg-sky/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              >
                <IconHistory class="text-sky h-4 w-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[0.875rem] font-bold text-white">Sesi aktif</span>
                <span class="text-sky/50 block text-[0.75rem]"
                  >Lihat perangkat yang lagi login</span
                >
              </span>
              <IconChevronRight class="text-sky/40 h-4 w-4 shrink-0" />
            </button>
          </li>

          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 p-4 text-left transition-colors active:bg-white/5"
              @click="securityAuditOpen = true"
            >
              <span
                class="bg-azure/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              >
                <IconShieldCheck class="text-sky h-4 w-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-[0.875rem] font-bold text-white">Log keamanan</span>
                <span class="text-sky/50 block text-[0.75rem]">Riwayat aktivitas akun kamu</span>
              </span>
              <IconChevronRight class="text-sky/40 h-4 w-4 shrink-0" />
            </button>
          </li>
        </ul>

        <button
          type="button"
          class="text-danger mt-8 flex w-full items-center justify-center gap-2 py-2 text-[0.8125rem] font-bold"
          @click="logoutConfirmOpen = true"
        >
          <IconLogout class="h-4 w-4" />
          Keluar dari akun
        </button>
      </section>

      <BottomNav
        :avatar-url="avatarUrl"
        :avatar-name="auth.user?.name"
        @catat="router.push({ name: 'home' })"
      />
    </div>

    <BottomSheet v-model:open="editNameOpen" title="Ubah nama">
      <form class="flex flex-col gap-5" @submit.prevent="onSaveName">
        <BaseInput v-model="nameDraft" label="Nama" required />
        <BaseButton
          type="submit"
          :loading="savingName"
          :disabled="!nameDraft.trim()"
          loading-label="Menyimpan..."
        >
          Simpan
        </BaseButton>
      </form>
    </BottomSheet>

    <BottomSheet v-model:open="changePasswordOpen" title="Ubah password">
      <form class="flex flex-col gap-5" @submit.prevent="onChangePassword">
        <BaseInput
          v-model="currentPasswordDraft"
          type="password"
          label="Password lama"
          autocomplete="current-password"
          required
        />
        <BaseInput
          v-model="newPasswordDraft"
          type="password"
          label="Password baru"
          hint="Minimal 8 karakter"
          autocomplete="new-password"
          required
        />
        <BaseButton
          type="submit"
          :loading="changingPassword"
          :disabled="!currentPasswordDraft || newPasswordDraft.length < 8"
          loading-label="Menyimpan..."
        >
          Simpan password baru
        </BaseButton>
      </form>
    </BottomSheet>

    <NotificationPreferencesSheet v-model:open="notifPrefsOpen" />
    <SessionsSheet v-model:open="sessionsOpen" />
    <SecurityAuditSheet v-model:open="securityAuditOpen" />

    <ConfirmSheet
      v-model:open="logoutConfirmOpen"
      title="Yakin mau keluar?"
      message="Nanti kamu bisa login lagi kapan aja kok."
      confirm-label="Ya, keluar"
      :loading="loggingOut"
      @confirm="onConfirmLogout"
    />
  </main>
</template>
