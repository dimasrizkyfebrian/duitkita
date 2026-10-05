<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BottomSheet from '@/shared/components/BottomSheet.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { createCategory, deleteCategory, updateCategory } from '../api/category.api'

const props = defineProps<{
  // When set, the sheet edits (and can delete) that existing category
  // instead of creating a new one — same form, different endpoint
  // underneath, mirroring SetBudgetSheet's create/edit split.
  existingCategoryId?: string
  existingName?: string
  existingIcon?: string
}>()

const emit = defineEmits<{ saved: [] }>()

const open = defineModel<boolean>('open', { required: true })
const toast = useToast()

const isEdit = computed(() => Boolean(props.existingCategoryId))

const name = ref('')
const icon = ref('')
const loading = ref(false)

const confirmingDelete = ref(false)
const deleting = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    name.value = props.existingName ?? ''
    icon.value = props.existingIcon ?? ''
    confirmingDelete.value = false
  }
})

async function onSubmit() {
  loading.value = true
  try {
    if (isEdit.value && props.existingCategoryId) {
      await updateCategory(props.existingCategoryId, { name: name.value, icon: icon.value })
      toast.success(`Kategori ${name.value} udah diubah.`)
    } else {
      await createCategory({ name: name.value, icon: icon.value || undefined })
      toast.success(`Kategori ${name.value} udah dibuat.`)
    }
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err))
  } finally {
    loading.value = false
  }
}

async function onDelete() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    return
  }
  if (!props.existingCategoryId) return

  deleting.value = true
  try {
    await deleteCategory(props.existingCategoryId)
    toast.success(`Kategori ${props.existingName} udah dihapus.`)
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error(apiErrorMessage(err, 'Gagal menghapus kategori.'))
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <BottomSheet v-model:open="open" :title="isEdit ? 'Ubah kategori' : 'Bikin kategori'">
    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <div class="flex gap-3">
        <BaseInput
          v-model="icon"
          label="Ikon"
          placeholder="🍜"
          hint="Opsional"
          class="w-20 shrink-0"
        />
        <BaseInput
          v-model="name"
          label="Nama kategori"
          placeholder="Misalnya: Makan, Transport"
          required
          class="flex-1"
        />
      </div>
      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="!name.trim()"
        :loading-label="isEdit ? 'Menyimpan...' : 'Membuat...'"
      >
        {{ isEdit ? 'Simpan perubahan' : 'Bikin kategori' }}
      </BaseButton>

      <div v-if="isEdit" class="flex flex-col gap-2">
        <BaseButton
          type="button"
          variant="ghost"
          class="text-danger!"
          :loading="deleting"
          loading-label="Menghapus..."
          @click="onDelete"
        >
          {{ confirmingDelete ? 'Yakin? Tap lagi buat hapus' : 'Hapus kategori' }}
        </BaseButton>
        <button
          v-if="confirmingDelete"
          type="button"
          class="text-muted text-center text-[0.8125rem] font-semibold"
          @click="confirmingDelete = false"
        >
          Batal
        </button>
      </div>
    </form>
  </BottomSheet>
</template>
