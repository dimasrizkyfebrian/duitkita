<script setup lang="ts">
import { computed, ref } from 'vue'
import BrandMark from '@/shared/components/BrandMark.vue'
import BottomNav from '@/shared/components/BottomNav.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import { formatRupiah, formatRupiahShort } from '@/shared/utils/currency'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import CreateCategorySheet from '@/features/category/components/CreateCategorySheet.vue'
import ManageCategoriesSheet from '@/features/category/components/ManageCategoriesSheet.vue'
import SetBudgetSheet from '@/features/budget/components/SetBudgetSheet.vue'
import ManageBudgetsSheet from '@/features/budget/components/ManageBudgetsSheet.vue'
import CreateExpenseSheet from '@/features/expense/components/CreateExpenseSheet.vue'
import PartnerSheet from '@/features/couple/components/PartnerSheet.vue'
import IconWallet from '@/shared/icons/IconWallet.vue'
import IconCategory from '@/shared/icons/IconCategory.vue'
import IconPartner from '@/shared/icons/IconPartner.vue'
import IconChevronDown from '@/shared/icons/IconChevronDown.vue'
import type { CategorySpend } from '@/features/report/types'
import { useMonthlyOverview } from '../composables/useMonthlyOverview'
import { usePartnerOverview } from '../composables/usePartnerOverview'
import { useRecentExpenses } from '../composables/useRecentExpenses'
import type { CategoryOverviewItem } from '../types'

const auth = useAuthStore()

const { year, month, report, loading, error, usage, remaining, budgeted, unbudgeted, reload } =
  useMonthlyOverview()
const {
  partner,
  items: partnerCategories,
  linked: partnerLinked,
  reload: reloadPartnerOverview,
} = usePartnerOverview()
const {
  items: recentItems,
  partnerName,
  myAvatarUrl,
  loading: recentLoading,
  reload: reloadRecent,
} = useRecentExpenses()

const allCategories = computed(() => [...budgeted.value, ...unbudgeted.value])

const periodLabel = new Date(year, month - 1).toLocaleDateString('id-ID', {
  month: 'long',
  year: 'numeric',
})

const createCategoryOpen = ref(false)
const categoriesSheetOpen = ref(false)
const createExpenseOpen = ref(false)
const manageBudgetsOpen = ref(false)
const partnerSheetOpen = ref(false)

const budgetSheetOpen = ref(false)
const budgetSheetCategory = ref<CategoryOverviewItem | null>(null)

function openBudgetSheet(category: CategoryOverviewItem) {
  budgetSheetCategory.value = category
  budgetSheetOpen.value = true
}

function categoryProgress(category: CategorySpend) {
  if (category.budget <= 0) return 0
  return Math.round((category.spent / category.budget) * 100)
}

function displayIcon(name: string, icon?: string) {
  return icon || name.charAt(0)
}

// Usage ring on the spend card — a stroke-dashoffset circle instead of a
// generic blurred glow, so the card reads as "a budget gauge" rather than
// decoration.
const ringRadius = 30
const ringCircumference = 2 * Math.PI * ringRadius
const ringOffset = computed(
  () => ringCircumference - (Math.min(usage.value, 100) / 100) * ringCircumference,
)

// Rotates category icon chips through a few palette-safe tints so the
// budgeted list doesn't read as one flat, repeated block.
const categoryTints = [
  { bg: 'bg-mist', text: 'text-navy' },
  { bg: 'bg-sky/30', text: 'text-navy' },
  { bg: 'bg-azure/15', text: 'text-azure' },
] as const
function categoryTint(index: number) {
  return categoryTints[index % categoryTints.length] ?? categoryTints[0]
}

function personName(item: { owner: 'me' | 'partner' }) {
  return item.owner === 'me' ? (auth.user?.name ?? 'Kamu') : (partnerName.value ?? 'Pasangan')
}

// Tracks avatar images that failed to load (broken url, deleted file) so
// that row falls back to the initial instead of a broken-image icon.
const brokenAvatars = ref(new Set<string>())
function onAvatarError(itemId: string) {
  brokenAvatars.value.add(itemId)
}

function afterExpenseCreated() {
  reload()
  reloadRecent()
}

function afterPartnerChanged() {
  reloadPartnerOverview()
  reloadRecent()
}

