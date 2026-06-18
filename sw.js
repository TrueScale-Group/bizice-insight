/* BizICE Insight — Service Worker (read-only PWA cache)
   • App shell (HTML/JS/CSS/images) → network-first → cache fallback (SPA)
   • Firestore/Firebase/Google APIs → ผ่านตรง (Firebase จัดการ offline เอง)
   • 1.8.0 ถูกแทนตอน build (ดู vite.config.js) → เลขแคช = เวอร์ชันแอพ
*/
const CACHE_VERSION = 'bizice-insight-v1.8.0'
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-insight.png', './icon-192.png']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(APP_SHELL).catch(() => null)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // 🔥 Firebase / Firestore / Google API → ผ่านตรง
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebase.googleapis.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) return

  // 🌐 Google Fonts → cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const clone = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, clone)); return res
        }).catch(() => cached || new Response('', { status: 504 }))
      )
    )
    return
  }

  // 🏠 App shell (same-origin) → network-first → cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(req, clone))
        }
        return res
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    )
  }
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
