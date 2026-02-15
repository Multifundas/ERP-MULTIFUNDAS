// ========================================
// ERP MULTIFUNDAS - Push Notifications Manager (Mejora #3)
// Gestión de suscripciones push y envío de notificaciones locales
// ========================================

(function() {
    'use strict';

    var PushManager = {
        _subscription: null,
        _permission: null,

        // Verificar si push está soportado
        isSupported: function() {
            return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        },

        // Obtener estado actual del permiso
        getPermission: function() {
            if (!this.isSupported()) return 'unsupported';
            return Notification.permission; // 'granted', 'denied', 'default'
        },

        // Solicitar permiso de notificaciones
        requestPermission: async function() {
            if (!this.isSupported()) return 'unsupported';

            var result = await Notification.requestPermission();
            this._permission = result;

            if (result === 'granted') {
                console.log('[Push] Permiso concedido');
            }
            return result;
        },

        // Mostrar notificación local (sin necesidad de push server)
        notify: function(title, options) {
            if (Notification.permission !== 'granted') {
                console.warn('[Push] Sin permiso para notificaciones');
                return null;
            }

            options = options || {};
            var defaultOptions = {
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-72.png',
                tag: 'erp-' + Date.now(),
                vibrate: [200, 100, 200]
            };

            var mergedOptions = Object.assign({}, defaultOptions, options);

            // Usar Service Worker para notificaciones persistentes
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(function(registration) {
                    registration.showNotification(title, mergedOptions);
                });
                return true;
            }

            // Fallback: API de Notification directa
            try {
                return new Notification(title, mergedOptions);
            } catch (e) {
                console.error('[Push] Error mostrando notificación:', e);
                return null;
            }
        },

        // Notificaciones específicas del ERP
        alertaPedidoAtrasado: function(pedido) {
            return this.notify('Pedido Atrasado', {
                body: (pedido.codigo || 'Pedido') + ': ' + (pedido.mensaje || 'Producción insuficiente'),
                tag: 'alerta-pedido-' + pedido.pedidoId,
                data: { tipo: 'pedido_atrasado', pedidoId: pedido.pedidoId, url: '/supervisora.html' },
                requireInteraction: true,
                actions: [
                    { action: 'ver_detalle', title: 'Ver detalle' }
                ]
            });
        },

        alertaEstacionInactiva: function(estacionId, minutos) {
            return this.notify('Estación Inactiva', {
                body: 'Estación ' + estacionId + ' sin actividad por ' + minutos + ' minutos',
                tag: 'estacion-inactiva-' + estacionId,
                data: { tipo: 'estacion_inactiva', estacionId: estacionId, url: '/supervisora.html' }
            });
        },

        alertaAnomalia: function(anomalia) {
            return this.notify('Anomalía Detectada', {
                body: anomalia.mensaje || 'Producción por debajo del promedio',
                tag: 'anomalia-' + Date.now(),
                data: { tipo: 'anomalia', url: '/supervisora.html' }
            });
        },

        mensajeOperadora: function(mensaje) {
            return this.notify('Mensaje de Supervisora', {
                body: mensaje.texto || mensaje.body || 'Nuevo mensaje',
                tag: 'mensaje-' + Date.now(),
                data: { tipo: 'mensaje_operadora', url: '/panel-operadora/operadora.html' }
            });
        },

        // Inicializar: solicitar permiso si no se ha pedido
        init: async function() {
            if (!this.isSupported()) {
                console.log('[Push] Notificaciones push no soportadas en este navegador');
                return;
            }

            this._permission = Notification.permission;

            if (this._permission === 'default') {
                // No solicitar automáticamente - esperar interacción del usuario
                console.log('[Push] Permiso pendiente. Se solicitará cuando el usuario interactúe.');
            } else if (this._permission === 'granted') {
                console.log('[Push] Notificaciones push habilitadas');
            }
        }
    };

    // Auto-inicializar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { PushManager.init(); });
    } else {
        PushManager.init();
    }

    window.PushNotifications = PushManager;

})();
