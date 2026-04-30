// Lightweight service-worker registration helper.
//
// Only registers in production builds, and only on http(s) origins. The SW
// itself uses a network-first strategy for HTML and stale-while-revalidate
// for static assets, so a buggy cache can never trap users on a stale build
// while they have connectivity.

const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      /^127(?:\.\d{1,3}){3}$/.test(window.location.hostname))
);

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'production') return;
  if (!('serviceWorker' in navigator)) return;

  // Same-origin check: CRA serves from PUBLIC_URL which may be on a CDN.
  const publicUrl = new URL(
    process.env.PUBLIC_URL || '',
    window.location.href
  );
  if (publicUrl.origin !== window.location.origin) return;

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL || ''}/sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        // When a new SW takes over, force updates to come through promptly.
        registration.onupdatefound = () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.onstatechange = () => {
            if (
              installing.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.info('[sw] new content available; will be used on next load.');
            }
          };
        };
      })
      .catch((err) => {
        console.error('[sw] registration failed:', err);
      });

    if (isLocalhost) {
      // Surface localhost issues; otherwise stay quiet.
      navigator.serviceWorker.ready.then(() => {
        console.info('[sw] ready (localhost dev preview)');
      });
    }
  });
}

export function unregisterServiceWorker() {
  if (typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((err) => console.error('[sw] unregister failed:', err));
}
