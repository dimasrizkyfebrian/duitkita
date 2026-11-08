<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import ExpenseForm from '@/features/expense/components/ExpenseForm.vue'
import IncomeForm from '@/features/income/components/IncomeForm.vue'
import type { CategoryOverviewItem } from '@/features/dashboard/types'

defineProps<{
  // Only categories that already have a budget this period.
  categories: CategoryOverviewItem[]
}>()

const emit = defineEmits<{ created: [] }>()

const open = defineModel<boolean>('open', { required: true })

type Kind = 'expense' | 'income'

const tabs: { kind: Kind; label: string; title: string }[] = [
  { kind: 'expense', label: 'Keluar', title: 'Catat pengeluaran' },
  { kind: 'income', label: 'Masuk', title: 'Catat pemasukan' },
]

const idBase = useId()
const tabId = (kind: Kind) => `${idBase}-tab-${kind}`
const panelId = (kind: Kind) => `${idBase}-panel-${kind}`

const kind = ref<Kind>('expense')
const title = computed(() => tabs.find((t) => t.kind === kind.value)!.title)

// Every open starts on "Keluar", whatever tab it was closed on.
watch(open, (isOpen) => {
  if (isOpen) kind.value = 'expense'
})

// Expenses still need the parent to refetch its budget overview; incomes
// reload their own list inside the form.
function onExpenseCreated() {
  open.value = false
  emit('created')
}

function onIncomeCreated() {
  open.value = false
}
</script>

<template>
  <BottomSheet v-model:open="open" :title="title">
    <div role="tablist" aria-label="Jenis catatan" class="mb-5 flex gap-2">
      <button
        v-for="tab in tabs"
        :id="tabId(tab.kind)"
        :key="tab.kind"
        type="button"
        role="tab"
        :aria-selected="kind === tab.kind"
        :aria-controls="panelId(tab.kind)"
        class="rounded-control focus-visible:ring-azure/30 min-h-11 flex-1 border px-3.5 py-2.5 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none"
        :class="
          kind === tab.kind ? 'border-navy bg-navy text-white' : 'border-hairline text-ink bg-white'
        "
        @click="kind = tab.kind"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Both forms stay mounted (v-show, not v-if) so what's typed in one
         survives a peek at the other tab. -->
    <div
      v-show="kind === 'expense'"
      :id="panelId('expense')"
      role="tabpanel"
      :aria-labelledby="tabId('expense')"
    >
      <ExpenseForm :categories="categories" @created="onExpenseCreated" />
    </div>
    <div
      v-show="kind === 'income'"
      :id="panelId('income')"
      role="tabpanel"
      :aria-labelledby="tabId('income')"
    >
      <IncomeForm @created="onIncomeCreated" />
    </div>
  </BottomSheet>
</template>
