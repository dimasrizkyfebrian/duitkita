/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
}

precacheAndRoute(self.__WB_MANIFEST)

// SPA deep-link fallback — a direct/offline navigation to e.g. /laporan
// isn't itself a precached entry, so it falls back to the precached shell
// just like generateSW's default navigateFallback did before this file
// switched the project from generateSW to injectManifest. API calls are
// never navigations (fetch, not <a>/location), so no denylist is needed.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// registerType is 'prompt' (vite.config.ts) specifically so a new worker
// never takes over an open session mid-request — see UpdatePrompt.vue. That
// only works if this worker waits for an explicit message instead of
// calling self.skipWaiting() on its own; generateSW wired this up for us
// automatically, injectManifest doesn't.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

interface PushPayload {
  notification_id: string
  type: string
  title: string
  body: string
}

// Where tapping a push notification should land, by the backend's
// NotificationType — mirrors model/domain/notification.go. Falls back to
// the dashboard for any type not listed here.
const NOTIFICATION_ROUTES: Record<string, string> = {
  bill_reminder: '/pengingat',
  recurring_expense: '/pengingat',
  weekly_summary: '/laporan',
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload | null = null
  try {
    payload = event.data?.json() ?? null
  } catch {
    payload = null
  }
  if (!payload) return

  const url = NOTIFICATION_ROUTES[payload.type] ?? '/'

  event.waitUntil(
    self.registration.showNotification(payload.title || 'DuitKita', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.notification_id,
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? '/'

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = clients.find((client) => client.url.startsWith(self.location.origin))
      if (existing) {
        await existing.focus()
        if ('navigate' in existing) {
          await (existing as WindowClient).navigate(url)
        }
        return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
