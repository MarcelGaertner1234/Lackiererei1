/**
 * 🚀 FAHRZEUGANNAHME-APP - SERVICE WORKER
 * Version: 1.0
 * Erstellt: 2025-10-28
 *
 * Funktionen:
 * - Offline-Funktionalität für HTML/CSS/JS
 * - Cache-Strategien für Firebase SDKs
 * - Stale-While-Revalidate für Bilder
 * - Network-Only für Firestore Data (Echtzeit erforderlich)
 */

// ============================================
// KONFIGURATION
// ============================================

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `fahrzeugannahme-${CACHE_VERSION}`;
const IMAGE_CACHE = `fahrzeugannahme-images-${CACHE_VERSION}`;
const FIREBASE_CACHE = `fahrzeugannahme-firebase-${CACHE_VERSION}`;

// Statische Assets die IMMER gecacht werden sollen
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/annahme.html',
    '/abnahme.html',
    '/liste.html',
    '/kanban.html',
    '/kunden.html',
    '/kalender.html',
    '/material.html',
    '/admin-einstellungen.html',
    '/admin-dashboard.html',
    '/mitarbeiter-verwaltung.html',
    '/offline.html', // Fallback-Seite

    // CSS Files
    '/design-system.css',
    '/components.css',
    '/animations.css',
    '/mobile-first.css',
    '/css/chat-widget.css',

    // JavaScript Files
    '/firebase-config.js',
    '/js/auth-manager.js',
    '/js/error-handler.js',
    '/js/migration-helper.js',
    '/js/settings-manager.js',
    '/js/ai-agent-tools.js',
    '/js/app-events.js',
    '/js/chat-widget.js',
    '/image-optimizer.js',
    '/storage-monitor.js'
];

// Firebase SDK URLs (extern, sollen gecacht werden)
const FIREBASE_SDK_URLS = [
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-functions-compat.js'
];

// ============================================
// INSTALL EVENT - Cache initialisieren
// ============================================

self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        (async () => {
            try {
                // Static Assets Cache
                const staticCache = await caches.open(CACHE_NAME);
                console.log('[SW] Caching static assets...');

                // Cache Assets nacheinander (um Fehler einzeln zu behandeln)
                for (const asset of STATIC_ASSETS) {
                    try {
                        await staticCache.add(asset);
                    } catch (error) {
                        console.warn(`[SW] Failed to cache ${asset}:`, error.message);
                    }
                }

                // Firebase SDK Cache
                const firebaseCache = await caches.open(FIREBASE_CACHE);
                console.log('[SW] Caching Firebase SDKs...');

                for (const sdk of FIREBASE_SDK_URLS) {
                    try {
                        await firebaseCache.add(sdk);
                    } catch (error) {
                        console.warn(`[SW] Failed to cache Firebase SDK ${sdk}:`, error.message);
                    }
                }

                console.log('[SW] ✅ Installation complete!');

                // Skip Waiting - aktiviere neuen SW sofort
                self.skipWaiting();

            } catch (error) {
                console.error('[SW] ❌ Installation failed:', error);
            }
        })()
    );
});

// ============================================
// ACTIVATE EVENT - Alte Caches löschen
// ============================================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        (async () => {
            try {
                // Lösche alte Cache-Versionen
                const cacheNames = await caches.keys();
                const validCaches = [CACHE_NAME, IMAGE_CACHE, FIREBASE_CACHE];

                await Promise.all(
                    cacheNames.map(cacheName => {
                        if (!validCaches.includes(cacheName)) {
                            console.log(`[SW] 🗑️ Deleting old cache: ${cacheName}`);
                            return caches.delete(cacheName);
                        }
                    })
                );

                console.log('[SW] ✅ Activation complete!');

                // Claim Clients - übernehme Kontrolle über alle Tabs sofort
                await self.clients.claim();

            } catch (error) {
                console.error('[SW] ❌ Activation failed:', error);
            }
        })()
    );
});

// ============================================
// FETCH EVENT - Request Handling
// ============================================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignoriere Chrome Extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // Ignoriere Firestore/Storage Requests (müssen IMMER aktuell sein)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firebasestorage.googleapis.com') ||
        url.hostname.includes('firestore.googleapis.com')) {
        return; // Network-Only für Firebase Data
    }

    // Route zu passender Cache-Strategie
    event.respondWith(handleRequest(request));
});

