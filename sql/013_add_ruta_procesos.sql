-- ========================================
-- ERP MULTIFUNDAS - Agregar ruta de procesos a productos
-- Ejecutar en Supabase SQL Editor
-- ========================================

ALTER TABLE productos ADD COLUMN IF NOT EXISTS ruta_procesos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tiempo_total NUMERIC(10,2) DEFAULT 0;