const hasCategories = computed(() => (report.value?.by_category.length ?? 0) > 0)

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// Collapsed to 2 items so the home screen stays scannable — expands to the
// full 5 the feed keeps in memory (see useRecentExpenses) rather than
// re-fetching, since "see everything" belongs on the Laporan page, not here.
const recentExpanded = ref(false)
const visibleRecentItems = computed(() => recentItems.value.slice(0, recentExpanded.value ? 5 : 2))
</script>

<template>
  <main class="bg-ink flex min-h-screen flex-col">
    <header class="safe-top px-5 pb-6">
      <BrandMark />

      <p class="text-sky/80 mt-7 text-[0.8125rem]">Hai, {{ auth.user?.name }}</p>
      <h1 class="mt-1 text-[1.5rem] font-extrabold tracking-tight text-white capitalize">
        {{ periodLabel }}
      </h1>

      <!-- Loading skeleton -->
      <div
        v-if="loading"
        class="mt-5 h-46 animate-pulse rounded-3xl border border-white/10 bg-white/5"
      ></div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="mt-5 flex flex-col items-start gap-3 rounded-3xl border border-white/10 bg-white/5 p-5"
      >
        <p class="text-sky/85 text-[0.875rem]">Yah, ringkasan budget kamu gagal dimuat.</p>
        <button
          type="button"
          class="rounded-control bg-white/15 px-4 py-2 text-[0.8125rem] font-bold text-white"
          @click="reload"
        >
          Coba lagi
        </button>
      </div>

      <!-- Spend card -->
      <article
        v-else
        class="bg-navy relative mt-5 overflow-hidden rounded-3xl border border-white/10 p-5"
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-50"
          style="
            background-image: repeating-linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.035) 0px,
              rgba(255, 255, 255, 0.035) 1px,
              transparent 1px,
              transparent 14px
            );
          "
          aria-hidden="true"
        ></div>

        <div class="relative flex items-center gap-4">
          <div class="min-w-0 flex-1">
            <p class="text-sky/80 text-[0.6875rem] font-semibold tracking-widest uppercase">
              Total pengeluaran
            </p>
            <p
              class="mt-1.5 text-[2rem] leading-none font-extrabold tracking-tight text-white tabular-nums"
            >
              {{ formatRupiah(report?.total_spent ?? 0) }}
            </p>
            <p class="text-sky/85 mt-2.5 text-[0.75rem] font-semibold">
              {{
                report?.total_budget ? `${usage}% dari budget bulan ini` : 'Belum ada budget diatur'
              }}
            </p>
            <p v-if="report?.total_budget" class="text-sky/70 mt-0.5 text-[0.75rem] tabular-nums">
              {{
                remaining >= 0
                  ? `Sisa ${formatRupiahShort(remaining)}`
                  : `Lewat ${formatRupiahShort(-remaining)}`
              }}
            </p>
          </div>

          <div v-if="report?.total_budget" class="relative h-18 w-18 shrink-0">
            <svg viewBox="0 0 72 72" class="h-full w-full -rotate-90">
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="white"
                stroke-opacity="0.15"
                stroke-width="7"
              />
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke-width="7"
                stroke-linecap="round"
                class="transition-[stroke-dashoffset] duration-500"
                :class="usage > 100 ? 'stroke-danger' : 'stroke-sky'"
                :stroke-dasharray="ringCircumference"
                :stroke-dashoffset="ringOffset"
              />
            </svg>
            <span
              class="absolute inset-0 flex items-center justify-center text-[0.8125rem] font-extrabold text-white tabular-nums"
            >
              {{ usage }}%
            </span>
          </div>
        </div>
      </article>
    </header>

    <section class="bg-sheet rounded-t-sheet flex-1 px-5 pt-7 pb-28">
      <!-- Quick Actions: the three things this app doesn't have a management
           surface for anywhere else yet (Catat has the FAB, Laporan/Pengingat
           live in the bottom nav). -->
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="bg-mist/60 active:bg-mist rounded-control flex flex-col items-center gap-2 px-1 py-3.5 transition-colors"
          @click="manageBudgetsOpen = true"
        >
          <span class="bg-navy/10 flex h-9 w-9 items-center justify-center rounded-full">
            <IconWallet class="text-navy h-5 w-5" />
          </span>
          <span class="text-navy text-[0.6875rem] font-bold">Budget</span>
        </button>
        <button
          type="button"
          class="bg-mist/60 active:bg-mist rounded-control flex flex-col items-center gap-2 px-1 py-3.5 transition-colors"
          @click="categoriesSheetOpen = true"
        >
          <span class="bg-navy/10 flex h-9 w-9 items-center justify-center rounded-full">
            <IconCategory class="text-navy h-5 w-5" />
          </span>
          <span class="text-navy text-[0.6875rem] font-bold">Kategori</span>
        </button>
        <button
          type="button"
          class="bg-mist/60 active:bg-mist rounded-control flex flex-col items-center gap-2 px-1 py-3.5 transition-colors"
          @click="partnerSheetOpen = true"
        >
          <span class="bg-navy/10 flex h-9 w-9 items-center justify-center rounded-full">
            <IconPartner class="text-navy h-5 w-5" />
          </span>
          <span class="text-navy text-[0.6875rem] font-bold">Pasangan</span>
        </button>
      </div>

      <!-- Recent expenses: own + partner's, merged, newest first. Collapsed to
           2 by default so this doesn't push the budget breakdown too far down. -->
      <div class="mt-7 flex items-center justify-between">
        <h2 class="text-ink text-[0.9375rem] font-extrabold">Pengeluaran terakhir</h2>
        <button
          v-if="recentItems.length > 2"
          type="button"
          class="text-azure flex items-center gap-1 text-[0.75rem] font-bold"
          @click="recentExpanded = !recentExpanded"
        >
          {{ recentExpanded ? 'Sembunyikan' : 'Lihat semua' }}
          <IconChevronDown
            class="h-3.5 w-3.5 transition-transform duration-200"
            :class="recentExpanded ? 'rotate-180' : ''"
          />
        </button>
      </div>

      <div v-if="recentLoading" class="mt-3 flex flex-col gap-2">
        <div v-for="n in 2" :key="n" class="h-14 animate-pulse rounded-2xl bg-black/5"></div>
      </div>

      <p v-else-if="recentItems.length === 0" class="text-muted mt-3 text-[0.8125rem]">
        Belum ada pengeluaran yang tercatat nih.
      </p>

      <ul v-else class="border-hairline mt-3 flex flex-col">
        <li
          v-for="item in visibleRecentItems"
          :key="item.id"
          class="border-hairline flex items-center gap-3 border-b py-3.5 last:border-b-0"
        >
          <img
            v-if="item.avatarUrl && !brokenAvatars.has(item.id)"
            :src="item.avatarUrl"
            :alt="personName(item)"
            class="h-10 w-10 shrink-0 rounded-full object-cover"
            @error="onAvatarError(item.id)"
          />
          <span
            v-else
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-extrabold"
            :class="item.owner === 'me' ? 'bg-mist text-navy' : 'bg-sky/25 text-navy'"
            aria-hidden="true"
          >
            {{ personName(item).charAt(0) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-ink truncate text-[0.875rem] font-bold">
              {{ item.note || item.categoryName || 'Pengeluaran' }}
            </p>
            <p class="text-muted mt-0.5 truncate text-[0.75rem]">
              <template v-if="item.categoryName">{{ item.categoryName }} · </template>
              {{ item.owner === 'me' ? 'Kamu' : partnerName }}
              · {{ formatShortDate(item.expense_date) }}
            </p>
          </div>
          <p class="text-ink shrink-0 text-[0.875rem] font-extrabold tabular-nums">
            {{ formatRupiah(item.amount) }}
          </p>
        </li>
      </ul>

      <!-- Budget per category -->
      <div class="mt-8 flex items-center justify-between">
        <h2 class="text-ink text-[0.9375rem] font-extrabold">Budget per kategori</h2>
      </div>

      <!-- Empty state: no categories at all yet -->
      <div
        v-if="!loading && !error && !hasCategories"
        class="border-hairline mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-5 py-10 text-center"
      >
        <p class="text-ink text-[0.875rem] font-bold">Belum ada kategori</p>
        <p class="text-muted max-w-[26ch] text-[0.8125rem] leading-relaxed">
          Bikin kategori dulu, misalnya Makan atau Transport, baru kamu bisa atur budgetnya.
        </p>
        <BaseButton class="mt-1 w-auto px-6" @click="createCategoryOpen = true">
          Bikin kategori pertama
        </BaseButton>
      </div>

      <ul v-else-if="!loading && !error" class="mt-3 flex flex-col gap-3">
        <li
          v-for="(category, index) in budgeted"
          :key="category.category_id"
          class="border-hairline rounded-2xl border p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9375rem]"
                :class="
                  category.icon
                    ? categoryTint(index).bg
                    : `${categoryTint(index).bg} ${categoryTint(index).text} text-[0.8125rem] font-extrabold`
                "
                aria-hidden="true"
              >
                {{ displayIcon(category.name, category.icon) }}
              </span>
              <p class="text-ink truncate text-[0.875rem] font-bold">{{ category.name }}</p>
            </div>
            <p class="shrink-0 text-[0.8125rem] font-bold tabular-nums">
              <span :class="categoryProgress(category) > 100 ? 'text-danger' : 'text-ink'">
                {{ formatRupiahShort(category.spent) }}
              </span>
              <span class="text-muted"> / {{ formatRupiahShort(category.budget) }}</span>
            </p>
          </div>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
            <div
              class="h-full rounded-full transition-[width] duration-500"
              :class="categoryProgress(category) > 100 ? 'bg-danger' : 'bg-azure'"
              :style="{ width: `${Math.min(categoryProgress(category), 100)}%` }"
            ></div>
          </div>
        </li>

        <li
          v-for="category in unbudgeted"
          :key="category.category_id"
          class="border-hairline flex items-center justify-between gap-3 rounded-2xl border border-dashed p-4"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="bg-muted/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9375rem]"
              :class="category.icon ? '' : 'text-muted text-[0.8125rem] font-extrabold'"
              aria-hidden="true"
            >
              {{ displayIcon(category.name, category.icon) }}
            </span>
            <p class="text-ink truncate text-[0.875rem] font-bold">{{ category.name }}</p>
          </div>
          <button
            type="button"
            class="text-azure shrink-0 text-[0.8125rem] font-bold"
            @click="openBudgetSheet(category)"
          >
            Atur budget
          </button>
        </li>
      </ul>

      <!-- Partner comparison: two separate sets of numbers side by side, never
           merged into one pool — see usePartnerOverview for why. -->
      <template v-if="partnerLinked">
        <div class="mt-8 flex items-center justify-between">
          <h2 class="text-ink text-[0.9375rem] font-extrabold">Budget {{ partner?.name }}</h2>
          <span class="text-muted text-[0.6875rem] font-semibold">Lihat aja</span>
        </div>

        <ul class="mt-3 flex flex-col gap-3">
          <li
            v-for="category in partnerCategories"
            :key="category.category_id"
            class="border-hairline rounded-2xl border border-dashed p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-ink truncate text-[0.875rem] font-bold">{{ category.name }}</p>
              <p class="shrink-0 text-[0.8125rem] font-bold tabular-nums">
                <span :class="categoryProgress(category) > 100 ? 'text-danger' : 'text-ink'">
                  {{ formatRupiahShort(category.spent) }}
                </span>
                <span class="text-muted"> / {{ formatRupiahShort(category.budget) }}</span>
              </p>
            </div>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
              <div
                class="h-full rounded-full transition-[width] duration-500"
                :class="categoryProgress(category) > 100 ? 'bg-danger' : 'bg-sky'"
                :style="{ width: `${Math.min(categoryProgress(category), 100)}%` }"
              ></div>
            </div>
          </li>
        </ul>
      </template>
    </section>

    <BottomNav
      :avatar-url="myAvatarUrl"
      :avatar-name="auth.user?.name"
      @catat="createExpenseOpen = true"
    />

    <CreateCategorySheet v-model:open="createCategoryOpen" @saved="reload" />
    <ManageCategoriesSheet
      v-model:open="categoriesSheetOpen"
      :categories="allCategories"
      @changed="reload"
    />
    <SetBudgetSheet
      v-if="budgetSheetCategory"
      v-model:open="budgetSheetOpen"
      :category-id="budgetSheetCategory.category_id"
      :category-name="budgetSheetCategory.name"
      :year="year"
      :month="month"
      @saved="reload"
    />
    <ManageBudgetsSheet
      v-model:open="manageBudgetsOpen"
      :categories="allCategories"
      :year="year"
      :month="month"
      @changed="reload"
    />
    <CreateExpenseSheet
      v-model:open="createExpenseOpen"
      :categories="budgeted"
      @created="afterExpenseCreated"
    />
    <PartnerSheet v-model:open="partnerSheetOpen" @changed="afterPartnerChanged" />
  </main>
</template>
