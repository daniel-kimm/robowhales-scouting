/* Robowhales Scouting service worker.
 *
 * Goals:
 *   - The app shell (HTML + JS + CSS) must load even with no network so
 *     scouters can keep using the app after a tab close in the stands.
 *   - Updates must propagate quickly when online — we never want scouters
 *     stuck on an old version of the form.
 *   - Firestore traffic must NEVER be intercepted; it has its own retry
 *     and offline behaviour and we don't want to corrupt it.
 *
 * Strategy:
 *   - Static hashed assets (CRA emits content-hashed filenames):
 *     stale-while-revalidate from the runtime cache.
 *   - HTML navigations: network-first with cache fallback. So online users
 *     always see the latest build; offline users get the last good one.
 *   - Everything else (Firestore, auth API, fonts, etc.): pass through
 *     untouched.
 */

const VERSION = 'v1';
const RUNTIME_CACHE = `rw-runtime-${VERSION}`;
const HTML_CACHE = `rw-html-${VERSION}`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(HTML_CACHE).then((cache) => cache.add('/index.html').catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== RUNTIME_CACHE && k !== HTML_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    /\/static\/.+\.(?:js|css|png|jpg|jpeg|svg|gif|woff2?|ttf|ico)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never touch Firestore / Google APIs / our auth API. Let them go straight
  // to the network — they have their own offline handling.
  if (
    url.hostname.endsWith('googleapis.com') ||
    url.hostname.endsWith('gstatic.com') ||
    url.hostname.endsWith('firebaseio.com') ||
    url.hostname.endsWith('cloudfunctions.net') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(HTML_CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match('/index.html', { cacheName: HTML_CACHE })
            .then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                cache.put(request, response.clone()).catch(() => {});
              }
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
  }
});
