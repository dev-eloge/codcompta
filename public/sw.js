/*
 * CODCompta service worker: makes the site installable as an app and keeps it usable on a weak network.
 *
 * - Built files (/build/…, named with a hash) and icons: served from the cache, fetched once.
 * - Pages: always asked to the server first (figures must be fresh); without network, an offline page.
 * - Everything else (forms, Inertia requests, the API): never cached.
 * - Sika's notifications: shown when the server sends one, a tap opens the right page.
 */
const VERSION = 'codcompta-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon-192.png', '/icon-512.png', '/favicon.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(VERSION)
            .then((cache) => cache.addAll(PRECACHE))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    // Hashed build files and icons never change: cache first.
    if (url.pathname.startsWith('/build/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(VERSION).then((cache) => cache.put(request, copy));
                        }

                        return response;
                    }),
            ),
        );

        return;
    }

    // Full page loads (not Inertia's JSON visits): network first, offline page when there is no network.
    if (request.mode === 'navigate') {
        event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    }
});

self.addEventListener('push', (event) => {
    let message = {};
    try {
        message = event.data ? event.data.json() : {};
    } catch {
        message = { body: event.data ? event.data.text() : '' };
    }

    event.waitUntil(
        self.registration.showNotification(message.title || 'Sika, de CODCompta', {
            body: message.body || '',
            icon: '/icon-192.png',
            badge: '/images/pwa/badge-96.png',
            tag: message.tag,
            renotify: Boolean(message.tag),
            lang: 'fr',
            data: { url: message.url || '/objectifs' },
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/objectifs', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
            if (open) {
                return open.focus().then((client) => client.navigate(target));
            }

            return self.clients.openWindow(target);
        }),
    );
});
