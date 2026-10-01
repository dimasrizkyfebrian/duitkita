<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '@/shared/components/BrandMark.vue'
import BottomNav from '@/shared/components/BottomNav.vue'
import { useToast } from '@/shared/composables/useToast'
import { formatRupiah, formatRupiahShort } from '@/shared/utils/currency'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

// PLACEHOLDER — none of this is wired to the API yet. Shown so the shell reads
// as a working app; the UI labels it as an example so the figures are never
// mistaken for the user's real money.
const sample = {
  spent: 2_450_000,
  budget: 4_000_000,
  mine: 1_230_000,
  partner: 1_220_000,
  expenses: [
    { id: 1, title: 'Makan siang berdua', category: 'Makan', by: 'Kamu', amount: 85_000 },
    { id: 2, title: 'Bensin motor', category: 'Transport', by: 'Pasangan', amount: 50_000 },
    { id: 3, title: 'Belanja bulanan', category: 'Belanja', by: 'Kamu', amount: 620_000 },
    { id: 4, title: 'Listrik & air', category: 'Tagihan', by: 'Pasangan', amount: 410_000 },
  ],
}

const usage = computed(() => Math.round((sample.spent / sample.budget) * 100))
const remaining = computed(() => sample.budget - sample.spent)

const quickActions = [
  { key: 'catat', label: 'Catat' },
  { key: 'budget', label: 'Budget' },
  { key: 'laporan', label: 'Laporan' },
  { key: 'pasangan', label: 'Pasangan' },
] as const

function notReady(label: string) {
  toast.error(`${label} belum jadi, masih kami garap ya.`)
}

async function onLogout() {
  await auth.logout()
  toast.success('Kamu udah keluar. Sampai ketemu lagi!')
  router.push({ name: 'login' })
}
</script>

<template>
  <main class="bg-ink flex min-h-screen flex-col pb-28">
    <header class="safe-top px-5 pb-6">
      <div class="flex items-start justify-between">
        <BrandMark />
        <button
          type="button"
          class="text-sky/70 hover:text-white -mt-1 rounded-lg p-2 transition-colors"
          aria-label="Keluar"
          @click="onLogout"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
            <polyline points="18 15 21 12 18 9" />
            <line x1="21" y1="12" x2="10" y2="12" />
          </svg>
        </button>
      </div>

      <p class="text-sky/80 mt-7 text-[0.8125rem]">Hai, {{ auth.user?.name }}</p>
      <h1 class="mt-1 text-[1.5rem] font-extrabold tracking-tight text-white">Bulan ini</h1>

      <!-- Spend card: the one figure people open the app to check. -->
      <article class="bg-navy relative mt-5 overflow-hidden rounded-3xl border border-white/10 p-5">
        <div
          class="pointer-events-none absolute -top-16 -right-10 h-44 w-44 rounded-full opacity-40 blur-2xl"
          style="background: radial-gradient(circle, var(--color-azure) 0%, transparent 70%)"
          aria-hidden="true"
        ></div>

        <div class="relative flex items-start justify-between gap-3">
          <div>
            <p class="text-sky/80 text-[0.6875rem] font-semibold tracking-widest uppercase">
              Total pengeluaran
            </p>
            <p
              class="mt-1.5 text-[2rem] leading-none font-extrabold tracking-tight text-white tabular-nums"
            >
              {{ formatRupiah(sample.spent) }}
            </p>
          </div>
          <span
            class="bg-white/15 shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-bold tracking-wide text-white uppercase"
          >
            Contoh
          </span>
        </div>

        <div class="relative mt-5">
          <div class="flex items-baseline justify-between text-[0.75rem]">
            <span class="text-sky/85 font-semibold">{{ usage }}% dari budget</span>
            <span class="text-sky/70 tabular-nums"> sisa {{ formatRupiahShort(remaining) }} </span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              class="bg-sky h-full rounded-full transition-[width] duration-500"
              :style="{ width: `${Math.min(usage, 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- The part a generic wallet app wouldn't have: whose spending is whose. -->
        <div class="relative mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <div>
            <div class="flex items-center gap-1.5">
              <span class="bg-azure h-2 w-2 rounded-full" aria-hidden="true"></span>
              <span class="text-sky/75 text-[0.6875rem] font-semibold">Kamu</span>
            </div>
            <p class="mt-1 text-[0.9375rem] font-extrabold text-white tabular-nums">
              {{ formatRupiahShort(sample.mine) }}
            </p>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="bg-sky h-2 w-2 rounded-full" aria-hidden="true"></span>
              <span class="text-sky/75 text-[0.6875rem] font-semibold">Pasangan</span>
            </div>
            <p class="mt-1 text-[0.9375rem] font-extrabold text-white tabular-nums">
              {{ formatRupiahShort(sample.partner) }}
            </p>
          </div>
        </div>
      </article>
    </header>

    <section class="bg-sheet rounded-t-sheet flex-1 px-5 pt-7">
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="action in quickActions"
          :key="action.key"
          type="button"
          class="bg-mist/60 active:bg-mist rounded-control flex flex-col items-center gap-2 px-1 py-3.5 transition-colors"
          @click="notReady(action.label)"
        >
          <span class="bg-navy/10 flex h-9 w-9 items-center justify-center rounded-full">
            <span class="bg-navy h-2 w-2 rounded-full" aria-hidden="true"></span>
          </span>
          <span class="text-navy text-[0.6875rem] font-bold">{{ action.label }}</span>
        </button>
      </div>

      <div class="mt-7 flex items-center justify-between">
        <h2 class="text-ink text-[0.9375rem] font-extrabold">Pengeluaran terakhir</h2>
        <button
          type="button"
          class="text-azure text-[0.75rem] font-bold"
          @click="notReady('Riwayat lengkap')"
        >
          Lihat semua
        </button>
      </div>

      <ul class="mt-3 flex flex-col">
        <li
          v-for="expense in sample.expenses"
          :key="expense.id"
          class="border-hairline flex items-center gap-3 border-b py-3.5 last:border-b-0"
        >
          <span
            class="bg-mist text-navy flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-extrabold"
            aria-hidden="true"
          >
            {{ expense.category.charAt(0) }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-ink truncate text-[0.875rem] font-bold">{{ expense.title }}</p>
            <p class="text-muted mt-0.5 text-[0.75rem]">
              {{ expense.category }} · {{ expense.by }}
            </p>
          </div>
          <p class="text-ink shrink-0 text-[0.875rem] font-extrabold tabular-nums">
            {{ formatRupiah(expense.amount) }}
          </p>
        </li>
      </ul>

      <p class="text-muted mt-5 text-center text-[0.75rem] leading-relaxed">
        Angka di atas masih contoh. Nanti otomatis keisi begitu kamu mulai nyatat pengeluaran.
      </p>
    </section>

    <BottomNav />
  </main>
</template>
