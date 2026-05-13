-- ========================================
-- ERP MULTIFUNDAS - RESET DE DATOS DE NEGOCIO
-- ========================================
-- Limpia datos transaccionales + catálogos del negocio para empezar en limpio.
--
-- CONSERVA:
--   - usuarios_admin (logins admin/supervisora del panel)
--   - Estructura de planta: areas, areas_planta, estaciones, procesos,
--     familias, subfamilias
--   - Configuración: config_sistema, planta_layout
--
-- BORRA:
--   - Transaccional: pedidos, capturas, historiales, notificaciones, asignaciones,
--     estados de máquinas/operadores, tiempos muertos, auditoría, asistencia,
--     calendario, inventario, movimientos
--   - Catálogos de negocio: clientes, articulos_frecuentes, productos,
--     producto_procesos, materiales, bom
--   - Personal (todas las operadoras + supervisora + admin de la tabla personal)
--
-- IMPORTANTE: Ejecutar UNA SOLA VEZ. NO es idempotente respecto a secuencias.
-- ========================================

BEGIN;

-- 1. Tablas operacionales en tiempo real (FK a pedidos/personal/estaciones)
TRUNCATE TABLE asignaciones_estaciones RESTART IDENTITY CASCADE;
TRUNCATE TABLE estado_maquinas CASCADE;
TRUNCATE TABLE estado_operadores RESTART IDENTITY CASCADE;

-- 2. Historiales
TRUNCATE TABLE historial_produccion RESTART IDENTITY CASCADE;
TRUNCATE TABLE historial_turnos RESTART IDENTITY CASCADE;
TRUNCATE TABLE historial_procesos RESTART IDENTITY CASCADE;
TRUNCATE TABLE historial_asignaciones RESTART IDENTITY CASCADE;

-- 3. Comunicación
TRUNCATE TABLE notificaciones_coco RESTART IDENTITY CASCADE;
TRUNCATE TABLE mensajes_operadoras RESTART IDENTITY CASCADE;
TRUNCATE TABLE notificaciones RESTART IDENTITY CASCADE;

-- 4. Inventario y materiales
TRUNCATE TABLE movimientos_inventario RESTART IDENTITY CASCADE;
TRUNCATE TABLE inventario_piezas RESTART IDENTITY CASCADE;
TRUNCATE TABLE bom RESTART IDENTITY CASCADE;
TRUNCATE TABLE materiales RESTART IDENTITY CASCADE;

-- 5. Tiempos muertos, asistencia, auditoría, calendario
TRUNCATE TABLE tiempos_muertos RESTART IDENTITY CASCADE;
TRUNCATE TABLE asistencia RESTART IDENTITY CASCADE;
TRUNCATE TABLE auditoria RESTART IDENTITY CASCADE;
TRUNCATE TABLE calendario_eventos RESTART IDENTITY CASCADE;

-- 6. Pedidos (productos del pedido se borran en cascade por la FK)
TRUNCATE TABLE pedido_productos RESTART IDENTITY CASCADE;
TRUNCATE TABLE pedidos RESTART IDENTITY CASCADE;

-- 7. Productos y rutas de procesos
TRUNCATE TABLE producto_procesos RESTART IDENTITY CASCADE;
TRUNCATE TABLE articulos_frecuentes RESTART IDENTITY CASCADE;
TRUNCATE TABLE productos RESTART IDENTITY CASCADE;

-- 8. Clientes
TRUNCATE TABLE clientes RESTART IDENTITY CASCADE;

-- 9. Personal (operadoras, supervisoras, admin de la tabla personal)
-- NOTA: NO afecta a usuarios_admin (tabla separada para login del panel)
TRUNCATE TABLE personal RESTART IDENTITY CASCADE;

-- ========================================
-- VERIFICACIÓN
-- ========================================
DO $$
DECLARE
    v_clientes INTEGER;
    v_productos INTEGER;
    v_pedidos INTEGER;
    v_personal INTEGER;
    v_historial INTEGER;
    v_areas INTEGER;
    v_procesos INTEGER;
    v_usuarios INTEGER;
BEGIN
    SELECT count(*) INTO v_clientes FROM clientes;
    SELECT count(*) INTO v_productos FROM productos;
    SELECT count(*) INTO v_pedidos FROM pedidos;
    SELECT count(*) INTO v_personal FROM personal;
    SELECT count(*) INTO v_historial FROM historial_produccion;
    SELECT count(*) INTO v_areas FROM areas;
    SELECT count(*) INTO v_procesos FROM procesos;
    SELECT count(*) INTO v_usuarios FROM usuarios_admin;

    RAISE NOTICE 'RESET COMPLETO. Estado de tablas:';
    RAISE NOTICE '  Borradas:';
    RAISE NOTICE '    clientes:            % (esperado 0)', v_clientes;
    RAISE NOTICE '    productos:           % (esperado 0)', v_productos;
    RAISE NOTICE '    pedidos:             % (esperado 0)', v_pedidos;
    RAISE NOTICE '    personal:            % (esperado 0)', v_personal;
    RAISE NOTICE '    historial_produccion:% (esperado 0)', v_historial;
    RAISE NOTICE '  Conservadas:';
    RAISE NOTICE '    areas (planta):      % (debe ser > 0)', v_areas;
    RAISE NOTICE '    procesos (catalogo): % (debe ser > 0)', v_procesos;
    RAISE NOTICE '    usuarios_admin:      % (debe ser > 0 si tienes login)', v_usuarios;
END $$;

COMMIT;

-- ========================================
-- POST-RESET (correr en consola del navegador en cada tablet/PC)
-- ========================================
-- Para que la app no muestre datos cacheados de localStorage, en cada
-- navegador conectado al ERP ejecuta en la consola (F12):
--
-- localStorage.clear();
-- location.reload();
--
-- O más selectivo (preserva configuración de estación de cada tablet):
--
-- ['pedidos_erp','clientes_erp','productos_erp','personal_erp',
--  'historial_produccion','historial_turnos','historial_procesos',
--  'asignaciones_estaciones','asignaciones_multi_pedido',
--  'estado_maquinas','estado_operadores','multi_pedidos_estado_local',
--  'mensajes_coco','notificaciones_coco','tiempos_muertos',
--  'sesion_operadora','operadoras_db']
//   .forEach(k => localStorage.removeItem(k));
-- location.reload();
-- ========================================
