<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '@/shared/components/BrandMark.vue'
import BottomNav from '@/shared/components/BottomNav.vue'
import IconChevronLeft from '@/shared/icons/IconChevronLeft.vue'
import IconChevronRight from '@/shared/icons/IconChevronRight.vue'
import IconTrendingUp from '@/shared/icons/IconTrendingUp.vue'
import CategoryDonut from '../components/CategoryDonut.vue'
import CategoryTrendSheet from '../components/CategoryTrendSheet.vue'
import ExportReportCard from '../components/ExportReportCard.vue'
import TopExpensesCard from '../components/TopExpensesCard.vue'
import ForecastCard from '../components/ForecastCard.vue'
import HealthScoreSheet from '../components/HealthScoreSheet.vue'
import { tipMessages } from '../utils/scoreTips'
import AccountBreakdownCard from '../components/AccountBreakdownCard.vue'
import { useAccountBreakdown } from '../composables/useAccountBreakdown'
import { useAccounts } from '@/features/account/composables/useAccounts'
import MonthComparisonCard from '../components/MonthComparisonCard.vue'
import { useReportPeriod } from '../composables/useReportPeriod'
import { useMonthlySummary, type CategoryBreakdownItem } from '../composables/useMonthlySummary'
import { useCoupleSummary } from '../composables/useCoupleSummary'
import { useCoupleTrend } from '../composables/useCoupleTrend'
import { useSpendingTrend } from '../composables/useSpendingTrend'
import { useDailyBreakdown } from '../composables/useDailyBreakdown'
import { useTopExpenses } from '../composables/useTopExpenses'
import { useMonthComparison } from '../composables/useMonthComparison'
import { useHealthScore } from '../composables/useHealthScore'
import { useForecast } from '../composables/useForecast'
import { formatRupiah, formatRupiahShort } from '@/shared/utils/currency'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getAvatarUrl } from '@/features/user/api/user.api'

const auth = useAuthStore()
const router = useRouter()
const myAvatarUrl = ref<string | null>(null)
if (auth.user) getAvatarUrl(auth.user.id).then((url) => (myAvatarUrl.value = url))

const { year, month, label: periodLabel, isCurrent, goPrev, goNext } = useReportPeriod()

const { report: monthlyReport, loading: monthlyLoading, breakdown } = useMonthlySummary(year, month)

const {
  linked: coupleLinked,
  partnerName,
  myTotal,
  partnerTotal,
  combinedTotal,
} = useCoupleSummary(year, month)

const { points: trendPoints, loading: trendLoading, max: trendMax, deltaPct } = useSpendingTrend(6)

const { points: coupleTrendPoints, loading: coupleTrendLoading } = useCoupleTrend(6)
const coupleTrendMax = computed(() =>
  coupleTrendPoints.value.reduce((m, p) => Math.max(m, p.total), 0),
)

const { points: dailyPoints, loading: dailyLoading } = useDailyBreakdown(year, month)
const dailyMax = computed(() => dailyPoints.value.reduce((m, p) => Math.max(m, p.total), 0))

const {
  items: topExpenses,
  coupleItems: coupleTopExpenses,
  loading: topExpensesLoading,
} = useTopExpenses(year, month)

const {
  loading: comparisonLoading,
  totalCurrent: comparisonTotalCurrent,
  totalPrevious: comparisonTotalPrevious,
  totalDeltaPct: comparisonTotalDeltaPct,
  categories: comparisonCategories,
} = useMonthComparison(year, month, monthlyReport)

const { score: healthScore } = useHealthScore(year, month)

// Only worth a card once the user has set up accounts at all — before that
// every expense would land in the single "Tanpa akun" row.
const { accounts } = useAccounts()
const { items: accountBreakdown, loading: accountBreakdownLoading } = useAccountBreakdown(
  year,
  month,
)

const { forecast, loading: forecastLoading } = useForecast()

function monthAbbrev(p: { year: number; month: number }) {
  return new Date(p.year, p.month - 1).toLocaleDateString('id-ID', { month: 'short' })
}

// Top 4 categories keep their own slice; everything past that is pooled
// into one "Lainnya" row so the donut/legend stays readable no matter how
// many categories someone has set up.
interface DonutRow {
  category_id: string | null
  name: string
  share: number
}
const donutRows = computed<DonutRow[]>(() => {
  if (breakdown.value.length <= 5) return breakdown.value
  const top = breakdown.value.slice(0, 4)
  const rest = breakdown.value.slice(4)
  const otherShare = rest.reduce((sum, r) => sum + r.share, 0)
  return [...top, { category_id: null, name: 'Lainnya', share: otherShare }]
})
const dotColors = ['bg-azure', 'bg-sky', 'bg-mist', 'bg-white/40', 'bg-white/15']