// ============================================
// REQUEST HANDLER - Cache-Strategien
// ============================================

async function handleRequest(request) {
    const url = new URL(request.url);

    try {
        // 1. FIREBASE SDKs - Cache First (selten aktualisiert)
        if (url.hostname === 'www.gstatic.com' && url.pathname.includes('firebase')) {
            return await cacheFirst(request, FIREBASE_CACHE);
        }

        // 2. BILDER - Stale-While-Revalidate (schnell + Background Update)
        if (request.destination === 'image' ||
            url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            return await staleWhileRevalidate(request, IMAGE_CACHE);
        }

        // 3. HTML/CSS/JS - Network First + Cache Fallback
        if (request.destination === 'document' ||
            request.destination === 'style' ||
            request.destination === 'script' ||
            url.pathname.match(/\.(html|css|js)$/i)) {
            return await networkFirst(request, CACHE_NAME);
        }

        // 4. ALLE ANDEREN - Network First
        return await networkFirst(request, CACHE_NAME);

    } catch (error) {
        console.error('[SW] ❌ Request failed:', error);

        // Fallback zu offline.html für HTML-Requests
        if (request.destination === 'document') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('/offline.html');
        }

        return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// ============================================
// CACHE-STRATEGIEN
// ============================================

/**
 * Cache First: Cache zuerst prüfen, dann Network
 * Perfekt für: Firebase SDKs (selten aktualisiert)
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        console.log(`[SW] 📦 Cache Hit: ${request.url}`);
        return cached;
    }

    console.log(`[SW] 🌐 Cache Miss, fetching: ${request.url}`);
    const response = await fetch(request);

    // Cache die Response für zukünftige Requests
    if (response.ok) {
        cache.put(request, response.clone());
    }

    return response;
}

/**
 * Network First: Network zuerst versuchen, dann Cache Fallback
 * Perfekt für: HTML/CSS/JS (immer neue Versionen bevorzugen)
 */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        console.log(`[SW] 🌐 Network First: ${request.url}`);
        const response = await fetch(request);

        // Cache die Response für Offline-Fallback
        if (response.ok) {
            cache.put(request, response.clone());
        }

        return response;

    } catch (error) {
        console.log(`[SW] 📦 Network failed, using cache: ${request.url}`);
        const cached = await cache.match(request);

        if (cached) {
            return cached;
        }

        throw error;
    }
}

/**
 * Stale-While-Revalidate: Cache sofort zurückgeben, aber Background Update
 * Perfekt für: Bilder (schnelles Laden, Hintergrund-Aktualisierung)
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    // Background Update starten (ohne zu warten)
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(error => {
        console.warn(`[SW] Background update failed: ${request.url}`, error);
    });

    // Wenn Cache vorhanden, sofort zurückgeben
    if (cached) {
        console.log(`[SW] 📦 Stale cache, revalidating in background: ${request.url}`);
        return cached;
    }

    // Sonst auf Network warten
    console.log(`[SW] 🌐 No cache, waiting for network: ${request.url}`);
    return fetchPromise;
}

// ============================================
// MESSAGE HANDLER - Kommunikation mit Client
// ============================================

self.addEventListener('message', (event) => {
    console.log('[SW] 📬 Message received:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                console.log('[SW] 🗑️ All caches cleared!');
                event.ports[0].postMessage({ success: true });
            })
        );
    }

    if (event.data.type === 'GET_CACHE_SIZE') {
        event.waitUntil(
            (async () => {
                const cacheNames = await caches.keys();
                let totalSize = 0;

                for (const cacheName of cacheNames) {
                    const cache = await caches.open(cacheName);
                    const keys = await cache.keys();

                    for (const request of keys) {
                        const response = await cache.match(request);
                        if (response) {
                            const blob = await response.blob();
                            totalSize += blob.size;
                        }
                    }
                }

                console.log(`[SW] 📊 Total cache size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
                event.ports[0].postMessage({
                    totalSize,
                    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
                });
            })()
        );
    }
});

// ============================================
// ERROR HANDLER
// ============================================

self.addEventListener('error', (event) => {
    console.error('[SW] ❌ Global error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] ❌ Unhandled rejection:', event.reason);
});

console.log('[SW] 🚀 Service Worker loaded!');
