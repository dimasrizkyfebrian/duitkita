<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconWallet from '@/shared/icons/IconWallet.vue'
import type { Institution } from '../types'

const props = withDefaults(
  defineProps<{
    institution: Pick<Institution, 'code' | 'name' | 'type' | 'logo_path'>
    // sm: inside chips · md: list rows · lg: a sheet's header
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

// Logos are added to public/institutions/ one at a time, so a logo_path
// pointing at a file that isn't there yet is expected — fall back to the
// institution's initials instead of a broken-image icon.
const broken = ref(false)
watch(
  () => props.institution.logo_path,
  () => (broken.value = false),
)

const showImage = computed(() => Boolean(props.institution.logo_path) && !broken.value)

const initials = computed(() => {
  const words = props.institution.name.trim().split(/\s+/)
  const letters =
    words.length >= 2
      ? `${words[0]?.charAt(0)}${words[1]?.charAt(0)}`
      : (words[0] ?? '').slice(0, 2)
  return letters.toUpperCase()
})

// Most bank and e-wallet logos are wordmarks, so they sit in a wide tile
// rather than a circle: a circle shrinks "CIMB NIAGA" or "superbank" past
// reading. Every state (logo, initials, cash) uses the same tile so rows
// line up.
const tiles = {
  sm: 'h-[1.625rem] w-[3.25rem] rounded-md px-1 py-0.5 text-[0.625rem]',
  md: 'h-9 w-16 rounded-lg px-1.5 py-1 text-[0.75rem]',
  lg: 'h-10 w-20 rounded-xl px-2 py-1.5 text-[0.8125rem]',
} as const

const walletIcon = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center overflow-hidden font-extrabold"
    :class="[tiles[size], showImage ? 'border border-black/5 bg-white' : 'bg-mist text-navy']"
    aria-hidden="true"
  >
    <img
      v-if="showImage"
      :src="institution.logo_path ?? undefined"
      alt=""
      class="max-h-full max-w-full object-contain"
      @error="broken = true"
    />
    <IconWallet v-else-if="institution.type === 'cash'" :class="walletIcon[size]" />
    <template v-else>{{ initials }}</template>
  </span>
</template>