const categorySheetOpen = ref(false)
const selectedCategory = ref<CategoryBreakdownItem | null>(null)
function openCategoryDetail(item: DonutRow) {
  if (!item.category_id) return
  const full = breakdown.value.find((c) => c.category_id === item.category_id)
  if (!full) return
  selectedCategory.value = full
  categorySheetOpen.value = true
}

const combinedCoupleTotal = computed(() => Math.max(myTotal.value + partnerTotal.value, 1))
function coupleShare(value: number) {
  return Math.round((value / combinedCoupleTotal.value) * 100)
}

const healthTone = computed(() => {
  switch (healthScore.value?.grade) {
    case 'A':
      return { bg: 'bg-success/15', border: 'border-success/25', text: 'text-success' }
    case 'B':
      return { bg: 'bg-azure/15', border: 'border-azure/25', text: 'text-azure' }
    case 'C':
      return { bg: 'bg-white/10', border: 'border-white/15', text: 'text-sky' }
    case 'D':
      return { bg: 'bg-danger/20', border: 'border-danger/30', text: 'text-danger' }
    default:
      return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-sky/60' }
  }
})
const healthGradeDisplay = computed(() => {
  const grade = healthScore.value?.grade
  return grade && grade !== 'n/a' ? grade : '–'
})
// The card leads with the most important tip; the sheet has all of them.
const healthHeadline = computed(() => {
  if (!healthScore.value) return 'Belum ada data buat periode ini.'
  return tipMessages(healthScore.value.tips)[0] ?? ''
})
const healthSheetOpen = ref(false)
</script>

