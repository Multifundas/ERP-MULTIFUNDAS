// ========================================
// ERP MULTIFUNDAS - Supabase Client
// Wrapper del SDK con helpers CRUD genéricos
// ========================================

(function() {
    'use strict';

    // Inicializar cliente Supabase
    var sbClient = null;
    try {
        var lib = window.supabase;
        if (lib && typeof lib.createClient === 'function') {
            sbClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('[Supabase] Cliente creado exitosamente');
        } else {
            console.error('[Supabase] SDK no disponible. window.supabase:', typeof window.supabase);
        }
    } catch (e) {
        console.error('[Supabase] Error creando cliente:', e.message);
    }

    // ========================================
    // HELPERS CRUD GENÉRICOS
    // ========================================

    var client = {
        // SELECT * FROM tabla
        getAll: async function(table, options) {
            options = options || {};
            var query = sbClient.from(table).select(options.select || '*');

            if (options.filter) {
                var entries = Object.entries(options.filter);
                for (var i = 0; i < entries.length; i++) {
                    query = query.eq(entries[i][0], entries[i][1]);
                }
            }
            if (options.order) {
                query = query.order(options.order.column, { ascending: options.order.ascending !== false });
            }
            if (options.limit) {
                query = query.limit(options.limit);
            }

            var result = await query;
            if (result.error) {
                console.error('[Supabase] Error getAll ' + table + ':', result.error.message);
                return [];
            }
            return result.data || [];
        },

        // SELECT * FROM tabla WHERE id = ?
        getById: async function(table, id, idColumn) {
            idColumn = idColumn || 'id';
            var result = await sbClient
                .from(table)
                .select('*')
                .eq(idColumn, id)
                .single();

            if (result.error) {
                if (result.error.code === 'PGRST116') return null;
                console.error('[Supabase] Error getById ' + table + ':', result.error.message);
                return null;
            }
            return result.data;
        },

        // INSERT INTO tabla
        insert: async function(table, record) {
            var result = await sbClient
                .from(table)
                .insert(record)
                .select()
                .single();

            if (result.error) {
                console.error('[Supabase] Error insert ' + table + ':', result.error.message);
                return null;
            }
            return result.data;
        },

        // INSERT INTO tabla (múltiples registros)
        insertMany: async function(table, records) {
            var result = await sbClient
                .from(table)
                .insert(records)
                .select();

            if (result.error) {
                console.error('[Supabase] Error insertMany ' + table + ':', result.error.message);
                return [];
            }
            return result.data || [];
        },

        // UPDATE tabla SET ... WHERE id = ?
        update: async function(table, id, updates, idColumn) {
            idColumn = idColumn || 'id';
            var result = await sbClient
                .from(table)
                .update(updates)
                .eq(idColumn, id)
                .select()
                .single();

            if (result.error) {
                console.error('[Supabase] Error update ' + table + ':', result.error.message);
                return null;
            }
            return result.data;
        },

        // DELETE FROM tabla WHERE id = ?
        remove: async function(table, id, idColumn) {
            idColumn = idColumn || 'id';
            var result = await sbClient
                .from(table)
                .delete()
                .eq(idColumn, id);

            if (result.error) {
                console.error('[Supabase] Error remove ' + table + ':', result.error.message);
                return false;
            }
            return true;
        },

        // DELETE FROM tabla (todos los registros)
        deleteAll: async function(table) {
            var result = await sbClient
                .from(table)
                .delete()
                .not('id', 'is', null);

            if (result.error) {
                console.error('[Supabase] Error deleteAll ' + table + ':', result.error.message);
                return false;
            }
            return true;
        },

        // SELECT * FROM tabla WHERE column = value
        getWhere: async function(table, column, value) {
            var result = await sbClient
                .from(table)
                .select('*')
                .eq(column, value);

            if (result.error) {
                console.error('[Supabase] Error getWhere ' + table + ':', result.error.message);
                return [];
            }
            return result.data || [];
        },

        // Llamar función RPC
        rpc: async function(functionName, params) {
            params = params || {};
            var result = await sbClient.rpc(functionName, params);

            if (result.error) {
                console.error('[Supabase] Error rpc ' + functionName + ':', result.error.message);
                return null;
            }
            return result.data;
        },

        // Suscripción Realtime a una tabla
        subscribe: function(table, callback, event) {
            event = event || '*';
            var channel = sbClient
                .channel('realtime-' + table)
                .on('postgres_changes',
                    { event: event, schema: 'public', table: table },
                    function(payload) {
                        console.log('[Realtime] ' + table + ':', payload.eventType);
                        callback(payload);
                    }
                )
                .subscribe();

            return channel;
        },

        // Cancelar suscripción
        unsubscribe: function(channel) {
            if (channel) {
                sbClient.removeChannel(channel);
            }
        }
    };

    // Exportar al scope global via window
    window.supabaseInstance = sbClient;
    window.SupabaseClient = client;

    console.log('[Supabase] Client inicializado');
})();
