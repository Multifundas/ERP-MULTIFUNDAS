// ========================================
// ERP MULTIFUNDAS - Configuración de Supabase
// ========================================
// NOTA DE SEGURIDAD:
// En producción, estas credenciales deben servirse desde variables de entorno
// del servidor (ej: process.env.SUPABASE_URL) o un endpoint seguro.
// El anon key es público por diseño de Supabase, pero DEBE combinarse con:
// 1. Row Level Security (RLS) en TODAS las tablas
// 2. Políticas de acceso restrictivas
// 3. Funciones RPC para operaciones sensibles (validate_pin, set_pin)

// Intentar cargar desde meta tags o window config (para deploy seguro)
var SUPABASE_URL = (document.querySelector('meta[name="supabase-url"]') || {}).content
    || window.__ERP_CONFIG__?.SUPABASE_URL
    || 'https://fcobplnimkdgovyhehyd.supabase.co';

var SUPABASE_ANON_KEY = (document.querySelector('meta[name="supabase-key"]') || {}).content
    || window.__ERP_CONFIG__?.SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjb2JwbG5pbWtkZ292eWhlaHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDQxNzgsImV4cCI6MjA4NjUyMDE3OH0.09FYTZwJ36Jwvvye_HSZcIbrDa_OfHwEjJONskl3QQI';

// Feature flag para migración gradual
// false = usa localStorage (comportamiento actual)
// true = usa Supabase
var USE_SUPABASE = true;

// Configuración de seguridad
var SUPABASE_SECURITY = {
    // Rate limiting para operaciones sensibles
    MAX_REQUESTS_PER_MINUTE: 60,
    // Tiempo máximo de sesión (8 horas)
    SESSION_TIMEOUT_MS: 8 * 60 * 60 * 1000,
    // Inactividad máxima (30 min)
    INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,
    // Tablas que requieren RLS (verificar en Supabase Dashboard)
    RLS_REQUIRED_TABLES: [
        'personal', 'clientes', 'productos', 'pedidos',
        'auditoria', 'config_sistema', 'sync_state'
    ]
};
