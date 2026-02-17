-- ========================================
-- ERP MULTIFUNDAS - Agregar columna 'tipo' a clientes
-- La columna fue definida en 003_add_missing_columns.sql pero
-- no se creó en la base de datos actual.
-- Ejecutar en Supabase SQL Editor
-- ========================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'externo';

-- Verificar que se creó correctamente
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'tipo';