<template>
  <main class="bg-ink relative min-h-screen overflow-hidden">
    <!-- Soft light pooling in the top-right corner instead of a flat dark
         fill — the one thing that visually sets this page apart from the
         flat bg-ink header strips on Beranda/Profil. -->
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
      <header class="safe-top px-5 pb-4">
        <div class="flex items-center gap-2.5">
          <BrandMark :with-wordmark="false" />
          <h1 class="text-[1.375rem] font-extrabold tracking-tight text-white">Laporan</h1>
        </div>

        <div
          class="mt-4 flex items-center justify-between rounded-full border border-white/15 bg-white/5 px-1.5 py-1.5"
        >
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full transition-colors active:bg-white/10"
            aria-label="Bulan sebelumnya"
            @click="goPrev"
          >
            <IconChevronLeft class="h-4 w-4 text-white" />
          </button>
          <span class="text-[0.875rem] font-bold text-white capitalize">{{ periodLabel }}</span>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full transition-colors active:bg-white/10 disabled:opacity-30"
            aria-label="Bulan berikutnya"
            :disabled="isCurrent"
            @click="goNext"
          >
            <IconChevronRight class="h-4 w-4 text-white" />
          </button>
        </div>
      </header>

      <section class="flex-1 px-5 pb-28">
        <div class="grid grid-cols-2 gap-3">
          <!-- Hero: total spend this period + trend delta + sparkline -->
          <article
            class="bg-navy relative col-span-2 overflow-hidden rounded-3xl border border-white/10 p-5 text-white shadow-[0_12px_30px_-12px_rgba(7,28,60,0.6)]"
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

            <div class="relative flex items-center justify-between gap-4">
              <div class="min-w-0">
                <p class="text-sky/80 text-[0.6875rem] font-semibold tracking-widest uppercase">
                  Total {{ periodLabel }}
                </p>
                <p
                  v-if="!monthlyLoading"
                  class="mt-1.5 text-[1.75rem] leading-none font-extrabold tabular-nums"
                >
                  {{ formatRupiah(monthlyReport?.total_spent ?? 0) }}
                </p>
                <div v-else class="mt-1.5 h-8 w-32 animate-pulse rounded-lg bg-white/10"></div>

                <p
                  v-if="deltaPct !== null"
                  class="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-bold"
                  :class="deltaPct > 0 ? 'text-danger' : 'text-success'"
                >
                  <IconTrendingUp class="h-3 w-3" :class="deltaPct <= 0 ? '-scale-y-100' : ''" />
                  {{ Math.abs(deltaPct) }}% dari bulan lalu
                </p>
              </div>
            </div>
          </article>

          <!-- This month vs last month, total + per category -->
          <MonthComparisonCard
            :period-label="periodLabel"
            :loading="comparisonLoading || monthlyLoading"
            :total-current="comparisonTotalCurrent"
            :total-previous="comparisonTotalPrevious"
            :total-delta-pct="comparisonTotalDeltaPct"
            :categories="comparisonCategories"
          />

          <!-- Health score -->
          <button
            type="button"
            class="focus-visible:ring-azure/30 rounded-3xl border p-4 text-left transition-colors focus-visible:ring-4 focus-visible:outline-none active:brightness-110"
            :class="[healthTone.bg, healthTone.border]"
            :disabled="!healthScore"
            @click="healthSheetOpen = true"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">
                Skor keuangan
              </p>
              <IconChevronRight v-if="healthScore" class="text-sky/50 h-3.5 w-3.5 shrink-0" />
            </div>
            <p class="mt-2 text-[2rem] leading-none font-extrabold" :class="healthTone.text">
              {{ healthGradeDisplay }}
            </p>
            <p class="text-sky/70 mt-1 flex items-center gap-1.5 text-[0.75rem] font-bold">
              <span class="tabular-nums">{{ healthScore?.score ?? 0 }}/100</span>
              <span
                v-if="healthScore?.provisional"
                class="text-sky rounded-full bg-white/10 px-1.5 py-0.5 text-[0.625rem] font-bold"
              >
                Sementara
              </span>
            </p>
            <p class="text-sky/60 mt-2 line-clamp-3 text-[0.6875rem] leading-snug">
              {{ healthHeadline }}
            </p>
          </button>

          <ForecastCard :forecast="forecast" :loading="forecastLoading" />

          <!-- Category breakdown -->
          <article class="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p class="text-[0.9375rem] font-extrabold text-white">Kategori {{ periodLabel }}</p>

            <div v-if="monthlyLoading" class="mt-4 h-28 animate-pulse rounded-2xl bg-white/5"></div>

            <p v-else-if="donutRows.length === 0" class="text-sky/60 mt-3 text-[0.8125rem]">
              Belum ada pengeluaran tercatat periode ini.
            </p>

            <div v-else class="mt-4 flex items-center gap-5">
              <div class="h-24 w-24 shrink-0">
                <CategoryDonut :shares="donutRows.map((r) => r.share)" />
              </div>
              <ul class="flex min-w-0 flex-1 flex-col gap-2.5">
                <li v-for="(item, i) in donutRows" :key="item.category_id ?? 'other'">
                  <component
                    :is="item.category_id ? 'button' : 'div'"
                    type="button"
                    class="flex w-full items-center gap-2 text-left"
                    @click="openCategoryDetail(item)"
                  >
                    <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="dotColors[i]"></span>
                    <span class="min-w-0 flex-1 truncate text-[0.8125rem] font-bold text-white">
                      {{ item.name }}
                    </span>
                    <span class="text-sky/60 shrink-0 text-[0.75rem] font-bold tabular-nums">
                      {{ item.share }}%
                    </span>
                  </component>
                </li>
              </ul>
            </div>
          </article>

          <!-- Largest personal transactions this period -->
          <TopExpensesCard
            :title="`Pengeluaran terbesar ${periodLabel}`"
            :items="topExpenses"
            :loading="topExpensesLoading"
          />

          <!-- Where the money came from: personal only, accounts are private -->
          <AccountBreakdownCard
            v-if="accounts.length > 0"
            :title="`Pengeluaran per akun — ${periodLabel}`"
            :items="accountBreakdown"
            :loading="accountBreakdownLoading"
          />

          <!-- Daily breakdown within the selected month -->
          <article class="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p class="text-[0.9375rem] font-extrabold text-white">
              Pengeluaran harian — {{ periodLabel }}
            </p>

            <div v-if="dailyLoading" class="mt-4 h-28 animate-pulse rounded-2xl bg-white/5"></div>

            <p v-else-if="dailyMax === 0" class="text-sky/60 mt-3 text-[0.8125rem]">
              Belum ada pengeluaran tercatat periode ini.
            </p>

            <div v-else class="mt-4 -mx-1 overflow-x-auto px-1 pb-1">
              <div class="flex h-24 items-end gap-1" style="width: max-content">
                <div
                  v-for="p in dailyPoints"
                  :key="p.day"
                  class="flex w-4 shrink-0 flex-col items-center gap-1"
                >
                  <div class="flex h-16 w-full items-end">
                    <div
                      class="bg-azure w-full rounded-[3px] transition-[height] duration-500"
                      :style="{
                        height: `${Math.max((p.total / (dailyMax || 1)) * 100, p.total > 0 ? 8 : 2)}%`,
                      }"
                    ></div>
                  </div>
                  <span class="text-sky/50 text-[0.5625rem] font-semibold tabular-nums">{{
                    p.day
                  }}</span>
                </div>
              </div>
            </div>
          </article>

          <!-- Spend trend over the last 6 months -->
          <article class="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p class="text-[0.9375rem] font-extrabold text-white">Tren 6 bulan terakhir</p>

            <div v-if="trendLoading" class="mt-4 h-28 animate-pulse rounded-2xl bg-white/5"></div>

            <div v-else class="mt-4 flex h-28 items-end gap-2">
              <div
                v-for="p in trendPoints"
                :key="`${p.year}-${p.month}`"
                class="flex flex-1 flex-col items-center gap-1.5"
              >
                <span class="text-[0.625rem] font-bold tabular-nums text-white">
                  {{ p.total > 0 ? formatRupiahShort(p.total) : '' }}
                </span>
                <div class="flex h-20 w-full items-end">
                  <div
                    class="bg-sky w-full rounded-md transition-[height] duration-500"
                    :style="{
                      height: `${Math.max((p.total / (trendMax || 1)) * 100, p.total > 0 ? 6 : 2)}%`,
                    }"
                  ></div>
                </div>
                <span class="text-sky/60 text-[0.6875rem] font-semibold">{{ monthAbbrev(p) }}</span>
              </div>
            </div>
          </article>

          <!-- Couple comparison -->
          <article
            v-if="coupleLinked"
            class="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4"
          >
            <p class="text-[0.9375rem] font-extrabold text-white">Kamu vs {{ partnerName }}</p>

            <div class="mt-4 flex flex-col gap-3">
              <div>
                <div class="flex items-center justify-between text-[0.8125rem] font-bold">
                  <span class="text-white">Kamu</span>
                  <span class="tabular-nums text-white">{{ formatRupiahShort(myTotal) }}</span>
                </div>
                <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    class="bg-azure h-full rounded-full transition-[width] duration-500"
                    :style="{ width: `${coupleShare(myTotal)}%` }"
                  ></div>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between text-[0.8125rem] font-bold">
                  <span class="text-white">{{ partnerName }}</span>
                  <span class="tabular-nums text-white">{{ formatRupiahShort(partnerTotal) }}</span>
                </div>
                <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    class="bg-sky h-full rounded-full transition-[width] duration-500"
                    :style="{ width: `${coupleShare(partnerTotal)}%` }"
                  ></div>
                </div>
              </div>
            </div>

            <p class="text-sky/60 mt-3 text-[0.75rem]">
              Gabungan: {{ formatRupiah(combinedTotal) }}
            </p>

            <div class="mt-4 border-t border-white/10 pt-4">
              <p class="text-sky/60 text-[0.6875rem] font-semibold tracking-widest uppercase">
                Tren gabungan 6 bulan
              </p>

              <div
                v-if="coupleTrendLoading"
                class="mt-3 h-20 animate-pulse rounded-2xl bg-white/5"
              ></div>

              <div v-else class="mt-3 flex h-20 items-end gap-2">
                <div
                  v-for="p in coupleTrendPoints"
                  :key="`${p.year}-${p.month}`"
                  class="flex flex-1 flex-col items-center gap-1"
                >
                  <div class="flex h-14 w-full items-end">
                    <div
                      class="bg-mist w-full rounded-md transition-[height] duration-500"
                      :style="{
                        height: `${Math.max((p.total / (coupleTrendMax || 1)) * 100, p.total > 0 ? 6 : 2)}%`,
                      }"
                    ></div>
                  </div>
                  <span class="text-sky/50 text-[0.625rem] font-semibold">{{
                    monthAbbrev(p)
                  }}</span>
                </div>
              </div>
            </div>
          </article>

          <!-- Largest transactions across both partners, ranked together -->
          <TopExpensesCard
            v-if="coupleLinked"
            :title="`Pengeluaran terbesar kalian berdua — ${periodLabel}`"
            :items="coupleTopExpenses"
            :loading="topExpensesLoading"
            show-owner
            :partner-name="partnerName"
          />

          <!-- Export -->
          <ExportReportCard
            class="col-span-2"
            :year="year"
            :month="month"
            :period-label="periodLabel"
            :couple-linked="coupleLinked"
            :partner-name="partnerName"
          />
        </div>
      </section>

      <BottomNav
        :avatar-url="myAvatarUrl"
        :avatar-name="auth.user?.name"
        @catat="router.push({ name: 'home' })"
      />
    </div>

    <CategoryTrendSheet
      v-model:open="categorySheetOpen"
      :category-id="selectedCategory?.category_id ?? null"
      :category-name="selectedCategory?.name ?? ''"
      :year="year"
      :month="month"
    />
    <HealthScoreSheet v-model:open="healthSheetOpen" :score="healthScore" />
  </main>
</template>
