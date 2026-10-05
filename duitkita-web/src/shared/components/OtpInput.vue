<script setup lang="ts">
import { computed, ref, useId } from 'vue'

// Styling only — the message itself is surfaced as a toast.
withDefaults(defineProps<{ invalid?: boolean }>(), { invalid: false })

const model = defineModel<string>({ required: true })
const id = useId()
const focused = ref(false)

const slots = computed(() => Array.from({ length: 6 }, (_, i) => model.value[i] ?? ''))
const activeIndex = computed(() => Math.min(model.value.length, 5))

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  model.value = input.value.replace(/\D/g, '').slice(0, 6)
  // Keep the DOM in sync when the sanitiser rejected a character, otherwise
  // the input would keep showing what the user typed.
  input.value = model.value
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
      Kode verifikasi
    </span>

    <!-- One real input sits invisibly over six display slots: native paste,
         numeric keypad and OTP autofill keep working, and we still get a
         segmented look without six inputs fighting over focus. -->
    <div class="relative">
      <input
        :id="id"
        :value="model"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        aria-label="Kode verifikasi 6 digit"
        :aria-invalid="invalid"
        class="absolute inset-0 z-10 h-full w-full cursor-pointer tracking-[3rem] text-transparent caret-transparent opacity-0 outline-none"
        @input="onInput"
        @focus="focused = true"
        @blur="focused = false"
      />

      <div class="grid grid-cols-6 gap-2" aria-hidden="true">
        <div
          v-for="(digit, i) in slots"
          :key="i"
          class="rounded-control flex h-14 items-center justify-center border text-xl font-extrabold transition-all duration-150"
          :class="[
            invalid
              ? 'border-danger bg-danger/5 text-danger'
              : digit
                ? 'border-navy/35 bg-mist/60 text-navy'
                : 'border-hairline bg-white text-navy',
            focused && i === activeIndex && !invalid
              ? 'border-azure ring-azure/20 scale-[1.03] ring-4'
              : '',
          ]"
        >
          <span v-if="digit">{{ digit }}</span>
          <span
            v-else-if="focused && i === activeIndex"
            class="bg-azure h-5 w-0.5 animate-pulse rounded-full"
          ></span>
          <span v-else class="bg-hairline h-1 w-1 rounded-full"></span>
        </div>
      </div>
    </div>
  </div>
</template>
