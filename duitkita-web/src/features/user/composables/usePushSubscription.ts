import { ref } from 'vue'
import { getPushPublicKey, subscribePush, unsubscribePush } from '../api/user.api'

/** Browser denied the permission prompt (or it was already denied before
 * this call) — the caller can't recover from this without the user
 * changing their browser's site settings. */
export class PushPermissionDeniedError extends Error {}

/** This browser/OS combination has no Push API at all (older Safari
 * desktop, or iOS Safari running outside of an installed PWA). */
export class PushUnsupportedError extends Error {}

// Typed Uint8Array<ArrayBuffer> explicitly (not the plain Uint8Array a bare
// `new Uint8Array(n)` infers) — PushManager.subscribe()'s applicationServerKey
// wants BufferSource, which a SharedArrayBuffer-backed view doesn't satisfy.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

/** Manages this device's Web Push subscription: browser permission,
 * pushManager.subscribe(), and syncing the result with the backend. The
 * source of truth for "is this device subscribed" is always the browser's
 * own PushManager, not a flag we persist ourselves — it's the only thing
 * that can't drift out of sync with reality (cleared site data, revoked
 * permission, etc. all show up there immediately). */
export function usePushSubscription() {
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
  const subscribed = ref(false)
  const checked = ref(false)
  const loading = ref(false)

  async function refresh() {
    if (!isSupported) {
      checked.value = true
      return
    }
    try {
      const registration = await navigator.serviceWorker.ready
      subscribed.value = (await registration.pushManager.getSubscription()) !== null
    } finally {
      checked.value = true
    }
  }

  async function subscribe() {
    if (!isSupported) {
      throw new PushUnsupportedError()
    }

    loading.value = true
    try {
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      let createdNewSubscription = false

      if (!subscription) {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          throw new PushPermissionDeniedError()
        }

        const { public_key } = await getPushPublicKey()
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(public_key),
        })
        createdNewSubscription = true
      }

      try {
        await subscribePush(subscription.toJSON() as PushSubscriptionJSON)
      } catch (err) {
        // The backend never learned about this subscription, so a device we
        // just created it on would otherwise look "subscribed" to the
        // browser forever while never actually receiving anything — roll it
        // back so a retry starts clean instead of silently going nowhere.
        if (createdNewSubscription) {
          await subscription.unsubscribe().catch(() => {})
        }
        throw err
      }

      subscribed.value = true
    } finally {
      loading.value = false
    }
  }

  async function unsubscribe() {
    if (!isSupported) return

    loading.value = true
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        // Revoke locally first: this is what the toggle's state actually
        // reflects, and it must succeed for the UI to be honest about "off".
        // The backend DELETE afterwards is best-effort cleanup — if it
        // fails, the next push to this endpoint gets a 404/410 from the
        // push service itself and the backend lazy-cleans the row then.
        await subscription.unsubscribe()
        unsubscribePush(endpoint).catch((err) => {
          console.warn('[push] server-side unsubscribe cleanup failed:', err)
        })
      }
      subscribed.value = false
    } finally {
      loading.value = false
    }
  }

  return { isSupported, subscribed, checked, loading, refresh, subscribe, unsubscribe }
}
