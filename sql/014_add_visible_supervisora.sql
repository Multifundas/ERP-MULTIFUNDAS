-- ========================================
-- ERP MULTIFUNDAS - Agregar visibilidad de pedidos en supervisora
-- Ejecutar en Supabase SQL Editor
-- ========================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS visible_supervisora BOOLEAN DEFAULT true;
