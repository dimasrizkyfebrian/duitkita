<script setup lang="ts">
import BrandMark from '@/shared/components/BrandMark.vue'

defineProps<{ eyebrow?: string; title: string; subtitle?: string }>()
</script>

<template>
  <main class="bg-ink relative flex min-h-screen flex-col overflow-hidden">
    <!-- Ambient glow, keyed to the brand blues rather than a generic vignette. -->
    <div
      class="pointer-events-none absolute -top-28 -left-20 h-80 w-80 rounded-full opacity-50 blur-3xl"
      style="background: radial-gradient(circle, var(--color-navy) 0%, transparent 70%)"
      aria-hidden="true"
    ></div>

    <header class="animate-intro safe-top relative px-6 pb-9">
      <BrandMark />

      <p
        v-if="eyebrow"
        class="text-sky mt-9 text-[0.6875rem] font-semibold tracking-[0.14em] uppercase"
      >
        {{ eyebrow }}
      </p>
      <h1
        class="mt-2 text-[1.75rem] leading-[1.15] font-extrabold tracking-tight text-balance text-white"
      >
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-sky/85 mt-2.5 max-w-[32ch] text-[0.9375rem] leading-relaxed">
        {{ subtitle }}
      </p>
    </header>

    <!-- The form lives on a sheet anchored to the bottom edge, so the primary
         action always lands inside thumb reach on a phone. -->
    <section
      class="animate-sheet bg-sheet rounded-t-sheet safe-bottom relative mt-auto px-6 pt-8 shadow-[0_-12px_40px_-12px_rgba(7,28,60,0.45)]"
    >
      <slot />

      <footer v-if="$slots.footer" class="text-muted mt-6 text-center text-sm">
        <slot name="footer" />
      </footer>
    </section>
  </main>
</template>
