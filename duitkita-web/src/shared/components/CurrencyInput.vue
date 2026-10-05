<script setup lang="ts">
import { useId } from 'vue'
import { formatRupiah } from '@/shared/utils/currency'

defineProps<{ label: string }>()

const model = defineModel<number>({ required: true })
const id = useId()

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 12)
  input.value = digits
  model.value = Number(digits || 0)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
      {{ label }}
    </label>
    <div class="relative">
      <span
        class="text-ink pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[0.9375rem] font-bold"
      >
        Rp
      </span>
      <input
        :id="id"
        :value="model || ''"
        type="text"
        inputmode="numeric"
        placeholder="0"
        class="rounded-control border-hairline focus:border-azure focus:ring-azure/15 w-full border bg-white py-3.5 pr-4 pl-10 text-[0.9375rem] font-bold tabular-nums transition-colors duration-150 focus:ring-4 focus:outline-none"
        @input="onInput"
      />
    </div>
    <p v-if="model > 0" class="text-muted text-[0.8125rem]">{{ formatRupiah(model) }}</p>
  </div>
</template>
