<script setup lang="ts">
// Two overlapping discs: two people, and the overlap is the money they share.
withDefaults(defineProps<{ withWordmark?: boolean }>(), { withWordmark: true })
</script>

<template>
  <div class="flex items-center gap-2.5">
    <svg
      viewBox="0 0 42 26"
      class="h-6 w-[42px] shrink-0"
      role="img"
      aria-label="DuitKita"
      focusable="false"
    >
      <circle cx="13" cy="13" r="12" fill="var(--color-azure)" opacity="0.95" />
      <circle cx="29" cy="13" r="12" fill="var(--color-sky)" opacity="0.78" />
    </svg>
    <span v-if="withWordmark" class="text-[0.9375rem] font-extrabold tracking-[-0.01em] text-white">
      DuitKita
    </span>
  </div>
</template>
