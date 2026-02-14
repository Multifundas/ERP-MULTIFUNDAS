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
    // AUDIT TRAIL (Mejora #18)
    // Registro visual de cambios
    // ========================================
    var AuditTrail = {
        _maxItems: 200,
        _key: 'erp_audit_visual',

        log: function(action, detail, entity, entityId, user) {
            var trail = safeLocalGet(this._key, []);
            trail.unshift({
                id: Date.now(),
                action: action,
                detail: detail,
                entity: entity || null,
                entityId: entityId || null,
                user: user || 'Admin',
                timestamp: new Date().toISOString()
            });

            // Limitar tamaño
            if (trail.length > this._maxItems) {
                trail = trail.slice(0, this._maxItems);
            }

            safeLocalSet(this._key, trail);
        },

        getRecent: function(limit) {
            var trail = safeLocalGet(this._key, []);
            return trail.slice(0, limit || 50);
        },

        search: function(query) {
            var trail = safeLocalGet(this._key, []);
            var q = query.toLowerCase();
            return trail.filter(function(item) {
                return (item.action && item.action.toLowerCase().indexOf(q) !== -1) ||
                       (item.detail && item.detail.toLowerCase().indexOf(q) !== -1) ||
                       (item.entity && item.entity.toLowerCase().indexOf(q) !== -1);
            });
        },

        clear: function() {
            safeLocalSet(this._key, []);
        },

        // Renderizar panel de auditoría visual
        render: function(containerId) {
            var container = document.getElementById(containerId);
            if (!container) return;

            var items = this.getRecent(50);
            if (items.length === 0) {
                container.innerHTML = '<p class="text-muted">Sin actividad registrada</p>';
                return;
            }

            var html = '<div class="audit-trail-list">';
            items.forEach(function(item) {
                var time = new Date(item.timestamp);
                var timeStr = time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                var dateStr = time.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

                var icon = 'fa-circle';
                var color = '#6b7280';
                if (item.action.indexOf('creado') !== -1 || item.action.indexOf('Nuevo') !== -1) { icon = 'fa-plus-circle'; color = '#10b981'; }
                else if (item.action.indexOf('eliminado') !== -1) { icon = 'fa-minus-circle'; color = '#ef4444'; }
                else if (item.action.indexOf('actualizado') !== -1 || item.action.indexOf('modificado') !== -1) { icon = 'fa-edit'; color = '#3b82f6'; }

                html += '<div class="audit-item">' +
                    '<div class="audit-icon" style="color:' + color + '"><i class="fas ' + icon + '"></i></div>' +
                    '<div class="audit-info">' +
                        '<div class="audit-action">' + Sanitize.html(item.action) + '</div>' +
                        '<div class="audit-detail">' + Sanitize.html(item.detail) + '</div>' +
                    '</div>' +
                    '<div class="audit-meta">' +
                        '<span class="audit-time">' + timeStr + '</span>' +
                        '<span class="audit-date">' + dateStr + '</span>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';
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

})();
