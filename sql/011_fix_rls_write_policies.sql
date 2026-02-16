-- ========================================
-- ERP MULTIFUNDAS - Fix RLS Write Policies
-- Restaurar escritura para tablas que la necesitan
-- + Función RPC para limpieza total de datos
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- ========================================
-- 1. RESTAURAR POLÍTICAS DE ESCRITURA
-- 009_rls_mejora.sql eliminó los write policies de varias tablas
-- que la app necesita para funcionar (INSERT/UPDATE/DELETE desde anon key).
-- Sin estas políticas, los cambios solo quedan en memoria y se pierden al recargar.
-- ========================================

-- Primero eliminar todas las write policies existentes para evitar duplicados
DROP POLICY IF EXISTS "anon_write_areas" ON areas;
DROP POLICY IF EXISTS "anon_write_areas_planta" ON areas_planta;
DROP POLICY IF EXISTS "anon_write_estaciones" ON estaciones;
DROP POLICY IF EXISTS "anon_write_procesos" ON procesos;
DROP POLICY IF EXISTS "anon_write_familias" ON familias;
DROP POLICY IF EXISTS "anon_write_subfamilias" ON subfamilias;
DROP POLICY IF EXISTS "anon_write_clientes" ON clientes;
DROP POLICY IF EXISTS "anon_write_productos" ON productos;
DROP POLICY IF EXISTS "anon_write_pedidos" ON pedidos;
DROP POLICY IF EXISTS "anon_write_pedido_productos" ON pedido_productos;
DROP POLICY IF EXISTS "anon_write_materiales" ON materiales;
DROP POLICY IF EXISTS "anon_write_config" ON config_sistema;
DROP POLICY IF EXISTS "anon_delete_auditoria" ON auditoria;
DROP POLICY IF EXISTS "anon_write_personal_restricted" ON personal;
DROP POLICY IF EXISTS "anon_write_personal" ON personal;

-- Catálogos: necesitan escritura desde el panel admin
CREATE POLICY "anon_write_areas" ON areas FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_areas_planta" ON areas_planta FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_estaciones" ON estaciones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_procesos" ON procesos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_familias" ON familias FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_subfamilias" ON subfamilias FOR ALL TO anon USING (true) WITH CHECK (true);

-- Datos principales: necesitan escritura
CREATE POLICY "anon_write_clientes" ON clientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_productos" ON productos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_pedidos" ON pedidos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_pedido_productos" ON pedido_productos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_materiales" ON materiales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_config" ON config_sistema FOR ALL TO anon USING (true) WITH CHECK (true);

-- Personal: escritura completa (reemplaza la policy restrictiva de 009)
CREATE POLICY "anon_write_personal" ON personal FOR ALL TO anon USING (true) WITH CHECK (true);

-- Auditoría: permitir DELETE para limpieza total (INSERT ya existe via anon_insert_only_auditoria)
CREATE POLICY "anon_delete_auditoria" ON auditoria FOR DELETE TO anon USING (true);

-- ========================================
-- 2. FUNCIÓN RPC: truncate_all_data
-- Limpieza total usando SECURITY DEFINER (bypass RLS)
-- Se llama desde limpiarTodosLosDatos() en el frontend
-- ========================================
CREATE OR REPLACE FUNCTION truncate_all_data()
RETURNS BOOLEAN AS $$
BEGIN
    -- Tablas dependientes primero (foreign keys)
    DELETE FROM movimientos_inventario WHERE true;
    DELETE FROM articulos_frecuentes WHERE true;
    DELETE FROM pedido_productos WHERE true;
    DELETE FROM bom WHERE true;
    DELETE FROM inventario_piezas WHERE true;
    DELETE FROM auditoria WHERE true;
    DELETE FROM notificaciones WHERE true;
    DELETE FROM estado_operadores WHERE true;

    -- Tablas principales
    DELETE FROM pedidos WHERE true;
    DELETE FROM productos WHERE true;
    DELETE FROM clientes WHERE true;
    DELETE FROM personal WHERE true;
    DELETE FROM materiales WHERE true;
    DELETE FROM subfamilias WHERE true;
    DELETE FROM familias WHERE true;
    DELETE FROM procesos WHERE true;
    DELETE FROM estaciones WHERE true;
    DELETE FROM areas_planta WHERE true;
    DELETE FROM areas WHERE true;
    DELETE FROM config_sistema WHERE true;

    -- Tablas operacionales adicionales
    DELETE FROM asignaciones_estaciones WHERE true;
    DELETE FROM estado_maquinas WHERE true;
    DELETE FROM historial_produccion WHERE true;
    DELETE FROM historial_turnos WHERE true;
    DELETE FROM historial_procesos WHERE true;
    DELETE FROM historial_asignaciones WHERE true;
    DELETE FROM notificaciones_coco WHERE true;
    DELETE FROM mensajes_operadoras WHERE true;
    DELETE FROM tiempos_muertos WHERE true;
    DELETE FROM planta_layout WHERE true;
    DELETE FROM calendario_eventos WHERE true;
    DELETE FROM sync_state WHERE true;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
