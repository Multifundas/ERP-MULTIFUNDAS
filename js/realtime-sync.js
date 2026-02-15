// ========================================
// ERP MULTIFUNDAS - Realtime Sync Bridge v2
// Sincroniza localStorage ↔ Supabase en tiempo real
// Mejoras: conflict resolution, timestamps, retry queue
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
        'historial_alertas_admin',
        'cola_procesos_operadores',
        'supervisora_maquinas',
        'historial_asignaciones_completadas'
    ];

    // ID único por tab/dispositivo (más robusto que solo random)
    var deviceId = 'dev-' + (crypto.randomUUID ? crypto.randomUUID().substr(0, 8) :
        Math.random().toString(36).substr(2, 9)) + '-' + Date.now();

    // Flag para evitar re-trigger al escribir desde Realtime
    var _writingFromRemote = false;

    // Referencia al cliente Supabase
    var sb = window.supabaseInstance;

    // Timers de debounce por key
    var _debounceTimers = {};

    // Canal Realtime
    var _channel = null;

    // Timestamps de última escritura por key (para conflict resolution)
    var _lastWriteTimestamps = {};

    // Cola de reintentos
    var _retryQueue = [];
    var _retryTimer = null;
    var _retryDelay = 1000; // Empieza en 1s, exponential backoff

    // Promise de inicialización
    var _resolveReady;
    var syncReady = new Promise(function(resolve) {
        _resolveReady = resolve;
    });

    // Estado de conexión
    var _syncStatus = {
        connected: false,
        lastSync: null,
        pendingWrites: 0,
        failedWrites: 0
    };

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
            var result = await sb.from('sync_state').select('key, value, updated_at, updated_by');

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
                    var isEmpty = valueStr === '{}' || valueStr === '[]' || valueStr === '{"activos":{},"historial":[]}';
                    var localData = localStorage.getItem(row.key);

                    // Conflict resolution: comparar timestamps
                    var remoteTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;
                    var localTime = _lastWriteTimestamps[row.key] || 0;

                    if (!isEmpty && remoteTime >= localTime) {
                        // Remoto es más reciente o no hay local → usar remoto
                        _writingFromRemote = true;
                        _originalSetItem.call(localStorage, row.key, valueStr);
                        _writingFromRemote = false;
                        _lastWriteTimestamps[row.key] = remoteTime;
                        loaded++;
                    } else if (localData && localData !== '{}' && localData !== '[]' && !isEmpty) {
                        // Local es más reciente → subir a Supabase
                        pushToSupabase(row.key, localData);
                        loaded++;
                    } else if (localData && localData !== '{}' && localData !== '[]' && isEmpty) {
                        // Supabase vacío, local tiene datos → subir
                        pushToSupabase(row.key, localData);
                        loaded++;
                    }
                }
            }

            _syncStatus.connected = true;
            _syncStatus.lastSync = new Date().toISOString();
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
            _lastWriteTimestamps[key] = Date.now();
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

        _syncStatus.pendingWrites++;

        _debounceTimers[key] = setTimeout(function() {
            pushToSupabase(key, value);
            delete _debounceTimers[key];
        }, 300);
    }

    function pushToSupabase(key, valueStr) {
        var jsonValue;
        try {
            jsonValue = JSON.parse(valueStr);
        } catch (e) {
            console.error('[Sync] Error parsing value para ' + key + ':', e.message);
            _syncStatus.pendingWrites = Math.max(0, _syncStatus.pendingWrites - 1);
            return;
        }

        sb.from('sync_state')
            .upsert({
                key: key,
                value: jsonValue,
                updated_by: deviceId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
            .then(function(result) {
                _syncStatus.pendingWrites = Math.max(0, _syncStatus.pendingWrites - 1);
                if (result.error) {
                    console.error('[Sync] Error escribiendo ' + key + ':', result.error.message);
                    _syncStatus.failedWrites++;
                    // Agregar a cola de reintentos
                    _enqueueRetry(key, valueStr);
                } else {
                    _syncStatus.lastSync = new Date().toISOString();
                }
            })
            .catch(function(e) {
                _syncStatus.pendingWrites = Math.max(0, _syncStatus.pendingWrites - 1);
                _syncStatus.failedWrites++;
                _enqueueRetry(key, valueStr);
            });
    }

    // ========================================
    // 3.5 RETRY QUEUE (con exponential backoff)
    // ========================================
    function _enqueueRetry(key, valueStr) {
        // Evitar duplicados
        _retryQueue = _retryQueue.filter(function(item) { return item.key !== key; });
        _retryQueue.push({ key: key, value: valueStr, attempts: 0 });

        if (!_retryTimer) {
            _scheduleRetry();
        }
    }

    function _scheduleRetry() {
        if (_retryQueue.length === 0) {
            _retryTimer = null;
            _retryDelay = 1000;
            return;
        }

        _retryTimer = setTimeout(function() {
            var item = _retryQueue.shift();
            if (item) {
                item.attempts++;
                if (item.attempts <= 5) {
                    pushToSupabase(item.key, item.value);
                } else {
                    console.warn('[Sync] Abandonando retry para ' + item.key + ' después de 5 intentos');
                }
            }
            _retryDelay = Math.min(_retryDelay * 2, 60000); // Max 60s
            _scheduleRetry();
        }, _retryDelay);
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

                    // Conflict resolution: solo aplicar si es más reciente
                    var remoteTime = row.updated_at ? new Date(row.updated_at).getTime() : Date.now();
                    var localTime = _lastWriteTimestamps[row.key] || 0;

                    if (remoteTime < localTime) {
                        console.log('[Sync] Ignorando cambio remoto obsoleto para:', row.key);
                        return;
                    }

                    console.log('[Sync] Cambio remoto recibido:', row.key, 'de', row.updated_by);
                    _lastWriteTimestamps[row.key] = remoteTime;

                    // Actualizar localStorage sin re-triggear el push
                    _writingFromRemote = true;
                    _originalSetItem.call(localStorage, row.key, JSON.stringify(row.value));
                    _writingFromRemote = false;

                    // Disparar evento storage para que otras tabs se enteren
                    try {
                        window.dispatchEvent(new StorageEvent('storage', {
                            key: row.key,
                            newValue: JSON.stringify(row.value),
                            storageArea: localStorage
                        }));
                    } catch (e) {}

                    // Disparar evento custom para que la UI pueda reaccionar
                    window.dispatchEvent(new CustomEvent('sync-update', {
                        detail: { key: row.key, value: row.value, source: row.updated_by }
                    }));
                }
            )
            .subscribe(function(status) {
                _syncStatus.connected = (status === 'SUBSCRIBED');
                console.log('[Sync] Realtime status:', status);
            });
    }

    // ========================================
    // 5. INICIALIZACIÓN
    // ========================================
    loadInitialState().then(function() {
        subscribeToChanges();
        console.log('[Sync] Bridge v2 inicializado. Device ID:', deviceId);
    });

    // ========================================
    // 6. EXPORTAR
    // ========================================
    window.syncReady = syncReady;
    window.SYNC_DEVICE_ID = deviceId;
    window.getSyncStatus = function() { return Object.assign({}, _syncStatus); };

})();
