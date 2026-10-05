<script setup lang="ts">
import BottomSheet from './BottomSheet.vue'
import BaseButton from './BaseButton.vue'

withDefaults(
  defineProps<{
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    loading?: boolean
    // Most confirmations guard a destructive action, so danger styling is
    // the default — pass false for a neutral confirm.
    danger?: boolean
  }>(),
  {
    confirmLabel: 'Ya, lanjut',
    cancelLabel: 'Batal',
    loading: false,
    danger: true,
  },
)

const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <BottomSheet v-model:open="open" :title="title">
    <div class="flex flex-col gap-5">
      <p v-if="message" class="text-muted text-[0.875rem] leading-relaxed">{{ message }}</p>
      <div class="flex flex-col gap-2">
        <BaseButton
          variant="ghost"
          :class="danger ? 'text-danger!' : ''"
          :loading="loading"
          :loading-label="confirmLabel"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </BaseButton>
        <button
          type="button"
          class="text-muted py-1 text-center text-[0.8125rem] font-semibold"
          @click="open = false"
        >
          {{ cancelLabel }}
        </button>
      </div>
    </div>
  </BottomSheet>
</template>
