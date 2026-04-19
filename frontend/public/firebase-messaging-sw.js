importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA5edV3oEYkU-04XujKOtED8AC7T0KmGXM",
    authDomain: "chatapp-557f5.firebaseapp.com",
    projectId: "chatapp-557f5",
    storageBucket: "chatapp-557f5.firebasestorage.app",
    messagingSenderId: "926513330612",
    appId: "1:926513330612:web:09e0a73f21ec6699299ae1",
});

const CACHE_NAME = 'chatapp-v1';

// CRA hashes JS/CSS filenames on every build (e.g. main.a3f9c2.chunk.js)
// so we only cache the app shell routes, not the bundle filenames directly.
// The bundles themselves are covered by the browser's HTTP cache via
// Cache-Control headers set by your hosting provider.
const STATIC_ASSETS = ['/'];

// ── Install: cache the app shell ──────────────────────────────────────
self.addEventListener('install', (event) => {
    // Take control immediately without waiting for old tabs to close
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).catch((err) => {
            console.error('Cache install failed:', err);
        })
    );
});

// ── Activate: delete old caches from previous versions ────────────────
// When you deploy a new version, bump CACHE_NAME to 'chatapp-v2' etc.
// This event runs and cleans up the old 'chatapp-v1' cache automatically.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            // Take control of all open tabs immediately
            return self.clients.claim();
        })
    );
});

// ── Fetch: serve from cache, fall back to network ─────────────────────
self.addEventListener('fetch', (event) => {
    // Never intercept non-GET requests (POST, DELETE etc.)
    if (event.request.method !== 'GET') return;

    // Never cache API calls — always go to network for live data
    if (event.request.url.includes('/api/')) return;

    // Never cache FCM/Firebase requests
    if (event.request.url.includes('firebaseio.com')) return;
    if (event.request.url.includes('googleapis.com')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // Only cache valid successful responses
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                });
                return response;
            });
        })
    );
});

// ── FCM: background messages ──────────────────────────────────────────
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload);

    const { title, body } = payload.notification;

    self.registration.showNotification(title, {
        body: body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        data: payload.data
    });
});

// ── Notification click: focus or open the app ─────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/');
        })
    );
});