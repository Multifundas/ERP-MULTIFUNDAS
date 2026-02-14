// ========================================
// PANEL OPERADORA - LÓGICA PRINCIPAL
// ========================================

// Estado global del panel
var DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const operadoraState = {
    pedidoActual: null,
    procesoActual: null,
    piezasCapturadas: 0,
    piezasMeta: 0,
    metaPorMinuto: 2.5,
    capturasDia: [],
    problemaActivo: null,
    ultimaCaptura: null,
    enDescanso: false,

    // Temporizador de proceso
    procesoIniciado: false,
    procesoEnPausa: false,
    tiempoProcesoInicio: null,
    tiempoProcesoAcumulado: 0, // milisegundos trabajados
    tiempoPausaInicio: null,
    motivoPausaActual: null,
    historialPausas: [],

    // Intervalos
    intervaloProceso: null,

    // Procesos simultáneos
    procesosSimultaneos: [],        // Array de procesos seleccionados para trabajar juntos
    modoSimultaneo: false,          // Si está activo el modo de procesos simultáneos

    // *** MODO MULTI-PEDIDO (CALIDAD/EMPAQUE) ***
    modoMultiPedido: false,         // true si es estación de calidad/empaque
    pedidosActivos: [],             // Array de pedidos activos simultáneos
    // Estructura de cada pedido en pedidosActivos:
    // {
    //     id: string,                   // ID único del pedido (pedidoId-timestamp)
    //     pedidoId: number,             // ID del pedido en BD
    //     codigo: string,               // Código del pedido
    //     cliente: string,              // Nombre del cliente
    //     producto: string,             // Nombre del producto
    //     imagen: string,               // URL de imagen del producto
    //     procesoNombre: string,        // 'Calidad' o 'Empaque'
    //     piezasCapturadas: number,     // Piezas procesadas
    //     piezasMeta: number,           // Meta de piezas
    //     pausaGeneral: boolean,        // Pausa general (sin piezas disponibles)
    //     prioridad: string,            // alta/media/baja
    //     fechaAsignacion: Date,        // Cuándo se asignó
    //     operadores: [                 // Array de operadores trabajando en este pedido
    //         {
    //             id: number,               // ID del operador
    //             nombre: string,           // Nombre del operador
    //             activo: boolean,          // Si está trabajando actualmente
    //             tiempoInicio: Date,       // Cuándo empezó a trabajar
    //             tiempoAcumulado: number,  // Tiempo trabajado en ms
    //             enPausa: boolean,         // Si está en pausa individual
    //             intervalId: number        // ID del intervalo del timer
    //         }
    //     ]
    // }
    pedidoSeleccionado: null,       // ID del pedido actualmente enfocado para captura
    pedidoParaEtiqueta: null,       // Pedido para generar etiqueta
    etiquetasPendientes: [],        // Pedidos listos para generar etiqueta
    listaOperadoresDisponibles: []  // Lista de operadores disponibles para seleccionar
};

// Motivos de pausa con configuración
const MOTIVOS_PAUSA = [
    {
        id: 'comida',
        nombre: 'Comida',
        icono: 'fa-utensils',
        color: '#f59e0b',
        detieneTiempo: true,
        notificaCoco: true
    },
    {
        id: 'descanso',
        nombre: 'Descanso',
        icono: 'fa-coffee',
        color: '#10b981',
        detieneTiempo: true,
        notificaCoco: true
    },
    {
        id: 'bano',
        nombre: 'Baño',
        icono: 'fa-restroom',
        color: '#3b82f6',
        detieneTiempo: false,
        notificaCoco: false
    },
    {
        id: 'sin_material',
        nombre: 'Sin material',
        icono: 'fa-box-open',
        color: '#ef4444',
        detieneTiempo: true,
        notificaCoco: true
    },
    {
        id: 'maquina',
        nombre: 'Problema máquina',
        icono: 'fa-tools',
        color: '#dc2626',
        detieneTiempo: true,
        notificaCoco: true
    },
    {
        id: 'instrucciones',
        nombre: 'Esperando instrucciones',
        icono: 'fa-question-circle',
        color: '#8b5cf6',
        detieneTiempo: true,
        notificaCoco: true
    },
    {
        id: 'llamada_coco',
        nombre: 'Llamada de Coco',
        icono: 'fa-headset',
        color: '#667eea',
        detieneTiempo: false,
        notificaCoco: false
    },
    {
        id: 'cambio_proceso',
        nombre: 'Cambio de proceso',
        icono: 'fa-exchange-alt',
        color: '#6366f1',
        detieneTiempo: true,
        notificaCoco: true
    }
];

// Tipos de problema para reportar
const TIPOS_PROBLEMA = [
    { id: 'sin_material', nombre: 'Sin Material', icono: 'fa-box-open', color: '#ef4444' },
    { id: 'maquina', nombre: 'Problema con Máquina', icono: 'fa-tools', color: '#dc2626' },
    { id: 'instrucciones', nombre: 'Dudas/Instrucciones', icono: 'fa-question-circle', color: '#8b5cf6' },
    { id: 'calidad', nombre: 'Problema de Calidad', icono: 'fa-exclamation-circle', color: '#f59e0b' },
    { id: 'otro', nombre: 'Otro problema', icono: 'fa-ellipsis-h', color: '#6b7280' }
];

// ========================================
// SISTEMA DE FEEDBACK EN TIEMPO REAL
// ========================================

// Niveles de desempeño con umbrales y colores
const NIVELES_DESEMPENO = [
    { id: 'excelente', nombre: 'Excelente', min: 120, color: '#10b981', colorLight: '#d1fae5', icono: 'fa-fire', emoji: '🔥' },
    { id: 'muy_bien', nombre: 'Muy Bien', min: 100, color: '#22c55e', colorLight: '#dcfce7', icono: 'fa-star', emoji: '⭐' },
    { id: 'bien', nombre: 'Bien', min: 85, color: '#84cc16', colorLight: '#ecfccb', icono: 'fa-thumbs-up', emoji: '👍' },
    { id: 'normal', nombre: 'Normal', min: 70, color: '#eab308', colorLight: '#fef9c3', icono: 'fa-check', emoji: '✓' },
    { id: 'bajo', nombre: 'Bajo', min: 50, color: '#f97316', colorLight: '#ffedd5', icono: 'fa-arrow-down', emoji: '📉' },
    { id: 'critico', nombre: 'Crítico', min: 0, color: '#ef4444', colorLight: '#fee2e2', icono: 'fa-exclamation-triangle', emoji: '⚠️' }
];

// Mensajes motivacionales según nivel
const MENSAJES_FEEDBACK = {
    excelente: [
        "¡Increíble ritmo! 🔥 ¡Eres imparable!",
        "¡Producción excepcional! ¡Sigue así!",
        "¡Wow! ¡Estás superando todas las expectativas!",
        "¡Rendimiento de campeona! 🏆",
        "¡Tu eficiencia está por las nubes!"
    ],
    muy_bien: [
        "¡Excelente trabajo! ⭐ ¡Vas muy bien!",
        "¡Superaste la meta! ¡Genial!",
        "¡Gran desempeño! Mantén el ritmo",
        "¡Estás brillando hoy!",
        "¡Muy buen trabajo! El equipo cuenta contigo"
    ],
    bien: [
        "¡Buen trabajo! 👍 Cerca de la meta",
        "¡Vas bien! Un poco más y la superas",
        "¡Sigue así! Estás en buen camino",
        "¡Buen ritmo! Puedes dar más",
        "¡Bien hecho! ¡Casi lo logras!"
    ],
    normal: [
        "Ritmo estable ✓ ¡Puedes acelerarlo!",
        "Vas constante, ¡un esfuerzo más!",
        "Buen avance, ¡sube el ritmo!",
        "Progreso constante, ¡ánimo!",
        "¡Vamos! Un pequeño impulso más"
    ],
    bajo: [
        "¡Ánimo! 💪 Aumenta un poco el ritmo",
        "¿Todo bien? ¡Tú puedes con más!",
        "Un poco más de velocidad ayudaría",
        "¡No te rindas! Acelera un poco",
        "Pequeño esfuerzo extra, ¡vamos!"
    ],
    critico: [
        "¿Necesitas ayuda? Llama a Coco",
        "Revisa si todo está bien con tu proceso",
        "¿Hay algún problema? Estamos para ayudarte",
        "El ritmo está muy bajo, ¿podemos ayudar?",
        "Avísanos si necesitas apoyo"
    ]
};

// Mensajes para logros especiales
const MENSAJES_LOGROS = {
    primera_10: { titulo: "¡Primera decena!", mensaje: "Llevas 10 piezas 🎯", icono: "fa-dice-one" },
    primera_50: { titulo: "¡Medio centenar!", mensaje: "50 piezas completadas 🌟", icono: "fa-star-half-alt" },
    primera_100: { titulo: "¡Centenar!", mensaje: "¡100 piezas! 💯", icono: "fa-medal" },
    meta_50: { titulo: "¡Mitad de meta!", mensaje: "Llevas el 50% 🎯", icono: "fa-flag-checkered" },
    meta_75: { titulo: "¡Casi lo logras!", mensaje: "75% de tu meta 🔥", icono: "fa-fire" },
    meta_cumplida: { titulo: "¡META CUMPLIDA!", mensaje: "¡Lo lograste! 🏆", icono: "fa-trophy" },
    super_meta: { titulo: "¡SUPER ESTRELLA!", mensaje: "¡Superaste la meta! ⭐", icono: "fa-crown" },
    racha_5: { titulo: "¡Racha de 5!", mensaje: "5 capturas seguidas 🔥", icono: "fa-fire-alt" },
    racha_10: { titulo: "¡Imparable!", mensaje: "10 capturas sin parar 💪", icono: "fa-fist-raised" }
};

// Estado del sistema de feedback
const feedbackState = {
    nivelActual: null,
    ultimaEvaluacion: null,
    ultimoMensaje: null,
    rachaPositiva: 0,
    logrosDelDia: [],
    intervaloMonitoreo: null,
    capturasConsecutivas: 0,
    ultimaCapturaTimestamp: null
};

// ========================================
// INICIALIZACIÓN
// ========================================

function initPanelOperadora() {
    DEBUG_MODE && console.log('Inicializando panel de operadora...');

    // Intentar sincronizar datos desde data.js si está disponible
    // Esto es necesario si el panel operadora se abre de forma independiente
    sincronizarDatosAlInicio();

    // Actualizar UI con datos de la operadora
    actualizarHeaderOperadora();

    // *** DETECTAR SI ES ESTACIÓN DE CALIDAD/EMPAQUE ***
    if (esEstacionCalidadEmpaque()) {
        DEBUG_MODE && console.log('[OPERADORA] Modo Multi-Pedido activado (Calidad/Empaque)');
        // Inicializar modo multi-pedido para calidad/empaque
        initModoMultiPedido();
    } else {
        // Modo normal para costura, corte, etc.
        // Cargar datos guardados
        cargarDatosGuardados();

        // Cargar pedido asignado (con pequeño delay para permitir sincronización)
        setTimeout(() => {
            cargarPedidoAsignado();
        }, 100);

        // Restaurar estado del temporizador
        restaurarEstadoTemporizador();
    }

    // Ejecutar tareas iniciales
    actualizarReloj();
    verificarRecordatorioHora();
    actualizarTiempoTurno();
    verificarMensajesCoco();
    actualizarIndicadorConexion();

    // ---- Intervalos consolidados para mejor rendimiento ----
    // Grupo 1: Cada segundo (solo reloj)
    window._erpIntervals = [];
    window._erpIntervals.push(setInterval(actualizarReloj, 1000));

    // Grupo 2: Cada 5 segundos (conexión)
    window._erpIntervals.push(setInterval(actualizarIndicadorConexion, 5000));

    // Grupo 3: Cada 15 segundos (progreso equipo + nueva asignación)
    window._erpIntervals.push(setInterval(function() {
        actualizarProgresoEquipo();
        verificarNuevaAsignacion();
    }, 15000));

    // Grupo 4: Cada 30 segundos (estadísticas + mensajes coco)
    window._erpIntervals.push(setInterval(function() {
        actualizarEstadisticasEnVivo();
        verificarMensajesCoco();
    }, 30000));

    // Grupo 5: Cada 60 segundos (recordatorio hora + tiempo turno)
    window._erpIntervals.push(setInterval(function() {
        verificarRecordatorioHora();
        actualizarTiempoTurno();
    }, 60000));

    // Grupo 6: Cada 5 minutos (badges)
    window._erpIntervals.push(setInterval(verificarNuevosBadges, 300000));

    // Función para limpiar todos los intervalos
    window.clearAllErpIntervals = function() {
        window._erpIntervals.forEach(function(id) { clearInterval(id); });
        window._erpIntervals = [];
    };

    // Escuchar cambios de conexión
    window.addEventListener('online', () => {
        mostrarToast('Conexión restaurada. Sincronizando...', 'info');
        sincronizarColaOffline();
    });

    window.addEventListener('offline', () => {
        mostrarToast('Sin conexión. Trabajando offline', 'warning');
    });

    // Verificar si es primer uso (mostrar tutorial)
    verificarPrimerUso();

    DEBUG_MODE && console.log('Panel inicializado correctamente');
}

/**
 * Verifica si hay una nueva asignación para esta estación
 * Se ejecuta periódicamente para detectar asignaciones de Coco
 */
function verificarNuevaAsignacion() {
    // Si ya tenemos pedido, no verificar
    if (operadoraState.pedidoActual) {
        return;
    }

    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    // Buscar asignación de forma flexible
    let miAsignacion = asignaciones[CONFIG_ESTACION.id];

    // Si no se encuentra, buscar variantes del ID
    if (!miAsignacion || !miAsignacion.pedidoId) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');

        for (const [estId, asignacion] of Object.entries(asignaciones)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                miAsignacion = asignacion;
                break;
            }
        }
    }

    if (miAsignacion && miAsignacion.pedidoId) {
        DEBUG_MODE && console.log('[OPERADORA] Nueva asignación detectada automáticamente');
        mostrarToast('¡Nuevo pedido asignado!', 'success');
        cargarPedidoAsignado();
    }
}

function actualizarHeaderOperadora() {
    if (!authState.operadoraActual) return;

    document.getElementById('userName').textContent = authState.operadoraActual.nombre;
    document.getElementById('headerEstacion').textContent = `${CONFIG_ESTACION.id} - ${CONFIG_ESTACION.nombre}`;
    document.getElementById('loginEstacion').textContent = `${CONFIG_ESTACION.id} - ${CONFIG_ESTACION.nombre}`;

    // Avatar con iniciales
    const iniciales = authState.operadoraActual.nombre.split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    document.getElementById('userAvatar').innerHTML = `<span>${iniciales}</span>`;
}

function actualizarReloj() {
    const ahora = new Date();
    document.getElementById('currentTime').textContent = ahora.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function actualizarTiempoTurno() {
    if (!authState.inicioTurno) return;

    const ahora = new Date();
    const diffMs = ahora - authState.inicioTurno;
    const diffMins = Math.floor(diffMs / 60000);
    const horas = Math.floor(diffMins / 60);
    const minutos = diffMins % 60;

    document.getElementById('turnoTime').textContent = `${horas}h ${minutos}m`;
    document.getElementById('resumenTiempo').textContent = `${horas}h ${minutos}m`;
}

// ========================================
// SINCRONIZACIÓN INICIAL
// ========================================

function sincronizarDatosAlInicio() {
    DEBUG_MODE && console.log('[OPERADORA] Sincronizando datos al inicio...');

    // Si tenemos acceso a las funciones de sincronización de data.js
    if (typeof sincronizarPedidosParaOperadoras === 'function') {
        try {
            sincronizarPedidosParaOperadoras();
            DEBUG_MODE && console.log('[OPERADORA] Pedidos sincronizados desde data.js');
        } catch (e) {
            DEBUG_MODE && console.log('[OPERADORA] No se pudo sincronizar pedidos:', e.message);
        }
    }

    // Verificar si db está disponible y sincronizar pedidos manualmente
    if (typeof db !== 'undefined' && typeof db.getPedidos === 'function') {
        try {
            const todosPedidos = db.getPedidos();
            const activos = todosPedidos.filter(p =>
                ['produccion', 'en_proceso', 'pendiente', 'activo', 'en proceso'].includes((p.estado || '').toLowerCase())
            ).map(p => ({
                id: p.id,
                codigo: p.codigo || `PED-${p.id}`,
                cliente: p.clienteNombre || 'Cliente',
                producto: p.productoNombre || p.descripcion || 'Producto',
                cantidad: p.cantidad || p.cantidadTotal || 0,
                estado: p.estado,
                prioridad: p.prioridad || 'normal',
                fechaEntrega: p.fechaEntrega,
                imagen: p.imagen || null,
                procesos: p.procesos || []
            }));

            localStorage.setItem('pedidos_activos', JSON.stringify(activos));
            DEBUG_MODE && console.log('[OPERADORA] Pedidos sincronizados manualmente:', activos.length);
        } catch (e) {
            DEBUG_MODE && console.log('[OPERADORA] Error sincronizando manualmente:', e.message);
        }
    }

    // Mostrar estado actual de asignaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    DEBUG_MODE && console.log('[OPERADORA] Estado de asignaciones:', Object.keys(asignaciones).length, 'estaciones asignadas');
}

// ========================================
// CARGA DE DATOS
// ========================================

function cargarDatosGuardados() {
    const hoy = new Date().toISOString().split('T')[0];
    const key = `capturas_${authState.operadoraActual?.id}_${hoy}`;
    const guardado = localStorage.getItem(key);

    if (guardado) {
        const datos = JSON.parse(guardado);
        const todasCapturas = datos.capturas || [];

        // Filtrar solo las capturas del proceso actual (si hay uno asignado)
        const procesoActualId = operadoraState.procesoActual?.procesoId;
        const procesoActualNombre = operadoraState.procesoActual?.procesoNombre;

        if (procesoActualId || procesoActualNombre) {
            // Solo cargar capturas que correspondan al proceso actual
            operadoraState.capturasDia = todasCapturas.filter(c => {
                // Si la captura tiene procesoId, comparar con el actual
                if (c.procesoId && procesoActualId) {
                    return c.procesoId == procesoActualId;
                }
                // Si no tiene procesoId pero tiene nombre, comparar por nombre
                if (c.procesoNombre && procesoActualNombre) {
                    return (c.procesoNombre || '').toLowerCase() === procesoActualNombre.toLowerCase();
                }
                return false;
            });
            DEBUG_MODE && console.log('[OPERADORA] Capturas filtradas para proceso actual:', operadoraState.capturasDia.length, 'de', todasCapturas.length);
        } else {
            // No hay proceso actual, no cargar capturas anteriores
            operadoraState.capturasDia = [];
            DEBUG_MODE && console.log('[OPERADORA] Sin proceso actual, capturas reseteadas');
        }

        operadoraState.piezasCapturadas = operadoraState.capturasDia.reduce((sum, c) => sum + c.cantidad, 0);
        operadoraState.ultimaCaptura = datos.ultimaCaptura ? new Date(datos.ultimaCaptura) : null;
    } else {
        // No hay datos guardados, inicializar en 0
        operadoraState.capturasDia = [];
        operadoraState.piezasCapturadas = 0;
    }

    actualizarHistorialUI();
    actualizarAvance();
}

function guardarDatos() {
    const hoy = new Date().toISOString().split('T')[0];
    const key = `capturas_${authState.operadoraActual?.id}_${hoy}`;

    const datos = {
        capturas: operadoraState.capturasDia,
        ultimaCaptura: operadoraState.ultimaCaptura?.toISOString()
    };

    localStorage.setItem(key, JSON.stringify(datos));
}

function cargarPedidoAsignado() {
    // 1. Buscar asignación para esta estación
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    DEBUG_MODE && console.log('[OPERADORA] === DIAGNÓSTICO DE ASIGNACIÓN ===');
    DEBUG_MODE && console.log('[OPERADORA] CONFIG_ESTACION.id:', CONFIG_ESTACION.id);
    DEBUG_MODE && console.log('[OPERADORA] Asignaciones disponibles:', Object.keys(asignaciones));
    DEBUG_MODE && console.log('[OPERADORA] Detalle asignaciones:', JSON.stringify(asignaciones, null, 2));

    // Buscar asignación de forma flexible
    let miAsignacion = asignaciones[CONFIG_ESTACION.id];
    let estacionIdUsada = CONFIG_ESTACION.id;

    // Si no se encuentra, buscar variantes del ID
    if (!miAsignacion || !miAsignacion.pedidoId) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');

        for (const [estId, asignacion] of Object.entries(asignaciones)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            // Comparar normalizado o si uno contiene al otro
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                miAsignacion = asignacion;
                estacionIdUsada = estId;
                DEBUG_MODE && console.log('[OPERADORA] Asignación encontrada con ID alternativo:', estId);
                break;
            }
        }
    }

    if (!miAsignacion || !miAsignacion.pedidoId) {
        DEBUG_MODE && console.log('[OPERADORA] Sin asignación para estación:', CONFIG_ESTACION.id);
        DEBUG_MODE && console.log('[OPERADORA] Tip: Verifica que el ID de estación coincida con el del layout de supervisora');
        mostrarSinPedido();
        return;
    }

    DEBUG_MODE && console.log('[OPERADORA] Asignación encontrada:', miAsignacion);

    // 2. Buscar datos del pedido en múltiples fuentes
    // IMPORTANTE: Usar comparación flexible para manejar string/number
    const pedidoIdBuscado = miAsignacion.pedidoId;
    let pedido = null;

    // Fuente 1: pedidos_activos (sincronizado desde admin)
    const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
    DEBUG_MODE && console.log('[OPERADORA] pedidos_activos disponibles:', pedidosActivos.length, 'pedidos');
    DEBUG_MODE && console.log('[OPERADORA] IDs en pedidos_activos:', pedidosActivos.map(p => `${p.id} (${typeof p.id})`));
    DEBUG_MODE && console.log('[OPERADORA] Buscando pedidoId:', pedidoIdBuscado, '(tipo:', typeof pedidoIdBuscado + ')');

    // Comparación flexible: == en vez de === para manejar "1" == 1
    pedido = pedidosActivos.find(p => p.id == pedidoIdBuscado);

    // Fuente 2: pedidos_dia (legacy)
    if (!pedido) {
        const pedidosDia = JSON.parse(localStorage.getItem('pedidos_dia') || '[]');
        DEBUG_MODE && console.log('[OPERADORA] pedidos_dia disponibles:', pedidosDia.length, 'pedidos');
        pedido = pedidosDia.find(p => p.id == pedidoIdBuscado);
    }

    // Fuente 3: Si no está, intentar desde data.js si está disponible
    if (!pedido && typeof db !== 'undefined' && typeof db.getPedido === 'function') {
        DEBUG_MODE && console.log('[OPERADORA] Buscando en db.getPedido...');
        pedido = db.getPedido(pedidoIdBuscado);
        // Intentar también con conversión de tipo
        if (!pedido) {
            pedido = db.getPedido(parseInt(pedidoIdBuscado));
        }
        if (!pedido) {
            pedido = db.getPedido(String(pedidoIdBuscado));
        }
    }

    // Fuente 4: Obtener todos los pedidos de db y buscar
    if (!pedido && typeof db !== 'undefined' && typeof db.getPedidos === 'function') {
        DEBUG_MODE && console.log('[OPERADORA] Buscando en db.getPedidos()...');
        const todosPedidos = db.getPedidos();
        DEBUG_MODE && console.log('[OPERADORA] Total pedidos en db:', todosPedidos.length);
        pedido = todosPedidos.find(p => p.id == pedidoIdBuscado);

        if (pedido) {
            DEBUG_MODE && console.log('[OPERADORA] Pedido encontrado en db.getPedidos()');
        }
    }

    if (!pedido) {
        DEBUG_MODE && console.warn('[OPERADORA] ⚠️ PEDIDO NO ENCONTRADO:', pedidoIdBuscado);
        DEBUG_MODE && console.warn('[OPERADORA] Revisa que el pedido exista y esté sincronizado');
        mostrarSinPedido();
        return;
    }

    DEBUG_MODE && console.log('[OPERADORA] ✅ Pedido encontrado:', pedido.id, '-', pedido.producto || pedido.descripcion);

    // 3. Configurar estado y mostrar pedido
    operadoraState.pedidoActual = pedido;
    operadoraState.procesoActual = miAsignacion;
    operadoraState.piezasMeta = miAsignacion.meta || miAsignacion.cantidadMeta || pedido.cantidad || 100;
    operadoraState.metaPorMinuto = miAsignacion.metaPorMinuto || 2.5;

    // Resetear piezas capturadas para el nuevo proceso
    // (cargarDatosGuardados filtrará solo las capturas del proceso actual)
    operadoraState.piezasCapturadas = 0;
    operadoraState.capturasDia = [];

    // Cargar capturas previas solo de este proceso (si las hay)
    cargarDatosGuardados();

    mostrarPedido(pedido, miAsignacion);
}

function mostrarPedido(pedido, asignacion) {
    document.getElementById('pedidoCard').style.display = 'block';
    document.getElementById('sinPedido').style.display = 'none';

    document.getElementById('pedidoId').textContent = `#${pedido.id}`;
    document.getElementById('pedidoCliente').innerHTML = `
        <i class="fas fa-building"></i>
        <span>${pedido.cliente || 'Cliente'}</span>
    `;

    // Prioridad
    const prioridadEl = document.getElementById('pedidoPrioridad');
    prioridadEl.textContent = pedido.prioridad || 'Normal';
    prioridadEl.className = `pedido-prioridad ${pedido.prioridad?.toLowerCase() || 'normal'}`;

    // Producto - priorizar datos de la asignación
    const productoNombre = asignacion?.productoNombre || pedido.producto || pedido.nombre || pedido.descripcion || 'Producto';
    document.getElementById('productoNombre').textContent = productoNombre;

    // Imagen del producto - priorizar datos de la asignación
    const imgContainer = document.getElementById('productoImagen');
    const productoImagen = asignacion?.productoImagen || pedido.imagen || pedido.productoImagen || null;

    // Intentar obtener imagen del producto completo si no está disponible
    let imagenFinal = productoImagen;
    if (!imagenFinal && typeof db !== 'undefined' && db.getProducto) {
        // Buscar producto por nombre o ID
        const productos = typeof db.getProductos === 'function' ? db.getProductos() : [];
        const productoCompleto = productos.find(p =>
            p.nombre === productoNombre ||
            p.nombre === pedido.producto ||
            p.id == pedido.productoId ||
            (pedido.productos && pedido.productos[0] && p.id == pedido.productos[0].productoId)
        );
        if (productoCompleto && productoCompleto.imagen) {
            imagenFinal = productoCompleto.imagen;
        }
    }

    if (imagenFinal) {
        imgContainer.innerHTML = `<img src="${imagenFinal}" alt="${productoNombre}">`;
        imgContainer.classList.add('tiene-imagen');
    } else {
        imgContainer.innerHTML = `
            <i class="fas fa-image"></i>
            <span>Sin imagen</span>
        `;
        imgContainer.classList.remove('tiene-imagen');
    }

    // Meta y entrega
    document.getElementById('pedidoMeta').textContent = `${operadoraState.piezasMeta} piezas`;
    document.getElementById('pedidoEntrega').textContent = pedido.fechaEntrega
        ? new Date(pedido.fechaEntrega).toLocaleDateString('es-MX')
        : 'Sin fecha';

    // Detalles específicos por área
    const detallesHTML = cargarDetallesPorArea(pedido, asignacion);
    document.getElementById('pedidoDetalles').innerHTML = detallesHTML;

    // *** NUEVO: Mostrar proceso asignado y cola de procesos ***
    const procesoContainer = document.getElementById('procesoAsignado');
    const procesoNombreEl = document.getElementById('procesoNombreTexto');
    if (procesoContainer && procesoNombreEl) {
        if (asignacion && asignacion.procesoNombre) {
            procesoNombreEl.textContent = asignacion.procesoNombre;
            procesoContainer.style.display = 'flex';
        } else {
            procesoContainer.style.display = 'none';
        }
    }

    // Mostrar cola de procesos con opción de selección múltiple
    DEBUG_MODE && console.log('[OPERADORA] Llamando renderizarColaProcesosOperadora con asignación:', {
        procesoNombre: asignacion?.procesoNombre,
        procesoId: asignacion?.procesoId,
        colaProcesos: asignacion?.colaProcesos,
        simultaneo: asignacion?.simultaneo
    });
    renderizarColaProcesosOperadora(asignacion);

    // Cargar configuración de procesos simultáneos guardada
    cargarConfiguracionSimultaneos();

    // Actualizar progreso
    document.getElementById('progressTotal').textContent = operadoraState.piezasMeta;
    document.getElementById('metaPorMinuto').textContent = operadoraState.metaPorMinuto.toFixed(1);

    actualizarAvance();
}

function mostrarSinPedido() {
    DEBUG_MODE && console.log('[OPERADORA] Mostrando pantalla sin pedido');

    // Ocultar tarjeta de pedido
    const pedidoCard = document.getElementById('pedidoCard');
    if (pedidoCard) {
        pedidoCard.style.display = 'none';
    }

    // Mostrar mensaje de sin pedido
    const sinPedido = document.getElementById('sinPedido');
    if (sinPedido) {
        sinPedido.style.display = 'flex';
    }

    // Ocultar cola de procesos
    const colaContainer = document.getElementById('colaProcesosContainer');
    if (colaContainer) {
        colaContainer.style.display = 'none';
    }

    // Ocultar proceso asignado
    const procesoAsignado = document.getElementById('procesoAsignado');
    if (procesoAsignado) {
        procesoAsignado.style.display = 'none';
    }

    // Resetear temporizador visualmente
    if (typeof actualizarBotonesTemporizador === 'function') {
        actualizarBotonesTemporizador('sin-iniciar');
    }
    if (typeof resetearDisplayTiempo === 'function') {
        resetearDisplayTiempo();
    }

    // Resetear progreso visual
    const progressValue = document.getElementById('progressValue');
    if (progressValue) progressValue.textContent = '0';

    const progressTotal = document.getElementById('progressTotal');
    if (progressTotal) progressTotal.textContent = '0';

    const resumenPiezas = document.getElementById('resumenPiezas');
    if (resumenPiezas) resumenPiezas.textContent = '0';

    // Resetear círculo de progreso
    const circle = document.getElementById('progressBar');
    if (circle) {
        const circumference = 2 * Math.PI * 90; // r = 90
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference;
    }

    const progressCircle = document.getElementById('progressCircle');
    if (progressCircle) {
        progressCircle.classList.remove('bajo', 'medio', 'alto', 'completo');
    }

    // Limpiar estado local
    operadoraState.pedidoActual = null;
    operadoraState.procesoActual = null;
    operadoraState.piezasCapturadas = 0;
    operadoraState.piezasMeta = 0;
    operadoraState.procesoIniciado = false;
    operadoraState.procesoEnPausa = false;

    // Mostrar info de diagnóstico
    const infoEstacion = document.getElementById('sinPedidoEstacion');
    if (infoEstacion) {
        infoEstacion.textContent = CONFIG_ESTACION.id + ' (' + CONFIG_ESTACION.nombre + ')';
    }

    // Log para debug
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    DEBUG_MODE && console.log('[OPERADORA] Sin pedido - asignaciones actuales:', Object.keys(asignaciones));
    DEBUG_MODE && console.log('[OPERADORA] Esta estación (', CONFIG_ESTACION.id, ') tiene asignación:',
        asignaciones[CONFIG_ESTACION.id] ? 'SÍ' : 'NO');
}

/**
 * Refresca la asignación manualmente
 * Útil cuando Coco acaba de asignar un pedido
 */
function refrescarAsignacion() {
    mostrarToast('Verificando asignaciones...', 'info');

    // Primero sincronizar datos
    sincronizarDatosAlInicio();

    // Pequeño delay para que la sincronización se complete
    setTimeout(() => {
        cargarPedidoAsignado();

        // Verificar si ahora hay pedido
        if (operadoraState.pedidoActual) {
            mostrarToast('¡Pedido encontrado!', 'success');
        } else {
            // Mostrar diagnóstico en consola
            DEBUG_MODE && console.log('[OPERADORA] === INFO PARA DIAGNÓSTICO ===');
            DEBUG_MODE && console.log('Estación configurada:', CONFIG_ESTACION.id);

            const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
            DEBUG_MODE && console.log('Asignaciones existentes:', Object.keys(asignaciones));

            if (Object.keys(asignaciones).length > 0) {
                mostrarToast('Hay asignaciones pero no para esta estación. Revisa configuración.', 'warning');
            } else {
                mostrarToast('No hay asignaciones aún. Espera a Coco.', 'info');
            }
        }
    }, 200);
}

// ========================================
// PROCESOS SIMULTÁNEOS
// ========================================

// Detectar si un proceso puede ejecutarse simultáneamente (versión local)
function detectarProcesoSimultaneoLocal(nombre) {
    const nombreLower = (nombre || '').toLowerCase();

    // Procesos de corte - siempre simultáneos entre sí
    if (nombreLower.includes('corte')) {
        return true;
    }

    // Procesos de preparación
    if (nombreLower.includes('preparacion') || nombreLower.includes('preparación')) {
        return true;
    }

    // Procesos de impresión/serigrafía
    if (nombreLower.includes('serigrafia') || nombreLower.includes('serigrafía') ||
        nombreLower.includes('impresion') || nombreLower.includes('impresión')) {
        return true;
    }

    // Procesos de costura pueden ser paralelos entre sí
    if (nombreLower.includes('costura')) {
        return true;
    }

    // Cerrado final - no simultáneo
    if (nombreLower.includes('cerrado')) {
        return false;
    }

    // Calidad/revisión - no simultáneo
    if (nombreLower.includes('calidad') || nombreLower.includes('revision') ||
        nombreLower.includes('revisión') || nombreLower.includes('inspeccion')) {
        return false;
    }

    // Por defecto, permitir
    return true;
}

/**
 * Verifica si un proceso está bloqueado porque depende de otro proceso anterior
 * que aún no se ha completado
 */
function verificarProcesoBloqueado(proceso, procesoActual, colaProcesos) {
    DEBUG_MODE && console.log('[BLOQUEO] Verificando proceso:', proceso.procesoNombre, 'actual:', procesoActual?.procesoNombre);

    // Si es el proceso actual, no está bloqueado
    if (proceso.procesoId === procesoActual?.procesoId) {
        DEBUG_MODE && console.log('[BLOQUEO] Es el proceso actual, no bloqueado');
        return { bloqueado: false, motivo: null };
    }

    // Obtener información del proceso
    const nombreProceso = (proceso.procesoNombre || proceso.nombre || '').toLowerCase().trim();
    const nombreActual = (procesoActual?.procesoNombre || procesoActual?.nombre || '').toLowerCase().trim();
    const ordenProceso = proceso.orden || proceso.procesoOrden || 0;
    const ordenActual = procesoActual?.orden || procesoActual?.procesoOrden || 0;

    DEBUG_MODE && console.log('[BLOQUEO] Orden proceso:', ordenProceso, 'Orden actual:', ordenActual);

    // Si el proceso en cola tiene orden menor o igual al actual, NO está bloqueado
    // (puede trabajarse en paralelo o ya debería haberse hecho antes)
    if (ordenProceso > 0 && ordenActual > 0 && ordenProceso <= ordenActual) {
        DEBUG_MODE && console.log('[BLOQUEO] Orden menor o igual al actual, no bloqueado');
        return { bloqueado: false, motivo: null };
    }

    // Obtener la rutaProcesos del producto para verificar dependencias
    const pedidoId = proceso.pedidoId || procesoActual?.pedidoId;
    const productoId = proceso.productoId || procesoActual?.productoId;

    if (!pedidoId) {
        DEBUG_MODE && console.log('[BLOQUEO] No hay pedidoId, no se verifica');
        return { bloqueado: false, motivo: null };
    }

    // Buscar el producto en la base de datos para obtener la rutaProcesos original
    let rutaProcesos = [];
    try {
        const dbData = JSON.parse(localStorage.getItem('erp_multifundas_db') || '{}');
        const productos = dbData.productos || [];

        // Buscar por productoId o por nombre del producto en el proceso
        let producto = productos.find(p => p.id == productoId);

        if (!producto && proceso.productoNombre) {
            producto = productos.find(p =>
                p.nombre && p.nombre.toLowerCase().includes(proceso.productoNombre.toLowerCase())
            );
        }

        if (producto && producto.rutaProcesos) {
            rutaProcesos = producto.rutaProcesos;
            DEBUG_MODE && console.log('[BLOQUEO] RutaProcesos del producto encontrada:', rutaProcesos.length, 'procesos');
        }
    } catch (e) {
        DEBUG_MODE && console.log('[BLOQUEO] Error obteniendo rutaProcesos:', e);
    }

    // Buscar el orden del proceso actual y del proceso a evaluar en la rutaProcesos
    let ordenEnRuta = 0;
    let ordenActualEnRuta = 0;

    if (rutaProcesos.length > 0) {
        // Buscar el proceso en la ruta por nombre (flexible)
        const procesoEnRuta = rutaProcesos.find(rp => {
            const nombreRuta = (rp.nombre || '').toLowerCase().trim();
            return nombreRuta === nombreProceso ||
                   nombreRuta.includes(nombreProceso) ||
                   nombreProceso.includes(nombreRuta);
        });

        const actualEnRuta = rutaProcesos.find(rp => {
            const nombreRuta = (rp.nombre || '').toLowerCase().trim();
            return nombreRuta === nombreActual ||
                   nombreRuta.includes(nombreActual) ||
                   nombreActual.includes(nombreRuta);
        });

        ordenEnRuta = procesoEnRuta?.orden || ordenProceso;
        ordenActualEnRuta = actualEnRuta?.orden || ordenActual;

        DEBUG_MODE && console.log('[BLOQUEO] Orden en rutaProcesos - proceso:', ordenEnRuta, 'actual:', ordenActualEnRuta);
    } else {
        // Si no hay rutaProcesos, usar el orden del proceso directamente
        ordenEnRuta = ordenProceso;
        ordenActualEnRuta = ordenActual;
    }

    // REGLA PRINCIPAL: Si el proceso tiene un orden mayor que el actual,
    // verificar si los procesos anteriores en la ruta están completados
    if (ordenEnRuta > ordenActualEnRuta && ordenActualEnRuta > 0) {
        // Buscar en pedidos_erp el estado de los procesos anteriores
        const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
        const pedidoERP = pedidosERP.find(p => p.id == pedidoId || p.pedidoId == pedidoId);

        // Obtener los procesos completados
        let procesosCompletados = [];
        if (pedidoERP && pedidoERP.procesos) {
            procesosCompletados = pedidoERP.procesos.filter(p => {
                const piezas = p.piezas || p.piezasCompletadas || p.completadas || 0;
                const meta = p.meta || p.cantidad || 0;
                const completado = p.completado || p.estado === 'completado';
                return completado || (meta > 0 && piezas >= meta);
            });
        }

        DEBUG_MODE && console.log('[BLOQUEO] Procesos completados:', procesosCompletados.map(p => p.nombre || p.procesoNombre));

        // Verificar si hay procesos anteriores (en la rutaProcesos) que no están completados
        // y que están en la cola o son el proceso actual
        for (let i = ordenActualEnRuta; i < ordenEnRuta; i++) {
            // Buscar el proceso con ese orden en la ruta
            const procesoAnteriorEnRuta = rutaProcesos.find(rp => rp.orden === i);

            if (procesoAnteriorEnRuta) {
                const nombreAnterior = (procesoAnteriorEnRuta.nombre || '').toLowerCase().trim();

                // Verificar si este proceso anterior está completado
                const estaCompletado = procesosCompletados.some(pc => {
                    const nombrePc = (pc.nombre || pc.procesoNombre || '').toLowerCase().trim();
                    return nombrePc === nombreAnterior ||
                           nombrePc.includes(nombreAnterior) ||
                           nombreAnterior.includes(nombrePc);
                });

                // Verificar si está en la cola (pendiente de hacer)
                const estaEnCola = colaProcesos?.some(cp => {
                    const nombreCp = (cp.procesoNombre || cp.nombre || '').toLowerCase().trim();
                    return nombreCp === nombreAnterior ||
                           nombreCp.includes(nombreAnterior) ||
                           nombreAnterior.includes(nombreCp);
                });

                // Verificar si es el proceso actual
                const esElActual = nombreActual === nombreAnterior ||
                                   nombreActual.includes(nombreAnterior) ||
                                   nombreAnterior.includes(nombreActual);

                DEBUG_MODE && console.log('[BLOQUEO] Proceso anterior orden', i, ':', procesoAnteriorEnRuta.nombre,
                    'completado:', estaCompletado, 'enCola:', estaEnCola, 'esActual:', esElActual);

                // Si el proceso anterior no está completado Y está en cola o es el actual, bloquear
                if (!estaCompletado && (estaEnCola || esElActual)) {
                    DEBUG_MODE && console.log('[BLOQUEO] >>> BLOQUEANDO porque falta completar:', procesoAnteriorEnRuta.nombre);
                    return {
                        bloqueado: true,
                        motivo: `Requiere completar "${procesoAnteriorEnRuta.nombre}" primero`
                    };
                }
            }
        }
    }

    // Si llegamos aquí y los procesos son del mismo "tipo", permitir simultaneidad
    const tipoProceso = obtenerTipoProceso(nombreProceso);
    const tipoActual = obtenerTipoProceso(nombreActual);

    if (tipoProceso === tipoActual && tipoProceso !== 'final') {
        DEBUG_MODE && console.log('[BLOQUEO] Mismo tipo de proceso, pueden ser simultáneos');
        return { bloqueado: false, motivo: null };
    }

    DEBUG_MODE && console.log('[BLOQUEO] Proceso NO bloqueado:', proceso.procesoNombre);
    return { bloqueado: false, motivo: null };
}

/**
 * Obtiene el tipo de proceso basándose en su nombre
 */
function obtenerTipoProceso(nombre) {
    if (nombre.includes('corte')) return 'corte';
    if (nombre.includes('costura') || nombre.includes('cerrado') || nombre.includes('union') || nombre.includes('unión')) return 'costura';
    if (nombre.includes('serigrafia') || nombre.includes('serigrafía') || nombre.includes('impresion') || nombre.includes('impresión') || nombre.includes('sublimacion') || nombre.includes('sublimación')) return 'impresion';
    if (nombre.includes('preparacion') || nombre.includes('preparación')) return 'preparacion';
    if (nombre.includes('calidad') || nombre.includes('revision') || nombre.includes('revisión') || nombre.includes('empaque') || nombre.includes('inspeccion')) return 'final';
    return 'otro';
}

function renderizarColaProcesosOperadora(asignacion) {
    const container = document.getElementById('colaProcesosContainer');
    if (!container) return;

    // Obtener cola de procesos de la asignación
    const colaProcesos = asignacion?.colaProcesos || [];

    // Obtener pedidoId de la asignación o del estado actual
    const pedidoIdAsignacion = asignacion?.pedidoId || operadoraState.pedidoActual?.id;

    const procesoActual = asignacion?.procesoNombre ? {
        procesoId: asignacion.procesoId,
        procesoNombre: asignacion.procesoNombre,
        pedidoId: pedidoIdAsignacion,
        productoId: asignacion.productoId || operadoraState.pedidoActual?.productoId,
        productoNombre: asignacion.productoNombre || operadoraState.pedidoActual?.productoNombre,
        pedidoCodigo: asignacion.pedidoCodigo || operadoraState.pedidoActual?.codigo,
        orden: asignacion.orden || asignacion.procesoOrden || 0,
        // Si no tiene el campo, detectar automáticamente basándose en el nombre
        simultaneo: asignacion.simultaneo !== undefined ? asignacion.simultaneo : detectarProcesoSimultaneoLocal(asignacion.procesoNombre)
    } : null;

    // Si no hay cola ni proceso actual, ocultar
    if (!procesoActual && colaProcesos.length === 0) {
        container.style.display = 'none';
        return;
    }

    // SIEMPRE mostrar el contenedor si hay proceso actual
    container.style.display = 'block';

    // Marcar procesos en cola como simultáneos si no tienen el campo, y asegurar que tengan pedidoId
    const colaProcesosConSimultaneo = colaProcesos.map(p => ({
        ...p,
        pedidoId: p.pedidoId || pedidoIdAsignacion,
        productoId: p.productoId || asignacion?.productoId,
        productoNombre: p.productoNombre || asignacion?.productoNombre,
        orden: p.orden || p.procesoOrden || 0,
        simultaneo: p.simultaneo !== undefined ? p.simultaneo : detectarProcesoSimultaneoLocal(p.procesoNombre)
    }));

    // Verificar si hay procesos que permiten simultaneidad
    const totalProcesos = (procesoActual ? 1 : 0) + colaProcesosConSimultaneo.length;

    // SIEMPRE mostrar botón de simultaneidad si hay al menos un proceso
    // Esto permite al operador activar el modo y seleccionar procesos cuando lleguen más
    const hayProcesosSimultaneos = totalProcesos >= 1;

    // DEBUG: Log para verificar
    DEBUG_MODE && console.log('[OPERADORA-COLA] Total procesos:', totalProcesos, 'Cola:', colaProcesos.length, 'Mostrar botón simultáneo:', hayProcesosSimultaneos);
    DEBUG_MODE && console.log('[OPERADORA-COLA] Proceso actual:', procesoActual?.procesoNombre, 'orden:', procesoActual?.orden);
    DEBUG_MODE && console.log('[OPERADORA-COLA] Cola con orden:', colaProcesosConSimultaneo.map(p => ({ nombre: p.procesoNombre, orden: p.orden })));

    let html = `
        <div class="cola-procesos-operadora">
            <div class="cola-header">
                <h4><i class="fas fa-tasks"></i> Procesos Asignados</h4>
                ${hayProcesosSimultaneos ? `
                    <button class="btn-simultaneos ${operadoraState.modoSimultaneo ? 'activo' : ''}"
                            onclick="toggleModoSimultaneo()"
                            title="Trabajar procesos simultáneamente">
                        <i class="fas fa-layer-group"></i>
                        ${operadoraState.modoSimultaneo ? 'Modo Simultáneo ON' : 'Activar Simultáneo'}
                    </button>
                ` : ''}
            </div>
    `;

    // Proceso actual
    if (procesoActual) {
        const estaSeleccionado = operadoraState.procesosSimultaneos.some(p => p.procesoId == procesoActual.procesoId);
        // Obtener información adicional del pedido
        const pedidoInfo = obtenerInfoPedidoProceso(asignacion);
        html += `
            <div class="proceso-operadora-wrapper">
                <div class="proceso-operadora-item actual ${estaSeleccionado ? 'seleccionado' : ''}"
                     data-proceso-id="${procesoActual.procesoId}"
                     onclick="toggleDetallesProceso('${procesoActual.procesoId}')">
                    <div class="proceso-check">
                        ${operadoraState.modoSimultaneo ? `
                            <input type="checkbox"
                                   ${estaSeleccionado ? 'checked' : ''}
                                   onchange="event.stopPropagation(); toggleProcesoSimultaneo('${procesoActual.procesoId}', '${procesoActual.procesoNombre}', '${procesoActual.pedidoId || ''}', '${procesoActual.productoId || ''}')"
                                   id="check-${procesoActual.procesoId}">
                        ` : `<i class="fas fa-play-circle"></i>`}
                    </div>
                    <div class="proceso-info">
                        <span class="proceso-nombre">${procesoActual.procesoNombre}</span>
                        <span class="proceso-estado actual">En curso</span>
                    </div>
                    <button class="btn-expandir-proceso" onclick="event.stopPropagation(); toggleDetallesProceso('${procesoActual.procesoId}')" title="Ver detalles">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="proceso-detalles" id="detalles-${procesoActual.procesoId}" style="display: none;">
                    <div class="detalle-item">
                        <i class="fas fa-shopping-cart"></i>
                        <span><strong>Pedido:</strong> #${pedidoInfo.pedidoId} - ${pedidoInfo.cliente}</span>
                    </div>
                    <div class="detalle-item">
                        <i class="fas fa-box"></i>
                        <span><strong>Producto:</strong> ${pedidoInfo.producto}</span>
                    </div>
                    <div class="detalle-item">
                        <i class="fas fa-layer-group"></i>
                        <span><strong>Cantidad:</strong> ${pedidoInfo.cantidad} piezas</span>
                    </div>
                    ${pedidoInfo.notas ? `
                    <div class="detalle-item notas">
                        <i class="fas fa-sticky-note"></i>
                        <span><strong>Notas:</strong> ${pedidoInfo.notas}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Cola de procesos (usar la versión con simultaneo calculado)
    if (colaProcesosConSimultaneo.length > 0) {
        html += `<div class="cola-procesos-lista">`;
        colaProcesosConSimultaneo.forEach((proceso, idx) => {
            const estaSeleccionado = operadoraState.procesosSimultaneos.some(p => p.procesoId == proceso.procesoId);

            // Verificar si el proceso está bloqueado por dependencias
            const verificacion = verificarProcesoBloqueado(proceso, procesoActual, colaProcesosConSimultaneo);
            const estaBloqueado = verificacion.bloqueado;
            const motivoBloqueo = verificacion.motivo;

            // Si está bloqueado, no permitir selección en modo simultáneo
            const puedeSeleccionar = operadoraState.modoSimultaneo && !estaBloqueado && proceso.simultaneo;

            html += `
                <div class="proceso-operadora-wrapper">
                    <div class="proceso-operadora-item en-cola ${estaSeleccionado ? 'seleccionado' : ''} ${estaBloqueado ? 'bloqueado' : ''}"
                         data-proceso-id="${proceso.procesoId}"
                         onclick="toggleDetallesProceso('${proceso.procesoId}')"
                         ${estaBloqueado ? `title="${S(motivoBloqueo)}"` : ''}>
                        <div class="proceso-check">
                            ${puedeSeleccionar ? `
                                <input type="checkbox"
                                       ${estaSeleccionado ? 'checked' : ''}
                                       onchange="event.stopPropagation(); toggleProcesoSimultaneo('${proceso.procesoId}', '${proceso.procesoNombre}', '${proceso.pedidoId || ''}', '${proceso.productoId || ''}')"
                                       id="check-${proceso.procesoId}">
                            ` : estaBloqueado ? `
                                <i class="fas fa-lock" title="${S(motivoBloqueo)}"></i>
                            ` : `<span class="cola-num">${idx + 1}</span>`}
                        </div>
                        <div class="proceso-info">
                            <span class="proceso-nombre">${S(proceso.procesoNombre)}</span>
                            ${estaBloqueado ? `
                                <span class="proceso-bloqueado-msg"><i class="fas fa-exclamation-triangle"></i> ${motivoBloqueo}</span>
                            ` : `
                                <span class="proceso-pedido">${proceso.pedidoCodigo || 'Pedido #' + (proceso.pedidoId || '')}</span>
                            `}
                        </div>
                        <button class="btn-expandir-proceso" onclick="event.stopPropagation(); toggleDetallesProceso('${proceso.procesoId}')" title="Ver detalles">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="proceso-detalles" id="detalles-${proceso.procesoId}" style="display: none;">
                        <div class="detalle-item">
                            <i class="fas fa-shopping-cart"></i>
                            <span><strong>Pedido:</strong> #${proceso.pedidoId || 'N/A'} - ${proceso.clienteNombre || 'Cliente'}</span>
                        </div>
                        <div class="detalle-item">
                            <i class="fas fa-box"></i>
                            <span><strong>Producto:</strong> ${proceso.productoNombre || 'Producto'}</span>
                        </div>
                        <div class="detalle-item">
                            <i class="fas fa-layer-group"></i>
                            <span><strong>Cantidad:</strong> ${proceso.cantidad || proceso.meta || 'N/A'} piezas</span>
                        </div>
                        ${estaBloqueado ? `
                        <div class="detalle-item bloqueado-info">
                            <i class="fas fa-info-circle"></i>
                            <span><strong>Estado:</strong> Bloqueado - ${motivoBloqueo}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    // Resumen de procesos simultáneos activos
    if (operadoraState.modoSimultaneo && operadoraState.procesosSimultaneos.length > 0) {
        html += `
            <div class="procesos-simultaneos-activos">
                <div class="simultaneos-header">
                    <i class="fas fa-layer-group"></i>
                    <span>Trabajando ${operadoraState.procesosSimultaneos.length} procesos:</span>
                </div>
                <div class="simultaneos-lista">
                    ${operadoraState.procesosSimultaneos.map(p => `
                        <span class="simultaneo-tag">${p.procesoNombre}</span>
                    `).join('')}
                </div>
                <p class="simultaneos-nota">Las piezas se contabilizarán para todos los procesos seleccionados</p>
                <button class="btn btn-primary btn-guardar-simultaneos" onclick="guardarProcesosSimultaneos()">
                    <i class="fas fa-save"></i> Guardar Configuración
                </button>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

function toggleModoSimultaneo() {
    operadoraState.modoSimultaneo = !operadoraState.modoSimultaneo;

    if (!operadoraState.modoSimultaneo) {
        // Al desactivar, limpiar selección
        operadoraState.procesosSimultaneos = [];
        // Sincronizar que ya no hay procesos simultáneos
        sincronizarProcesosSimultaneos();
    }

    // Re-renderizar
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const miAsignacion = asignaciones[CONFIG_ESTACION.id];
    renderizarColaProcesosOperadora(miAsignacion);

    mostrarToast(
        operadoraState.modoSimultaneo
            ? 'Modo simultáneo activado. Selecciona los procesos a trabajar juntos.'
            : 'Modo simultáneo desactivado.',
        'info'
    );
}

function toggleProcesoSimultaneo(procesoId, procesoNombre, pedidoId, productoId) {
    const index = operadoraState.procesosSimultaneos.findIndex(p => p.procesoId == procesoId);

    // Obtener pedidoId del estado actual si no se pasó
    const pedidoIdFinal = pedidoId || operadoraState.pedidoActual?.id;
    const productoIdFinal = productoId || operadoraState.pedidoActual?.productoId;

    if (index >= 0) {
        // Quitar de la selección
        operadoraState.procesosSimultaneos.splice(index, 1);
        DEBUG_MODE && console.log('[OPERADORA] Proceso removido de simultáneos:', procesoNombre);
    } else {
        // Antes de agregar, verificar si el proceso está bloqueado
        const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
        const miAsignacion = asignaciones[CONFIG_ESTACION.id];
        const colaProcesos = miAsignacion?.colaProcesos || [];

        // Construir objeto de proceso actual
        const procesoActual = miAsignacion?.procesoNombre ? {
            procesoId: miAsignacion.procesoId,
            procesoNombre: miAsignacion.procesoNombre,
            pedidoId: miAsignacion.pedidoId || pedidoIdFinal,
            productoId: miAsignacion.productoId || productoIdFinal,
            productoNombre: miAsignacion.productoNombre,
            orden: miAsignacion.orden || miAsignacion.procesoOrden || 0
        } : null;

        // Buscar el proceso en la cola para obtener su orden
        const procesoEnCola = colaProcesos.find(p => p.procesoId == procesoId || p.procesoNombre === procesoNombre);

        // Construir objeto del proceso a verificar
        const procesoAVerificar = {
            procesoId: procesoId,
            procesoNombre: procesoNombre,
            pedidoId: pedidoIdFinal,
            productoId: productoIdFinal,
            productoNombre: procesoEnCola?.productoNombre || miAsignacion?.productoNombre,
            orden: procesoEnCola?.orden || procesoEnCola?.procesoOrden || 0
        };

        // Verificar si está bloqueado
        const verificacion = verificarProcesoBloqueado(procesoAVerificar, procesoActual, colaProcesos);

        if (verificacion.bloqueado) {
            mostrarToast(`No se puede seleccionar: ${verificacion.motivo}`, 'warning');
            DEBUG_MODE && console.log('[OPERADORA] Proceso bloqueado, no se puede agregar a simultáneos:', procesoNombre, verificacion.motivo);
            return;
        }

        // Agregar a la selección con información completa
        operadoraState.procesosSimultaneos.push({
            procesoId: procesoId,
            procesoNombre: procesoNombre,
            pedidoId: pedidoIdFinal,
            productoId: productoIdFinal
        });
        DEBUG_MODE && console.log('[OPERADORA] Proceso agregado a simultáneos:', procesoNombre, 'pedidoId:', pedidoIdFinal);
    }

    // Sincronizar con localStorage para que supervisora vea los procesos activos
    sincronizarProcesosSimultaneos();

    // También registrar en pedidos_erp que estos procesos están siendo trabajados
    registrarProcesosSimultaneosEnERP();

    // Re-renderizar
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const miAsignacion = asignaciones[CONFIG_ESTACION.id];
    renderizarColaProcesosOperadora(miAsignacion);

    // Mostrar feedback
    if (operadoraState.procesosSimultaneos.length > 0) {
        mostrarToast(`${operadoraState.procesosSimultaneos.length} proceso(s) seleccionado(s) para trabajo simultáneo`, 'info');
    }
}

/**
 * Registra los procesos simultáneos en pedidos_erp para que se pueda hacer seguimiento
 */
function registrarProcesosSimultaneosEnERP() {
    if (operadoraState.procesosSimultaneos.length === 0) return;

    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    let huboCambios = false;

    operadoraState.procesosSimultaneos.forEach(proc => {
        const pedidoId = proc.pedidoId || operadoraState.pedidoActual?.id;
        if (!pedidoId) return;

        // Buscar o crear el pedido
        let pedidoIndex = pedidosERP.findIndex(p => p.id == pedidoId);

        if (pedidoIndex < 0) {
            // Crear pedido
            pedidosERP.push({
                id: pedidoId,
                codigo: operadoraState.pedidoActual?.codigo || `PED-${pedidoId}`,
                cliente: operadoraState.pedidoActual?.cliente || 'Cliente',
                producto: operadoraState.pedidoActual?.producto || 'Producto',
                cantidad: operadoraState.pedidoActual?.cantidad || operadoraState.piezasMeta || 0,
                estado: 'en-proceso',
                procesos: []
            });
            pedidoIndex = pedidosERP.length - 1;
            huboCambios = true;
        }

        const pedido = pedidosERP[pedidoIndex];
        if (!pedido.procesos) pedido.procesos = [];

        // Buscar o crear el proceso
        let procesoIndex = pedido.procesos.findIndex(p => p.id == proc.procesoId);

        if (procesoIndex < 0) {
            // Buscar por nombre
            procesoIndex = pedido.procesos.findIndex(p =>
                (p.nombre || '').toLowerCase() === (proc.procesoNombre || '').toLowerCase()
            );
        }

        if (procesoIndex < 0) {
            // Crear proceso
            pedido.procesos.push({
                id: proc.procesoId,
                nombre: proc.procesoNombre,
                tipo: 'produccion',
                estado: 'en-proceso',
                piezas: 0,
                orden: pedido.procesos.length + 1,
                pedidoId: pedidoId,
                operadoraId: authState.operadoraActual?.id,
                operadoraNombre: authState.operadoraActual?.nombre,
                estacionId: CONFIG_ESTACION.id,
                inicioTrabajo: new Date().toISOString()
            });
            huboCambios = true;
            DEBUG_MODE && console.log('[OPERADORA] Proceso creado en pedidos_erp:', proc.procesoNombre);
        } else {
            // Actualizar estado a en-proceso
            if (pedido.procesos[procesoIndex].estado === 'pendiente') {
                pedido.procesos[procesoIndex].estado = 'en-proceso';
                pedido.procesos[procesoIndex].operadoraId = authState.operadoraActual?.id;
                pedido.procesos[procesoIndex].operadoraNombre = authState.operadoraActual?.nombre;
                pedido.procesos[procesoIndex].estacionId = CONFIG_ESTACION.id;
                pedido.procesos[procesoIndex].inicioTrabajo = new Date().toISOString();
                huboCambios = true;
            }
        }
    });

    if (huboCambios) {
        localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
        DEBUG_MODE && console.log('[OPERADORA] pedidos_erp actualizado con procesos simultáneos');
    }
}

/**
 * Guarda la configuración de procesos simultáneos de forma persistente
 * para que se mantenga incluso después de recargar la página
 */
function guardarProcesosSimultaneos() {
    if (operadoraState.procesosSimultaneos.length === 0) {
        mostrarToast('No hay procesos seleccionados para guardar', 'warning');
        return;
    }

    const estacionId = CONFIG_ESTACION.id;

    // Guardar configuración de procesos simultáneos persistente
    const configSimultaneos = {
        estacionId: estacionId,
        modoSimultaneo: true,
        procesosSimultaneos: operadoraState.procesosSimultaneos.map(p => ({
            procesoId: p.procesoId,
            procesoNombre: p.procesoNombre,
            pedidoId: p.pedidoId,
            productoId: p.productoId
        })),
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        fechaGuardado: new Date().toISOString()
    };

    // Guardar en localStorage con clave específica de la estación
    localStorage.setItem(`config_simultaneos_${estacionId}`, JSON.stringify(configSimultaneos));

    // También sincronizar con estado_maquinas y asignaciones
    sincronizarProcesosSimultaneos();
    registrarProcesosSimultaneosEnERP();

    // Feedback visual
    mostrarToast(`Configuración guardada: ${operadoraState.procesosSimultaneos.length} procesos simultáneos`, 'success');

    // Efecto visual en el botón
    const btn = document.querySelector('.btn-guardar-simultaneos');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        btn.classList.add('guardado');
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-save"></i> Guardar Configuración';
            btn.classList.remove('guardado');
        }, 2000);
    }

    DEBUG_MODE && console.log('[OPERADORA] Configuración de procesos simultáneos guardada:', configSimultaneos);
}

/**
 * Carga la configuración de procesos simultáneos guardada
 */
function cargarConfiguracionSimultaneos() {
    const estacionId = CONFIG_ESTACION.id;
    const configGuardada = localStorage.getItem(`config_simultaneos_${estacionId}`);

    if (configGuardada) {
        try {
            const config = JSON.parse(configGuardada);

            // Verificar que la configuración corresponde a la misma operadora
            if (config.operadoraId === authState.operadoraActual?.id) {
                operadoraState.modoSimultaneo = config.modoSimultaneo || false;
                operadoraState.procesosSimultaneos = config.procesosSimultaneos || [];

                DEBUG_MODE && console.log('[OPERADORA] Configuración de simultáneos cargada:', config);

                // Re-renderizar si hay procesos
                if (operadoraState.procesosSimultaneos.length > 0) {
                    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
                    const miAsignacion = asignaciones[CONFIG_ESTACION.id];
                    if (miAsignacion) {
                        renderizarColaProcesosOperadora(miAsignacion);
                    }
                    mostrarToast(`Modo simultáneo restaurado: ${operadoraState.procesosSimultaneos.length} procesos`, 'info');
                }
            }
        } catch (e) {
            console.error('[OPERADORA] Error al cargar config simultáneos:', e);
        }
    }
}

/**
 * Sincroniza los procesos simultáneos seleccionados con localStorage
 * para que la supervisora pueda ver qué procesos está trabajando el operador
 */
function sincronizarProcesosSimultaneos() {
    const estacionId = CONFIG_ESTACION.id;

    // 1. Actualizar estado_maquinas con los procesos simultáneos
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');

    if (!estadoMaquinas[estacionId]) {
        estadoMaquinas[estacionId] = {};
    }

    estadoMaquinas[estacionId] = {
        ...estadoMaquinas[estacionId],
        modoSimultaneo: operadoraState.modoSimultaneo,
        procesosSimultaneos: operadoraState.procesosSimultaneos.map(p => ({
            procesoId: p.procesoId,
            procesoNombre: p.procesoNombre,
            pedidoId: p.pedidoId || operadoraState.pedidoActual?.id,
            productoId: p.productoId || operadoraState.pedidoActual?.productoId
        })),
        pedidoId: operadoraState.pedidoActual?.id,
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        ultimaActualizacion: new Date().toISOString()
    };

    // Si hay procesos seleccionados, marcar como trabajando
    if (operadoraState.procesosSimultaneos.length > 0) {
        estadoMaquinas[estacionId].estado = 'trabajando';
        estadoMaquinas[estacionId].procesoActivo = true;
    }

    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // 2. Actualizar asignaciones_estaciones para marcar procesos como trabajándose
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    if (asignaciones[estacionId]) {
        asignaciones[estacionId].modoSimultaneo = operadoraState.modoSimultaneo;
        asignaciones[estacionId].procesosSimultaneosActivos = operadoraState.procesosSimultaneos.map(p => p.procesoId);
        asignaciones[estacionId].ultimaActualizacion = new Date().toISOString();

        // Si hay procesos simultáneos seleccionados, marcar estado activo
        if (operadoraState.procesosSimultaneos.length > 0) {
            asignaciones[estacionId].estado = 'activo';
        }

        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    DEBUG_MODE && console.log('[OPERADORA] Procesos simultáneos sincronizados:', operadoraState.procesosSimultaneos);
}

// ========================================
// CAPTURA DE PRODUCCIÓN
// ========================================

function ajustarCantidad(delta) {
    const input = document.getElementById('cantidadCaptura');
    let valor = parseInt(input.value) || 0;
    valor = Math.max(0, valor + delta);
    input.value = valor;
}

function setCantidad(cantidad) {
    const input = document.getElementById('cantidadCaptura');
    const valorActual = parseInt(input.value) || 0;
    input.value = valorActual + cantidad;
}

function capturarPiezas() {
    const cantidad = parseInt(document.getElementById('cantidadCaptura').value) || 0;

    if (cantidad <= 0) {
        mostrarToast('Ingresa la cantidad de piezas', 'warning');
        return;
    }

    if (!operadoraState.pedidoActual) {
        mostrarToast('No tienes un pedido asignado', 'error');
        return;
    }

    // *** INTEGRACIÓN FEEDBACK: Guardar piezas antes para verificar logros ***
    const piezasAntes = operadoraState.piezasCapturadas;

    // Determinar qué procesos reciben las piezas
    let procesosACapturar = [];

    if (operadoraState.modoSimultaneo && operadoraState.procesosSimultaneos.length > 0) {
        // Modo simultáneo: capturar para todos los procesos seleccionados
        procesosACapturar = operadoraState.procesosSimultaneos;
    } else {
        // Modo normal: solo el proceso actual
        procesosACapturar = [{
            procesoId: operadoraState.procesoActual?.procesoId,
            procesoNombre: operadoraState.procesoActual?.procesoNombre || 'Proceso'
        }];
    }

    // Crear registro para cada proceso
    procesosACapturar.forEach(proceso => {
        const captura = {
            id: Date.now() + Math.random(),
            fecha: new Date().toISOString(),
            hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            cantidad: cantidad,
            operadoraId: authState.operadoraActual.id,
            operadoraNombre: authState.operadoraActual.nombre,
            estacionId: CONFIG_ESTACION.id,
            pedidoId: operadoraState.pedidoActual?.id,
            procesoId: proceso.procesoId,
            procesoNombre: proceso.procesoNombre,
            modoSimultaneo: operadoraState.modoSimultaneo,
            procesosSimultaneos: operadoraState.modoSimultaneo ? procesosACapturar.map(p => p.procesoNombre) : null
        };

        operadoraState.capturasDia.push(captura);
        if (verificarConexion()) {
            sincronizarConSupervisora(captura);
        } else {
            agregarAColaOffline('capturas', captura);
            actualizarIndicadorConexion();
        }
    });

    // Actualizar contador (solo una vez, no por cada proceso)
    operadoraState.piezasCapturadas += cantidad;
    operadoraState.ultimaCaptura = new Date();

    guardarDatos();
    actualizarAvance();
    actualizarHistorialUI();

    // Limpiar y feedback
    document.getElementById('cantidadCaptura').value = 0;

    // Mensaje según modo
    if (operadoraState.modoSimultaneo && procesosACapturar.length > 1) {
        mostrarToast(`¡${cantidad} piezas registradas en ${procesosACapturar.length} procesos!`, 'success');
    } else {
        mostrarToast(`¡${cantidad} piezas registradas!`, 'success');
    }

    // *** INTEGRACIÓN FEEDBACK: Micro-feedback visual ***
    mostrarMicroFeedbackCaptura(cantidad);

    // *** INTEGRACIÓN FEEDBACK: Verificar logros ***
    verificarLogros(piezasAntes, operadoraState.piezasCapturadas);

    // *** INTEGRACIÓN FEEDBACK: Actualizar indicador de desempeño ***
    if (operadoraState.procesoIniciado) {
        actualizarIndicadorDesempeno();
    }

    // Celebrar si cumplió meta individual (ahora manejado también por verificarLogros)
    if (operadoraState.piezasCapturadas >= operadoraState.piezasMeta && piezasAntes < operadoraState.piezasMeta) {
        celebrarMeta();
    }

    // *** NUEVA LÓGICA: Auto-finalizar cuando se alcanza la meta del EQUIPO ***
    // Verificar si hay otras operadoras trabajando en el mismo proceso
    const otrasOperadoras = obtenerOtrasOperadorasEnProceso();
    const totalOtras = otrasOperadoras.reduce((sum, op) => sum + op.piezas, 0);
    const granTotal = operadoraState.piezasCapturadas + totalOtras;

    if (operadoraState.piezasMeta > 0 && granTotal >= operadoraState.piezasMeta) {
        DEBUG_MODE && console.log('[OPERADORA] Meta del EQUIPO alcanzada. Gran total:', granTotal, '/', operadoraState.piezasMeta);

        // Si el gran total cumple la meta, auto-finalizar
        // Pero solo si mis piezas contribuyen (para evitar finalizar sin haber trabajado)
        if (operadoraState.piezasCapturadas > 0) {
            DEBUG_MODE && console.log('[OPERADORA] Iniciando auto-finalización por meta de equipo...');
            // Pequeño delay para que el usuario vea el feedback
            setTimeout(() => {
                mostrarToast('¡El equipo completó la meta del proceso!', 'success');
                finalizarProcesoAutomatico();
            }, 1500);
        }
    }

    // Actualizar recordatorio
    verificarRecordatorioHora();
}

function sincronizarConSupervisora(captura) {
    // Guardar en historial_produccion (clave unificada)
    const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');

    const registro = {
        id: Date.now(),
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        estacionId: CONFIG_ESTACION.id,
        estacionNombre: CONFIG_ESTACION.nombre,
        area: CONFIG_ESTACION.area,
        pedidoId: operadoraState.pedidoActual?.id,
        pedidoCodigo: operadoraState.pedidoActual?.codigo,
        procesoId: operadoraState.procesoActual?.procesoId,
        procesoNombre: operadoraState.procesoActual?.procesoNombre,
        cantidad: captura.cantidad,
        piezasAcumuladas: operadoraState.piezasCapturadas,
        fecha: new Date().toISOString(),
        hora: new Date().toTimeString().slice(0, 5),
        tipo: 'captura_operadora'
    };

    historial.push(registro);
    localStorage.setItem('historial_produccion', JSON.stringify(historial.slice(-1000)));

    // Actualizar avance del proceso en pedidos_erp (para que supervisora lo vea)
    const pedidoId = operadoraState.pedidoActual?.id;
    const procesoId = captura.procesoId || operadoraState.procesoActual?.procesoId;
    const procesoNombre = operadoraState.procesoActual?.procesoNombre || operadoraState.procesoActual?.nombre;

    if (pedidoId) {
        const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
        // Usar == para comparación flexible (string/number)
        let pedidoIndex = pedidosERP.findIndex(p => p.id == pedidoId);

        // Si el pedido no existe en pedidos_erp, crearlo
        if (pedidoIndex < 0) {
            const nuevoPedido = {
                id: pedidoId,
                codigo: operadoraState.pedidoActual?.codigo || `PED-${pedidoId}`,
                cliente: operadoraState.pedidoActual?.cliente || operadoraState.pedidoActual?.clienteNombre || 'Cliente',
                producto: operadoraState.pedidoActual?.producto || operadoraState.pedidoActual?.productoNombre || 'Producto',
                cantidad: operadoraState.pedidoActual?.cantidad || operadoraState.piezasMeta || 0,
                estado: 'en-proceso',
                procesos: []
            };
            pedidosERP.push(nuevoPedido);
            pedidoIndex = pedidosERP.length - 1;
            DEBUG_MODE && console.log('[OPERADORA] Pedido creado en pedidos_erp:', pedidoId);
        }

        const pedido = pedidosERP[pedidoIndex];
        if (!pedido.procesos) {
            pedido.procesos = [];
        }

        // Buscar el proceso por ID primero
        let procesoIndex = pedido.procesos.findIndex(p => p.id == procesoId);

        // Si no se encuentra por ID, buscar por nombre
        if (procesoIndex < 0 && procesoNombre) {
            procesoIndex = pedido.procesos.findIndex(p =>
                (p.nombre || '').toLowerCase() === procesoNombre.toLowerCase()
            );
        }

        // Si el proceso no existe, crearlo
        if (procesoIndex < 0) {
            const nuevoProceso = {
                id: procesoId || `proc-${Date.now()}`,
                nombre: procesoNombre || 'Proceso',
                tipo: operadoraState.procesoActual?.tipo || 'produccion',
                estado: 'en-proceso',
                piezas: 0,
                orden: pedido.procesos.length + 1,
                pedidoId: pedidoId
            };
            pedido.procesos.push(nuevoProceso);
            procesoIndex = pedido.procesos.length - 1;
            DEBUG_MODE && console.log('[OPERADORA] Proceso creado en pedidos_erp:', procesoId, procesoNombre);
        }

        // Actualizar piezas del proceso (acumular)
        pedido.procesos[procesoIndex].piezas = (pedido.procesos[procesoIndex].piezas || 0) + captura.cantidad;
        pedido.procesos[procesoIndex].ultimaActualizacion = new Date().toISOString();
        pedido.procesos[procesoIndex].operadoraId = authState.operadoraActual?.id;
        pedido.procesos[procesoIndex].operadoraNombre = authState.operadoraActual?.nombre;
        pedido.procesos[procesoIndex].estacionId = CONFIG_ESTACION.id;

        // Si el proceso está en estado pendiente, cambiarlo a en-proceso
        if (pedido.procesos[procesoIndex].estado === 'pendiente') {
            pedido.procesos[procesoIndex].estado = 'en-proceso';
        }

        localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
        DEBUG_MODE && console.log('[OPERADORA] Avance actualizado en pedido:', pedidoId, 'proceso:', procesoId || procesoNombre, 'piezas:', pedido.procesos[procesoIndex].piezas);
    }

    // También actualizar estado de la máquina en tiempo real
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    estadoMaquinas[CONFIG_ESTACION.id] = {
        ...(estadoMaquinas[CONFIG_ESTACION.id] || {}),
        estado: 'trabajando',
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        pedidoId: operadoraState.pedidoActual?.id,
        procesoId: procesoId,
        procesoNombre: operadoraState.procesoActual?.procesoNombre,
        piezasHoy: operadoraState.piezasCapturadas,
        ultimaCaptura: new Date().toISOString(),
        procesoActivo: true
    };
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    DEBUG_MODE && console.log('[OPERADORA] Captura sincronizada:', registro.cantidad, 'piezas');
}

function actualizarAvance() {
    const piezas = operadoraState.piezasCapturadas;
    const meta = operadoraState.piezasMeta || 1;
    const porcentaje = Math.min(100, Math.round((piezas / meta) * 100));

    // Actualizar valores
    document.getElementById('progressValue').textContent = piezas;
    document.getElementById('resumenPiezas').textContent = piezas;

    // Actualizar círculo de progreso
    const circle = document.getElementById('progressBar');
    const circumference = 2 * Math.PI * 90; // r = 90
    const offset = circumference - (porcentaje / 100) * circumference;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;

    // Color según progreso
    const progressCircle = document.getElementById('progressCircle');
    progressCircle.classList.remove('bajo', 'medio', 'alto', 'completo');
    if (porcentaje >= 100) {
        progressCircle.classList.add('completo');
    } else if (porcentaje >= 75) {
        progressCircle.classList.add('alto');
    } else if (porcentaje >= 50) {
        progressCircle.classList.add('medio');
    } else {
        progressCircle.classList.add('bajo');
    }

    // Calcular eficiencia
    actualizarEficiencia();

    // Actualizar progreso del equipo (otras operadoras en el mismo proceso)
    actualizarProgresoEquipo();
}

function actualizarEficiencia() {
    if (!authState.inicioTurno) return;

    const ahora = new Date();
    const minutosTranscurridos = (ahora - authState.inicioTurno) / 60000;

    if (minutosTranscurridos > 0) {
        const piezasPorMinuto = operadoraState.piezasCapturadas / minutosTranscurridos;
        const eficiencia = (piezasPorMinuto / operadoraState.metaPorMinuto) * 100;

        document.getElementById('actualPorMinuto').textContent = piezasPorMinuto.toFixed(1);
        document.getElementById('resumenEficiencia').textContent = `${Math.round(eficiencia)}%`;

        // Color según eficiencia
        const eficienciaEl = document.getElementById('resumenEficiencia');
        eficienciaEl.classList.remove('bajo', 'medio', 'alto');
        if (eficiencia >= 100) {
            eficienciaEl.classList.add('alto');
        } else if (eficiencia >= 80) {
            eficienciaEl.classList.add('medio');
        } else {
            eficienciaEl.classList.add('bajo');
        }
    }
}

function actualizarHistorialUI() {
    const container = document.getElementById('historialCapturas');
    const capturas = operadoraState.capturasDia.slice(-5).reverse();

    if (capturas.length === 0) {
        container.innerHTML = '<p class="sin-capturas">Sin capturas hoy</p>';
        return;
    }

    container.innerHTML = capturas.map(c => `
        <div class="historial-item">
            <span class="historial-hora">${c.hora}</span>
            <span class="historial-cantidad">+${c.cantidad} pzas</span>
        </div>
    `).join('');
}

/**
 * Obtiene otras operadoras que están trabajando en el mismo proceso
 * @returns {Array} Lista de operadoras con sus piezas
 */
function obtenerOtrasOperadorasEnProceso() {
    const miProcesoId = operadoraState.procesoActual?.id || operadoraState.procesoActual?.procesoId;
    const miProcesoNombre = operadoraState.procesoActual?.nombre || operadoraState.procesoActual?.procesoNombre;
    const miPedidoId = operadoraState.pedidoActual?.id;
    const miOperadoraId = authState.operadoraActual?.id;
    const miEstacionId = CONFIG_ESTACION?.id;

    if (!miProcesoNombre || !miPedidoId) return [];

    const otrasOperadoras = [];

    try {
        // Buscar en asignaciones_estaciones
        const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
        // Buscar en estado_maquinas (fuente principal de piezas en tiempo real)
        const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');

        // Obtener personal para los nombres
        const dbData = JSON.parse(localStorage.getItem('erp_multifundas_db') || '{}');
        const personal = dbData.personal || [];

        // Normalizar nombre de proceso para comparación
        const miProcesoNombreLower = miProcesoNombre.toLowerCase().trim();

        for (const [estacionId, asignacion] of Object.entries(asignaciones)) {
            // Saltar mi propia estación
            if (estacionId === miEstacionId) continue;

            // Verificar si está trabajando en el mismo proceso y pedido
            const procesoNombreAsignacion = (asignacion.procesoNombre || '').toLowerCase().trim();
            const pedidoIdAsignacion = asignacion.pedidoId;

            const mismoProcesoNombre = procesoNombreAsignacion === miProcesoNombreLower;
            const mismoPedido = pedidoIdAsignacion == miPedidoId;

            if (mismoProcesoNombre && mismoPedido) {
                // Obtener info de la operadora
                const estadoMaquina = estadoMaquinas[estacionId] || {};
                const operadoraId = asignacion.operadoraId || estadoMaquina.operadoraId;
                const operadoraNombre = asignacion.operadoraNombre || estadoMaquina.operadoraNombre;

                // Si no tiene operadora asignada, saltar
                if (!operadoraId && !operadoraNombre) continue;

                // Verificar que está activo (tiene proceso activo o ha capturado recientemente)
                const estaActivo = estadoMaquina.procesoActivo ||
                                   (estadoMaquina.ultimaCaptura &&
                                    (new Date() - new Date(estadoMaquina.ultimaCaptura)) < 3600000); // última hora

                if (!estaActivo) continue;

                // Buscar el personal para obtener nombre completo e iniciales
                let nombre = operadoraNombre || 'Operadora';
                let iniciales = 'OP';

                const personaData = personal.find(p => p.id == operadoraId);
                if (personaData) {
                    nombre = personaData.nombre || nombre;
                    iniciales = obtenerIniciales(nombre);
                }

                // La fuente principal de piezas es estado_maquinas.piezasHoy
                // que se actualiza en tiempo real con cada captura
                let piezasCapturadas = estadoMaquina.piezasHoy || 0;

                // Si el estado_maquinas tiene info del proceso correcto, usar esas piezas
                const procesoMaquinaNombre = (estadoMaquina.procesoNombre || '').toLowerCase().trim();
                const pedidoMaquinaId = estadoMaquina.pedidoId;

                // Verificar que estado_maquinas corresponde al mismo proceso/pedido
                if (procesoMaquinaNombre === miProcesoNombreLower && pedidoMaquinaId == miPedidoId) {
                    // Usar las piezas del estado_maquinas
                    piezasCapturadas = estadoMaquina.piezasHoy || 0;
                } else {
                    // Si no coincide, buscar en historial_produccion
                    const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
                    const registrosOperadora = historial.filter(h =>
                        h.pedidoId == miPedidoId &&
                        (h.procesoNombre || '').toLowerCase().trim() === miProcesoNombreLower &&
                        h.estacionId === estacionId
                    );
                    if (registrosOperadora.length > 0) {
                        // Sumar todas las capturas de esta operadora en este proceso
                        piezasCapturadas = registrosOperadora.reduce((sum, r) => sum + (r.cantidad || 0), 0);
                    }
                }

                otrasOperadoras.push({
                    estacionId,
                    operadoraId,
                    nombre,
                    iniciales,
                    piezas: piezasCapturadas,
                    meta: asignacion.meta || operadoraState.piezasMeta || 0
                });
            }
        }

        DEBUG_MODE && console.log('[OPERADORA] Otras operadoras en proceso "' + miProcesoNombre + '":', otrasOperadoras);
    } catch (e) {
        console.error('[OPERADORA] Error obteniendo otras operadoras:', e);
    }

    return otrasOperadoras;
}

/**
 * Obtener iniciales de un nombre
 */
function obtenerIniciales(nombre) {
    if (!nombre) return 'OP';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
}

/**
 * Actualiza la UI mostrando otras operadoras y el gran total
 */
function actualizarProgresoEquipo() {
    const otrasOperadoras = obtenerOtrasOperadorasEnProceso();
    const container = document.getElementById('otrasOperadorasContainer');
    const lista = document.getElementById('otrasOperadorasLista');
    const granTotalContainer = document.getElementById('granTotalContainer');

    if (otrasOperadoras.length === 0) {
        // No hay otras operadoras, ocultar todo
        if (container) container.style.display = 'none';
        if (granTotalContainer) granTotalContainer.style.display = 'none';
        return;
    }

    // Mostrar otras operadoras
    if (container) container.style.display = 'flex';
    if (granTotalContainer) granTotalContainer.style.display = 'block';

    // Renderizar lista de otras operadoras
    if (lista) {
        const meta = operadoraState.piezasMeta || 100;
        lista.innerHTML = otrasOperadoras.map(op => {
            const porcentaje = meta > 0 ? Math.min(100, Math.round((op.piezas / meta) * 100)) : 0;
            const circumference = 2 * Math.PI * 16; // r = 16 para el mini círculo
            const offset = circumference - (porcentaje / 100) * circumference;

            return `
                <div class="otra-operadora-item">
                    <div class="otra-operadora-avatar">${op.iniciales}</div>
                    <div class="otra-operadora-info">
                        <span class="otra-operadora-nombre">${op.nombre}</span>
                        <span class="otra-operadora-estacion">${op.estacionId}</span>
                    </div>
                    <div class="otra-operadora-mini-progress">
                        <svg viewBox="0 0 40 40">
                            <circle class="mini-bg" cx="20" cy="20" r="16"></circle>
                            <circle class="mini-bar" cx="20" cy="20" r="16"
                                    style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"></circle>
                        </svg>
                        <span class="mini-text">${op.piezas}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Calcular y mostrar gran total
    const misPiezas = operadoraState.piezasCapturadas || 0;
    const totalOtras = otrasOperadoras.reduce((sum, op) => sum + op.piezas, 0);
    const granTotal = misPiezas + totalOtras;
    const meta = operadoraState.piezasMeta || 100;
    const porcentajeTotal = meta > 0 ? Math.min(100, Math.round((granTotal / meta) * 100)) : 0;

    const granTotalActual = document.getElementById('granTotalActual');
    const granTotalMeta = document.getElementById('granTotalMeta');
    const granTotalFill = document.getElementById('granTotalFill');

    if (granTotalActual) granTotalActual.textContent = granTotal;
    if (granTotalMeta) granTotalMeta.textContent = meta;
    if (granTotalFill) {
        granTotalFill.style.width = `${porcentajeTotal}%`;
        if (granTotal >= meta) {
            granTotalFill.classList.add('completo');
            granTotalContainer.classList.add('completo');
        } else {
            granTotalFill.classList.remove('completo');
            granTotalContainer.classList.remove('completo');
        }
    }

    DEBUG_MODE && console.log('[OPERADORA] Progreso equipo actualizado:', {
        misPiezas,
        otrasOperadoras: otrasOperadoras.length,
        totalOtras,
        granTotal,
        meta,
        porcentajeTotal
    });
}

function verificarRecordatorioHora() {
    const ultimaCaptura = operadoraState.ultimaCaptura;
    const recordatorio = document.getElementById('recordatorioHora');
    const horaSpan = document.getElementById('ultimaCapturaHora');

    if (!ultimaCaptura) {
        horaSpan.textContent = 'Sin capturas';
        recordatorio.classList.add('urgente');
        return;
    }

    horaSpan.textContent = ultimaCaptura.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const minutosDesdeCaptura = Math.floor((new Date() - ultimaCaptura) / 60000);

    recordatorio.classList.remove('urgente', 'advertencia');

    if (minutosDesdeCaptura >= 60) {
        recordatorio.classList.add('urgente');
    } else if (minutosDesdeCaptura >= 50) {
        recordatorio.classList.add('advertencia');
    }
}

function actualizarEstadisticasEnVivo() {
    // Recargar pedido por si cambió
    cargarPedidoAsignado();
    actualizarEficiencia();
}

// ========================================
// REPORTAR PROBLEMAS
// ========================================

function reportarProblema(tipoId) {
    const tipo = TIPOS_PROBLEMA.find(t => t.id === tipoId);
    if (!tipo) return;

    const content = `
        <div class="problema-form">
            <div class="problema-tipo-seleccionado">
                <i class="fas ${tipo.icono}" style="color: ${tipo.color}"></i>
                <span>${tipo.nombre}</span>
            </div>

            <div class="form-group">
                <label>Describe el problema (opcional)</label>
                <textarea id="problemaDescripcion" rows="3" placeholder="Detalles adicionales..."></textarea>
            </div>
        </div>
    `;

    mostrarModal('Reportar Problema', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'cerrarModal()' },
        { text: 'Enviar a Coco', class: 'btn-danger', onclick: `enviarProblema('${tipoId}')` }
    ]);
}

function enviarProblema(tipoId) {
    const tipo = TIPOS_PROBLEMA.find(t => t.id === tipoId);
    const descripcion = document.getElementById('problemaDescripcion')?.value || '';

    const problema = {
        id: Date.now(),
        tipo: tipoId,
        tipoNombre: tipo.nombre,
        tipoIcono: tipo.icono,
        tipoColor: tipo.color,
        descripcion: descripcion,
        operadoraId: authState.operadoraActual.id,
        operadoraNombre: authState.operadoraActual.nombre,
        estacionId: CONFIG_ESTACION.id,
        estacionNombre: CONFIG_ESTACION.nombre,
        pedidoId: operadoraState.pedidoActual?.id,
        fecha: new Date().toISOString(),
        estado: 'pendiente'
    };

    // Notificar a supervisora
    notificarSupervisora(problema);

    // Guardar problema activo
    operadoraState.problemaActivo = problema;
    mostrarProblemaActivo(problema);

    cerrarModal();
    mostrarToast('Coco ha sido notificada', 'success');
}

function notificarSupervisora(problema) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    notificaciones.unshift({
        id: Date.now(),
        tipo: 'problema_operadora',
        titulo: `Problema en ${problema.estacionId}`,
        mensaje: `${problema.operadoraNombre}: ${problema.tipoNombre}`,
        fecha: new Date().toISOString(),
        leida: false,
        urgente: true,
        datos: problema
    });
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificaciones));

    // También agregar a tiempos muertos si es problema de máquina
    if (problema.tipo === 'maquina') {
        const tiemposMuertos = JSON.parse(localStorage.getItem('tiempos_muertos') || '{"activos":{},"historial":[]}');
        tiemposMuertos.activos[problema.estacionId] = {
            id: problema.id,
            estacionId: problema.estacionId,
            inicio: problema.fecha,
            motivoId: 'maquina_descompuesta',
            motivoNombre: 'Máquina descompuesta',
            motivoColor: '#ef4444',
            motivoIcono: 'fa-tools',
            descripcion: problema.descripcion,
            operadores: [{ id: problema.operadoraId, nombre: problema.operadoraNombre }]
        };
        localStorage.setItem('tiempos_muertos', JSON.stringify(tiemposMuertos));
    }
}

function mostrarProblemaActivo(problema) {
    const container = document.getElementById('problemaActivo');
    container.style.display = 'block';
    document.getElementById('problemaActivoTipo').textContent = problema.tipoNombre;
    document.getElementById('problemaActivoTiempo').textContent = 'Hace un momento';
}

// ========================================
// ACCIONES ADICIONALES
// ========================================

function llamarCoco() {
    const content = `
        <div class="llamar-coco-form">
            <p class="llamar-coco-mensaje">
                <i class="fas fa-headset"></i>
                Se notificará a Coco que necesitas ayuda
            </p>

            <div class="form-group">
                <label>¿Por qué necesitas ayuda?</label>
                <textarea id="motivoLlamada" rows="2" placeholder="Describe brevemente..."></textarea>
            </div>
        </div>
    `;

    mostrarModal('Llamar a Coco', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'cerrarModal()' },
        { text: 'Enviar', class: 'btn-primary', onclick: 'confirmarLlamadaCoco()' }
    ]);
}

function confirmarLlamadaCoco() {
    const motivo = document.getElementById('motivoLlamada')?.value || 'Necesita ayuda';

    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    notificaciones.unshift({
        id: Date.now(),
        tipo: 'llamada_operadora',
        titulo: `Llamada de ${CONFIG_ESTACION.id}`,
        mensaje: `${authState.operadoraActual.nombre}: ${motivo}`,
        fecha: new Date().toISOString(),
        leida: false,
        urgente: true
    });
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificaciones));

    cerrarModal();
    mostrarToast('Coco ha sido notificada', 'success');
}

function solicitarDescanso() {
    const content = `
        <div class="descanso-form">
            <p>Selecciona la duración del descanso:</p>
            <div class="descanso-opciones">
                <button class="btn-descanso" onclick="confirmarDescanso(5)">
                    <i class="fas fa-coffee"></i>
                    <span>5 min</span>
                </button>
                <button class="btn-descanso" onclick="confirmarDescanso(10)">
                    <i class="fas fa-coffee"></i>
                    <span>10 min</span>
                </button>
                <button class="btn-descanso" onclick="confirmarDescanso(15)">
                    <i class="fas fa-utensils"></i>
                    <span>15 min</span>
                </button>
            </div>
        </div>
    `;

    mostrarModal('Solicitar Descanso', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'cerrarModal()' }
    ]);
}

function confirmarDescanso(minutos) {
    operadoraState.enDescanso = true;

    // Registrar en historial
    const descanso = {
        id: Date.now(),
        tipo: 'descanso',
        operadoraId: authState.operadoraActual.id,
        estacionId: CONFIG_ESTACION.id,
        duracion: minutos,
        inicio: new Date().toISOString()
    };

    const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    historial.unshift(descanso);
    localStorage.setItem('historial_produccion', JSON.stringify(historial));

    cerrarModal();
    mostrarToast(`Descanso de ${minutos} minutos iniciado`, 'info');

    // Auto-terminar descanso
    setTimeout(() => {
        operadoraState.enDescanso = false;
        mostrarToast('Tu descanso ha terminado', 'warning');
    }, minutos * 60000);
}

function mostrarInstrucciones() {
    if (!operadoraState.pedidoActual) {
        mostrarToast('No hay pedido asignado', 'warning');
        return;
    }

    const pedido = operadoraState.pedidoActual;
    const asignacion = operadoraState.procesoActual;

    const content = `
        <div class="instrucciones-content">
            <div class="instruccion-header">
                <h4>${pedido.producto || pedido.nombre || 'Producto'}</h4>
                <span class="pedido-badge">#${pedido.id}</span>
            </div>

            <div class="instruccion-seccion">
                <h5><i class="fas fa-info-circle"></i> Información General</h5>
                <ul>
                    <li><strong>Cliente:</strong> ${pedido.cliente || '---'}</li>
                    <li><strong>Cantidad:</strong> ${pedido.cantidad || operadoraState.piezasMeta} piezas</li>
                    <li><strong>Entrega:</strong> ${pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString() : '---'}</li>
                </ul>
            </div>

            ${asignacion?.instrucciones ? `
                <div class="instruccion-seccion">
                    <h5><i class="fas fa-clipboard-list"></i> Instrucciones Específicas</h5>
                    <p>${asignacion.instrucciones}</p>
                </div>
            ` : ''}

            ${pedido.observaciones ? `
                <div class="instruccion-seccion">
                    <h5><i class="fas fa-sticky-note"></i> Observaciones</h5>
                    <p>${pedido.observaciones}</p>
                </div>
            ` : ''}
        </div>
    `;

    mostrarModal('Instrucciones', content, [
        { text: 'Cerrar', class: 'btn-primary', onclick: 'cerrarModal()' }
    ]);
}

function ampliarImagen() {
    if (!operadoraState.pedidoActual?.imagen) return;

    const viewer = document.getElementById('imagenViewer');
    const img = document.getElementById('imagenViewerImg');
    img.src = operadoraState.pedidoActual.imagen;
    viewer.style.display = 'flex';
}

function cerrarImagenViewer() {
    document.getElementById('imagenViewer').style.display = 'none';
}

function celebrarMeta() {
    const celebracion = document.getElementById('celebracion');
    celebracion.style.display = 'flex';

    // Confetti effect (simple version)
    setTimeout(() => {
        celebracion.style.display = 'none';
    }, 3000);
}

// ========================================
// UTILIDADES UI
// ========================================

function mostrarModal(titulo, contenido, botones) {
    document.getElementById('modalTitle').textContent = titulo;
    document.getElementById('modalBody').innerHTML = contenido;

    const footer = document.getElementById('modalFooter');
    footer.innerHTML = botones.map(btn =>
        `<button class="btn ${btn.class}" onclick="${btn.onclick}">${S(btn.text)}</button>`
    ).join('');

    document.getElementById('modalOverlay').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;

    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${iconos[tipo] || iconos.info}"></i>
        <span>${mensaje}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function guardarDatosTurno() {
    // Guardar resumen del turno
    const resumen = {
        fecha: new Date().toISOString(),
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        estacionId: CONFIG_ESTACION.id,
        piezasTotal: operadoraState.piezasCapturadas,
        capturas: operadoraState.capturasDia.length,
        inicioTurno: authState.inicioTurno?.toISOString(),
        finTurno: new Date().toISOString(),
        eficiencia: calcularEficiencia()
    };

    const turnos = JSON.parse(localStorage.getItem('historial_turnos') || '[]');
    turnos.unshift(resumen);
    localStorage.setItem('historial_turnos', JSON.stringify(turnos.slice(0, 100)));
}

function calcularEficiencia() {
    if (!authState.inicioTurno || operadoraState.piezasMeta === 0) return 0;
    const tiempoTrabajado = (new Date() - authState.inicioTurno) / 60000; // minutos
    const piezasEsperadas = tiempoTrabajado * operadoraState.metaPorMinuto;
    return Math.round((operadoraState.piezasCapturadas / piezasEsperadas) * 100);
}

// ========================================
// SISTEMA DE TEMPORIZADOR DE PROCESO
// ========================================

function iniciarProceso() {
    if (!operadoraState.pedidoActual) {
        mostrarToast('No tienes un pedido asignado', 'warning');
        return;
    }

    operadoraState.procesoIniciado = true;
    operadoraState.procesoEnPausa = false;
    operadoraState.tiempoProcesoInicio = new Date();
    operadoraState.tiempoProcesoAcumulado = 0;

    // Iniciar intervalo de actualización
    operadoraState.intervaloProceso = setInterval(actualizarTiempoProceso, 1000);

    // Actualizar UI
    actualizarBotonesTemporizador('trabajando');
    actualizarEstadoProceso('trabajando');

    // Reproducir sonido
    if (typeof reproducirSonido === 'function') reproducirSonido('iniciar');

    // Guardar estado
    guardarEstadoTemporizador();

    // Notificar inicio
    registrarEventoProceso('inicio', 'Proceso iniciado');

    // *** INTEGRACIÓN FEEDBACK: Iniciar monitoreo de desempeño ***
    iniciarMonitoreoDesempeno();

    // *** Notificar inicio a supervisora ***
    const estadoMaquinasInicio = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    estadoMaquinasInicio[CONFIG_ESTACION.id] = {
        estado: 'trabajando',
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        pedidoId: operadoraState.pedidoActual?.id,
        procesoId: operadoraState.procesoActual?.procesoId,
        procesoNombre: operadoraState.procesoActual?.procesoNombre,
        horaInicio: new Date().toISOString(),
        procesoActivo: true
    };
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinasInicio));

    mostrarToast('Proceso iniciado', 'success');
}

function mostrarMotivoPausa() {
    const content = `
        <div class="motivos-pausa-grid">
            ${MOTIVOS_PAUSA.map(motivo => `
                <button class="btn-motivo-pausa" onclick="pausarProceso('${motivo.id}')"
                        style="--motivo-color: ${motivo.color}">
                    <i class="fas ${motivo.icono}"></i>
                    <span>${S(motivo.nombre)}</span>
                    <small>${motivo.detieneTiempo ? 'Detiene tiempo' : 'Sigue contando'}</small>
                </button>
            `).join('')}
        </div>
    `;

    mostrarModal('¿Por qué pausas?', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'cerrarModal()' }
    ]);
}

function pausarProceso(motivoId) {
    const motivo = MOTIVOS_PAUSA.find(m => m.id === motivoId);
    if (!motivo) return;

    cerrarModal();

    // Calcular tiempo trabajado hasta ahora
    if (motivo.detieneTiempo) {
        const ahora = new Date();
        const tiempoSesion = ahora - operadoraState.tiempoProcesoInicio;
        operadoraState.tiempoProcesoAcumulado += tiempoSesion;
    }

    operadoraState.procesoEnPausa = true;
    operadoraState.tiempoPausaInicio = new Date();
    operadoraState.motivoPausaActual = motivo;

    // Detener intervalo si el motivo detiene tiempo
    if (motivo.detieneTiempo && operadoraState.intervaloProceso) {
        clearInterval(operadoraState.intervaloProceso);
        operadoraState.intervaloProceso = null;
    }

    // Actualizar UI
    actualizarBotonesTemporizador('pausado');
    actualizarEstadoProceso('pausado', motivo);
    mostrarIndicadorPausa(motivo);

    // Iniciar contador de tiempo en pausa
    iniciarContadorPausa();

    // Reproducir sonido
    if (typeof reproducirSonido === 'function') reproducirSonido('pausar');

    // Notificar a Coco si aplica
    if (motivo.notificaCoco) {
        notificarPausaACoco(motivo);
    }

    // Registrar en historial
    operadoraState.historialPausas.push({
        id: Date.now(),
        motivoId: motivo.id,
        motivoNombre: motivo.nombre,
        inicio: new Date().toISOString(),
        fin: null,
        duracion: null
    });

    // Guardar estado
    guardarEstadoTemporizador();

    mostrarToast(`Pausa: ${motivo.nombre}`, 'info');
}

function reanudarProceso() {
    if (!operadoraState.procesoEnPausa) return;

    const motivo = operadoraState.motivoPausaActual;

    // Registrar fin de pausa
    const pausaActual = operadoraState.historialPausas[operadoraState.historialPausas.length - 1];
    if (pausaActual && !pausaActual.fin) {
        pausaActual.fin = new Date().toISOString();
        pausaActual.duracion = new Date() - new Date(pausaActual.inicio);
    }

    operadoraState.procesoEnPausa = false;
    operadoraState.tiempoProcesoInicio = new Date();
    operadoraState.motivoPausaActual = null;

    // Reiniciar intervalo
    if (!operadoraState.intervaloProceso) {
        operadoraState.intervaloProceso = setInterval(actualizarTiempoProceso, 1000);
    }

    // Detener contador de pausa
    detenerContadorPausa();

    // Actualizar UI
    actualizarBotonesTemporizador('trabajando');
    actualizarEstadoProceso('trabajando');
    ocultarIndicadorPausa();

    // Reproducir sonido
    if (typeof reproducirSonido === 'function') reproducirSonido('reanudar');

    // Guardar estado
    guardarEstadoTemporizador();

    // Registrar evento
    registrarEventoProceso('reanudacion', `Reanudado después de: ${motivo?.nombre || 'pausa'}`);

    mostrarToast('Proceso reanudado', 'success');
}

/**
 * Finaliza el proceso automáticamente cuando se alcanza la meta de piezas
 * Similar a finalizarProceso pero sin confirmación del usuario
 */
function finalizarProcesoAutomatico() {
    DEBUG_MODE && console.log('[OPERADORA] === FINALIZANDO PROCESO AUTOMÁTICAMENTE ===');
    DEBUG_MODE && console.log('[OPERADORA] Piezas capturadas:', operadoraState.piezasCapturadas, 'Meta:', operadoraState.piezasMeta);
    DEBUG_MODE && console.log('[OPERADORA] Área de estación:', CONFIG_ESTACION.area);

    if (!operadoraState.procesoIniciado) {
        DEBUG_MODE && console.warn('[OPERADORA] Proceso no iniciado, no se puede auto-finalizar');
        return;
    }

    // Si es área de corte, pedir metros lineales antes de finalizar
    const esAreaCorte = esEstacionDeCorte();
    if (esAreaCorte) {
        mostrarToast('¡Meta alcanzada! Por favor registra los metros utilizados.', 'success');
        mostrarModalMetrosCorte(true); // true = es finalización automática
        return;
    }

    // Mostrar notificación de auto-finalización
    mostrarToast('¡Meta alcanzada! Finalizando proceso automáticamente...', 'success');

    // Primero pausar el proceso si está en curso
    if (!operadoraState.procesoEnPausa) {
        // Pausar silenciosamente
        operadoraState.procesoEnPausa = true;
        operadoraState.tiempoPausaInicio = new Date();
        operadoraState.motivoPausaActual = { id: 'meta_alcanzada', nombre: 'Meta alcanzada' };

        // Acumular tiempo trabajado hasta la pausa
        if (operadoraState.tiempoProcesoInicio) {
            operadoraState.tiempoProcesoAcumulado += (new Date() - operadoraState.tiempoProcesoInicio);
        }
    }

    // Calcular tiempo total
    let tiempoTotal = operadoraState.tiempoProcesoAcumulado;

    // Detener intervalos
    if (operadoraState.intervaloProceso) {
        clearInterval(operadoraState.intervaloProceso);
        operadoraState.intervaloProceso = null;
    }
    detenerContadorPausa();

    // Guardar resumen del proceso
    const resumenProceso = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        operadoraId: authState.operadoraActual.id,
        operadoraNombre: authState.operadoraActual.nombre,
        estacionId: CONFIG_ESTACION.id,
        pedidoId: operadoraState.pedidoActual?.id,
        procesoNombre: operadoraState.procesoActual?.procesoNombre,
        tiempoTotalMs: tiempoTotal,
        tiempoTotalFormateado: formatearTiempo(tiempoTotal),
        piezasProducidas: operadoraState.piezasCapturadas,
        pausas: operadoraState.historialPausas,
        finalizadoAutomaticamente: true,
        motivoFinalizacion: 'Meta de piezas alcanzada'
    };

    guardarResumenProceso(resumenProceso);

    // Resetear estado
    operadoraState.procesoIniciado = false;
    operadoraState.procesoEnPausa = false;
    operadoraState.tiempoProcesoInicio = null;
    operadoraState.tiempoProcesoAcumulado = 0;
    operadoraState.motivoPausaActual = null;
    operadoraState.historialPausas = [];

    // Actualizar UI
    actualizarBotonesTemporizador('sin-iniciar');
    actualizarEstadoProceso('sin-iniciar');
    ocultarIndicadorPausa();
    resetearDisplayTiempo();

    // Reproducir sonido de éxito
    if (typeof reproducirSonido === 'function') reproducirSonido('exito');

    // Limpiar estado guardado
    localStorage.removeItem(`temporizador_${CONFIG_ESTACION.id}`);

    // Detener monitoreo y resetear estado de feedback
    if (typeof detenerMonitoreoDesempeno === 'function') detenerMonitoreoDesempeno();
    if (typeof resetearFeedbackState === 'function') resetearFeedbackState();

    // Guardar referencias antes de limpiar
    const procesoId = operadoraState.procesoActual?.procesoId;
    const procesoNombre = operadoraState.procesoActual?.procesoNombre;
    const pedidoId = operadoraState.pedidoActual?.id;
    const piezasProducidas = operadoraState.piezasCapturadas;

    // === SINCRONIZACIÓN CON SUPERVISORA ===

    // 1. Actualizar avance del proceso en pedidos_erp
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const pedidoIndex = pedidosERP.findIndex(p => p.id == pedidoId);
    if (pedidoIndex >= 0) {
        const pedido = pedidosERP[pedidoIndex];
        if (pedido.procesos) {
            const procesoIndex = pedido.procesos.findIndex(p => p.id == procesoId);
            if (procesoIndex >= 0) {
                pedido.procesos[procesoIndex].piezas = piezasProducidas;
                pedido.procesos[procesoIndex].estado = 'completado';
                pedido.procesos[procesoIndex].fechaCompletado = new Date().toISOString();
                pedido.procesos[procesoIndex].finalizadoAutomaticamente = true;
            }
        }
        localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
    }

    // 2. Liberar asignación
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    let haySiguienteProceso = false;
    let estacionIdEncontrada = CONFIG_ESTACION.id;

    // Buscar asignación con búsqueda flexible
    if (!asignaciones[CONFIG_ESTACION.id]) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const [estId, asignacion] of Object.entries(asignaciones)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                estacionIdEncontrada = estId;
                break;
            }
        }
    }

    if (asignaciones[estacionIdEncontrada]) {
        // Guardar en historial de asignaciones completadas
        const asignacionCompletada = {
            ...asignaciones[estacionIdEncontrada],
            estado: 'completado',
            fechaFin: new Date().toISOString(),
            piezasProducidas: piezasProducidas,
            tiempoTotalMs: tiempoTotal,
            finalizadoAutomaticamente: true
        };

        const historialAsignaciones = JSON.parse(localStorage.getItem('historial_asignaciones_completadas') || '[]');
        historialAsignaciones.unshift(asignacionCompletada);
        localStorage.setItem('historial_asignaciones_completadas', JSON.stringify(historialAsignaciones.slice(0, 100)));

        // Si hay cola de procesos, pasar al siguiente
        const colaProcesos = asignaciones[estacionIdEncontrada].colaProcesos || [];
        if (colaProcesos.length > 0) {
            const siguienteProceso = colaProcesos.shift();
            asignaciones[estacionIdEncontrada] = {
                ...siguienteProceso,
                operadoraId: authState.operadoraActual?.id,
                operadoraNombre: authState.operadoraActual?.nombre,
                colaProcesos: colaProcesos,
                estado: 'asignado',
                fechaAsignacion: new Date().toISOString()
            };
            haySiguienteProceso = true;
        } else {
            // No hay más procesos, limpiar asignación
            delete asignaciones[estacionIdEncontrada];
        }
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    // 2.5 VERIFICAR SI ES CORTE DE INVENTARIO - Agregar piezas al inventario (auto-finalización)
    const asignacionOriginalAuto = asignacionCompletada || {};

    if (asignacionOriginalAuto?.esCorteInventario && asignacionOriginalAuto?.piezaInventarioId && piezasProducidas > 0) {
        DEBUG_MODE && console.log('[OPERADORA] *** CORTE DE INVENTARIO DETECTADO (Auto) ***');
        DEBUG_MODE && console.log('[OPERADORA] Agregando', piezasProducidas, 'piezas al inventario');

        try {
            const dbData = JSON.parse(localStorage.getItem('erp_multifundas_db') || '{}');
            if (dbData.inventarioPiezas) {
                const piezaIndex = dbData.inventarioPiezas.findIndex(p => p.id == asignacionOriginalAuto.piezaInventarioId);
                if (piezaIndex >= 0) {
                    const piezaAntes = dbData.inventarioPiezas[piezaIndex].cantidadDisponible || 0;

                    dbData.inventarioPiezas[piezaIndex].cantidadDisponible = piezaAntes + piezasProducidas;
                    dbData.inventarioPiezas[piezaIndex].ultimaActualizacion = new Date().toISOString();

                    if (!dbData.inventarioPiezas[piezaIndex].historialMovimientos) {
                        dbData.inventarioPiezas[piezaIndex].historialMovimientos = [];
                    }
                    dbData.inventarioPiezas[piezaIndex].historialMovimientos.unshift({
                        fecha: new Date().toISOString(),
                        tipo: 'entrada',
                        cantidad: piezasProducidas,
                        motivo: `Corte realizado por ${authState.operadoraActual?.nombre || 'Operadora'} (${CONFIG_ESTACION.nombre}) [Auto]`,
                        operadoraId: authState.operadoraActual?.id,
                        estacionId: CONFIG_ESTACION.id,
                        saldoAnterior: piezaAntes,
                        saldoNuevo: piezaAntes + piezasProducidas
                    });

                    localStorage.setItem('erp_multifundas_db', JSON.stringify(dbData));
                    DEBUG_MODE && console.log('[OPERADORA] Inventario actualizado (auto):', piezaAntes, '->', piezaAntes + piezasProducidas);
                }
            }
        } catch (e) {
            console.error('[OPERADORA] Error al actualizar inventario (auto):', e);
        }

        // Actualizar historial de cortes
        const historialCortes = JSON.parse(localStorage.getItem('historial_cortes_inventario') || '[]');
        const corteIndex = historialCortes.findIndex(c => c.pedidoVirtualId == pedidoId);
        if (corteIndex >= 0) {
            historialCortes[corteIndex].estado = 'completado';
            historialCortes[corteIndex].piezasProducidas = piezasProducidas;
            historialCortes[corteIndex].fechaCompletado = new Date().toISOString();
            localStorage.setItem('historial_cortes_inventario', JSON.stringify(historialCortes));
        }

        // Limpiar pedido virtual
        let pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
        pedidosActivos = pedidosActivos.filter(p => p.id !== pedidoId);
        localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
    }

    // 3. Notificar a supervisora
    const esCorteInvAuto = asignacionOriginalAuto?.esCorteInventario;
    const notificacionesCoco = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    notificacionesCoco.unshift({
        id: Date.now(),
        tipo: esCorteInvAuto ? 'corte_inventario_completado' : 'proceso_completado_automatico',
        titulo: esCorteInvAuto ? 'Corte de Inventario Completado' : '¡Meta Alcanzada!',
        mensaje: `${authState.operadoraActual?.nombre || 'Operadora'} completó "${procesoNombre || 'proceso'}" - ${piezasProducidas} piezas${esCorteInvAuto ? ' (agregadas al inventario)' : ' (AUTO)'}`,
        operadoraId: authState.operadoraActual?.id,
        estacionId: CONFIG_ESTACION.id,
        pedidoId: pedidoId,
        procesoId: procesoId,
        piezas: piezasProducidas,
        fecha: new Date().toISOString(),
        leida: false,
        esAutomatico: true
    });
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificacionesCoco.slice(0, 100)));

    // 4. Actualizar estado de la máquina a disponible
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    const idsALimpiar = [CONFIG_ESTACION.id];
    if (estacionIdEncontrada !== CONFIG_ESTACION.id) {
        idsALimpiar.push(estacionIdEncontrada);
    }

    idsALimpiar.forEach(estId => {
        estadoMaquinas[estId] = {
            estado: 'disponible',
            procesoActivo: false,
            procesoNombre: null,
            procesoId: null,
            pedidoId: null,
            modoSimultaneo: false,
            procesosSimultaneos: [],
            ultimoProceso: procesoNombre,
            ultimasPiezas: piezasProducidas,
            piezasHoy: 0,
            operadoraId: authState.operadoraActual?.id,
            ultimaActualizacion: new Date().toISOString()
        };
    });
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // 5. Limpiar configuración de simultáneos
    localStorage.removeItem(`config_simultaneos_${CONFIG_ESTACION.id}`);

    // 6. Limpiar estado local del operador
    operadoraState.pedidoActual = null;
    operadoraState.procesoActual = null;
    operadoraState.piezasCapturadas = 0;
    operadoraState.piezasMeta = 0;
    operadoraState.modoSimultaneo = false;
    operadoraState.procesosSimultaneos = [];
    operadoraState.capturasDia = [];

    DEBUG_MODE && console.log('[OPERADORA] Proceso finalizado automáticamente');

    // 7. Mostrar pantalla correspondiente
    if (haySiguienteProceso) {
        mostrarToast('Siguiente proceso cargado automáticamente', 'info');
        cargarPedidoAsignado();
    } else {
        mostrarToast('¡Proceso completado! Esperando nuevo proceso...', 'success');
        mostrarSinPedido();
    }
}

function finalizarProceso() {
    DEBUG_MODE && console.log('[OPERADORA] === FINALIZANDO PROCESO ===');
    DEBUG_MODE && console.log('[OPERADORA] procesoIniciado:', operadoraState.procesoIniciado);
    DEBUG_MODE && console.log('[OPERADORA] pedidoActual:', operadoraState.pedidoActual?.id);
    DEBUG_MODE && console.log('[OPERADORA] procesoActual:', operadoraState.procesoActual?.procesoNombre, operadoraState.procesoActual?.procesoId);
    DEBUG_MODE && console.log('[OPERADORA] piezasCapturadas:', operadoraState.piezasCapturadas);
    DEBUG_MODE && console.log('[OPERADORA] Área de estación:', CONFIG_ESTACION.area);

    if (!operadoraState.procesoIniciado) {
        DEBUG_MODE && console.warn('[OPERADORA] Proceso no iniciado, saliendo');
        return;
    }

    // Si es área de corte, pedir metros lineales antes de finalizar
    const esAreaCorte = esEstacionDeCorte();
    DEBUG_MODE && console.log('[OPERADORA] ¿Es área de corte?:', esAreaCorte);
    if (esAreaCorte) {
        mostrarModalMetrosCorte(false); // false = no es automático
        return;
    }

    if (!confirm('¿Segura que quieres finalizar el proceso actual?')) {
        return;
    }

    // Calcular tiempo total
    let tiempoTotal = operadoraState.tiempoProcesoAcumulado;
    if (!operadoraState.procesoEnPausa) {
        tiempoTotal += (new Date() - operadoraState.tiempoProcesoInicio);
    }

    // Detener intervalos
    if (operadoraState.intervaloProceso) {
        clearInterval(operadoraState.intervaloProceso);
        operadoraState.intervaloProceso = null;
    }
    detenerContadorPausa();

    // Guardar resumen del proceso
    const resumenProceso = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        operadoraId: authState.operadoraActual.id,
        operadoraNombre: authState.operadoraActual.nombre,
        estacionId: CONFIG_ESTACION.id,
        pedidoId: operadoraState.pedidoActual?.id,
        procesoNombre: operadoraState.procesoActual?.procesoNombre,
        tiempoTotalMs: tiempoTotal,
        tiempoTotalFormateado: formatearTiempo(tiempoTotal),
        piezasProducidas: operadoraState.piezasCapturadas,
        pausas: operadoraState.historialPausas
    };

    guardarResumenProceso(resumenProceso);

    // Resetear estado
    operadoraState.procesoIniciado = false;
    operadoraState.procesoEnPausa = false;
    operadoraState.tiempoProcesoInicio = null;
    operadoraState.tiempoProcesoAcumulado = 0;
    operadoraState.motivoPausaActual = null;
    operadoraState.historialPausas = [];

    // Actualizar UI
    actualizarBotonesTemporizador('sin-iniciar');
    actualizarEstadoProceso('sin-iniciar');
    ocultarIndicadorPausa();
    resetearDisplayTiempo();

    // Reproducir sonido
    if (typeof reproducirSonido === 'function') reproducirSonido('finalizar');

    // Limpiar estado guardado
    localStorage.removeItem(`temporizador_${CONFIG_ESTACION.id}`);

    // *** INTEGRACIÓN FEEDBACK: Detener monitoreo y resetear estado ***
    detenerMonitoreoDesempeno();
    resetearFeedbackState();

    // *** INTEGRACIÓN INCENTIVOS: Guardar premio del proceso ***
    const resumenPremio = obtenerResumenPremio();

    // ========================================
    // *** SINCRONIZACIÓN CON SUPERVISORA ***
    // ========================================

    // Guardar referencias antes de limpiar
    const procesoId = operadoraState.procesoActual?.procesoId;
    const procesoNombre = operadoraState.procesoActual?.procesoNombre;
    const pedidoId = operadoraState.pedidoActual?.id;
    const piezasProducidas = operadoraState.piezasCapturadas;

    // 1. Actualizar avance del proceso en el pedido (para supervisora)
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    // Usar == para comparación flexible (string/number)
    const pedidoIndex = pedidosERP.findIndex(p => p.id == pedidoId);
    if (pedidoIndex >= 0) {
        const pedido = pedidosERP[pedidoIndex];
        if (pedido.procesos) {
            // Usar == para comparación flexible (string/number)
            const procesoIndex = pedido.procesos.findIndex(p => p.id == procesoId);
            if (procesoIndex >= 0) {
                pedido.procesos[procesoIndex].piezas = piezasProducidas;
                pedido.procesos[procesoIndex].estado = 'completado';
                pedido.procesos[procesoIndex].fechaCompletado = new Date().toISOString();
                pedido.procesos[procesoIndex].operadoraId = authState.operadoraActual?.id;
                pedido.procesos[procesoIndex].operadoraNombre = authState.operadoraActual?.nombre;
                pedido.procesos[procesoIndex].estacionId = CONFIG_ESTACION.id;
                DEBUG_MODE && console.log('[OPERADORA] Proceso marcado como completado en pedidos_erp:', procesoId, 'piezas:', piezasProducidas);
            } else {
                DEBUG_MODE && console.warn('[OPERADORA] Proceso no encontrado en pedido:', procesoId, 'procesos disponibles:', pedido.procesos.map(p => p.id));
            }
        }
        localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
    } else {
        DEBUG_MODE && console.warn('[OPERADORA] Pedido no encontrado en pedidos_erp:', pedidoId);
    }

    // 2. Guardar historial de asignación completada (para que supervisora lo lea)
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    let haySiguienteProceso = false;

    DEBUG_MODE && console.log('[OPERADORA] === ELIMINANDO ASIGNACIÓN ===');
    DEBUG_MODE && console.log('[OPERADORA] CONFIG_ESTACION.id:', CONFIG_ESTACION.id);
    DEBUG_MODE && console.log('[OPERADORA] Asignaciones antes de limpiar:', JSON.stringify(asignaciones, null, 2));

    // Buscar la asignación con búsqueda flexible (igual que en cargarPedidoAsignado)
    let estacionIdEncontrada = CONFIG_ESTACION.id;
    if (!asignaciones[CONFIG_ESTACION.id]) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const [estId, asignacion] of Object.entries(asignaciones)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                estacionIdEncontrada = estId;
                DEBUG_MODE && console.log('[OPERADORA] Asignación encontrada con ID alternativo:', estId);
                break;
            }
        }
    }

    if (asignaciones[estacionIdEncontrada]) {
        // Crear registro de asignación completada
        const asignacionCompletada = {
            ...asignaciones[estacionIdEncontrada],
            estado: 'completado',
            fechaFin: new Date().toISOString(),
            piezasProducidas: piezasProducidas,
            tiempoTotalMs: tiempoTotal,
            marcadoComoCompletado: false
        };

        // Guardar en historial de asignaciones completadas (para supervisora)
        const historialAsignaciones = JSON.parse(localStorage.getItem('historial_asignaciones_completadas') || '[]');
        historialAsignaciones.unshift(asignacionCompletada);
        localStorage.setItem('historial_asignaciones_completadas', JSON.stringify(historialAsignaciones.slice(0, 100)));

        // Si hay cola de procesos, pasar al siguiente
        const colaProcesos = asignaciones[estacionIdEncontrada].colaProcesos || [];
        if (colaProcesos.length > 0) {
            // Tomar el siguiente proceso de la cola
            const siguienteProceso = colaProcesos.shift();
            asignaciones[estacionIdEncontrada] = {
                ...siguienteProceso,
                operadoraId: authState.operadoraActual?.id,
                operadoraNombre: authState.operadoraActual?.nombre,
                colaProcesos: colaProcesos,
                estado: 'asignado',
                fechaAsignacion: new Date().toISOString()
            };
            haySiguienteProceso = true;
            DEBUG_MODE && console.log('[OPERADORA] Siguiente proceso en cola:', siguienteProceso.procesoNombre);
        } else {
            // No hay más procesos, limpiar asignación
            delete asignaciones[estacionIdEncontrada];
            DEBUG_MODE && console.log('[OPERADORA] Asignación eliminada para estación:', estacionIdEncontrada);
        }
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
        DEBUG_MODE && console.log('[OPERADORA] Asignaciones después de limpiar:', JSON.stringify(asignaciones, null, 2));
    } else {
        DEBUG_MODE && console.warn('[OPERADORA] No se encontró asignación para eliminar. ID buscado:', estacionIdEncontrada);
    }

    // 2.5 VERIFICAR SI ES CORTE DE INVENTARIO - Agregar piezas al inventario
    const asignacionOriginal = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}')[estacionIdEncontrada] ||
                               asignacionCompletada || {};

    if (asignacionOriginal?.esCorteInventario && asignacionOriginal?.piezaInventarioId && piezasProducidas > 0) {
        DEBUG_MODE && console.log('[OPERADORA] *** CORTE DE INVENTARIO DETECTADO ***');
        DEBUG_MODE && console.log('[OPERADORA] Agregando', piezasProducidas, 'piezas al inventario');

        // Agregar las piezas producidas al inventario
        try {
            const dbData = JSON.parse(localStorage.getItem('erp_multifundas_db') || '{}');
            if (dbData.inventarioPiezas) {
                const piezaIndex = dbData.inventarioPiezas.findIndex(p => p.id == asignacionOriginal.piezaInventarioId);
                if (piezaIndex >= 0) {
                    const piezaAntes = dbData.inventarioPiezas[piezaIndex].cantidadDisponible || 0;

                    // Agregar las piezas producidas
                    dbData.inventarioPiezas[piezaIndex].cantidadDisponible = piezaAntes + piezasProducidas;
                    dbData.inventarioPiezas[piezaIndex].ultimaActualizacion = new Date().toISOString();

                    // Registrar movimiento
                    if (!dbData.inventarioPiezas[piezaIndex].historialMovimientos) {
                        dbData.inventarioPiezas[piezaIndex].historialMovimientos = [];
                    }
                    dbData.inventarioPiezas[piezaIndex].historialMovimientos.unshift({
                        fecha: new Date().toISOString(),
                        tipo: 'entrada',
                        cantidad: piezasProducidas,
                        motivo: `Corte realizado por ${authState.operadoraActual?.nombre || 'Operadora'} (${CONFIG_ESTACION.nombre})`,
                        operadoraId: authState.operadoraActual?.id,
                        estacionId: CONFIG_ESTACION.id,
                        saldoAnterior: piezaAntes,
                        saldoNuevo: piezaAntes + piezasProducidas
                    });

                    localStorage.setItem('erp_multifundas_db', JSON.stringify(dbData));
                    DEBUG_MODE && console.log('[OPERADORA] Inventario actualizado:', piezaAntes, '->', piezaAntes + piezasProducidas);
                    mostrarToast(`+${piezasProducidas} piezas agregadas al inventario`, 'success');
                } else {
                    DEBUG_MODE && console.warn('[OPERADORA] Pieza de inventario no encontrada:', asignacionOriginal.piezaInventarioId);
                }
            }
        } catch (e) {
            console.error('[OPERADORA] Error al actualizar inventario:', e);
        }

        // Actualizar historial de cortes de inventario
        const historialCortes = JSON.parse(localStorage.getItem('historial_cortes_inventario') || '[]');
        const corteIndex = historialCortes.findIndex(c => c.pedidoVirtualId == pedidoId);
        if (corteIndex >= 0) {
            historialCortes[corteIndex].estado = 'completado';
            historialCortes[corteIndex].piezasProducidas = piezasProducidas;
            historialCortes[corteIndex].fechaCompletado = new Date().toISOString();
            localStorage.setItem('historial_cortes_inventario', JSON.stringify(historialCortes));
        }

        // Limpiar el pedido virtual de pedidos_activos
        let pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
        pedidosActivos = pedidosActivos.filter(p => p.id !== pedidoId);
        localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
    }

    // 3. Notificar a supervisora que proceso terminó
    const notificacionesCoco = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    const esCorteInv = asignacionOriginal?.esCorteInventario;
    notificacionesCoco.unshift({
        id: Date.now(),
        tipo: esCorteInv ? 'corte_inventario_completado' : 'proceso_completado',
        titulo: esCorteInv ? 'Corte de Inventario Completado' : 'Proceso Completado',
        mensaje: `${authState.operadoraActual?.nombre || 'Operadora'} completó "${procesoNombre || 'proceso'}" - ${piezasProducidas} piezas${esCorteInv ? ' (agregadas al inventario)' : ''}`,
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        estacionId: CONFIG_ESTACION.id,
        estacionNombre: CONFIG_ESTACION.nombre,
        pedidoId: pedidoId,
        procesoId: procesoId,
        procesoNombre: procesoNombre,
        piezas: piezasProducidas,
        tiempoMs: tiempoTotal,
        fecha: new Date().toISOString(),
        leida: false
    });
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificacionesCoco.slice(0, 100)));

    // 4. Actualizar estado de la máquina a disponible y SIN proceso
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    // Limpiar tanto el ID de CONFIG como el ID encontrado (por si son diferentes)
    const idsALimpiar = [CONFIG_ESTACION.id];
    if (estacionIdEncontrada !== CONFIG_ESTACION.id) {
        idsALimpiar.push(estacionIdEncontrada);
    }

    idsALimpiar.forEach(estId => {
        estadoMaquinas[estId] = {
            estado: 'disponible',
            procesoActivo: false,
            procesoNombre: null,
            procesoId: null,
            pedidoId: null,
            modoSimultaneo: false,
            procesosSimultaneos: [],
            ultimoProceso: procesoNombre,
            ultimasPiezas: piezasProducidas,
            piezasHoy: 0,
            operadoraId: authState.operadoraActual?.id,
            operadoraNombre: authState.operadoraActual?.nombre,
            ultimaActualizacion: new Date().toISOString()
        };
    });
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // 5. También guardar en historial que lee supervisora
    const historialSup = JSON.parse(localStorage.getItem('supervisora_historial_procesos') || '[]');
    historialSup.unshift({
        ...resumenProceso,
        tipo: 'proceso_completado'
    });
    localStorage.setItem('supervisora_historial_procesos', JSON.stringify(historialSup.slice(0, 200)));

    // 6. Limpiar estado local del operador
    operadoraState.pedidoActual = null;
    operadoraState.procesoActual = null;
    operadoraState.piezasCapturadas = 0;
    operadoraState.piezasMeta = 0;
    operadoraState.modoSimultaneo = false;
    operadoraState.procesosSimultaneos = [];
    operadoraState.capturasDia = []; // Limpiar capturas en memoria (las del día siguen en localStorage filtradas por proceso)

    DEBUG_MODE && console.log('[OPERADORA] Proceso finalizado y sincronizado con supervisora');

    // 7. Mostrar pantalla correspondiente
    if (haySiguienteProceso) {
        // Cargar el siguiente proceso de la cola automáticamente
        const msgPremio = resumenPremio.premioGanado > 0 ? ` Premio: $${resumenPremio.premioGanado} (${resumenPremio.tier.nombre})` : '';
        mostrarToast(`Proceso finalizado. Tiempo: ${resumenProceso.tiempoTotalFormateado}.${msgPremio} Cargando siguiente proceso...`, 'success');
        setTimeout(() => {
            cargarPedidoAsignado();
        }, 500);
    } else {
        // Mostrar pantalla de "sin proceso asignado"
        mostrarSinPedido();

        // Ocultar cola de procesos
        const colaContainer = document.getElementById('colaProcesosContainer');
        if (colaContainer) {
            colaContainer.style.display = 'none';
        }

        // Ocultar también el proceso asignado
        const procesoAsignadoEl = document.getElementById('procesoAsignado');
        if (procesoAsignadoEl) {
            procesoAsignadoEl.style.display = 'none';
        }

        // Resetear contador de piezas visualmente
        const progressActual = document.getElementById('progressValue');
        if (progressActual) {
            progressActual.textContent = '0';
        }
        const progressTotalEl = document.getElementById('progressTotal');
        if (progressTotalEl) {
            progressTotalEl.textContent = '0';
        }

        // Resetear barra de progreso
        const progressBarEl = document.getElementById('progressBar');
        if (progressBarEl) {
            const circumference = 2 * Math.PI * 90;
            progressBarEl.style.strokeDasharray = circumference;
            progressBarEl.style.strokeDashoffset = circumference;
        }

        const msgPremio2 = resumenPremio.premioGanado > 0 ? ` Premio: $${resumenPremio.premioGanado} (${resumenPremio.tier.nombre})` : '';
        mostrarToast(`Proceso finalizado. Tiempo: ${resumenProceso.tiempoTotalFormateado}.${msgPremio2} Esperando nueva asignación.`, 'success');
    }
}

// ========================================
// CAPTURA DE METROS LINEALES (ÁREA CORTE)
// ========================================

// Función helper para detectar si la estación es de corte
function esEstacionDeCorte() {
    // Verificar por área configurada
    const area = CONFIG_ESTACION.area || '';
    const areaLower = area.toLowerCase().trim();

    const esCorteArea = areaLower === 'corte' ||
                        areaLower.includes('corte') ||
                        areaLower === 'cutting' ||
                        areaLower === 'cut';

    // Verificar por ID de estación (AC1, AC2, etc. = Área Corte)
    const idEstacion = (CONFIG_ESTACION.id || '').toUpperCase().trim();
    const nombreEstacion = (CONFIG_ESTACION.nombre || '').toLowerCase();

    // Detectar IDs tipo AC1, AC2, AC3... (Área Corte)
    const esCorteId = /^AC\d*$/i.test(idEstacion) ||
                      idEstacion.startsWith('AC') ||
                      idEstacion.includes('CORTE');

    const esCorteNombre = nombreEstacion.includes('corte') ||
                          nombreEstacion.includes('cutting');

    // Verificar por proceso actual (si el proceso es de corte)
    const procesoActual = operadoraState?.procesoActual?.procesoNombre || '';
    const procesoLower = procesoActual.toLowerCase();
    const esCorteProceso = procesoLower.includes('corte') ||
                           procesoLower.includes('cutting') ||
                           procesoLower.includes('tendido') ||
                           procesoLower.includes('trazo');

    const esCorte = esCorteArea || esCorteId || esCorteNombre || esCorteProceso;

    DEBUG_MODE && console.log('[OPERADORA] Verificando área de corte:');
    DEBUG_MODE && console.log('  - ID estación:', idEstacion, '-> esCorteId:', esCorteId);
    DEBUG_MODE && console.log('  - Área configurada:', area, '-> esCorteArea:', esCorteArea);
    DEBUG_MODE && console.log('  - Nombre estación:', CONFIG_ESTACION.nombre, '-> esCorteNombre:', esCorteNombre);
    DEBUG_MODE && console.log('  - Proceso actual:', procesoActual, '-> esCorteProceso:', esCorteProceso);
    DEBUG_MODE && console.log('  - RESULTADO FINAL:', esCorte);

    return esCorte;
}

// ========================================
// DETECCIÓN DE ÁREA CALIDAD/EMPAQUE
// ========================================

/**
 * Detecta si la estación actual es de Calidad o Empaque
 * Las estaciones de estas áreas tienen comportamiento especial:
 * - Pueden trabajar múltiples pedidos simultáneamente
 * - Reciben asignación automática cuando costura inicia último proceso
 * - Empaque genera etiquetas al finalizar
 * @returns {boolean} true si es estación de calidad o empaque
 */
function esEstacionCalidadEmpaque() {
    // Verificar por área configurada
    const area = (CONFIG_ESTACION.area || '').toLowerCase().trim();
    const esCalidadArea = area === 'calidad' || area.includes('calidad') ||
                          area === 'quality' || area === 'qa';
    const esEmpaqueArea = area === 'empaque' || area.includes('empaque') ||
                          area === 'packing' || area === 'packaging';

    // Verificar por ID de estación (E1, E2, etc. o Q1, Q2 para Quality)
    const idEstacion = (CONFIG_ESTACION.id || '').toUpperCase().trim();
    // IDs que empiezan con E (Empaque) o Q (Quality/Calidad) o CE/CA
    const esIdCalidadEmpaque = /^E\d+$/i.test(idEstacion) ||      // E1, E2, E3...
                                /^Q\d+$/i.test(idEstacion) ||      // Q1, Q2...
                                /^CA\d*$/i.test(idEstacion) ||     // CA1, CA2 (Calidad)
                                /^EM\d*$/i.test(idEstacion) ||     // EM1, EM2 (Empaque)
                                idEstacion.includes('EMPAQUE') ||
                                idEstacion.includes('CALIDAD') ||
                                idEstacion.includes('QUALITY');

    // Verificar por nombre de estación
    const nombreEstacion = (CONFIG_ESTACION.nombre || '').toLowerCase();
    const esNombreCalidadEmpaque = nombreEstacion.includes('calidad') ||
                                    nombreEstacion.includes('empaque') ||
                                    nombreEstacion.includes('quality') ||
                                    nombreEstacion.includes('packing');

    const resultado = esCalidadArea || esEmpaqueArea || esIdCalidadEmpaque || esNombreCalidadEmpaque;

    DEBUG_MODE && console.log('[OPERADORA] Verificando área Calidad/Empaque:');
    DEBUG_MODE && console.log('  - ID estación:', idEstacion, '-> esIdCalidadEmpaque:', esIdCalidadEmpaque);
    DEBUG_MODE && console.log('  - Área configurada:', area, '-> esCalidadArea:', esCalidadArea, 'esEmpaqueArea:', esEmpaqueArea);
    DEBUG_MODE && console.log('  - Nombre estación:', CONFIG_ESTACION.nombre, '-> esNombreCalidadEmpaque:', esNombreCalidadEmpaque);
    DEBUG_MODE && console.log('  - RESULTADO FINAL:', resultado);

    return resultado;
}

/**
 * Detecta específicamente si es estación de empaque (para etiquetas)
 */
function esEstacionEmpaque() {
    const area = (CONFIG_ESTACION.area || '').toLowerCase().trim();
    const idEstacion = (CONFIG_ESTACION.id || '').toUpperCase().trim();
    const nombreEstacion = (CONFIG_ESTACION.nombre || '').toLowerCase();

    return area === 'empaque' ||
           area.includes('empaque') ||
           area === 'packing' ||
           /^E\d+$/i.test(idEstacion) ||
           /^EM\d*$/i.test(idEstacion) ||
           idEstacion.includes('EMPAQUE') ||
           nombreEstacion.includes('empaque') ||
           nombreEstacion.includes('packing');
}

/**
 * Detecta específicamente si es estación de calidad
 */
function esEstacionCalidad() {
    const area = (CONFIG_ESTACION.area || '').toLowerCase().trim();
    const idEstacion = (CONFIG_ESTACION.id || '').toUpperCase().trim();
    const nombreEstacion = (CONFIG_ESTACION.nombre || '').toLowerCase();

    return area === 'calidad' ||
           area.includes('calidad') ||
           area === 'quality' ||
           /^Q\d+$/i.test(idEstacion) ||
           /^CA\d*$/i.test(idEstacion) ||
           idEstacion.includes('CALIDAD') ||
           idEstacion.includes('QUALITY') ||
           nombreEstacion.includes('calidad') ||
           nombreEstacion.includes('quality');
}

// Variable para saber si es finalización automática
let finalizacionAutomaticaMetros = false;

function mostrarModalMetrosCorte(esAutomatico = false) {
    finalizacionAutomaticaMetros = esAutomatico;

    const piezasProducidas = operadoraState.piezasCapturadas || 0;
    const procesoNombre = operadoraState.procesoActual?.procesoNombre || 'Corte';
    const pedidoId = operadoraState.pedidoActual?.id || '---';

    const content = `
        <div class="modal-metros-corte">
            <div class="metros-header">
                <div class="metros-icono">
                    <i class="fas fa-ruler-horizontal"></i>
                </div>
                <h3>Registro de Material Utilizado</h3>
                <p class="metros-subtitulo">Ingresa los metros lineales de tela utilizados en este corte</p>
            </div>

            <div class="metros-resumen">
                <div class="resumen-item">
                    <span class="resumen-label">Pedido</span>
                    <span class="resumen-valor">#${pedidoId}</span>
                </div>
                <div class="resumen-item">
                    <span class="resumen-label">Proceso</span>
                    <span class="resumen-valor">${procesoNombre}</span>
                </div>
                <div class="resumen-item">
                    <span class="resumen-label">Piezas Producidas</span>
                    <span class="resumen-valor destacado">${piezasProducidas}</span>
                </div>
            </div>

            <div class="metros-input-container">
                <label for="metrosUtilizados">
                    <i class="fas fa-tape"></i> Metros Lineales Utilizados
                </label>
                <div class="metros-input-wrapper">
                    <input type="number"
                           id="metrosUtilizados"
                           step="0.01"
                           min="0"
                           placeholder="0.00"
                           class="metros-input"
                           inputmode="decimal"
                           autocomplete="off">
                    <span class="metros-unidad">m</span>
                </div>
                <small class="metros-ayuda">Ingresa la cantidad total de metros de tela utilizados</small>
            </div>

            <div class="metros-info">
                <i class="fas fa-info-circle"></i>
                <span>Este dato se usará para comparar el consumo real vs el cotizado</span>
            </div>
        </div>
    `;

    mostrarModal('Finalizar Corte', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'cerrarModalMetros()' },
        { text: 'Finalizar Corte', class: 'btn-primary', onclick: 'confirmarFinalizarConMetros()' }
    ]);

    // Enfocar el input después de mostrar el modal
    setTimeout(() => {
        const input = document.getElementById('metrosUtilizados');
        if (input) {
            input.focus();
            input.select();
        }
    }, 300);
}

function cerrarModalMetros() {
    finalizacionAutomaticaMetros = false;
    cerrarModal();
}

function confirmarFinalizarConMetros() {
    const metrosInput = document.getElementById('metrosUtilizados');
    const metrosUtilizados = parseFloat(metrosInput?.value || 0);

    if (!metrosUtilizados || metrosUtilizados <= 0) {
        // Mostrar alerta pero permitir continuar
        if (!confirm('No ingresaste metros utilizados. ¿Deseas finalizar sin registrar el consumo de material?')) {
            metrosInput?.focus();
            return;
        }
    }

    cerrarModal();

    // Guardar los metros en el estado temporal
    operadoraState.metrosUtilizados = metrosUtilizados;

    // Continuar con la finalización normal
    finalizarProcesoConMetros(metrosUtilizados);
}

function finalizarProcesoConMetros(metrosUtilizados) {
    DEBUG_MODE && console.log('[OPERADORA] === FINALIZANDO PROCESO DE CORTE CON METROS ===');
    DEBUG_MODE && console.log('[OPERADORA] Metros utilizados:', metrosUtilizados);

    // Calcular tiempo total
    let tiempoTotal = operadoraState.tiempoProcesoAcumulado;
    if (!operadoraState.procesoEnPausa) {
        tiempoTotal += (new Date() - operadoraState.tiempoProcesoInicio);
    }

    // Detener intervalos
    if (operadoraState.intervaloProceso) {
        clearInterval(operadoraState.intervaloProceso);
        operadoraState.intervaloProceso = null;
    }
    detenerContadorPausa();

    // Guardar resumen del proceso CON METROS
    const resumenProceso = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        operadoraId: authState.operadoraActual.id,
        operadoraNombre: authState.operadoraActual.nombre,
        estacionId: CONFIG_ESTACION.id,
        pedidoId: operadoraState.pedidoActual?.id,
        procesoNombre: operadoraState.procesoActual?.procesoNombre,
        tiempoTotalMs: tiempoTotal,
        tiempoTotalFormateado: formatearTiempo(tiempoTotal),
        piezasProducidas: operadoraState.piezasCapturadas,
        pausas: operadoraState.historialPausas,
        // NUEVO: Datos de material para corte
        esProcesoCorte: true,
        metrosUtilizados: metrosUtilizados,
        metrosPorPieza: operadoraState.piezasCapturadas > 0 ?
            Math.round((metrosUtilizados / operadoraState.piezasCapturadas) * 1000) / 1000 : 0
    };

    guardarResumenProceso(resumenProceso);

    // Guardar en historial de consumo de material
    guardarConsumoMaterial(resumenProceso);

    // Resetear estado
    operadoraState.procesoIniciado = false;
    operadoraState.procesoEnPausa = false;
    operadoraState.tiempoProcesoInicio = null;
    operadoraState.tiempoProcesoAcumulado = 0;
    operadoraState.motivoPausaActual = null;
    operadoraState.historialPausas = [];
    operadoraState.metrosUtilizados = 0;

    // Actualizar UI
    actualizarBotonesTemporizador('sin-iniciar');
    actualizarEstadoProceso('sin-iniciar');
    ocultarIndicadorPausa();
    resetearDisplayTiempo();

    // Reproducir sonido
    if (typeof reproducirSonido === 'function') reproducirSonido('finalizar');

    // Limpiar estado guardado
    localStorage.removeItem(`temporizador_${CONFIG_ESTACION.id}`);

    // Detener monitoreo y resetear feedback
    detenerMonitoreoDesempeno();
    resetearFeedbackState();

    // ========================================
    // SINCRONIZACIÓN CON SUPERVISORA
    // ========================================

    const procesoId = operadoraState.procesoActual?.procesoId;
    const procesoNombre = operadoraState.procesoActual?.procesoNombre;
    const pedidoId = operadoraState.pedidoActual?.id;
    const piezasProducidas = operadoraState.piezasCapturadas;

    // 1. Actualizar avance del proceso en el pedido
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const pedidoIndex = pedidosERP.findIndex(p => p.id == pedidoId);
    if (pedidoIndex >= 0) {
        const pedido = pedidosERP[pedidoIndex];
        if (pedido.procesos) {
            const procesoIndex = pedido.procesos.findIndex(p => p.id == procesoId);
            if (procesoIndex >= 0) {
                pedido.procesos[procesoIndex].piezas = piezasProducidas;
                pedido.procesos[procesoIndex].estado = 'completado';
                pedido.procesos[procesoIndex].fechaCompletado = new Date().toISOString();
                pedido.procesos[procesoIndex].operadoraId = authState.operadoraActual?.id;
                pedido.procesos[procesoIndex].operadoraNombre = authState.operadoraActual?.nombre;
                pedido.procesos[procesoIndex].estacionId = CONFIG_ESTACION.id;
                // NUEVO: Guardar metros en el proceso
                pedido.procesos[procesoIndex].metrosUtilizados = metrosUtilizados;
                pedido.procesos[procesoIndex].metrosPorPieza = resumenProceso.metrosPorPieza;
            }
        }
        localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
    }

    // 2. Manejar asignaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    let haySiguienteProceso = false;
    let estacionIdEncontrada = CONFIG_ESTACION.id;

    if (!asignaciones[CONFIG_ESTACION.id]) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const [estId, asignacion] of Object.entries(asignaciones)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                estacionIdEncontrada = estId;
                break;
            }
        }
    }

    if (asignaciones[estacionIdEncontrada]) {
        const asignacionCompletada = {
            ...asignaciones[estacionIdEncontrada],
            estado: 'completado',
            fechaFin: new Date().toISOString(),
            piezasProducidas: piezasProducidas,
            tiempoTotalMs: tiempoTotal,
            marcadoComoCompletado: false,
            // NUEVO: Incluir metros
            metrosUtilizados: metrosUtilizados,
            metrosPorPieza: resumenProceso.metrosPorPieza
        };

        const historialAsignaciones = JSON.parse(localStorage.getItem('historial_asignaciones_completadas') || '[]');
        historialAsignaciones.unshift(asignacionCompletada);
        localStorage.setItem('historial_asignaciones_completadas', JSON.stringify(historialAsignaciones.slice(0, 100)));

        const colaProcesos = asignaciones[estacionIdEncontrada].colaProcesos || [];
        if (colaProcesos.length > 0) {
            const siguienteProceso = colaProcesos.shift();
            asignaciones[estacionIdEncontrada] = {
                ...siguienteProceso,
                operadoraId: authState.operadoraActual?.id,
                operadoraNombre: authState.operadoraActual?.nombre,
                colaProcesos: colaProcesos,
                estado: 'asignado',
                fechaAsignacion: new Date().toISOString()
            };
            haySiguienteProceso = true;
        } else {
            delete asignaciones[estacionIdEncontrada];
        }
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    // 3. Notificar a supervisora
    const notificacionesCoco = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    notificacionesCoco.unshift({
        id: Date.now(),
        tipo: 'proceso_completado',
        titulo: 'Corte Finalizado',
        mensaje: `${authState.operadoraActual?.nombre} completó ${procesoNombre} - ${piezasProducidas} pzas - ${metrosUtilizados}m utilizados`,
        estacionId: CONFIG_ESTACION.id,
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        procesoNombre: procesoNombre,
        pedidoId: pedidoId,
        piezas: piezasProducidas,
        metrosUtilizados: metrosUtilizados,
        metrosPorPieza: resumenProceso.metrosPorPieza,
        fecha: new Date().toISOString(),
        leido: false
    });
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificacionesCoco.slice(0, 100)));

    // 4. Actualizar estado_maquinas
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    Object.keys(estadoMaquinas).forEach(estId => {
        if (estId.toLowerCase().replace(/[-_\s]/g, '') === CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '')) {
            estadoMaquinas[estId] = {
                ...estadoMaquinas[estId],
                estado: 'disponible',
                pedidoActual: null,
                procesoActual: null,
                ultimoProceso: procesoNombre,
                ultimasPiezas: piezasProducidas,
                ultimosMetros: metrosUtilizados,
                piezasHoy: 0,
                operadoraId: authState.operadoraActual?.id,
                operadoraNombre: authState.operadoraActual?.nombre,
                ultimaActualizacion: new Date().toISOString()
            };
        }
    });
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // 5. Guardar en historial de supervisora
    const historialSup = JSON.parse(localStorage.getItem('supervisora_historial_procesos') || '[]');
    historialSup.unshift({
        ...resumenProceso,
        tipo: 'proceso_completado'
    });
    localStorage.setItem('supervisora_historial_procesos', JSON.stringify(historialSup.slice(0, 200)));

    // 6. Limpiar estado local
    operadoraState.pedidoActual = null;
    operadoraState.procesoActual = null;
    operadoraState.piezasCapturadas = 0;
    operadoraState.piezasMeta = 0;
    operadoraState.modoSimultaneo = false;
    operadoraState.procesosSimultaneos = [];
    operadoraState.capturasDia = [];

    DEBUG_MODE && console.log('[OPERADORA] Proceso de corte finalizado con', metrosUtilizados, 'metros registrados');

    // 7. Mostrar resultado
    if (haySiguienteProceso) {
        mostrarToast(`Corte finalizado. ${metrosUtilizados}m utilizados. Cargando siguiente proceso...`, 'success');
        setTimeout(() => {
            cargarPedidoAsignado();
        }, 500);
    } else {
        mostrarSinPedido();

        const colaContainer = document.getElementById('colaProcesosContainer');
        if (colaContainer) colaContainer.style.display = 'none';

        const procesoAsignadoEl = document.getElementById('procesoAsignado');
        if (procesoAsignadoEl) procesoAsignadoEl.style.display = 'none';

        const progressActual = document.getElementById('progressValue');
        if (progressActual) progressActual.textContent = '0';

        const progressTotalEl = document.getElementById('progressTotal');
        if (progressTotalEl) progressTotalEl.textContent = '0';

        const progressBarEl = document.getElementById('progressBar');
        if (progressBarEl) {
            const circumference = 2 * Math.PI * 90;
            progressBarEl.style.strokeDasharray = circumference;
            progressBarEl.style.strokeDashoffset = circumference;
        }

        mostrarToast(`Corte finalizado. ${metrosUtilizados}m de material registrados. Tiempo: ${resumenProceso.tiempoTotalFormateado}`, 'success');
    }
}

function guardarConsumoMaterial(resumenProceso) {
    // Guardar en historial de consumo de material
    const historialConsumo = JSON.parse(localStorage.getItem('historial_consumo_material') || '[]');

    historialConsumo.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        operadoraId: resumenProceso.operadoraId,
        operadoraNombre: resumenProceso.operadoraNombre,
        estacionId: resumenProceso.estacionId,
        pedidoId: resumenProceso.pedidoId,
        procesoNombre: resumenProceso.procesoNombre,
        piezasProducidas: resumenProceso.piezasProducidas,
        metrosUtilizados: resumenProceso.metrosUtilizados,
        metrosPorPieza: resumenProceso.metrosPorPieza,
        tiempoTotalMs: resumenProceso.tiempoTotalMs
    });

    // Mantener solo los últimos 500 registros
    localStorage.setItem('historial_consumo_material', JSON.stringify(historialConsumo.slice(0, 500)));
    DEBUG_MODE && console.log('[OPERADORA] Consumo de material guardado:', resumenProceso.metrosUtilizados, 'm');
}

function actualizarTiempoProceso() {
    if (!operadoraState.procesoIniciado || operadoraState.procesoEnPausa) return;

    const ahora = new Date();
    const tiempoSesionActual = ahora - operadoraState.tiempoProcesoInicio;
    const tiempoTotal = operadoraState.tiempoProcesoAcumulado + tiempoSesionActual;

    actualizarDisplayTiempo(tiempoTotal);
}

function actualizarDisplayTiempo(tiempoMs) {
    const segundosTotales = Math.floor(tiempoMs / 1000);
    const horas = Math.floor(segundosTotales / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    const segundos = segundosTotales % 60;

    const display = document.getElementById('tiempoProcesoDisplay');
    if (display) {
        display.querySelector('.tiempo-horas').textContent = String(horas).padStart(2, '0');
        display.querySelector('.tiempo-minutos').textContent = String(minutos).padStart(2, '0');
        display.querySelector('.tiempo-segundos').textContent = String(segundos).padStart(2, '0');
    }
}

function resetearDisplayTiempo() {
    actualizarDisplayTiempo(0);
}

function formatearTiempo(tiempoMs) {
    const segundosTotales = Math.floor(tiempoMs / 1000);
    const horas = Math.floor(segundosTotales / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    const segundos = segundosTotales % 60;

    if (horas > 0) {
        return `${horas}h ${minutos}m ${segundos}s`;
    } else if (minutos > 0) {
        return `${minutos}m ${segundos}s`;
    }
    return `${segundos}s`;
}

function actualizarBotonesTemporizador(estado) {
    const btnIniciar = document.getElementById('btnIniciar');
    const btnPausar = document.getElementById('btnPausar');
    const btnReanudar = document.getElementById('btnReanudar');
    const btnFinalizar = document.getElementById('btnFinalizar');

    // Ocultar todos
    if (btnIniciar) btnIniciar.style.display = 'none';
    if (btnPausar) btnPausar.style.display = 'none';
    if (btnReanudar) btnReanudar.style.display = 'none';
    if (btnFinalizar) btnFinalizar.style.display = 'none';

    switch(estado) {
        case 'sin-iniciar':
            if (btnIniciar) btnIniciar.style.display = 'flex';
            break;
        case 'trabajando':
            if (btnPausar) btnPausar.style.display = 'flex';
            if (btnFinalizar) btnFinalizar.style.display = 'flex';
            break;
        case 'pausado':
            if (btnReanudar) btnReanudar.style.display = 'flex';
            if (btnFinalizar) btnFinalizar.style.display = 'flex';
            break;
    }
}

function actualizarEstadoProceso(estado, motivo = null) {
    const estadoEl = document.getElementById('estadoProceso');
    if (!estadoEl) return;

    switch(estado) {
        case 'sin-iniciar':
            estadoEl.innerHTML = '<i class="fas fa-circle estado-gris"></i> Sin iniciar';
            estadoEl.className = 'temporizador-estado sin-iniciar';
            break;
        case 'trabajando':
            estadoEl.innerHTML = '<i class="fas fa-circle estado-verde"></i> Trabajando';
            estadoEl.className = 'temporizador-estado trabajando';
            break;
        case 'pausado':
            estadoEl.innerHTML = `<i class="fas fa-circle estado-amarillo"></i> ${motivo?.nombre || 'En pausa'}`;
            estadoEl.className = 'temporizador-estado pausado';
            break;
    }
}

function mostrarIndicadorPausa(motivo) {
    const indicador = document.getElementById('pausaActiva');
    const icono = document.getElementById('pausaActivaIcono');
    const motivoEl = document.getElementById('pausaActivaMotivo');

    if (icono) icono.innerHTML = `<i class="fas ${motivo.icono}" style="color: ${motivo.color}"></i>`;
    if (motivoEl) motivoEl.textContent = motivo.nombre;
    if (indicador) {
        indicador.style.display = 'flex';
        indicador.style.borderColor = motivo.color;
    }
}

function ocultarIndicadorPausa() {
    const indicador = document.getElementById('pausaActiva');
    if (indicador) indicador.style.display = 'none';
}

// Contador de tiempo en pausa
let intervaloPausaDisplay = null;

function iniciarContadorPausa() {
    const tiempoEl = document.getElementById('pausaActivaTiempo');

    intervaloPausaDisplay = setInterval(() => {
        if (!operadoraState.tiempoPausaInicio) return;

        const tiempoPausa = new Date() - operadoraState.tiempoPausaInicio;
        const minutos = Math.floor(tiempoPausa / 60000);
        const segundos = Math.floor((tiempoPausa % 60000) / 1000);

        if (tiempoEl) tiempoEl.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    }, 1000);
}

function detenerContadorPausa() {
    if (intervaloPausaDisplay) {
        clearInterval(intervaloPausaDisplay);
        intervaloPausaDisplay = null;
    }
    const tiempoEl = document.getElementById('pausaActivaTiempo');
    if (tiempoEl) tiempoEl.textContent = '00:00';
}

function notificarPausaACoco(motivo) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    notificaciones.unshift({
        id: Date.now(),
        tipo: 'pausa_operadora',
        titulo: `Pausa en ${CONFIG_ESTACION.id}`,
        mensaje: `${authState.operadoraActual.nombre}: ${motivo.nombre}`,
        fecha: new Date().toISOString(),
        leida: false,
        urgente: motivo.id === 'maquina' || motivo.id === 'sin_material',
        datos: {
            estacionId: CONFIG_ESTACION.id,
            operadoraId: authState.operadoraActual.id,
            motivoId: motivo.id,
            motivoNombre: motivo.nombre
        }
    });
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificaciones));

    // Si es problema de máquina o sin material, crear tiempo muerto
    if (motivo.id === 'maquina' || motivo.id === 'sin_material') {
        const tiemposMuertos = JSON.parse(localStorage.getItem('tiempos_muertos') || '{"activos":{},"historial":[]}');
        tiemposMuertos.activos[CONFIG_ESTACION.id] = {
            id: Date.now(),
            estacionId: CONFIG_ESTACION.id,
            inicio: new Date().toISOString(),
            motivoId: motivo.id,
            motivoNombre: motivo.nombre,
            motivoColor: motivo.color,
            motivoIcono: motivo.icono,
            operadores: [{ id: authState.operadoraActual.id, nombre: authState.operadoraActual.nombre }]
        };
        localStorage.setItem('tiempos_muertos', JSON.stringify(tiemposMuertos));
    }
}

function registrarEventoProceso(tipo, descripcion) {
    const eventos = JSON.parse(localStorage.getItem('eventos_proceso') || '[]');
    eventos.unshift({
        id: Date.now(),
        tipo: tipo,
        descripcion: descripcion,
        fecha: new Date().toISOString(),
        operadoraId: authState.operadoraActual?.id,
        estacionId: CONFIG_ESTACION.id,
        pedidoId: operadoraState.pedidoActual?.id
    });
    localStorage.setItem('eventos_proceso', JSON.stringify(eventos.slice(0, 500)));
}

function guardarEstadoTemporizador() {
    const estado = {
        procesoIniciado: operadoraState.procesoIniciado,
        procesoEnPausa: operadoraState.procesoEnPausa,
        tiempoProcesoInicio: operadoraState.tiempoProcesoInicio?.toISOString(),
        tiempoProcesoAcumulado: operadoraState.tiempoProcesoAcumulado,
        tiempoPausaInicio: operadoraState.tiempoPausaInicio?.toISOString(),
        motivoPausaActual: operadoraState.motivoPausaActual,
        historialPausas: operadoraState.historialPausas
    };
    localStorage.setItem(`temporizador_${CONFIG_ESTACION.id}`, JSON.stringify(estado));
}

function restaurarEstadoTemporizador() {
    const guardado = localStorage.getItem(`temporizador_${CONFIG_ESTACION.id}`);
    if (!guardado) return;

    try {
        const estado = JSON.parse(guardado);

        operadoraState.procesoIniciado = estado.procesoIniciado;
        operadoraState.procesoEnPausa = estado.procesoEnPausa;
        operadoraState.tiempoProcesoInicio = estado.tiempoProcesoInicio ? new Date(estado.tiempoProcesoInicio) : null;
        operadoraState.tiempoProcesoAcumulado = estado.tiempoProcesoAcumulado || 0;
        operadoraState.tiempoPausaInicio = estado.tiempoPausaInicio ? new Date(estado.tiempoPausaInicio) : null;
        operadoraState.motivoPausaActual = estado.motivoPausaActual;
        operadoraState.historialPausas = estado.historialPausas || [];

        // Restaurar UI
        if (operadoraState.procesoIniciado) {
            if (operadoraState.procesoEnPausa) {
                actualizarBotonesTemporizador('pausado');
                actualizarEstadoProceso('pausado', operadoraState.motivoPausaActual);
                if (operadoraState.motivoPausaActual) {
                    mostrarIndicadorPausa(operadoraState.motivoPausaActual);
                }
                iniciarContadorPausa();
            } else {
                actualizarBotonesTemporizador('trabajando');
                actualizarEstadoProceso('trabajando');
                operadoraState.intervaloProceso = setInterval(actualizarTiempoProceso, 1000);
            }

            // *** INTEGRACIÓN FEEDBACK: Restaurar monitoreo de desempeño ***
            iniciarMonitoreoDesempeno();
        }
    } catch (e) {
        console.error('Error restaurando temporizador:', e);
    }
}

function guardarResumenProceso(resumen) {
    const historial = JSON.parse(localStorage.getItem('historial_procesos') || '[]');
    historial.unshift(resumen);
    localStorage.setItem('historial_procesos', JSON.stringify(historial.slice(0, 200)));
}

// ========================================
// CAPTURA DE FOTO PARA PROBLEMAS
// ========================================

let streamCamara = null;
let fotoCapturadaData = null;

async function abrirCamara() {
    try {
        const video = document.getElementById('cameraVideo');
        streamCamara = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } // Cámara trasera
        });
        video.srcObject = streamCamara;

        document.getElementById('camaraContainer').style.display = 'flex';
        document.getElementById('btnCapturarFoto').style.display = 'flex';
        document.getElementById('btnUsarFoto').style.display = 'none';
        document.getElementById('btnRepetirFoto').style.display = 'none';
        document.getElementById('cameraVideo').style.display = 'block';
        document.getElementById('fotoCapturada').style.display = 'none';

    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarToast('No se pudo acceder a la cámara', 'error');
    }
}

function cerrarCamara() {
    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
        streamCamara = null;
    }
    document.getElementById('camaraContainer').style.display = 'none';
    fotoCapturadaData = null;
}

function capturarFoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const foto = document.getElementById('fotoCapturada');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    fotoCapturadaData = canvas.toDataURL('image/jpeg', 0.8);
    foto.src = fotoCapturadaData;

    // Mostrar foto capturada
    video.style.display = 'none';
    foto.style.display = 'block';

    document.getElementById('btnCapturarFoto').style.display = 'none';
    document.getElementById('btnUsarFoto').style.display = 'flex';
    document.getElementById('btnRepetirFoto').style.display = 'flex';
}

function repetirFoto() {
    const video = document.getElementById('cameraVideo');
    const foto = document.getElementById('fotoCapturada');

    video.style.display = 'block';
    foto.style.display = 'none';
    fotoCapturadaData = null;

    document.getElementById('btnCapturarFoto').style.display = 'flex';
    document.getElementById('btnUsarFoto').style.display = 'none';
    document.getElementById('btnRepetirFoto').style.display = 'none';
}

function usarFoto() {
    cerrarCamara();

    // La foto está en fotoCapturadaData
    const preview = document.getElementById('fotoProblemaPreview');
    const btnFoto = document.getElementById('btnAgregarFoto');
    if (preview && fotoCapturadaData) {
        preview.src = fotoCapturadaData;
        preview.style.display = 'block';
    }
    if (btnFoto) {
        btnFoto.innerHTML = '<i class="fas fa-camera"></i> Cambiar foto';
    }
}

// ========================================
// MODO OFFLINE Y SINCRONIZACIÓN
// ========================================

function verificarConexion() {
    return navigator.onLine;
}

function agregarAColaOffline(tipo, datos) {
    const cola = JSON.parse(localStorage.getItem('cola_offline') || '{"capturas":[],"problemas":[],"eventos":[]}');
    cola[tipo].push({
        ...datos,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('cola_offline', JSON.stringify(cola));
}

var _syncRetryCount = 0;
var _syncRetryTimer = null;

function sincronizarColaOffline() {
    if (!verificarConexion()) {
        // Programar retry con backoff exponencial
        var delay = Math.min(1000 * Math.pow(2, _syncRetryCount), 60000); // max 60s
        _syncRetryCount++;
        clearTimeout(_syncRetryTimer);
        _syncRetryTimer = setTimeout(sincronizarColaOffline, delay);
        return;
    }

    _syncRetryCount = 0;
    clearTimeout(_syncRetryTimer);

    const cola = JSON.parse(localStorage.getItem('cola_offline') || '{"capturas":[],"problemas":[],"eventos":[]}');
    var totalPendientes = (cola.capturas || []).length + (cola.problemas || []).length;

    // Sincronizar capturas
    (cola.capturas || []).forEach(captura => {
        sincronizarConSupervisora(captura);
    });

    // Sincronizar problemas
    (cola.problemas || []).forEach(problema => {
        notificarSupervisora(problema);
    });

    // Limpiar cola
    localStorage.setItem('cola_offline', JSON.stringify({capturas:[],problemas:[],eventos:[]}));

    if (totalPendientes > 0) {
        mostrarToast('Conexión restaurada. ' + totalPendientes + ' acciones sincronizadas', 'success');
        reproducirSonido('notificacion');
    }

    // Quitar banner offline
    var banner = document.getElementById('offlineBanner');
    if (banner) banner.remove();
    actualizarIndicadorConexion();
}

function actualizarIndicadorConexion() {
    const indicador = document.getElementById('conexionIndicador');
    if (indicador) {
        const cola = JSON.parse(localStorage.getItem('cola_offline') || '{"capturas":[],"problemas":[],"eventos":[]}');
        const pendientes = (cola.capturas || []).length + (cola.problemas || []).length + (cola.eventos || []).length;

        if (verificarConexion()) {
            indicador.className = 'conexion-indicador online';
            indicador.innerHTML = '<i class="fas fa-wifi"></i>';
            indicador.title = 'Conectado';
            // Quitar banner offline si existe
            var banner = document.getElementById('offlineBanner');
            if (banner) banner.remove();
        } else {
            indicador.className = 'conexion-indicador offline';
            indicador.innerHTML = '<i class="fas fa-wifi-slash"></i>' +
                (pendientes > 0 ? '<span class="offline-badge">' + pendientes + '</span>' : '');
            indicador.title = 'Sin conexión' + (pendientes > 0 ? ' (' + pendientes + ' pendientes)' : '');
            // Mostrar banner offline persistente
            if (!document.getElementById('offlineBanner')) {
                var banner = document.createElement('div');
                banner.id = 'offlineBanner';
                banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;padding:8px 16px;text-align:center;font-size:0.85rem;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
                banner.innerHTML = '<i class="fas fa-wifi-slash"></i> Modo Offline — Los datos se sincronizarán al reconectar' +
                    (pendientes > 0 ? ' <span style="background:rgba(0,0,0,0.2);padding:2px 8px;border-radius:10px;margin-left:8px;">' + pendientes + ' acciones pendientes</span>' : '');
                document.body.prepend(banner);
            } else {
                var banner = document.getElementById('offlineBanner');
                banner.innerHTML = '<i class="fas fa-wifi-slash"></i> Modo Offline — Los datos se sincronizarán al reconectar' +
                    (pendientes > 0 ? ' <span style="background:rgba(0,0,0,0.2);padding:2px 8px;border-radius:10px;margin-left:8px;">' + pendientes + ' acciones pendientes</span>' : '');
            }
        }
    }
}

// ========================================
// HISTORIAL DE DÍAS ANTERIORES
// ========================================

function mostrarHistorialDias() {
    const historial = obtenerHistorialDias();
    const stats = calcularEstadisticasHistorial(historial);

    const content = `
        <div class="historial-completo">
            <!-- Resumen rápido -->
            <div class="historial-resumen">
                <div class="resumen-mini">
                    <span class="resumen-valor">${stats.totalPiezas}</span>
                    <span class="resumen-label">piezas totales</span>
                </div>
                <div class="resumen-mini">
                    <span class="resumen-valor">${stats.promedioDiario}</span>
                    <span class="resumen-label">promedio/día</span>
                </div>
                <div class="resumen-mini">
                    <span class="resumen-valor">${stats.eficienciaPromedio}%</span>
                    <span class="resumen-label">eficiencia prom.</span>
                </div>
                <div class="resumen-mini tendencia ${stats.tendencia >= 0 ? 'positiva' : 'negativa'}">
                    <span class="resumen-valor">
                        <i class="fas fa-${stats.tendencia >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(stats.tendencia)}%
                    </span>
                    <span class="resumen-label">tendencia</span>
                </div>
            </div>

            <!-- Gráfica de tendencia -->
            <div class="grafica-tendencia">
                <h4><i class="fas fa-chart-line"></i> Tu progreso (últimos 7 días)</h4>
                <div class="grafica-container">
                    <div class="grafica-barras">
                        ${historial.map((dia, index) => {
                            const altura = dia.eficiencia ? Math.min(100, dia.eficiencia) : 0;
                            const esHoy = index === historial.length - 1;
                            const cumplioMeta = dia.eficiencia >= 100;
                            return `
                                <div class="barra-dia ${esHoy ? 'hoy' : ''} ${cumplioMeta ? 'meta-cumplida' : ''}">
                                    <div class="barra-valor">${dia.piezas || 0}</div>
                                    <div class="barra-fill" style="height: ${altura}%">
                                        <div class="barra-eficiencia">${dia.eficiencia || 0}%</div>
                                    </div>
                                    <div class="barra-label">${dia.diaCorto}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="grafica-linea-meta">
                        <span>Meta 100%</span>
                    </div>
                </div>
            </div>

            <!-- Lista detallada -->
            <div class="historial-lista">
                <h4><i class="fas fa-calendar-alt"></i> Detalle por día</h4>
                ${historial.length > 0 ? `
                    <div class="dias-lista">
                        ${historial.slice().reverse().map(dia => `
                            <div class="dia-item ${dia.esHoy ? 'hoy' : ''} ${dia.cumpliMeta ? 'meta-ok' : ''}">
                                <div class="dia-fecha">
                                    <span class="dia-nombre">${dia.diaNombre}</span>
                                    <span class="dia-numero">${dia.fechaCorta}</span>
                                </div>
                                <div class="dia-stats">
                                    <span class="dia-piezas">
                                        <i class="fas fa-cubes"></i> ${dia.piezas || 0}
                                    </span>
                                    <span class="dia-eficiencia ${dia.eficiencia >= 100 ? 'buena' : dia.eficiencia >= 80 ? 'regular' : 'baja'}">
                                        ${dia.eficiencia || 0}%
                                    </span>
                                </div>
                                <div class="dia-indicador">
                                    ${dia.cumpliMeta
                                        ? '<i class="fas fa-check-circle" style="color: #10b981"></i>'
                                        : '<i class="fas fa-circle" style="color: #d1d5db"></i>'
                                    }
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <p class="sin-historial">No hay historial disponible</p>
                `}
            </div>
        </div>
    `;

    mostrarModal('Mi Historial', content, [
        { text: 'Cerrar', class: 'btn-primary', onclick: 'cerrarModal()' }
    ]);
}

function obtenerHistorialDias() {
    const historial = JSON.parse(localStorage.getItem('historial_turnos') || '[]');
    const operadoraId = authState.operadoraActual?.id;

    // Obtener últimos 7 días
    const dias = [];
    const hoy = new Date();

    for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];

        // Buscar turno de ese día
        const turno = historial.find(t =>
            t.operadoraId === operadoraId &&
            t.fecha?.startsWith(fechaStr)
        );

        const diaSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const diaNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        dias.push({
            fecha: fechaStr,
            fechaCorta: `${fecha.getDate()}/${fecha.getMonth() + 1}`,
            diaCorto: diaSemana[fecha.getDay()],
            diaNombre: diaNombres[fecha.getDay()],
            piezas: turno?.piezas || 0,
            eficiencia: turno?.eficiencia || 0,
            cumpliMeta: turno?.cumpliMeta || false,
            esHoy: i === 0
        });
    }

    // Si es hoy y hay datos actuales, usar esos
    if (operadoraState.piezasCapturadas > 0) {
        const hoyIndex = dias.length - 1;
        dias[hoyIndex].piezas = operadoraState.piezasCapturadas;
        dias[hoyIndex].eficiencia = typeof calcularEficienciaActual === 'function' ? calcularEficienciaActual() : 0;
        dias[hoyIndex].cumpliMeta = dias[hoyIndex].eficiencia >= 100;
    }

    return dias;
}

function calcularEstadisticasHistorial(historial) {
    const diasConDatos = historial.filter(d => d.piezas > 0);

    const totalPiezas = diasConDatos.reduce((sum, d) => sum + d.piezas, 0);
    const promedioDiario = diasConDatos.length > 0
        ? Math.round(totalPiezas / diasConDatos.length)
        : 0;
    const eficienciaPromedio = diasConDatos.length > 0
        ? Math.round(diasConDatos.reduce((sum, d) => sum + d.eficiencia, 0) / diasConDatos.length)
        : 0;

    // Calcular tendencia (comparar primeros 3 días vs últimos 3 días)
    let tendencia = 0;
    if (diasConDatos.length >= 4) {
        const primeros = diasConDatos.slice(0, 3);
        const ultimos = diasConDatos.slice(-3);
        const promPrimeros = primeros.reduce((s, d) => s + d.eficiencia, 0) / primeros.length;
        const promUltimos = ultimos.reduce((s, d) => s + d.eficiencia, 0) / ultimos.length;
        tendencia = Math.round(promUltimos - promPrimeros);
    }

    return {
        totalPiezas,
        promedioDiario,
        eficienciaPromedio,
        tendencia
    };
}

// ========================================
// MIS REPORTES DE PRODUCTIVIDAD
// ========================================

function mostrarMisReportes() {
    const operadoraId = authState.operadoraActual?.id;
    const operadoraNombre = authState.operadoraActual?.nombre || 'Operador';

    // Obtener historial de producción del operador
    const historialProduccion = JSON.parse(localStorage.getItem('historial_produccion') || '[]')
        .filter(h => h.operadoraId == operadoraId || h.operadorId == operadoraId);

    // Obtener productos y clientes
    const dbData = JSON.parse(localStorage.getItem('multifundas_erp_data') || '{}');
    const productos = dbData.productos || [];
    const clientes = dbData.clientes || [];
    const pedidos = dbData.pedidos || [];

    // Calcular estadísticas
    const stats = calcularEstadisticasReporte(historialProduccion);

    // Agrupar por proceso
    const procesoMap = {};
    historialProduccion.forEach(h => {
        const proceso = h.procesoNombre || h.proceso || h.tipoProceso || 'Sin proceso';
        if (!procesoMap[proceso]) {
            procesoMap[proceso] = { nombre: proceso, piezas: 0, registros: 0 };
        }
        procesoMap[proceso].piezas += h.cantidad || h.piezas || 0;
        procesoMap[proceso].registros++;
    });
    const procesos = Object.values(procesoMap).sort((a, b) => b.piezas - a.piezas);

    // Agrupar por cliente
    const clienteMap = {};
    historialProduccion.forEach(h => {
        if (h.pedidoId) {
            const pedido = pedidos.find(p => p.id == h.pedidoId);
            if (pedido && pedido.clienteId) {
                const cliente = clientes.find(c => c.id == pedido.clienteId);
                const clienteNombre = cliente?.nombreComercial || 'Cliente ' + pedido.clienteId;
                if (!clienteMap[clienteNombre]) {
                    clienteMap[clienteNombre] = { nombre: clienteNombre, piezas: 0, registros: 0 };
                }
                clienteMap[clienteNombre].piezas += h.cantidad || h.piezas || 0;
                clienteMap[clienteNombre].registros++;
            }
        }
    });
    const clientesArr = Object.values(clienteMap).sort((a, b) => b.piezas - a.piezas);

    // Enriquecer historial reciente
    const historialReciente = historialProduccion.slice(-20).reverse().map(h => {
        const pedido = pedidos.find(p => p.id == h.pedidoId);
        const cliente = pedido ? clientes.find(c => c.id == pedido.clienteId) : null;
        return {
            ...h,
            clienteNombre: cliente?.nombreComercial || '',
            procesoNombre: h.procesoNombre || h.proceso || h.tipoProceso || ''
        };
    });

    const content = `
        <div class="mis-reportes">
            <!-- Tabs de navegación -->
            <div class="reportes-tabs-op">
                <button class="tab-op active" onclick="cambiarTabReporte('resumen')">
                    <i class="fas fa-chart-pie"></i> Resumen
                </button>
                <button class="tab-op" onclick="cambiarTabReporte('historial')">
                    <i class="fas fa-list"></i> Historial
                </button>
                <button class="tab-op" onclick="cambiarTabReporte('procesos')">
                    <i class="fas fa-cogs"></i> Procesos
                </button>
                <button class="tab-op" onclick="cambiarTabReporte('clientes')">
                    <i class="fas fa-building"></i> Clientes
                </button>
            </div>

            <!-- Contenido de tabs -->
            <div id="tabResumen" class="tab-content-op active">
                <!-- Resumen general -->
                <div class="reportes-resumen-op">
                    <div class="stat-card-op">
                        <i class="fas fa-cubes"></i>
                        <div class="stat-info">
                            <span class="stat-valor">${stats.totalPiezas.toLocaleString()}</span>
                            <span class="stat-label">Piezas Totales</span>
                        </div>
                    </div>
                    <div class="stat-card-op">
                        <i class="fas fa-calendar-day"></i>
                        <div class="stat-info">
                            <span class="stat-valor">${stats.piezasHoy.toLocaleString()}</span>
                            <span class="stat-label">Piezas Hoy</span>
                        </div>
                    </div>
                    <div class="stat-card-op">
                        <i class="fas fa-chart-line"></i>
                        <div class="stat-info">
                            <span class="stat-valor">${stats.promedioDiario}</span>
                            <span class="stat-label">Promedio/Día</span>
                        </div>
                    </div>
                    <div class="stat-card-op">
                        <i class="fas fa-clipboard-list"></i>
                        <div class="stat-info">
                            <span class="stat-valor">${stats.totalRegistros}</span>
                            <span class="stat-label">Registros</span>
                        </div>
                    </div>
                </div>

                <!-- Mejor proceso -->
                ${procesos.length > 0 ? `
                <div class="mejor-proceso-op">
                    <h4><i class="fas fa-star"></i> Tu Mejor Proceso</h4>
                    <div class="proceso-destacado">
                        <span class="proceso-nombre">${procesos[0].nombre}</span>
                        <span class="proceso-piezas">${procesos[0].piezas.toLocaleString()} piezas</span>
                    </div>
                </div>
                ` : ''}

                <!-- Gráfico de últimos 7 días -->
                <div class="grafico-semana-op">
                    <h4><i class="fas fa-chart-bar"></i> Últimos 7 Días</h4>
                    <div class="barras-semana">
                        ${generarGraficoSemana(historialProduccion)}
                    </div>
                </div>
            </div>

            <div id="tabHistorial" class="tab-content-op">
                <h4><i class="fas fa-history"></i> Historial de Producción</h4>
                ${historialReciente.length === 0 ?
                    '<p class="sin-datos">No hay registros de producción</p>'
                    : `
                    <div class="historial-tabla-op">
                        <div class="historial-header-op">
                            <span>Fecha</span>
                            <span>Piezas</span>
                            <span>Proceso</span>
                            <span>Cliente</span>
                        </div>
                        ${historialReciente.map(h => `
                            <div class="historial-row-op">
                                <span class="fecha-op">${formatearFechaCorta(h.fecha)}</span>
                                <span class="piezas-op">${h.cantidad || h.piezas || 0}</span>
                                <span class="proceso-op">${h.procesoNombre || '-'}</span>
                                <span class="cliente-op">${h.clienteNombre ? h.clienteNombre.substring(0, 12) : '-'}</span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div id="tabProcesos" class="tab-content-op">
                <h4><i class="fas fa-cogs"></i> Producción por Proceso</h4>
                ${procesos.length === 0 ?
                    '<p class="sin-datos">No hay datos de procesos</p>'
                    : `
                    <div class="procesos-lista-op">
                        ${procesos.map((p, idx) => `
                            <div class="proceso-item-op">
                                <span class="proceso-rank">#${idx + 1}</span>
                                <div class="proceso-info">
                                    <span class="proceso-nombre">${p.nombre}</span>
                                    <div class="proceso-barra">
                                        <div class="proceso-fill" style="width: ${procesos[0].piezas > 0 ? (p.piezas / procesos[0].piezas) * 100 : 0}%"></div>
                                    </div>
                                </div>
                                <span class="proceso-total">${p.piezas.toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div id="tabClientes" class="tab-content-op">
                <h4><i class="fas fa-building"></i> Producción por Cliente</h4>
                ${clientesArr.length === 0 ?
                    '<p class="sin-datos">No hay datos de clientes</p>'
                    : `
                    <div class="clientes-lista-op">
                        ${clientesArr.map((c, idx) => `
                            <div class="cliente-item-op">
                                <span class="cliente-rank">#${idx + 1}</span>
                                <div class="cliente-info">
                                    <span class="cliente-nombre">${c.nombre}</span>
                                    <div class="cliente-barra">
                                        <div class="cliente-fill" style="width: ${clientesArr[0].piezas > 0 ? (c.piezas / clientesArr[0].piezas) * 100 : 0}%"></div>
                                    </div>
                                </div>
                                <span class="cliente-total">${c.piezas.toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    mostrarModal('Mis Reportes', content, [
        { text: 'Cerrar', class: 'btn-primary', onclick: 'cerrarModal()' }
    ]);
}

function cambiarTabReporte(tab) {
    // Desactivar todos los tabs
    document.querySelectorAll('.tab-op').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content-op').forEach(c => c.classList.remove('active'));

    // Activar el tab seleccionado
    event.target.closest('.tab-op').classList.add('active');
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
}

function calcularEstadisticasReporte(historial) {
    const hoy = new Date().toISOString().split('T')[0];
    const registrosHoy = historial.filter(h => h.fecha && h.fecha.startsWith(hoy));

    const totalPiezas = historial.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);
    const piezasHoy = registrosHoy.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

    // Calcular días únicos
    const diasUnicos = new Set(historial.map(h => h.fecha ? h.fecha.split('T')[0] : null).filter(Boolean));
    const promedioDiario = diasUnicos.size > 0 ? Math.round(totalPiezas / diasUnicos.size) : 0;

    return {
        totalPiezas,
        piezasHoy,
        promedioDiario,
        totalRegistros: historial.length
    };
}

function generarGraficoSemana(historial) {
    const dias = [];
    const hoy = new Date();
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = 6; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toISOString().split('T')[0];

        const piezasDia = historial
            .filter(h => h.fecha && h.fecha.startsWith(fechaStr))
            .reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

        dias.push({
            dia: diasSemana[fecha.getDay()],
            piezas: piezasDia,
            esHoy: i === 0
        });
    }

    const maxPiezas = Math.max(...dias.map(d => d.piezas), 1);

    return dias.map(d => `
        <div class="barra-dia-op ${d.esHoy ? 'hoy' : ''}">
            <div class="barra-valor-op">${d.piezas}</div>
            <div class="barra-fill-op" style="height: ${(d.piezas / maxPiezas) * 100}%"></div>
            <div class="barra-label-op">${d.dia}</div>
        </div>
    `).join('');
}

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return '-';
    return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}

// ========================================
// RANKING PERSONAL
// ========================================

function mostrarRankingPersonal() {
    const ranking = obtenerRankingOperadoras();
    const miPosicion = ranking.findIndex(r => r.id === authState.operadoraActual?.id) + 1;

    const content = `
        <div class="ranking-personal">
            <div class="mi-posicion">
                <div class="posicion-numero">#${miPosicion || '-'}</div>
                <div class="posicion-texto">Tu posición de hoy</div>
            </div>

            <div class="ranking-lista">
                ${ranking.length > 0 ? ranking.slice(0, 10).map((op, idx) => {
                    const tierOp = calcularTierLocal(op.eficiencia);
                    const premioOp = tierOp ? Math.round((op.premioBase || getConfigIncentivosLocal().premioBaseDefault) * tierOp.multiplicador) : 0;
                    return `
                    <div class="ranking-item ${op.id === authState.operadoraActual?.id ? 'es-yo' : ''}">
                        <span class="ranking-pos">
                            ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <span class="ranking-nombre">${op.nombre}</span>
                        <span class="ranking-piezas">${op.piezas} pzas</span>
                        <span class="ranking-eficiencia">${op.eficiencia}%</span>
                        <span class="ranking-premio" style="color:${tierOp ? tierOp.color : '#999'}">
                            ${tierOp ? '<i class="fas ' + tierOp.icono + '"></i> $' + premioOp : '-'}
                        </span>
                    </div>`;
                }).join('') : '<p class="sin-datos">Sin datos de hoy</p>'}
            </div>
        </div>
    `;

    mostrarModal('Ranking del Día', content, [
        { text: 'Cerrar', class: 'btn-primary', onclick: 'cerrarModal()' }
    ]);
}

function obtenerRankingOperadoras() {
    const produccionHoy = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const hoy = new Date().toISOString().split('T')[0];
    const operadorasDB = JSON.parse(localStorage.getItem('operadoras_db') || '[]');

    const porOperadora = {};

    produccionHoy
        .filter(p => p.fecha?.startsWith(hoy) && p.tipo === 'captura')
        .forEach(p => {
            if (!porOperadora[p.operadoraId]) {
                const opDB = operadorasDB.find(o => o.id === p.operadoraId || o.id == p.operadoraId);
                porOperadora[p.operadoraId] = {
                    id: p.operadoraId,
                    nombre: p.operadoraNombre,
                    piezas: 0,
                    premioBase: opDB?.premioProduccion || getConfigIncentivosLocal().premioBaseDefault
                };
            }
            porOperadora[p.operadoraId].piezas += p.cantidad || 0;
        });

    return Object.values(porOperadora)
        .map(op => ({
            ...op,
            eficiencia: Math.round((op.piezas / 500) * 100) // Asumiendo meta de 500/día
        }))
        .sort((a, b) => b.piezas - a.piezas);
}

// ========================================
// MENSAJES DE COCO
// ========================================

function verificarMensajesCoco() {
    if (!authState.operadoraActual?.id) return;

    const mensajes = JSON.parse(localStorage.getItem('mensajes_operadoras') || '[]');
    const miId = authState.operadoraActual.id;

    // Filtrar mensajes no leídos para mí
    const misMensajes = mensajes.filter(m => {
        const esParaMi = m.destinatarioId === miId || m.destinatarioId === 'todos' || m.destinatarioId == miId;
        const leidoPor = m.leidoPor || [];
        const yaLeido = leidoPor.includes(miId) || leidoPor.includes(String(miId));
        return esParaMi && !yaLeido;
    });

    DEBUG_MODE && console.log('[OPERADORA] Mensajes pendientes:', misMensajes.length);

    if (misMensajes.length > 0) {
        // Solo mostrar si no hay overlay ya visible
        const overlay = document.getElementById('mensajeCocoOverlay');
        if (overlay && overlay.style.display !== 'flex') {
            mostrarNotificacionMensaje(misMensajes[0]);
        }
    }
}

function mostrarNotificacionMensaje(mensaje) {
    const overlay = document.getElementById('mensajeCocoOverlay');
    const body = document.getElementById('mensajeCocoBody');

    if (body) body.innerHTML = mensaje.texto;
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.dataset.mensajeId = mensaje.id;
    }

    if (typeof reproducirSonido === 'function') reproducirSonido('notificacion');
}

function cerrarMensajeCoco() {
    const overlay = document.getElementById('mensajeCocoOverlay');
    const mensajeId = parseInt(overlay?.dataset.mensajeId);

    if (mensajeId) {
        marcarMensajeLeido(mensajeId);
    }

    if (overlay) overlay.style.display = 'none';
}

function marcarMensajeLeido(mensajeId) {
    const mensajes = JSON.parse(localStorage.getItem('mensajes_operadoras') || '[]');
    // Buscar con comparación flexible (== en vez de ===)
    const mensaje = mensajes.find(m => m.id == mensajeId);
    if (mensaje && authState.operadoraActual?.id) {
        mensaje.leidoPor = mensaje.leidoPor || [];
        const miId = authState.operadoraActual.id;
        // Agregar como número y string para evitar problemas de tipo
        if (!mensaje.leidoPor.includes(miId) && !mensaje.leidoPor.includes(String(miId))) {
            mensaje.leidoPor.push(miId);
            DEBUG_MODE && console.log('[OPERADORA] Mensaje', mensajeId, 'marcado como leído por', miId);
        }
        localStorage.setItem('mensajes_operadoras', JSON.stringify(mensajes));
    }
}

// ========================================
// SISTEMA DE SONIDOS
// ========================================

function toggleSonidos() {
    const habilitados = localStorage.getItem('sonidos_habilitados') !== 'false';
    localStorage.setItem('sonidos_habilitados', !habilitados);

    const btn = document.getElementById('btnSonidos');
    if (btn) {
        btn.innerHTML = habilitados ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
    }

    mostrarToast(habilitados ? 'Sonidos desactivados' : 'Sonidos activados', 'info');
}

// ========================================
// SISTEMA DE TUTORIAL INTERACTIVO
// ========================================

const TUTORIAL_PASOS = [
    {
        elemento: '#temporizadorProceso',
        titulo: '¡Bienvenida al Panel!',
        texto: 'Este es tu panel de trabajo. Aquí controlarás tu jornada.',
        posicion: 'bottom'
    },
    {
        elemento: '#btnIniciar',
        titulo: 'Iniciar tu proceso',
        texto: 'Presiona INICIAR cuando comiences a trabajar. El tiempo empezará a contar.',
        posicion: 'bottom'
    },
    {
        elemento: '#progressCircle',
        titulo: 'Tu progreso',
        texto: 'Aquí verás cuántas piezas llevas vs tu meta del día.',
        posicion: 'top'
    },
    {
        elemento: '.cantidad-input-container',
        titulo: 'Capturar piezas',
        texto: 'Usa los botones + y - o los botones rápidos para ingresar las piezas que produces.',
        posicion: 'top'
    },
    {
        elemento: '.btn-capturar',
        titulo: 'Registrar',
        texto: 'Presiona este botón para guardar tu producción. ¡No olvides registrar cada hora!',
        posicion: 'top'
    },
    {
        elemento: '#btnPausar',
        titulo: 'Hacer pausa',
        texto: 'Si necesitas pausar (baño, comida, etc.), presiona PAUSAR y selecciona el motivo.',
        posicion: 'bottom',
        mostrarCuando: () => operadoraState.procesoIniciado
    },
    {
        elemento: '.problemas-grid',
        titulo: 'Reportar problemas',
        texto: 'Si tienes un problema (sin material, máquina, etc.), repórtalo aquí y Coco será notificada.',
        posicion: 'left'
    },
    {
        elemento: '.resumen-dia',
        titulo: 'Tu resumen',
        texto: 'Aquí verás tus estadísticas del día: piezas, tiempo y eficiencia.',
        posicion: 'left'
    },
    {
        elemento: '.header-right',
        titulo: '¡Listo!',
        texto: 'Usa estos botones para ver tu historial, ranking, y llamar a Coco si necesitas ayuda.',
        posicion: 'bottom'
    }
];

let tutorialActivo = false;
let pasoActualTutorial = 0;

function verificarPrimerUso() {
    const yaVioTutorial = localStorage.getItem(`tutorial_visto_${authState.operadoraActual?.id}`);
    if (!yaVioTutorial) {
        setTimeout(() => {
            iniciarTutorial();
        }, 1000);
    }
}

function iniciarTutorial() {
    tutorialActivo = true;
    pasoActualTutorial = 0;

    // Crear overlay del tutorial si no existe
    if (!document.getElementById('tutorialOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'tutorialOverlay';
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML = `
            <div class="tutorial-spotlight" id="tutorialSpotlight"></div>
            <div class="tutorial-tooltip" id="tutorialTooltip">
                <div class="tutorial-tooltip-header">
                    <span class="tutorial-paso" id="tutorialPasoIndicador">1/9</span>
                    <button class="tutorial-saltar" onclick="saltarTutorial()">Saltar</button>
                </div>
                <h4 id="tutorialTitulo"></h4>
                <p id="tutorialTexto"></p>
                <div class="tutorial-tooltip-footer">
                    <button class="btn-tutorial btn-anterior" onclick="pasoAnteriorTutorial()" id="btnTutorialAnterior">
                        <i class="fas fa-chevron-left"></i> Anterior
                    </button>
                    <button class="btn-tutorial btn-siguiente" onclick="pasoSiguienteTutorial()" id="btnTutorialSiguiente">
                        Siguiente <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    document.getElementById('tutorialOverlay').style.display = 'block';
    mostrarPasoTutorial(0);
}

function mostrarPasoTutorial(indice) {
    const pasosVisibles = TUTORIAL_PASOS.filter(p => !p.mostrarCuando || p.mostrarCuando());

    if (indice < 0 || indice >= pasosVisibles.length) return;

    pasoActualTutorial = indice;
    const paso = pasosVisibles[indice];

    // Actualizar indicador
    document.getElementById('tutorialPasoIndicador').textContent = `${indice + 1}/${pasosVisibles.length}`;
    document.getElementById('tutorialTitulo').textContent = paso.titulo;
    document.getElementById('tutorialTexto').textContent = paso.texto;

    // Botones anterior/siguiente
    document.getElementById('btnTutorialAnterior').style.visibility = indice === 0 ? 'hidden' : 'visible';
    document.getElementById('btnTutorialSiguiente').textContent = indice === pasosVisibles.length - 1 ? 'Finalizar' : 'Siguiente';
    if (indice < pasosVisibles.length - 1) {
        document.getElementById('btnTutorialSiguiente').innerHTML = 'Siguiente <i class="fas fa-chevron-right"></i>';
    } else {
        document.getElementById('btnTutorialSiguiente').innerHTML = '<i class="fas fa-check"></i> Finalizar';
    }

    // Posicionar spotlight y tooltip
    const elemento = document.querySelector(paso.elemento);
    const spotlight = document.getElementById('tutorialSpotlight');
    const tooltip = document.getElementById('tutorialTooltip');

    if (elemento) {
        const rect = elemento.getBoundingClientRect();
        const padding = 10;

        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';

        // Posicionar tooltip según la posición indicada
        tooltip.className = 'tutorial-tooltip ' + paso.posicion;

        switch(paso.posicion) {
            case 'bottom':
                tooltip.style.top = (rect.bottom + 20) + 'px';
                tooltip.style.left = Math.max(20, Math.min(window.innerWidth - 340, rect.left)) + 'px';
                break;
            case 'top':
                tooltip.style.top = (rect.top - tooltip.offsetHeight - 20) + 'px';
                tooltip.style.left = Math.max(20, Math.min(window.innerWidth - 340, rect.left)) + 'px';
                break;
            case 'left':
                tooltip.style.top = rect.top + 'px';
                tooltip.style.left = Math.max(20, rect.left - 340) + 'px';
                break;
            case 'right':
                tooltip.style.top = rect.top + 'px';
                tooltip.style.left = (rect.right + 20) + 'px';
                break;
        }

        // Asegurar que el tooltip esté visible
        setTimeout(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.bottom > window.innerHeight) {
                tooltip.style.top = (window.innerHeight - tooltipRect.height - 20) + 'px';
            }
            if (tooltipRect.top < 0) {
                tooltip.style.top = '20px';
            }
        }, 50);
    }
}

function pasoSiguienteTutorial() {
    const pasosVisibles = TUTORIAL_PASOS.filter(p => !p.mostrarCuando || p.mostrarCuando());

    if (pasoActualTutorial < pasosVisibles.length - 1) {
        mostrarPasoTutorial(pasoActualTutorial + 1);
    } else {
        finalizarTutorial();
    }
}

function pasoAnteriorTutorial() {
    if (pasoActualTutorial > 0) {
        mostrarPasoTutorial(pasoActualTutorial - 1);
    }
}

function saltarTutorial() {
    finalizarTutorial();
}

function finalizarTutorial() {
    tutorialActivo = false;
    document.getElementById('tutorialOverlay').style.display = 'none';

    // Marcar como visto
    localStorage.setItem(`tutorial_visto_${authState.operadoraActual?.id}`, 'true');

    mostrarToast('¡Tutorial completado! Ya puedes comenzar.', 'success');
}

function reiniciarTutorial() {
    localStorage.removeItem(`tutorial_visto_${authState.operadoraActual?.id}`);
    iniciarTutorial();
}

// ========================================
// SISTEMA DE MOTIVACIÓN
// ========================================

const FRASES_MOTIVACION = [
    { texto: "¡Cada pieza cuenta! Sigue así.", icono: "fa-star" },
    { texto: "Eres parte importante del equipo.", icono: "fa-users" },
    { texto: "Tu esfuerzo se nota. ¡Excelente trabajo!", icono: "fa-thumbs-up" },
    { texto: "Un paso a la vez, vas muy bien.", icono: "fa-shoe-prints" },
    { texto: "¡Hoy es un gran día para brillar!", icono: "fa-sun" },
    { texto: "Tu dedicación hace la diferencia.", icono: "fa-heart" },
    { texto: "¡Vas por buen camino!", icono: "fa-road" },
    { texto: "Cada esfuerzo suma al éxito.", icono: "fa-trophy" },
    { texto: "¡Tú puedes con todo!", icono: "fa-fist-raised" },
    { texto: "El trabajo en equipo hace maravillas.", icono: "fa-hands-helping" }
];

const BADGES = [
    { id: 'primera_captura', nombre: 'Primera Captura', icono: 'fa-seedling', color: '#10b981', descripcion: 'Registraste tu primera pieza', condicion: (stats) => stats.totalPiezas >= 1 },
    { id: 'racha_3', nombre: 'Racha de 3 días', icono: 'fa-fire', color: '#f59e0b', descripcion: '3 días consecutivos trabajando', condicion: (stats) => stats.racha >= 3 },
    { id: 'racha_7', nombre: 'Semana completa', icono: 'fa-fire-alt', color: '#ef4444', descripcion: '7 días consecutivos trabajando', condicion: (stats) => stats.racha >= 7 },
    { id: 'meta_cumplida', nombre: 'Meta del día', icono: 'fa-bullseye', color: '#667eea', descripcion: 'Cumpliste la meta diaria', condicion: (stats) => stats.metaCumplida },
    { id: 'super_eficiente', nombre: 'Super eficiente', icono: 'fa-bolt', color: '#8b5cf6', descripcion: 'Eficiencia mayor al 110%', condicion: (stats) => stats.eficiencia >= 110 },
    { id: 'madrugadora', nombre: 'Madrugadora', icono: 'fa-sun', color: '#f59e0b', descripcion: 'Empezaste antes de las 7am', condicion: (stats) => stats.inicioTemprano },
    { id: 'cero_pausas', nombre: 'Enfocada', icono: 'fa-eye', color: '#3b82f6', descripcion: 'Día sin pausas largas', condicion: (stats) => stats.sinPausasLargas },
    { id: 'produccion_100', nombre: 'Centenar', icono: 'fa-cubes', color: '#10b981', descripcion: 'Produjiste 100+ piezas en un día', condicion: (stats) => stats.piezasDia >= 100 },
    { id: 'produccion_500', nombre: 'Quinientos', icono: 'fa-boxes', color: '#ec4899', descripcion: 'Produjiste 500+ piezas en un día', condicion: (stats) => stats.piezasDia >= 500 },
    { id: 'veterana', nombre: 'Veterana', icono: 'fa-medal', color: '#fbbf24', descripcion: '30 días de racha', condicion: (stats) => stats.racha >= 30 }
];

function obtenerEstadisticasMotivacion() {
    const operadoraId = authState.operadoraActual?.id;
    const hoy = new Date().toISOString().split('T')[0];

    // Obtener badges ganados
    const badgesGanados = JSON.parse(localStorage.getItem(`badges_${operadoraId}`) || '[]');

    // Calcular racha
    const racha = calcularRacha();

    // Stats del día
    const piezasDia = operadoraState.piezasCapturadas;
    const metaCumplida = piezasDia >= operadoraState.piezasMeta;
    const eficiencia = calcularEficiencia();

    // Verificar inicio temprano
    const inicioTemprano = authState.inicioTurno && authState.inicioTurno.getHours() < 7;

    // Verificar pausas
    const sinPausasLargas = operadoraState.historialPausas.filter(p =>
        p.duracion && p.duracion > 30 * 60000 // más de 30 minutos
    ).length === 0;

    return {
        totalPiezas: piezasDia,
        piezasDia: piezasDia,
        racha: racha,
        metaCumplida: metaCumplida,
        eficiencia: eficiencia,
        inicioTemprano: inicioTemprano,
        sinPausasLargas: sinPausasLargas,
        badgesGanados: badgesGanados
    };
}

function calcularRacha() {
    const operadoraId = authState.operadoraActual?.id;
    const turnos = JSON.parse(localStorage.getItem('historial_turnos') || '[]');
    const misTurnos = turnos.filter(t => t.operadoraId === operadoraId);

    if (misTurnos.length === 0) return 0;

    let racha = 0;
    let fechaAnterior = new Date();
    fechaAnterior.setHours(0, 0, 0, 0);

    // Ordenar por fecha descendente
    const turnosOrdenados = misTurnos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    for (const turno of turnosOrdenados) {
        const fechaTurno = new Date(turno.fecha);
        fechaTurno.setHours(0, 0, 0, 0);

        const diffDias = Math.round((fechaAnterior - fechaTurno) / (1000 * 60 * 60 * 24));

        if (diffDias <= 1) {
            racha++;
            fechaAnterior = fechaTurno;
        } else {
            break;
        }
    }

    return racha;
}

function verificarNuevosBadges() {
    const stats = obtenerEstadisticasMotivacion();
    const operadoraId = authState.operadoraActual?.id;
    const badgesGanados = JSON.parse(localStorage.getItem(`badges_${operadoraId}`) || '[]');

    let nuevosBadges = [];

    BADGES.forEach(badge => {
        if (!badgesGanados.includes(badge.id) && badge.condicion(stats)) {
            badgesGanados.push(badge.id);
            nuevosBadges.push(badge);
        }
    });

    if (nuevosBadges.length > 0) {
        localStorage.setItem(`badges_${operadoraId}`, JSON.stringify(badgesGanados));

        // Mostrar animación de nuevo badge
        nuevosBadges.forEach((badge, index) => {
            setTimeout(() => {
                mostrarNuevoBadge(badge);
            }, index * 2000);
        });
    }
}

function mostrarNuevoBadge(badge) {
    const overlay = document.createElement('div');
    overlay.className = 'badge-notificacion-overlay';
    overlay.innerHTML = `
        <div class="badge-notificacion">
            <div class="badge-notif-icono" style="background: ${badge.color}">
                <i class="fas ${badge.icono}"></i>
            </div>
            <h3>¡Nuevo logro!</h3>
            <h4>${badge.nombre}</h4>
            <p>${badge.descripcion}</p>
            <button onclick="this.closest('.badge-notificacion-overlay').remove()">
                <i class="fas fa-check"></i> ¡Genial!
            </button>
        </div>
    `;
    document.body.appendChild(overlay);

    if (typeof reproducirSonido === 'function') reproducirSonido('meta');

    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.remove();
        }
    }, 5000);
}

function mostrarPanelMotivacion() {
    const stats = obtenerEstadisticasMotivacion();
    const fraseRandom = FRASES_MOTIVACION[Math.floor(Math.random() * FRASES_MOTIVACION.length)];

    const badgesGanadosIds = stats.badgesGanados || [];

    const content = `
        <div class="motivacion-panel">
            <!-- Frase motivacional -->
            <div class="frase-motivacional">
                <i class="fas ${fraseRandom.icono}"></i>
                <p>"${fraseRandom.texto}"</p>
            </div>

            <!-- Racha actual -->
            <div class="racha-section">
                <div class="racha-icono ${stats.racha >= 3 ? 'activa' : ''}">
                    <i class="fas fa-fire"></i>
                </div>
                <div class="racha-info">
                    <span class="racha-numero">${stats.racha}</span>
                    <span class="racha-texto">días de racha</span>
                </div>
                <div class="racha-progreso">
                    ${[1,2,3,4,5,6,7].map(d => `
                        <div class="racha-dia ${d <= stats.racha ? 'completado' : ''}">${d <= stats.racha ? '🔥' : '○'}</div>
                    `).join('')}
                </div>
            </div>

            <!-- Badges -->
            <div class="badges-section">
                <h4><i class="fas fa-trophy"></i> Mis Logros</h4>
                <div class="badges-grid">
                    ${BADGES.map(badge => {
                        const ganado = badgesGanadosIds.includes(badge.id);
                        return `
                            <div class="badge-item ${ganado ? 'ganado' : 'bloqueado'}"
                                 style="${ganado ? '--badge-color: ' + badge.color : ''}"
                                 title="${badge.descripcion}">
                                <div class="badge-icono">
                                    <i class="fas ${badge.icono}"></i>
                                </div>
                                <span class="badge-nombre">${badge.nombre}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Stats rápidos -->
            <div class="motivacion-stats">
                <div class="stat-mini">
                    <span class="stat-valor">${stats.piezasDia}</span>
                    <span class="stat-label">piezas hoy</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-valor">${stats.eficiencia}%</span>
                    <span class="stat-label">eficiencia</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-valor">${badgesGanadosIds.length}/${BADGES.length}</span>
                    <span class="stat-label">logros</span>
                </div>
            </div>
        </div>
    `;

    mostrarModal('Tu Motivación', content, [
        { text: 'Ver Tutorial', class: 'btn-secondary', onclick: 'cerrarModal(); reiniciarTutorial()' },
        { text: 'Cerrar', class: 'btn-primary', onclick: 'cerrarModal()' }
    ]);
}

// ========================================
// FUNCIONES DE FEEDBACK EN TIEMPO REAL
// ========================================

/**
 * Calcula la eficiencia actual basada en piezas producidas vs tiempo trabajado
 */
function calcularEficienciaActual() {
    if (!operadoraState.procesoIniciado || !operadoraState.tiempoProcesoInicio) {
        return 0;
    }

    // Calcular tiempo trabajado efectivo (sin pausas que detienen tiempo)
    let tiempoTrabajadoMs = operadoraState.tiempoProcesoAcumulado;

    if (!operadoraState.procesoEnPausa || (operadoraState.motivoPausaActual && !operadoraState.motivoPausaActual.detieneTiempo)) {
        tiempoTrabajadoMs += (new Date() - operadoraState.tiempoProcesoInicio);
    }

    const minutosTrabajados = tiempoTrabajadoMs / 60000;

    if (minutosTrabajados < 1) {
        return 0; // No evaluar si no ha pasado al menos 1 minuto
    }

    // Piezas esperadas según meta por minuto
    const piezasEsperadas = minutosTrabajados * operadoraState.metaPorMinuto;

    if (piezasEsperadas === 0) return 0;

    // Eficiencia = (piezas reales / piezas esperadas) * 100
    const eficiencia = (operadoraState.piezasCapturadas / piezasEsperadas) * 100;

    return Math.round(eficiencia);
}

/**
 * Evalúa el nivel de desempeño basado en la eficiencia
 */
function evaluarDesempeno() {
    const eficiencia = calcularEficienciaActual();

    // Encontrar el nivel correspondiente
    for (const nivel of NIVELES_DESEMPENO) {
        if (eficiencia >= nivel.min) {
            return {
                nivel: nivel,
                eficiencia: eficiencia
            };
        }
    }

    // Por defecto, retornar el nivel más bajo
    return {
        nivel: NIVELES_DESEMPENO[NIVELES_DESEMPENO.length - 1],
        eficiencia: eficiencia
    };
}

/**
 * Inicia el monitoreo de desempeño
 */
function iniciarMonitoreoDesempeno() {
    // Mostrar el indicador
    const indicador = document.getElementById('indicadorDesempeno');
    if (indicador) indicador.style.display = 'block';

    // Limpiar intervalo anterior si existe
    if (feedbackState.intervaloMonitoreo) {
        clearInterval(feedbackState.intervaloMonitoreo);
    }

    // Actualizar cada 30 segundos
    feedbackState.intervaloMonitoreo = setInterval(() => {
        actualizarIndicadorDesempeno();
        actualizarPremioWidget();
    }, 30000);

    // Primera actualización inmediata
    setTimeout(() => {
        actualizarIndicadorDesempeno();
        actualizarPremioWidget();
    }, 2000);
}

/**
 * Detiene el monitoreo de desempeño
 */
function detenerMonitoreoDesempeno() {
    if (feedbackState.intervaloMonitoreo) {
        clearInterval(feedbackState.intervaloMonitoreo);
        feedbackState.intervaloMonitoreo = null;
    }

    // Ocultar el indicador
    const indicador = document.getElementById('indicadorDesempeno');
    if (indicador) indicador.style.display = 'none';

    // Resetear widget de premio
    resetearPremioWidget();
}

/**
 * Actualiza el indicador visual de desempeño
 */
function actualizarIndicadorDesempeno() {
    const evaluacion = evaluarDesempeno();
    const { nivel, eficiencia } = evaluacion;

    // Actualizar nivel mostrado
    const nivelEl = document.getElementById('desempenoNivel');
    if (nivelEl) {
        nivelEl.innerHTML = `<i class="fas ${nivel.icono}"></i> ${nivel.nombre}`;
        nivelEl.className = `desempeno-nivel ${nivel.id}`;
    }

    // Actualizar barra de progreso
    const barraFill = document.getElementById('desempenoBarraFill');
    const marcador = document.getElementById('desempenoMarcador');
    const valorEl = document.getElementById('desempenoValor');

    if (barraFill && marcador && valorEl) {
        // Calcular posición del marcador (0-100% del ancho, con cap en 130%)
        const posicion = Math.min(130, Math.max(0, eficiencia));
        const posicionPorcentaje = (posicion / 130) * 100;

        marcador.style.left = `${posicionPorcentaje}%`;
        valorEl.textContent = `${eficiencia}%`;

        // La barra de "falta" va desde el marcador hasta el final
        const fillWidth = 100 - posicionPorcentaje;
        barraFill.style.width = `${fillWidth}%`;
    }

    // Actualizar mensaje motivacional (enriquecido con premio)
    const mensajeEl = document.getElementById('desempenoMensaje');
    if (mensajeEl) {
        const mensajes = MENSAJES_FEEDBACK[nivel.id];
        let mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

        // Enriquecer mensaje con contexto económico
        const tierPremio = calcularTierLocal(eficiencia);
        if (tierPremio && incentivosState.premioEstimado > 0) {
            mensaje += ` | <strong>${tierPremio.nombre}</strong> · $${incentivosState.premioEstimado}`;
        }

        mensajeEl.innerHTML = `<i class="fas fa-lightbulb"></i><span>${mensaje}</span>`;
        mensajeEl.className = `desempeno-mensaje ${nivel.id}`;
    }

    // Verificar si cambió el nivel para mostrar feedback
    if (feedbackState.nivelActual !== nivel.id) {
        // Solo mostrar toast si no es la primera evaluación
        if (feedbackState.nivelActual !== null) {
            mostrarFeedbackToast(nivel, eficiencia);
        }
        feedbackState.nivelActual = nivel.id;
    }

    feedbackState.ultimaEvaluacion = new Date();
}

/**
 * Muestra un toast de feedback motivacional
 */
function mostrarFeedbackToast(nivel, eficiencia) {
    const container = document.getElementById('feedbackContainer');
    if (!container) return;

    // No mostrar mensajes muy seguidos (mínimo 2 minutos entre toasts)
    if (feedbackState.ultimoMensaje) {
        const tiempoDesdeUltimo = new Date() - feedbackState.ultimoMensaje;
        if (tiempoDesdeUltimo < 120000) return;
    }

    const mensajes = MENSAJES_FEEDBACK[nivel.id];
    const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

    // Enriquecer con contexto de premio
    const tierPremioToast = calcularTierLocal(eficiencia);
    const premioToast = tierPremioToast ? '$' + Math.round(getPremioBase() * tierPremioToast.multiplicador) : '';

    const toast = document.createElement('div');
    toast.className = `feedback-toast ${nivel.id}`;
    toast.innerHTML = `
        <div class="feedback-toast-icon">
            <i class="fas ${nivel.icono}"></i>
        </div>
        <div class="feedback-toast-content">
            <div class="feedback-toast-nivel">${nivel.emoji} ${nivel.nombre}${premioToast ? ' — ' + premioToast : ''}</div>
            <div class="feedback-toast-mensaje">${mensaje}</div>
        </div>
    `;

    container.appendChild(toast);

    // Reproducir sonido según nivel
    if (typeof reproducirSonido === 'function') {
        if (nivel.id === 'excelente' || nivel.id === 'muy_bien') {
            reproducirSonido('meta');
        } else if (nivel.id === 'critico' || nivel.id === 'bajo') {
            reproducirSonido('notificacion');
        }
    }

    feedbackState.ultimoMensaje = new Date();

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Verifica y muestra logros especiales
 */
function verificarLogros(piezasAntes, piezasDespues) {
    const meta = operadoraState.piezasMeta;
    const logrosDelDia = feedbackState.logrosDelDia || [];

    // Primera decena
    if (piezasAntes < 10 && piezasDespues >= 10 && !logrosDelDia.includes('primera_10')) {
        mostrarLogroCelebracion(MENSAJES_LOGROS.primera_10);
        feedbackState.logrosDelDia.push('primera_10');
    }

    // 50 piezas
    if (piezasAntes < 50 && piezasDespues >= 50 && !logrosDelDia.includes('primera_50')) {
        mostrarLogroCelebracion(MENSAJES_LOGROS.primera_50);
        feedbackState.logrosDelDia.push('primera_50');
    }

    // 100 piezas
    if (piezasAntes < 100 && piezasDespues >= 100 && !logrosDelDia.includes('primera_100')) {
        mostrarLogroCelebracion(MENSAJES_LOGROS.primera_100);
        feedbackState.logrosDelDia.push('primera_100');
    }

    // 50% de la meta
    if (meta > 0) {
        const porcentajeAntes = (piezasAntes / meta) * 100;
        const porcentajeDespues = (piezasDespues / meta) * 100;

        if (porcentajeAntes < 50 && porcentajeDespues >= 50 && !logrosDelDia.includes('meta_50')) {
            mostrarLogroCelebracion(MENSAJES_LOGROS.meta_50);
            feedbackState.logrosDelDia.push('meta_50');
        }

        // 75% de la meta
        if (porcentajeAntes < 75 && porcentajeDespues >= 75 && !logrosDelDia.includes('meta_75')) {
            mostrarLogroCelebracion(MENSAJES_LOGROS.meta_75);
            feedbackState.logrosDelDia.push('meta_75');
        }

        // Meta cumplida
        if (porcentajeAntes < 100 && porcentajeDespues >= 100 && !logrosDelDia.includes('meta_cumplida')) {
            mostrarLogroCelebracion(MENSAJES_LOGROS.meta_cumplida);
            feedbackState.logrosDelDia.push('meta_cumplida');
        }

        // Super meta (120%+)
        if (porcentajeAntes < 120 && porcentajeDespues >= 120 && !logrosDelDia.includes('super_meta')) {
            mostrarLogroCelebracion(MENSAJES_LOGROS.super_meta);
            feedbackState.logrosDelDia.push('super_meta');
        }
    }

    // Verificar rachas de capturas consecutivas
    feedbackState.capturasConsecutivas++;

    if (feedbackState.capturasConsecutivas === 5 && !logrosDelDia.includes('racha_5')) {
        mostrarLogroCelebracion(MENSAJES_LOGROS.racha_5);
        feedbackState.logrosDelDia.push('racha_5');
    }

    if (feedbackState.capturasConsecutivas === 10 && !logrosDelDia.includes('racha_10')) {
        mostrarLogroCelebracion(MENSAJES_LOGROS.racha_10);
        feedbackState.logrosDelDia.push('racha_10');
    }

    feedbackState.ultimaCapturaTimestamp = new Date();
}

/**
 * Muestra la celebración de un logro
 */
function mostrarLogroCelebracion(logro) {
    const celebracion = document.getElementById('logroCelebracion');
    const icono = document.getElementById('logroIcono');
    const titulo = document.getElementById('logroTitulo');
    const mensaje = document.getElementById('logroMensaje');

    if (!celebracion || !icono || !titulo || !mensaje) return;

    icono.innerHTML = `<i class="fas ${logro.icono}"></i>`;
    titulo.textContent = logro.titulo;
    mensaje.textContent = logro.mensaje;

    celebracion.style.display = 'flex';

    // Crear confetti
    crearConfetti();

    // Reproducir sonido
    if (typeof reproducirSonido === 'function') {
        reproducirSonido('meta');
    }

    // Auto-cerrar después de 4 segundos
    setTimeout(() => {
        cerrarLogroCelebracion();
    }, 4000);
}

/**
 * Cierra la celebración de logro
 */
function cerrarLogroCelebracion() {
    const celebracion = document.getElementById('logroCelebracion');
    if (celebracion) celebracion.style.display = 'none';

    // Limpiar confetti
    const confettiContainer = document.getElementById('confettiContainer');
    if (confettiContainer) confettiContainer.innerHTML = '';
}

/**
 * Crea el efecto de confetti
 */
function crearConfetti() {
    const container = document.getElementById('confettiContainer');
    if (!container) return;

    const colores = ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const numConfetti = 50;

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        confetti.style.animationDelay = `${Math.random() * 0.5}s`;
        confetti.style.animationDuration = `${2 + Math.random() * 2}s`;

        // Variar tamaño
        const size = 6 + Math.random() * 8;
        confetti.style.width = `${size}px`;
        confetti.style.height = `${size}px`;

        container.appendChild(confetti);
    }
}

/**
 * Muestra micro-feedback visual al capturar piezas
 */
function mostrarMicroFeedbackCaptura(cantidad) {
    const feedback = document.getElementById('microFeedback');
    const texto = document.getElementById('microFeedbackText');

    if (!feedback || !texto) return;

    texto.textContent = `+${cantidad}`;

    // Resetear animación
    feedback.style.display = 'none';
    feedback.offsetHeight; // Trigger reflow
    feedback.style.display = 'flex';

    // Ocultar después de la animación
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 600);
}

/**
 * Resetea el estado del feedback para nuevo día/turno
 */
function resetearFeedbackState() {
    feedbackState.nivelActual = null;
    feedbackState.ultimaEvaluacion = null;
    feedbackState.ultimoMensaje = null;
    feedbackState.rachaPositiva = 0;
    feedbackState.logrosDelDia = [];
    feedbackState.capturasConsecutivas = 0;
    feedbackState.ultimaCapturaTimestamp = null;

    if (feedbackState.intervaloMonitoreo) {
        clearInterval(feedbackState.intervaloMonitoreo);
        feedbackState.intervaloMonitoreo = null;
    }
}

// ========================================
// DETALLES EXPANDIBLES DE PROCESOS
// ========================================

/**
 * Toggle para mostrar/ocultar detalles de un proceso
 */
function toggleDetallesProceso(procesoId) {
    const detalles = document.getElementById(`detalles-${procesoId}`);
    const btn = document.querySelector(`[data-proceso-id="${procesoId}"] .btn-expandir-proceso i`);

    if (!detalles) return;

    const estaVisible = detalles.style.display !== 'none';

    // Cerrar todos los demás detalles abiertos
    document.querySelectorAll('.proceso-detalles').forEach(el => {
        if (el.id !== `detalles-${procesoId}`) {
            el.style.display = 'none';
        }
    });

    // Resetear todos los iconos
    document.querySelectorAll('.btn-expandir-proceso i').forEach(icon => {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    });

    // Toggle el seleccionado
    if (estaVisible) {
        detalles.style.display = 'none';
        if (btn) {
            btn.classList.remove('fa-chevron-up');
            btn.classList.add('fa-chevron-down');
        }
    } else {
        detalles.style.display = 'block';
        if (btn) {
            btn.classList.remove('fa-chevron-down');
            btn.classList.add('fa-chevron-up');
        }
    }
}

/**
 * Obtiene información detallada del pedido para un proceso
 */
function obtenerInfoPedidoProceso(asignacion) {
    // Intentar obtener información del pedido desde varias fuentes
    const pedidoActual = operadoraState.pedidoActual;
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');

    // Si tenemos pedido en el state
    if (pedidoActual) {
        return {
            pedidoId: pedidoActual.id || pedidoActual.codigo || 'N/A',
            cliente: pedidoActual.cliente || pedidoActual.clienteNombre || 'Cliente',
            producto: pedidoActual.producto || pedidoActual.productoNombre || 'Producto',
            cantidad: pedidoActual.cantidad || pedidoActual.meta || 'N/A',
            notas: pedidoActual.observaciones || pedidoActual.notas || ''
        };
    }

    // Si tenemos asignación con pedidoId, buscar en pedidos ERP
    if (asignacion && asignacion.pedidoId) {
        const pedidoERP = pedidosERP.find(p => p.id == asignacion.pedidoId);
        if (pedidoERP) {
            return {
                pedidoId: pedidoERP.codigo || pedidoERP.id || 'N/A',
                cliente: pedidoERP.cliente || 'Cliente',
                producto: pedidoERP.producto || 'Producto',
                cantidad: pedidoERP.cantidad || 'N/A',
                notas: pedidoERP.observaciones || ''
            };
        }
    }

    // Fallback con datos de la asignación
    return {
        pedidoId: asignacion?.pedidoId || asignacion?.pedidoCodigo || 'N/A',
        cliente: asignacion?.clienteNombre || 'Cliente',
        producto: asignacion?.productoNombre || 'Producto',
        cantidad: asignacion?.cantidad || asignacion?.meta || 'N/A',
        notas: ''
    };
}

// ========================================
// SISTEMA MULTI-PEDIDOS PARA CALIDAD/EMPAQUE
// ========================================

/**
 * Inicializa el modo multi-pedido si es estación de calidad/empaque
 */
function initModoMultiPedido() {
    if (!esEstacionCalidadEmpaque()) {
        DEBUG_MODE && console.log('[OPERADORA] No es estación de Calidad/Empaque, usando modo normal');
        return false;
    }

    DEBUG_MODE && console.log('[OPERADORA] Inicializando modo Multi-Pedido para Calidad/Empaque');
    operadoraState.modoMultiPedido = true;

    // Cambiar el panel-main de grid a flex para modo multi-pedido
    const panelMain = document.querySelector('.panel-main');
    if (panelMain) {
        panelMain.style.display = 'flex';
        panelMain.style.flexDirection = 'row';
        panelMain.style.gap = '20px';
    }

    // Ocultar columna de pedido individual
    const colPedido = document.querySelector('.col-pedido');
    if (colPedido) colPedido.style.display = 'none';

    // Ocultar columna de captura de piezas
    const colCaptura = document.querySelector('.col-captura');
    if (colCaptura) colCaptura.style.display = 'none';

    // Mostrar columna de multi-pedidos - 2/3 de la pantalla
    const colMulti = document.getElementById('colMultiPedidos');
    if (colMulti) {
        colMulti.style.display = 'flex';
        colMulti.style.flex = '2';
        colMulti.style.flexDirection = 'column';
        colMulti.style.minWidth = '0';
        colMulti.style.order = '1'; // Primero a la izquierda
    }

    // Columna de reportes - 1/3 de la pantalla, lado derecho
    const colAcciones = document.querySelector('.col-acciones');
    if (colAcciones) {
        colAcciones.style.flex = '1';
        colAcciones.style.minWidth = '280px';
        colAcciones.style.maxWidth = '350px';
        colAcciones.style.order = '2'; // Segundo a la derecha
    }

    // Cargar lista de operadores disponibles
    cargarListaOperadores();

    // Cargar pedidos asignados
    cargarPedidosMultiples();

    // Verificar nuevos pedidos cada 5 segundos
    setInterval(verificarNuevosPedidosMulti, 5000);

    return true;
}

/**
 * Carga los pedidos asignados a esta estación de calidad/empaque
 * Lee desde 'asignaciones_multi_pedido' y también de 'asignaciones_estaciones'
 */
function cargarPedidosMultiples() {
    let misPedidos = [];

    // 1. Buscar en asignaciones_multi_pedido (automáticas de supervisora)
    const asignacionesMulti = JSON.parse(localStorage.getItem('asignaciones_multi_pedido') || '{}');
    let pedidosMulti = asignacionesMulti[CONFIG_ESTACION.id];

    if (!pedidosMulti) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const [estId, pedidos] of Object.entries(asignacionesMulti)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                pedidosMulti = pedidos;
                break;
            }
        }
    }

    if (Array.isArray(pedidosMulti)) {
        misPedidos = [...pedidosMulti];
    }

    // 2. También buscar en asignaciones_estaciones (asignación manual desde supervisora)
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    let miAsignacion = asignaciones[CONFIG_ESTACION.id];

    if (!miAsignacion) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const [estId, asignacion] of Object.entries(asignaciones)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                miAsignacion = asignacion;
                break;
            }
        }
    }

    // Si hay asignación manual, convertirla a formato multi-pedido
    if (miAsignacion && miAsignacion.pedidoId) {
        const yaExiste = misPedidos.some(p => p.pedidoId == miAsignacion.pedidoId);
        if (!yaExiste) {
            const pedidoConvertido = {
                id: `${miAsignacion.pedidoId}-manual`,
                pedidoId: miAsignacion.pedidoId,
                codigo: miAsignacion.pedidoCodigo || miAsignacion.pedidoId,
                cliente: miAsignacion.clienteNombre || miAsignacion.cliente || 'Cliente',
                producto: miAsignacion.productoNombre || miAsignacion.producto || 'Producto',
                imagen: miAsignacion.productoImagen || miAsignacion.imagen || '',
                procesoNombre: miAsignacion.procesoNombre || (esEstacionEmpaque() ? 'Empaque' : 'Calidad'),
                piezasCapturadas: miAsignacion.piezasProducidas || 0,
                piezasMeta: miAsignacion.piezasMeta || miAsignacion.meta || 100,
                procesoIniciado: false,
                procesoEnPausa: false,
                tiempoProcesoAcumulado: 0,
                prioridad: miAsignacion.prioridad || 'media',
                fechaAsignacion: miAsignacion.fechaAsignacion || new Date().toISOString()
            };
            misPedidos.push(pedidoConvertido);
            DEBUG_MODE && console.log('[OPERADORA] Pedido manual convertido:', pedidoConvertido);
        }
    }

    if (misPedidos.length === 0) {
        mostrarSinPedidosMulti();
        return;
    }

    // Cargar pedidos activos, fusionando con estado guardado localmente
    const estadoLocal = JSON.parse(localStorage.getItem('multi_pedidos_estado_local') || '{}');

    operadoraState.pedidosActivos = misPedidos.map(p => {
        // Verificar si hay estado local guardado para este pedido
        const estadoGuardado = estadoLocal[p.id] || {};

        // Restaurar operadores con sus timers
        let operadores = estadoGuardado.operadores || p.operadores || [];
        operadores = operadores.map(op => ({
            ...op,
            tiempoInicio: op.tiempoInicio ? new Date(op.tiempoInicio) : null,
            fechaSalida: op.fechaSalida ? new Date(op.fechaSalida) : null,
            intervalId: null // Reiniciar intervalos
        }));

        return {
            ...p,
            piezasCapturadas: estadoGuardado.piezasCapturadas ?? p.piezasCapturadas ?? 0,
            pausaGeneral: estadoGuardado.pausaGeneral ?? p.pausaGeneral ?? false,
            operadores: operadores
        };
    });

    DEBUG_MODE && console.log('[OPERADORA] Pedidos multi cargados:', operadoraState.pedidosActivos.length);
    renderizarTarjetasPedidos();
    actualizarContadorPedidos();
}

/**
 * Verifica si hay nuevos pedidos asignados desde supervisora
 * Lee desde 'asignaciones_multi_pedido' y 'asignaciones_estaciones'
 */
function verificarNuevosPedidosMulti() {
    if (!operadoraState.modoMultiPedido) return;

    let nuevosPedidos = [];
    const pedidosActualesIds = operadoraState.pedidosActivos.map(p => p.id);
    const pedidosActualesPedidoIds = operadoraState.pedidosActivos.map(p => p.pedidoId);

    // 1. Buscar en asignaciones_multi_pedido
    const asignacionesMulti = JSON.parse(localStorage.getItem('asignaciones_multi_pedido') || '{}');
    let misPedidosMulti = asignacionesMulti[CONFIG_ESTACION.id];

    if (!misPedidosMulti) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const [estId, pedidos] of Object.entries(asignacionesMulti)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                misPedidosMulti = pedidos;
                break;
            }
        }
    }

    if (Array.isArray(misPedidosMulti)) {
        misPedidosMulti.forEach(p => {
            if (!pedidosActualesIds.includes(p.id) && !pedidosActualesPedidoIds.includes(p.pedidoId)) {
                nuevosPedidos.push(p);
            }
        });
    }

    // 2. Buscar en asignaciones_estaciones (asignación manual)
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    let miAsignacion = asignaciones[CONFIG_ESTACION.id];

    if (!miAsignacion) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const [estId, asignacion] of Object.entries(asignaciones)) {
            const estIdNormalizado = estId.toLowerCase().replace(/[-_\s]/g, '');
            if (estIdNormalizado === miIdNormalizado ||
                estIdNormalizado.includes(miIdNormalizado) ||
                miIdNormalizado.includes(estIdNormalizado)) {
                miAsignacion = asignacion;
                break;
            }
        }
    }

    if (miAsignacion && miAsignacion.pedidoId && !pedidosActualesPedidoIds.includes(miAsignacion.pedidoId)) {
        const idManual = `${miAsignacion.pedidoId}-manual`;
        if (!pedidosActualesIds.includes(idManual)) {
            nuevosPedidos.push({
                id: idManual,
                pedidoId: miAsignacion.pedidoId,
                codigo: miAsignacion.pedidoCodigo || miAsignacion.pedidoId,
                cliente: miAsignacion.clienteNombre || miAsignacion.cliente || 'Cliente',
                producto: miAsignacion.productoNombre || miAsignacion.producto || 'Producto',
                imagen: miAsignacion.productoImagen || miAsignacion.imagen || '',
                procesoNombre: miAsignacion.procesoNombre || (esEstacionEmpaque() ? 'Empaque' : 'Calidad'),
                piezasCapturadas: miAsignacion.piezasProducidas || 0,
                piezasMeta: miAsignacion.piezasMeta || miAsignacion.meta || 100,
                prioridad: miAsignacion.prioridad || 'media',
                fechaAsignacion: miAsignacion.fechaAsignacion || new Date().toISOString()
            });
        }
    }

    if (nuevosPedidos.length > 0) {
        DEBUG_MODE && console.log('[OPERADORA] Nuevos pedidos detectados:', nuevosPedidos.length);

        nuevosPedidos.forEach(p => {
            operadoraState.pedidosActivos.push({
                ...p,
                piezasCapturadas: p.piezasCapturadas || 0,
                procesoIniciado: p.procesoIniciado || false,
                procesoEnPausa: p.procesoEnPausa || false,
                tiempoProcesoAcumulado: p.tiempoProcesoAcumulado || 0,
                tiempoProcesoInicio: null
            });
        });

        renderizarTarjetasPedidos();
        actualizarContadorPedidos();
        mostrarToast(`${nuevosPedidos.length} nuevo(s) pedido(s) asignado(s)`, 'success');
        if (typeof reproducirSonido === 'function') reproducirSonido('notificacion');
    }
}

/**
 * Muestra mensaje de sin pedidos
 */
function mostrarSinPedidosMulti() {
    const container = document.getElementById('multiPedidosContainer');
    const sinPedidos = document.getElementById('sinPedidosMulti');
    const capturaRapida = document.getElementById('capturaRapidaMulti');

    if (sinPedidos) sinPedidos.style.display = 'flex';
    if (capturaRapida) capturaRapida.style.display = 'none';

    // Limpiar el grid de pedidos existente
    const gridExistente = container?.querySelector('.pedidos-grid');
    if (gridExistente) gridExistente.remove();
}

/**
 * Renderiza las tarjetas de pedidos activos con operadores múltiples
 */
function renderizarTarjetasPedidos() {
    const container = document.getElementById('multiPedidosContainer');
    if (!container) return;

    if (operadoraState.pedidosActivos.length === 0) {
        mostrarSinPedidosMulti();
        return;
    }

    // Ocultar mensaje de sin pedidos
    const sinPedidos = document.getElementById('sinPedidosMulti');
    if (sinPedidos) sinPedidos.style.display = 'none';

    // Ordenar por prioridad y fecha
    const pedidosOrdenados = [...operadoraState.pedidosActivos].sort((a, b) => {
        const prioridadOrden = { alta: 0, urgente: 0, media: 1, normal: 1, baja: 2 };
        const prioA = prioridadOrden[a.prioridad] ?? 1;
        const prioB = prioridadOrden[b.prioridad] ?? 1;
        if (prioA !== prioB) return prioA - prioB;
        return new Date(a.fechaAsignacion || 0) - new Date(b.fechaAsignacion || 0);
    });

    // Limpiar grid existente
    const gridExistente = container.querySelector('.pedidos-grid');
    if (gridExistente) gridExistente.remove();

    let html = '<div class="pedidos-grid">';

    pedidosOrdenados.forEach((pedido) => {
        const porcentaje = pedido.piezasMeta > 0
            ? Math.min(100, Math.round((pedido.piezasCapturadas / pedido.piezasMeta) * 100))
            : 0;

        const estaSeleccionado = operadoraState.pedidoSeleccionado === pedido.id;
        const operadoresActivos = (pedido.operadores || []).filter(op => op.activo);
        const tieneOperadores = operadoresActivos.length > 0;
        const todosEnPausa = tieneOperadores && operadoresActivos.every(op => op.enPausa);
        const algunoTrabajando = tieneOperadores && operadoresActivos.some(op => !op.enPausa);

        const estadoClase = pedido.pausaGeneral ? 'pausa-general' :
                           !tieneOperadores ? 'pendiente' :
                           todosEnPausa ? 'pausado' :
                           algunoTrabajando ? 'activo' : 'pendiente';

        html += `
            <div class="pedido-card-multi ${estadoClase} ${estaSeleccionado ? 'seleccionado' : ''}"
                 data-pedido-id="${pedido.id}">

                <!-- Header de la tarjeta -->
                <div class="pedido-card-header-multi">
                    <span class="pedido-numero-multi">#${pedido.pedidoId}</span>
                    <div class="header-actions">
                        ${pedido.pausaGeneral ?
                            `<span class="badge-pausa-general"><i class="fas fa-pause-circle"></i> Sin piezas</span>` :
                            `<span class="pedido-prioridad-multi ${pedido.prioridad || 'normal'}">${pedido.prioridad || 'normal'}</span>`
                        }
                    </div>
                </div>

                <!-- Info compacta del pedido - Click para ver detalle -->
                <div class="pedido-card-info-compact clickable" onclick="event.stopPropagation(); mostrarDetallePedido('${pedido.id}')" title="Ver detalle del pedido">
                    <div class="pedido-imagen-mini">
                        ${pedido.imagen
                            ? `<img src="${pedido.imagen}" alt="${pedido.producto}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2240%22>?</text></svg>'">`
                            : `<div class="sin-imagen-mini"><i class="fas fa-box"></i></div>`
                        }
                    </div>
                    <div class="pedido-datos-mini">
                        <div class="pedido-cliente-mini"><i class="fas fa-building"></i> ${pedido.cliente || 'Cliente'}</div>
                        <div class="pedido-producto-mini">${pedido.producto || 'Producto'}</div>
                        <div class="ver-detalle-hint"><i class="fas fa-eye"></i> Ver detalle</div>
                    </div>
                </div>

                <!-- Sección de Operadores -->
                <div class="pedido-operadores-section">
                    <div class="operadores-header">
                        <span class="operadores-titulo"><i class="fas fa-users"></i> Equipo (${operadoresActivos.length})</span>
                        <button class="btn-agregar-operador" onclick="event.stopPropagation(); mostrarSelectorOperadores('${pedido.id}')" title="Agregar persona">
                            <i class="fas fa-user-plus"></i>
                        </button>
                    </div>

                    <div class="operadores-lista" id="operadores-${pedido.id}">
                        ${operadoresActivos.length === 0 ? `
                            <div class="sin-operadores">
                                <span>Sin personal asignado</span>
                                <button class="btn-asignar-primero" onclick="event.stopPropagation(); mostrarSelectorOperadores('${pedido.id}')">
                                    <i class="fas fa-user-plus"></i> Asignar personal
                                </button>
                            </div>
                        ` : operadoresActivos.map(op => `
                            <div class="operador-item ${op.enPausa ? 'en-pausa' : 'trabajando'}" data-operador-id="${op.id}">
                                <div class="operador-info">
                                    <span class="operador-nombre">${op.nombre.split(' ')[0]}</span>
                                    <span class="operador-timer" id="timer-op-${pedido.id}-${op.id}">${formatearTiempoOperador(op)}</span>
                                </div>
                                <div class="operador-acciones">
                                    ${op.enPausa ? `
                                        <button class="btn-op-mini btn-reanudar" onclick="event.stopPropagation(); reanudarOperador('${pedido.id}', ${op.id})" title="Reanudar">
                                            <i class="fas fa-play"></i>
                                        </button>
                                    ` : `
                                        <button class="btn-op-mini btn-pausar" onclick="event.stopPropagation(); pausarOperador('${pedido.id}', ${op.id})" title="Pausar">
                                            <i class="fas fa-pause"></i>
                                        </button>
                                    `}
                                    <button class="btn-op-mini btn-salir" onclick="event.stopPropagation(); removerOperador('${pedido.id}', ${op.id})" title="Salir del pedido">
                                        <i class="fas fa-sign-out-alt"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Pausa General (cuando no hay piezas) -->
                <div class="pausa-general-control">
                    <button class="btn-pausa-general ${pedido.pausaGeneral ? 'activa' : ''}"
                            onclick="event.stopPropagation(); togglePausaGeneral('${pedido.id}')"
                            title="${pedido.pausaGeneral ? 'Reanudar - hay piezas disponibles' : 'Pausar todo - sin piezas disponibles'}">
                        <i class="fas ${pedido.pausaGeneral ? 'fa-play-circle' : 'fa-pause-circle'}"></i>
                        <span>${pedido.pausaGeneral ? 'Reanudar (hay piezas)' : 'Pausa general (sin piezas)'}</span>
                    </button>
                </div>

                <!-- Progreso -->
                <div class="pedido-card-progreso-multi">
                    <div class="progreso-barra-multi">
                        <div class="progreso-fill-multi ${porcentaje >= 100 ? 'completo' : ''}" style="width: ${porcentaje}%"></div>
                    </div>
                    <div class="progreso-texto-multi">
                        <span class="piezas-actual-multi">${pedido.piezasCapturadas}</span>
                        <span class="piezas-separador-multi">/</span>
                        <span class="piezas-meta-multi">${pedido.piezasMeta}</span>
                        <span class="piezas-label-multi">pzas</span>
                    </div>
                </div>

                <!-- Acciones del pedido -->
                <div class="pedido-card-footer">
                    <button class="btn-capturar-piezas" onclick="event.stopPropagation(); mostrarCapturaPiezas('${pedido.id}')" ${!tieneOperadores || pedido.pausaGeneral ? 'disabled' : ''}>
                        <i class="fas fa-plus"></i> Capturar piezas
                    </button>
                    <button class="btn-finalizar-pedido" onclick="event.stopPropagation(); finalizarProcesoMulti('${pedido.id}')" ${!tieneOperadores ? 'disabled' : ''}>
                        <i class="fas fa-check"></i> Finalizar
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Insertar después del mensaje de sin pedidos
    sinPedidos.insertAdjacentHTML('afterend', html);

    // Actualizar badge del pedido seleccionado
    actualizarBadgePedidoSeleccionado();

    // Iniciar actualización de timers activos
    iniciarTimersMulti();
}

/**
 * Inicia los intervalos de los timers para cada operador
 */
function iniciarTimersMulti() {
    // Limpiar intervalos anteriores de operadores
    operadoraState.pedidosActivos.forEach(pedido => {
        if (pedido.operadores) {
            pedido.operadores.forEach(op => {
                if (op.intervalId) {
                    clearInterval(op.intervalId);
                    op.intervalId = null;
                }
            });
        }
    });

    // Iniciar nuevos intervalos para operadores activos (no en pausa)
    operadoraState.pedidosActivos.forEach(pedido => {
        if (pedido.pausaGeneral) return; // No iniciar si hay pausa general

        if (pedido.operadores) {
            pedido.operadores.forEach(op => {
                if (op.activo && !op.enPausa) {
                    op.intervalId = setInterval(() => {
                        actualizarTimerOperador(pedido.id, op.id);
                    }, 1000);
                }
            });
        }
    });
}

/**
 * Actualiza el display del timer de un operador específico
 */
function actualizarTimerOperador(pedidoId, operadorId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.operadores) return;

    const operador = pedido.operadores.find(op => op.id === operadorId);
    if (!operador) return;

    const timerEl = document.getElementById(`timer-op-${pedidoId}-${operadorId}`);
    if (timerEl) {
        timerEl.textContent = formatearTiempoOperador(operador);
    }
}

/**
 * Formatea el tiempo de un operador
 */
function formatearTiempoOperador(operador) {
    let tiempoTotal = operador.tiempoAcumulado || 0;

    if (operador.activo && !operador.enPausa && operador.tiempoInicio) {
        tiempoTotal += (new Date() - new Date(operador.tiempoInicio));
    }

    const horas = Math.floor(tiempoTotal / 3600000);
    const minutos = Math.floor((tiempoTotal % 3600000) / 60000);
    const segundos = Math.floor((tiempoTotal % 60000) / 1000);

    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

/**
 * Carga la lista de operadores disponibles desde localStorage
 */
function cargarListaOperadores() {
    try {
        // Intentar cargar desde supervisoraState primero
        const supervisoraData = JSON.parse(localStorage.getItem('supervisora_state') || '{}');
        if (supervisoraData.operadores && supervisoraData.operadores.length > 0) {
            operadoraState.listaOperadoresDisponibles = supervisoraData.operadores;
            return;
        }

        // Intentar cargar desde personal
        const personal = JSON.parse(localStorage.getItem('personal') || '[]');
        const operadores = personal.filter(p => p.rol === 'operador' && p.activo !== false);
        if (operadores.length > 0) {
            operadoraState.listaOperadoresDisponibles = operadores;
            return;
        }

        // Si no hay datos, usar lista por defecto para pruebas
        operadoraState.listaOperadoresDisponibles = [
            { id: 1, nombre: 'María García' },
            { id: 2, nombre: 'Juan Pérez' },
            { id: 3, nombre: 'Ana López' },
            { id: 4, nombre: 'Carlos Ruiz' },
            { id: 5, nombre: 'Patricia Sánchez' },
            { id: 6, nombre: 'Ricardo Fernández' },
            { id: 7, nombre: 'Rosa Martínez' },
            { id: 8, nombre: 'Luis García' }
        ];
    } catch (e) {
        console.error('[OPERADORA] Error cargando lista de operadores:', e);
        operadoraState.listaOperadoresDisponibles = [];
    }
}

/**
 * Muestra el modal para seleccionar operadores
 */
function mostrarSelectorOperadores(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    // Cargar lista de operadores si no está cargada
    if (operadoraState.listaOperadoresDisponibles.length === 0) {
        cargarListaOperadores();
    }

    // IDs de operadores ya asignados a este pedido
    const operadoresEnPedido = (pedido.operadores || []).filter(op => op.activo).map(op => op.id);

    // Crear modal
    const modalHTML = `
        <div class="modal-overlay-operadores" id="modalOperadores">
            <div class="modal-operadores">
                <div class="modal-operadores-header">
                    <h3><i class="fas fa-users"></i> Asignar Personal</h3>
                    <span class="pedido-ref">Pedido #${pedido.pedidoId} - ${pedido.producto || 'Producto'}</span>
                </div>
                <div class="modal-operadores-body">
                    <p class="instruccion">Selecciona las personas que trabajarán en este pedido:</p>
                    <div class="operadores-checkboxes">
                        ${operadoraState.listaOperadoresDisponibles.map(op => `
                            <label class="operador-checkbox ${operadoresEnPedido.includes(op.id) ? 'ya-asignado' : ''}">
                                <input type="checkbox"
                                       value="${op.id}"
                                       data-nombre="${op.nombre}"
                                       ${operadoresEnPedido.includes(op.id) ? 'checked disabled' : ''}>
                                <span class="checkmark"></span>
                                <span class="operador-label">${op.nombre}</span>
                                ${operadoresEnPedido.includes(op.id) ? '<span class="badge-ya">Ya asignado</span>' : ''}
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-operadores-footer">
                    <button class="btn-cancelar-modal" onclick="cerrarModalOperadores()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-confirmar-modal" onclick="confirmarOperadores('${pedidoId}')">
                        <i class="fas fa-check"></i> Confirmar
                    </button>
                </div>
            </div>
        </div>
    `;

    // Remover modal anterior si existe
    const modalAnterior = document.getElementById('modalOperadores');
    if (modalAnterior) modalAnterior.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Cierra el modal de operadores
 */
function cerrarModalOperadores() {
    const modal = document.getElementById('modalOperadores');
    if (modal) modal.remove();
}

/**
 * Confirma la selección de operadores y los agrega al pedido
 */
function confirmarOperadores(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    // Inicializar array de operadores si no existe
    if (!pedido.operadores) {
        pedido.operadores = [];
    }

    // Obtener operadores seleccionados
    const checkboxes = document.querySelectorAll('#modalOperadores input[type="checkbox"]:checked:not([disabled])');

    checkboxes.forEach(cb => {
        const operadorId = parseInt(cb.value);
        const operadorNombre = cb.dataset.nombre;

        // Verificar que no esté ya agregado
        if (!pedido.operadores.some(op => op.id === operadorId && op.activo)) {
            pedido.operadores.push({
                id: operadorId,
                nombre: operadorNombre,
                activo: true,
                tiempoInicio: new Date(),
                tiempoAcumulado: 0,
                enPausa: false,
                intervalId: null
            });
        }
    });

    cerrarModalOperadores();
    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    const nuevos = checkboxes.length;
    if (nuevos > 0) {
        mostrarToast(`${nuevos} persona(s) agregada(s) al pedido`, 'success');
    }
}

/**
 * Pausa el timer de un operador específico
 */
function pausarOperador(pedidoId, operadorId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.operadores) return;

    const operador = pedido.operadores.find(op => op.id === operadorId);
    if (!operador || !operador.activo) return;

    // Acumular tiempo trabajado
    if (operador.tiempoInicio) {
        operador.tiempoAcumulado = (operador.tiempoAcumulado || 0) + (new Date() - new Date(operador.tiempoInicio));
    }

    operador.enPausa = true;
    operador.tiempoInicio = null;

    // Detener el intervalo
    if (operador.intervalId) {
        clearInterval(operador.intervalId);
        operador.intervalId = null;
    }

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    mostrarToast(`${operador.nombre.split(' ')[0]} en pausa`, 'info');
}

/**
 * Reanuda el timer de un operador específico
 */
function reanudarOperador(pedidoId, operadorId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.operadores) return;

    // No reanudar si hay pausa general
    if (pedido.pausaGeneral) {
        mostrarToast('Hay pausa general activa. Primero reanuda el pedido.', 'warning');
        return;
    }

    const operador = pedido.operadores.find(op => op.id === operadorId);
    if (!operador || !operador.activo) return;

    operador.enPausa = false;
    operador.tiempoInicio = new Date();

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    mostrarToast(`${operador.nombre.split(' ')[0]} trabajando`, 'success');
}

/**
 * Remueve un operador del pedido (sale del pedido)
 */
function removerOperador(pedidoId, operadorId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.operadores) return;

    const operador = pedido.operadores.find(op => op.id === operadorId);
    if (!operador) return;

    // Acumular tiempo final si estaba trabajando
    if (!operador.enPausa && operador.tiempoInicio) {
        operador.tiempoAcumulado = (operador.tiempoAcumulado || 0) + (new Date() - new Date(operador.tiempoInicio));
    }

    // Marcar como inactivo (no eliminar para mantener registro)
    operador.activo = false;
    operador.fechaSalida = new Date();

    // Detener el intervalo
    if (operador.intervalId) {
        clearInterval(operador.intervalId);
        operador.intervalId = null;
    }

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    mostrarToast(`${operador.nombre.split(' ')[0]} salió del pedido`, 'info');
}

/**
 * Activa/desactiva la pausa general (cuando no hay piezas disponibles)
 */
function togglePausaGeneral(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    if (pedido.pausaGeneral) {
        // Reanudar - hay piezas disponibles
        pedido.pausaGeneral = false;

        // Reanudar todos los operadores que estaban trabajando
        if (pedido.operadores) {
            pedido.operadores.forEach(op => {
                if (op.activo && op.enPausa && op.pausadoPorGeneral) {
                    op.enPausa = false;
                    op.tiempoInicio = new Date();
                    op.pausadoPorGeneral = false;
                }
            });
        }

        mostrarToast('Pedido reanudado - hay piezas disponibles', 'success');
    } else {
        // Pausar todo - no hay piezas
        pedido.pausaGeneral = true;

        // Pausar todos los operadores activos
        if (pedido.operadores) {
            pedido.operadores.forEach(op => {
                if (op.activo && !op.enPausa) {
                    // Acumular tiempo
                    if (op.tiempoInicio) {
                        op.tiempoAcumulado = (op.tiempoAcumulado || 0) + (new Date() - new Date(op.tiempoInicio));
                    }
                    op.enPausa = true;
                    op.tiempoInicio = null;
                    op.pausadoPorGeneral = true; // Marcar que fue pausado por pausa general

                    if (op.intervalId) {
                        clearInterval(op.intervalId);
                        op.intervalId = null;
                    }
                }
            });
        }

        mostrarToast('Pausa general activada - esperando piezas', 'warning');
    }

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();
}

/**
 * Muestra el modal con el detalle completo del pedido
 */
function mostrarDetallePedido(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    // Buscar información completa en múltiples fuentes
    const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
    const productosDB = JSON.parse(localStorage.getItem('productos') || '[]');

    // Buscar el pedido completo por diferentes campos
    const idBuscar = pedido.pedidoId || pedido.id;
    let pedidoCompleto = pedidosActivos.find(p =>
        p.id == idBuscar || p.pedidoId == idBuscar || p.codigo == pedido.codigo
    );

    // Obtener productos del pedido
    let productosDelPedido = [];
    if (pedidoCompleto && pedidoCompleto.productos && pedidoCompleto.productos.length > 0) {
        productosDelPedido = pedidoCompleto.productos;
    }

    // Construir HTML de productos/artículos
    let articulosHTML = '<p class="sin-articulos">No hay artículos registrados</p>';
    if (productosDelPedido.length > 0) {
        articulosHTML = `
            <table class="tabla-articulos-detalle">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Descripción</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${productosDelPedido.map(prod => {
                        const productoInfo = productosDB.find(p => p.id == prod.productoId || p.nombre == prod.nombre);
                        const nombre = prod.nombre || productoInfo?.nombre || '-';
                        const descripcion = prod.descripcion || productoInfo?.descripcion || '-';
                        const cantidad = prod.cantidad || prod.piezas || '-';
                        return `<tr><td>${nombre}</td><td>${descripcion}</td><td>${cantidad}</td></tr>`;
                    }).join('')}
                </tbody>
            </table>
        `;
    } else if (pedido.producto) {
        articulosHTML = `
            <table class="tabla-articulos-detalle">
                <thead><tr><th>Producto</th><th>Descripción</th><th>Cantidad</th></tr></thead>
                <tbody>
                    <tr>
                        <td>${pedido.producto}</td>
                        <td>${pedido.descripcion || pedidoCompleto?.descripcion || '-'}</td>
                        <td>${pedido.piezasMeta || '-'}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    // Ficha técnica
    const fichaTecnica = pedido.fichaTecnica || pedidoCompleto?.fichaTecnica || (productosDelPedido[0]?.fichaTecnica) || null;
    let fichaTecnicaHTML = '<p class="sin-ficha">No hay ficha técnica disponible</p>';
    if (fichaTecnica) {
        fichaTecnicaHTML = `<a href="${fichaTecnica}" target="_blank" class="btn-ver-ficha"><i class="fas fa-file-pdf"></i> Ver Ficha Técnica</a>`;
    }

    // Descripción
    const descripcion = pedido.descripcion || pedidoCompleto?.descripcion || pedidoCompleto?.observaciones || 'Sin descripción disponible';

    // Fecha de entrega
    const fechaEntrega = pedido.fechaEntrega || pedidoCompleto?.fechaEntrega;
    let fechaEntregaHTML = '';
    if (fechaEntrega) {
        try {
            const fechaFormateada = new Date(fechaEntrega).toLocaleDateString('es-MX', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            fechaEntregaHTML = `<div class="detalle-item"><span class="detalle-label">Fecha de Entrega:</span><span class="detalle-valor">${fechaFormateada}</span></div>`;
        } catch(e) {}
    }

    const procesoNombre = pedido.procesoNombre || pedido.proceso || 'Empaque/Calidad';
    const progreso = Math.round((pedido.piezasCapturadas / pedido.piezasMeta) * 100) || 0;

    const modalHTML = `
        <div class="modal-overlay-detalle" id="modalDetallePedido">
            <div class="modal-detalle">
                <div class="modal-detalle-header">
                    <h3><i class="fas fa-clipboard-list"></i> Pedido #${pedido.pedidoId || pedido.codigo || pedido.id}</h3>
                    <button class="btn-cerrar-detalle" onclick="cerrarModalDetalle()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-detalle-body">
                    ${pedido.imagen ? `
                        <div class="detalle-seccion detalle-imagen-principal">
                            <div class="detalle-imagen-container">
                                <img src="${pedido.imagen}" alt="${pedido.producto}" class="detalle-imagen">
                            </div>
                        </div>
                    ` : ''}
                    <div class="detalle-seccion">
                        <h4><i class="fas fa-info-circle"></i> Información General</h4>
                        <div class="detalle-grid">
                            <div class="detalle-item"><span class="detalle-label">Cliente:</span><span class="detalle-valor">${pedido.cliente || pedidoCompleto?.cliente || 'No especificado'}</span></div>
                            <div class="detalle-item"><span class="detalle-label">Producto:</span><span class="detalle-valor">${pedido.producto || 'No especificado'}</span></div>
                            <div class="detalle-item"><span class="detalle-label">Cantidad Total:</span><span class="detalle-valor destacado">${pedido.piezasMeta || pedidoCompleto?.cantidad || '-'} piezas</span></div>
                            <div class="detalle-item"><span class="detalle-label">Proceso:</span><span class="detalle-valor">${procesoNombre}</span></div>
                            <div class="detalle-item"><span class="detalle-label">Prioridad:</span><span class="detalle-valor prioridad-${(pedido.prioridad || 'normal').toLowerCase()}">${pedido.prioridad || 'Normal'}</span></div>
                            ${fechaEntregaHTML}
                        </div>
                    </div>
                    <div class="detalle-seccion">
                        <h4><i class="fas fa-align-left"></i> Descripción</h4>
                        <p class="detalle-descripcion">${descripcion}</p>
                    </div>
                    <div class="detalle-seccion">
                        <h4><i class="fas fa-boxes"></i> Artículos del Pedido</h4>
                        ${articulosHTML}
                    </div>
                    <div class="detalle-seccion">
                        <h4><i class="fas fa-file-alt"></i> Ficha Técnica</h4>
                        ${fichaTecnicaHTML}
                    </div>
                    <div class="detalle-seccion">
                        <h4><i class="fas fa-tasks"></i> Progreso Actual</h4>
                        <div class="detalle-progreso">
                            <div class="progreso-barra-detalle"><div class="progreso-fill-detalle" style="width: ${Math.min(100, progreso)}%"></div></div>
                            <div class="progreso-info"><span>${pedido.piezasCapturadas || 0} / ${pedido.piezasMeta} piezas (${progreso}%)</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalAnterior = document.getElementById('modalDetallePedido');
    if (modalAnterior) modalAnterior.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarModalDetalle() {
    const modal = document.getElementById('modalDetallePedido');
    if (modal) modal.remove();
}

/**
 * Muestra el modal para capturar piezas
 */
function mostrarCapturaPiezas(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    const modalHTML = `
        <div class="modal-overlay-captura" id="modalCaptura">
            <div class="modal-captura">
                <div class="modal-captura-header">
                    <h3><i class="fas fa-plus-circle"></i> Capturar Piezas</h3>
                    <span>Pedido #${pedido.pedidoId}</span>
                </div>
                <div class="modal-captura-body">
                    <div class="captura-actual">
                        <span class="label">Piezas actuales:</span>
                        <span class="valor">${pedido.piezasCapturadas} / ${pedido.piezasMeta}</span>
                    </div>
                    <div class="captura-botones-rapidos">
                        <button onclick="capturarYCerrar('${pedidoId}', 10)">+10</button>
                        <button onclick="capturarYCerrar('${pedidoId}', 25)">+25</button>
                        <button onclick="capturarYCerrar('${pedidoId}', 50)">+50</button>
                        <button onclick="capturarYCerrar('${pedidoId}', 100)">+100</button>
                    </div>
                    <div class="captura-manual">
                        <input type="number" id="inputCapturaManual" placeholder="Cantidad personalizada" min="1">
                        <button onclick="capturarManualYCerrar('${pedidoId}')">
                            <i class="fas fa-check"></i> Agregar
                        </button>
                    </div>
                </div>
                <div class="modal-captura-footer">
                    <button class="btn-cerrar-captura" onclick="cerrarModalCaptura()">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;

    const modalAnterior = document.getElementById('modalCaptura');
    if (modalAnterior) modalAnterior.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Focus en el input
    setTimeout(() => {
        const input = document.getElementById('inputCapturaManual');
        if (input) input.focus();
    }, 100);
}

function cerrarModalCaptura() {
    const modal = document.getElementById('modalCaptura');
    if (modal) modal.remove();
}

function capturarYCerrar(pedidoId, cantidad) {
    capturarRapidoMulti(pedidoId, cantidad);
    cerrarModalCaptura();
}

function capturarManualYCerrar(pedidoId) {
    const input = document.getElementById('inputCapturaManual');
    const cantidad = parseInt(input?.value || 0);
    if (cantidad > 0) {
        capturarRapidoMulti(pedidoId, cantidad);
        cerrarModalCaptura();
    } else {
        mostrarToast('Ingresa una cantidad válida', 'warning');
    }
}

/**
 * Actualiza el display del timer de un pedido
 */
function actualizarTimerVisualMulti(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    const timerEl = document.getElementById(`timer-${pedidoId}`);
    if (timerEl) {
        timerEl.textContent = formatearTiempoMulti(pedido);
    }
}

/**
 * Formatea el tiempo para mostrar en la tarjeta
 */
function formatearTiempoMulti(pedido) {
    let tiempoTotal = pedido.tiempoProcesoAcumulado || 0;

    if (pedido.procesoIniciado && !pedido.procesoEnPausa && pedido.tiempoProcesoInicio) {
        tiempoTotal += (new Date() - new Date(pedido.tiempoProcesoInicio));
    }

    const horas = Math.floor(tiempoTotal / 3600000);
    const minutos = Math.floor((tiempoTotal % 3600000) / 60000);
    const segundos = Math.floor((tiempoTotal % 60000) / 1000);

    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

/**
 * Actualiza el contador de pedidos
 */
function actualizarContadorPedidos() {
    const badge = document.getElementById('pedidosCountBadge');
    if (badge) {
        badge.textContent = operadoraState.pedidosActivos.length;
    }
}

/**
 * Actualiza el badge del pedido seleccionado
 */
function actualizarBadgePedidoSeleccionado() {
    const badge = document.getElementById('pedidoSeleccionadoBadge');
    const capturaRapida = document.getElementById('capturaRapidaMulti');

    if (operadoraState.pedidoSeleccionado) {
        const pedido = operadoraState.pedidosActivos.find(p => p.id === operadoraState.pedidoSeleccionado);
        if (pedido && badge) {
            badge.textContent = `#${pedido.pedidoId}`;
        }
        if (capturaRapida) capturaRapida.style.display = 'block';
    } else {
        if (capturaRapida) capturaRapida.style.display = 'none';
    }
}

/**
 * Selecciona un pedido para captura de piezas
 */
function seleccionarPedidoMulti(pedidoId) {
    operadoraState.pedidoSeleccionado = pedidoId;
    renderizarTarjetasPedidos();

    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (pedido) {
        mostrarToast(`Pedido #${pedido.pedidoId} seleccionado`, 'info');
    }
}

/**
 * Inicia el proceso/temporizador de un pedido específico
 */
function iniciarProcesoMulti(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    pedido.procesoIniciado = true;
    pedido.procesoEnPausa = false;
    pedido.tiempoProcesoInicio = new Date();

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    mostrarToast(`Proceso iniciado para pedido #${pedido.pedidoId}`, 'success');
    if (typeof reproducirSonido === 'function') reproducirSonido('iniciar');
}

/**
 * Pausa el proceso de un pedido
 */
function pausarProcesoMulti(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.procesoIniciado) return;

    // Acumular tiempo
    if (pedido.tiempoProcesoInicio) {
        pedido.tiempoProcesoAcumulado += (new Date() - new Date(pedido.tiempoProcesoInicio));
    }

    pedido.procesoEnPausa = true;
    pedido.tiempoProcesoInicio = null;

    // Detener intervalo
    if (pedido.intervaloProceso) {
        clearInterval(pedido.intervaloProceso);
        pedido.intervaloProceso = null;
    }

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    mostrarToast(`Pedido #${pedido.pedidoId} pausado`, 'info');
    if (typeof reproducirSonido === 'function') reproducirSonido('pausar');
}

/**
 * Reanuda el proceso de un pedido
 */
function reanudarProcesoMulti(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido || !pedido.procesoEnPausa) return;

    pedido.procesoEnPausa = false;
    pedido.tiempoProcesoInicio = new Date();

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    mostrarToast(`Pedido #${pedido.pedidoId} reanudado`, 'success');
    if (typeof reproducirSonido === 'function') reproducirSonido('reanudar');
}

/**
 * Captura rápida de piezas para un pedido
 */
function capturarRapidoMulti(pedidoId, cantidad) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    if (!pedido.procesoIniciado) {
        mostrarToast('Primero inicia el proceso', 'warning');
        return;
    }

    pedido.piezasCapturadas += cantidad;

    // Registrar captura en historial
    const captura = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        hora: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        cantidad: cantidad,
        pedidoId: pedido.pedidoId,
        procesoNombre: pedido.procesoNombre || (esEstacionEmpaque() ? 'Empaque' : 'Calidad'),
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        estacionId: CONFIG_ESTACION.id,
        modoMultiPedido: true
    };

    sincronizarCapturaMulti(captura, pedido);
    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();

    if (typeof mostrarMicroFeedbackCaptura === 'function') {
        mostrarMicroFeedbackCaptura(cantidad);
    }

    // Verificar si alcanzó meta
    if (pedido.piezasCapturadas >= pedido.piezasMeta) {
        if (typeof celebrarMeta === 'function') celebrarMeta();

        // Si es empaque, ofrecer generar etiqueta
        if (esEstacionEmpaque()) {
            setTimeout(() => {
                if (confirm(`¡Meta alcanzada para pedido #${pedido.pedidoId}! ¿Deseas generar etiquetas?`)) {
                    mostrarModalEtiqueta(pedido);
                }
            }, 1500);
        }
    }
}

/**
 * Captura rápida para el pedido seleccionado
 */
function capturarRapidoMultiSeleccionado(cantidad) {
    if (!operadoraState.pedidoSeleccionado) {
        mostrarToast('Selecciona un pedido primero', 'warning');
        return;
    }
    capturarRapidoMulti(operadoraState.pedidoSeleccionado, cantidad);
}

/**
 * Captura cantidad personalizada para pedido seleccionado
 */
function capturarCustomMulti() {
    const input = document.getElementById('cantidadCustomMulti');
    const cantidad = parseInt(input?.value) || 0;

    if (cantidad <= 0) {
        mostrarToast('Ingresa una cantidad válida', 'warning');
        return;
    }

    if (!operadoraState.pedidoSeleccionado) {
        mostrarToast('Selecciona un pedido primero', 'warning');
        return;
    }

    capturarRapidoMulti(operadoraState.pedidoSeleccionado, cantidad);
    if (input) input.value = '';
}

/**
 * Sincroniza una captura con el sistema
 */
function sincronizarCapturaMulti(captura, pedido) {
    // Guardar en historial_produccion
    const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    historial.unshift({
        ...captura,
        cliente: pedido.cliente,
        producto: pedido.producto
    });
    localStorage.setItem('historial_produccion', JSON.stringify(historial.slice(0, 1000)));

    // Actualizar pedidos_erp
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const pedidoIndex = pedidosERP.findIndex(p => p.id == pedido.pedidoId);
    if (pedidoIndex >= 0 && pedidosERP[pedidoIndex].procesos) {
        const proceso = pedidosERP[pedidoIndex].procesos.find(
            p => (p.nombre || '').toLowerCase().includes(captura.procesoNombre.toLowerCase())
        );
        if (proceso) {
            proceso.piezas = (proceso.piezas || 0) + captura.cantidad;
            proceso.ultimaActualizacion = new Date().toISOString();
        }
        localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
    }
}

/**
 * Finaliza el proceso de un pedido multi
 */
function finalizarProcesoMulti(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    // Verificar que hay operadores
    const operadoresActivos = (pedido.operadores || []).filter(op => op.activo);
    if (operadoresActivos.length === 0) {
        mostrarToast('No hay personal asignado a este pedido', 'warning');
        return;
    }

    // Finalizar timers de todos los operadores y calcular tiempo total
    let tiempoTotalEquipo = 0;
    operadoresActivos.forEach(op => {
        if (!op.enPausa && op.tiempoInicio) {
            op.tiempoAcumulado = (op.tiempoAcumulado || 0) + (new Date() - new Date(op.tiempoInicio));
            op.tiempoInicio = null;
        }
        if (op.intervalId) {
            clearInterval(op.intervalId);
            op.intervalId = null;
        }
        tiempoTotalEquipo += (op.tiempoAcumulado || 0);
    });

    // Si es empaque, mostrar modal de etiquetas
    if (esEstacionEmpaque()) {
        mostrarModalEtiqueta(pedido);
    } else {
        // Calidad: solo confirmar finalización
        const nombresEquipo = operadoresActivos.map(op => op.nombre.split(' ')[0]).join(', ');
        if (confirm(`¿Finalizar proceso para pedido #${pedido.pedidoId}?\n\nPiezas procesadas: ${pedido.piezasCapturadas}\nEquipo: ${nombresEquipo}`)) {
            completarFinalizacionMulti(pedidoId, tiempoTotalEquipo);
        }
    }
}

/**
 * Completa la finalización de un pedido multi
 */
function completarFinalizacionMulti(pedidoId, tiempoTotal) {
    const pedidoIndex = operadoraState.pedidosActivos.findIndex(p => p.id === pedidoId);
    if (pedidoIndex === -1) return;

    const pedido = operadoraState.pedidosActivos[pedidoIndex];

    // Preparar información de operadores para el registro
    const operadoresRegistro = (pedido.operadores || []).map(op => ({
        id: op.id,
        nombre: op.nombre,
        activo: op.activo,
        tiempoTrabajadoMs: op.tiempoAcumulado || 0,
        tiempoTrabajadoFormateado: formatearTiempoMsAHHMMSS(op.tiempoAcumulado || 0),
        fechaSalida: op.fechaSalida?.toISOString?.() || op.fechaSalida || null
    }));

    const operadoresActivos = operadoresRegistro.filter(op => op.activo);
    const nombresEquipo = operadoresActivos.map(op => op.nombre.split(' ')[0]).join(', ');

    // Crear registro de finalización con detalle de operadores
    const resumen = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        pedidoId: pedido.pedidoId,
        cliente: pedido.cliente,
        producto: pedido.producto,
        procesoNombre: pedido.procesoNombre,
        piezasProducidas: pedido.piezasCapturadas,
        tiempoTotalEquipoMs: tiempoTotal,
        tiempoTotalEquipoFormateado: formatearTiempoMsAHHMMSS(tiempoTotal),
        // Registro completo de operadores para trazabilidad y cálculo de costos
        operadores: operadoresRegistro,
        operadoresActivos: operadoresActivos.length,
        nombresEquipo: nombresEquipo,
        estacionId: CONFIG_ESTACION.id,
        tipo: esEstacionEmpaque() ? 'empaque_completado' : 'calidad_completado'
    };

    // Guardar en historial
    const historialCompletados = JSON.parse(localStorage.getItem('historial_asignaciones_completadas') || '[]');
    historialCompletados.unshift(resumen);
    localStorage.setItem('historial_asignaciones_completadas', JSON.stringify(historialCompletados.slice(0, 500)));

    // Determinar si es Empaque (último proceso del flujo de producción)
    const esEmpaque = esEstacionEmpaque() || (pedido.procesoNombre || '').toLowerCase().includes('empaque');

    // Notificar a supervisora
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');

    if (esEmpaque) {
        // EMPAQUE ES EL ÚLTIMO PROCESO - Notificación especial de pedido listo para entrega
        notificaciones.unshift({
            id: Date.now(),
            tipo: 'pedido_listo_entrega',
            prioridad: 'alta',
            titulo: `PEDIDO LISTO PARA ENTREGA`,
            mensaje: `Pedido #${pedido.pedidoId} - ${pedido.cliente} - ${pedido.producto} (${pedido.piezasCapturadas} pzas) completó Empaque y está listo para entrega`,
            estacionId: CONFIG_ESTACION.id,
            pedidoId: pedido.pedidoId,
            cliente: pedido.cliente,
            producto: pedido.producto,
            piezas: pedido.piezasCapturadas,
            operadores: operadoresActivos,
            nombresEquipo: nombresEquipo,
            tiempoTotal: resumen.tiempoTotalEquipoFormateado,
            fecha: new Date().toISOString(),
            leida: false,
            notificarAdmin: true
        });

        // También notificar a administración directamente
        const notificacionesAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
        notificacionesAdmin.unshift({
            id: Date.now(),
            tipo: 'pedido_listo_entrega',
            prioridad: 'alta',
            titulo: `PEDIDO LISTO PARA ENTREGA`,
            mensaje: `Pedido #${pedido.pedidoId} completó todo el proceso de producción`,
            detalles: {
                pedidoId: pedido.pedidoId,
                cliente: pedido.cliente,
                producto: pedido.producto,
                piezas: pedido.piezasCapturadas,
                tiempoEmpaque: resumen.tiempoTotalEquipoFormateado,
                equipoEmpaque: nombresEquipo,
                estacion: CONFIG_ESTACION.id
            },
            fecha: new Date().toISOString(),
            leida: false
        });
        localStorage.setItem('notificaciones_admin', JSON.stringify(notificacionesAdmin.slice(0, 200)));

        // Marcar pedido como listo para entrega en pedidos_activos
        const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
        const pedidoActivo = pedidosActivos.find(p => p.id == pedido.pedidoId || p.pedidoId == pedido.pedidoId);
        if (pedidoActivo) {
            pedidoActivo.estado = 'listo_entrega';
            pedidoActivo.fechaListoEntrega = new Date().toISOString();
            pedidoActivo.empaqueCompletadoPor = nombresEquipo;
            localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
        }

        // Registrar en pedidos_erp también
        const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
        const pedidoERP = pedidosERP.find(p => p.id == pedido.pedidoId);
        if (pedidoERP) {
            pedidoERP.estado = 'listo_entrega';
            pedidoERP.fechaListoEntrega = new Date().toISOString();
            localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
        }

    } else {
        // Proceso normal (Calidad u otro)
        notificaciones.unshift({
            id: Date.now(),
            tipo: resumen.tipo,
            titulo: `${pedido.procesoNombre || 'Proceso'} Completado`,
            mensaje: `Equipo: ${nombresEquipo} completó ${pedido.procesoNombre} - Pedido #${pedido.pedidoId} - ${pedido.piezasCapturadas} pzas`,
            estacionId: CONFIG_ESTACION.id,
            pedidoId: pedido.pedidoId,
            piezas: pedido.piezasCapturadas,
            operadores: operadoresActivos,
            fecha: new Date().toISOString(),
            leida: false
        });
    }

    localStorage.setItem('notificaciones_coco', JSON.stringify(notificaciones.slice(0, 100)));

    // Remover pedido de la lista activa
    operadoraState.pedidosActivos.splice(pedidoIndex, 1);

    // Si era el seleccionado, deseleccionar
    if (operadoraState.pedidoSeleccionado === pedidoId) {
        operadoraState.pedidoSeleccionado = null;
    }

    guardarEstadoPedidosMulti();
    renderizarTarjetasPedidos();
    actualizarContadorPedidos();

    // Mensaje diferenciado si es Empaque (último proceso)
    if (esEmpaque) {
        mostrarToast(`PEDIDO #${pedido.pedidoId} LISTO PARA ENTREGA - Notificado a Supervisora y Admin`, 'success');
    } else {
        mostrarToast(`Pedido #${pedido.pedidoId} finalizado`, 'success');
    }
    if (typeof reproducirSonido === 'function') reproducirSonido('finalizar');
}

/**
 * Formatea milisegundos a formato HH:MM:SS
 */
function formatearTiempoMsAHHMMSS(ms) {
    const horas = Math.floor(ms / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

/**
 * Guarda el estado de los pedidos en localStorage
 * Guarda en dos lugares:
 * 1. 'multi_pedidos_estado_local' - Estado local de la operadora (timers, piezas)
 * 2. Sincroniza con 'asignaciones_multi_pedido' para supervisora
 */
function guardarEstadoPedidosMulti() {
    // 1. Guardar estado local (piezas capturadas, operadores con timers, etc.)
    const estadoLocal = {};
    operadoraState.pedidosActivos.forEach(p => {
        // Serializar operadores sin intervalos
        const operadoresSerialized = (p.operadores || []).map(op => ({
            id: op.id,
            nombre: op.nombre,
            activo: op.activo,
            tiempoInicio: op.tiempoInicio?.toISOString?.() || op.tiempoInicio || null,
            tiempoAcumulado: op.tiempoAcumulado || 0,
            enPausa: op.enPausa || false,
            pausadoPorGeneral: op.pausadoPorGeneral || false,
            fechaSalida: op.fechaSalida?.toISOString?.() || op.fechaSalida || null
            // No incluir intervalId
        }));

        estadoLocal[p.id] = {
            piezasCapturadas: p.piezasCapturadas || 0,
            pausaGeneral: p.pausaGeneral || false,
            operadores: operadoresSerialized
        };
    });
    localStorage.setItem('multi_pedidos_estado_local', JSON.stringify(estadoLocal));

    // 2. Actualizar asignaciones_multi_pedido para que supervisora vea el progreso
    const asignacionesMulti = JSON.parse(localStorage.getItem('asignaciones_multi_pedido') || '{}');

    // Buscar mi estación
    let estacionKey = CONFIG_ESTACION.id;
    if (!asignacionesMulti[estacionKey]) {
        const miIdNormalizado = CONFIG_ESTACION.id.toLowerCase().replace(/[-_\s]/g, '');
        for (const estId of Object.keys(asignacionesMulti)) {
            if (estId.toLowerCase().replace(/[-_\s]/g, '') === miIdNormalizado) {
                estacionKey = estId;
                break;
            }
        }
    }

    // Actualizar con estado actual (incluyendo operadores)
    asignacionesMulti[estacionKey] = operadoraState.pedidosActivos.map(p => {
        // Serializar operadores sin intervalos
        const operadoresSerialized = (p.operadores || []).map(op => ({
            id: op.id,
            nombre: op.nombre,
            activo: op.activo,
            tiempoInicio: op.tiempoInicio?.toISOString?.() || op.tiempoInicio || null,
            tiempoAcumulado: op.tiempoAcumulado || 0,
            enPausa: op.enPausa || false,
            pausadoPorGeneral: op.pausadoPorGeneral || false,
            fechaSalida: op.fechaSalida?.toISOString?.() || op.fechaSalida || null
        }));

        return {
            ...p,
            operadores: operadoresSerialized,
            tiempoProcesoInicio: p.tiempoProcesoInicio?.toISOString?.() || p.tiempoProcesoInicio || null,
            intervaloProceso: null // No serializar el intervalo
        };
    });

    localStorage.setItem('asignaciones_multi_pedido', JSON.stringify(asignacionesMulti));

    // 3. También mantener compatibilidad con asignaciones_estaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    asignaciones[estacionKey] = {
        ...asignaciones[estacionKey],
        modoMultiPedido: true,
        pedidosCount: operadoraState.pedidosActivos.length,
        ultimaActualizacion: new Date().toISOString()
    };
    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
}

/**
 * Inicia el timer de un pedido (usado al restaurar estado)
 */
function iniciarTimerPedido(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    // Si ya tiene un intervalo activo, no crear otro
    if (pedido.intervaloProceso) {
        clearInterval(pedido.intervaloProceso);
    }

    // Crear intervalo para actualizar el timer cada segundo
    pedido.intervaloProceso = setInterval(() => {
        actualizarDisplayTimerPedido(pedidoId);
    }, 1000);

    DEBUG_MODE && console.log('[OPERADORA] Timer restaurado para pedido', pedidoId);
}

/**
 * Actualiza el display del timer de un pedido específico
 */
function actualizarDisplayTimerPedido(pedidoId) {
    const pedido = operadoraState.pedidosActivos.find(p => p.id === pedidoId);
    if (!pedido) return;

    const timerEl = document.getElementById(`timer-${pedidoId}`);
    if (!timerEl) return;

    let tiempoTotal = pedido.tiempoProcesoAcumulado || 0;
    if (pedido.procesoIniciado && !pedido.procesoEnPausa && pedido.tiempoProcesoInicio) {
        tiempoTotal += (new Date() - new Date(pedido.tiempoProcesoInicio));
    }

    timerEl.textContent = formatearTiempo(tiempoTotal);
}

/**
 * Refrescar asignación manualmente
 */
function refrescarAsignacionMulti() {
    cargarPedidosMultiples();
    mostrarToast('Verificando nuevos pedidos...', 'info');
}

// ========================================
// SISTEMA DE ETIQUETAS DE EMPAQUE
// ========================================

/**
 * Muestra el modal para capturar datos de etiqueta
 */
function mostrarModalEtiqueta(pedido) {
    const modalOverlay = document.getElementById('modalEtiquetaOverlay');
    const modalBody = document.getElementById('modalEtiquetaBody');

    if (!modalOverlay || !modalBody) {
        console.error('[OPERADORA] Modal de etiqueta no encontrado');
        return;
    }

    // Guardar pedido en estado para generar etiqueta
    operadoraState.pedidoParaEtiqueta = pedido;

    const piezasTotales = pedido.piezasCapturadas || pedido.piezasMeta || 0;
    const piezasPorCajaDefault = piezasTotales;

    // Inicializar array de cajas personalizadas
    operadoraState.cajasPersonalizadas = [{ piezas: piezasTotales }];

    const content = `
        <div class="etiqueta-form-nuevo">
            <!-- Header con botón historial -->
            <div class="etiqueta-header-acciones">
                <button type="button" class="btn-historial-etiquetas" onclick="mostrarHistorialEtiquetas()">
                    <i class="fas fa-history"></i> Ver Etiquetas Previas
                </button>
            </div>

            <!-- Resumen del pedido -->
            <div class="etiqueta-resumen-nuevo">
                <div class="resumen-row">
                    <div class="resumen-label">Pedido:</div>
                    <div class="resumen-valor">#${pedido.pedidoId || pedido.codigo || '---'}</div>
                </div>
                <div class="resumen-row">
                    <div class="resumen-label">Cliente:</div>
                    <div class="resumen-valor">${pedido.cliente || 'Sin cliente'}</div>
                </div>
                <div class="resumen-row">
                    <div class="resumen-label">Producto:</div>
                    <div class="resumen-valor">${pedido.producto || 'Sin producto'}</div>
                </div>
                <div class="resumen-row destacado">
                    <div class="resumen-label">Total Piezas:</div>
                    <div class="resumen-valor">${piezasTotales}</div>
                </div>
            </div>

            <!-- Configuración de cajas personalizadas -->
            <div class="etiqueta-cajas-config">
                <div class="cajas-header">
                    <h4><i class="fas fa-box"></i> Configurar Cajas</h4>
                    <button type="button" class="btn-agregar-caja" onclick="agregarCajaPersonalizada()">
                        <i class="fas fa-plus"></i> Agregar Caja
                    </button>
                </div>
                <div id="listaCajasPersonalizadas" class="lista-cajas-personalizadas">
                    <div class="caja-item" data-index="0">
                        <span class="caja-numero">Caja 1:</span>
                        <input type="number" class="input-piezas-caja" value="${piezasTotales}" min="1" onchange="actualizarTotalCajas()">
                        <span class="caja-label">piezas</span>
                    </div>
                </div>
                <div class="cajas-totales">
                    <span>Total en cajas: <strong id="totalPiezasEnCajas">${piezasTotales}</strong> / ${piezasTotales} piezas</span>
                    <span id="advertenciaCajas" class="advertencia-cajas" style="display:none;"></span>
                </div>
            </div>

            <!-- Vista previa de etiqueta -->
            <div class="etiqueta-preview-nuevo">
                <h4>Vista Previa de Etiqueta</h4>
                <div class="etiqueta-preview-box-nuevo" id="etiquetaPreview">
                    ${generarHTMLEtiquetaPreview(pedido, 1, piezasTotales, 1)}
                </div>
            </div>

            <!-- Botones de acción -->
            <div class="etiqueta-acciones-nuevo">
                <button type="button" class="btn-cancelar-etiqueta" onclick="cerrarModalEtiqueta()">
                    Cancelar
                </button>
                <button type="button" class="btn-imprimir-etiqueta" onclick="generarEtiquetasPersonalizadas()">
                    <i class="fas fa-print"></i> Imprimir Etiquetas
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = content;
    modalOverlay.style.display = 'flex';
}

/**
 * Ajusta el valor de un input numérico
 */
function ajustarInputEtiqueta(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const min = parseInt(input.min) || 1;
    const max = parseInt(input.max) || 9999;
    let valor = parseInt(input.value) || min;

    valor = Math.max(min, Math.min(max, valor + delta));
    input.value = valor;

    // Si se cambia el número de cajas, recalcular piezas por caja
    if (inputId === 'numCajas') {
        const pedido = operadoraState.pedidoParaEtiqueta;
        if (pedido) {
            const piezasPorCaja = Math.ceil(pedido.piezasCapturadas / valor);
            document.getElementById('piezasPorCaja').value = piezasPorCaja;
        }
    }

    actualizarPreviewEtiqueta();
}

/**
 * Actualiza la vista previa de la etiqueta
 */
function actualizarPreviewEtiqueta() {
    const pedido = operadoraState.pedidoParaEtiqueta;
    if (!pedido) return;

    const numCajas = parseInt(document.getElementById('numCajas')?.value) || 1;
    const piezasPorCaja = parseInt(document.getElementById('piezasPorCaja')?.value) || pedido.piezasCapturadas;

    // Actualizar distribución
    const distribucion = document.getElementById('distribucionPreview');
    if (distribucion) {
        distribucion.innerHTML = calcularDistribucionCajas(pedido.piezasCapturadas, numCajas);
    }

    // Actualizar preview de etiqueta
    const preview = document.getElementById('etiquetaPreview');
    if (preview) {
        preview.innerHTML = generarHTMLEtiquetaPreview(pedido, numCajas, piezasPorCaja, 1);
    }
}

/**
 * Calcula la distribución de piezas en cajas
 */
function calcularDistribucionCajas(totalPiezas, numCajas) {
    if (numCajas <= 0) return '<p>Ingresa un número válido de cajas</p>';

    const piezasPorCaja = Math.floor(totalPiezas / numCajas);
    const residuo = totalPiezas % numCajas;

    let html = '<div class="distribucion-grid">';

    for (let i = 1; i <= Math.min(numCajas, 10); i++) {
        const piezasEnEsta = i <= residuo ? piezasPorCaja + 1 : piezasPorCaja;
        html += `
            <div class="caja-item">
                <i class="fas fa-box"></i>
                <span>Caja ${i}</span>
                <strong>${piezasEnEsta} pzas</strong>
            </div>
        `;
    }

    if (numCajas > 10) {
        html += `<div class="caja-item mas-cajas">... y ${numCajas - 10} más</div>`;
    }

    html += '</div>';
    return html;
}

/**
 * Genera el HTML de la etiqueta para preview (estilo Multifundas)
 */
function generarHTMLEtiquetaPreview(pedido, numCajas, piezasPorCaja, numeroCaja) {
    return `
        <div class="etiqueta-multifundas">
            <!-- Logo Multifundas -->
            <div class="etiqueta-logo">
                <span class="logo-multi">MULTI</span><span class="logo-fundas">FUNDAS</span>
                <div class="logo-slogan">CUBIERTAS & MAS</div>
            </div>

            <!-- Datos -->
            <div class="etiqueta-datos-print">
                <div class="dato-row">
                    <span class="dato-label">Cliente:</span>
                    <span class="dato-valor">${pedido.cliente || ''}</span>
                </div>
                <div class="dato-row">
                    <span class="dato-label">Producto:</span>
                    <span class="dato-valor">${pedido.producto || ''}</span>
                </div>
                <div class="dato-row">
                    <span class="dato-label">Piezas Por Caja:</span>
                    <span class="dato-valor">${piezasPorCaja}</span>
                </div>
            </div>

            <!-- Número de Caja -->
            <div class="etiqueta-caja-num">
                <div class="caja-label">Num De Caja</div>
                <div class="caja-numero">${numeroCaja}/ ${numCajas}</div>
            </div>
        </div>
    `;
}

/**
 * Genera el HTML de la etiqueta para impresión
 * Tamaño: 5.1cm x 10.1cm - Estilo Multifundas
 */
function generarHTMLEtiquetaImpresion(pedido, numCajas, piezasEnCaja, numeroCaja) {
    return `
        <div style="
            width: 5.1cm;
            height: 10.1cm;
            padding: 5mm;
            font-family: Arial, sans-serif;
            background: white;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            page-break-after: always;
        ">
            <!-- Logo Multifundas -->
            <div style="text-align: center; margin-bottom: 5mm; padding-bottom: 3mm; border-bottom: 2px solid #e31e24;">
                <div style="font-size: 16pt; font-weight: 900; letter-spacing: -0.5px;">
                    <span style="color: #000;">MULTI</span><span style="color: #e31e24;">FUNDAS</span>
                </div>
                <div style="font-size: 7pt; color: #e31e24; letter-spacing: 2px; margin-top: 1mm;">CUBIERTAS & MAS</div>
            </div>

            <!-- Datos del pedido -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4mm;">
                <div>
                    <div style="font-size: 11pt; font-weight: 700; color: #000;">Cliente:</div>
                    <div style="font-size: 10pt; color: #000; margin-top: 1mm; word-wrap: break-word;">
                        ${pedido.cliente || ''}
                    </div>
                </div>

                <div>
                    <div style="font-size: 11pt; font-weight: 700; color: #000;">Producto:</div>
                    <div style="font-size: 10pt; color: #000; margin-top: 1mm; word-wrap: break-word;">
                        ${pedido.producto || ''}
                    </div>
                </div>

                <div>
                    <div style="font-size: 11pt; font-weight: 700; color: #000;">Piezas Por Caja:</div>
                    <div style="font-size: 10pt; color: #000; margin-top: 1mm;">
                        ${piezasEnCaja}
                    </div>
                </div>
            </div>

            <!-- Número de Caja -->
            <div style="text-align: right; margin-top: auto; padding-top: 5mm;">
                <div style="font-size: 12pt; font-weight: 700; color: #000;">Num De Caja</div>
                <div style="font-size: 18pt; font-weight: 900; color: #000;">${numeroCaja}/ ${numCajas}</div>
            </div>
        </div>
    `;
}

/**
 * Cierra el modal de etiqueta
 */
function cerrarModalEtiqueta() {
    const modal = document.getElementById('modalEtiquetaOverlay');
    if (modal) modal.style.display = 'none';
    operadoraState.pedidoParaEtiqueta = null;
}

/**
 * Genera e imprime las etiquetas
 */
function generarEtiqueta() {
    const pedido = operadoraState.pedidoParaEtiqueta;
    if (!pedido) {
        mostrarToast('Error: No hay pedido seleccionado', 'error');
        return;
    }

    const numCajas = parseInt(document.getElementById('numCajas')?.value) || 1;
    const totalPiezas = pedido.piezasCapturadas;
    const piezasPorCajaBase = Math.floor(totalPiezas / numCajas);
    const residuo = totalPiezas % numCajas;

    // Generar todas las etiquetas
    let etiquetasHTML = '';
    for (let i = 1; i <= numCajas; i++) {
        const piezasEnEsta = i <= residuo ? piezasPorCajaBase + 1 : piezasPorCajaBase;
        etiquetasHTML += generarHTMLEtiquetaImpresion(pedido, numCajas, piezasEnEsta, i);
    }

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        mostrarToast('Habilita las ventanas emergentes para imprimir', 'error');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Etiquetas - Pedido #${pedido.pedidoId}</title>
            <style>
                @page {
                    size: 5.1cm 10.1cm;
                    margin: 0;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        </head>
        <body>
            ${etiquetasHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Imprimir después de cargar
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    // Guardar registro de etiquetas generadas
    const registroEtiquetas = JSON.parse(localStorage.getItem('etiquetas_generadas') || '[]');
    registroEtiquetas.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        pedidoId: pedido.pedidoId,
        cliente: pedido.cliente,
        producto: pedido.producto,
        numCajas: numCajas,
        totalPiezas: totalPiezas,
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        estacionId: CONFIG_ESTACION.id
    });
    localStorage.setItem('etiquetas_generadas', JSON.stringify(registroEtiquetas.slice(0, 500)));

    // Completar la finalización del pedido
    const tiempoTotal = pedido.tiempoProcesoAcumulado || 0;
    completarFinalizacionMulti(pedido.id, tiempoTotal);

    cerrarModalEtiqueta();
    mostrarToast(`${numCajas} etiqueta(s) enviada(s) a impresión`, 'success');
}

/**
 * Agrega una caja personalizada al listado
 */
function agregarCajaPersonalizada() {
    const pedido = operadoraState.pedidoParaEtiqueta;
    if (!pedido) return;

    const lista = document.getElementById('listaCajasPersonalizadas');
    if (!lista) return;

    const numCajas = lista.querySelectorAll('.caja-item').length;
    const nuevaCaja = document.createElement('div');
    nuevaCaja.className = 'caja-item';
    nuevaCaja.dataset.index = numCajas;
    nuevaCaja.innerHTML = `
        <span class="caja-numero">Caja ${numCajas + 1}:</span>
        <input type="number" class="input-piezas-caja" value="0" min="0" onchange="actualizarTotalCajas()">
        <span class="caja-label">piezas</span>
        <button type="button" class="btn-quitar-caja" onclick="quitarCajaPersonalizada(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    lista.appendChild(nuevaCaja);
    actualizarTotalCajas();
}

/**
 * Quita una caja del listado
 */
function quitarCajaPersonalizada(btn) {
    const cajaItem = btn.closest('.caja-item');
    if (cajaItem) {
        cajaItem.remove();
        renumerarCajas();
        actualizarTotalCajas();
    }
}

/**
 * Renumera las cajas después de quitar una
 */
function renumerarCajas() {
    const lista = document.getElementById('listaCajasPersonalizadas');
    if (!lista) return;

    const cajas = lista.querySelectorAll('.caja-item');
    cajas.forEach((caja, index) => {
        caja.dataset.index = index;
        caja.querySelector('.caja-numero').textContent = `Caja ${index + 1}:`;
    });
}

/**
 * Actualiza el total de piezas en cajas
 */
function actualizarTotalCajas() {
    const pedido = operadoraState.pedidoParaEtiqueta;
    if (!pedido) return;

    const lista = document.getElementById('listaCajasPersonalizadas');
    if (!lista) return;

    const inputs = lista.querySelectorAll('.input-piezas-caja');
    let total = 0;
    inputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });

    const totalEl = document.getElementById('totalPiezasEnCajas');
    const advertencia = document.getElementById('advertenciaCajas');
    const piezasTotales = pedido.piezasCapturadas || pedido.piezasMeta || 0;

    if (totalEl) totalEl.textContent = total;

    if (advertencia) {
        if (total !== piezasTotales) {
            advertencia.style.display = 'block';
            if (total < piezasTotales) {
                advertencia.textContent = `Faltan ${piezasTotales - total} piezas por asignar`;
                advertencia.className = 'advertencia-cajas warning';
            } else {
                advertencia.textContent = `Excede por ${total - piezasTotales} piezas`;
                advertencia.className = 'advertencia-cajas error';
            }
        } else {
            advertencia.style.display = 'none';
        }
    }

    // Actualizar preview con la primera caja
    const preview = document.getElementById('etiquetaPreview');
    if (preview && inputs.length > 0) {
        const piezasPrimeraCaja = parseInt(inputs[0].value) || 0;
        preview.innerHTML = generarHTMLEtiquetaPreview(pedido, inputs.length, piezasPrimeraCaja, 1);
    }
}

/**
 * Genera e imprime etiquetas con cajas personalizadas
 */
function generarEtiquetasPersonalizadas() {
    const pedido = operadoraState.pedidoParaEtiqueta;
    if (!pedido) {
        mostrarToast('Error: No hay pedido seleccionado', 'error');
        return;
    }

    const lista = document.getElementById('listaCajasPersonalizadas');
    if (!lista) return;

    const inputs = lista.querySelectorAll('.input-piezas-caja');
    const cajas = [];
    let totalPiezas = 0;

    inputs.forEach((input, index) => {
        const piezas = parseInt(input.value) || 0;
        if (piezas > 0) {
            cajas.push({ numero: index + 1, piezas: piezas });
            totalPiezas += piezas;
        }
    });

    if (cajas.length === 0) {
        mostrarToast('Debe agregar al menos una caja con piezas', 'error');
        return;
    }

    // Generar todas las etiquetas
    let etiquetasHTML = '';
    cajas.forEach((caja, index) => {
        etiquetasHTML += generarHTMLEtiquetaImpresion(pedido, cajas.length, caja.piezas, index + 1);
    });

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        mostrarToast('Habilita las ventanas emergentes para imprimir', 'error');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Etiquetas - Pedido #${pedido.pedidoId}</title>
            <style>
                @page {
                    size: 5.1cm 10.1cm;
                    margin: 0;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        </head>
        <body>
            ${etiquetasHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Imprimir después de cargar
    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    // Guardar registro de etiquetas con detalle de cajas
    const registroEtiquetas = JSON.parse(localStorage.getItem('etiquetas_generadas') || '[]');
    registroEtiquetas.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        pedidoId: pedido.pedidoId,
        cliente: pedido.cliente,
        producto: pedido.producto,
        numCajas: cajas.length,
        cajas: cajas,
        totalPiezas: totalPiezas,
        operadoraId: authState.operadoraActual?.id,
        operadoraNombre: authState.operadoraActual?.nombre,
        estacionId: CONFIG_ESTACION.id
    });
    localStorage.setItem('etiquetas_generadas', JSON.stringify(registroEtiquetas.slice(0, 500)));

    // Completar la finalización del pedido y desasignar automáticamente
    const tiempoTotal = pedido.tiempoProcesoAcumulado || 0;
    completarFinalizacionMulti(pedido.id, tiempoTotal);

    // Desasignar la estación automáticamente
    desasignarEstacionEmpaque();

    cerrarModalEtiqueta();
    mostrarToast(`${cajas.length} etiqueta(s) enviada(s) a impresión - Pedido desasignado`, 'success');
}

/**
 * Desasigna la estación de Empaque/Calidad después de imprimir
 */
function desasignarEstacionEmpaque() {
    const estacionId = CONFIG_ESTACION.id;

    // 1. Limpiar asignaciones_estaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    if (asignaciones[estacionId]) {
        delete asignaciones[estacionId];
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    // 2. Limpiar estado_maquinas
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    if (estadoMaquinas[estacionId]) {
        estadoMaquinas[estacionId] = {
            estado: 'disponible',
            procesoActivo: null,
            pedidoId: null,
            piezasHoy: 0,
            operadores: [],
            ultimaActualizacion: new Date().toISOString()
        };
        localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));
    }

    // 3. Limpiar asignaciones_multi_pedido para esta estación
    const asignacionesMulti = JSON.parse(localStorage.getItem('asignaciones_multi_pedido') || '{}');
    if (asignacionesMulti[estacionId]) {
        delete asignacionesMulti[estacionId];
        localStorage.setItem('asignaciones_multi_pedido', JSON.stringify(asignacionesMulti));
    }

    DEBUG_MODE && console.log('[OPERADORA] Estación desasignada automáticamente:', estacionId);
}

/**
 * Muestra el historial de etiquetas generadas
 */
function mostrarHistorialEtiquetas() {
    const modalOverlay = document.getElementById('modalEtiquetaOverlay');
    const modalBody = document.getElementById('modalEtiquetaBody');

    if (!modalOverlay || !modalBody) return;

    const registroEtiquetas = JSON.parse(localStorage.getItem('etiquetas_generadas') || '[]');
    const estacionId = CONFIG_ESTACION.id;

    // Filtrar etiquetas de esta estación (últimas 50)
    const etiquetasEstacion = registroEtiquetas
        .filter(e => e.estacionId === estacionId)
        .slice(0, 50);

    let listaHTML = '';
    if (etiquetasEstacion.length === 0) {
        listaHTML = '<p class="sin-etiquetas">No hay etiquetas previas</p>';
    } else {
        listaHTML = etiquetasEstacion.map(etiqueta => {
            const fecha = new Date(etiqueta.fecha);
            const fechaStr = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

            // Detalle de cajas
            let cajasDetalle = '';
            if (etiqueta.cajas && etiqueta.cajas.length > 0) {
                cajasDetalle = etiqueta.cajas.map(c => `${c.piezas}pz`).join(', ');
            } else {
                cajasDetalle = `${etiqueta.numCajas} caja(s)`;
            }

            return `
                <div class="historial-etiqueta-item">
                    <div class="historial-etiqueta-info">
                        <div class="historial-pedido">#${etiqueta.pedidoId}</div>
                        <div class="historial-cliente">${etiqueta.cliente || '-'}</div>
                        <div class="historial-producto">${etiqueta.producto || '-'}</div>
                        <div class="historial-cajas">${cajasDetalle} - ${etiqueta.totalPiezas} pzas total</div>
                        <div class="historial-fecha">${fechaStr} ${horaStr}</div>
                    </div>
                    <button type="button" class="btn-reimprimir" onclick="reimprimirEtiqueta(${etiqueta.id})">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    const content = `
        <div class="historial-etiquetas-container">
            <div class="historial-header">
                <h3><i class="fas fa-history"></i> Etiquetas Previas</h3>
                <button type="button" class="btn-volver-etiqueta" onclick="volverAModalEtiqueta()">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
            </div>
            <div class="historial-lista">
                ${listaHTML}
            </div>
            <div class="historial-acciones">
                <button type="button" class="btn-cancelar-etiqueta" onclick="cerrarModalEtiqueta()">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    modalBody.innerHTML = content;
}

/**
 * Vuelve al modal de etiqueta desde el historial
 */
function volverAModalEtiqueta() {
    const pedido = operadoraState.pedidoParaEtiqueta;
    if (pedido) {
        mostrarModalEtiqueta(pedido);
    } else {
        cerrarModalEtiqueta();
    }
}

/**
 * Reimprime una etiqueta del historial
 */
function reimprimirEtiqueta(etiquetaId) {
    const registroEtiquetas = JSON.parse(localStorage.getItem('etiquetas_generadas') || '[]');
    const etiqueta = registroEtiquetas.find(e => e.id === etiquetaId);

    if (!etiqueta) {
        mostrarToast('No se encontró la etiqueta', 'error');
        return;
    }

    // Crear objeto pedido simulado para la impresión
    const pedidoSimulado = {
        pedidoId: etiqueta.pedidoId,
        cliente: etiqueta.cliente,
        producto: etiqueta.producto,
        piezasCapturadas: etiqueta.totalPiezas
    };

    // Generar etiquetas
    let etiquetasHTML = '';
    if (etiqueta.cajas && etiqueta.cajas.length > 0) {
        // Usar cajas personalizadas guardadas
        etiqueta.cajas.forEach((caja, index) => {
            etiquetasHTML += generarHTMLEtiquetaImpresion(pedidoSimulado, etiqueta.cajas.length, caja.piezas, index + 1);
        });
    } else {
        // Formato antiguo: distribución automática
        const numCajas = etiqueta.numCajas || 1;
        const totalPiezas = etiqueta.totalPiezas;
        const piezasPorCajaBase = Math.floor(totalPiezas / numCajas);
        const residuo = totalPiezas % numCajas;

        for (let i = 1; i <= numCajas; i++) {
            const piezasEnEsta = i <= residuo ? piezasPorCajaBase + 1 : piezasPorCajaBase;
            etiquetasHTML += generarHTMLEtiquetaImpresion(pedidoSimulado, numCajas, piezasEnEsta, i);
        }
    }

    // Crear ventana de impresión
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        mostrarToast('Habilita las ventanas emergentes para imprimir', 'error');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reimpresión - Pedido #${etiqueta.pedidoId}</title>
            <style>
                @page {
                    size: 5.1cm 10.1cm;
                    margin: 0;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            </style>
        </head>
        <body>
            ${etiquetasHTML}
        </body>
        </html>
    `);

    printWindow.document.close();

    printWindow.onload = function() {
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    mostrarToast('Reimprimiendo etiquetas...', 'info');
}

// ========================================
// SISTEMA DE INCENTIVOS - PREMIO EN TIEMPO REAL
// ========================================

/**
 * Estado del sistema de incentivos
 */
const incentivosState = {
    tierActual: null,
    premioEstimado: 0,
    premiosSemanales: [],
    intervaloPremio: null
};

/**
 * Obtiene la configuración de incentivos (desde admin o defaults)
 */
function getConfigIncentivosLocal() {
    // Usar la función global si está disponible (cargada desde app.js)
    if (typeof window.getConfigIncentivos === 'function') {
        return window.getConfigIncentivos();
    }
    // Fallback: leer directamente de localStorage
    const saved = localStorage.getItem('erp_config_incentivos');
    if (saved) {
        try { return JSON.parse(saved); } catch(e) {}
    }
    return {
        tiers: [
            { nombre: 'Bronce', minEficiencia: 80, multiplicador: 0.5, color: '#CD7F32', icono: 'fa-medal' },
            { nombre: 'Plata', minEficiencia: 90, multiplicador: 0.75, color: '#C0C0C0', icono: 'fa-medal' },
            { nombre: 'Oro', minEficiencia: 100, multiplicador: 1.0, color: '#FFD700', icono: 'fa-star' },
            { nombre: 'Diamante', minEficiencia: 110, multiplicador: 1.5, color: '#B9F2FF', icono: 'fa-gem' }
        ],
        premioBaseDefault: 100,
        metaEquipoSupervisora: 90,
        multiplicadorSupervisora: 1.0,
        premioPuntualidadDefault: 50
    };
}

/**
 * Calcula el tier correspondiente a una eficiencia dada
 */
function calcularTierLocal(eficiencia) {
    if (typeof window.calcularTierPorEficiencia === 'function') {
        return window.calcularTierPorEficiencia(eficiencia);
    }
    const config = getConfigIncentivosLocal();
    const tiersSorted = [...config.tiers].sort((a, b) => b.minEficiencia - a.minEficiencia);
    for (const tier of tiersSorted) {
        if (eficiencia >= tier.minEficiencia) {
            return tier;
        }
    }
    return null;
}

/**
 * Obtiene el premio base de la operadora actual
 */
function getPremioBase() {
    const operadora = authState.operadoraActual;
    if (operadora && operadora.premioProduccion && operadora.premioProduccion > 0) {
        return operadora.premioProduccion;
    }
    // Fallback: buscar en personal de localStorage
    const personal = JSON.parse(localStorage.getItem('erp_personal') || '[]');
    const empleado = personal.find(p => p.id === operadora?.id || p.numEmpleado === operadora?.numEmpleado);
    if (empleado && empleado.premioProduccion > 0) {
        return empleado.premioProduccion;
    }
    // Usar default de config
    return getConfigIncentivosLocal().premioBaseDefault;
}

/**
 * Actualiza el widget de premio en tiempo real
 * Se llama cada 30 segundos junto con actualizarIndicadorDesempeno()
 */
function actualizarPremioWidget() {
    const eficiencia = calcularEficienciaActual();
    const premioBase = getPremioBase();
    const tier = calcularTierLocal(eficiencia);
    const config = getConfigIncentivosLocal();

    // Calcular premio estimado
    let premioEstimado = 0;
    if (tier) {
        premioEstimado = Math.round(premioBase * tier.multiplicador);
    }
    incentivosState.premioEstimado = premioEstimado;

    // Actualizar monto
    const montoEl = document.getElementById('premioMonto');
    if (montoEl) {
        montoEl.textContent = '$' + premioEstimado;
        montoEl.style.color = tier ? tier.color : '#999';
    }

    // Actualizar tier badge
    const tierBadgeEl = document.getElementById('premioTierBadge');
    if (tierBadgeEl) {
        if (tier) {
            tierBadgeEl.innerHTML = '<i class="fas ' + tier.icono + '"></i> ' + tier.nombre;
            tierBadgeEl.style.background = tier.color + '22';
            tierBadgeEl.style.color = tier.color;
            tierBadgeEl.style.borderColor = tier.color;
        } else {
            tierBadgeEl.innerHTML = '<i class="fas fa-minus"></i> Sin nivel';
            tierBadgeEl.style.background = '#f0f0f0';
            tierBadgeEl.style.color = '#999';
            tierBadgeEl.style.borderColor = '#ddd';
        }
    }

    // Actualizar barra de progreso hacia siguiente tier
    const barraFill = document.getElementById('premioBarraFill');
    const siguienteEl = document.getElementById('premioSiguiente');
    if (barraFill && siguienteEl) {
        const tiersSorted = [...config.tiers].sort((a, b) => a.minEficiencia - b.minEficiencia);
        let siguienteTier = null;

        if (!tier) {
            // No tiene tier, el siguiente es el primero
            siguienteTier = tiersSorted[0];
        } else {
            // Buscar el tier siguiente al actual
            const idxActual = tiersSorted.findIndex(t => t.nombre === tier.nombre);
            if (idxActual < tiersSorted.length - 1) {
                siguienteTier = tiersSorted[idxActual + 1];
            }
        }

        if (siguienteTier) {
            const minActual = tier ? tier.minEficiencia : 0;
            const rango = siguienteTier.minEficiencia - minActual;
            const progreso = rango > 0 ? Math.min(100, Math.max(0, ((eficiencia - minActual) / rango) * 100)) : 0;
            barraFill.style.width = progreso + '%';
            barraFill.style.background = siguienteTier.color;

            // Calcular piezas faltantes para siguiente tier
            const piezasFaltantes = calcularPiezasParaTier(siguienteTier.minEficiencia);
            if (piezasFaltantes > 0) {
                siguienteEl.innerHTML = '<i class="fas fa-arrow-up" style="color:' + siguienteTier.color + '"></i> ' +
                    'Te faltan <strong>' + piezasFaltantes + ' piezas</strong> para <span style="color:' + siguienteTier.color + '">' + siguienteTier.nombre + '</span>';
            } else {
                siguienteEl.innerHTML = '';
            }
        } else {
            // Ya está en el tier más alto
            barraFill.style.width = '100%';
            barraFill.style.background = tier ? tier.color : '#ddd';
            siguienteEl.innerHTML = '<i class="fas fa-crown" style="color:' + (tier ? tier.color : '#FFD700') + '"></i> <strong>Nivel máximo alcanzado</strong>';
        }
    }

    // Actualizar proyección
    const proyeccionEl = document.getElementById('premioProyeccion');
    if (proyeccionEl && operadoraState.procesoIniciado) {
        proyeccionEl.innerHTML = '<i class="fas fa-chart-line"></i> ' +
            '<span>A este ritmo ganarás <strong>$' + premioEstimado + '</strong> hoy</span>';
    }

    // Actualizar badge en header
    actualizarNivelBadgeHeader(tier);

    // Verificar cambio de tier para celebración
    if (tier && incentivosState.tierActual && tier.nombre !== incentivosState.tierActual) {
        // Verificar si subió de tier
        const tierAnterior = config.tiers.find(t => t.nombre === incentivosState.tierActual);
        if (tierAnterior && tier.minEficiencia > tierAnterior.minEficiencia) {
            celebrarCambioTier(tier, premioEstimado);
        }
    }
    incentivosState.tierActual = tier ? tier.nombre : null;
}

/**
 * Calcula cuántas piezas faltan para alcanzar una eficiencia objetivo
 */
function calcularPiezasParaTier(eficienciaObjetivo) {
    if (!operadoraState.procesoIniciado || !operadoraState.tiempoProcesoInicio) return 0;

    let tiempoTrabajadoMs = operadoraState.tiempoProcesoAcumulado;
    if (!operadoraState.procesoEnPausa || (operadoraState.motivoPausaActual && !operadoraState.motivoPausaActual.detieneTiempo)) {
        tiempoTrabajadoMs += (new Date() - operadoraState.tiempoProcesoInicio);
    }
    const minutosTrabajados = tiempoTrabajadoMs / 60000;
    if (minutosTrabajados < 1) return 0;

    const piezasNecesarias = Math.ceil((eficienciaObjetivo / 100) * minutosTrabajados * operadoraState.metaPorMinuto);
    const faltantes = piezasNecesarias - operadoraState.piezasCapturadas;
    return Math.max(0, faltantes);
}

/**
 * Actualiza el badge de nivel en el header
 */
function actualizarNivelBadgeHeader(tier) {
    const badgeEl = document.getElementById('nivelBadgeHeader');
    if (!badgeEl) return;

    if (tier && operadoraState.procesoIniciado) {
        badgeEl.style.display = 'inline-flex';
        badgeEl.innerHTML = '<i class="fas ' + tier.icono + '"></i> ' + tier.nombre;
        badgeEl.style.background = tier.color + '22';
        badgeEl.style.color = tier.color;
        badgeEl.style.borderColor = tier.color;
    } else {
        badgeEl.style.display = 'none';
    }
}

/**
 * Celebración al subir de tier
 */
function celebrarCambioTier(nuevoTier, premioEstimado) {
    // Usar el sistema de celebraciones existente
    if (typeof mostrarLogroCelebracion === 'function') {
        mostrarLogroCelebracion({
            titulo: '¡Subiste a ' + nuevoTier.nombre + '!',
            mensaje: 'Tu premio estimado: $' + premioEstimado,
            icono: nuevoTier.icono,
            color: nuevoTier.color
        });
    }

    // Toast adicional con info del premio
    mostrarToast('¡Nivel ' + nuevoTier.nombre + '! Premio estimado: $' + premioEstimado, 'success');

    // Sonido de celebración
    if (typeof reproducirSonido === 'function') {
        reproducirSonido('meta');
    }
}

/**
 * Guarda el premio del día actual para historial semanal
 */
function guardarPremioDelDia(eficiencia, premioGanado, tierNombre) {
    const operadoraId = authState.operadoraActual?.id;
    if (!operadoraId) return;

    const hoy = new Date();
    const semanaKey = 'premios_' + operadoraId + '_' + getWeekKey(hoy);

    const premiosSemanales = JSON.parse(localStorage.getItem(semanaKey) || '[]');

    const fechaHoy = hoy.toISOString().split('T')[0];
    const existente = premiosSemanales.findIndex(p => p.fecha === fechaHoy);

    const datosDia = {
        fecha: fechaHoy,
        eficiencia: eficiencia,
        tier: tierNombre || 'Sin bono',
        premio: premioGanado,
        piezas: operadoraState.piezasCapturadas,
        timestamp: hoy.toISOString()
    };

    if (existente >= 0) {
        premiosSemanales[existente] = datosDia;
    } else {
        premiosSemanales.push(datosDia);
    }

    localStorage.setItem(semanaKey, JSON.stringify(premiosSemanales));
}

/**
 * Obtiene la clave de semana (YYYY-WW)
 */
function getWeekKey(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return d.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

/**
 * Muestra el modal "Mis Ganancias" con historial semanal
 */
function mostrarMisGanancias() {
    const operadoraId = authState.operadoraActual?.id;
    if (!operadoraId) {
        mostrarToast('Inicia sesión para ver tus ganancias', 'warning');
        return;
    }

    const hoy = new Date();
    const semanaKey = 'premios_' + operadoraId + '_' + getWeekKey(hoy);
    const premiosSemanales = JSON.parse(localStorage.getItem(semanaKey) || '[]');

    // Calcular totales
    const totalSemana = premiosSemanales.reduce((sum, p) => sum + (p.premio || 0), 0);
    const mejorDia = premiosSemanales.reduce((best, p) => (p.premio || 0) > (best.premio || 0) ? p : best, { premio: 0 });
    const eficienciaPromedio = premiosSemanales.length > 0
        ? Math.round(premiosSemanales.reduce((sum, p) => sum + (p.eficiencia || 0), 0) / premiosSemanales.length)
        : 0;

    // Premio de hoy (si hay proceso activo)
    const premioHoy = incentivosState.premioEstimado || 0;

    // Días de la semana para la gráfica
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const maxPremio = Math.max(...premiosSemanales.map(p => p.premio || 0), premioHoy, 1);

    const content = `
        <div class="ganancias-modal">
            <div class="ganancias-resumen">
                <div class="ganancia-stat principal">
                    <div class="ganancia-valor">$${totalSemana + premioHoy}</div>
                    <div class="ganancia-label">Total esta semana</div>
                </div>
                <div class="ganancias-stats-grid">
                    <div class="ganancia-stat">
                        <div class="ganancia-valor">$${premioHoy}</div>
                        <div class="ganancia-label">Hoy (estimado)</div>
                    </div>
                    <div class="ganancia-stat">
                        <div class="ganancia-valor">${eficienciaPromedio}%</div>
                        <div class="ganancia-label">Eficiencia promedio</div>
                    </div>
                    <div class="ganancia-stat">
                        <div class="ganancia-valor">${premiosSemanales.length + (premioHoy > 0 ? 1 : 0)}</div>
                        <div class="ganancia-label">Días con premio</div>
                    </div>
                </div>
            </div>

            <div class="ganancias-grafica">
                <h5><i class="fas fa-chart-bar"></i> Premios de la semana</h5>
                <div class="grafica-barras">
                    ${diasSemana.map((dia, idx) => {
                        const fechaDia = obtenerFechaDiaSemana(idx);
                        const datoDia = premiosSemanales.find(p => p.fecha === fechaDia);
                        const esHoy = fechaDia === hoy.toISOString().split('T')[0];
                        const premio = esHoy ? premioHoy : (datoDia ? datoDia.premio : 0);
                        const altura = maxPremio > 0 ? (premio / maxPremio) * 100 : 0;
                        const tier = esHoy ? (incentivosState.tierActual || '') : (datoDia?.tier || '');
                        const config = getConfigIncentivosLocal();
                        const tierObj = config.tiers.find(t => t.nombre === tier);
                        const color = tierObj ? tierObj.color : '#e0e0e0';
                        return `
                            <div class="barra-dia ${esHoy ? 'hoy' : ''}">
                                <div class="barra-valor">$${premio}</div>
                                <div class="barra-fill" style="height:${Math.max(4, altura)}%;background:${premio > 0 ? color : '#e0e0e0'}"></div>
                                <div class="barra-label">${dia}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="ganancias-detalle">
                <h5><i class="fas fa-list"></i> Detalle por día</h5>
                <table class="ganancias-tabla">
                    <thead>
                        <tr><th>Día</th><th>Piezas</th><th>Eficiencia</th><th>Nivel</th><th>Premio</th></tr>
                    </thead>
                    <tbody>
                        ${premiosSemanales.length > 0 ? premiosSemanales.map(p => {
                            const tierObj = getConfigIncentivosLocal().tiers.find(t => t.nombre === p.tier);
                            return `
                                <tr>
                                    <td>${formatearFechaCorta(p.fecha)}</td>
                                    <td>${p.piezas || 0}</td>
                                    <td>${p.eficiencia}%</td>
                                    <td><span style="color:${tierObj ? tierObj.color : '#999'}">${p.tier}</span></td>
                                    <td><strong>$${p.premio}</strong></td>
                                </tr>
                            `;
                        }).join('') : '<tr><td colspan="5" style="text-align:center;color:#999">Sin datos esta semana</td></tr>'}
                    </tbody>
                </table>
            </div>

            ${mejorDia.premio > 0 ? `
                <div class="ganancias-mejor-dia">
                    <i class="fas fa-trophy" style="color:#FFD700"></i>
                    Mejor día: <strong>${formatearFechaCorta(mejorDia.fecha)}</strong> — $${mejorDia.premio} (${mejorDia.eficiencia}% eficiencia)
                </div>
            ` : ''}
        </div>
    `;

    mostrarModal('Mis Ganancias', content, [
        { text: 'Cerrar', class: 'btn-primary', onclick: 'cerrarModal()' }
    ]);
}

/**
 * Obtiene la fecha (YYYY-MM-DD) de un día de la semana actual (0=Lun, 5=Sab)
 */
function obtenerFechaDiaSemana(diaSemana) {
    const hoy = new Date();
    const diaActual = (hoy.getDay() + 6) % 7; // 0=Lun
    const diff = diaSemana - diaActual;
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + diff);
    return fecha.toISOString().split('T')[0];
}

/**
 * Formatea fecha corta (YYYY-MM-DD -> "Lun 13")
 */
function formatearFechaCorta(fechaStr) {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const fecha = new Date(fechaStr + 'T12:00:00');
    return dias[fecha.getDay()] + ' ' + fecha.getDate();
}

/**
 * Agrega premio al resumen de fin de proceso
 * Se llama desde finalizarProceso() para mostrar el premio ganado
 */
function obtenerResumenPremio() {
    const eficiencia = calcularEficienciaActual();
    const premioBase = getPremioBase();
    const tier = calcularTierLocal(eficiencia);
    const premioGanado = tier ? Math.round(premioBase * tier.multiplicador) : 0;

    // Guardar en historial semanal
    guardarPremioDelDia(eficiencia, premioGanado, tier ? tier.nombre : null);

    return {
        eficiencia: eficiencia,
        tier: tier,
        premioGanado: premioGanado,
        premioBase: premioBase
    };
}

/**
 * Resetea el widget de premio a estado inicial
 */
function resetearPremioWidget() {
    incentivosState.tierActual = null;
    incentivosState.premioEstimado = 0;

    const montoEl = document.getElementById('premioMonto');
    if (montoEl) { montoEl.textContent = '$0'; montoEl.style.color = '#999'; }

    const tierBadgeEl = document.getElementById('premioTierBadge');
    if (tierBadgeEl) {
        tierBadgeEl.innerHTML = '<i class="fas fa-minus"></i> Sin nivel';
        tierBadgeEl.style.background = '#f0f0f0';
        tierBadgeEl.style.color = '#999';
        tierBadgeEl.style.borderColor = '#ddd';
    }

    const barraFill = document.getElementById('premioBarraFill');
    if (barraFill) barraFill.style.width = '0%';

    const siguienteEl = document.getElementById('premioSiguiente');
    if (siguienteEl) siguienteEl.innerHTML = '';

    const proyeccionEl = document.getElementById('premioProyeccion');
    if (proyeccionEl) {
        proyeccionEl.innerHTML = '<i class="fas fa-chart-line"></i> <span>Inicia tu proceso para ver tu premio estimado</span>';
    }

    // Ocultar badge header
    const badgeEl = document.getElementById('nivelBadgeHeader');
    if (badgeEl) badgeEl.style.display = 'none';
}
