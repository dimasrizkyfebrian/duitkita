<script setup lang="ts">
import { ref } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import SetBudgetSheet from './SetBudgetSheet.vue'
import { formatRupiah } from '@/shared/utils/currency'
import type { CategoryOverviewItem } from '@/features/dashboard/types'

defineProps<{
  categories: CategoryOverviewItem[]
  year: number
  month: number
}>()

const emit = defineEmits<{ changed: [] }>()

const open = defineModel<boolean>('open', { required: true })

const editSheetOpen = ref(false)
const editTarget = ref<CategoryOverviewItem | null>(null)

function onPick(category: CategoryOverviewItem) {
  editTarget.value = category
  editSheetOpen.value = true
}

function onSaved() {
  emit('changed')
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Budget bulan ini">
    <p v-if="categories.length === 0" class="text-muted text-[0.875rem] leading-relaxed">
      Belum ada kategori. Bikin kategori dulu lewat Quick Actions.
    </p>

    <ul v-else class="flex flex-col gap-2">
      <li v-for="category in categories" :key="category.category_id">
        <button
          type="button"
          class="border-hairline bg-white active:bg-mist/40 flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors"
          @click="onPick(category)"
        >
          <span
            class="bg-mist flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9375rem]"
            :class="category.icon ? '' : 'text-navy text-[0.8125rem] font-extrabold'"
            aria-hidden="true"
          >
            {{ category.icon || category.name.charAt(0) }}
          </span>
          <span class="text-ink min-w-0 flex-1 truncate text-[0.875rem] font-bold">
            {{ category.name }}
          </span>
          <span
            class="shrink-0 text-[0.8125rem] font-bold tabular-nums"
            :class="category.budget > 0 ? 'text-ink' : 'text-azure'"
          >
            {{ category.budget > 0 ? formatRupiah(category.budget) : 'Atur' }}
          </span>
        </button>
      </li>
    </ul>

    <SetBudgetSheet
      v-if="editTarget"
      v-model:open="editSheetOpen"
      :category-id="editTarget.category_id"
      :category-name="editTarget.name"
      :year="year"
      :month="month"
      :existing-budget-id="editTarget.budgetId"
      :existing-amount="editTarget.budget > 0 ? editTarget.budget : undefined"
      @saved="onSaved"
    />
  </BottomSheet>
</template>
