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
    DELETE FROM movimientos_inventario;
    DELETE FROM articulos_frecuentes;
    DELETE FROM pedido_productos;
    DELETE FROM bom;
    DELETE FROM inventario_piezas;
    DELETE FROM auditoria;
    DELETE FROM notificaciones;
    DELETE FROM estado_operadores;

    -- Tablas principales
    DELETE FROM pedidos;
    DELETE FROM productos;
    DELETE FROM clientes;
    DELETE FROM personal;
    DELETE FROM materiales;
    DELETE FROM subfamilias;
    DELETE FROM familias;
    DELETE FROM procesos;
    DELETE FROM estaciones;
    DELETE FROM areas_planta;
    DELETE FROM areas;
    DELETE FROM config_sistema;

    -- Tablas operacionales adicionales
    DELETE FROM asignaciones_estaciones;
    DELETE FROM estado_maquinas;
    DELETE FROM historial_produccion;
    DELETE FROM historial_turnos;
    DELETE FROM historial_procesos;
    DELETE FROM historial_asignaciones;
    DELETE FROM notificaciones_coco;
    DELETE FROM mensajes_operadoras;
    DELETE FROM tiempos_muertos;
    DELETE FROM planta_layout;
    DELETE FROM calendario_eventos;
    DELETE FROM sync_state;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
