const base = new URL('./', self.registration.scope)
const prefix = 'patience-' + base.pathname + '-'
const name = prefix + VERSION
const index = new URL('index.html', base).href
const shell = new Set(SHELL.map(file => new URL(file, base).href))

self.addEventListener('install', event => {
  event.waitUntil(caches.open(name).then(cache => cache.addAll([...shell])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(prefix) && key !== name)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.open(name)).match(index)))
  } else if (shell.has(request.url)) {
    event.respondWith(caches.open(name).then(async cache => (await cache.match(request.url, { ignoreVary: true })) ?? fetch(request)))
  }
})
