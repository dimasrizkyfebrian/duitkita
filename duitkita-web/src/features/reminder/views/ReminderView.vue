<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '@/shared/components/BrandMark.vue'
import BottomNav from '@/shared/components/BottomNav.vue'
import ReminderSheet from '../components/ReminderSheet.vue'
import ReminderListItem from '../components/ReminderListItem.vue'
import RecurringExpenseSheet from '@/features/recurring/components/RecurringExpenseSheet.vue'
import RecurringExpenseListItem from '@/features/recurring/components/RecurringExpenseListItem.vue'
import { useReminders } from '../composables/useReminders'
import { useRecurringExpenses } from '@/features/recurring/composables/useRecurringExpenses'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getAvatarUrl } from '@/features/user/api/user.api'
import { listCategories } from '@/features/category/api/category.api'
import type { Category } from '@/features/category/types'
import type { Reminder } from '../types'
import type { RecurringExpense } from '@/features/recurring/types'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const myAvatarUrl = ref<string | null>(null)
if (auth.user) getAvatarUrl(auth.user.id).then((url) => (myAvatarUrl.value = url))

const tab = ref<'tagihan' | 'rutin'>('tagihan')

const { overdue, upcoming, done, loading, reload } = useReminders()
const {
  active: activeRecurring,
  paused: pausedRecurring,
  loading: recurringLoading,
  reload: reloadRecurring,
} = useRecurringExpenses()

// Needed by both the Rutin list (to show each item's category name/icon)
// and the create/edit sheet (to pick a category) — cheap and the same for
// everyone, so just load it once up front rather than per-tab-switch.
const categories = ref<Category[]>([])
onMounted(async () => {
  try {
    categories.value = await listCategories()
  } catch (err) {
    // Non-fatal: the Rutin list falls back to a generic label per item and
    // the create sheet shows its "bikin kategori dulu" empty state, so the
    // page stays usable — but the user still needs to know why.
    toast.error(apiErrorMessage(err, 'Gagal muat kategori.'))
  }
})
function categoryFor(categoryId: string) {
  return categories.value.find((c) => c.id === categoryId)
}

const sheetOpen = ref(false)
const editTarget = ref<Reminder | null>(null)

function openCreate() {
  editTarget.value = null
  sheetOpen.value = true
}

function openEdit(reminder: Reminder) {
  editTarget.value = reminder
  sheetOpen.value = true
}

const recurringSheetOpen = ref(false)
const recurringEditTarget = ref<RecurringExpense | null>(null)

function openCreateRecurring() {
  recurringEditTarget.value = null
  recurringSheetOpen.value = true
}

function openEditRecurring(item: RecurringExpense) {
  recurringEditTarget.value = item
  recurringSheetOpen.value = true
}
</script>

