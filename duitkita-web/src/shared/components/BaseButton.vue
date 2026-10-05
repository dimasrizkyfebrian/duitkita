<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    variant?: 'primary' | 'ghost'
    loading?: boolean
    disabled?: boolean
    loadingLabel?: string
  }>(),
  {
    type: 'button',
    variant: 'primary',
    loading: false,
    disabled: false,
    loadingLabel: 'Tunggu sebentar...',
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="rounded-control focus-visible:ring-azure/40 relative w-full py-4 text-[0.9375rem] font-extrabold tracking-[-0.01em] transition-all duration-150 focus-visible:ring-4 focus-visible:outline-none disabled:opacity-45"
    :class="
      variant === 'primary'
        ? 'bg-navy text-white shadow-[0_8px_20px_-8px_rgba(13,71,161,0.7)] active:translate-y-px active:shadow-none enabled:active:bg-ink-soft'
        : 'text-navy bg-mist/70 active:bg-mist'
    "
  >
    <span v-if="loading" class="inline-flex items-center justify-center gap-2">
      <span
        class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      ></span>
      {{ loadingLabel }}
    </span>
    <slot v-else />
  </button>
</template>
