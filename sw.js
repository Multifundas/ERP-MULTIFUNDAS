// ========================================
// ERP MULTIFUNDAS - Service Worker
// Network-first para archivos propios, cache-first para CDN
// ========================================

var CACHE_NAME = 'erp-multifundas-v27';
var STATIC_ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/supervisora.html',
    '/layout-editor.html',
    '/css/erp-base.css',
    '/css/styles.css',
    '/css/supervisora.css',
    '/css/coco-dashboard.css',
    '/js/utils.js',
    '/js/sanitize.js',
    '/js/erp-core.js',
    '/js/push-notifications.js',
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
    // Módulos ERP (extraídos de app.js)
    '/js/modules/app-dashboard.js',
    '/js/modules/app-pedidos.js',
    '/js/modules/app-clientes.js',
    '/js/modules/app-productos.js',
    '/js/modules/app-personal.js',
    '/js/modules/app-reportes.js',
    '/js/modules/app-admin.js',
    '/js/modules/app-advanced.js',
    '/js/modules/app-ai-assistant.js',
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

// Fetch handler
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);

    // API calls (Supabase): network-only, no cache
    if (url.hostname.includes('supabase')) {
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request);
            })
        );
        return;
    }

    // CDN resources (libraries, fonts): cache-first (never change)
    if (url.hostname.includes('cdnjs') ||
        url.hostname.includes('fonts.googleapis') ||
        url.hostname.includes('cdn.jsdelivr')) {
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

    // Local assets (HTML, CSS, JS): network-first with cache fallback
    // This ensures updates are always visible without needing cache busting
    event.respondWith(
        fetch(event.request).then(function(response) {
            // Cache successful responses for offline use
            if (response && response.status === 200) {
                var responseClone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, responseClone);
                });
            }
            return response;
        }).catch(function() {
            // Offline: serve from cache
            return caches.match(event.request).then(function(cached) {
                if (cached) return cached;
                // Last resort fallback for HTML pages
                if (event.request.headers.get('accept') &&
                    event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

// ========================================
// WEB PUSH NOTIFICATIONS (Mejora #3)
// Recibe push desde servidor y muestra notificación
// ========================================

// Manejar notificaciones push entrantes
self.addEventListener('push', function(event) {
    var data = { title: 'ERP Multifundas', body: 'Nueva notificación', icon: '/icons/icon-192.png' };

    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }

    var options = {
        body: data.body || 'Notificación del sistema',
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/icon-72.png',
        tag: data.tag || 'erp-notification',
        data: data.data || {},
        actions: data.actions || [],
        vibrate: [200, 100, 200],
        requireInteraction: data.requireInteraction || false
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'ERP Multifundas', options)
    );
});

// Manejar click en notificación
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    var url = '/';
    var data = event.notification.data || {};

    // Dirigir según tipo de notificación
    if (data.tipo === 'pedido_atrasado' || data.tipo === 'alerta_entrega') {
        url = '/supervisora.html';
    } else if (data.tipo === 'estacion_inactiva' || data.tipo === 'anomalia') {
        url = '/supervisora.html';
    } else if (data.tipo === 'mensaje_operadora') {
        url = '/panel-operadora/operadora.html';
    } else if (data.url) {
        url = data.url;
    }

    // Si se hizo click en una acción específica
    if (event.action === 'ver_detalle' && data.url) {
        url = data.url;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // Si ya hay una ventana abierta, enfocarla
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url.indexOf(url) !== -1) {
                    return client.focus();
                }
            }
            // Si no, abrir nueva ventana
            return clients.openWindow(url);
        })
    );
});

// Manejar cierre de notificación (para analytics)
self.addEventListener('notificationclose', function(event) {
    // Opcionalmente trackear que se cerró sin interactuar
    console.log('[SW] Notificación cerrada:', event.notification.tag);
});