<template>
  <main class="bg-ink relative min-h-screen overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background-image:
          radial-gradient(circle at 100% 0%, rgba(33, 150, 243, 0.28), transparent 55%),
          radial-gradient(circle at 0% 100%, rgba(144, 202, 249, 0.12), transparent 45%);
      "
      aria-hidden="true"
    ></div>

    <div class="relative">
      <header class="safe-top flex items-center justify-between px-5 pb-4">
        <div class="flex items-center gap-2.5">
          <BrandMark :with-wordmark="false" />
          <h1 class="text-[1.375rem] font-extrabold tracking-tight text-white">Pengingat</h1>
        </div>
        <button
          type="button"
          class="bg-azure flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_8px_18px_-6px_rgba(33,150,243,0.75)] transition-transform active:translate-y-px"
          :aria-label="tab === 'tagihan' ? 'Tambah pengingat' : 'Tambah pengeluaran rutin'"
          @click="tab === 'tagihan' ? openCreate() : openCreateRecurring()"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </header>

      <div class="px-5 pb-5">
        <!-- role="tablist" belongs on the element that directly contains the
             tabs — a generic wrapper in between breaks the relationship for
             screen readers, which then announce neither tab's position. -->
        <div class="flex gap-1 rounded-full bg-white/5 p-1" role="tablist">
          <button
            id="tab-tagihan"
            type="button"
            role="tab"
            :aria-selected="tab === 'tagihan'"
            aria-controls="panel-tagihan"
            class="focus-visible:ring-azure/40 flex-1 rounded-full py-2 text-[0.8125rem] font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            :class="tab === 'tagihan' ? 'bg-azure text-white' : 'text-sky/60'"
            @click="tab = 'tagihan'"
          >
            Tagihan
          </button>
          <button
            id="tab-rutin"
            type="button"
            role="tab"
            :aria-selected="tab === 'rutin'"
            aria-controls="panel-rutin"
            class="focus-visible:ring-azure/40 flex-1 rounded-full py-2 text-[0.8125rem] font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            :class="tab === 'rutin' ? 'bg-azure text-white' : 'text-sky/60'"
            @click="tab = 'rutin'"
          >
            Rutin
          </button>
        </div>
      </div>

      <section
        v-if="tab === 'tagihan'"
        id="panel-tagihan"
        role="tabpanel"
        aria-labelledby="tab-tagihan"
        class="flex-1 px-5 pb-28"
      >
        <div v-if="loading" class="flex flex-col gap-3">
          <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-2xl bg-white/5"></div>
        </div>

        <div
          v-else-if="overdue.length === 0 && upcoming.length === 0 && done.length === 0"
          class="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center"
        >
          <p class="text-[0.9375rem] font-bold text-white">Belum ada pengingat</p>
          <p class="text-sky/60 text-[0.8125rem] leading-relaxed">
            Bikin pengingat buat tagihan biar gak lupa bayar.
          </p>
        </div>

        <div v-else class="flex flex-col gap-6">
          <div v-if="overdue.length > 0" class="flex flex-col gap-2.5">
            <p class="text-danger text-[0.75rem] font-bold tracking-wide uppercase">
              Lewat jatuh tempo
            </p>
            <div class="flex flex-col gap-2">
              <ReminderListItem
                v-for="reminder in overdue"
                :key="reminder.id"
                :reminder="reminder"
                @tap="openEdit(reminder)"
              />
            </div>
          </div>

          <div v-if="upcoming.length > 0" class="flex flex-col gap-2.5">
            <p class="text-sky/60 text-[0.75rem] font-bold tracking-wide uppercase">Mendatang</p>
            <div class="flex flex-col gap-2">
              <ReminderListItem
                v-for="reminder in upcoming"
                :key="reminder.id"
                :reminder="reminder"
                @tap="openEdit(reminder)"
              />
            </div>
          </div>

          <div v-if="done.length > 0" class="flex flex-col gap-2.5">
            <p class="text-sky/60 text-[0.75rem] font-bold tracking-wide uppercase">Udah lunas</p>
            <div class="flex flex-col gap-2">
              <ReminderListItem
                v-for="reminder in done"
                :key="reminder.id"
                :reminder="reminder"
                @tap="openEdit(reminder)"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        v-else
        id="panel-rutin"
        role="tabpanel"
        aria-labelledby="tab-rutin"
        class="flex-1 px-5 pb-28"
      >
        <div v-if="recurringLoading" class="flex flex-col gap-3">
          <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-2xl bg-white/5"></div>
        </div>

        <div
          v-else-if="activeRecurring.length === 0 && pausedRecurring.length === 0"
          class="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center"
        >
          <p class="text-[0.9375rem] font-bold text-white">Belum ada pengeluaran rutin</p>
          <p class="text-sky/60 text-[0.8125rem] leading-relaxed">
            Bikin buat pengeluaran bulanan atau mingguan yang jumlahnya sama terus, biar otomatis
            tercatat.
          </p>
        </div>

        <div v-else class="flex flex-col gap-6">
          <div v-if="activeRecurring.length > 0" class="flex flex-col gap-2.5">
            <p class="text-sky/60 text-[0.75rem] font-bold tracking-wide uppercase">Aktif</p>
            <div class="flex flex-col gap-2">
              <RecurringExpenseListItem
                v-for="item in activeRecurring"
                :key="item.id"
                :item="item"
                :category="categoryFor(item.category_id)"
                @tap="openEditRecurring(item)"
              />
            </div>
          </div>

          <div v-if="pausedRecurring.length > 0" class="flex flex-col gap-2.5">
            <p class="text-sky/60 text-[0.75rem] font-bold tracking-wide uppercase">Dipause</p>
            <div class="flex flex-col gap-2">
              <RecurringExpenseListItem
                v-for="item in pausedRecurring"
                :key="item.id"
                :item="item"
                :category="categoryFor(item.category_id)"
                @tap="openEditRecurring(item)"
              />
            </div>
          </div>
        </div>
      </section>

      <BottomNav
        :avatar-url="myAvatarUrl"
        :avatar-name="auth.user?.name"
        @catat="router.push({ name: 'home' })"
      />
    </div>

    <ReminderSheet v-model:open="sheetOpen" :existing="editTarget" @saved="reload" />
    <RecurringExpenseSheet
      v-model:open="recurringSheetOpen"
      :existing="recurringEditTarget"
      :categories="categories"
      @saved="reloadRecurring"
    />
  </main>
</template>
