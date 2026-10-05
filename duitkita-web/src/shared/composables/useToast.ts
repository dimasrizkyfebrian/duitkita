import { readonly, ref } from 'vue'

export type ToastType = 'success' | 'error'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

// Module-level state: toasts are ephemeral UI, shared by every component that
// raises one. A Pinia store would add indirection without buying anything.
const items = ref<Toast[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 0

function dismiss(id: number) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  items.value = items.value.filter((toast) => toast.id !== id)
}

function push(type: ToastType, message: string, duration: number) {
  const id = nextId++
  items.value = [...items.value, { id, type, message }]
  timers.set(
    id,
    setTimeout(() => dismiss(id), duration),
  )
  return id
}

export function useToast() {
  return {
    items: readonly(items),
    success: (message: string) => push('success', message, 3500),
    error: (message: string) => push('error', message, 5000),
    dismiss,
  }
}
