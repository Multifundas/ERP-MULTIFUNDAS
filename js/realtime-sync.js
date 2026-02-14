// ========================================
// ERP MULTIFUNDAS - Realtime Sync Bridge
// Sincroniza localStorage ↔ Supabase en tiempo real
// Sin modificar el código existente de operadora/supervisora
// ========================================

(function() {
    'use strict';

    // Keys compartidas que se sincronizan entre dispositivos
    var SYNC_KEYS = [
        'asignaciones_estaciones',
        'estado_maquinas',
        'pedidos_erp',
        'pedidos_activos',
        'notificaciones_coco',
        'mensajes_operadoras',
        'historial_produccion',
        'tiempos_muertos',
        'notificaciones_admin_to_supervisora',
        'historial_alertas_admin'
    ];

    // ID único por tab/dispositivo para evitar loops
    var deviceId = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();

    // Flag para evitar re-trigger al escribir desde Realtime
    var _writingFromRemote = false;

    // Referencia al cliente Supabase
    var sb = window.supabaseInstance;

    // Timers de debounce por key
    var _debounceTimers = {};

    // Canal Realtime
    var _channel = null;

    // Promise de inicialización
    var _resolveReady;
    var syncReady = new Promise(function(resolve) {
        _resolveReady = resolve;
    });

    // ========================================
    // 1. CARGA INICIAL: Supabase → localStorage
    // ========================================
    async function loadInitialState() {
        if (!sb) {
            console.warn('[Sync] Supabase no disponible, sincronización deshabilitada');
            _resolveReady();
            return;
        }

        try {
            var result = await sb.from('sync_state').select('key, value');

            if (result.error) {
                console.error('[Sync] Error cargando estado inicial:', result.error.message);
                _resolveReady();
                return;
            }

            var rows = result.data || [];
            var loaded = 0;

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                if (SYNC_KEYS.indexOf(row.key) !== -1) {
                    var valueStr = JSON.stringify(row.value);
                    // Solo escribir si hay datos reales (no vacío)
                    var isEmpty = valueStr === '{}' || valueStr === '[]' || valueStr === '{"activos":{},"historial":[]}';
                    var localData = localStorage.getItem(row.key);

                    if (!isEmpty) {
                        // Supabase tiene datos → escribir a localStorage
                        _writingFromRemote = true;
                        _originalSetItem.call(localStorage, row.key, valueStr);
                        _writingFromRemote = false;
                        loaded++;
                    } else if (localData && localData !== '{}' && localData !== '[]') {
                        // localStorage tiene datos y Supabase está vacío → subir a Supabase
                        pushToSupabase(row.key, localData);
                        loaded++;
                    }
                }
            }

            console.log('[Sync] Estado inicial cargado:', loaded, 'keys sincronizadas');
        } catch (e) {
            console.error('[Sync] Error en carga inicial:', e.message);
        }

        _resolveReady();
    }

    // ========================================
    // 2. MONKEY-PATCH localStorage.setItem
    // ========================================
    var _originalSetItem = localStorage.setItem;

    localStorage.setItem = function(key, value) {
        // Siempre escribir a localStorage normalmente
        _originalSetItem.call(localStorage, key, value);

        // Si es una key compartida y NO viene de un update remoto, sincronizar
        if (SYNC_KEYS.indexOf(key) !== -1 && !_writingFromRemote && sb) {
            debouncedPush(key, value);
        }
    };

    // ========================================
    // 3. DEBOUNCED WRITE a Supabase
    // ========================================
    function debouncedPush(key, value) {
        if (_debounceTimers[key]) {
            clearTimeout(_debounceTimers[key]);
        }

        _debounceTimers[key] = setTimeout(function() {
            pushToSupabase(key, value);
            delete _debounceTimers[key];
        }, 300);
    }

    function pushToSupabase(key, valueStr) {
        try {
            var jsonValue = JSON.parse(valueStr);

            sb.from('sync_state')
                .upsert({
                    key: key,
                    value: jsonValue,
                    updated_by: deviceId
                }, { onConflict: 'key' })
                .then(function(result) {
                    if (result.error) {
                        console.error('[Sync] Error escribiendo ' + key + ':', result.error.message);
                    }
                });
        } catch (e) {
            console.error('[Sync] Error parsing value para ' + key + ':', e.message);
        }
    }

    // ========================================
    // 4. SUPABASE REALTIME SUBSCRIPTION
    // ========================================
    function subscribeToChanges() {
        if (!sb) return;

        _channel = sb
            .channel('sync-bridge')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sync_state' },
                function(payload) {
                    var row = payload.new;

                    // Ignorar cambios propios
                    if (row.updated_by === deviceId) return;

                    // Ignorar keys que no nos interesan
                    if (SYNC_KEYS.indexOf(row.key) === -1) return;

                    console.log('[Sync] Cambio remoto recibido:', row.key, 'de', row.updated_by);

                    // Actualizar localStorage sin re-triggear el push
                    _writingFromRemote = true;
                    _originalSetItem.call(localStorage, row.key, JSON.stringify(row.value));
                    _writingFromRemote = false;

                    // Disparar evento storage para que otras tabs del mismo navegador se enteren
                    try {
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: row.key,
                            newValue: JSON.stringify(row.value),
                            storageArea: localStorage
                        }));
                    } catch (e) {
                        // StorageEvent constructor no soportado en navegadores viejos
                    }

                    // Disparar evento custom para que la UI pueda reaccionar
                    window.dispatchEvent(new CustomEvent('sync-update', {
                        detail: { key: row.key, value: row.value, source: row.updated_by }
                    }));
                }
            )
            .subscribe(function(status) {
                console.log('[Sync] Realtime status:', status);
            });
    }

    // ========================================
    // 5. INICIALIZACIÓN
    // ========================================
    loadInitialState().then(function() {
        subscribeToChanges();
        console.log('[Sync] Bridge inicializado. Device ID:', deviceId);
    });

    // Exportar
    window.syncReady = syncReady;
    window.SYNC_DEVICE_ID = deviceId;

})();
