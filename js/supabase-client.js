// ========================================
// ERP MULTIFUNDAS - Supabase Client
// Wrapper del SDK con helpers CRUD genéricos
// ========================================

// Inicializar cliente Supabase
// NOTA: usamos _sbClient para NO colisionar con window.supabase (el SDK)
let _sbClient;
try {
    const supabaseLib = window.supabase;
    if (supabaseLib && supabaseLib.createClient) {
        _sbClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

const SupabaseClient = {
    // SELECT * FROM tabla
    async getAll(table, options = {}) {
        let query = _sbClient.from(table).select(options.select || '*');

        if (options.filter) {
            for (const [col, val] of Object.entries(options.filter)) {
                query = query.eq(col, val);
            }
        }
        if (options.order) {
            query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) {
            console.error(`[Supabase] Error getAll ${table}:`, error.message);
            return [];
        }
        return data || [];
    },

    // SELECT * FROM tabla WHERE id = ?
    async getById(table, id, idColumn = 'id') {
        const { data, error } = await _sbClient
            .from(table)
            .select('*')
            .eq(idColumn, id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error(`[Supabase] Error getById ${table}:`, error.message);
            return null;
        }
        return data;
    },

    // INSERT INTO tabla
    async insert(table, record) {
        const { data, error } = await _sbClient
            .from(table)
            .insert(record)
            .select()
            .single();

        if (error) {
            console.error(`[Supabase] Error insert ${table}:`, error.message);
            return null;
        }
        return data;
    },

    // INSERT INTO tabla (múltiples registros)
    async insertMany(table, records) {
        const { data, error } = await _sbClient
            .from(table)
            .insert(records)
            .select();

        if (error) {
            console.error(`[Supabase] Error insertMany ${table}:`, error.message);
            return [];
        }
        return data || [];
    },

    // UPDATE tabla SET ... WHERE id = ?
    async update(table, id, updates, idColumn = 'id') {
        const { data, error } = await _sbClient
            .from(table)
            .update(updates)
            .eq(idColumn, id)
            .select()
            .single();

        if (error) {
            console.error(`[Supabase] Error update ${table}:`, error.message);
            return null;
        }
        return data;
    },

    // DELETE FROM tabla WHERE id = ?
    async remove(table, id, idColumn = 'id') {
        const { error } = await _sbClient
            .from(table)
            .delete()
            .eq(idColumn, id);

        if (error) {
            console.error(`[Supabase] Error remove ${table}:`, error.message);
            return false;
        }
        return true;
    },

    // SELECT * FROM tabla WHERE column = value
    async getWhere(table, column, value) {
        const { data, error } = await _sbClient
            .from(table)
            .select('*')
            .eq(column, value);

        if (error) {
            console.error(`[Supabase] Error getWhere ${table}:`, error.message);
            return [];
        }
        return data || [];
    },

    // Llamar función RPC
    async rpc(functionName, params = {}) {
        const { data, error } = await _sbClient.rpc(functionName, params);

        if (error) {
            console.error(`[Supabase] Error rpc ${functionName}:`, error.message);
            return null;
        }
        return data;
    },

    // Suscripción Realtime a una tabla
    subscribe(table, callback, event = '*') {
        const channel = _sbClient
            .channel(`realtime-${table}`)
            .on('postgres_changes',
                { event, schema: 'public', table },
                (payload) => {
                    console.log(`[Realtime] ${table}:`, payload.eventType);
                    callback(payload);
                }
            )
            .subscribe();

        return channel;
    },

    // Cancelar suscripción
    unsubscribe(channel) {
        if (channel) {
            _sbClient.removeChannel(channel);
        }
    }
};

// Exportar
window.supabaseInstance = _sbClient;
window.SupabaseClient = SupabaseClient;

console.log('[Supabase] Client inicializado');
