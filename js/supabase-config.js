// ========================================
// ERP MULTIFUNDAS - Configuración de Supabase
// ========================================
// ⚠️ Este archivo NO debe subirse a repositorios públicos
// Contiene la URL y API key del proyecto Supabase

const SUPABASE_URL = 'https://fcobplnimkdgovyhehyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjb2JwbG5pbWtkZ292eWhlaHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NDQxNzgsImV4cCI6MjA4NjUyMDE3OH0.09FYTZwJ36Jwvvye_HSZcIbrDa_OfHwEjJONskl3QQI';

// Feature flag para migración gradual
// false = usa localStorage (comportamiento actual)
// true = usa Supabase
const USE_SUPABASE = true;
