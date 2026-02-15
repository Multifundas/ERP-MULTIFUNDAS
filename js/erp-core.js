// ========================================
// ERP MULTIFUNDAS - CORE UTILITIES
// Mejoras críticas: seguridad, validación, offline, debounce
// Se carga DESPUÉS de sanitize.js y ANTES de otros módulos
// ========================================

(function() {
    'use strict';

    // ========================================
    // FEATURE FLAGS (Mejora #17)
    // Control centralizado de features sin redeploy
    // ========================================
    var _featureDefaults = {
        USE_SUPABASE: typeof USE_SUPABASE !== 'undefined' ? USE_SUPABASE : true,
        OFFLINE_QUEUE: true,
        VIRTUAL_SCROLL: true,
        AUDIT_VISUAL: true,
        BATCH_OPERATIONS: true,
        SERVER_PAGINATION: true,
        SAFE_LOGS: true
    };

    function _loadFeatureFlags() {
        try {
            var saved = localStorage.getItem('erp_feature_flags');
            if (saved) return Object.assign({}, _featureDefaults, JSON.parse(saved));
        } catch (e) {}
        return Object.assign({}, _featureDefaults);
    }

    var FeatureFlags = {
        _flags: _loadFeatureFlags(),
        isEnabled: function(flag) {
            return !!this._flags[flag];
        },
        set: function(flag, value) {
            this._flags[flag] = !!value;
            try { localStorage.setItem('erp_feature_flags', JSON.stringify(this._flags)); } catch (e) {}
        },
        getAll: function() {
            return Object.assign({}, this._flags);
        }
    };

    // ========================================
    // SAFE JSON PARSE (Mejora #4)
    // Previene crashes por JSON corrupto en localStorage
    // ========================================
    function safeJsonParse(str, defaultValue) {
        if (defaultValue === undefined) defaultValue = null;
        if (str === null || str === undefined || str === '') return defaultValue;
        try {
            return JSON.parse(str);
        } catch (e) {
            if (FeatureFlags.isEnabled('SAFE_LOGS')) {
                console.warn('[safeJsonParse] Error parsing JSON:', e.message, '- returning default');
            }
            return defaultValue;
        }
    }

    function safeLocalGet(key, defaultValue) {
        if (defaultValue === undefined) defaultValue = null;
        try {
            var raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[safeLocalGet] Error reading key "' + key + '":', e.message);
            return defaultValue;
        }
    }

    function safeLocalSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('[safeLocalSet] Error writing key "' + key + '":', e.message);
            return false;
        }
    }

    // ========================================
    // ENHANCED SANITIZATION (Mejora #3)
    // Contextos adicionales más allá de texto HTML
    // ========================================
    var Sanitize = {
        // Texto para insertar en HTML (ya existe como S())
        html: function(str) {
            return typeof S === 'function' ? S(str) : String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        // Valor para atributo HTML (doble-escape comillas)
        attr: function(str) {
            return this.html(str).replace(/`/g, '&#96;');
        },

        // Valor para URL (encodeURIComponent)
        url: function(str) {
            if (!str) return '';
            try { return encodeURIComponent(String(str)); } catch (e) { return ''; }
        },

        // Limpiar para inserción en CSS (previene CSS injection)
        css: function(str) {
            return String(str || '').replace(/[<>"'`;{}()\\\/]/g, '');
        },

        // Crear elemento de texto seguro (DOM API, sin innerHTML)
        textNode: function(str) {
            return document.createTextNode(String(str || ''));
        }
    };

    // ========================================
    // INPUT VALIDATORS (Mejora #14)
    // Validación antes de escritura a DB
    // ========================================
    var Validators = {
        required: function(value, fieldName) {
            if (value === null || value === undefined || String(value).trim() === '') {
                return { valid: false, error: (fieldName || 'Campo') + ' es requerido' };
            }
            return { valid: true };
        },

        minLength: function(value, min, fieldName) {
            if (String(value || '').length < min) {
                return { valid: false, error: (fieldName || 'Campo') + ' debe tener al menos ' + min + ' caracteres' };
            }
            return { valid: true };
        },

        maxLength: function(value, max, fieldName) {
            if (String(value || '').length > max) {
                return { valid: false, error: (fieldName || 'Campo') + ' no puede exceder ' + max + ' caracteres' };
            }
            return { valid: true };
        },

        positiveNumber: function(value, fieldName) {
            var num = Number(value);
            if (isNaN(num) || num < 0) {
                return { valid: false, error: (fieldName || 'Campo') + ' debe ser un número positivo' };
            }
            return { valid: true };
        },

        email: function(value) {
            if (!value) return { valid: true }; // Opcional
            var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!re.test(String(value))) {
                return { valid: false, error: 'Email no válido' };
            }
            return { valid: true };
        },

        rfc: function(value) {
            if (!value) return { valid: true }; // Opcional
            var re = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
            if (!re.test(String(value).toUpperCase())) {
                return { valid: false, error: 'RFC no válido' };
            }
            return { valid: true };
        },

        pin: function(value) {
            if (!/^\d{4}$/.test(String(value))) {
                return { valid: false, error: 'PIN debe ser de 4 dígitos' };
            }
            return { valid: true };
        },

        // Validar un objeto completo contra un esquema
        validate: function(data, schema) {
            var errors = [];
            for (var field in schema) {
                if (!schema.hasOwnProperty(field)) continue;
                var rules = schema[field];
                var value = data[field];

                for (var i = 0; i < rules.length; i++) {
                    var rule = rules[i];
                    var result;
                    if (rule.type === 'required') {
                        result = this.required(value, rule.label || field);
                    } else if (rule.type === 'minLength') {
                        result = this.minLength(value, rule.min, rule.label || field);
                    } else if (rule.type === 'maxLength') {
                        result = this.maxLength(value, rule.max, rule.label || field);
                    } else if (rule.type === 'positiveNumber') {
                        result = this.positiveNumber(value, rule.label || field);
                    } else if (rule.type === 'email') {
                        result = this.email(value);
                    } else if (rule.type === 'rfc') {
                        result = this.rfc(value);
                    } else if (rule.type === 'pin') {
                        result = this.pin(value);
                    } else if (rule.type === 'custom' && typeof rule.fn === 'function') {
                        result = rule.fn(value, data);
                    }
                    if (result && !result.valid) {
                        errors.push(result.error);
                        break; // Solo primer error por campo
                    }
                }
            }
            return {
                valid: errors.length === 0,
                errors: errors
            };
        }
    };

    // Esquemas de validación predefinidos para entidades del ERP
    var ValidationSchemas = {
        cliente: {
            nombreComercial: [{ type: 'required', label: 'Nombre comercial' }, { type: 'maxLength', max: 200, label: 'Nombre comercial' }],
            email: [{ type: 'email' }]
        },
        producto: {
            nombre: [{ type: 'required', label: 'Nombre del producto' }, { type: 'maxLength', max: 200, label: 'Nombre' }],
            precioVenta: [{ type: 'positiveNumber', label: 'Precio de venta' }]
        },
        empleado: {
            nombre: [{ type: 'required', label: 'Nombre' }, { type: 'minLength', min: 3, label: 'Nombre' }],
            numEmpleado: [{ type: 'required', label: 'Número de empleado' }]
        },
        pedido: {
            clienteId: [{ type: 'required', label: 'Cliente' }]
        },
        material: {
            nombre: [{ type: 'required', label: 'Nombre del material' }],
            precioUnitario: [{ type: 'positiveNumber', label: 'Precio unitario' }]
        }
    };

    // ========================================
    // DEBOUNCE / THROTTLE (Mejora #12)
    // Controla frecuencia de escrituras y eventos
    // ========================================
    function debounce(fn, delay) {
        var timer = null;
        return function() {
            var context = this;
            var args = arguments;
            if (timer) clearTimeout(timer);
            timer = setTimeout(function() {
                timer = null;
                fn.apply(context, args);
            }, delay || 300);
        };
    }

    function throttle(fn, interval) {
        var lastCall = 0;
        return function() {
            var now = Date.now();
            if (now - lastCall >= interval) {
                lastCall = now;
                return fn.apply(this, arguments);
            }
        };
    }

    // ========================================
    // ERROR HANDLER (Mejora #15)
    // Manejo centralizado de errores async
    // ========================================
    var ErrorHandler = {
        _handlers: [],

        // Registrar handler personalizado
        on: function(handler) {
            if (typeof handler === 'function') this._handlers.push(handler);
        },

        // Manejar un error
        handle: function(error, context) {
            var msg = error && error.message ? error.message : String(error);
            var info = {
                message: msg,
                context: context || 'unknown',
                timestamp: new Date().toISOString(),
                stack: error && error.stack ? error.stack : null
            };

            // Log seguro
            if (FeatureFlags.isEnabled('SAFE_LOGS')) {
                console.error('[ERP Error] ' + info.context + ':', info.message);
            } else {
                console.error('[ERP Error]', info);
            }

            // Notificar handlers
            for (var i = 0; i < this._handlers.length; i++) {
                try { this._handlers[i](info); } catch (e) {}
            }

            // Toast al usuario si showToast existe
            if (typeof showToast === 'function') {
                showToast('Error: ' + msg, 'error');
            }

            return info;
        },

        // Wrapper para funciones async
        wrapAsync: function(fn, context) {
            var self = this;
            return async function() {
                try {
                    return await fn.apply(this, arguments);
                } catch (e) {
                    self.handle(e, context || fn.name || 'async');
                    return null;
                }
            };
        }
    };

    // Capturar errores no manejados
    window.addEventListener('unhandledrejection', function(event) {
        ErrorHandler.handle(event.reason, 'unhandledPromise');
    });

    // ========================================
    // EVENT MANAGER (Mejora #5)
    // Previene memory leaks con cleanup automático
    // ========================================
    var EventManager = {
        _listeners: [],

        // Agregar listener con tracking
        on: function(element, event, handler, options) {
            if (!element) return;
            element.addEventListener(event, handler, options || false);
            this._listeners.push({ el: element, ev: event, fn: handler, opts: options });
        },

        // Remover un listener específico
        off: function(element, event, handler) {
            element.removeEventListener(event, handler);
            this._listeners = this._listeners.filter(function(l) {
                return !(l.el === element && l.ev === event && l.fn === handler);
            });
        },

        // Limpiar todos los listeners de un elemento
        cleanupElement: function(element) {
            this._listeners = this._listeners.filter(function(l) {
                if (l.el === element) {
                    l.el.removeEventListener(l.ev, l.fn, l.opts);
                    return false;
                }
                return true;
            });
        },

        // Limpiar TODOS los listeners (para navegación)
        cleanupAll: function() {
            for (var i = 0; i < this._listeners.length; i++) {
                var l = this._listeners[i];
                try { l.el.removeEventListener(l.ev, l.fn, l.opts); } catch (e) {}
            }
            this._listeners = [];
        },

        // Delegación de eventos (eficiente para listas dinámicas)
        delegate: function(container, selector, event, handler) {
            var delegated = function(e) {
                var target = e.target.closest(selector);
                if (target && container.contains(target)) {
                    handler.call(target, e);
                }
            };
            this.on(container, event, delegated);
            return delegated;
        }
    };

    // ========================================
    // OFFLINE QUEUE (Mejora #7)
    // Cola de operaciones pendientes para modo offline
    // ========================================
    var OfflineQueue = {
        _queueKey: 'erp_offline_queue',
        _maxItems: 500,

        // Verificar si hay conexión
        isOnline: function() {
            return navigator.onLine;
        },

        // Agregar operación a la cola
        enqueue: function(operation) {
            if (!FeatureFlags.isEnabled('OFFLINE_QUEUE')) return false;
            var queue = safeLocalGet(this._queueKey, []);
            if (queue.length >= this._maxItems) {
                console.warn('[Offline] Cola llena (' + this._maxItems + ' items). Descartando más antiguo.');
                queue.shift();
            }
            queue.push({
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                timestamp: new Date().toISOString(),
                operation: operation
            });
            safeLocalSet(this._queueKey, queue);
            return true;
        },

        // Obtener items pendientes
        getPending: function() {
            return safeLocalGet(this._queueKey, []);
        },

        // Procesar la cola cuando hay conexión
        flush: async function() {
            if (!this.isOnline()) return { processed: 0, remaining: this.getPending().length };

            var queue = this.getPending();
            if (queue.length === 0) return { processed: 0, remaining: 0 };

            var processed = 0;
            var failed = [];

            for (var i = 0; i < queue.length; i++) {
                var item = queue[i];
                try {
                    await this._executeOperation(item.operation);
                    processed++;
                } catch (e) {
                    console.error('[Offline] Error procesando operación:', e.message);
                    failed.push(item);
                }
            }

            // Guardar solo los fallidos
            safeLocalSet(this._queueKey, failed);

            if (processed > 0) {
                console.log('[Offline] Cola procesada:', processed, 'exitosas,', failed.length, 'fallidas');
                if (typeof showToast === 'function') {
                    showToast(processed + ' operación(es) sincronizada(s)', 'success');
                }
            }

            return { processed: processed, remaining: failed.length };
        },

        // Ejecutar una operación de la cola
        _executeOperation: async function(op) {
            if (!op || !op.type) throw new Error('Operación sin tipo');

            var sb = window.supabaseInstance;
            if (!sb) throw new Error('Supabase no disponible');

            switch (op.type) {
                case 'insert':
                    await sb.from(op.table).insert(op.data);
                    break;
                case 'update':
                    await sb.from(op.table).update(op.data).eq('id', op.id);
                    break;
                case 'delete':
                    await sb.from(op.table).delete().eq('id', op.id);
                    break;
                case 'upsert':
                    await sb.from(op.table).upsert(op.data, op.options || {});
                    break;
                default:
                    throw new Error('Tipo de operación desconocido: ' + op.type);
            }
        },

        // Limpiar cola
        clear: function() {
            safeLocalSet(this._queueKey, []);
        }
    };

    // Auto-flush cuando se recupera conexión
    window.addEventListener('online', function() {
        console.log('[Offline] Conexión restaurada. Procesando cola...');
        if (typeof showToast === 'function') showToast('Conexión restaurada', 'info');
        setTimeout(function() { OfflineQueue.flush(); }, 1000);
    });

    window.addEventListener('offline', function() {
        console.log('[Offline] Sin conexión. Operaciones se guardarán localmente.');
        if (typeof showToast === 'function') showToast('Sin conexión - Modo offline activo', 'warning');
    });

    // ========================================
    // BATCH OPERATIONS (Mejora #8)
    // Operaciones masivas eficientes
    // ========================================
    var BatchOps = {
        insertMany: async function(table, records) {
            if (!records || records.length === 0) return [];
            var sb = window.supabaseInstance;
            if (!sb) {
                console.error('[Batch] Supabase no disponible');
                return [];
            }

            // Supabase acepta arrays en insert
            var result = await sb.from(table).insert(records).select();
            if (result.error) {
                console.error('[Batch] Error insertMany ' + table + ':', result.error.message);
                return [];
            }
            return result.data || [];
        },

        updateMany: async function(table, updates) {
            // updates = [{ id: 1, data: {...} }, { id: 2, data: {...} }]
            if (!updates || updates.length === 0) return 0;
            var sb = window.supabaseInstance;
            if (!sb) return 0;

            var count = 0;
            // Supabase no soporta batch update nativo, usamos Promise.all
            var promises = updates.map(function(u) {
                return sb.from(table).update(u.data).eq('id', u.id)
                    .then(function(r) {
                        if (!r.error) count++;
                        return r;
                    });
            });

            await Promise.all(promises);
            return count;
        },

        deleteMany: async function(table, ids) {
            if (!ids || ids.length === 0) return 0;
            var sb = window.supabaseInstance;
            if (!sb) return 0;

            var result = await sb.from(table).delete().in('id', ids);
            if (result.error) {
                console.error('[Batch] Error deleteMany ' + table + ':', result.error.message);
                return 0;
            }
            return ids.length;
        }
    };

    // ========================================
    // VIRTUAL SCROLL (Mejora #13)
    // Renderizado eficiente de listas grandes
    // ========================================
    var VirtualScroll = {
        create: function(container, items, renderFn, options) {
            options = options || {};
            var itemHeight = options.itemHeight || 50;
            var bufferSize = options.buffer || 5;
            var batchSize = options.batchSize || 30;

            if (!container || !items || items.length <= batchSize) {
                // Lista pequeña - renderizar todo directamente
                if (container && items) {
                    container.innerHTML = items.map(renderFn).join('');
                }
                return { destroy: function() {} };
            }

            var totalHeight = items.length * itemHeight;
            var visibleItems = Math.ceil(container.clientHeight / itemHeight) + bufferSize * 2;

            // Wrapper con scroll
            container.innerHTML = '<div class="vs-spacer" style="height:' + totalHeight + 'px;position:relative;"></div>';
            var spacer = container.firstChild;

            var _lastStart = -1;

            function render() {
                var scrollTop = container.scrollTop;
                var start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
                var end = Math.min(items.length, start + visibleItems);

                if (start === _lastStart) return;
                _lastStart = start;

                var html = '';
                for (var i = start; i < end; i++) {
                    html += '<div class="vs-item" style="position:absolute;top:' + (i * itemHeight) + 'px;width:100%;height:' + itemHeight + 'px;">' +
                        renderFn(items[i], i) + '</div>';
                }
                spacer.innerHTML = html;
            }

            var onScroll = throttle(render, 16);
            container.addEventListener('scroll', onScroll);
            render();

            return {
                destroy: function() {
                    container.removeEventListener('scroll', onScroll);
                },
                refresh: function(newItems) {
                    items = newItems;
                    totalHeight = items.length * itemHeight;
                    spacer.style.height = totalHeight + 'px';
                    _lastStart = -1;
                    render();
                }
            };
        }
    };

    // ========================================
    // SAFE LOGGER (Mejora #20)
    // Sanitiza logs en producción
    // ========================================
    var SafeLog = {
        _isDev: typeof DEBUG_MODE !== 'undefined' ? DEBUG_MODE : false,

        log: function() {
            if (this._isDev) console.log.apply(console, arguments);
        },
        warn: function() {
            console.warn.apply(console, arguments);
        },
        error: function() {
            console.error.apply(console, arguments);
        },
        // Log que nunca muestra datos sensibles
        info: function(msg, data) {
            if (this._isDev) {
                console.log('[INFO]', msg, data);
            } else {
                console.log('[INFO]', msg);
            }
        }
    };

    // ========================================
    // A11Y HELPERS (Mejora #19)
    // Funciones de accesibilidad
    // ========================================
    var A11y = {
        // Agregar aria-label a botones sin texto
        enhanceButtons: function(container) {
            var buttons = (container || document).querySelectorAll('button:not([aria-label])');
            buttons.forEach(function(btn) {
                if (!btn.textContent.trim() && !btn.getAttribute('aria-label')) {
                    var title = btn.getAttribute('title');
                    if (title) btn.setAttribute('aria-label', title);
                }
            });
        },

        // Agregar role y tabindex a elementos interactivos
        enhanceInteractive: function(container) {
            var clickables = (container || document).querySelectorAll('[onclick]:not(button):not(a)');
            clickables.forEach(function(el) {
                if (!el.getAttribute('role')) el.setAttribute('role', 'button');
                if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
                // Enter/Space activan el click
                el.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        el.click();
                    }
                });
            });
        },

        // Focus trap para modales
        trapFocus: function(modal) {
            var focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length === 0) return function() {};

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            function handleTab(e) {
                if (e.key !== 'Tab') return;
                if (e.shiftKey) {
                    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
                } else {
                    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            }

            modal.addEventListener('keydown', handleTab);
            first.focus();

            return function() { modal.removeEventListener('keydown', handleTab); };
        },

        // Anunciar cambio para screen readers
        announce: function(message) {
            var live = document.getElementById('a11y-live');
            if (!live) {
                live = document.createElement('div');
                live.id = 'a11y-live';
                live.setAttribute('aria-live', 'polite');
                live.setAttribute('aria-atomic', 'true');
                live.className = 'sr-only';
                live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
                document.body.appendChild(live);
            }
            live.textContent = message;
        }
    };

    // ========================================
    // AUDIT TRAIL (Mejora #18 - Enhanced)
    // Registro visual de cambios con user context y change tracking
    // ========================================
    var AuditTrail = {
        _maxItems: 500,
        _key: 'erp_audit_visual',
        _useIDB: true,

        log: function(action, detail, entity, entityId, user, changes) {
            var entry = {
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                action: action,
                detail: detail,
                entity: entity || null,
                entityId: entityId || null,
                user: user || this._getCurrentUser(),
                changes: changes || null,
                timestamp: new Date().toISOString(),
                fecha: new Date().toISOString().split('T')[0]
            };

            // Guardar en localStorage (últimos 500 para acceso rápido)
            var trail = safeLocalGet(this._key, []);
            trail.unshift(entry);
            if (trail.length > this._maxItems) {
                trail = trail.slice(0, this._maxItems);
            }
            safeLocalSet(this._key, trail);

            // Guardar en IndexedDB para historial completo
            if (this._useIDB && typeof IDBStore !== 'undefined') {
                IDBStore.put('audit_log', entry).catch(function() {});
            }

            // Guardar en Supabase si disponible
            var sb = window.supabaseInstance;
            if (sb) {
                sb.from('auditoria').insert({
                    usuario: entry.user,
                    accion: entry.action,
                    detalle: entry.detail,
                    entidad: entry.entity,
                    entidad_id: entry.entityId,
                    cambios: entry.changes ? JSON.stringify(entry.changes) : null
                }).then(function() {}).catch(function() {});
            }
        },

        // Detectar usuario actual automáticamente
        _getCurrentUser: function() {
            // Panel operadora
            if (window.authState && window.authState.operadoraActual) {
                return window.authState.operadoraActual.nombre || 'Operadora';
            }
            // Admin
            var sesion = safeLocalGet('admin_session', null);
            if (sesion && sesion.nombre) return sesion.nombre;
            return 'Admin';
        },

        // Crear registro de cambios (before/after)
        trackChanges: function(oldObj, newObj, fields) {
            var changes = {};
            var fieldsToCheck = fields || Object.keys(newObj);
            var hasChanges = false;
            for (var i = 0; i < fieldsToCheck.length; i++) {
                var f = fieldsToCheck[i];
                var oldVal = oldObj ? oldObj[f] : undefined;
                var newVal = newObj[f];
                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                    changes[f] = { from: oldVal, to: newVal };
                    hasChanges = true;
                }
            }
            return hasChanges ? changes : null;
        },

        getRecent: function(limit) {
            var trail = safeLocalGet(this._key, []);
            return trail.slice(0, limit || 50);
        },

        // Búsqueda con filtros
        search: function(query, filters) {
            var trail = safeLocalGet(this._key, []);
            var q = (query || '').toLowerCase();
            return trail.filter(function(item) {
                var matchesQuery = !q ||
                    (item.action && item.action.toLowerCase().indexOf(q) !== -1) ||
                    (item.detail && item.detail.toLowerCase().indexOf(q) !== -1) ||
                    (item.entity && item.entity.toLowerCase().indexOf(q) !== -1) ||
                    (item.user && item.user.toLowerCase().indexOf(q) !== -1);

                if (!matchesQuery) return false;

                if (filters) {
                    if (filters.entity && item.entity !== filters.entity) return false;
                    if (filters.user && item.user !== filters.user) return false;
                    if (filters.desde && item.timestamp < filters.desde) return false;
                    if (filters.hasta && item.timestamp > filters.hasta) return false;
                }
                return true;
            });
        },

        // Obtener historial completo desde IndexedDB
        getFullHistory: function(limit) {
            if (typeof IDBStore !== 'undefined') {
                return IDBStore.getAll('audit_log', 'timestamp', null, limit || 1000);
            }
            return Promise.resolve(this.getRecent(limit));
        },

        clear: function() {
            safeLocalSet(this._key, []);
        },

        // Renderizar panel de auditoría con filtros y paginación
        render: function(containerId, options) {
            var container = document.getElementById(containerId);
            if (!container) return;

            options = options || {};
            var page = options.page || 1;
            var pageSize = options.pageSize || 25;
            var searchQuery = options.search || '';
            var filterEntity = options.entity || '';

            var items = this.search(searchQuery, { entity: filterEntity || undefined });
            var totalItems = items.length;
            var totalPages = Math.ceil(totalItems / pageSize);
            var startIdx = (page - 1) * pageSize;
            var pageItems = items.slice(startIdx, startIdx + pageSize);

            if (items.length === 0) {
                container.innerHTML = '<p class="text-muted">Sin actividad registrada</p>';
                return;
            }

            var html = '<div class="audit-filters" style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">';
            html += '<input type="text" class="form-control" placeholder="Buscar..." value="' + Sanitize.attr(searchQuery) + '" ' +
                'onchange="AuditTrail.render(\'' + containerId + '\', {search:this.value,page:1})" style="flex:1;min-width:150px;">';
            html += '<select class="form-control" onchange="AuditTrail.render(\'' + containerId + '\', {entity:this.value,search:\'' + Sanitize.attr(searchQuery) + '\',page:1})" style="width:auto;">';
            html += '<option value="">Todas las entidades</option>';
            var entities = {};
            safeLocalGet(this._key, []).forEach(function(i) { if (i.entity) entities[i.entity] = true; });
            Object.keys(entities).forEach(function(e) {
                html += '<option value="' + e + '"' + (e === filterEntity ? ' selected' : '') + '>' + Sanitize.html(e) + '</option>';
            });
            html += '</select></div>';

            html += '<div class="audit-trail-list">';
            pageItems.forEach(function(item) {
                var time = new Date(item.timestamp);
                var timeStr = time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                var dateStr = time.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

                var icon = 'fa-circle';
                var color = '#6b7280';
                if (item.action.indexOf('creado') !== -1 || item.action.indexOf('Nuevo') !== -1 || item.action.indexOf('login') !== -1) { icon = 'fa-plus-circle'; color = '#10b981'; }
                else if (item.action.indexOf('eliminado') !== -1 || item.action.indexOf('logout') !== -1) { icon = 'fa-minus-circle'; color = '#ef4444'; }
                else if (item.action.indexOf('actualizado') !== -1 || item.action.indexOf('modificado') !== -1) { icon = 'fa-edit'; color = '#3b82f6'; }
                else if (item.action.indexOf('asigna') !== -1) { icon = 'fa-exchange-alt'; color = '#8b5cf6'; }

                var changesHtml = '';
                if (item.changes) {
                    changesHtml = '<div class="audit-changes" style="font-size:0.8em;color:#6b7280;margin-top:2px;">';
                    var keys = Object.keys(item.changes);
                    keys.slice(0, 3).forEach(function(k) {
                        var c = item.changes[k];
                        changesHtml += '<span style="margin-right:8px;">' + Sanitize.html(k) + ': ' +
                            Sanitize.html(String(c.from || '-')) + ' \u2192 ' + Sanitize.html(String(c.to || '-')) + '</span>';
                    });
                    if (keys.length > 3) changesHtml += '<span>+' + (keys.length - 3) + ' m\u00e1s</span>';
                    changesHtml += '</div>';
                }

                html += '<div class="audit-item">' +
                    '<div class="audit-icon" style="color:' + color + '"><i class="fas ' + icon + '"></i></div>' +
                    '<div class="audit-info">' +
                        '<div class="audit-action">' + Sanitize.html(item.action) + '</div>' +
                        '<div class="audit-detail">' + Sanitize.html(item.detail) +
                            (item.user ? ' <span style="color:#6b7280;">\u2014 ' + Sanitize.html(item.user) + '</span>' : '') +
                        '</div>' +
                        changesHtml +
                    '</div>' +
                    '<div class="audit-meta">' +
                        '<span class="audit-time">' + timeStr + '</span>' +
                        '<span class="audit-date">' + dateStr + '</span>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';

            // Paginación
            if (totalPages > 1) {
                html += '<div class="audit-pagination" style="display:flex;justify-content:center;gap:4px;margin-top:12px;">';
                html += '<span style="color:#6b7280;font-size:0.85em;margin-right:8px;">' + startIdx + 1 + '-' + Math.min(startIdx + pageSize, totalItems) + ' de ' + totalItems + '</span>';
                if (page > 1) {
                    html += '<button class="btn btn-sm btn-outline" onclick="AuditTrail.render(\'' + containerId + '\',{page:' + (page - 1) + ',search:\'' + Sanitize.attr(searchQuery) + '\',entity:\'' + Sanitize.attr(filterEntity) + '\'})"><i class="fas fa-chevron-left"></i></button>';
                }
                if (page < totalPages) {
                    html += '<button class="btn btn-sm btn-outline" onclick="AuditTrail.render(\'' + containerId + '\',{page:' + (page + 1) + ',search:\'' + Sanitize.attr(searchQuery) + '\',entity:\'' + Sanitize.attr(filterEntity) + '\'})"><i class="fas fa-chevron-right"></i></button>';
                }
                html += '</div>';
            }

            container.innerHTML = html;
        }
    };

    // ========================================
    // SERVER-SIDE PAGINATION HELPER (Mejora #9)
    // ========================================
    var ServerPagination = {
        // Crear query paginada para Supabase
        createQuery: function(table, options) {
            options = options || {};
            var page = options.page || 1;
            var pageSize = options.pageSize || 25;
            var from = (page - 1) * pageSize;
            var to = from + pageSize - 1;

            return {
                table: table,
                from: from,
                to: to,
                pageSize: pageSize,
                page: page,
                // Ejecutar query con paginación
                execute: async function(sb, selectCols, filters, orderCol) {
                    if (!sb) return { data: [], count: 0 };

                    var query = sb.from(table).select(selectCols || '*', { count: 'exact' });

                    if (filters) {
                        for (var key in filters) {
                            if (filters.hasOwnProperty(key)) {
                                query = query.eq(key, filters[key]);
                            }
                        }
                    }

                    if (orderCol) {
                        query = query.order(orderCol, { ascending: false });
                    }

                    query = query.range(from, to);

                    var result = await query;
                    if (result.error) {
                        console.error('[Pagination] Error:', result.error.message);
                        return { data: [], count: 0 };
                    }

                    return {
                        data: result.data || [],
                        count: result.count || 0,
                        totalPages: Math.ceil((result.count || 0) / pageSize),
                        currentPage: page
                    };
                }
            };
        }
    };

    // ========================================
    // INDEXEDDB STORAGE (Mejora #9)
    // Almacenamiento para datos grandes que exceden localStorage
    // ========================================
    var IDBStore = {
        _dbName: 'erp_multifundas',
        _version: 1,
        _db: null,
        _ready: null,

        init: function() {
            var self = this;
            if (self._ready) return self._ready;

            self._ready = new Promise(function(resolve, reject) {
                if (!window.indexedDB) {
                    console.warn('[IDB] IndexedDB no disponible, usando localStorage fallback');
                    resolve(null);
                    return;
                }
                try {
                    var request = indexedDB.open(self._dbName, self._version);
                    request.onupgradeneeded = function(event) {
                        var db = event.target.result;
                        if (!db.objectStoreNames.contains('historial_produccion')) {
                            var store = db.createObjectStore('historial_produccion', { keyPath: 'id' });
                            store.createIndex('fecha', 'fecha', { unique: false });
                            store.createIndex('operadoraId', 'operadoraId', { unique: false });
                            store.createIndex('pedidoId', 'pedidoId', { unique: false });
                        }
                        if (!db.objectStoreNames.contains('metrics_snapshots')) {
                            var ms = db.createObjectStore('metrics_snapshots', { keyPath: 'id' });
                            ms.createIndex('fecha', 'fecha', { unique: false });
                            ms.createIndex('tipo', 'tipo', { unique: false });
                        }
                        if (!db.objectStoreNames.contains('audit_log')) {
                            var al = db.createObjectStore('audit_log', { keyPath: 'id' });
                            al.createIndex('timestamp', 'timestamp', { unique: false });
                            al.createIndex('entity', 'entity', { unique: false });
                            al.createIndex('user', 'user', { unique: false });
                        }
                        if (!db.objectStoreNames.contains('backups')) {
                            var bk = db.createObjectStore('backups', { keyPath: 'id' });
                            bk.createIndex('fecha', 'fecha', { unique: false });
                        }
                    };
                    request.onsuccess = function(event) {
                        self._db = event.target.result;
                        console.log('[IDB] Base de datos abierta exitosamente');
                        resolve(self._db);
                    };
                    request.onerror = function(event) {
                        console.error('[IDB] Error abriendo base de datos:', event.target.error);
                        resolve(null);
                    };
                } catch (e) {
                    console.error('[IDB] Error inicializando:', e.message);
                    resolve(null);
                }
            });
            return self._ready;
        },

        // Agregar un registro
        put: function(storeName, record) {
            var self = this;
            return self.init().then(function(db) {
                if (!db) return null;
                return new Promise(function(resolve, reject) {
                    try {
                        var tx = db.transaction(storeName, 'readwrite');
                        var store = tx.objectStore(storeName);
                        var req = store.put(record);
                        req.onsuccess = function() { resolve(record); };
                        req.onerror = function() { resolve(null); };
                    } catch (e) { resolve(null); }
                });
            });
        },

        // Agregar multiples registros
        putMany: function(storeName, records) {
            var self = this;
            return self.init().then(function(db) {
                if (!db || !records || records.length === 0) return 0;
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(storeName, 'readwrite');
                        var store = tx.objectStore(storeName);
                        var count = 0;
                        records.forEach(function(r) {
                            var req = store.put(r);
                            req.onsuccess = function() { count++; };
                        });
                        tx.oncomplete = function() { resolve(count); };
                        tx.onerror = function() { resolve(count); };
                    } catch (e) { resolve(0); }
                });
            });
        },

        // Obtener por key
        get: function(storeName, id) {
            var self = this;
            return self.init().then(function(db) {
                if (!db) return null;
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(storeName, 'readonly');
                        var store = tx.objectStore(storeName);
                        var req = store.get(id);
                        req.onsuccess = function() { resolve(req.result || null); };
                        req.onerror = function() { resolve(null); };
                    } catch (e) { resolve(null); }
                });
            });
        },

        // Obtener todos los registros de un store
        getAll: function(storeName, indexName, range, limit) {
            var self = this;
            return self.init().then(function(db) {
                if (!db) return [];
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(storeName, 'readonly');
                        var store = tx.objectStore(storeName);
                        var source = indexName ? store.index(indexName) : store;
                        var req = range ? source.getAll(range, limit || undefined) : source.getAll(null, limit || undefined);
                        req.onsuccess = function() { resolve(req.result || []); };
                        req.onerror = function() { resolve([]); };
                    } catch (e) { resolve([]); }
                });
            });
        },

        // Obtener registros por rango de fecha
        getByDateRange: function(storeName, startDate, endDate) {
            var range = IDBKeyRange.bound(startDate, endDate);
            return this.getAll(storeName, 'fecha', range);
        },

        // Contar registros
        count: function(storeName) {
            var self = this;
            return self.init().then(function(db) {
                if (!db) return 0;
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(storeName, 'readonly');
                        var req = tx.objectStore(storeName).count();
                        req.onsuccess = function() { resolve(req.result || 0); };
                        req.onerror = function() { resolve(0); };
                    } catch (e) { resolve(0); }
                });
            });
        },

        // Eliminar registros antiguos (retención)
        deleteOlderThan: function(storeName, dateStr) {
            var self = this;
            return self.init().then(function(db) {
                if (!db) return 0;
                return new Promise(function(resolve) {
                    try {
                        var tx = db.transaction(storeName, 'readwrite');
                        var store = tx.objectStore(storeName);
                        var index = store.index('fecha');
                        var range = IDBKeyRange.upperBound(dateStr);
                        var deleted = 0;
                        var cursor = index.openCursor(range);
                        cursor.onsuccess = function(event) {
                            var c = event.target.result;
                            if (c) {
                                store.delete(c.primaryKey);
                                deleted++;
                                c.continue();
                            }
                        };
                        tx.oncomplete = function() { resolve(deleted); };
                        tx.onerror = function() { resolve(deleted); };
                    } catch (e) { resolve(0); }
                });
            });
        },

        // Verificar cuota aproximada
        checkQuota: async function() {
            if (navigator.storage && navigator.storage.estimate) {
                var estimate = await navigator.storage.estimate();
                var usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
                var totalMB = (estimate.quota / (1024 * 1024)).toFixed(2);
                var pct = ((estimate.usage / estimate.quota) * 100).toFixed(1);
                return { usedMB: usedMB, totalMB: totalMB, percentUsed: pct };
            }
            return null;
        }
    };

    // Inicializar IDB al cargar
    IDBStore.init();

    // ========================================
    // DELTA MERGE (Mejora #1)
    // Merge seguro de datos concurrentes en pedidos_erp
    // ========================================
    var DeltaMerge = {
        // Aplicar un delta de piezas a pedidos_erp de forma atómica
        // En vez de leer-modificar-escribir (race condition),
        // usamos un mecanismo de deltas con timestamp
        applyPiezasDelta: function(pedidoId, procesoId, procesoNombre, cantidad, operadoraId, estacionId) {
            // 1. Registrar el delta en una cola
            var deltas = safeLocalGet('_piezas_deltas', []);
            deltas.push({
                id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                pedidoId: pedidoId,
                procesoId: procesoId,
                procesoNombre: procesoNombre,
                cantidad: cantidad,
                operadoraId: operadoraId,
                estacionId: estacionId,
                timestamp: new Date().toISOString(),
                applied: false
            });
            safeLocalSet('_piezas_deltas', deltas);

            // 2. Aplicar deltas pendientes con lock optimista
            return this._flushDeltas();
        },

        _flushDeltas: function() {
            var lockKey = '_piezas_lock';
            var lock = safeLocalGet(lockKey, null);
            var now = Date.now();

            // Si hay un lock activo de menos de 2 segundos, reintentar
            if (lock && (now - lock) < 2000) {
                var self = this;
                setTimeout(function() { self._flushDeltas(); }, 100);
                return;
            }

            // Adquirir lock
            safeLocalSet(lockKey, now);

            try {
                var deltas = safeLocalGet('_piezas_deltas', []);
                var pendientes = deltas.filter(function(d) { return !d.applied; });

                if (pendientes.length === 0) {
                    localStorage.removeItem(lockKey);
                    return;
                }

                // Leer pedidos_erp una sola vez
                var pedidosERP = safeLocalGet('pedidos_erp', []);

                pendientes.forEach(function(delta) {
                    var pedidoIdx = pedidosERP.findIndex(function(p) { return p.id == delta.pedidoId; });
                    if (pedidoIdx < 0) return;

                    var pedido = pedidosERP[pedidoIdx];
                    if (!pedido.procesos) pedido.procesos = [];

                    var procesoIdx = pedido.procesos.findIndex(function(p) { return p.id == delta.procesoId; });
                    if (procesoIdx < 0 && delta.procesoNombre) {
                        procesoIdx = pedido.procesos.findIndex(function(p) {
                            return (p.nombre || '').toLowerCase() === (delta.procesoNombre || '').toLowerCase();
                        });
                    }

                    if (procesoIdx >= 0) {
                        // Sumar delta (no sobreescribir)
                        pedido.procesos[procesoIdx].piezas = (pedido.procesos[procesoIdx].piezas || 0) + delta.cantidad;
                        pedido.procesos[procesoIdx].ultimaActualizacion = delta.timestamp;
                        pedido.procesos[procesoIdx].ultimoOperador = delta.operadoraId;
                    }

                    delta.applied = true;
                });

                // Escribir una sola vez
                safeLocalSet('pedidos_erp', pedidosERP);

                // Limpiar deltas aplicados (mantener últimos 50 para auditoría)
                var aplicados = deltas.filter(function(d) { return d.applied; });
                var noProcesados = deltas.filter(function(d) { return !d.applied; });
                safeLocalSet('_piezas_deltas', noProcesados.concat(aplicados.slice(-50)));

            } finally {
                localStorage.removeItem(lockKey);
            }
        },

        // Obtener total real de piezas para un proceso (sumando deltas no aplicados)
        getTotalPiezas: function(pedidoId, procesoId) {
            var pedidosERP = safeLocalGet('pedidos_erp', []);
            var pedido = pedidosERP.find(function(p) { return p.id == pedidoId; });
            if (!pedido || !pedido.procesos) return 0;

            var proceso = pedido.procesos.find(function(p) { return p.id == procesoId; });
            var base = proceso ? (proceso.piezas || 0) : 0;

            // Sumar deltas pendientes
            var deltas = safeLocalGet('_piezas_deltas', []);
            var pendientes = deltas.filter(function(d) {
                return !d.applied && d.pedidoId == pedidoId && d.procesoId == procesoId;
            });
            var deltasSum = pendientes.reduce(function(s, d) { return s + d.cantidad; }, 0);

            return base + deltasSum;
        }
    };

    // ========================================
    // BACKUP MANAGER (Mejora #2)
    // Backup periódico de datos críticos a Supabase
    // ========================================
    var BackupManager = {
        _intervalId: null,
        _intervalMs: 5 * 60 * 1000, // Cada 5 minutos
        _lastBackup: null,

        start: function() {
            var self = this;
            if (self._intervalId) return;

            // Backup inicial después de 30 segundos
            setTimeout(function() { self.runBackup(); }, 30000);

            // Backup periódico
            self._intervalId = setInterval(function() {
                self.runBackup();
            }, self._intervalMs);

            console.log('[Backup] Manager iniciado (cada 5min)');
        },

        stop: function() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
        },

        runBackup: async function() {
            var sb = window.supabaseInstance;
            if (!sb || !navigator.onLine) return;

            var keysToBackup = [
                'pedidos_erp', 'pedidos_activos', 'asignaciones_estaciones',
                'estado_maquinas', 'historial_produccion', 'tiempos_muertos',
                'cola_procesos_operadores', 'supervisora_maquinas'
            ];

            var snapshot = {};
            var hasData = false;

            for (var i = 0; i < keysToBackup.length; i++) {
                var val = localStorage.getItem(keysToBackup[i]);
                if (val && val !== '{}' && val !== '[]') {
                    snapshot[keysToBackup[i]] = val;
                    hasData = true;
                }
            }

            if (!hasData) return;

            var backupRecord = {
                id: 'backup-' + Date.now(),
                fecha: new Date().toISOString(),
                tipo: 'auto',
                datos: snapshot,
                dispositivo: window.SYNC_DEVICE_ID || 'unknown',
                tamano_bytes: JSON.stringify(snapshot).length
            };

            // Guardar en IndexedDB local
            if (typeof IDBStore !== 'undefined') {
                await IDBStore.put('backups', backupRecord);
            }

            // Guardar snapshot en Supabase sync_state con key especial
            try {
                await sb.from('sync_state').upsert({
                    key: '_backup_snapshot',
                    value: {
                        timestamp: backupRecord.fecha,
                        dispositivo: backupRecord.dispositivo,
                        keys: Object.keys(snapshot),
                        tamano: backupRecord.tamano_bytes
                    },
                    updated_by: backupRecord.dispositivo,
                    updated_at: backupRecord.fecha
                }, { onConflict: 'key' });

                this._lastBackup = backupRecord.fecha;
                console.log('[Backup] Snapshot guardado:', Object.keys(snapshot).length, 'keys,',
                    (backupRecord.tamano_bytes / 1024).toFixed(1), 'KB');
            } catch (e) {
                console.error('[Backup] Error guardando snapshot:', e.message);
            }
        },

        // Restaurar desde el último backup
        restore: async function() {
            // Primero intentar desde IndexedDB
            if (typeof IDBStore !== 'undefined') {
                var backups = await IDBStore.getAll('backups', 'fecha');
                if (backups.length > 0) {
                    var latest = backups[backups.length - 1];
                    return this._applyBackup(latest);
                }
            }
            return { restored: false, reason: 'No hay backups disponibles' };
        },

        _applyBackup: function(backup) {
            if (!backup || !backup.datos) return { restored: false, reason: 'Backup vac\u00edo' };
            var keys = Object.keys(backup.datos);
            var restored = 0;
            keys.forEach(function(key) {
                try {
                    localStorage.setItem(key, backup.datos[key]);
                    restored++;
                } catch (e) {}
            });
            return {
                restored: true,
                keys: restored,
                fecha: backup.fecha,
                message: 'Restaurados ' + restored + ' keys del backup de ' + new Date(backup.fecha).toLocaleString('es-MX')
            };
        },

        getLastBackupInfo: function() {
            return {
                lastBackup: this._lastBackup,
                running: !!this._intervalId
            };
        },

        // Limpiar backups antiguos (más de 7 días)
        cleanOldBackups: async function() {
            if (typeof IDBStore !== 'undefined') {
                var cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - 7);
                var deleted = await IDBStore.deleteOlderThan('backups', cutoff.toISOString());
                if (deleted > 0) console.log('[Backup] Limpiados', deleted, 'backups antiguos');
                return deleted;
            }
            return 0;
        }
    };

    // ========================================
    // METRICS STORE (Mejora #6)
    // Persistencia de métricas históricas
    // ========================================
    var MetricsStore = {
        // Guardar snapshot de métricas del día
        saveSnapshot: async function(metricsData) {
            var snapshot = {
                id: 'metrics-' + new Date().toISOString().split('T')[0] + '-' + Date.now(),
                fecha: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                tipo: 'diario',
                produccionTotal: metricsData.produccionTotal || 0,
                operadorasActivas: metricsData.operadorasActivas || 0,
                eficienciaPromedio: metricsData.eficienciaPromedio || 0,
                pedidosCompletados: metricsData.pedidosCompletados || 0,
                tiempoMuertoMinutos: metricsData.tiempoMuertoMinutos || 0,
                alertasEntrega: metricsData.alertasEntrega || 0,
                anomaliasDetectadas: metricsData.anomaliasDetectadas || 0,
                topOperadoras: metricsData.topOperadoras || [],
                detallesProcesos: metricsData.detallesProcesos || []
            };

            if (typeof IDBStore !== 'undefined') {
                await IDBStore.put('metrics_snapshots', snapshot);
            }

            // También mantener últimos 30 días en localStorage para acceso rápido
            var cache = safeLocalGet('_metrics_cache', []);
            // Evitar duplicados del mismo día
            cache = cache.filter(function(m) { return m.fecha !== snapshot.fecha; });
            cache.push(snapshot);
            // Mantener solo últimos 30 días
            if (cache.length > 30) cache = cache.slice(-30);
            safeLocalSet('_metrics_cache', cache);

            return snapshot;
        },

        // Obtener métricas de los últimos N días
        getHistory: async function(days) {
            days = days || 30;

            // Primero intentar localStorage cache
            var cache = safeLocalGet('_metrics_cache', []);
            if (cache.length >= days) {
                return cache.slice(-days);
            }

            // Si no hay suficientes, buscar en IndexedDB
            if (typeof IDBStore !== 'undefined') {
                var cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);
                var snapshots = await IDBStore.getByDateRange('metrics_snapshots', cutoff.toISOString().split('T')[0], new Date().toISOString().split('T')[0] + 'Z');
                if (snapshots.length > 0) return snapshots;
            }

            return cache;
        },

        // Obtener tendencia de una métrica
        getTrend: async function(metricName, days) {
            var history = await this.getHistory(days || 14);
            return history.map(function(s) {
                return { fecha: s.fecha, valor: s[metricName] || 0 };
            });
        },

        // Calcular métricas actuales desde datos en vivo
        calculateCurrent: function() {
            var historial = safeLocalGet('historial_produccion', []);
            var hoyStr = new Date().toISOString().split('T')[0];
            var produccionHoy = historial.filter(function(h) { return h.fecha && h.fecha.startsWith(hoyStr); });
            var totalHoy = produccionHoy.reduce(function(s, h) { return s + (h.cantidad || 0); }, 0);
            var operadoresSet = {};
            produccionHoy.forEach(function(h) { if (h.operadoraId) operadoresSet[h.operadoraId] = true; });

            var tiempos = safeLocalGet('tiempos_muertos', []);
            var tiemposHoy = tiempos.filter(function(t) { return t.inicio && t.inicio.startsWith(hoyStr); });
            var minutosMuertos = tiemposHoy.reduce(function(s, t) { return s + (t.duracionMinutos || 0); }, 0);

            var pedidos = safeLocalGet('pedidos_erp', []);
            var completadosHoy = pedidos.filter(function(p) { return p.estado === 'completado'; }).length;

            return {
                produccionTotal: totalHoy,
                operadorasActivas: Object.keys(operadoresSet).length,
                eficienciaPromedio: 0, // Se calcula externamente
                pedidosCompletados: completadosHoy,
                tiempoMuertoMinutos: minutosMuertos,
                alertasEntrega: 0,
                anomaliasDetectadas: 0,
                topOperadoras: [],
                detallesProcesos: []
            };
        }
    };

    // ========================================
    // EXPORTAR GLOBALMENTE
    // ========================================
    window.FeatureFlags = FeatureFlags;
    window.safeJsonParse = safeJsonParse;
    window.safeLocalGet = safeLocalGet;
    window.safeLocalSet = safeLocalSet;
    window.Sanitize = Sanitize;
    window.Validators = Validators;
    window.ValidationSchemas = ValidationSchemas;
    window.debounce = debounce;
    window.throttle = throttle;
    window.ErrorHandler = ErrorHandler;
    window.EventManager = EventManager;
    window.OfflineQueue = OfflineQueue;
    window.BatchOps = BatchOps;
    window.VirtualScroll = VirtualScroll;
    window.SafeLog = SafeLog;
    window.A11y = A11y;
    window.AuditTrail = AuditTrail;
    window.ServerPagination = ServerPagination;
    window.IDBStore = IDBStore;
    window.DeltaMerge = DeltaMerge;
    window.BackupManager = BackupManager;
    window.MetricsStore = MetricsStore;

})();
