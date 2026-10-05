<script setup lang="ts">
import { ref } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import CreateCategorySheet from './CreateCategorySheet.vue'
import type { CategoryOverviewItem } from '@/features/dashboard/types'

defineProps<{
  categories: CategoryOverviewItem[]
}>()

const emit = defineEmits<{ changed: [] }>()

const open = defineModel<boolean>('open', { required: true })

const editSheetOpen = ref(false)
const editTarget = ref<CategoryOverviewItem | null>(null)

function onAddNew() {
  editTarget.value = null
  editSheetOpen.value = true
}

function onPick(category: CategoryOverviewItem) {
  editTarget.value = category
  editSheetOpen.value = true
}

function onSaved() {
  emit('changed')
}
</script>

<template>
  <BottomSheet v-model:open="open" title="Kategori">
    <div class="flex flex-col gap-3">
      <button
        type="button"
        class="border-azure/30 text-azure active:bg-mist/40 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed p-3.5 text-[0.875rem] font-bold transition-colors"
        @click="onAddNew"
      >
        + Tambah kategori baru
      </button>

      <p v-if="categories.length === 0" class="text-muted text-[0.875rem] leading-relaxed">
        Belum ada kategori. Bikin satu dulu lewat tombol di atas.
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
            <span class="text-muted shrink-0 text-[0.75rem] font-semibold">Ubah</span>
          </button>
        </li>
      </ul>
    </div>

    <CreateCategorySheet
      v-model:open="editSheetOpen"
      :existing-category-id="editTarget?.category_id"
      :existing-name="editTarget?.name"
      :existing-icon="editTarget?.icon"
      @saved="onSaved"
    />
  </BottomSheet>
</template>
