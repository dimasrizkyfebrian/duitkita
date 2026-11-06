<script setup lang="ts">
import { formatRupiah } from '@/shared/utils/currency'
import AccountLogo from '@/features/account/components/AccountLogo.vue'
import type { AccountSpend } from '../types'

defineProps<{
  title: string
  items: AccountSpend[]
  loading: boolean
}>()
</script>

<template>
  <article class="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-4">
    <p class="text-[0.9375rem] font-extrabold text-white">{{ title }}</p>

    <div v-if="loading" class="mt-4 h-28 animate-pulse rounded-2xl bg-white/5"></div>

    <p v-else-if="items.length === 0" class="text-sky/60 mt-3 text-[0.8125rem]">
      Belum ada pengeluaran tercatat periode ini.
    </p>

    <ul v-else class="mt-3 flex flex-col gap-3.5">
      <li v-for="item in items" :key="item.account_id ?? 'none'">
        <div class="flex items-center gap-3">
          <AccountLogo v-if="item.institution" :institution="item.institution" />
          <span
            v-else
            class="text-sky/60 flex h-9 w-16 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[0.8125rem] font-extrabold"
            aria-hidden="true"
          >
            ?
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[0.8125rem] font-bold text-white">
              {{ item.account_id ? item.name : 'Tanpa akun' }}
            </p>
            <p class="text-sky/50 mt-0.5 truncate text-[0.6875rem]">
              <template v-if="item.institution">{{ item.institution.name }}</template>
              <template v-if="item.archived"> · Diarsipkan</template>
              <template v-if="!item.account_id">Belum dipilih akunnya</template>
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-[0.8125rem] font-extrabold text-white tabular-nums">
              {{ formatRupiah(item.total) }}
            </p>
            <p class="text-sky/60 text-[0.6875rem] font-bold tabular-nums">{{ item.share }}%</p>
          </div>
        </div>
        <div class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            class="h-full rounded-full transition-[width] duration-500"
            :class="item.account_id ? 'bg-azure' : 'bg-white/25'"
            :style="{ width: `${item.share}%` }"
          ></div>
        </div>
      </li>
    </ul>
  </article>
</template>
