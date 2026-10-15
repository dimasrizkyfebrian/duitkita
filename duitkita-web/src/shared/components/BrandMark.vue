<script setup lang="ts">
// The official app icon, same art as the installed-PWA/home-screen icon so
// the in-app header and the launcher read as one brand.
withDefaults(defineProps<{ withWordmark?: boolean }>(), { withWordmark: true })
</script>

<template>
  <div class="flex items-center gap-2.5">
    <img
      src="/icons/logo-mark-128.png"
      width="28"
      height="28"
      decoding="async"
      class="h-7 w-7 shrink-0 rounded-lg"
      :alt="withWordmark ? '' : 'DuitKita'"
    />
    <span v-if="withWordmark" class="text-[0.9375rem] font-extrabold tracking-[-0.01em] text-white">
      DuitKita
    </span>
  </div>
</template>
