import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

// ── Share target: intercept BEFORE workbox touches the event ──────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request))
  }
})

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('studentos-share', 1)
    req.onupgradeneeded = e => e.target.result.createObjectStore('shares')
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = reject
  })
}

async function handleShare(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf')
    if (file && file.type === 'application/pdf') {
      const db = await openShareDb()
      await new Promise((resolve, reject) => {
        const tx = db.transaction('shares', 'readwrite')
        tx.objectStore('shares').put({ name: file.name, blob: file, ts: Date.now() }, 'pending')
        tx.oncomplete = resolve
        tx.onerror = reject
      })
    }
  } catch (err) {
    console.error('[SW] share-target error:', err)
  }
  return Response.redirect('/?share-incoming=1', 303)
}

// ── Precaching ────────────────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Runtime caching ───────────────────────────────────────────────────────────
registerRoute(
  ({ url }) => /supabase\.co/.test(url.hostname),
  new NetworkFirst({ cacheName: 'supabase-api', networkTimeoutSeconds: 10 })
)
