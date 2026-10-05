<script setup lang="ts">
defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { required: true })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-50 bg-black/40" @click.self="open = false">
        <Transition
          appear
          enter-active-class="transition duration-250 ease-out"
          enter-from-class="translate-y-full"
          leave-active-class="transition duration-200 ease-in"
          leave-to-class="translate-y-full"
        >
          <div
            class="rounded-t-sheet safe-bottom bg-sheet absolute inset-x-0 bottom-0 px-6 pt-6 shadow-[0_-12px_40px_-12px_rgba(7,28,60,0.45)]"
          >
            <div class="mx-auto mb-5 h-1 w-10 rounded-full bg-black/10" aria-hidden="true"></div>
            <div class="mb-5 flex items-center justify-between">
              <h2 class="text-ink text-[1.0625rem] font-extrabold">{{ title }}</h2>
              <button
                type="button"
                class="text-muted hover:text-ink -mr-2 rounded-lg p-2 transition-colors"
                aria-label="Tutup"
                @click="open = false"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                  aria-hidden="true"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            <slot />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
