<script setup lang="ts">
import { RouterView } from 'vue-router'
import ToastHost from '@/shared/components/ToastHost.vue'
import UpdatePrompt from '@/shared/components/UpdatePrompt.vue'
import IOSInstallNudge from '@/shared/components/IOSInstallNudge.vue'
</script>

<template>
  <RouterView />
  <ToastHost />
  <UpdatePrompt />
  <IOSInstallNudge />
</template>
