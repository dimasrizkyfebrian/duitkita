<script setup lang="ts">
import { computed, ref, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    type?: 'text' | 'email' | 'password'
    autocomplete?: string
    placeholder?: string
    required?: boolean
    hint?: string
    error?: string
  }>(),
  {
    type: 'text',
    required: false,
  },
)

const model = defineModel<string>({ required: true })
const id = useId()

const revealed = ref(false)
const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type))
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
      {{ label }}
    </label>

    <div class="relative">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :required="required"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error || hint ? `${id}-note` : undefined"
        class="rounded-control placeholder:text-muted/45 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:outline-none"
        :class="[
          isPassword ? 'pr-13' : '',
          error
            ? 'border-danger focus:ring-danger/20 focus:ring-4'
            : 'border-hairline focus:border-azure focus:ring-azure/15 focus:ring-4',
        ]"
      />

      <button
        v-if="isPassword"
        type="button"
        class="text-muted hover:text-navy focus-visible:ring-azure/30 absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg p-2.5 transition-colors focus-visible:ring-4 focus-visible:outline-none"
        :aria-label="revealed ? 'Sembunyikan password' : 'Tampilkan password'"
        :aria-pressed="revealed"
        @click="revealed = !revealed"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M1.5 12S5.7 5.5 12 5.5 22.5 12 22.5 12 18.3 18.5 12 18.5 1.5 12 1.5 12Z" />
          <circle cx="12" cy="12" r="3.25" />
          <line v-if="!revealed" x1="4.2" y1="19.8" x2="19.8" y2="4.2" />
        </svg>
      </button>
    </div>

    <p v-if="error" :id="`${id}-note`" class="text-danger text-[0.8125rem]">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-note`" class="text-muted text-[0.8125rem]">{{ hint }}</p>
  </div>
</template>
