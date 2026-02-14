// ========================================
// ERP MULTIFUNDAS - Service Worker
// Cache de archivos estáticos, network-first para API
// ========================================

var CACHE_NAME = 'erp-multifundas-v3';
var STATIC_ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/supervisora.html',
    '/layout-editor.html',
    '/css/styles.css',
    '/css/supervisora.css',
    '/css/coco-dashboard.css',
    '/js/utils.js',
    '/js/sanitize.js',
    '/js/data.js',
    '/js/app.js',
    '/js/supervisora.js',
    '/js/admin-auth.js',
    '/js/dev-switcher.js',
    '/js/supabase-config.js',
    '/js/supabase-client.js',
    '/js/database-adapter.js',
    '/js/realtime-sync.js',
    '/js/coco-dashboard.js',
    '/manifest.json',
    // Panel Operadora
    '/panel-operadora/operadora.html',
    '/panel-operadora/css/operadora.css',
    '/panel-operadora/js/operadora.js',
    '/panel-operadora/js/operadora-auth.js',
    '/panel-operadora/js/operadora-modules.js'
];

// Install: cache static assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch(function(err) {
                console.warn('[SW] Some assets failed to cache:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    console.log('[SW] Removing old cache:', name);
                    return caches.delete(name);
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // API calls (Supabase): network-first
    if (url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request);
            })
        );
        return;
    }

    // CDN resources: cache-first
    if (url.hostname.includes('cdnjs') || url.hostname.includes('fonts.googleapis')) {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                return cached || fetch(event.request).then(function(response) {
                    return caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    // Local assets: cache-first with network fallback
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request).then(function(response) {
                // Cache successful responses
                if (response && response.status === 200) {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(function() {
                // Offline fallback for HTML pages
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
