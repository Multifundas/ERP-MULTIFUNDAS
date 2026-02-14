// ========================================
// PANEL SUPERVISORA - JAVASCRIPT
// ========================================

// Estado global
var DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const supervisoraState = {
    layout: null,
    maquinas: {},
    selectedEstacion: null,
    zoom: 1,
    pedidosHoy: [],
    operadores: [],
    procesos: [],
    refreshInterval: null,
    alertasInterval: null,
    theme: 'night',
    pedidoFilter: 'todos',
    expandedPedidos: new Set(),
    alertasActivas: new Set(),
    colaProcesosOperadores: {}, // { operadorId: [{ proceso, pedido, tiempoEstimado, horaInicio }, ...] }
    tiemposMuertos: {
        activos: {},      // { estacionId: { inicio, motivo, descripcion } }
        historial: []     // Array de registros completados
    }
};

// Motivos predefinidos de tiempo muerto
const MOTIVOS_TIEMPO_MUERTO = [
    { id: 'sin_material', nombre: 'Sin material', icono: 'fa-box-open', color: '#f59e0b' },
    { id: 'maquina_descompuesta', nombre: 'Máquina descompuesta', icono: 'fa-tools', color: '#ef4444' },
    { id: 'esperando_instrucciones', nombre: 'Esperando instrucciones', icono: 'fa-question-circle', color: '#3b82f6' },
    { id: 'cambio_proceso', nombre: 'Cambio de proceso', icono: 'fa-exchange-alt', color: '#8b5cf6' },
    { id: 'descanso', nombre: 'Descanso programado', icono: 'fa-coffee', color: '#10b981' },
    { id: 'capacitacion', nombre: 'Capacitación', icono: 'fa-graduation-cap', color: '#06b6d4' },
    { id: 'mantenimiento', nombre: 'Mantenimiento preventivo', icono: 'fa-wrench', color: '#6366f1' },
    { id: 'falta_operadora', nombre: 'Falta de operadora', icono: 'fa-user-slash', color: '#ec4899' },
    { id: 'problema_calidad', nombre: 'Problema de calidad', icono: 'fa-exclamation-triangle', color: '#f97316' },
    { id: 'otro', nombre: 'Otro', icono: 'fa-ellipsis-h', color: '#6b7280' }
];

// ========================================
// INICIALIZACION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    dbReady.then(() => {
        loadThemePreference();
        loadLayoutFromEditor();
        loadDataFromERP();
        initRefreshInterval();
        initKeyboardShortcuts();
        initAlertasProximoTermino();
        cargarColaProcesos();
        cargarTiemposMuertos();

        // Verificar que el mapa se renderizó correctamente después de la carga inicial
        setTimeout(() => {
            const mapEl = document.getElementById('plantMap');
            if (mapEl && mapEl.children.length === 0 && supervisoraState.layout) {
                console.warn('[SUPERVISORA] Mapa vacío después de init, re-renderizando...');
                renderLayoutInSupervisora(supervisoraState.layout);
                renderPedidosList();
                renderOperadoresList();
                updateStats();
            }
        }, 500);
    });
});

// ========================================
// TEMA DIA/NOCHE
// ========================================

function loadThemePreference() {
    const saved = localStorage.getItem('supervisora_theme');
    if (saved) {
        supervisoraState.theme = saved;
        applyTheme(saved);
    }
}

function toggleTheme() {
    const newTheme = supervisoraState.theme === 'night' ? 'day' : 'night';
    supervisoraState.theme = newTheme;
    localStorage.setItem('supervisora_theme', newTheme);
    applyTheme(newTheme);
}

function applyTheme(theme) {
    const body = document.body;
    const track = document.getElementById('themeTrack');

    if (theme === 'day') {
        body.classList.add('day-mode');
        track?.classList.add('day');
    } else {
        body.classList.remove('day-mode');
        track?.classList.remove('day');
    }
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            selectEstacion(null);
        }
        if (e.key === 'r' && !e.ctrlKey) {
            refreshData();
        }
        if (e.key === 'f' && !e.ctrlKey) {
            toggleFullscreen();
        }
    });
}

function initRefreshInterval() {
    // Actualizar cada 30 segundos
    supervisoraState.refreshInterval = setInterval(() => {
        refreshData();
    }, 30000);
}

// ========================================
// CARGAR LAYOUT DESDE EDITOR
// ========================================

// Layout por defecto de la planta
const DEFAULT_LAYOUT = {"version":"1.0","canvasWidth":1200,"canvasHeight":700,"elements":[{"id":"AC1","type":"mesa","name":"Mesa Corte Volumen","x":840,"y":540,"width":320,"height":80,"color":"#3b82f6","operadorId":null,"operadorNombre":""},{"id":"AC2","type":"mesa","name":"Mesa Corte Fundas","x":840,"y":440,"width":320,"height":80,"color":"#10b981","operadorId":null,"operadorNombre":""},{"id":"DF1","type":"mesa","name":"DOBLADO FUNDAS","x":840,"y":280,"width":160,"height":140,"color":"#f59e0b","operadorId":null,"operadorNombre":""},{"id":"B1","type":"area","name":"CORTE DE BIES","x":1020,"y":280,"width":150,"height":100,"color":"#ef4444","operadorId":null,"operadorNombre":""},{"id":"EX1","type":"area","name":"EX1","x":500,"y":20,"width":260,"height":40,"color":"#8b5cf6","operadorId":null,"operadorNombre":""},{"id":"C1","type":"costura","name":"C1","x":720,"y":580,"width":80,"height":80,"color":"#ec4899","operadorId":null,"operadorNombre":""},{"id":"C2","type":"costura","name":"C2","x":720,"y":480,"width":80,"height":80,"color":"#06b6d4","operadorId":null,"operadorNombre":""},{"id":"C3","type":"costura","name":"C3","x":720,"y":380,"width":80,"height":80,"color":"#64748b","operadorId":null,"operadorNombre":""},{"id":"C4","type":"costura","name":"C4","x":720,"y":280,"width":80,"height":80,"color":"#3b82f6","operadorId":null,"operadorNombre":""},{"id":"C5","type":"costura","name":"C5","x":720,"y":180,"width":80,"height":80,"color":"#10b981","operadorId":null,"operadorNombre":""},{"id":"C6","type":"costura","name":"C6","x":600,"y":580,"width":80,"height":80,"color":"#f59e0b","operadorId":null,"operadorNombre":""},{"id":"C7","type":"costura","name":"C7","x":600,"y":480,"width":80,"height":80,"color":"#ef4444","operadorId":null,"operadorNombre":""},{"id":"C8","type":"costura","name":"C8","x":600,"y":380,"width":80,"height":80,"color":"#8b5cf6","operadorId":null,"operadorNombre":""},{"id":"C9","type":"costura","name":"C9","x":600,"y":280,"width":80,"height":80,"color":"#ec4899","operadorId":null,"operadorNombre":""},{"id":"C10","type":"costura","name":"C10","x":600,"y":180,"width":80,"height":80,"color":"#06b6d4","operadorId":null,"operadorNombre":""},{"id":"C12","type":"costura","name":"C12","x":480,"y":580,"width":80,"height":80,"color":"#3b82f6","operadorId":null,"operadorNombre":""},{"id":"C13","type":"costura","name":"C13","x":480,"y":480,"width":80,"height":80,"color":"#10b981","operadorId":null,"operadorNombre":""},{"id":"C14","type":"costura","name":"C14","x":480,"y":380,"width":80,"height":80,"color":"#f59e0b","operadorId":null,"operadorNombre":""},{"id":"C15","type":"costura","name":"C15","x":480,"y":280,"width":80,"height":80,"color":"#ef4444","operadorId":null,"operadorNombre":""},{"id":"C16","type":"costura","name":"C16","x":480,"y":180,"width":80,"height":80,"color":"#8b5cf6","operadorId":null,"operadorNombre":""},{"id":"C17","type":"costura","name":"C17","x":480,"y":80,"width":80,"height":80,"color":"#ec4899","operadorId":null,"operadorNombre":""},{"id":"S1","type":"area","name":"SERIGRAFIA","x":20,"y":520,"width":240,"height":160,"color":"#06b6d4","operadorId":null,"operadorNombre":""},{"id":"E1","type":"mesa","name":"Mesa 4","x":40,"y":100,"width":100,"height":400,"color":"#64748b","operadorId":null,"operadorNombre":""},{"id":"C18","type":"costura","name":"C18","x":600,"y":80,"width":80,"height":80,"color":"#3b82f6","operadorId":null,"operadorNombre":""},{"id":"MA1","type":"area","name":"M1","x":40,"y":20,"width":100,"height":60,"color":"#3b82f6","operadorId":null,"operadorNombre":""}]};

function loadLayoutFromEditor() {
    let saved = localStorage.getItem('planta_layout');

    if (!saved) {
        // Usar layout por defecto y guardarlo en localStorage
        localStorage.setItem('planta_layout', JSON.stringify(DEFAULT_LAYOUT));
        saved = JSON.stringify(DEFAULT_LAYOUT);
    }

    try {
        supervisoraState.layout = JSON.parse(saved);
        // El renderizado se hace despues de cargar los datos del ERP
        // para que las estaciones muestren los operadores asignados
    } catch (e) {
        console.error('Error cargando layout:', e);
        showNoLayoutMessage();
    }
}

function showNoLayoutMessage() {
    document.getElementById('plantMap').innerHTML = `
        <div class="no-layout">
            <i class="fas fa-drafting-compass"></i>
            <h3>No hay layout configurado</h3>
            <p>Ve al Editor de Layout para disenar tu planta</p>
            <a href="layout-editor.html" class="btn btn-primary">
                <i class="fas fa-edit"></i> Abrir Editor
            </a>
        </div>
    `;
}

function renderLayoutInSupervisora(layout) {
    const container = document.getElementById('plantMap');
    if (!container) {
        console.warn('[SUPERVISORA] plantMap no encontrado en el DOM, reintentando...');
        setTimeout(() => renderLayoutInSupervisora(layout), 200);
        return;
    }
    if (!layout || !layout.elements) {
        console.warn('[SUPERVISORA] Layout inválido');
        return;
    }

    container.style.width = layout.canvasWidth + 'px';
    container.style.height = layout.canvasHeight + 'px';
    container.innerHTML = '';

    // Colores por tipo de area
    const areaColors = {
        'costura': { bg: 'rgba(102, 126, 234, 0.08)', border: '#667eea', label: 'COSTURA' },
        'corte': { bg: 'rgba(236, 72, 153, 0.08)', border: '#ec4899', label: 'CORTE' },
        'empaque': { bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981', label: 'EMPAQUE' },
        'calidad': { bg: 'rgba(245, 158, 11, 0.08)', border: '#f59e0b', label: 'CALIDAD' },
        'almacen': { bg: 'rgba(139, 92, 246, 0.08)', border: '#8b5cf6', label: 'ALMACEN' },
        'default': { bg: 'rgba(107, 114, 128, 0.08)', border: '#6b7280', label: 'AREA' }
    };

    // Iconos por tipo
    const tipoIconos = {
        'costura': 'fa-tshirt',
        'mesa': 'fa-table',
        'area': 'fa-vector-square',
        'estacion': 'fa-desktop',
        'corte': 'fa-cut',
        'empaque': 'fa-box',
        'calidad': 'fa-check-circle'
    };

    // Primero renderizar las areas (fondo)
    const areas = layout.elements.filter(e => e.type === 'area');
    const estaciones = layout.elements.filter(e => e.type !== 'area');

    // Renderizar areas como zonas de fondo
    areas.forEach(element => {
        const areaType = detectAreaType(element.name || element.id);
        const colors = areaColors[areaType] || areaColors.default;

        const areaEl = document.createElement('div');
        areaEl.className = 'plant-zone';
        areaEl.style.cssText = `
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            background: ${colors.bg};
            border: 2px dashed ${colors.border};
            border-radius: 12px;
            z-index: 1;
        `;

        areaEl.innerHTML = `
            <div class="zone-label" style="
                position: absolute;
                top: -12px;
                left: 15px;
                background: ${colors.border};
                color: #fff;
                padding: 3px 12px;
                border-radius: 10px;
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                box-shadow: 0 2px 8px ${colors.border}40;
            ">${S(element.name || colors.label)}</div>
            <div class="zone-stats" style="
                position: absolute;
                bottom: 8px;
                right: 12px;
                display: flex;
                gap: 10px;
                font-size: 0.7rem;
                color: ${colors.border};
            ">
                <span><i class="fas fa-users"></i> <span class="zone-operadores">0</span></span>
                <span><i class="fas fa-box"></i> <span class="zone-piezas">0</span></span>
            </div>
        `;

        container.appendChild(areaEl);
    });

    // Renderizar estaciones con diseño mejorado
    estaciones.forEach(element => {
        // Inicializar estado si no existe
        if (!supervisoraState.maquinas[element.id]) {
            supervisoraState.maquinas[element.id] = {
                id: element.id,
                tipo: element.type,
                nombre: element.name,
                operadores: [],  // Array de { id, nombre }
                procesoId: null,
                procesoNombre: '',
                pedidoId: null,
                estado: 'inactivo',
                piezasHoy: 0,
                ultimaActividad: null
            };
        } else {
            // Migrar estructura antigua (operadorId) a nueva (operadores[])
            const m = supervisoraState.maquinas[element.id];
            if (!m.operadores) {
                m.operadores = [];
                if (m.operadorId && m.operadorNombre) {
                    m.operadores.push({ id: m.operadorId, nombre: m.operadorNombre });
                }
            }
        }

        const maquinaState = supervisoraState.maquinas[element.id];
        const icono = tipoIconos[element.type] || 'fa-cog';

        const el = document.createElement('div');
        el.className = `estacion-element ${element.type} ${maquinaState.estado}`;
        el.id = 'estacion-' + element.id;
        el.setAttribute('data-estado', maquinaState.estado);
        el.style.cssText = `
            position: absolute;
            left: ${element.x}px;
            top: ${element.y}px;
            width: ${element.width}px;
            height: ${element.height}px;
            z-index: 10;
        `;

        // Eventos drag & drop
        el.setAttribute('ondragover', 'allowDrop(event)');
        el.setAttribute('ondrop', `dropOnEstacion(event, '${element.id}')`);

        // Calcular progreso si hay pedido asignado
        let progresoHTML = '';
        if (maquinaState.pedidoId) {
            const pedido = supervisoraState.pedidosHoy.find(p => p.id === maquinaState.pedidoId);
            if (pedido) {
                const prod = pedido.productos?.[0];
                const cantidad = prod?.cantidad || pedido.cantidad || 100;
                const completadas = prod?.completadas || maquinaState.piezasHoy || 0;
                const progreso = Math.min(100, Math.round((completadas / cantidad) * 100));
                progresoHTML = `
                    <div class="estacion-progress-container">
                        <div class="estacion-progress-bar" style="width: ${progreso}%"></div>
                        <span class="estacion-progress-text">${progreso}%</span>
                    </div>
                `;
            }
        }

        // Indicador de actividad animado
        const activityIndicator = maquinaState.estado === 'activo' ?
            '<div class="activity-pulse"></div>' : '';

        // Obtener info de procesos simultáneos y estado de trabajo
        // (debe ir antes del bloque de operadores que usa estaTrabajando)
        const asignacionesEstaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
        const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
        const asignacionEst = asignacionesEstaciones[element.id];
        const estadoMaquinaLS = estadoMaquinas[element.id];

        const modoSimultaneo = asignacionEst?.modoSimultaneo || estadoMaquinaLS?.modoSimultaneo;
        const procesosSimultaneos = estadoMaquinaLS?.procesosSimultaneos || [];
        const estaTrabajando = estadoMaquinaLS?.estado === 'trabajando' || estadoMaquinaLS?.procesoActivo;

        // Generar HTML para múltiples operadores
        const operadoresCount = maquinaState.operadores?.length || 0;
        let operadoresHTML = '';

        if (operadoresCount > 0) {
            // Calcular rendimiento del operador en esta estación
            const estadoEst = estadoMaquinas[element.id];
            const piezasRealizadas = estadoEst?.piezasHoy || maquinaState.piezasHoy || 0;
            const pedidoAsignado = maquinaState.pedidoId ? supervisoraState.pedidosHoy.find(p => p.id === maquinaState.pedidoId) : null;
            const cantidadObjetivo = pedidoAsignado?.productos?.[0]?.cantidad || pedidoAsignado?.cantidad || 0;
            const avanceOp = cantidadObjetivo > 0 ? Math.min(100, Math.round((piezasRealizadas / cantidadObjetivo) * 100)) : 0;

            // Semáforo de rendimiento basado en piezas esperadas por tiempo transcurrido
            let semaforo = 'gris'; // sin datos
            if (cantidadObjetivo > 0 && piezasRealizadas > 0) {
                const rendimiento = avanceOp; // simplificado: % completado como proxy
                if (rendimiento >= 85) semaforo = 'verde';
                else if (rendimiento >= 70) semaforo = 'amarillo';
                else semaforo = 'rojo';
            } else if (maquinaState.estado === 'activo' || estaTrabajando) {
                semaforo = 'amarillo'; // activo pero sin piezas aún
            }

            operadoresHTML = maquinaState.operadores.map(op => `
                <div class="operador-chip" data-operador-id="${op.id}" title="${S(op.nombre)} - ${avanceOp}%">
                    <span class="operador-iniciales">${S(getIniciales(op.nombre))}</span>
                    <span class="operador-semaforo ${semaforo}"></span>
                    ${cantidadObjetivo > 0 ? `<div class="operador-mini-bar"><div class="operador-mini-fill" style="width:${avanceOp}%"></div></div>` : ''}
                    <button class="remove-operador" onclick="event.stopPropagation(); removeOperadorFromEstacion('${S(element.id)}', ${op.id})" title="Quitar">&times;</button>
                </div>
            `).join('');
        } else {
            operadoresHTML = '<span class="sin-operador"><i class="fas fa-user-plus"></i></span>';
        }

        // Agregar clase si tiene múltiples operadores
        if (operadoresCount > 1) {
            el.classList.add('multi-operadores');
        }

        // Verificar si tiene tiempo muerto activo
        const tiempoMuertoActivo = supervisoraState.tiemposMuertos.activos[element.id];
        let tiempoMuertoHTML = '';

        if (tiempoMuertoActivo) {
            const inicio = new Date(tiempoMuertoActivo.inicio);
            const ahora = new Date();
            const duracionMin = Math.floor((ahora - inicio) / 60000);
            el.classList.add('tiene-tiempo-muerto');

            tiempoMuertoHTML = `
                <div class="estacion-tiempo-muerto" style="border-color: ${tiempoMuertoActivo.motivoColor}">
                    <div class="tm-indicator" style="background: ${tiempoMuertoActivo.motivoColor}">
                        <i class="fas ${tiempoMuertoActivo.motivoIcono}"></i>
                    </div>
                    <div class="tm-info">
                        <span class="tm-motivo">${tiempoMuertoActivo.motivoNombre}</span>
                        <span class="tm-tiempo">${duracionMin} min</span>
                    </div>
                </div>
            `;
        }

        // Determinar estado de trabajo para colores
        let claseTrabajoEstacion = '';
        let iconoTrabajo = '';
        if (maquinaState.procesoNombre || procesosSimultaneos.length > 0) {
            if (estaTrabajando || maquinaState.piezasHoy > 0) {
                claseTrabajoEstacion = 'trabajando-activo';
                iconoTrabajo = '<i class="fas fa-check-circle estado-trabajo verde"></i>';
            } else {
                claseTrabajoEstacion = 'asignado-sin-iniciar';
                iconoTrabajo = '<i class="fas fa-hourglass-half estado-trabajo naranja"></i>';
            }
        }

        // HTML para procesos (incluyendo simultáneos)
        let procesosHTML = '';
        if (modoSimultaneo && procesosSimultaneos.length > 0) {
            // Modo simultáneo activo
            procesosHTML = `
                <div class="estacion-proceso-new simultaneo">
                    <i class="fas fa-layer-group"></i> ${procesosSimultaneos.length} simultáneos
                    <span class="procesos-simultaneos-tooltip" title="${S(procesosSimultaneos.map(p => p.procesoNombre).join(', '))}">
                        ${S(procesosSimultaneos.slice(0, 2).map(p => p.procesoNombre.substring(0, 10)).join(', '))}${procesosSimultaneos.length > 2 ? '...' : ''}
                    </span>
                    ${iconoTrabajo}
                </div>
            `;
        } else if (maquinaState.procesoNombre) {
            // Proceso único
            procesosHTML = `
                <div class="estacion-proceso-new">
                    <i class="fas fa-cog ${estaTrabajando ? 'fa-spin' : ''}"></i> ${S(maquinaState.procesoNombre)}
                    ${maquinaState.colaProcesos && maquinaState.colaProcesos.length > 0 ?
                        `<span class="cola-badge-mini" title="${S(maquinaState.colaProcesos.map(p => p.procesoNombre).join(' → '))}">+${maquinaState.colaProcesos.length}</span>`
                    : ''}
                    ${iconoTrabajo}
                </div>
            `;
        }

        el.innerHTML = `
            ${tiempoMuertoHTML}
            ${activityIndicator}
            <div class="estacion-header-new">
                <div class="estacion-icon">
                    <i class="fas ${icono}"></i>
                </div>
                <div class="estacion-id-badge">${element.id}</div>
                <div class="estacion-badges">
                    ${operadoresCount > 0 ? `<span class="operadores-count-badge">${operadoresCount}</span>` : ''}
                    <div class="estacion-estado-indicator ${maquinaState.estado}">
                        <i class="fas ${getEstadoIcon(maquinaState.estado)}"></i>
                    </div>
                </div>
            </div>
            <div class="estacion-body-new ${claseTrabajoEstacion}">
                <div class="estacion-operadores">
                    ${operadoresHTML}
                </div>
                ${procesosHTML}
                ${maquinaState.piezasHoy > 0 ? `
                    <div class="estacion-piezas-new">
                        <i class="fas fa-cubes"></i> ${maquinaState.piezasHoy.toLocaleString()}
                    </div>
                ` : ''}
            </div>
            ${progresoHTML}
            <div class="estacion-glow ${maquinaState.estado}"></div>
        `;

        el.addEventListener('click', () => selectEstacion(element.id));
        el.addEventListener('dblclick', () => openEstacionModal(element.id));

        // Efectos hover
        el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.05)';
            el.style.zIndex = '100';
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
            el.style.zIndex = '10';
        });

        container.appendChild(el);
    });

    // Actualizar estadisticas de zonas
    updateZoneStats();
}

// Detectar tipo de area por nombre
function detectAreaType(name) {
    const nameLower = (name || '').toLowerCase();
    if (nameLower.includes('costura') || nameLower.includes('cost')) return 'costura';
    if (nameLower.includes('corte') || nameLower.includes('cut')) return 'corte';
    if (nameLower.includes('empaque') || nameLower.includes('pack')) return 'empaque';
    if (nameLower.includes('calidad') || nameLower.includes('qa')) return 'calidad';
    if (nameLower.includes('almacen') || nameLower.includes('bodega')) return 'almacen';
    return 'default';
}

// Obtener icono segun estado
function getEstadoIcon(estado) {
    const iconos = {
        'activo': 'fa-play',
        'pausado': 'fa-pause',
        'inactivo': 'fa-stop',
        'adelantado': 'fa-forward',
        'retrasado': 'fa-exclamation-triangle'
    };
    return iconos[estado] || 'fa-circle';
}

// Actualizar estadisticas de zonas
function updateZoneStats() {
    // Contar operadores y piezas por zona
    // Esto se puede expandir segun la logica de zonas
}

// ========================================
// CARGAR DATOS DEL ERP
// ========================================

function loadDataFromERP() {
    // Verificar si existe el objeto db
    if (typeof db === 'undefined') {
        DEBUG_MODE && console.warn('Base de datos no disponible');
        loadMockData();
        return;
    }

    try {
        // Cargar pedidos del dia
        const pedidos = db.getPedidos();
        DEBUG_MODE && console.log('[SUPERVISORA] Total pedidos en db:', pedidos.length);
        DEBUG_MODE && console.log('[SUPERVISORA] Estados de pedidos:', pedidos.map(p => ({ id: p.id, estado: p.estado })));

        // Filtrar por estados activos (incluir variantes con guion y guion bajo)
        const estadosActivos = ['produccion', 'en-proceso', 'en_proceso', 'pendiente', 'activo', 'en proceso'];

        supervisoraState.pedidosHoy = pedidos
            .filter(p => {
                const estadoNormalizado = (p.estado || '').toLowerCase().trim();
                const esActivo = estadosActivos.includes(estadoNormalizado);
                DEBUG_MODE && console.log('[SUPERVISORA] Pedido', p.id, '- estado:', p.estado, '- incluido:', esActivo);
                return esActivo;
            })
            .map(pedido => {
                // Convertir avanceProcesos a formato compatible con supervisora
                const cliente = db.getCliente(pedido.clienteId);
                let procesos = [];

                // Fuente 1: Extraer procesos de productos[].avanceProcesos (estructura principal)
                if (pedido.productos && pedido.productos.length > 0) {
                    pedido.productos.forEach((prod, prodIdx) => {
                        if (prod.avanceProcesos && Array.isArray(prod.avanceProcesos)) {
                            prod.avanceProcesos.forEach((proc, procIdx) => {
                                procesos.push(formatearProcesoParaSupervisora(proc, pedido.id, prodIdx, procIdx));
                            });
                        }
                    });
                }

                // Fuente 2: Si el pedido tiene procesos directamente
                if (procesos.length === 0 && pedido.procesos && Array.isArray(pedido.procesos)) {
                    pedido.procesos.forEach((proc, procIdx) => {
                        procesos.push(formatearProcesoParaSupervisora(proc, pedido.id, 0, procIdx));
                    });
                }

                // Fuente 3: NUEVA - Cargar procesos de rutaProcesos de los productos
                if (procesos.length === 0 && pedido.productos && pedido.productos.length > 0) {
                    DEBUG_MODE && console.log('[SUPERVISORA] Buscando rutaProcesos en productos del pedido', pedido.id);
                    pedido.productos.forEach((prod, prodIdx) => {
                        const productoCompleto = db.getProducto(parseInt(prod.productoId));
                        if (productoCompleto && productoCompleto.rutaProcesos && productoCompleto.rutaProcesos.length > 0) {
                            DEBUG_MODE && console.log('[SUPERVISORA] Producto', productoCompleto.nombre, 'tiene rutaProcesos:', productoCompleto.rutaProcesos.length);
                            productoCompleto.rutaProcesos.forEach((proc, procIdx) => {
                                if (proc.habilitado !== false && proc.nombre) {
                                    procesos.push({
                                        id: `${pedido.id}-${prod.productoId}-${procIdx}`,
                                        nombre: proc.nombre,
                                        procesoNombre: proc.nombre,
                                        tipo: proc.tipo || detectarTipoProceso(proc.nombre),
                                        tiempoEstandar: proc.tiempoEstandar || 0,
                                        capacidadHora: proc.capacidadHora || 0,
                                        orden: proc.orden || procIdx + 1,
                                        estado: 'pendiente',
                                        productoId: prod.productoId,
                                        productoNombre: productoCompleto.nombre,
                                        pedidoId: pedido.id
                                    });
                                }
                            });
                        }
                    });
                }

                // Fuente 4: Generar procesos por defecto basados en el producto/área (último recurso)
                if (procesos.length === 0) {
                    procesos = generarProcesosDefault(pedido);
                    DEBUG_MODE && console.log('[SUPERVISORA] Procesos genéricos generados para pedido', pedido.id, ':', procesos.length);
                }

                DEBUG_MODE && console.log('[SUPERVISORA] Pedido', pedido.id, 'tiene', procesos.length, 'procesos:', procesos.map(p => p.nombre));

                return {
                    ...pedido,
                    clienteNombre: cliente?.nombreComercial || 'Cliente',
                    cantidad: pedido.productos?.[0]?.cantidad || pedido.cantidad || 0,
                    procesos: procesos
                };
            });

        // Cargar operadores
        const personal = db.getPersonal();
        supervisoraState.operadores = personal.filter(p =>
            p.rol === 'operador' && p.activo !== false
        );

        // Cargar y sincronizar estaciones del ERP
        loadEstacionesFromERP();

        // Cargar estado guardado de maquinas (incluye asignaciones previas)
        loadEstadoMaquinas();

        // Cargar asignaciones existentes de localStorage
        cargarAsignacionesExistentes();

        // Re-renderizar el layout con los datos sincronizados
        if (supervisoraState.layout) {
            renderLayoutInSupervisora(supervisoraState.layout);
        }

        renderPedidosList();
        renderOperadoresList();
        updateStats();
    } catch (e) {
        console.error('Error cargando datos:', e);
        loadMockData();
    }

    // Garantizar que el mapa siempre se renderice aunque hayan errores parciales
    if (supervisoraState.layout && !document.querySelector('#plantMap .plant-zone, #plantMap .estacion-element, #plantMap .no-layout')) {
        console.warn('[SUPERVISORA] Mapa vacío después de carga, forzando renderizado');
        try {
            renderLayoutInSupervisora(supervisoraState.layout);
        } catch (renderErr) {
            console.error('[SUPERVISORA] Error forzando renderizado:', renderErr);
        }
    }
}

// Función para detectar el tipo de proceso por su nombre
function detectarTipoProceso(nombre) {
    const nombreLower = (nombre || '').toLowerCase();
    if (nombreLower.includes('corte')) return 'corte';
    if (nombreLower.includes('empaque') || nombreLower.includes('embalaje')) return 'empaque';
    if (nombreLower.includes('calidad') || nombreLower.includes('revision') || nombreLower.includes('revisión')) return 'calidad';
    if (nombreLower.includes('impresion') || nombreLower.includes('serigrafia') || nombreLower.includes('serigrafía')) return 'serigrafia';
    if (nombreLower.includes('costura')) return 'costura';
    return 'general';
}

// Detectar si un proceso puede ejecutarse simultáneamente con otros
function detectarProcesoSimultaneo(nombre, areaPlantaId) {
    const nombreLower = (nombre || '').toLowerCase();
    const areaLower = (areaPlantaId || '').toLowerCase();

    // Los procesos de corte típicamente pueden ser simultáneos
    // ya que suelen ser preparación de material independiente
    if (nombreLower.includes('corte') || areaLower.includes('corte')) {
        return true;
    }

    // Procesos de preparación
    if (nombreLower.includes('preparacion') || nombreLower.includes('preparación')) {
        return true;
    }

    // Procesos de impresión/serigrafía pueden ser simultáneos entre sí
    if (nombreLower.includes('serigrafia') || nombreLower.includes('serigrafía') ||
        nombreLower.includes('impresion') || nombreLower.includes('impresión')) {
        return true;
    }

    // Procesos de costura relacionados pueden ser paralelos en algunas fábricas
    // (diferentes operadores trabajando diferentes partes)
    if (nombreLower.includes('costura')) {
        return true; // Permitir que el usuario decida si trabaja varios a la vez
    }

    // Procesos de revisión o calidad al final - no simultáneos
    if (nombreLower.includes('revision') || nombreLower.includes('revisión') ||
        nombreLower.includes('calidad') || nombreLower.includes('inspeccion')) {
        return false;
    }

    // Cerrado final - no simultáneo (es el último paso de ensamble)
    if (nombreLower.includes('cerrado')) {
        return false;
    }

    // Por defecto, permitir simultáneo para dar flexibilidad
    return true;
}

// Función auxiliar para formatear un proceso al formato de supervisora
function formatearProcesoParaSupervisora(proc, pedidoId, prodIdx, procIdx) {
    // Detectar tipo de proceso por nombre
    let tipo = detectarTipoProceso(proc.nombre);

    // Mapear estado (normalizar)
    let estado = proc.estado || 'pendiente';
    if (estado === 'en_proceso') estado = 'en-proceso';

    return {
        id: proc.id || (pedidoId * 1000 + prodIdx * 100 + procIdx),
        nombre: proc.nombre || 'Proceso ' + (procIdx + 1),
        tipo: tipo,
        estado: estado,
        piezas: proc.completadas || proc.piezas || 0,
        orden: proc.procesoOrden || proc.orden || procIdx + 1
    };
}

// Función para generar procesos por defecto cuando un pedido no tiene procesos definidos
function generarProcesosDefault(pedido) {
    const procesos = [];
    const cantidad = pedido.productos?.[0]?.cantidad || pedido.cantidad || 0;

    // Determinar tipo de producto por descripción o nombre
    const descripcion = (pedido.descripcion || pedido.productos?.[0]?.nombre || '').toLowerCase();

    // Procesos básicos por defecto
    const procesosBase = [
        { nombre: 'Corte', tipo: 'corte', orden: 1 },
        { nombre: 'Preparación', tipo: 'costura', orden: 2 },
        { nombre: 'Costura principal', tipo: 'costura', orden: 3 },
        { nombre: 'Acabados', tipo: 'costura', orden: 4 },
        { nombre: 'Control de calidad', tipo: 'calidad', orden: 5 },
        { nombre: 'Empaque', tipo: 'empaque', orden: 6 }
    ];

    procesosBase.forEach((proc, idx) => {
        procesos.push({
            id: pedido.id * 1000 + idx,
            nombre: proc.nombre,
            tipo: proc.tipo,
            estado: 'pendiente',
            piezas: 0,
            orden: proc.orden
        });
    });

    return procesos;
}

// Cargar estaciones y estado de operadores desde el ERP
function loadEstacionesFromERP() {
    if (typeof db === 'undefined') return;

    try {
        const estaciones = db.getEstaciones() || [];
        const estadoOperadores = db.getEstadoOperadores() || [];

        DEBUG_MODE && console.log('[SUPERVISORA] Cargando estaciones ERP:', estaciones.length);
        DEBUG_MODE && console.log('[SUPERVISORA] Estaciones con operador:', estaciones.filter(e => e.operadorId).map(e => `${e.id}:op${e.operadorId}`));

        // Funcion auxiliar para buscar estacion ERP por ID o nombre similar
        function findEstacionERP(elementId, elementName) {
            // Primero buscar por ID exacto
            let estacion = estaciones.find(e => e.id === elementId);
            if (estacion) return estacion;

            // Buscar por ID similar (ej: C1 == Costura-1, costura_1, etc)
            const idNormalized = elementId.toLowerCase().replace(/[-_\s]/g, '');
            estacion = estaciones.find(e => {
                const erpIdNorm = e.id.toLowerCase().replace(/[-_\s]/g, '');
                return erpIdNorm === idNormalized;
            });
            if (estacion) return estacion;

            // Buscar por ID que contiene el mismo número (ej: E1 podría ser C1, Costura1, etc)
            const numMatch = elementId.match(/\d+/);
            if (numMatch) {
                const num = numMatch[0];
                const prefix = elementId.replace(/\d+/g, '').toLowerCase();
                // Buscar estaciones que tengan el mismo número
                estacion = estaciones.find(e => {
                    const eNum = (e.id.match(/\d+/) || [])[0];
                    return eNum === num && e.id.toLowerCase().startsWith(prefix.charAt(0));
                });
                if (estacion) return estacion;
            }

            // Buscar por nombre similar
            if (elementName) {
                const nameNormalized = elementName.toLowerCase().replace(/[-_\s]/g, '');
                estacion = estaciones.find(e => {
                    const erpNameNorm = (e.nombre || '').toLowerCase().replace(/[-_\s]/g, '');
                    return erpNameNorm.includes(nameNormalized) || nameNormalized.includes(erpNameNorm);
                });
            }
            return estacion;
        }

        // Funcion auxiliar para buscar estado de operador
        function findEstadoOperador(estacionId) {
            let estado = estadoOperadores.find(e => e.estacionId === estacionId);
            if (estado) return estado;

            // Buscar por ID normalizado
            const idNormalized = estacionId.toLowerCase().replace(/[-_\s]/g, '');
            return estadoOperadores.find(e => {
                const erpIdNorm = e.estacionId.toLowerCase().replace(/[-_\s]/g, '');
                return erpIdNorm === idNormalized;
            });
        }

        // Sincronizar con el layout si existe
        if (supervisoraState.layout && supervisoraState.layout.elements) {
            supervisoraState.layout.elements.forEach(element => {
                if (element.type !== 'area') {
                    // Buscar estacion correspondiente en el ERP
                    const estacionERP = findEstacionERP(element.id, element.name);
                    const estadoOp = estacionERP ?
                        findEstadoOperador(estacionERP.id) :
                        findEstadoOperador(element.id);

                    // Inicializar o actualizar estado de la maquina
                    if (!supervisoraState.maquinas[element.id]) {
                        supervisoraState.maquinas[element.id] = {
                            id: element.id,
                            tipo: element.type,
                            nombre: element.name || element.id,
                            operadores: [],  // Array de operadores
                            procesoId: null,
                            procesoNombre: '',
                            pedidoId: null,
                            estado: 'inactivo',
                            piezasHoy: 0,
                            ultimaActividad: null
                        };
                    }

                    const maquina = supervisoraState.maquinas[element.id];

                    // Inicializar array de operadores si no existe (migración)
                    if (!maquina.operadores) {
                        maquina.operadores = [];
                    }

                    // Sincronizar operador desde estaciones del ERP
                    if (estacionERP && estacionERP.operadorId) {
                        const operador = supervisoraState.operadores.find(o => o.id === estacionERP.operadorId);
                        DEBUG_MODE && console.log(`[SUPERVISORA] Estación ${element.id} -> ERP ${estacionERP.id}, operadorId: ${estacionERP.operadorId}, encontrado: ${operador ? operador.nombre : 'NO'}`);
                        if (operador && !maquina.operadores.some(op => op.id === operador.id)) {
                            maquina.operadores.push({
                                id: estacionERP.operadorId,
                                nombre: operador.nombre
                            });
                            DEBUG_MODE && console.log(`[SUPERVISORA] Operador ${operador.nombre} agregado a estación ${element.id}`);
                            // Si tiene operador asignado, marcar como activo por defecto
                            if (maquina.estado === 'inactivo') {
                                maquina.estado = 'activo';
                            }
                        }
                    } else if (estacionERP) {
                        DEBUG_MODE && console.log(`[SUPERVISORA] Estación ${element.id} -> ERP ${estacionERP.id}, sin operador asignado`);
                    } else {
                        DEBUG_MODE && console.log(`[SUPERVISORA] Estación ${element.id} no encontrada en ERP`);
                    }

                    // Sincronizar estado desde estadoOperadores del ERP
                    if (estadoOp) {
                        // Mapear estados del ERP a estados de supervisora
                        let estado = 'activo';
                        if (estadoOp.estado === 'inactivo') estado = 'inactivo';
                        else if (estadoOp.estado === 'retrasado' || estadoOp.estado === 'muy-retrasado') estado = 'retrasado';
                        else if (estadoOp.estado === 'adelantado') estado = 'adelantado';
                        else if (estadoOp.estado === 'pausado') estado = 'pausado';

                        maquina.estado = estado;

                        // Si hay estadoOp, buscar el operador y agregarlo si no está ya
                        if (estadoOp.operadorId) {
                            const operador = supervisoraState.operadores.find(o => o.id === estadoOp.operadorId);
                            if (operador && !maquina.operadores.some(op => op.id === operador.id)) {
                                maquina.operadores.push({
                                    id: estadoOp.operadorId,
                                    nombre: operador.nombre
                                });
                            }
                        }

                        // Sincronizar efectividad si existe
                        if (estadoOp.efectividad !== undefined) {
                            maquina.efectividad = estadoOp.efectividad;
                        }
                    }
                }
            });
        }

        // Si no hay layout, crear maquinas basadas en estaciones del ERP
        if (!supervisoraState.layout) {
            estaciones.forEach(estacion => {
                if (!supervisoraState.maquinas[estacion.id]) {
                    const estadoOp = estadoOperadores.find(e => e.estacionId === estacion.id);
                    const operador = estacion.operadorId ?
                        supervisoraState.operadores.find(o => o.id === estacion.operadorId) : null;

                    let estado = 'inactivo';
                    if (estadoOp) {
                        if (estadoOp.estado === 'retrasado' || estadoOp.estado === 'muy-retrasado') estado = 'retrasado';
                        else if (estadoOp.estado === 'adelantado') estado = 'adelantado';
                        else if (estadoOp.estado === 'inactivo') estado = 'inactivo';
                        else estado = 'activo';
                    } else if (operador) {
                        estado = 'activo';
                    }

                    // Crear array de operadores
                    const operadores = [];
                    if (operador) {
                        operadores.push({ id: estacion.operadorId, nombre: operador.nombre });
                    }

                    supervisoraState.maquinas[estacion.id] = {
                        id: estacion.id,
                        tipo: 'estacion',
                        nombre: estacion.nombre,
                        operadores: operadores,
                        procesoId: null,
                        procesoNombre: '',
                        pedidoId: null,
                        estado: estado,
                        piezasHoy: 0,
                        ultimaActividad: null
                    };
                }
            });
        }

        DEBUG_MODE && console.log('Estaciones sincronizadas:', Object.keys(supervisoraState.maquinas).length);
        DEBUG_MODE && console.log('Estaciones ERP:', estaciones.length, 'Estados:', estadoOperadores.length);
    } catch (e) {
        console.error('Error sincronizando estaciones:', e);
    }
}

function loadMockData() {
    // Datos de ejemplo si no hay conexion al ERP
    supervisoraState.pedidosHoy = [
        {
            id: 1,
            clienteNombre: 'Distribuidora El Sol',
            cantidad: 500,
            progreso: 45,
            prioridad: 'alta',
            procesos: [
                { id: 101, nombre: 'Corte inicial', tipo: 'corte', estado: 'completado', piezas: 500 },
                { id: 102, nombre: 'Costura lateral', tipo: 'costura', estado: 'en-proceso', piezas: 225 },
                { id: 103, nombre: 'Costura fondo', tipo: 'costura', estado: 'pendiente', piezas: 0 },
                { id: 104, nombre: 'Control calidad', tipo: 'calidad', estado: 'pendiente', piezas: 0 },
                { id: 105, nombre: 'Empaque final', tipo: 'empaque', estado: 'pendiente', piezas: 0 }
            ]
        },
        {
            id: 2,
            clienteNombre: 'Comercial Norte',
            cantidad: 300,
            progreso: 70,
            prioridad: 'media',
            procesos: [
                { id: 201, nombre: 'Corte piezas', tipo: 'corte', estado: 'completado', piezas: 300 },
                { id: 202, nombre: 'Costura principal', tipo: 'costura', estado: 'completado', piezas: 300 },
                { id: 203, nombre: 'Costura refuerzo', tipo: 'costura', estado: 'en-proceso', piezas: 210 },
                { id: 204, nombre: 'Revision calidad', tipo: 'calidad', estado: 'pendiente', piezas: 0 },
                { id: 205, nombre: 'Empaque', tipo: 'empaque', estado: 'pendiente', piezas: 0 }
            ]
        },
        {
            id: 3,
            clienteNombre: 'Tiendas Express',
            cantidad: 1000,
            progreso: 15,
            prioridad: 'baja',
            procesos: [
                { id: 301, nombre: 'Corte tela', tipo: 'corte', estado: 'en-proceso', piezas: 150 },
                { id: 302, nombre: 'Costura base', tipo: 'costura', estado: 'pendiente', piezas: 0 },
                { id: 303, nombre: 'Costura acabado', tipo: 'costura', estado: 'pendiente', piezas: 0 },
                { id: 304, nombre: 'Inspeccion', tipo: 'calidad', estado: 'pendiente', piezas: 0 },
                { id: 305, nombre: 'Empaque y etiquetado', tipo: 'empaque', estado: 'pendiente', piezas: 0 }
            ]
        }
    ];

    supervisoraState.operadores = [
        { id: 1, nombre: 'Juan Perez', areaId: 1 },
        { id: 2, nombre: 'Maria Garcia', areaId: 1 },
        { id: 3, nombre: 'Carlos Lopez', areaId: 2 },
        { id: 4, nombre: 'Ana Martinez', areaId: 1 },
        { id: 5, nombre: 'Roberto Sanchez', areaId: 2 }
    ];

    // Renderizar layout con datos mock
    if (supervisoraState.layout) {
        renderLayoutInSupervisora(supervisoraState.layout);
    }

    renderPedidosList();
    renderOperadoresList();
    updateStats();
}

function loadEstadoOperadores() {
    if (typeof db === 'undefined') return;

    try {
        const estadoOps = db.getEstadoOperadores();

        estadoOps.forEach(estado => {
            // Buscar la estacion asignada
            const estacionId = estado.estacionId;
            if (estacionId && supervisoraState.maquinas[estacionId]) {
                const operador = supervisoraState.operadores.find(o => o.id === estado.operadorId);

                supervisoraState.maquinas[estacionId].operadorId = estado.operadorId;
                supervisoraState.maquinas[estacionId].operadorNombre = operador?.nombre || '';
                supervisoraState.maquinas[estacionId].estado = estado.estado || 'activo';
                supervisoraState.maquinas[estacionId].piezasHoy = estado.piezasHoy || 0;
            }
        });

        // Re-renderizar layout con estados actualizados
        if (supervisoraState.layout) {
            renderLayoutInSupervisora(supervisoraState.layout);
        }
    } catch (e) {
        console.error('Error cargando estado operadores:', e);
    }
}

// ========================================
// RENDER SIDEBARS
// ========================================

function renderPedidosList() {
    const container = document.getElementById('pedidosList');
    const countEl = document.getElementById('pedidosCount');

    if (supervisoraState.pedidosHoy.length === 0) {
        container.innerHTML = '<p class="empty-text">No hay pedidos activos</p>';
        if (countEl) countEl.textContent = '0';
        return;
    }

    // Filtrar pedidos segun filtro activo
    let pedidosFiltrados = supervisoraState.pedidosHoy;
    if (supervisoraState.pedidoFilter === 'urgente') {
        pedidosFiltrados = pedidosFiltrados.filter(p =>
            p.prioridad === 'alta' || p.prioridad === 'urgente'
        );
    } else if (supervisoraState.pedidoFilter === 'enProceso') {
        pedidosFiltrados = pedidosFiltrados.filter(p =>
            p.procesos?.some(proc => {
                const estado = (proc.estado || '').toLowerCase().replace(/[-_\s]/g, '');
                return estado === 'enproceso';
            })
        );
    }

    if (countEl) countEl.textContent = pedidosFiltrados.length;

    container.innerHTML = pedidosFiltrados.map(pedido => {
        const cliente = typeof db !== 'undefined' ? db.getCliente(pedido.clienteId) : null;
        const clienteNombre = cliente?.nombreComercial || pedido.clienteNombre || 'N/A';
        const prod = pedido.productos?.[0];
        const cantidad = prod?.cantidad || pedido.cantidad || 0;
        const completadas = prod?.completadas || 0;
        const progreso = cantidad > 0 ? Math.round((completadas / cantidad) * 100) : (pedido.progreso || 0);

        // Obtener nombres de artículos
        let nombresArticulos = [];
        if (pedido.productos && pedido.productos.length > 0) {
            pedido.productos.forEach(p => {
                const productoCompleto = typeof db !== 'undefined' ? db.getProducto(parseInt(p.productoId)) : null;
                if (productoCompleto) {
                    nombresArticulos.push(productoCompleto.nombre);
                } else if (p.nombre) {
                    nombresArticulos.push(p.nombre);
                }
            });
        }
        const articulosTexto = nombresArticulos.length > 0 ? nombresArticulos.join(', ') : '';

        // Calcular avance ponderado real del pedido
        const avancePedido = typeof calcularAvancePedido === 'function'
            ? calcularAvancePedido(pedido, typeof db !== 'undefined' ? db.getProductos() : [])
            : progreso;

        const isExpanded = supervisoraState.expandedPedidos.has(pedido.id);
        const procesos = pedido.procesos || getProcesosFromDB(pedido.id);
        // Normalizar estados para comparación (en-proceso, en_proceso, en proceso)
        const procesosEnProceso = procesos.filter(p => {
            const estado = (p.estado || '').toLowerCase().replace(/[-_\s]/g, '');
            return estado === 'enproceso';
        }).length;

        // Contar procesos completados (incluye los que tienen inventario suficiente)
        const procesosCompletados = procesos.filter(p => {
            const estado = (p.estado || '').toLowerCase();
            if (estado === 'completado' || estado === 'terminado') return true;

            // Verificar si el proceso tiene inventario suficiente
            if (typeof db !== 'undefined' && db.getInventarioPiezaByProductoProceso) {
                const productoId = p.productoId || pedido?.productos?.[0]?.productoId || pedido?.productoId;
                if (productoId) {
                    const procesoNombre = p.nombre || p.procesoNombre || '';
                    const inventarioPieza = db.getInventarioPiezaByProductoProceso(productoId, procesoNombre);
                    if (inventarioPieza && inventarioPieza.cantidadDisponible >= cantidad) {
                        return true; // Tiene inventario suficiente, cuenta como completado
                    }
                }
            }
            return false;
        }).length;

        // Verificar si el pedido está listo para cerrar
        const estadoPedido = (pedido.estado || '').toLowerCase().replace(/[-_\s]/g, '');
        const esListoEntrega = estadoPedido === 'listoentrega';
        const todosProcesosCompletos = procesos.length > 0 && procesosCompletados === procesos.length;
        const mostrarBotonCerrar = esListoEntrega || todosProcesosCompletos || progreso >= 100;

        return `
            <div class="pedido-card-expanded ${isExpanded ? 'open' : ''} ${esListoEntrega ? 'listo-entrega' : ''}" data-pedido-id="${pedido.id}">
                <div class="pedido-card-header" onclick="togglePedidoExpand(${pedido.id})">
                    <div class="pedido-prioridad-indicator ${pedido.prioridad}"></div>
                    <div class="pedido-card-content">
                        <div class="pedido-card-top">
                            <span class="pedido-number">#${pedido.id}</span>
                            <span class="pedido-badge ${pedido.prioridad}">${pedido.prioridad}</span>
                            ${esListoEntrega ? '<span class="pedido-badge listo-entrega-badge"><i class="fas fa-check-circle"></i> Listo</span>' : ''}
                        </div>
                        <div class="pedido-cliente-name">${S(clienteNombre)}</div>
                        ${articulosTexto ? `<div class="pedido-articulo-name"><i class="fas fa-box-open"></i> ${S(articulosTexto)}</div>` : ''}
                        ${pedido.notas ? `<div class="pedido-notas-preview"><i class="fas fa-sticky-note"></i> ${S(pedido.notas.substring(0, 80))}${pedido.notas.length > 80 ? '...' : ''}</div>` : ''}
                        <div class="pedido-avance-bar">
                            <div class="pedido-avance-fill ${avancePedido >= 100 ? 'completado' : avancePedido >= 70 ? 'avanzado' : avancePedido >= 30 ? 'medio' : ''}" style="width:${Math.min(avancePedido, 100)}%"></div>
                            <span class="pedido-avance-text">${avancePedido}%</span>
                        </div>
                        <div class="pedido-stats-row">
                            <span class="pedido-stat"><i class="fas fa-cubes"></i> ${cantidad.toLocaleString()}</span>
                            <span class="pedido-stat"><i class="fas fa-tasks"></i> ${procesosCompletados}/${procesos.length}</span>
                            ${procesosEnProceso > 0 ? `<span class="pedido-stat"><i class="fas fa-spinner fa-spin"></i> ${procesosEnProceso} activo${procesosEnProceso > 1 ? 's' : ''}</span>` : ''}
                        </div>
                    </div>
                    <i class="fas fa-chevron-down pedido-expand-icon"></i>
                </div>

                <div class="pedido-procesos-container">
                    <div class="procesos-header">
                        <span><i class="fas fa-stream"></i> Procesos</span>
                        <span class="procesos-count-badge">${procesos.length}</span>
                    </div>
                    ${procesos.map(proceso => renderProcesoItem(proceso, pedido.id)).join('')}

                    <div class="pedido-acciones-cierre">
                        <button class="btn-cerrar-pedido-manual" onclick="event.stopPropagation(); abrirCierrePedidoManual(${pedido.id})">
                            <i class="fas fa-clipboard-check"></i> Cerrar Pedido
                        </button>
                    </div>
                </div>

                <div class="pedido-progress-bar">
                    <div class="pedido-progress-fill" style="width: ${progreso}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Obtener procesos desde la base de datos si existe
function getProcesosFromDB(pedidoId) {
    if (typeof db === 'undefined') return [];
    try {
        const procesos = db.getProcesos ? db.getProcesos() : [];
        return procesos.filter(p => p.pedidoId === pedidoId);
    } catch (e) {
        return [];
    }
}

// Renderizar item de proceso draggable
function renderProcesoItem(proceso, pedidoId) {
    const iconosTipo = {
        'costura': 'fa-tshirt',
        'corte': 'fa-cut',
        'empaque': 'fa-box',
        'calidad': 'fa-check-circle',
        'serigrafia': 'fa-paint-brush'
    };
    const icono = iconosTipo[proceso.tipo] || 'fa-cog';

    // Contar cuantas estaciones tienen este proceso asignado y verificar si hay trabajo activo
    const estacionesConProceso = Object.entries(supervisoraState.maquinas)
        .filter(([id, m]) => m.procesoId === proceso.id || (m.colaProcesos && m.colaProcesos.some(p => p.procesoId === proceso.id)));

    const estacionesAsignadas = estacionesConProceso.map(([id, m]) => id);
    const cantidadAsignadas = estacionesAsignadas.length;

    // Obtener estado de máquinas y asignaciones para verificar procesos simultáneos
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    const asignacionesEstaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    // Verificar si alguna estación está trabajando activamente en este proceso
    // Un operador está "trabajando" si:
    // 1. El proceso tiene piezas registradas (ha capturado algo), O
    // 2. La estación tiene estado activo/adelantado/retrasado (no inactivo/disponible), O
    // 3. El proceso está en los procesos simultáneos activos del operador
    const estacionesTrabajando = estacionesConProceso.filter(([id, m]) => {
        // Verificar si el proceso está asignado directamente
        const esProcesoDirecto = m.procesoId === proceso.id;

        // Verificar si hay piezas capturadas o si el estado indica trabajo activo
        const tienePiezas = m.piezasHoy > 0 || (proceso.piezas && proceso.piezas > 0);
        const estadoActivo = m.estado === 'activo' || m.estado === 'adelantado' || m.estado === 'retrasado';

        // Verificar si el proceso está en los procesos simultáneos activos de esta estación
        const asignacionEstacion = asignacionesEstaciones[id];
        const estadoEstacion = estadoMaquinas[id];

        const enProcesosSimultaneos = (
            (asignacionEstacion?.procesosSimultaneosActivos && asignacionEstacion.procesosSimultaneosActivos.includes(proceso.id)) ||
            (estadoEstacion?.procesosSimultaneos && estadoEstacion.procesosSimultaneos.some(p => p.procesoId === proceso.id))
        );

        // Si está en procesos simultáneos activos, está trabajándose
        if (enProcesosSimultaneos) {
            return true;
        }

        // Si no es el proceso directo, no cuenta como trabajando por este método
        if (!esProcesoDirecto) return false;

        return tienePiezas || estadoActivo;
    });
    const estaTrabajandose = estacionesTrabajando.length > 0;

    // Calcular progreso del proceso
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    const cantidadTotal = pedido?.productos?.[0]?.cantidad || pedido?.cantidad || 100;
    const piezasCompletadas = proceso.piezas || 0;
    const progreso = Math.min(100, Math.round((piezasCompletadas / cantidadTotal) * 100));

    // Verificar dependencias - si el proceso anterior está completado
    const dependenciaInfo = verificarDependenciasProceso(proceso, pedido);
    const puedeAsignar = dependenciaInfo.disponible;
    const fueDesbloqueado = dependenciaInfo.desbloqueadoManual === true;
    const puedeDesbloquear = dependenciaInfo.puedeDesbloquear === true;
    const tieneInventario = dependenciaInfo.tieneInventario === true;
    const inventarioDisponible = dependenciaInfo.inventarioDisponible || 0;

    // Determinar clase de dependencia
    let claseDependencia = puedeAsignar ? 'disponible' : 'bloqueado';
    if (fueDesbloqueado) {
        claseDependencia = 'desbloqueado-manual';
    }
    if (tieneInventario) {
        claseDependencia = 'tiene-inventario';
    }

    // Escapar el ID para que funcione como string en JavaScript
    const procesoIdEscapado = String(proceso.id).replace(/'/g, "\\'");

    // Determinar si puede ser arrastrado (no arrastrar si ya hay inventario)
    const draggableAttr = puedeAsignar && !tieneInventario ? 'true' : 'false';

    // Clase para estaciones asignadas:
    // - Verde (asignado-trabajando): Operador ya comenzó a trabajar (tiene piezas o estado activo)
    // - Naranja (asignado-pendiente): Asignado pero operador no ha iniciado
    let claseAsignacion = '';
    if (cantidadAsignadas > 0) {
        claseAsignacion = estaTrabajandose ? 'asignado-trabajando' : 'asignado-pendiente';
    }

    // Título dinámico
    let titleAttr = puedeAsignar ? 'Click para ver detalles, arrastra para asignar' : dependenciaInfo.mensaje;
    if (tieneInventario) {
        titleAttr = `✓ Inventario disponible: ${inventarioDisponible} piezas - No requiere producción`;
    }

    return `
        <div class="proceso-drag-item ${claseAsignacion} ${proceso.estado} ${claseDependencia}"
             draggable="${draggableAttr}"
             ondragstart="${puedeAsignar && !tieneInventario ? `dragProceso(event, '${procesoIdEscapado}', ${pedidoId})` : 'event.preventDefault()'}"
             onclick="abrirDetalleProceso('${procesoIdEscapado}', ${pedidoId})"
             data-proceso-id="${proceso.id}"
             data-orden="${proceso.orden || 0}"
             data-simultaneo="${proceso.simultaneo || false}"
             title="${S(titleAttr)}">
            ${tieneInventario ? `
                <div class="proceso-inventario-completo">
                    <div class="inventario-listo-badge">
                        <i class="fas fa-warehouse"></i> INVENTARIO
                    </div>
                    <div class="inventario-info-badge" title="Piezas disponibles en inventario">
                        <i class="fas fa-boxes"></i> ${inventarioDisponible} pzas disponibles
                    </div>
                    <button class="btn-usar-inventario" onclick="event.stopPropagation(); usarInventarioProceso('${procesoIdEscapado}', ${pedidoId}, ${cantidadTotal})" title="Usar piezas del inventario">
                        <i class="fas fa-check"></i> Usar
                    </button>
                </div>
            ` : ''}
            ${!puedeAsignar && !fueDesbloqueado && !tieneInventario ? `
                <div class="proceso-bloqueado-overlay">
                    <i class="fas fa-lock"></i>
                    ${puedeDesbloquear ? `<button class="btn-desbloquear-mini" onclick="event.stopPropagation(); desbloquearProcesoManual(${pedidoId}, '${procesoIdEscapado}')" title="Desbloquear manualmente"><i class="fas fa-unlock"></i></button>` : ''}
                </div>
            ` : ''}
            ${fueDesbloqueado ? `
                <div class="proceso-desbloqueado-badge" title="Click para volver a bloquear" onclick="event.stopPropagation(); bloquearProcesoManual(${pedidoId}, '${procesoIdEscapado}')">
                    <i class="fas fa-unlock-alt"></i>
                </div>
            ` : ''}
            <div class="proceso-drag-icon ${proceso.tipo} ${tieneInventario ? 'inventario-completo' : ''}">
                <i class="fas ${tieneInventario ? 'fa-check' : icono}"></i>
            </div>
            <div class="proceso-drag-info">
                <div class="proceso-drag-name">
                    ${proceso.orden ? `<span class="proceso-orden">${proceso.orden}</span>` : ''}
                    ${proceso.nombre}
                    ${proceso.simultaneo ? `<span class="proceso-simultaneo-badge" title="Puede ejecutarse simultáneamente"><i class="fas fa-layer-group"></i></span>` : ''}
                </div>
                <div class="proceso-drag-detail">
                    ${tieneInventario ? `
                        <span class="piezas-inventario-completo">${cantidadTotal}/${cantidadTotal} pzas</span>
                    ` : `
                        <span>${piezasCompletadas}/${cantidadTotal} pzas</span>
                    `}
                    ${cantidadAsignadas > 0 && !tieneInventario ? `
                        <span class="proceso-estaciones-badge ${estaTrabajandose ? 'trabajando' : 'sin-iniciar'}" title="${estacionesAsignadas.join(', ')}">
                            <i class="fas fa-desktop"></i> ${cantidadAsignadas}
                            ${estaTrabajandose ? '<i class="fas fa-check estado-icon"></i>' : '<i class="fas fa-hourglass-half estado-icon"></i>'}
                        </span>
                    ` : ''}
                    ${!puedeAsignar && !fueDesbloqueado && !tieneInventario ? `<span class="proceso-dependencia-badge" title="${dependenciaInfo.mensaje}"><i class="fas fa-clock"></i> Esperando</span>` : ''}
                </div>
                <div class="proceso-mini-progress">
                    <div class="proceso-mini-progress-bar ${tieneInventario ? 'completado' : proceso.estado}" style="width: ${tieneInventario ? 100 : progreso}%"></div>
                </div>
            </div>
            <div class="proceso-drag-status ${tieneInventario ? 'completado' : proceso.estado}"></div>
            ${!tieneInventario ? `
            <div class="proceso-ver-mas">
                <i class="fas fa-eye"></i>
            </div>
            ` : ''}
        </div>
    `;
}

// Verificar si las dependencias de un proceso están completadas
function verificarDependenciasProceso(proceso, pedido) {
    const nombreLower = (proceso.nombre || '').toLowerCase().trim();
    const procesosDelPedido = pedido?.procesos || [];
    const cantidadTotal = pedido?.productos?.[0]?.cantidad || pedido?.cantidad || 100;

    // IMPORTANTE: Priorizar el productoId del proceso (viene de rutaProcesos)
    // Si no existe, usar el del primer producto del pedido
    const productoId = proceso.productoId || pedido?.productos?.[0]?.productoId || pedido?.productoId;

    // VERIFICAR SI FUE DESBLOQUEADO MANUALMENTE POR LA SUPERVISORA
    const procesosDesbloqueados = JSON.parse(localStorage.getItem('procesos_desbloqueados') || '{}');
    const keyDesbloqueo = `${pedido?.id || 0}-${proceso.id}`;
    if (procesosDesbloqueados[keyDesbloqueo]) {
        return { disponible: true, mensaje: '', desbloqueadoManual: true };
    }

    // VERIFICAR SI HAY INVENTARIO SUFICIENTE PARA ESTE PROCESO
    // Si hay inventario >= cantidad del pedido, el proceso se considera completado automáticamente
    if (typeof db !== 'undefined' && db.getInventarioPiezaByProductoProceso && productoId) {
        const procesoNombre = proceso.nombre || proceso.procesoNombre || '';
        const inventarioPieza = db.getInventarioPiezaByProductoProceso(productoId, procesoNombre);

        DEBUG_MODE && console.log('[SUPERVISORA-INV] Verificando inventario - productoId:', productoId,
                    'proceso:', procesoNombre,
                    'inventario:', inventarioPieza?.cantidadDisponible || 0,
                    'necesario:', cantidadTotal);

        if (inventarioPieza && inventarioPieza.cantidadDisponible >= cantidadTotal) {
            // Hay suficiente inventario, marcar como completado
            DEBUG_MODE && console.log('[SUPERVISORA-INV] ✓ Proceso tiene inventario suficiente:', procesoNombre);
            return {
                disponible: true,
                mensaje: '',
                tieneInventario: true,
                inventarioDisponible: inventarioPieza.cantidadDisponible
            };
        }
    }

    // 1. Procesos de CORTE - Siempre disponibles (son independientes y paralelos)
    if (nombreLower.includes('corte') || nombreLower.includes('cortar') ||
        proceso.tipo === 'corte' || nombreLower.startsWith('corte')) {
        return { disponible: true, mensaje: '' };
    }

    // 2. Procesos marcados explícitamente como INDEPENDIENTES o PARALELOS
    if (proceso.independiente === true || proceso.paralelo === true) {
        return { disponible: true, mensaje: '' };
    }

    // 3. Si tiene dependencias explícitas definidas, usarlas
    if (proceso.dependencias && Array.isArray(proceso.dependencias) && proceso.dependencias.length > 0) {
        const dependenciasNoCompletadas = proceso.dependencias.filter(depId => {
            const procesoDep = procesosDelPedido.find(p => p.id === depId || p.orden === depId);
            if (!procesoDep) return false;
            return procesoDep.estado !== 'completado' && procesoDep.estado !== 'terminado';
        });

        if (dependenciasNoCompletadas.length > 0) {
            const procesoFaltante = procesosDelPedido.find(p => p.id === dependenciasNoCompletadas[0] || p.orden === dependenciasNoCompletadas[0]);
            return {
                disponible: false,
                mensaje: `Esperando: "${procesoFaltante?.nombre || 'proceso anterior'}"`,
                puedeDesbloquear: true
            };
        }
        return { disponible: true, mensaje: '' };
    }

    // LÓGICA POR TIPO DE PROCESO (cuando no hay dependencias explícitas)

    // 4. SERIGRAFÍA/IMPRESIÓN - Necesitan que AL MENOS UN corte tenga piezas listas
    if (nombreLower.includes('serigrafia') || nombreLower.includes('serigrafía') ||
        nombreLower.includes('impresion') || nombreLower.includes('impresión')) {

        const cortes = procesosDelPedido.filter(p =>
            p.nombre?.toLowerCase().includes('corte')
        );

        // Si no hay cortes definidos, disponible
        if (cortes.length === 0) {
            return { disponible: true, mensaje: '' };
        }

        // Verificar si hay al menos un corte con piezas o completado
        const cortesConPiezas = cortes.filter(p =>
            p.estado === 'completado' || p.estado === 'terminado' ||
            (p.piezas && p.piezas > 0)
        );

        if (cortesConPiezas.length > 0) {
            return { disponible: true, mensaje: '' };
        }

        // Verificar si hay cortes en proceso (bloqueado pero con opción de desbloquear)
        const cortesEnProceso = cortes.filter(p =>
            p.estado === 'en-proceso' || p.estado === 'en_proceso'
        );

        if (cortesEnProceso.length > 0) {
            return {
                disponible: false,
                mensaje: `Esperando cortes en proceso`,
                puedeDesbloquear: true
            };
        }

        return {
            disponible: false,
            mensaje: `Esperando que inicien cortes`,
            puedeDesbloquear: true
        };
    }

    // 5. COSTURA - Necesita serigrafía (si existe) y al menos un corte con piezas
    if (nombreLower.includes('costura') || nombreLower.includes('cerrado')) {
        // Verificar serigrafías
        const serigrafias = procesosDelPedido.filter(p =>
            p.nombre?.toLowerCase().includes('serigrafia') ||
            p.nombre?.toLowerCase().includes('serigrafía') ||
            p.nombre?.toLowerCase().includes('impresion') ||
            p.nombre?.toLowerCase().includes('impresión')
        );

        if (serigrafias.length > 0) {
            const serigrafiasPendientes = serigrafias.filter(p =>
                p.estado !== 'completado' && p.estado !== 'terminado' &&
                (!p.piezas || p.piezas === 0)
            );
            if (serigrafiasPendientes.length === serigrafias.length) {
                return {
                    disponible: false,
                    mensaje: `Esperando serigrafía/impresión`,
                    puedeDesbloquear: true
                };
            }
        }

        // Verificar cortes
        const cortes = procesosDelPedido.filter(p =>
            p.nombre?.toLowerCase().includes('corte')
        );

        if (cortes.length > 0) {
            const cortesConPiezas = cortes.filter(p =>
                p.estado === 'completado' || p.estado === 'terminado' ||
                (p.piezas && p.piezas > 0)
            );

            if (cortesConPiezas.length === 0) {
                return {
                    disponible: false,
                    mensaje: `Esperando cortes (${cortes.length} pendientes)`,
                    puedeDesbloquear: true
                };
            }
        }

        return { disponible: true, mensaje: '' };
    }

    // 6. CALIDAD/REVISIÓN - Necesita que haya costuras con piezas
    if (nombreLower.includes('calidad') || nombreLower.includes('revision') ||
        nombreLower.includes('revisión') || nombreLower.includes('inspeccion')) {
        const costuras = procesosDelPedido.filter(p =>
            p.nombre?.toLowerCase().includes('costura') ||
            p.nombre?.toLowerCase().includes('cerrado')
        );

        if (costuras.length > 0) {
            const costurasConPiezas = costuras.filter(p =>
                p.estado === 'completado' || p.estado === 'terminado' ||
                (p.piezas && p.piezas > 0)
            );

            if (costurasConPiezas.length === 0) {
                return {
                    disponible: false,
                    mensaje: `Esperando costuras`,
                    puedeDesbloquear: true
                };
            }
        }
        return { disponible: true, mensaje: '' };
    }

    // 7. EMPAQUE - Necesita calidad con piezas
    if (nombreLower.includes('empaque') || nombreLower.includes('embalaje')) {
        const calidades = procesosDelPedido.filter(p =>
            p.nombre?.toLowerCase().includes('calidad') || p.nombre?.toLowerCase().includes('revision')
        );
        if (calidades.length > 0) {
            const calidadesOk = calidades.filter(p =>
                p.estado === 'completado' || p.estado === 'terminado' || (p.piezas && p.piezas > 0)
            );
            if (calidadesOk.length === 0) {
                return { disponible: false, mensaje: 'Esperando calidad', puedeDesbloquear: true };
            }
        }
        return { disponible: true, mensaje: '' };
    }

    // 8. Por defecto - disponible
    return { disponible: true, mensaje: '' };
}

/**
 * Usa piezas del inventario para completar un proceso
 * Descuenta del inventario y marca el proceso como completado
 */
function usarInventarioProceso(procesoId, pedidoId, cantidadNecesaria) {
    DEBUG_MODE && console.log('[SUPERVISORA] Usando inventario para proceso:', procesoId, 'pedido:', pedidoId, 'cantidad:', cantidadNecesaria);

    // Buscar el pedido y proceso
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    if (!pedido) {
        showToast('Pedido no encontrado', 'error');
        return;
    }

    const proceso = pedido.procesos?.find(p => p.id === procesoId || String(p.id) === String(procesoId));
    if (!proceso) {
        showToast('Proceso no encontrado', 'error');
        return;
    }

    // Obtener productoId
    const productoId = proceso.productoId || pedido?.productos?.[0]?.productoId || pedido?.productoId;
    if (!productoId) {
        showToast('No se pudo identificar el producto', 'error');
        return;
    }

    // Buscar el inventario
    const procesoNombre = proceso.nombre || proceso.procesoNombre || '';
    const inventarioPieza = db.getInventarioPiezaByProductoProceso(productoId, procesoNombre);

    if (!inventarioPieza) {
        showToast('No hay inventario disponible para este proceso', 'error');
        return;
    }

    if (inventarioPieza.cantidadDisponible < cantidadNecesaria) {
        showToast(`Inventario insuficiente. Disponible: ${inventarioPieza.cantidadDisponible}, Necesario: ${cantidadNecesaria}`, 'warning');
        return;
    }

    // Confirmar acción
    if (!confirm(`¿Descontar ${cantidadNecesaria} piezas del inventario de "${procesoNombre}"?\n\nDisponible: ${inventarioPieza.cantidadDisponible} piezas\nDespués: ${inventarioPieza.cantidadDisponible - cantidadNecesaria} piezas`)) {
        return;
    }

    // Descontar del inventario
    const resultado = db.descontarPiezasInventario(
        inventarioPieza.id,
        cantidadNecesaria,
        `Usado para pedido #${pedidoId}`,
        pedidoId
    );

    if (resultado && resultado.error) {
        showToast(resultado.error, 'error');
        return;
    }

    // Marcar proceso como completado
    proceso.estado = 'completado';
    proceso.piezas = cantidadNecesaria;
    proceso.completadoConInventario = true;
    proceso.fechaCompletado = new Date().toISOString();

    // Guardar en pedidos_erp para sincronizar con operadoras
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    let pedidoERP = pedidosERP.find(p => p.id === pedidoId);
    if (!pedidoERP) {
        pedidoERP = {
            id: pedidoId,
            procesos: []
        };
        pedidosERP.push(pedidoERP);
    }
    if (!pedidoERP.procesos) pedidoERP.procesos = [];

    // Actualizar o agregar el proceso
    let procesoERP = pedidoERP.procesos.find(p =>
        p.id === procesoId || String(p.id) === String(procesoId) ||
        (p.nombre || '').toLowerCase() === procesoNombre.toLowerCase()
    );

    if (procesoERP) {
        procesoERP.estado = 'completado';
        procesoERP.piezas = cantidadNecesaria;
        procesoERP.completadoConInventario = true;
    } else {
        pedidoERP.procesos.push({
            id: procesoId,
            nombre: procesoNombre,
            estado: 'completado',
            piezas: cantidadNecesaria,
            completadoConInventario: true,
            fechaCompletado: new Date().toISOString()
        });
    }

    localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));

    // Guardar en el registro
    guardarRegistroUsoInventario({
        pedidoId,
        procesoId,
        procesoNombre,
        productoId,
        cantidad: cantidadNecesaria,
        inventarioPiezaId: inventarioPieza.id,
        saldoAnterior: inventarioPieza.cantidadDisponible + cantidadNecesaria,
        saldoNuevo: inventarioPieza.cantidadDisponible,
        fecha: new Date().toISOString()
    });

    showToast(`✓ ${cantidadNecesaria} piezas tomadas del inventario. Proceso "${procesoNombre}" completado.`, 'success');

    // Actualizar UI
    renderPedidosList();
    updateStats();
}

/**
 * Guarda registro de uso de inventario
 */
function guardarRegistroUsoInventario(registro) {
    const registros = JSON.parse(localStorage.getItem('supervisora_uso_inventario') || '[]');
    registros.unshift(registro);
    localStorage.setItem('supervisora_uso_inventario', JSON.stringify(registros.slice(0, 500)));
    DEBUG_MODE && console.log('[SUPERVISORA] Registro de uso de inventario guardado:', registro);
}

// Función para desbloquear un proceso manualmente
function desbloquearProcesoManual(pedidoId, procesoId) {
    const procesosDesbloqueados = JSON.parse(localStorage.getItem('procesos_desbloqueados') || '{}');
    const key = `${pedidoId}-${procesoId}`;
    procesosDesbloqueados[key] = {
        timestamp: Date.now(),
        desbloqueadoPor: 'supervisora'
    };
    localStorage.setItem('procesos_desbloqueados', JSON.stringify(procesosDesbloqueados));

    // Mostrar notificación
    showToast('Proceso desbloqueado manualmente', 'success');

    // Re-renderizar lista de pedidos para actualizar visual
    renderPedidosList();

    // Cerrar modal si está abierto
    closeModal();
}

// Función para bloquear un proceso (revertir desbloqueo)
function bloquearProcesoManual(pedidoId, procesoId) {
    const procesosDesbloqueados = JSON.parse(localStorage.getItem('procesos_desbloqueados') || '{}');
    const key = `${pedidoId}-${procesoId}`;
    delete procesosDesbloqueados[key];
    localStorage.setItem('procesos_desbloqueados', JSON.stringify(procesosDesbloqueados));

    showToast('Proceso bloqueado nuevamente', 'info');
    renderPedidosList();
    closeModal();
}

// Toggle expandir/colapsar pedido
function togglePedidoExpand(pedidoId) {
    if (supervisoraState.expandedPedidos.has(pedidoId)) {
        supervisoraState.expandedPedidos.delete(pedidoId);
    } else {
        supervisoraState.expandedPedidos.add(pedidoId);
    }

    // Actualizar solo el card afectado
    const card = document.querySelector(`[data-pedido-id="${pedidoId}"]`);
    if (card) {
        card.classList.toggle('open');
    }
}

// Filtrar pedidos
function filterPedidos(filter) {
    supervisoraState.pedidoFilter = filter;

    // Actualizar botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    renderPedidosList();
}

// Drag proceso
function dragProceso(event, procesoId, pedidoId) {
    event.dataTransfer.setData('procesoId', procesoId);
    event.dataTransfer.setData('pedidoId', pedidoId);
    event.dataTransfer.setData('type', 'proceso');

    event.target.classList.add('dragging');
    setTimeout(() => event.target.classList.remove('dragging'), 0);
}

function renderOperadoresList() {
    const container = document.getElementById('operadoresList');
    const countEl = document.getElementById('operadoresCount');

    if (supervisoraState.operadores.length === 0) {
        container.innerHTML = '<p class="empty-text">No hay operadores</p>';
        if (countEl) countEl.textContent = '0';
        return;
    }

    // Agrupar operadores por estado:
    // - Inactivo: No ha iniciado sesión (no está en ninguna estación)
    // - Activo: Ha iniciado sesión en estación pero sin proceso
    // - En desarrollo: Tiene proceso asignado y está trabajando
    const inactivos = [];     // Sin sesión iniciada
    const activos = [];       // En estación pero sin proceso
    const enDesarrollo = [];  // Trabajando con proceso

    supervisoraState.operadores.forEach(op => {
        // Buscar en qué estación está (buscando en arrays de operadores)
        const estacionAsignada = Object.entries(supervisoraState.maquinas).find(([id, m]) =>
            m.operadores && m.operadores.some(o => o.id === op.id)
        );

        if (estacionAsignada) {
            const [estacionId, maquina] = estacionAsignada;
            const colaOp = getColaOperador(op.id);
            const procesoActual = colaOp.find(p => p.estado === 'en_progreso');

            // Verificar si tiene proceso (en cola o en la estación)
            const tieneProcesoActivo = procesoActual || maquina.procesoNombre;

            if (tieneProcesoActivo) {
                enDesarrollo.push({
                    ...op,
                    estacionId: estacionId,
                    procesoNombre: procesoActual?.procesoNombre || maquina.procesoNombre
                });
            } else {
                activos.push({ ...op, estacionId: estacionId });
            }
        } else {
            inactivos.push(op);
        }
    });

    // Actualizar contador (activos + en desarrollo = trabajando)
    const trabajando = activos.length + enDesarrollo.length;
    if (countEl) countEl.textContent = `${trabajando}/${supervisoraState.operadores.length}`;

    let html = '';

    // En desarrollo (trabajando con proceso)
    if (enDesarrollo.length > 0) {
        html += `<div class="operadores-grupo">
            <div class="operadores-grupo-header en-desarrollo">
                <i class="fas fa-cog fa-spin"></i>
                <span>En Desarrollo</span>
                <span class="operadores-grupo-count">${enDesarrollo.length}</span>
            </div>`;
        html += enDesarrollo.map(op => `
            <div class="operador-card en-desarrollo">
                <div class="operador-avatar trabajando">${getIniciales(op.nombre)}</div>
                <div class="operador-info">
                    <span class="operador-nombre">${op.nombre}</span>
                    <span class="operador-estacion"><i class="fas fa-map-marker-alt"></i> ${op.estacionId}</span>
                    <span class="operador-proceso"><i class="fas fa-cog fa-spin"></i> ${op.procesoNombre}</span>
                </div>
            </div>
        `).join('');
        html += '</div>';
    }

    // Activos (en estación pero sin proceso)
    if (activos.length > 0) {
        html += `<div class="operadores-grupo">
            <div class="operadores-grupo-header activos">
                <i class="fas fa-check-circle"></i>
                <span>Activos</span>
                <span class="operadores-grupo-count">${activos.length}</span>
            </div>`;
        html += activos.map(op => `
            <div class="operador-card activo">
                <div class="operador-avatar activo">${getIniciales(op.nombre)}</div>
                <div class="operador-info">
                    <span class="operador-nombre">${op.nombre}</span>
                    <span class="operador-estacion"><i class="fas fa-map-marker-alt"></i> ${op.estacionId}</span>
                    <span class="operador-sin-proceso"><i class="fas fa-hourglass-half"></i> Esperando proceso</span>
                </div>
            </div>
        `).join('');
        html += '</div>';
    }

    // Inactivos (sin sesión)
    if (inactivos.length > 0) {
        html += `<div class="operadores-grupo">
            <div class="operadores-grupo-header inactivos">
                <i class="fas fa-user-slash"></i>
                <span>Sin Sesión</span>
                <span class="operadores-grupo-count">${inactivos.length}</span>
            </div>`;
        html += inactivos.map(op => `
            <div class="operador-card inactivo"
                 draggable="true"
                 ondragstart="dragOperador(event, ${op.id})">
                <div class="operador-avatar inactivo">${getIniciales(op.nombre)}</div>
                <div class="operador-info">
                    <span class="operador-nombre">${op.nombre}</span>
                    <span class="operador-sin-sesion"><i class="fas fa-sign-in-alt"></i> Sin sesión</span>
                </div>
            </div>
        `).join('');
        html += '</div>';
    }

    container.innerHTML = html || '<p class="empty-text">No hay operadores</p>';
}

function renderProcesosActivos() {
    const container = document.getElementById('procesosActivos');

    const activos = Object.values(supervisoraState.maquinas).filter(m => m.estado === 'activo' && m.procesoNombre);

    if (activos.length === 0) {
        container.innerHTML = '<p class="empty-text">No hay procesos activos</p>';
        return;
    }

    container.innerHTML = activos.map(m => `
        <div class="proceso-item">
            <span class="proceso-estacion">${m.id}</span>
            <span class="proceso-nombre">${S(m.procesoNombre)}</span>
            <span class="proceso-piezas">${m.piezasHoy} pzas</span>
        </div>
    `).join('');
}

// Alertas descartadas por la supervisora en esta sesión
// Clave = "tipo:cantidad" para que reaparezca si la situación cambia
function getAlertasDescartadas() {
    try {
        return JSON.parse(localStorage.getItem('sup_alertas_descartadas') || '{}');
    } catch (e) { return {}; }
}

function descartarAlertaSup(alertaKey) {
    var descartadas = getAlertasDescartadas();
    descartadas[alertaKey] = Date.now();
    localStorage.setItem('sup_alertas_descartadas', JSON.stringify(descartadas));
    renderAlertas();
}
window.descartarAlertaSup = descartarAlertaSup;

function renderAlertas() {
    const container = document.getElementById('alertasList');
    const alertas = [];
    const descartadas = getAlertasDescartadas();

    // 1. Estaciones con operador pero sin proceso asignado
    const sinProceso = Object.values(supervisoraState.maquinas).filter(m =>
        m.operadorId && !m.procesoId
    );
    if (sinProceso.length > 0) {
        alertas.push({
            key: 'sin_proceso_' + sinProceso.length,
            tipo: 'warning',
            mensaje: `${sinProceso.length} estacion${sinProceso.length > 1 ? 'es' : ''} sin proceso`,
            icono: 'fa-exclamation-triangle',
            detalle: sinProceso.map(m => m.id).slice(0, 3).join(', ') + (sinProceso.length > 3 ? '...' : '')
        });
    }

    // 2. Procesos pendientes sin asignar
    let procesosPendientes = 0;
    supervisoraState.pedidosHoy.forEach(pedido => {
        if (pedido.procesos) {
            procesosPendientes += pedido.procesos.filter(p =>
                p.estado === 'pendiente' &&
                !Object.values(supervisoraState.maquinas).some(m => m.procesoId === p.id)
            ).length;
        }
    });
    if (procesosPendientes > 0) {
        alertas.push({
            key: 'proc_sin_asignar_' + procesosPendientes,
            tipo: 'info',
            mensaje: `${procesosPendientes} proceso${procesosPendientes > 1 ? 's' : ''} sin asignar`,
            icono: 'fa-tasks'
        });
    }

    // 3. Pedidos urgentes
    const urgentes = supervisoraState.pedidosHoy.filter(p =>
        p.prioridad === 'alta' || p.prioridad === 'urgente'
    );
    if (urgentes.length > 0) {
        alertas.push({
            key: 'urgentes_' + urgentes.length,
            tipo: 'danger',
            mensaje: `${urgentes.length} pedido${urgentes.length > 1 ? 's' : ''} urgente${urgentes.length > 1 ? 's' : ''}`,
            icono: 'fa-fire'
        });
    }

    // 4. Estaciones retrasadas
    const retrasadas = Object.values(supervisoraState.maquinas).filter(m => m.estado === 'retrasado');
    if (retrasadas.length > 0) {
        alertas.push({
            key: 'retrasadas_' + retrasadas.length,
            tipo: 'danger',
            mensaje: `${retrasadas.length} estacion${retrasadas.length > 1 ? 'es' : ''} retrasada${retrasadas.length > 1 ? 's' : ''}`,
            icono: 'fa-clock',
            detalle: retrasadas.map(m => m.id).slice(0, 3).join(', ')
        });
    }

    // 5. Operadores disponibles sin asignar
    const operadoresDisponibles = supervisoraState.operadores.filter(op =>
        !Object.values(supervisoraState.maquinas).some(m => m.operadorId === op.id)
    );
    if (operadoresDisponibles.length > 0) {
        alertas.push({
            key: 'op_disponibles_' + operadoresDisponibles.length,
            tipo: 'info',
            mensaje: `${operadoresDisponibles.length} operador${operadoresDisponibles.length > 1 ? 'es' : ''} disponible${operadoresDisponibles.length > 1 ? 's' : ''}`,
            icono: 'fa-user-plus',
            detalle: operadoresDisponibles.map(o => o.nombre.split(' ')[0]).slice(0, 2).join(', ')
        });
    }

    // 6. Maquinas inactivas (solo si hay muchas)
    const inactivas = Object.values(supervisoraState.maquinas).filter(m => m.estado === 'inactivo');
    if (inactivas.length > 3) {
        alertas.push({
            key: 'inactivas_' + inactivas.length,
            tipo: 'warning',
            mensaje: `${inactivas.length} estaciones inactivas`,
            icono: 'fa-power-off'
        });
    }

    // Filtrar alertas descartadas por la supervisora
    // Las alertas descartadas expiran después de 24 horas
    const ALERTA_EXPIRY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const alertasVisibles = alertas.filter(a => {
        const dismissedAt = descartadas[a.key];
        if (!dismissedAt) return true;
        // Compatibilidad: valor true (formato anterior) = descartada permanente por esta sesión
        if (dismissedAt === true) return false;
        // Valor timestamp: verificar si expiró
        return (now - dismissedAt) > ALERTA_EXPIRY_MS;
    });

    if (alertasVisibles.length === 0) {
        container.innerHTML = `
            <div class="empty-text success">
                <i class="fas fa-check-circle"></i>
                <span>Todo en orden</span>
            </div>`;
        return;
    }

    container.innerHTML = alertasVisibles.map(a => `
        <div class="alerta-item ${a.tipo}">
            <i class="fas ${a.icono}"></i>
            <div class="alerta-content">
                <span class="alerta-mensaje">${S(a.mensaje)}</span>
                ${a.detalle ? `<span class="alerta-detalle">${S(a.detalle)}</span>` : ''}
            </div>
            <button class="alerta-dismiss" onclick="descartarAlertaSup('${a.key}')" title="Descartar">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// ========================================
// SELECCION Y DETALLE
// ========================================

function selectEstacion(estacionId) {
    // Deseleccionar anterior
    document.querySelectorAll('.estacion-element.selected').forEach(el => {
        el.classList.remove('selected');
    });

    supervisoraState.selectedEstacion = estacionId;

    if (estacionId) {
        const el = document.getElementById('estacion-' + estacionId);
        if (el) el.classList.add('selected');
        showEstacionDetalle(estacionId);
    } else {
        showNoEstacionSelection();
    }
}

function showNoEstacionSelection() {
    document.getElementById('estacionDetalle').innerHTML = `
        <div class="no-selection">
            <i class="fas fa-mouse-pointer"></i>
            <p>Selecciona una estacion para ver detalles</p>
        </div>
    `;
}

function showEstacionDetalle(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    const layoutElement = supervisoraState.layout?.elements.find(e => e.id === estacionId);
    const operadoresCount = maquina.operadores?.length || 0;

    // Obtener información de estado real de la estación
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    const asignacionesEstaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const estadoEstacion = estadoMaquinas[estacionId] || {};
    const asignacionEstacion = asignacionesEstaciones[estacionId] || {};

    // Determinar proceso actual de la estación (priorizar datos de localStorage)
    const procesoActualEstacion = estadoEstacion.procesoNombre || asignacionEstacion.procesoNombre || maquina.procesoNombre;
    const estaTrabajandoEstacion = estadoEstacion.estado === 'trabajando' || estadoEstacion.procesoActivo;
    const piezasHoyEstacion = estadoEstacion.piezasHoy || maquina.piezasHoy || 0;

    // Generar lista de operadores con proceso actual de la estación
    const operadoresListHTML = operadoresCount > 0
        ? maquina.operadores.map(op => {
            // Usar el proceso de la estación (no cola individual del operador)
            const tieneProcesoActivo = procesoActualEstacion ? true : false;

            // Calcular estado del operador basado en actividad
            let estadoOperador = 'sin-iniciar';
            let colorEstado = '#f59e0b'; // Naranja por defecto

            if (tieneProcesoActivo) {
                if (estaTrabajandoEstacion || piezasHoyEstacion > 0) {
                    estadoOperador = 'trabajando';
                    colorEstado = '#10b981'; // Verde
                } else {
                    estadoOperador = 'asignado';
                    colorEstado = '#f59e0b'; // Naranja
                }
            }

            // Cola de procesos de la estación
            const colaProcesos = maquina.colaProcesos || [];

            return `
            <div class="detalle-operador-item ${estadoOperador}">
                <div class="detalle-op-main">
                    <span class="detalle-op-avatar" style="border-color: ${colorEstado}">${getIniciales(op.nombre)}</span>
                    <div class="detalle-op-info">
                        <span class="detalle-op-nombre">${op.nombre}</span>
                        ${tieneProcesoActivo ? `
                            <span class="detalle-op-proceso ${estadoOperador}">
                                <i class="fas ${estaTrabajandoEstacion ? 'fa-play-circle' : 'fa-hourglass-half'}"></i>
                                ${procesoActualEstacion}
                                ${piezasHoyEstacion > 0 ? `<span class="piezas-mini">(${piezasHoyEstacion} pzas)</span>` : ''}
                            </span>
                        ` : '<span class="detalle-op-proceso sin-proceso"><i class="fas fa-pause-circle"></i> Sin proceso asignado</span>'}
                    </div>
                </div>
                <div class="detalle-op-cola">
                    ${colaProcesos.length > 0 ? `
                        <span class="cola-badge" title="${colaProcesos.map(p => p.procesoNombre).join(' → ')}">
                            <i class="fas fa-list"></i> ${colaProcesos.length} en cola
                        </span>
                    ` : `
                        <span class="cola-badge vacia" title="Sin procesos en cola">
                            <i class="fas fa-inbox"></i> Sin cola
                        </span>
                    `}
                </div>
                <div class="detalle-op-actions">
                    <button class="btn-asignar-sm" onclick="abrirAsignarSiguienteProceso(${op.id})" title="Gestionar cola de procesos">
                        <i class="fas fa-tasks"></i>
                    </button>
                    ${tieneProcesoActivo ? `
                    <button class="btn-completar-sm" onclick="completarProcesoEstacion('${estacionId}')" title="Completar proceso actual">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-cancelar-sm" onclick="quitarProcesoDeEstacion('${estacionId}')" title="Quitar proceso actual">
                        <i class="fas fa-stop"></i>
                    </button>
                    ` : ''}
                    <button class="btn-liberar-sm" onclick="solicitarLiberacion('${estacionId}', ${op.id})" title="Liberar operador">
                        <i class="fas fa-user-clock"></i>
                    </button>
                    <button class="btn-remove-sm" onclick="removeOperadorFromEstacion('${estacionId}', ${op.id})" title="Quitar operador">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `}).join('')
        : '<span class="sin-asignar">Sin operadores asignados</span>';

    document.getElementById('estacionDetalle').innerHTML = `
        <div class="detalle-header">
            <div class="detalle-id">${estacionId}</div>
            <span class="estado-badge ${maquina.estado}">${maquina.estado}</span>
        </div>

        <div class="detalle-info">
            <div class="info-row">
                <label>Tipo:</label>
                <span>${layoutElement?.type || maquina.tipo || 'N/A'}</span>
            </div>
            ${(() => {
                // Obtener info de procesos simultáneos activos
                const asignacionesEstaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
                const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
                const asignacion = asignacionesEstaciones[estacionId];
                const estadoMaquina = estadoMaquinas[estacionId];

                const modoSimultaneo = asignacion?.modoSimultaneo || estadoMaquina?.modoSimultaneo;
                const procesosSimultaneosActivos = asignacion?.procesosSimultaneosActivos || [];
                const procesosSimultaneosInfo = estadoMaquina?.procesosSimultaneos || [];

                // Determinar todos los procesos activos (el actual + simultáneos de la cola)
                let procesosActivos = [];
                if (maquina.procesoNombre) {
                    procesosActivos.push({
                        procesoId: maquina.procesoId,
                        procesoNombre: maquina.procesoNombre,
                        pedidoCodigo: maquina.pedidoCodigo || '',
                        productoNombre: maquina.productoNombre || '',
                        esPrincipal: true
                    });
                }

                // Agregar procesos de la cola que están en simultáneos activos
                if (maquina.colaProcesos && modoSimultaneo) {
                    maquina.colaProcesos.forEach(p => {
                        if (procesosSimultaneosActivos.includes(p.procesoId) ||
                            procesosSimultaneosInfo.some(ps => ps.procesoId === p.procesoId)) {
                            procesosActivos.push({
                                ...p,
                                esPrincipal: false,
                                esSimultaneo: true
                            });
                        }
                    });
                }

                // Filtrar cola para mostrar solo los que NO están en simultáneos activos
                const colaPendiente = (maquina.colaProcesos || []).filter(p => {
                    if (!modoSimultaneo) return true;
                    return !procesosSimultaneosActivos.includes(p.procesoId) &&
                           !procesosSimultaneosInfo.some(ps => ps.procesoId === p.procesoId);
                });

                let html = '';

                // Mostrar procesos activos (incluyendo simultáneos)
                if (procesosActivos.length > 0) {
                    const haySimultaneos = procesosActivos.length > 1;
                    html += `
                    <div class="info-row proceso-actual-row">
                        <label>${haySimultaneos ? 'Procesos Simultáneos Activos:' : 'Proceso Actual:'}</label>
                        <div class="procesos-activos-list ${haySimultaneos ? 'modo-simultaneo' : ''}">
                            ${procesosActivos.map((p, idx) => `
                                <div class="proceso-activo-item ${p.esSimultaneo ? 'simultaneo' : 'principal'}">
                                    <div class="proceso-activo-info">
                                        <span class="proceso-nombre-badge">
                                            <i class="fas ${p.esSimultaneo ? 'fa-layer-group' : 'fa-cog fa-spin'}"></i>
                                            ${p.procesoNombre}
                                        </span>
                                        ${p.pedidoCodigo ? `<span class="proceso-pedido-mini">${p.pedidoCodigo}</span>` : ''}
                                    </div>
                                    <div class="proceso-activo-actions">
                                        <button class="btn-completar-proceso" onclick="completarProcesoEstacion('${estacionId}', '${p.procesoId}')" title="Completar">
                                            <i class="fas fa-check"></i>
                                        </button>
                                        <button class="btn-quitar-proceso" onclick="quitarProcesoDeEstacion('${estacionId}', '${p.procesoId}')" title="Quitar">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    `;
                }

                // Mostrar cola pendiente (solo los que no están en simultáneos)
                if (colaPendiente.length > 0) {
                    html += `
                    <div class="info-row cola-procesos-row">
                        <label>Cola de Procesos (${colaPendiente.length}):</label>
                        <div class="cola-procesos-list">
                            ${colaPendiente.map((p, idx) => `
                                <div class="cola-proceso-item">
                                    <span class="cola-proceso-num">${idx + 1}</span>
                                    <div class="cola-proceso-info">
                                        <span class="cola-proceso-nombre">${p.procesoNombre}</span>
                                        <span class="cola-proceso-pedido">${p.pedidoCodigo} - ${p.productoNombre || 'Producto'}</span>
                                    </div>
                                    <div class="cola-proceso-actions">
                                        <button class="btn-up-sm" onclick="moverProcesoEnCola('${estacionId}', ${idx}, -1)" title="Subir" ${idx === 0 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-up"></i>
                                        </button>
                                        <button class="btn-down-sm" onclick="moverProcesoEnCola('${estacionId}', ${idx}, 1)" title="Bajar" ${idx === colaPendiente.length - 1 ? 'disabled' : ''}>
                                            <i class="fas fa-arrow-down"></i>
                                        </button>
                                        <button class="btn-remove-sm" onclick="quitarProcesoDeCola('${estacionId}', ${idx})" title="Quitar de cola">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    `;
                }

                return html;
            })()}
            <div class="info-row">
                <label>Operadores (${operadoresCount}):</label>
            </div>
            <div class="detalle-operadores-list">
                ${operadoresListHTML}
            </div>
            <div class="info-row">
                <label>Piezas Hoy:</label>
                <span class="piezas-count">${maquina.piezasHoy}</span>
            </div>
        </div>

        <div class="detalle-actions">
            ${supervisoraState.tiemposMuertos.activos[estacionId] ? `
                <button class="btn btn-success btn-sm" onclick="mostrarTiempoMuertoActivo('${estacionId}')">
                    <i class="fas fa-play-circle"></i> Finalizar Paro
                </button>
            ` : `
                <button class="btn btn-warning btn-sm" onclick="abrirModalTiempoMuerto('${estacionId}')">
                    <i class="fas fa-pause-circle"></i> Registrar Paro
                </button>
            `}
            <button class="btn btn-primary btn-sm" onclick="openEstacionModal('${estacionId}')">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn btn-secondary btn-sm" onclick="toggleEstadoEstacion('${estacionId}')">
                <i class="fas fa-power-off"></i> Cambiar Estado
            </button>
            ${operadoresCount > 1 ? `
            <button class="btn btn-outline btn-sm" onclick="liberarTodosOperadores('${estacionId}')">
                <i class="fas fa-users-slash"></i> Liberar Todos
            </button>
            ` : ''}
        </div>
    `;
}

// ========================================
// MODAL ESTACION
// ========================================

function openEstacionModal(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    // Operadores ya asignados a esta estación
    const operadoresAsignados = maquina.operadores || [];
    const idsAsignados = operadoresAsignados.map(op => op.id);

    // Operadores disponibles (no asignados a ninguna estación o solo a esta)
    const operadoresDisponibles = supervisoraState.operadores.filter(op => {
        // Verificar si está en otra estación
        const enOtraEstacion = Object.entries(supervisoraState.maquinas).some(([id, m]) =>
            id !== estacionId && m.operadores && m.operadores.some(o => o.id === op.id)
        );
        return !enOtraEstacion && !idsAsignados.includes(op.id);
    });

    // HTML de operadores asignados
    const operadoresAsignadosHTML = operadoresAsignados.length > 0
        ? operadoresAsignados.map(op => `
            <div class="modal-operador-item">
                <span class="modal-op-avatar">${getIniciales(op.nombre)}</span>
                <span class="modal-op-nombre">${op.nombre}</span>
                <button type="button" class="btn-remove-sm" onclick="modalRemoveOperador('${estacionId}', ${op.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('')
        : '<p class="text-muted">Sin operadores asignados</p>';

    const content = `
        <div class="estacion-form">
            <div class="form-group">
                <label>Operadores Asignados (${operadoresAsignados.length})</label>
                <div class="modal-operadores-list" id="modalOperadoresList">
                    ${operadoresAsignadosHTML}
                </div>
            </div>

            <div class="form-group">
                <label>Agregar Operador</label>
                <div class="add-operador-row">
                    <select id="modalOperadorAdd">
                        <option value="">-- Seleccionar operador --</option>
                        ${operadoresDisponibles.map(op => `
                            <option value="${op.id}">${op.nombre}</option>
                        `).join('')}
                    </select>
                    <button type="button" class="btn btn-sm btn-primary" onclick="modalAddOperador('${estacionId}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>

            <div class="form-group">
                <label>Proceso Actual</label>
                <input type="text" id="modalProceso" value="${maquina.procesoNombre || ''}"
                       placeholder="Ej: Costura lateral">
            </div>

            <div class="form-group">
                <label>Pedido</label>
                <select id="modalPedido">
                    <option value="">-- Sin pedido --</option>
                    ${supervisoraState.pedidosHoy.map(p => `
                        <option value="${p.id}" ${maquina.pedidoId === p.id ? 'selected' : ''}>
                            #${p.id} - ${p.clienteNombre || 'Pedido'}
                        </option>
                    `).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Estado</label>
                <select id="modalEstado">
                    <option value="activo" ${maquina.estado === 'activo' ? 'selected' : ''}>Activo</option>
                    <option value="pausado" ${maquina.estado === 'pausado' ? 'selected' : ''}>Pausado</option>
                    <option value="inactivo" ${maquina.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                </select>
            </div>

            <div class="form-group">
                <label>Piezas Producidas Hoy</label>
                <input type="number" id="modalPiezas" value="${maquina.piezasHoy || 0}" min="0">
            </div>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="saveEstacionChanges('${estacionId}')">
            <i class="fas fa-save"></i> Guardar
        </button>
    `;

    openModal(`Estacion ${estacionId}`, content, footer);
}

// Agregar operador desde el modal
function modalAddOperador(estacionId) {
    const select = document.getElementById('modalOperadorAdd');
    const operadorId = parseInt(select.value);
    if (!operadorId) return;

    assignOperadorToEstacion(operadorId, estacionId);
    // Refrescar el modal
    openEstacionModal(estacionId);
}

// Quitar operador desde el modal
function modalRemoveOperador(estacionId, operadorId) {
    removeOperadorFromEstacion(estacionId, operadorId);
    // Refrescar el modal
    openEstacionModal(estacionId);
}

function saveEstacionChanges(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    // Los operadores se manejan con modalAddOperador y modalRemoveOperador
    // Aquí solo guardamos los demás campos
    maquina.procesoNombre = document.getElementById('modalProceso').value;
    maquina.pedidoId = document.getElementById('modalPedido').value ? parseInt(document.getElementById('modalPedido').value) : null;
    maquina.estado = document.getElementById('modalEstado').value;
    maquina.piezasHoy = parseInt(document.getElementById('modalPiezas').value) || 0;

    // Si tiene operadores y está inactivo, activar
    if (maquina.operadores && maquina.operadores.length > 0 && maquina.estado === 'inactivo') {
        // Mantener el estado que el usuario eligió
    }

    // Guardar estado en localStorage
    saveEstadoMaquinas();

    // Re-renderizar
    renderLayoutInSupervisora(supervisoraState.layout);
    renderOperadoresList();
    renderProcesosActivos();
    updateStats();

    // Actualizar detalle si esta seleccionada
    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    closeModal();
    showToast('Estacion actualizada', 'success');
}

function toggleEstadoEstacion(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    const estados = ['activo', 'pausado', 'inactivo'];
    const currentIndex = estados.indexOf(maquina.estado);
    const nextIndex = (currentIndex + 1) % estados.length;

    maquina.estado = estados[nextIndex];

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    updateStats();

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    showToast(`Estado cambiado a: ${maquina.estado}`, 'info');
}

// ========================================
// DRAG AND DROP
// ========================================

function dragOperador(event, operadorId) {
    event.dataTransfer.setData('operadorId', operadorId);
    event.dataTransfer.setData('type', 'operador');
}

function dragPedido(event, pedidoId) {
    event.dataTransfer.setData('pedidoId', pedidoId);
    event.dataTransfer.setData('type', 'pedido');
}

function allowDrop(event) {
    event.preventDefault();
}

function dropOnEstacion(event, estacionId) {
    event.preventDefault();

    // Quitar highlight
    event.target.classList.remove('drop-target');

    const type = event.dataTransfer.getData('type');

    if (type === 'operador') {
        const operadorId = parseInt(event.dataTransfer.getData('operadorId'));
        assignOperadorToEstacion(operadorId, estacionId);
    } else if (type === 'pedido') {
        const pedidoId = parseInt(event.dataTransfer.getData('pedidoId'));
        assignPedidoToEstacion(pedidoId, estacionId);
    } else if (type === 'proceso') {
        // NO usar parseInt porque el ID puede ser un string compuesto como "1-2-0"
        const procesoId = event.dataTransfer.getData('procesoId');
        const pedidoId = parseInt(event.dataTransfer.getData('pedidoId'));
        DEBUG_MODE && console.log('[SUPERVISORA] Drop proceso:', procesoId, 'pedido:', pedidoId, 'estacion:', estacionId);
        assignProcesoToEstacion(procesoId, pedidoId, estacionId);
    }
}

function assignOperadorToEstacion(operadorId, estacionId) {
    const operador = supervisoraState.operadores.find(o => o.id === operadorId);
    if (!operador) return;

    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    // Inicializar array si no existe
    if (!maquina.operadores) {
        maquina.operadores = [];
    }

    // Verificar si ya está asignado a esta estación
    if (maquina.operadores.some(op => op.id === operadorId)) {
        showToast(`${operador.nombre} ya está en ${estacionId}`, 'warning');
        return;
    }

    // Quitar operador de OTRAS estaciones (un operador solo puede estar en una estación)
    Object.values(supervisoraState.maquinas).forEach(m => {
        if (m.id !== estacionId && m.operadores) {
            m.operadores = m.operadores.filter(op => op.id !== operadorId);
            // Si la estación quedó sin operadores, marcar como inactiva
            if (m.operadores.length === 0 && m.estado === 'activo') {
                m.estado = 'inactivo';
            }
        }
    });

    // Agregar operador a esta estación
    maquina.operadores.push({
        id: operadorId,
        nombre: operador.nombre
    });

    // Activar estación si estaba inactiva
    if (maquina.estado === 'inactivo') {
        maquina.estado = 'activo';
    }

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderOperadoresList();
    updateStats();

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    showToast(`${operador.nombre} agregado a ${estacionId} (${maquina.operadores.length} operador${maquina.operadores.length > 1 ? 'es' : ''})`, 'success');
}

// Quitar operador de una estación
function removeOperadorFromEstacion(estacionId, operadorId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina || !maquina.operadores) return;

    const operador = maquina.operadores.find(op => op.id === operadorId);
    if (!operador) return;

    // Quitar del array
    maquina.operadores = maquina.operadores.filter(op => op.id !== operadorId);

    // Si no quedan operadores, marcar como inactivo
    if (maquina.operadores.length === 0) {
        maquina.estado = 'inactivo';
    }

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderOperadoresList();
    updateStats();

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    showToast(`${operador.nombre} removido de ${estacionId}`, 'info');
}

function assignPedidoToEstacion(pedidoId, estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    maquina.pedidoId = pedidoId;

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    showToast(`Pedido #${pedidoId} asignado a ${estacionId}`, 'success');
}

// Asignar proceso a estacion
function assignProcesoToEstacion(procesoId, pedidoId, estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    DEBUG_MODE && console.log('[SUPERVISORA] Asignando proceso:', procesoId, 'pedido:', pedidoId, 'estacion:', estacionId);

    // Buscar el proceso en los pedidos - comparar como string para IDs compuestos
    let proceso = null;
    const pedido = supervisoraState.pedidosHoy.find(p => p.id == pedidoId);

    if (pedido && pedido.procesos) {
        DEBUG_MODE && console.log('[SUPERVISORA] Procesos del pedido:', pedido.procesos.map(p => ({id: p.id, nombre: p.nombre})));

        // Buscar por múltiples criterios
        proceso = pedido.procesos.find(p =>
            p.id == procesoId ||
            String(p.id) === String(procesoId) ||
            p.nombre === procesoId ||
            p.procesoNombre === procesoId
        );
    }

    // Si no se encuentra, buscar directamente en rutaProcesos del producto
    if (!proceso && pedido && pedido.productos) {
        DEBUG_MODE && console.log('[SUPERVISORA] Buscando en rutaProcesos de productos...');
        pedido.productos.forEach(prod => {
            if (!proceso) {
                const productoCompleto = db.getProducto(parseInt(prod.productoId));
                if (productoCompleto && productoCompleto.rutaProcesos) {
                    // Buscar por múltiples criterios en rutaProcesos
                    productoCompleto.rutaProcesos.forEach((proc, i) => {
                        if (!proceso) {
                            const idCompuesto = `${pedido.id}-${prod.productoId}-${i}`;
                            const coincide =
                                idCompuesto === String(procesoId) ||
                                proc.id == procesoId ||
                                proc.nombre === procesoId ||
                                proc.nombre === String(procesoId);

                            if (coincide) {
                                proceso = {
                                    id: procesoId,
                                    nombre: proc.nombre,
                                    tipo: proc.tipo || detectarTipoProceso(proc.nombre),
                                    tiempoEstandar: proc.tiempoEstandar || 0,
                                    productoNombre: productoCompleto.nombre,
                                    simultaneo: proc.simultaneo !== undefined ? proc.simultaneo : detectarProcesoSimultaneo(proc.nombre, proc.areaPlantaId),
                                    orden: proc.orden || i + 1
                                };
                                DEBUG_MODE && console.log('[SUPERVISORA] Proceso encontrado en rutaProcesos:', proceso);
                            }
                        }
                    });
                }
            }
        });
    }

    // FALLBACK FINAL: Si el procesoId contiene el nombre del proceso, usarlo directamente
    if (!proceso && procesoId) {
        // Extraer nombre del proceso del ID si es posible
        const procesoIdStr = String(procesoId);

        // Buscar en todos los procesos del pedido por nombre parcial
        if (pedido && pedido.procesos) {
            proceso = pedido.procesos.find(p =>
                procesoIdStr.includes(p.nombre) ||
                (p.nombre && p.nombre.includes(procesoIdStr))
            );
        }

        // Si aún no se encuentra, crear uno básico con el ID como nombre
        if (!proceso) {
            DEBUG_MODE && console.log('[SUPERVISORA] Creando proceso fallback con ID:', procesoId);
            proceso = {
                id: procesoId,
                nombre: procesoIdStr.split('-').pop() || procesoIdStr,
                tipo: 'general',
                tiempoEstandar: 0
            };
        }
    }

    if (!proceso) {
        console.error('[SUPERVISORA] Proceso no encontrado:', procesoId, 'en pedido:', pedidoId);
        showToast('Proceso no encontrado', 'error');
        return;
    }

    DEBUG_MODE && console.log('[SUPERVISORA] Proceso final a asignar:', proceso);

    // Obtener datos del producto completo para imagen y nombre
    let productoCompleto = null;
    let productoNombre = '';
    let productoImagen = null;

    if (pedido && pedido.productos && pedido.productos.length > 0) {
        const prod = pedido.productos[0];
        productoCompleto = db.getProducto(parseInt(prod.productoId) || prod.productoId);
        productoNombre = productoCompleto?.nombre || prod.nombre || pedido?.producto || 'Producto';
        productoImagen = productoCompleto?.imagen || prod.imagen || pedido?.imagen || null;
    }

    // Inicializar cola de procesos si no existe
    if (!maquina.colaProcesos) {
        maquina.colaProcesos = [];
    }

    // Verificar si el proceso ya está en la cola o es el actual
    const procesoYaAsignado = maquina.procesoId === procesoId ||
        maquina.colaProcesos.some(p => p.procesoId === procesoId);

    if (procesoYaAsignado) {
        showToast(`El proceso "${proceso.nombre}" ya está asignado a esta estación`, 'warning');
        return;
    }

    // Obtener cantidad real del pedido
    const cantidadPedido = pedido?.productos?.[0]?.cantidad || pedido?.cantidad || pedido?.cantidadTotal || 100;

    // Obtener nombre del cliente
    let clienteNombre = pedido?.clienteNombre || pedido?.cliente;
    if (!clienteNombre && pedido?.clienteId && typeof db !== 'undefined' && db.getCliente) {
        const cliente = db.getCliente(pedido.clienteId);
        clienteNombre = cliente?.nombreComercial || cliente?.nombre || 'Cliente';
    }

    // Crear objeto del proceso con todos los datos
    const procesoData = {
        procesoId: procesoId,
        procesoNombre: proceso.nombre,
        procesoTipo: proceso.tipo || 'general',
        pedidoId: pedidoId,
        pedidoCodigo: pedido?.codigo || `PED-${pedidoId}`,
        clienteNombre: clienteNombre || 'Cliente',
        productoNombre: productoNombre,
        productoImagen: productoImagen,
        meta: cantidadPedido,
        cantidadTotal: cantidadPedido,
        piezasCompletadas: 0,
        prioridad: pedido?.prioridad || 'normal',
        fechaEntrega: pedido?.fechaEntrega || null,
        fechaAsignacion: new Date().toISOString(),
        estado: 'pendiente',
        // Campo para indicar si puede ejecutarse simultáneamente
        simultaneo: proceso.simultaneo || false,
        orden: proceso.orden || 0
    };

    // Si no hay proceso activo, asignarlo directamente
    if (!maquina.procesoId) {
        maquina.procesoId = procesoId;
        maquina.procesoNombre = proceso.nombre;
        maquina.pedidoId = pedidoId;
        procesoData.estado = 'en_progreso';

        // Si hay operador asignado, activar la estacion
        if (maquina.operadores && maquina.operadores.length > 0) {
            maquina.estado = 'activo';
        }
    } else {
        // Agregar a la cola de procesos pendientes
        maquina.colaProcesos.push(procesoData);
        DEBUG_MODE && console.log('[SUPERVISORA] Proceso agregado a cola. Cola actual:', maquina.colaProcesos.length);
    }

    // Actualizar estado del proceso original a en-proceso
    proceso.estado = 'en-proceso';

    // *** IMPORTANTE: Sincronizar con panel operadora ***
    // Guardar en asignaciones_estaciones para que la operadora lo vea
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    // Si es el proceso activo, actualizar asignación principal
    if (maquina.procesoId === procesoId) {
        asignaciones[estacionId] = {
            ...procesoData,
            estado: 'asignado',
            asignadoPor: 'Coco'
        };
    }

    // Guardar también la cola de procesos
    if (!asignaciones[estacionId]) {
        asignaciones[estacionId] = {};
    }
    asignaciones[estacionId].colaProcesos = maquina.colaProcesos;

    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));

    // Sincronizar datos del pedido para que operadora los vea
    sincronizarPedidoParaOperadoras(pedidoId);

    DEBUG_MODE && console.log('[SUPERVISORA] Asignación creada. Proceso activo:', maquina.procesoId, 'Cola:', maquina.colaProcesos.length);

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderPedidosList();
    updateStats();

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    // Mostrar mensaje apropiado
    if (maquina.procesoId === procesoId) {
        showToast(`Proceso "${proceso.nombre}" asignado a ${estacionId}`, 'success');
    } else {
        showToast(`Proceso "${proceso.nombre}" agregado a cola de ${estacionId} (${maquina.colaProcesos.length} en cola)`, 'info');
    }
}

// ========================================
// PERSISTENCIA
// ========================================

function saveEstadoMaquinas() {
    localStorage.setItem('supervisora_maquinas', JSON.stringify(supervisoraState.maquinas));
}

function loadEstadoMaquinas() {
    const saved = localStorage.getItem('supervisora_maquinas');
    if (saved) {
        try {
            const maquinas = JSON.parse(saved);
            // Merge preservando operadores del ERP
            for (const [id, savedMaquina] of Object.entries(maquinas)) {
                if (supervisoraState.maquinas[id]) {
                    // Preservar operadores si ya fueron cargados del ERP
                    const erpOperadores = supervisoraState.maquinas[id].operadores || [];
                    Object.assign(supervisoraState.maquinas[id], savedMaquina);
                    // Fusionar operadores del ERP con los guardados
                    if (erpOperadores.length > 0) {
                        const savedOps = savedMaquina.operadores || [];
                        const fusionados = [...erpOperadores];
                        savedOps.forEach(op => {
                            if (!fusionados.some(e => e.id === op.id)) {
                                fusionados.push(op);
                            }
                        });
                        supervisoraState.maquinas[id].operadores = fusionados;
                    }
                } else {
                    supervisoraState.maquinas[id] = savedMaquina;
                }
            }
        } catch (e) {
            console.error('Error cargando estado maquinas:', e);
        }
    }
}

/**
 * Cargar asignaciones existentes de localStorage y sincronizar con supervisoraState
 */
function cargarAsignacionesExistentes() {
    try {
        // Cargar asignaciones_estaciones
        const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

        for (const [estacionId, asignacion] of Object.entries(asignaciones)) {
            // Buscar la estación en supervisoraState.maquinas
            let maquina = supervisoraState.maquinas[estacionId];

            // Si no la encuentra, buscar con ID normalizado
            if (!maquina) {
                const idNorm = estacionId.toLowerCase().replace(/[-_\s]/g, '');
                for (const [id, m] of Object.entries(supervisoraState.maquinas)) {
                    const mIdNorm = id.toLowerCase().replace(/[-_\s]/g, '');
                    if (mIdNorm === idNorm) {
                        maquina = m;
                        break;
                    }
                }
            }

            if (maquina && asignacion.pedidoId) {
                maquina.pedidoId = asignacion.pedidoId;
                maquina.procesoId = asignacion.procesoId;
                maquina.procesoNombre = asignacion.procesoNombre || '';

                // Restaurar cola de procesos si existe
                if (asignacion.colaProcesos && Array.isArray(asignacion.colaProcesos)) {
                    maquina.colaProcesos = asignacion.colaProcesos;
                }

                if (maquina.operadores && maquina.operadores.length > 0) {
                    maquina.estado = 'activo';
                }
                DEBUG_MODE && console.log('[SUPERVISORA] Asignación restaurada para estación:', estacionId, 'Cola:', maquina.colaProcesos?.length || 0);
            }
        }
    } catch (e) {
        console.error('Error cargando asignaciones existentes:', e);
    }
}

// ========================================
// ESTADISTICAS
// ========================================

function updateStats() {
    const maquinas = Object.values(supervisoraState.maquinas);

    const activos = maquinas.filter(m => m.estado === 'activo').length;
    const inactivos = maquinas.filter(m => m.estado === 'inactivo').length;
    const piezasHoy = maquinas.reduce((sum, m) => sum + (m.piezasHoy || 0), 0);
    const eficiencia = maquinas.length > 0 ? Math.round((activos / maquinas.length) * 100) : 0;

    document.getElementById('statActivos').textContent = activos;
    document.getElementById('statInactivos').textContent = inactivos;
    document.getElementById('statPiezasHoy').textContent = piezasHoy.toLocaleString();
    document.getElementById('statEficiencia').textContent = eficiencia + '%';

    renderProcesosActivos();
    renderAlertas();
}

// ========================================
// ZOOM
// ========================================

function zoomIn() {
    supervisoraState.zoom = Math.min(2, supervisoraState.zoom + 0.1);
    applyZoom();
}

function zoomOut() {
    supervisoraState.zoom = Math.max(0.5, supervisoraState.zoom - 0.1);
    applyZoom();
}

function resetZoom() {
    supervisoraState.zoom = 1;
    applyZoom();
}

function applyZoom() {
    const map = document.getElementById('plantMap');
    map.style.transform = `scale(${supervisoraState.zoom})`;
    map.style.transformOrigin = 'top left';
    document.getElementById('zoomLevel').textContent = Math.round(supervisoraState.zoom * 100) + '%';
}

// ========================================
// UTILIDADES
// ========================================

function refreshData() {
    loadDataFromERP();
    loadEstadoMaquinas();

    if (supervisoraState.layout) {
        renderLayoutInSupervisora(supervisoraState.layout);
    }

    showToast('Datos actualizados', 'success');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

// getIniciales() en utils.js

function selectPedido(pedidoId) {
    // Highlight pedido
    document.querySelectorAll('.pedido-card.selected').forEach(el => el.classList.remove('selected'));
    const card = document.querySelector(`.pedido-card[onclick*="${pedidoId}"]`);
    if (card) card.classList.add('selected');
}

// ========================================
// MODAL
// ========================================

function openModal(title, content, footer = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalFooter').innerHTML = footer;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// showToast() en utils.js

// ========================================
// SISTEMA LIBERAR OPERADOR
// ========================================

function solicitarLiberacion(estacionId, operadorId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    const operador = maquina.operadores?.find(op => op.id === operadorId);
    if (!operador) return;

    const content = `
        <div class="liberacion-form">
            <div class="liberacion-info">
                <div class="liberacion-operador">
                    <span class="liberacion-avatar">${getIniciales(operador.nombre)}</span>
                    <div>
                        <strong>${operador.nombre}</strong>
                        <span class="text-muted">Estación: ${estacionId}</span>
                    </div>
                </div>
                ${maquina.procesoNombre ? `
                <div class="liberacion-proceso">
                    <i class="fas fa-cog"></i> Proceso actual: <strong>${maquina.procesoNombre}</strong>
                </div>
                ` : ''}
            </div>

            <div class="form-group">
                <label><i class="fas fa-cubes"></i> Piezas completadas en este proceso</label>
                <input type="number" id="liberacionPiezas" value="${maquina.piezasHoy || 0}" min="0" class="form-control">
            </div>

            <div class="form-group">
                <label><i class="fas fa-comment"></i> Observaciones (opcional)</label>
                <textarea id="liberacionObservaciones" class="form-control" rows="2" placeholder="Ej: Terminó turno, cambio de área..."></textarea>
            </div>

            <div class="form-group">
                <label><i class="fas fa-flag"></i> Motivo de liberación</label>
                <select id="liberacionMotivo" class="form-control">
                    <option value="fin_turno">Fin de turno</option>
                    <option value="cambio_area">Cambio de área</option>
                    <option value="descanso">Descanso programado</option>
                    <option value="urgencia">Urgencia en otra estación</option>
                    <option value="otro">Otro</option>
                </select>
            </div>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-warning" onclick="confirmarLiberacion('${estacionId}', ${operadorId})">
            <i class="fas fa-user-clock"></i> Confirmar Liberación
        </button>
    `;

    openModal(`Liberar Operador`, content, footer);
}

function confirmarLiberacion(estacionId, operadorId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    const operador = maquina.operadores?.find(op => op.id === operadorId);
    if (!operador) return;

    // Capturar datos del formulario
    const piezas = parseInt(document.getElementById('liberacionPiezas').value) || 0;
    const observaciones = document.getElementById('liberacionObservaciones').value;
    const motivo = document.getElementById('liberacionMotivo').value;

    // Guardar registro de liberación
    guardarRegistroLiberacion({
        estacionId,
        operadorId,
        operadorNombre: operador.nombre,
        procesoId: maquina.procesoId,
        procesoNombre: maquina.procesoNombre,
        pedidoId: maquina.pedidoId,
        piezasCompletadas: piezas,
        observaciones,
        motivo,
        fecha: new Date().toISOString()
    });

    // Actualizar piezas en la máquina antes de quitar al operador
    maquina.piezasHoy = piezas;

    // Quitar operador de la estación
    maquina.operadores = maquina.operadores.filter(op => op.id !== operadorId);

    // Si no quedan operadores, marcar como inactivo
    if (maquina.operadores.length === 0) {
        maquina.estado = 'inactivo';
    }

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderOperadoresList();
    updateStats();

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    closeModal();
    showToast(`${operador.nombre} liberado - ${piezas} piezas registradas`, 'success');
}

function liberarTodosOperadores(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina || !maquina.operadores || maquina.operadores.length === 0) return;

    const operadoresNombres = maquina.operadores.map(op => op.nombre).join(', ');

    const content = `
        <div class="liberacion-form">
            <div class="liberacion-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <p>¿Liberar a <strong>todos los operadores</strong> de esta estación?</p>
            </div>

            <div class="liberacion-lista">
                <label>Operadores a liberar:</label>
                <ul>
                    ${maquina.operadores.map(op => `
                        <li><span class="mini-avatar">${getIniciales(op.nombre)}</span> ${op.nombre}</li>
                    `).join('')}
                </ul>
            </div>

            <div class="form-group">
                <label><i class="fas fa-cubes"></i> Total piezas completadas</label>
                <input type="number" id="liberacionTodosPiezas" value="${maquina.piezasHoy || 0}" min="0" class="form-control">
            </div>

            <div class="form-group">
                <label><i class="fas fa-flag"></i> Motivo</label>
                <select id="liberacionTodosMotivo" class="form-control">
                    <option value="fin_turno">Fin de turno</option>
                    <option value="cambio_proceso">Cambio de proceso</option>
                    <option value="reorganizacion">Reorganización de planta</option>
                    <option value="emergencia">Emergencia</option>
                </select>
            </div>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-danger" onclick="confirmarLiberacionTodos('${estacionId}')">
            <i class="fas fa-users-slash"></i> Liberar Todos
        </button>
    `;

    openModal(`Liberar Todos - ${estacionId}`, content, footer);
}

function confirmarLiberacionTodos(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina || !maquina.operadores) return;

    const piezas = parseInt(document.getElementById('liberacionTodosPiezas').value) || 0;
    const motivo = document.getElementById('liberacionTodosMotivo').value;

    // Guardar registro para cada operador
    maquina.operadores.forEach(operador => {
        guardarRegistroLiberacion({
            estacionId,
            operadorId: operador.id,
            operadorNombre: operador.nombre,
            procesoId: maquina.procesoId,
            procesoNombre: maquina.procesoNombre,
            pedidoId: maquina.pedidoId,
            piezasCompletadas: Math.round(piezas / maquina.operadores.length),
            observaciones: 'Liberación grupal',
            motivo,
            fecha: new Date().toISOString()
        });
    });

    const cantidadLiberados = maquina.operadores.length;

    // Limpiar operadores
    maquina.operadores = [];
    maquina.estado = 'inactivo';
    maquina.piezasHoy = piezas;

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderOperadoresList();
    updateStats();

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    closeModal();
    showToast(`${cantidadLiberados} operadores liberados de ${estacionId}`, 'success');
}

function guardarRegistroLiberacion(registro) {
    // Obtener registros existentes
    let registros = [];
    try {
        const saved = localStorage.getItem('supervisora_liberaciones');
        if (saved) {
            registros = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error cargando registros de liberación:', e);
    }

    // Agregar nuevo registro
    registros.push(registro);

    // Mantener solo los últimos 100 registros
    if (registros.length > 100) {
        registros = registros.slice(-100);
    }

    // Guardar
    localStorage.setItem('supervisora_liberaciones', JSON.stringify(registros));
    DEBUG_MODE && console.log('Registro de liberación guardado:', registro);
}

// ========================================
// VISTA DETALLADA DE PROCESO
// ========================================

function abrirDetalleProceso(procesoId, pedidoId) {
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    if (!pedido) return;

    const proceso = pedido.procesos?.find(p => p.id === procesoId);
    if (!proceso) return;

    // Verificar si tiene inventario disponible
    // IMPORTANTE: Priorizar el productoId del proceso (viene de rutaProcesos)
    const productoId = proceso.productoId || pedido?.productos?.[0]?.productoId || pedido?.productoId;
    const cantidadTotal = pedido.productos?.[0]?.cantidad || pedido.cantidad || 100;
    let tieneInventario = false;
    let inventarioDisponible = 0;

    if (typeof db !== 'undefined' && db.getInventarioPiezaByProductoProceso && productoId) {
        const procesoNombre = proceso.nombre || proceso.procesoNombre || '';
        const inventarioPieza = db.getInventarioPiezaByProductoProceso(productoId, procesoNombre);
        DEBUG_MODE && console.log('[SUPERVISORA-DETALLE] Verificando inventario - productoId:', productoId,
                    'proceso:', procesoNombre,
                    'inventario:', inventarioPieza?.cantidadDisponible || 0);
        if (inventarioPieza && inventarioPieza.cantidadDisponible >= cantidadTotal) {
            tieneInventario = true;
            inventarioDisponible = inventarioPieza.cantidadDisponible;
        }
    }

    // Buscar estaciones asignadas a este proceso
    const estacionesAsignadas = Object.entries(supervisoraState.maquinas)
        .filter(([id, m]) => m.procesoId === procesoId)
        .map(([id, m]) => ({
            id,
            operadores: m.operadores || [],
            piezas: m.piezasHoy || 0,
            estado: m.estado
        }));

    // Calcular estadísticas (si tiene inventario, mostrar como completo)
    const piezasCompletadas = tieneInventario ? cantidadTotal : (proceso.piezas || 0);
    const progreso = tieneInventario ? 100 : Math.min(100, Math.round((piezasCompletadas / cantidadTotal) * 100));
    const piezasPendientes = tieneInventario ? 0 : (cantidadTotal - piezasCompletadas);

    // Obtener historial del proceso (si existe)
    const historial = obtenerHistorialProceso(procesoId, pedidoId);

    const iconosTipo = {
        'costura': 'fa-tshirt',
        'corte': 'fa-cut',
        'empaque': 'fa-box',
        'calidad': 'fa-check-circle'
    };
    const icono = tieneInventario ? 'fa-check' : (iconosTipo[proceso.tipo] || 'fa-cog');

    const content = `
        <div class="proceso-detalle-modal ${tieneInventario ? 'con-inventario' : ''}">
            ${tieneInventario ? `
                <div class="inventario-alert-banner">
                    <i class="fas fa-warehouse"></i>
                    <div class="inventario-alert-content">
                        <strong>Piezas tomadas del inventario</strong>
                        <p>Este proceso no requiere producción. Las ${cantidadTotal} piezas fueron tomadas del inventario disponible (${inventarioDisponible} piezas en stock).</p>
                    </div>
                </div>
            ` : ''}

            <div class="proceso-detalle-header ${tieneInventario ? 'completado' : ''}">
                <div class="proceso-icono-grande ${tieneInventario ? 'inventario' : proceso.tipo}">
                    <i class="fas ${icono}"></i>
                </div>
                <div class="proceso-info-principal">
                    <h3>${proceso.nombre}</h3>
                    <span class="proceso-tipo-badge ${proceso.tipo}">${proceso.tipo}</span>
                    ${tieneInventario
                        ? '<span class="proceso-estado-badge completado"><i class="fas fa-check"></i> COMPLETADO (Inventario)</span>'
                        : `<span class="proceso-estado-badge ${proceso.estado}">${proceso.estado}</span>`
                    }
                </div>
            </div>

            <div class="proceso-stats-grid ${tieneInventario ? 'inventario-completo' : ''}">
                <div class="proceso-stat-card ${tieneInventario ? 'success' : ''}">
                    <div class="stat-icon"><i class="fas ${tieneInventario ? 'fa-check-circle' : 'fa-cubes'}"></i></div>
                    <div class="stat-value">${piezasCompletadas.toLocaleString()}</div>
                    <div class="stat-label">${tieneInventario ? 'Del Inventario' : 'Completadas'}</div>
                </div>
                <div class="proceso-stat-card">
                    <div class="stat-icon"><i class="fas fa-hourglass-half"></i></div>
                    <div class="stat-value">${piezasPendientes.toLocaleString()}</div>
                    <div class="stat-label">Pendientes</div>
                </div>
                <div class="proceso-stat-card ${tieneInventario ? 'success' : ''}">
                    <div class="stat-icon"><i class="fas fa-percentage"></i></div>
                    <div class="stat-value">${progreso}%</div>
                    <div class="stat-label">Progreso</div>
                </div>
                <div class="proceso-stat-card">
                    <div class="stat-icon"><i class="fas ${tieneInventario ? 'fa-warehouse' : 'fa-desktop'}"></i></div>
                    <div class="stat-value">${tieneInventario ? inventarioDisponible : estacionesAsignadas.length}</div>
                    <div class="stat-label">${tieneInventario ? 'En Stock' : 'Estaciones'}</div>
                </div>
            </div>

            <div class="proceso-progress-container">
                <div class="proceso-progress-grande ${tieneInventario ? 'completado' : ''}">
                    <div class="proceso-progress-bar ${tieneInventario ? 'completado' : proceso.estado}" style="width: ${progreso}%"></div>
                    <span class="proceso-progress-label">${piezasCompletadas} / ${cantidadTotal}</span>
                </div>
                <button class="btn-ajustar-cantidad" onclick="mostrarModalAjusteCantidad(${procesoId}, ${pedidoId}, ${piezasCompletadas}, ${cantidadTotal}, '${proceso.nombre}')" title="Ajustar cantidad">
                    <i class="fas fa-edit"></i> Ajustar
                </button>
            </div>

            ${!tieneInventario ? `
            <div class="proceso-seccion">
                <h4><i class="fas fa-desktop"></i> Estaciones Asignadas</h4>
                ${estacionesAsignadas.length > 0 ? `
                    <div class="estaciones-asignadas-lista">
                        ${estacionesAsignadas.map(est => `
                            <div class="estacion-asignada-item ${est.estado}">
                                <span class="estacion-asignada-id">${est.id}</span>
                                <div class="estacion-asignada-ops">
                                    ${est.operadores.length > 0
                                        ? est.operadores.map(op => `<span class="mini-chip">${getIniciales(op.nombre)}</span>`).join('')
                                        : '<span class="text-muted">Sin operador</span>'
                                    }
                                </div>
                                <span class="estacion-asignada-piezas">${est.piezas} pzas</span>
                                <span class="estado-dot ${est.estado}"></span>
                            </div>
                        `).join('')}
                    </div>
                ` : '<p class="text-muted">No hay estaciones asignadas a este proceso</p>'}
            ` : ''}
            </div>

            <div class="proceso-seccion">
                <h4><i class="fas fa-info-circle"></i> Información del Pedido</h4>
                <div class="pedido-info-grid">
                    <div><label>Pedido:</label> <span>#${pedidoId}</span></div>
                    <div><label>Cliente:</label> <span>${pedido.clienteNombre || 'N/A'}</span></div>
                    <div><label>Prioridad:</label> <span class="prioridad-badge ${pedido.prioridad}">${pedido.prioridad}</span></div>
                </div>
            </div>

            ${historial.length > 0 ? `
            <div class="proceso-seccion">
                <h4><i class="fas fa-history"></i> Historial Reciente</h4>
                <div class="proceso-historial">
                    ${historial.slice(0, 5).map(h => `
                        <div class="historial-item">
                            <span class="historial-fecha">${formatearFecha(h.fecha)}</span>
                            <span class="historial-accion">${h.accion}</span>
                            ${h.usuario ? `<span class="historial-usuario">${h.usuario}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
    `;

    let footerButtons = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;

    if (proceso.estado === 'pendiente') {
        footerButtons += `
            <button class="btn btn-primary" onclick="iniciarProceso(${procesoId}, ${pedidoId})">
                <i class="fas fa-play"></i> Iniciar Proceso
            </button>
        `;
    } else if (proceso.estado === 'en-proceso') {
        footerButtons += `
            <button class="btn btn-warning" onclick="pausarProceso(${procesoId}, ${pedidoId})">
                <i class="fas fa-pause"></i> Pausar
            </button>
            <button class="btn btn-success" onclick="marcarProcesoCompletado(${procesoId}, ${pedidoId})">
                <i class="fas fa-check"></i> Completar
            </button>
        `;
    } else if (proceso.estado === 'pausado') {
        footerButtons += `
            <button class="btn btn-primary" onclick="reanudarProceso(${procesoId}, ${pedidoId})">
                <i class="fas fa-play"></i> Reanudar
            </button>
        `;
    }

    openModal(`Detalle del Proceso`, content, footerButtons);
}

function obtenerHistorialProceso(procesoId, pedidoId) {
    // Obtener historial guardado
    try {
        const saved = localStorage.getItem('supervisora_historial_procesos');
        if (saved) {
            const historial = JSON.parse(saved);
            return historial.filter(h => h.procesoId === procesoId && h.pedidoId === pedidoId);
        }
    } catch (e) {
        console.error('Error cargando historial:', e);
    }
    return [];
}

function guardarHistorialProceso(registro) {
    let historial = [];
    try {
        const saved = localStorage.getItem('supervisora_historial_procesos');
        if (saved) {
            historial = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error cargando historial:', e);
    }

    historial.push(registro);

    // Mantener solo los últimos 500 registros
    if (historial.length > 500) {
        historial = historial.slice(-500);
    }

    localStorage.setItem('supervisora_historial_procesos', JSON.stringify(historial));
}

function iniciarProceso(procesoId, pedidoId) {
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    if (!pedido || !pedido.procesos) return;

    const proceso = pedido.procesos.find(p => p.id === procesoId);
    if (!proceso) return;

    proceso.estado = 'en-proceso';

    guardarHistorialProceso({
        procesoId,
        pedidoId,
        accion: 'Proceso iniciado',
        fecha: new Date().toISOString()
    });

    renderPedidosList();
    closeModal();
    showToast(`Proceso "${proceso.nombre}" iniciado`, 'success');

    // Reabrir el modal actualizado
    setTimeout(() => abrirDetalleProceso(procesoId, pedidoId), 100);
}

function pausarProceso(procesoId, pedidoId) {
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    if (!pedido || !pedido.procesos) return;

    const proceso = pedido.procesos.find(p => p.id === procesoId);
    if (!proceso) return;

    proceso.estado = 'pausado';

    guardarHistorialProceso({
        procesoId,
        pedidoId,
        accion: 'Proceso pausado',
        fecha: new Date().toISOString()
    });

    renderPedidosList();
    closeModal();
    showToast(`Proceso "${proceso.nombre}" pausado`, 'warning');

    setTimeout(() => abrirDetalleProceso(procesoId, pedidoId), 100);
}

function reanudarProceso(procesoId, pedidoId) {
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    if (!pedido || !pedido.procesos) return;

    const proceso = pedido.procesos.find(p => p.id === procesoId);
    if (!proceso) return;

    proceso.estado = 'en-proceso';

    guardarHistorialProceso({
        procesoId,
        pedidoId,
        accion: 'Proceso reanudado',
        fecha: new Date().toISOString()
    });

    renderPedidosList();
    closeModal();
    showToast(`Proceso "${proceso.nombre}" reanudado`, 'success');

    setTimeout(() => abrirDetalleProceso(procesoId, pedidoId), 100);
}

function marcarProcesoCompletado(procesoId, pedidoId) {
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    if (!pedido || !pedido.procesos) return;

    const proceso = pedido.procesos.find(p => p.id === procesoId);
    if (!proceso) return;

    // Actualizar piezas al total
    const cantidadTotal = pedido.productos?.[0]?.cantidad || pedido.cantidad || 100;
    proceso.piezas = cantidadTotal;
    proceso.estado = 'completado';

    // Guardar las estaciones que tenían este proceso para auto-asignar el siguiente
    const estacionesConProceso = [];
    Object.entries(supervisoraState.maquinas).forEach(([estacionId, m]) => {
        if (m.procesoId === procesoId) {
            estacionesConProceso.push({
                estacionId,
                operadores: m.operadores || []
            });
            m.procesoId = null;
            m.procesoNombre = '';
        }
    });

    guardarHistorialProceso({
        procesoId,
        pedidoId,
        accion: 'Proceso completado',
        fecha: new Date().toISOString()
    });

    // AUTO-ASIGNAR SIGUIENTE PROCESO
    // Buscar el siguiente proceso en la secuencia que ahora está disponible
    if (proceso.orden) {
        const siguienteOrden = proceso.orden + 1;
        const siguienteProceso = pedido.procesos.find(p => p.orden === siguienteOrden && p.estado !== 'completado');

        if (siguienteProceso) {
            DEBUG_MODE && console.log('[SUPERVISORA] Auto-asignando siguiente proceso:', siguienteProceso.nombre);

            // Auto-asignar a las colas de las estaciones que tenían el proceso completado
            estacionesConProceso.forEach(({ estacionId, operadores }) => {
                const maquina = supervisoraState.maquinas[estacionId];
                if (maquina) {
                    // Agregar a la cola de la estación
                    if (!maquina.colaProcesos) {
                        maquina.colaProcesos = [];
                    }

                    // Crear datos del proceso para la cola
                    const procesoData = {
                        procesoId: siguienteProceso.id,
                        procesoNombre: siguienteProceso.nombre,
                        procesoTipo: siguienteProceso.tipo || 'general',
                        pedidoId: pedidoId,
                        pedidoCodigo: pedido.codigo || `PED-${pedidoId}`,
                        clienteNombre: pedido.clienteNombre || 'Cliente',
                        productoNombre: pedido.productos?.[0]?.nombre || 'Producto',
                        meta: cantidadTotal,
                        cantidadTotal: cantidadTotal,
                        piezasCompletadas: 0,
                        prioridad: pedido.prioridad || 'normal',
                        fechaEntrega: pedido.fechaEntrega || null,
                        fechaAsignacion: new Date().toISOString(),
                        estado: 'pendiente',
                        autoAsignado: true
                    };

                    // Si la estación no tiene proceso activo, asignar directamente
                    if (!maquina.procesoId) {
                        maquina.procesoId = siguienteProceso.id;
                        maquina.procesoNombre = siguienteProceso.nombre;
                        maquina.pedidoId = pedidoId;
                        siguienteProceso.estado = 'en-proceso';

                        // Actualizar asignación en localStorage
                        actualizarAsignacionEstacion(estacionId, procesoData);

                        showToast(`"${siguienteProceso.nombre}" auto-asignado a ${estacionId}`, 'info');
                    } else {
                        // Agregar a la cola
                        maquina.colaProcesos.push(procesoData);
                        showToast(`"${siguienteProceso.nombre}" agregado a cola de ${estacionId}`, 'info');
                    }
                }
            });

            // Notificar a Coco que el siguiente proceso está disponible
            agregarNotificacionCoco({
                tipo: 'proceso_disponible',
                mensaje: `Proceso "${siguienteProceso.nombre}" ahora disponible para asignar`,
                pedidoId: pedidoId,
                procesoId: siguienteProceso.id,
                prioridad: pedido.prioridad || 'normal',
                timestamp: new Date().toISOString()
            });
        }
    }

    saveEstadoMaquinas();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderPedidosList();
    renderOperadoresList();
    updateStats();

    closeModal();
    showToast(`Proceso "${proceso.nombre}" completado`, 'success');
}

// Agregar notificación para Coco (supervisora)
function agregarNotificacionCoco(notif) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    notificaciones.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        ...notif,
        leida: false
    });
    // Mantener solo las últimas 50
    if (notificaciones.length > 50) {
        notificaciones.splice(50);
    }
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificaciones));

    // Actualizar badge de notificaciones
    actualizarBadgeNotificaciones();
}

// Badge de notificaciones coco se maneja en actualizarBadgeNotificaciones() principal (línea ~4660)

function formatearFecha(fechaISO) {
    const fecha = new Date(fechaISO);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    if (fecha.toDateString() === hoy.toDateString()) {
        return `Hoy ${hora}`;
    } else if (fecha.toDateString() === ayer.toDateString()) {
        return `Ayer ${hora}`;
    } else {
        return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) + ' ' + hora;
    }
}

// ========================================
// COLA DE PROCESOS POR OPERADORA
// ========================================

function cargarColaProcesos() {
    const saved = localStorage.getItem('cola_procesos_operadores');
    if (saved) {
        supervisoraState.colaProcesosOperadores = JSON.parse(saved);
    }
}

function guardarColaProcesos() {
    localStorage.setItem('cola_procesos_operadores', JSON.stringify(supervisoraState.colaProcesosOperadores));
}

function getColaOperador(operadorId) {
    return supervisoraState.colaProcesosOperadores[operadorId] || [];
}

function agregarProcesoACola(operadorId, proceso) {
    if (!supervisoraState.colaProcesosOperadores[operadorId]) {
        supervisoraState.colaProcesosOperadores[operadorId] = [];
    }

    const nuevoProceso = {
        id: Date.now(),
        procesoId: proceso.procesoId,
        procesoNombre: proceso.procesoNombre,
        pedidoId: proceso.pedidoId,
        pedidoNombre: proceso.pedidoNombre || '',
        cantidadPiezas: proceso.cantidadPiezas || 0,
        tiempoEstimadoMin: proceso.tiempoEstimadoMin || 60,
        horaInicio: null,
        horaFin: null,
        estado: 'pendiente', // pendiente, en_progreso, completado
        fechaAgregado: new Date().toISOString()
    };

    supervisoraState.colaProcesosOperadores[operadorId].push(nuevoProceso);
    guardarColaProcesos();

    showToast(`Proceso agregado a cola de ${getOperadorNombre(operadorId)}`, 'success');
    return nuevoProceso;
}

function iniciarSiguienteProceso(operadorId) {
    const cola = getColaOperador(operadorId);
    const procesoActual = cola.find(p => p.estado === 'en_progreso');

    if (procesoActual) {
        // Marcar proceso actual como completado
        procesoActual.estado = 'completado';
        procesoActual.horaFin = new Date().toISOString();
    }

    // Buscar siguiente proceso pendiente
    const siguienteProceso = cola.find(p => p.estado === 'pendiente');

    if (siguienteProceso) {
        siguienteProceso.estado = 'en_progreso';
        siguienteProceso.horaInicio = new Date().toISOString();

        // Actualizar estación del operador
        actualizarEstacionConProceso(operadorId, siguienteProceso);

        guardarColaProcesos();
        showToast(`Iniciando: ${siguienteProceso.procesoNombre}`, 'info');
        return siguienteProceso;
    }

    guardarColaProcesos();
    return null;
}

function actualizarEstacionConProceso(operadorId, proceso) {
    // Buscar estación donde está el operador
    for (const [estacionId, maquina] of Object.entries(supervisoraState.maquinas)) {
        if (maquina.operadores && maquina.operadores.some(op => op.id === operadorId)) {
            maquina.procesoId = proceso.procesoId;
            maquina.procesoNombre = proceso.procesoNombre;
            maquina.pedidoId = proceso.pedidoId;
            break;
        }
    }
}

function eliminarProcesoDeCola(operadorId, procesoColaId, forzar = false) {
    const cola = getColaOperador(operadorId);
    const index = cola.findIndex(p => p.id === procesoColaId);

    if (index !== -1) {
        const proceso = cola[index];
        if (proceso.estado === 'en_progreso' && !forzar) {
            showToast('No puedes eliminar un proceso en progreso. Usa cancelar proceso.', 'error');
            return false;
        }
        cola.splice(index, 1);
        guardarColaProcesos();

        // Si era un proceso en progreso, limpiar la estación
        if (proceso.estado === 'en_progreso') {
            limpiarProcesoDeEstacion(operadorId);
        }

        showToast('Proceso eliminado de la cola', 'info');
        return true;
    }
    return false;
}

// Función para cancelar el proceso actual de un operador
function cancelarProcesoActual(operadorId) {
    const cola = getColaOperador(operadorId);
    const procesoActual = cola.find(p => p.estado === 'en_progreso');

    if (!procesoActual) {
        showToast('No hay proceso activo para cancelar', 'warning');
        return false;
    }

    // Marcar como cancelado y eliminar
    procesoActual.estado = 'cancelado';
    procesoActual.horaFin = new Date().toISOString();

    // Eliminar de la cola
    const index = cola.findIndex(p => p.id === procesoActual.id);
    if (index !== -1) {
        cola.splice(index, 1);
    }

    // Limpiar la estación
    limpiarProcesoDeEstacion(operadorId);

    guardarColaProcesos();
    saveEstadoMaquinas();
    showToast('Proceso cancelado', 'info');

    // Actualizar UI
    if (supervisoraState.selectedEstacion) {
        showEstacionDetalle(supervisoraState.selectedEstacion);
    }
    renderProcesosActivos();
    renderLayoutInSupervisora(supervisoraState.layout);

    return true;
}

// Limpiar proceso de la estación del operador
function limpiarProcesoDeEstacion(operadorId) {
    for (const [estacionId, maquina] of Object.entries(supervisoraState.maquinas)) {
        if (maquina.operadores && maquina.operadores.some(op => op.id === operadorId)) {
            maquina.procesoId = null;
            maquina.procesoNombre = '';
            maquina.pedidoId = null;
            break;
        }
    }
}

// Quitar proceso de una estación específica
function quitarProcesoDeEstacion(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) return;

    const procesoAnterior = maquina.procesoNombre;

    // Avanzar al siguiente proceso de la cola si hay
    if (maquina.colaProcesos && maquina.colaProcesos.length > 0) {
        const siguienteProceso = maquina.colaProcesos.shift();
        maquina.procesoId = siguienteProceso.procesoId;
        maquina.procesoNombre = siguienteProceso.procesoNombre;
        maquina.pedidoId = siguienteProceso.pedidoId;

        // Actualizar asignaciones para operadora
        actualizarAsignacionEstacion(estacionId, siguienteProceso);

        showToast(`Proceso "${procesoAnterior}" quitado. Siguiente: "${siguienteProceso.procesoNombre}"`, 'info');
    } else {
        maquina.procesoId = null;
        maquina.procesoNombre = '';
        maquina.pedidoId = null;

        // Limpiar de localStorage de asignaciones
        const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
        if (asignaciones[estacionId]) {
            delete asignaciones[estacionId];
            localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
        }

        showToast(`Proceso "${procesoAnterior || 'N/A'}" quitado de ${estacionId}`, 'info');
    }

    saveEstadoMaquinas();

    // Actualizar UI
    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }
    renderProcesosActivos();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderOperadoresList();
}

// Completar proceso actual y avanzar al siguiente de la cola
function completarProcesoEstacion(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina || !maquina.procesoId) return;

    const procesoCompletadoId = maquina.procesoId;
    const procesoCompletadoNombre = maquina.procesoNombre;
    const pedidoIdActual = maquina.pedidoId;

    // Marcar proceso como completado en el pedido
    const pedido = supervisoraState.pedidosHoy.find(p => p.id == pedidoIdActual);
    let procesoCompletadoData = null;

    if (pedido && pedido.procesos) {
        const procesoEnPedido = pedido.procesos.find(p =>
            p.id == procesoCompletadoId || p.nombre === procesoCompletadoNombre
        );
        if (procesoEnPedido) {
            procesoEnPedido.estado = 'completado';
            procesoEnPedido.piezas = pedido.productos?.[0]?.cantidad || pedido.cantidad || 100;
            procesoCompletadoData = procesoEnPedido;
        }
    }

    // Guardar historial
    guardarHistorialProceso({
        procesoId: procesoCompletadoId,
        pedidoId: pedidoIdActual,
        estacionId: estacionId,
        accion: 'Proceso completado desde estación',
        fecha: new Date().toISOString()
    });

    // Buscar si hay siguiente proceso en la secuencia para auto-agregar a cola
    if (procesoCompletadoData && procesoCompletadoData.orden && pedido) {
        const siguienteOrden = procesoCompletadoData.orden + 1;
        const siguienteProcesoEnSecuencia = pedido.procesos.find(p =>
            p.orden === siguienteOrden && p.estado !== 'completado'
        );

        if (siguienteProcesoEnSecuencia) {
            // Auto-agregar siguiente proceso a la cola
            if (!maquina.colaProcesos) {
                maquina.colaProcesos = [];
            }

            // Verificar que no esté ya en la cola
            const yaEnCola = maquina.colaProcesos.some(p => p.procesoId == siguienteProcesoEnSecuencia.id);

            if (!yaEnCola) {
                const procesoData = {
                    procesoId: siguienteProcesoEnSecuencia.id,
                    procesoNombre: siguienteProcesoEnSecuencia.nombre,
                    procesoTipo: siguienteProcesoEnSecuencia.tipo || 'general',
                    pedidoId: pedidoIdActual,
                    pedidoCodigo: pedido.codigo || `PED-${pedidoIdActual}`,
                    clienteNombre: pedido.clienteNombre || 'Cliente',
                    productoNombre: pedido.productos?.[0]?.nombre || 'Producto',
                    meta: pedido.productos?.[0]?.cantidad || pedido.cantidad || 100,
                    cantidadTotal: pedido.productos?.[0]?.cantidad || pedido.cantidad || 100,
                    piezasCompletadas: 0,
                    prioridad: pedido.prioridad || 'normal',
                    fechaAsignacion: new Date().toISOString(),
                    estado: 'pendiente',
                    autoAsignado: true
                };
                maquina.colaProcesos.push(procesoData);
                DEBUG_MODE && console.log('[SUPERVISORA] Siguiente proceso auto-agregado a cola:', siguienteProcesoEnSecuencia.nombre);
            }
        }
    }

    // Avanzar al siguiente proceso de la cola si hay
    if (maquina.colaProcesos && maquina.colaProcesos.length > 0) {
        const siguienteProceso = maquina.colaProcesos.shift();
        maquina.procesoId = siguienteProceso.procesoId;
        maquina.procesoNombre = siguienteProceso.procesoNombre;
        maquina.pedidoId = siguienteProceso.pedidoId;

        // Marcar el siguiente proceso como en-proceso
        if (pedido && pedido.procesos) {
            const siguienteEnPedido = pedido.procesos.find(p =>
                p.id == siguienteProceso.procesoId || p.nombre === siguienteProceso.procesoNombre
            );
            if (siguienteEnPedido) {
                siguienteEnPedido.estado = 'en-proceso';
            }
        }

        // Actualizar asignaciones para operadora
        actualizarAsignacionEstacion(estacionId, siguienteProceso);

        showToast(`"${procesoCompletadoNombre}" completado. Siguiente: "${siguienteProceso.procesoNombre}"`, 'success');
    } else {
        maquina.procesoId = null;
        maquina.procesoNombre = '';
        maquina.pedidoId = null;

        // Limpiar de localStorage de asignaciones
        const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
        if (asignaciones[estacionId]) {
            delete asignaciones[estacionId];
            localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
        }

        showToast(`"${procesoCompletadoNombre}" completado. No hay más procesos en cola.`, 'success');
    }

    saveEstadoMaquinas();

    // Actualizar UI
    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }
    renderProcesosActivos();
    renderLayoutInSupervisora(supervisoraState.layout);
    renderOperadoresList();
}

// Mover proceso dentro de la cola
function moverProcesoEnCola(estacionId, index, direccion) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina || !maquina.colaProcesos) return;

    const newIndex = index + direccion;
    if (newIndex < 0 || newIndex >= maquina.colaProcesos.length) return;

    // Intercambiar posiciones
    [maquina.colaProcesos[index], maquina.colaProcesos[newIndex]] =
        [maquina.colaProcesos[newIndex], maquina.colaProcesos[index]];

    saveEstadoMaquinas();

    // Actualizar asignaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    if (asignaciones[estacionId]) {
        asignaciones[estacionId].colaProcesos = maquina.colaProcesos;
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }
}

// Quitar proceso específico de la cola
function quitarProcesoDeCola(estacionId, index) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina || !maquina.colaProcesos) return;

    const procesoQuitado = maquina.colaProcesos.splice(index, 1)[0];

    saveEstadoMaquinas();

    // Actualizar asignaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    if (asignaciones[estacionId]) {
        asignaciones[estacionId].colaProcesos = maquina.colaProcesos;
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    showToast(`"${procesoQuitado?.procesoNombre}" quitado de la cola`, 'info');

    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }
}

// Actualizar asignación en localStorage para panel operadora
function actualizarAsignacionEstacion(estacionId, procesoData) {
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    asignaciones[estacionId] = {
        ...procesoData,
        estado: 'asignado',
        asignadoPor: 'Coco',
        fechaAsignacion: new Date().toISOString()
    };

    // Mantener la cola
    const maquina = supervisoraState.maquinas[estacionId];
    if (maquina && maquina.colaProcesos) {
        asignaciones[estacionId].colaProcesos = maquina.colaProcesos;
    }

    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
}

function reordenarCola(operadorId, procesoColaId, direccion) {
    const cola = getColaOperador(operadorId);
    const index = cola.findIndex(p => p.id === procesoColaId);

    if (index === -1) return;

    const proceso = cola[index];
    if (proceso.estado !== 'pendiente') return;

    const newIndex = direccion === 'arriba' ? index - 1 : index + 1;

    // Verificar que el nuevo índice sea válido y no sea un proceso en progreso
    if (newIndex < 0 || newIndex >= cola.length) return;
    if (cola[newIndex].estado !== 'pendiente') return;

    // Intercambiar posiciones
    [cola[index], cola[newIndex]] = [cola[newIndex], cola[index]];
    guardarColaProcesos();
}

function getOperadorNombre(operadorId) {
    const operador = supervisoraState.operadores.find(op => op.id === operadorId);
    return operador ? operador.nombre : 'Operador';
}

function getProcesoActualOperador(operadorId) {
    const cola = getColaOperador(operadorId);
    return cola.find(p => p.estado === 'en_progreso');
}

function getProcesosPendientesOperador(operadorId) {
    const cola = getColaOperador(operadorId);
    return cola.filter(p => p.estado === 'pendiente');
}

function calcularTiempoRestante(proceso) {
    if (!proceso || proceso.estado !== 'en_progreso' || !proceso.horaInicio) {
        return null;
    }

    const inicio = new Date(proceso.horaInicio);
    const ahora = new Date();
    const transcurridoMin = (ahora - inicio) / (1000 * 60);
    const restanteMin = proceso.tiempoEstimadoMin - transcurridoMin;

    return Math.max(0, Math.round(restanteMin));
}

// ========================================
// ALERTAS DE PRÓXIMO TÉRMINO
// ========================================

function initAlertasProximoTermino() {
    // Verificar cada minuto
    supervisoraState.alertasInterval = setInterval(verificarAlertasProximoTermino, 60000);
    // Verificar inmediatamente
    verificarAlertasProximoTermino();
}

function verificarAlertasProximoTermino() {
    const MINUTOS_ALERTA = 15;

    for (const [operadorId, cola] of Object.entries(supervisoraState.colaProcesosOperadores)) {
        const procesoActual = cola.find(p => p.estado === 'en_progreso');

        if (procesoActual) {
            const tiempoRestante = calcularTiempoRestante(procesoActual);
            const alertaKey = `${operadorId}-${procesoActual.id}`;

            if (tiempoRestante !== null && tiempoRestante <= MINUTOS_ALERTA && tiempoRestante > 0) {
                // Verificar si hay proceso siguiente asignado
                const siguienteProceso = cola.find(p => p.estado === 'pendiente');

                if (!siguienteProceso && !supervisoraState.alertasActivas.has(alertaKey)) {
                    // Generar alerta
                    mostrarAlertaProximoTermino(operadorId, procesoActual, tiempoRestante);
                    supervisoraState.alertasActivas.add(alertaKey);
                }
            } else if (tiempoRestante === 0 || tiempoRestante === null) {
                // Limpiar alerta si ya terminó
                supervisoraState.alertasActivas.delete(alertaKey);
            }
        }
    }

    // Actualizar panel de alertas
    actualizarPanelAlertas();
}

function mostrarAlertaProximoTermino(operadorId, proceso, tiempoRestante) {
    const operadorNombre = getOperadorNombre(operadorId);

    // Mostrar toast
    showToast(
        `⏰ ${operadorNombre} terminará "${proceso.procesoNombre}" en ~${tiempoRestante} min. ¡Asigna el siguiente proceso!`,
        'warning',
        8000
    );

    // Agregar alerta visual al panel
    agregarAlertaVisual({
        tipo: 'proximo_termino',
        operadorId: operadorId,
        operadorNombre: operadorNombre,
        procesoNombre: proceso.procesoNombre,
        tiempoRestante: tiempoRestante,
        timestamp: new Date().toISOString()
    });

    // Reproducir sonido si está disponible
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleogq');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {}
}

function agregarAlertaVisual(alerta) {
    const alertasList = document.getElementById('alertasList');
    if (!alertasList) return;

    const alertaId = `alerta-${alerta.operadorId}-${Date.now()}`;

    const alertaHTML = `
        <div class="alerta-item warning" id="${alertaId}">
            <div class="alerta-icon">
                <i class="fas fa-clock"></i>
            </div>
            <div class="alerta-content">
                <div class="alerta-title">
                    <strong>${alerta.operadorNombre}</strong> terminará pronto
                </div>
                <div class="alerta-message">
                    "${alerta.procesoNombre}" - ${alerta.tiempoRestante} min restantes
                </div>
                <div class="alerta-actions">
                    <button class="btn btn-sm btn-primary" onclick="abrirAsignarSiguienteProceso(${alerta.operadorId})">
                        <i class="fas fa-plus"></i> Asignar Siguiente
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="descartarAlerta('${alertaId}')">
                        Descartar
                    </button>
                </div>
            </div>
        </div>
    `;

    alertasList.insertAdjacentHTML('afterbegin', alertaHTML);
}

function descartarAlerta(alertaId) {
    const alerta = document.getElementById(alertaId);
    if (alerta) {
        alerta.remove();
    }
}

function actualizarPanelAlertas() {
    // Esta función se puede expandir para actualizar el contador de alertas, etc.
    const alertasList = document.getElementById('alertasList');
    if (alertasList) {
        // Actualizar tiempos restantes en alertas existentes
        // (implementación opcional para actualización en tiempo real)
    }
}

// ========================================
// MODAL PARA ASIGNAR PROCESOS A COLA
// ========================================

function abrirAsignarSiguienteProceso(operadorId) {
    const operador = supervisoraState.operadores.find(op => op.id === operadorId);
    if (!operador) return;

    const cola = getColaOperador(operadorId);
    const procesoActual = cola.find(p => p.estado === 'en_progreso');
    const procesosPendientes = cola.filter(p => p.estado === 'pendiente');

    // Obtener pedidos activos
    const pedidosActivos = supervisoraState.pedidosHoy.filter(p =>
        p.estado !== 'entregado' && p.estado !== 'cancelado'
    );

    const content = `
        <div class="asignar-proceso-modal">
            <div class="operador-info-header">
                <div class="operador-avatar-lg">${getIniciales(operador.nombre)}</div>
                <div class="operador-datos">
                    <h3>${operador.nombre}</h3>
                    <span class="estado-badge ${procesoActual ? 'activo' : 'disponible'}">
                        ${procesoActual ? 'En proceso' : 'Disponible'}
                    </span>
                </div>
            </div>

            ${procesoActual ? `
                <div class="proceso-actual-info">
                    <h4><i class="fas fa-play-circle"></i> Proceso Actual</h4>
                    <div class="proceso-card activo">
                        <div class="proceso-card-content">
                            <div class="proceso-nombre">${procesoActual.procesoNombre}</div>
                            <div class="proceso-pedido">Pedido: #${procesoActual.pedidoId || 'N/A'}</div>
                            <div class="proceso-tiempo">
                                <i class="fas fa-clock"></i>
                                Tiempo restante: ~${calcularTiempoRestante(procesoActual) || 0} min
                            </div>
                        </div>
                        <div class="proceso-card-actions">
                            <button class="btn btn-sm btn-success" onclick="marcarProcesoCompletadoYContinuar(${operadorId}); closeModal();" title="Completar proceso">
                                <i class="fas fa-check"></i> Completar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="cancelarProcesoActual(${operadorId}); abrirAsignarSiguienteProceso(${operadorId});" title="Cancelar proceso">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="cola-procesos-section">
                <h4><i class="fas fa-list-ol"></i> Cola de Procesos (${procesosPendientes.length})</h4>
                <div class="cola-procesos-list" id="colaProcesosList">
                    ${procesosPendientes.length > 0 ? procesosPendientes.map((p, idx) => `
                        <div class="cola-proceso-item" data-id="${p.id}">
                            <span class="cola-orden">${idx + 1}</span>
                            <div class="cola-proceso-info">
                                <span class="cola-proceso-nombre">${p.procesoNombre}</span>
                                <span class="cola-proceso-pedido">Pedido #${p.pedidoId || 'N/A'}</span>
                            </div>
                            <div class="cola-proceso-tiempo">
                                <i class="fas fa-hourglass-half"></i> ${p.tiempoEstimadoMin} min
                            </div>
                            <div class="cola-proceso-actions">
                                <button class="btn-icon-sm" onclick="reordenarCola(${operadorId}, ${p.id}, 'arriba')" ${idx === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-up"></i>
                                </button>
                                <button class="btn-icon-sm" onclick="reordenarCola(${operadorId}, ${p.id}, 'abajo')" ${idx === procesosPendientes.length - 1 ? 'disabled' : ''}>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <button class="btn-icon-sm danger" onclick="eliminarProcesoDeCola(${operadorId}, ${p.id}); abrirAsignarSiguienteProceso(${operadorId});">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : '<p class="sin-procesos">No hay procesos en cola</p>'}
                </div>
            </div>

            <div class="agregar-proceso-section">
                <h4><i class="fas fa-plus-circle"></i> Agregar Proceso a la Cola</h4>
                <div class="form-group">
                    <label>Pedido</label>
                    <select id="selectPedidoProceso" onchange="cargarProcesosPedido(this.value)">
                        <option value="">-- Seleccionar pedido --</option>
                        ${pedidosActivos.map(p => {
                            // Obtener nombres de productos
                            let productosInfo = '';
                            if (p.productos && p.productos.length > 0) {
                                const nombresProductos = p.productos.map(prod => {
                                    const prodCompleto = db.getProducto(parseInt(prod.productoId));
                                    return prodCompleto ? prodCompleto.nombre : `Prod #${prod.productoId}`;
                                });
                                productosInfo = ` - ${nombresProductos.join(', ')}`;
                            }
                            return `<option value="${p.id}">#${p.id} - ${p.clienteNombre || p.cliente || 'Sin cliente'}${productosInfo}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Proceso <span id="procesoInfo" class="proceso-info-badge"></span></label>
                    <select id="selectProcesoAgregar" disabled>
                        <option value="">-- Primero selecciona un pedido --</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Cantidad de Piezas</label>
                        <input type="number" id="inputCantidadPiezas" value="0" min="0">
                    </div>
                    <div class="form-group">
                        <label>Tiempo Estimado (min)</label>
                        <input type="number" id="inputTiempoEstimado" value="60" min="1">
                    </div>
                </div>
                <button class="btn btn-primary" onclick="agregarProcesoDesdeModal(${operadorId})">
                    <i class="fas fa-plus"></i> Agregar a Cola
                </button>
            </div>
        </div>
    `;

    openModal('Asignar Procesos - ' + operador.nombre, content, [
        { text: 'Cerrar', class: 'btn-secondary', onclick: 'closeModal()' }
    ]);
}

function cargarProcesosPedido(pedidoId) {
    const selectProceso = document.getElementById('selectProcesoAgregar');

    if (!pedidoId) {
        selectProceso.innerHTML = '<option value="">-- Primero selecciona un pedido --</option>';
        selectProceso.disabled = true;
        return;
    }

    // Buscar el pedido en el estado de supervisora
    const pedido = supervisoraState.pedidosHoy.find(p => p.id == pedidoId);
    let procesosDisponibles = [];

    if (pedido) {
        DEBUG_MODE && console.log('[SUPERVISORA] Cargando procesos para pedido:', pedidoId, pedido);

        // PRIORIDAD 1: Buscar procesos en rutaProcesos de los productos del pedido
        if (pedido.productos && pedido.productos.length > 0) {
            pedido.productos.forEach(prod => {
                DEBUG_MODE && console.log('[SUPERVISORA] Producto en pedido:', prod);
                // Obtener el producto completo de la BD para acceder a rutaProcesos
                // Convertir a número para asegurar coincidencia
                const productoId = parseInt(prod.productoId);
                const productoCompleto = db.getProducto(productoId);
                DEBUG_MODE && console.log('[SUPERVISORA] Buscando producto ID:', productoId, 'Encontrado:', productoCompleto);

                if (productoCompleto) {
                    DEBUG_MODE && console.log('[SUPERVISORA] Producto encontrado:', productoCompleto.nombre);
                    DEBUG_MODE && console.log('[SUPERVISORA] rutaProcesos:', productoCompleto.rutaProcesos);
                    DEBUG_MODE && console.log('[SUPERVISORA] Tiene rutaProcesos?:', !!productoCompleto.rutaProcesos);
                    DEBUG_MODE && console.log('[SUPERVISORA] Longitud rutaProcesos:', productoCompleto.rutaProcesos?.length || 0);

                    if (productoCompleto.rutaProcesos && Array.isArray(productoCompleto.rutaProcesos) && productoCompleto.rutaProcesos.length > 0) {
                        productoCompleto.rutaProcesos.forEach((proc, idx) => {
                            // Incluir si habilitado es true o undefined (no explícitamente false)
                            const estaHabilitado = proc.habilitado === true || proc.habilitado === undefined || proc.habilitado === null;
                            DEBUG_MODE && console.log('[SUPERVISORA] Proceso:', proc.nombre, 'habilitado:', proc.habilitado, 'incluir:', estaHabilitado);

                            if (estaHabilitado && proc.nombre) {
                                procesosDisponibles.push({
                                    id: proc.id || `${productoId}-${idx}`,
                                    nombre: proc.nombre,
                                    tipo: proc.tipo || detectarTipoProceso(proc.nombre),
                                    tiempoEstandar: proc.tiempoEstandar || 0,
                                    capacidadHora: proc.capacidadHora || 0,
                                    orden: proc.orden || idx + 1,
                                    productoId: productoId,
                                    productoNombre: productoCompleto.nombre,
                                    // Campo para indicar si puede ejecutarse simultáneamente
                                    // Los procesos de corte típicamente pueden ser simultáneos
                                    simultaneo: proc.simultaneo !== undefined ? proc.simultaneo : detectarProcesoSimultaneo(proc.nombre, proc.areaPlantaId)
                                });
                            }
                        });
                    }
                } else {
                    DEBUG_MODE && console.log('[SUPERVISORA] Producto NO encontrado con ID:', productoId);
                }
            });
        }

        // PRIORIDAD 2: Si no encontró rutaProcesos, usar los procesos ya cargados en el pedido
        // pero solo si NO son los genéricos (verificamos que tengan tiempoEstandar real o tipo específico)
        if (procesosDisponibles.length === 0 && pedido.procesos && pedido.procesos.length > 0) {
            const sonProcesosReales = pedido.procesos.some(p =>
                (p.tiempoEstandar && p.tiempoEstandar > 0) ||
                (p.capacidadHora && p.capacidadHora > 0) ||
                p.productoId
            );

            if (sonProcesosReales) {
                procesosDisponibles = pedido.procesos.map(p => ({
                    id: p.id || p.procesoId,
                    nombre: p.nombre || p.procesoNombre,
                    tipo: p.tipo,
                    tiempoEstandar: p.tiempoEstandar || 0,
                    orden: p.orden
                }));
            }
        }
    }

    // Variable para rastrear la fuente de los procesos
    let fuenteProcesos = 'producto';

    // FALLBACK: Si no hay procesos, usar procesos genéricos
    if (procesosDisponibles.length === 0) {
        DEBUG_MODE && console.log('[SUPERVISORA] Usando procesos genéricos como fallback');
        fuenteProcesos = 'generico';
        procesosDisponibles = [
            { id: 1, nombre: 'Corte', tiempoEstandar: 30 },
            { id: 2, nombre: 'Costura', tiempoEstandar: 60 },
            { id: 3, nombre: 'Acabado', tiempoEstandar: 20 },
            { id: 4, nombre: 'Empaque', tiempoEstandar: 15 },
            { id: 5, nombre: 'Control de Calidad', tiempoEstandar: 10 }
        ];
    }

    // Ordenar por orden si existe
    procesosDisponibles.sort((a, b) => (a.orden || 999) - (b.orden || 999));

    DEBUG_MODE && console.log('[SUPERVISORA] Procesos disponibles:', procesosDisponibles);
    DEBUG_MODE && console.log('[SUPERVISORA] Fuente de procesos:', fuenteProcesos);

    // Mostrar indicador de fuente
    const procesoInfo = document.getElementById('procesoInfo');
    if (procesoInfo) {
        if (fuenteProcesos === 'producto') {
            procesoInfo.innerHTML = `<span class="badge-success"><i class="fas fa-check"></i> Del artículo</span>`;
        } else {
            procesoInfo.innerHTML = `<span class="badge-warning"><i class="fas fa-exclamation-triangle"></i> Genéricos (configura ruta en el producto)</span>`;
        }
    }

    selectProceso.innerHTML = `
        <option value="">-- Seleccionar proceso (${procesosDisponibles.length}) --</option>
        ${procesosDisponibles.map(p => `
            <option value="${p.id}"
                    data-nombre="${p.nombre}"
                    data-tiempo="${p.tiempoEstandar || 60}"
                    data-producto="${p.productoNombre || ''}">
                ${p.orden ? `${p.orden}. ` : ''}${p.nombre}${p.productoNombre ? ` (${p.productoNombre})` : ''}
            </option>
        `).join('')}
    `;
    selectProceso.disabled = false;

    // Auto-llenar tiempo estimado cuando se seleccione un proceso
    selectProceso.onchange = function() {
        const option = this.options[this.selectedIndex];
        if (option && option.dataset.tiempo) {
            document.getElementById('inputTiempoEstimado').value = option.dataset.tiempo;
        }
    };
}

function agregarProcesoDesdeModal(operadorId) {
    const pedidoId = document.getElementById('selectPedidoProceso').value;
    const selectProceso = document.getElementById('selectProcesoAgregar');
    const procesoId = selectProceso.value;
    const procesoNombre = selectProceso.options[selectProceso.selectedIndex]?.dataset?.nombre || '';
    const cantidadPiezas = parseInt(document.getElementById('inputCantidadPiezas').value) || 0;
    const tiempoEstimado = parseInt(document.getElementById('inputTiempoEstimado').value) || 60;

    if (!pedidoId || !procesoId) {
        showToast('Selecciona un pedido y un proceso', 'error');
        return;
    }

    agregarProcesoACola(operadorId, {
        procesoId: procesoId,
        procesoNombre: procesoNombre,
        pedidoId: pedidoId,
        cantidadPiezas: cantidadPiezas,
        tiempoEstimadoMin: tiempoEstimado
    });

    // Refrescar modal
    abrirAsignarSiguienteProceso(operadorId);
}

function marcarProcesoCompletadoYContinuar(operadorId) {
    const siguiente = iniciarSiguienteProceso(operadorId);

    if (!siguiente) {
        showToast('No hay más procesos en cola. Asigna uno nuevo.', 'warning');
        abrirAsignarSiguienteProceso(operadorId);
    }

    // Actualizar UI
    if (supervisoraState.selectedEstacion) {
        showEstacionDetalle(supervisoraState.selectedEstacion);
    }
    renderProcesosActivos();
}

// ========================================
// SISTEMA DE NOTIFICACIONES EN TIEMPO REAL
// ========================================

const notificacionesState = {
    notificaciones: [],
    panelAbierto: false,
    permisoConcedido: false
};

function initNotificaciones() {
    // Cargar notificaciones guardadas
    const saved = localStorage.getItem('supervisora_notificaciones');
    if (saved) {
        try {
            notificacionesState.notificaciones = JSON.parse(saved);
        } catch (e) {
            notificacionesState.notificaciones = [];
        }
    }

    // Limpiar notificaciones antiguas (>24h)
    const ahora = Date.now();
    const NOTIF_EXPIRY = 24 * 60 * 60 * 1000;
    const antes = notificacionesState.notificaciones.length;
    notificacionesState.notificaciones = notificacionesState.notificaciones.filter(n => {
        const fecha = new Date(n.fecha).getTime();
        return (ahora - fecha) < NOTIF_EXPIRY;
    });
    if (notificacionesState.notificaciones.length !== antes) {
        guardarNotificaciones();
    }

    // Limpiar también notificaciones_coco antiguas (>24h)
    try {
        const cocoNotifs = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
        const cocoAntes = cocoNotifs.length;
        const cocoLimpio = cocoNotifs.filter(n => {
            const fecha = new Date(n.fecha || n.timestamp).getTime();
            return !isNaN(fecha) && (ahora - fecha) < NOTIF_EXPIRY;
        });
        if (cocoLimpio.length !== cocoAntes) {
            localStorage.setItem('notificaciones_coco', JSON.stringify(cocoLimpio));
        }
    } catch (e) {
        localStorage.setItem('notificaciones_coco', '[]');
    }

    // Solicitar permiso para notificaciones del navegador
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            notificacionesState.permisoConcedido = permission === 'granted';
        });
    } else if (Notification.permission === 'granted') {
        notificacionesState.permisoConcedido = true;
    }

    actualizarBadgeNotificaciones();

    // Verificar eventos que generan notificaciones cada minuto
    setInterval(verificarEventosNotificacion, 60000);
}

function guardarNotificaciones() {
    localStorage.setItem('supervisora_notificaciones', JSON.stringify(notificacionesState.notificaciones));
}

function agregarNotificacion(notif) {
    const nuevaNotif = {
        id: Date.now(),
        titulo: notif.titulo,
        mensaje: notif.mensaje,
        tipo: notif.tipo || 'info', // success, warning, danger, info
        fecha: new Date().toISOString(),
        leida: false,
        accion: notif.accion || null
    };

    notificacionesState.notificaciones.unshift(nuevaNotif);

    // Mantener máximo 50 notificaciones
    if (notificacionesState.notificaciones.length > 50) {
        notificacionesState.notificaciones = notificacionesState.notificaciones.slice(0, 50);
    }

    guardarNotificaciones();
    actualizarBadgeNotificaciones();

    // Mostrar notificación del navegador si está permitido
    if (notificacionesState.permisoConcedido && !document.hasFocus()) {
        new Notification(nuevaNotif.titulo, {
            body: nuevaNotif.mensaje,
            icon: '/favicon.ico'
        });
    }

    // Actualizar panel si está abierto
    if (notificacionesState.panelAbierto) {
        renderNotificaciones();
    }

    // Mostrar también como toast
    showToast(nuevaNotif.mensaje, nuevaNotif.tipo, 5000);

    return nuevaNotif;
}

function actualizarBadgeNotificaciones() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;

    const noLeidas = notificacionesState.notificaciones.filter(n => !n.leida).length;
    badge.textContent = noLeidas > 9 ? '9+' : noLeidas;
    badge.dataset.count = noLeidas;

    if (noLeidas > 0) {
        badge.classList.add('pulse');
        setTimeout(() => badge.classList.remove('pulse'), 500);
    }
}

function toggleNotificaciones() {
    const panel = document.getElementById('notificacionesPanel');
    if (!panel) return;

    notificacionesState.panelAbierto = !notificacionesState.panelAbierto;

    if (notificacionesState.panelAbierto) {
        // Marcar todas como leídas al abrir el panel
        notificacionesState.notificaciones.forEach(n => n.leida = true);
        guardarNotificaciones();
        actualizarBadgeNotificaciones();
        panel.classList.add('show');
        renderNotificaciones();
    } else {
        panel.classList.remove('show');
    }
}

function renderNotificaciones() {
    const body = document.getElementById('notifPanelBody');
    if (!body) return;

    if (notificacionesState.notificaciones.length === 0) {
        body.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No hay notificaciones</p>
            </div>
        `;
        return;
    }

    body.innerHTML = notificacionesState.notificaciones.map(notif => `
        <div class="notif-item ${notif.leida ? '' : 'no-leida'}" onclick="marcarNotificacionLeida(${notif.id})">
            <div class="notif-icon ${notif.tipo}">
                <i class="fas ${getIconoNotificacion(notif.tipo)}"></i>
            </div>
            <div class="notif-content">
                <div class="notif-titulo">${notif.titulo}</div>
                <div class="notif-mensaje">${notif.mensaje}</div>
                <div class="notif-tiempo">${formatearTiempoRelativo(notif.fecha)}</div>
            </div>
        </div>
    `).join('');
}

function getIconoNotificacion(tipo) {
    const iconos = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        danger: 'fa-times-circle',
        info: 'fa-info-circle'
    };
    return iconos[tipo] || iconos.info;
}

function formatearTiempoRelativo(fecha) {
    const ahora = new Date();
    const fechaNotif = new Date(fecha);
    const diffMs = ahora - fechaNotif;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHrs < 24) return `Hace ${diffHrs} hora${diffHrs > 1 ? 's' : ''}`;
    return `Hace ${diffDias} día${diffDias > 1 ? 's' : ''}`;
}

function marcarNotificacionLeida(id) {
    const notif = notificacionesState.notificaciones.find(n => n.id === id);
    if (notif) {
        notif.leida = true;
        guardarNotificaciones();
        actualizarBadgeNotificaciones();
        renderNotificaciones();
    }
}

function marcarTodasLeidas() {
    notificacionesState.notificaciones.forEach(n => n.leida = true);
    guardarNotificaciones();
    actualizarBadgeNotificaciones();
    renderNotificaciones();
}

function limpiarNotificaciones() {
    notificacionesState.notificaciones = [];
    guardarNotificaciones();
    actualizarBadgeNotificaciones();
    renderNotificaciones();
    showToast('Notificaciones limpiadas', 'info');
}

// Registro de notificaciones ya mostradas (para evitar duplicados por sesión y entre recargas)
const notificacionesMostradas = new Set(
    JSON.parse(localStorage.getItem('supervisora_notif_mostradas') || '[]')
);

function registrarNotifMostrada(clave) {
    notificacionesMostradas.add(clave);
    // Guardar en localStorage para persistir entre recargas
    // Mantener máximo 200 claves para no crecer indefinidamente
    const arr = Array.from(notificacionesMostradas);
    if (arr.length > 200) {
        arr.splice(0, arr.length - 200);
    }
    localStorage.setItem('supervisora_notif_mostradas', JSON.stringify(arr));
}

// Limpiar registros de notificaciones al inicio de cada día
function limpiarNotifMostradasSiNuevoDia() {
    const hoy = new Date().toDateString();
    const ultimoDia = localStorage.getItem('supervisora_notif_dia');
    if (ultimoDia !== hoy) {
        localStorage.setItem('supervisora_notif_dia', hoy);
        localStorage.removeItem('supervisora_notif_mostradas');
        notificacionesMostradas.clear();
    }
}
limpiarNotifMostradasSiNuevoDia();

function verificarEventosNotificacion() {
    // Verificar pedidos en riesgo
    supervisoraState.pedidosHoy.forEach(pedido => {
        const prediccion = predecirEntrega(pedido.id);
        if (prediccion && !prediccion.aTiempo && prediccion.margen > -24) {
            const clave = `pedido_riesgo_${pedido.id}`;
            if (!notificacionesMostradas.has(clave)) {
                agregarNotificacion({
                    titulo: 'Pedido en riesgo',
                    mensaje: `El pedido ${pedido.id} podría no llegar a tiempo. Faltan ${Math.abs(prediccion.margen)} horas.`,
                    tipo: 'danger'
                });
                registrarNotifMostrada(clave);
            }
        }
    });

    // Verificar operadoras que superan meta
    const maquinas = Object.values(supervisoraState.maquinas);
    maquinas.forEach(maq => {
        if (maq.operadores) {
            maq.operadores.forEach(op => {
                const piezas = op.piezasHoy || 0;
                const meta = 100; // Meta por defecto
                const clave = `meta_${op.id || op.nombre}_${new Date().toDateString()}`;
                if (piezas >= meta && !notificacionesMostradas.has(clave)) {
                    agregarNotificacion({
                        titulo: '¡Meta alcanzada!',
                        mensaje: `${op.nombre} ha completado ${piezas} piezas hoy.`,
                        tipo: 'success'
                    });
                    registrarNotifMostrada(clave);
                }
            });
        }
    });
}

// ========================================
// MODO TV PARA PANTALLA DE PLANTA
// ========================================

let modoTVActivo = false;
let modoTVInterval = null;

function toggleModoTV() {
    modoTVActivo = !modoTVActivo;
    document.body.classList.toggle('modo-tv', modoTVActivo);

    if (modoTVActivo) {
        // Mostrar solo vista planta
        showSection('planta');

        // Auto-refresh cada 30 segundos
        modoTVInterval = setInterval(() => {
            refreshData();
        }, 30000);

        showToast('Modo TV activado - Auto-refresh cada 30s', 'info');
    } else {
        // Detener auto-refresh
        if (modoTVInterval) {
            clearInterval(modoTVInterval);
            modoTVInterval = null;
        }

        showToast('Modo TV desactivado', 'info');
    }
}

// ========================================
// PREDICCIÓN DE TIEMPO DE ENTREGA
// ========================================

function predecirEntrega(pedidoId) {
    const pedido = supervisoraState.pedidosHoy.find(p => p.id === pedidoId);
    if (!pedido) return null;

    const piezasTotales = pedido.cantidad || 100;
    const piezasCompletadas = calcularPiezasCompletadasPedido(pedidoId);
    const piezasPendientes = piezasTotales - piezasCompletadas;

    if (piezasPendientes <= 0) {
        return {
            aTiempo: true,
            completado: true,
            fechaEstimada: new Date(),
            horasRestantes: 0,
            margen: 0,
            porcentaje: 100
        };
    }

    // Calcular velocidad promedio (piezas por hora)
    const velocidadPromedio = calcularVelocidadPromedioPedido(pedidoId);

    if (velocidadPromedio <= 0) {
        return null; // No hay suficientes datos
    }

    // Horas restantes necesarias
    const horasNecesarias = piezasPendientes / velocidadPromedio;

    // Fecha estimada de terminación
    const fechaEstimada = new Date();
    fechaEstimada.setHours(fechaEstimada.getHours() + horasNecesarias);

    const fechaEntrega = new Date(pedido.fechaEntrega || new Date().setDate(new Date().getDate() + 1));

    const margenHoras = Math.round((fechaEntrega - fechaEstimada) / 3600000);

    return {
        aTiempo: fechaEstimada <= fechaEntrega,
        completado: false,
        fechaEstimada: fechaEstimada,
        horasRestantes: Math.round(horasNecesarias),
        margen: margenHoras,
        porcentaje: Math.round((piezasCompletadas / piezasTotales) * 100),
        velocidadPromedio: Math.round(velocidadPromedio)
    };
}

function calcularPiezasCompletadasPedido(pedidoId) {
    let total = 0;
    const maquinas = Object.values(supervisoraState.maquinas);

    maquinas.forEach(maq => {
        if (maq.pedidoActual === pedidoId || maq.pedidoId === pedidoId) {
            total += maq.piezasHoy || 0;
        }
    });

    return total;
}

function calcularVelocidadPromedioPedido(pedidoId) {
    // Obtener historial de producción del día
    const historial = JSON.parse(localStorage.getItem('historial_produccion_hora') || '[]');
    const hoy = new Date().toISOString().split('T')[0];
    const historicoHoy = historial.filter(h => h.fecha === hoy);

    if (historicoHoy.length < 2) {
        // Si no hay historial, estimar basado en datos actuales
        const maquinas = Object.values(supervisoraState.maquinas);
        let piezasActuales = 0;
        let horasTrabajadas = new Date().getHours() - 8; // Asumiendo inicio a las 8am

        maquinas.forEach(maq => {
            if (maq.pedidoActual === pedidoId || maq.pedidoId === pedidoId) {
                piezasActuales += maq.piezasHoy || 0;
            }
        });

        if (horasTrabajadas <= 0) horasTrabajadas = 1;
        return piezasActuales / horasTrabajadas;
    }

    // Calcular promedio del historial
    const ultimasHoras = historicoHoy.slice(-4); // Últimas 4 horas
    let totalPiezas = 0;

    for (let i = 1; i < ultimasHoras.length; i++) {
        totalPiezas += ultimasHoras[i].piezas - ultimasHoras[i-1].piezas;
    }

    return totalPiezas / (ultimasHoras.length - 1);
}

// Guardar producción cada hora para predicciones
function guardarProduccionHora() {
    const historial = JSON.parse(localStorage.getItem('historial_produccion_hora') || '[]');
    const ahora = new Date();

    const piezasActuales = Object.values(supervisoraState.maquinas)
        .reduce((sum, m) => sum + (m.piezasHoy || 0), 0);

    historial.push({
        hora: ahora.getHours(),
        fecha: ahora.toISOString().split('T')[0],
        piezas: piezasActuales,
        timestamp: ahora.toISOString()
    });

    // Mantener solo últimos 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const filtrado = historial.filter(h => new Date(h.fecha) >= hace7Dias);

    localStorage.setItem('historial_produccion_hora', JSON.stringify(filtrado));
}

// Ejecutar cada hora
setInterval(() => {
    const ahora = new Date();
    if (ahora.getMinutes() === 0) {
        guardarProduccionHora();
    }
}, 60000);

// ========================================
// BACKUP AUTOMÁTICO
// ========================================

function realizarBackup() {
    const backup = {
        version: '1.0',
        fecha: new Date().toISOString(),
        maquinas: supervisoraState.maquinas,
        layout: supervisoraState.layout,
        colaProcesos: supervisoraState.colaProcesosOperadores,
        historialProduccion: JSON.parse(localStorage.getItem('historial_produccion_hora') || '[]'),
        historialLiberaciones: JSON.parse(localStorage.getItem('historial_liberaciones') || '[]'),
        eventos: JSON.parse(localStorage.getItem('calendario_eventos') || '[]'),
        notificaciones: notificacionesState.notificaciones
    };

    // Guardar en localStorage con fecha
    const key = `backup_${backup.fecha.split('T')[0]}`;
    localStorage.setItem(key, JSON.stringify(backup));

    // Mantener solo últimos 7 backups
    limpiarBackupsAntiguos();

    showToast('Backup realizado correctamente', 'success');

    agregarNotificacion({
        titulo: 'Backup completado',
        mensaje: `Se guardó un backup de los datos (${key})`,
        tipo: 'info'
    });

    return backup;
}

function limpiarBackupsAntiguos() {
    const backupKeys = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('backup_')) {
            backupKeys.push(key);
        }
    }

    // Ordenar por fecha (más recientes primero)
    backupKeys.sort().reverse();

    // Eliminar backups antiguos (mantener 7)
    if (backupKeys.length > 7) {
        backupKeys.slice(7).forEach(key => {
            localStorage.removeItem(key);
        });
    }
}

function restaurarBackup(fechaBackup) {
    const key = `backup_${fechaBackup}`;
    const backup = localStorage.getItem(key);

    if (!backup) {
        showToast('No se encontró el backup', 'error');
        return false;
    }

    try {
        const datos = JSON.parse(backup);

        supervisoraState.maquinas = datos.maquinas || {};
        supervisoraState.layout = datos.layout || null;
        supervisoraState.colaProcesosOperadores = datos.colaProcesos || {};

        if (datos.historialProduccion) {
            localStorage.setItem('historial_produccion_hora', JSON.stringify(datos.historialProduccion));
        }
        if (datos.historialLiberaciones) {
            localStorage.setItem('historial_liberaciones', JSON.stringify(datos.historialLiberaciones));
        }
        if (datos.eventos) {
            localStorage.setItem('calendario_eventos', JSON.stringify(datos.eventos));
        }

        guardarEstado();
        refreshData();

        showToast(`Backup del ${fechaBackup} restaurado`, 'success');
        return true;
    } catch (e) {
        showToast('Error al restaurar backup', 'error');
        return false;
    }
}

function listarBackups() {
    const backups = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('backup_')) {
            const fecha = key.replace('backup_', '');
            const data = localStorage.getItem(key);
            const size = data ? Math.round(data.length / 1024) : 0;
            backups.push({ fecha, key, size });
        }
    }

    return backups.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function mostrarModalBackups() {
    const backups = listarBackups();

    const content = `
        <div class="backups-list">
            ${backups.length === 0 ? `
                <div class="no-backups">
                    <i class="fas fa-database"></i>
                    <p>No hay backups guardados</p>
                </div>
            ` : backups.map(b => `
                <div class="backup-item">
                    <div class="backup-info">
                        <i class="fas fa-archive"></i>
                        <div>
                            <strong>${b.fecha}</strong>
                            <span>${b.size} KB</span>
                        </div>
                    </div>
                    <div class="backup-actions">
                        <button class="btn btn-sm btn-outline" onclick="restaurarBackup('${b.fecha}'); closeModal();">
                            <i class="fas fa-undo"></i> Restaurar
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="eliminarBackup('${b.key}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    openModal('Gestionar Backups', content, [
        { text: 'Crear Backup', class: 'btn-primary', onclick: 'realizarBackup(); mostrarModalBackups();' },
        { text: 'Cerrar', class: 'btn-secondary', onclick: 'closeModal()' }
    ]);
}

function eliminarBackup(key) {
    localStorage.removeItem(key);
    mostrarModalBackups();
    showToast('Backup eliminado', 'info');
}

// Backup automático diario a medianoche
setInterval(() => {
    const ahora = new Date();
    if (ahora.getHours() === 0 && ahora.getMinutes() === 0) {
        realizarBackup();
    }
}, 60000);

// Inicializar notificaciones al cargar
document.addEventListener('DOMContentLoaded', () => {
    initNotificaciones();
});

// ========================================
// SISTEMA DE TIEMPOS MUERTOS
// ========================================

function cargarTiemposMuertos() {
    const guardado = localStorage.getItem('tiempos_muertos');
    if (guardado) {
        const data = JSON.parse(guardado);
        supervisoraState.tiemposMuertos = {
            activos: data.activos || {},
            historial: data.historial || []
        };
    }
}

function guardarTiemposMuertos() {
    localStorage.setItem('tiempos_muertos', JSON.stringify(supervisoraState.tiemposMuertos));
}

function abrirModalTiempoMuerto(estacionId) {
    const maquina = supervisoraState.maquinas[estacionId];
    if (!maquina) {
        showToast('Estación no encontrada', 'error');
        return;
    }

    // Verificar si ya tiene tiempo muerto activo
    if (supervisoraState.tiemposMuertos.activos[estacionId]) {
        mostrarTiempoMuertoActivo(estacionId);
        return;
    }

    const operadoresHTML = maquina.operadores && maquina.operadores.length > 0
        ? maquina.operadores.map(op => `<span class="mini-chip">${op.nombre}</span>`).join('')
        : '<span class="text-muted">Sin operadora asignada</span>';

    const content = `
        <div class="tiempo-muerto-form">
            <div class="tm-estacion-info">
                <div class="tm-estacion-header">
                    <span class="tm-estacion-id">${estacionId}</span>
                    <span class="tm-estacion-tipo">${maquina.tipo || 'Estación'}</span>
                </div>
                <div class="tm-operadores">
                    <label>Operadora(s):</label>
                    ${operadoresHTML}
                </div>
                ${maquina.procesoNombre ? `
                    <div class="tm-proceso">
                        <label>Proceso actual:</label>
                        <span>${maquina.procesoNombre}</span>
                    </div>
                ` : ''}
            </div>

            <div class="form-group">
                <label><i class="fas fa-exclamation-circle"></i> Motivo del paro</label>
                <div class="motivos-grid">
                    ${MOTIVOS_TIEMPO_MUERTO.map(motivo => `
                        <div class="motivo-option" onclick="seleccionarMotivo('${motivo.id}')" data-motivo="${motivo.id}">
                            <div class="motivo-icon" style="background: ${motivo.color}20; color: ${motivo.color}">
                                <i class="fas ${motivo.icono}"></i>
                            </div>
                            <span class="motivo-nombre">${motivo.nombre}</span>
                        </div>
                    `).join('')}
                </div>
                <input type="hidden" id="tmMotivoSeleccionado" value="">
            </div>

            <div class="form-group">
                <label><i class="fas fa-comment"></i> Descripción adicional (opcional)</label>
                <textarea id="tmDescripcion" class="form-control" rows="2"
                    placeholder="Detalles del problema..."></textarea>
            </div>

            <div class="form-group">
                <label><i class="fas fa-clock"></i> ¿Cuándo inició el paro?</label>
                <div class="tm-tiempo-options">
                    <label class="radio-option">
                        <input type="radio" name="tmInicio" value="ahora" checked>
                        <span>Ahora mismo</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="tmInicio" value="hace5">
                        <span>Hace 5 minutos</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="tmInicio" value="hace15">
                        <span>Hace 15 minutos</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="tmInicio" value="hace30">
                        <span>Hace 30 minutos</span>
                    </label>
                    <label class="radio-option">
                        <input type="radio" name="tmInicio" value="personalizado">
                        <span>Personalizado:</span>
                        <input type="time" id="tmHoraPersonalizada" class="form-control-sm">
                    </label>
                </div>
            </div>
        </div>
    `;

    openModal('Registrar Tiempo Muerto', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: '<i class="fas fa-pause-circle"></i> Registrar Paro', class: 'btn-warning', onclick: `iniciarTiempoMuerto('${estacionId}')` }
    ]);
}

function seleccionarMotivo(motivoId) {
    // Quitar selección anterior
    document.querySelectorAll('.motivo-option').forEach(el => {
        el.classList.remove('selected');
    });

    // Seleccionar nuevo
    const option = document.querySelector(`[data-motivo="${motivoId}"]`);
    if (option) {
        option.classList.add('selected');
    }

    document.getElementById('tmMotivoSeleccionado').value = motivoId;
}

function iniciarTiempoMuerto(estacionId) {
    const motivoId = document.getElementById('tmMotivoSeleccionado').value;

    if (!motivoId) {
        showToast('Selecciona un motivo para el paro', 'warning');
        return;
    }

    const descripcion = document.getElementById('tmDescripcion').value;
    const inicioOption = document.querySelector('input[name="tmInicio"]:checked').value;

    // Calcular hora de inicio
    let horaInicio = new Date();

    switch(inicioOption) {
        case 'hace5':
            horaInicio.setMinutes(horaInicio.getMinutes() - 5);
            break;
        case 'hace15':
            horaInicio.setMinutes(horaInicio.getMinutes() - 15);
            break;
        case 'hace30':
            horaInicio.setMinutes(horaInicio.getMinutes() - 30);
            break;
        case 'personalizado':
            const horaPersonalizada = document.getElementById('tmHoraPersonalizada').value;
            if (horaPersonalizada) {
                const [horas, minutos] = horaPersonalizada.split(':');
                horaInicio.setHours(parseInt(horas), parseInt(minutos), 0, 0);
            }
            break;
    }

    const motivo = MOTIVOS_TIEMPO_MUERTO.find(m => m.id === motivoId);
    const maquina = supervisoraState.maquinas[estacionId];

    // Registrar tiempo muerto activo
    supervisoraState.tiemposMuertos.activos[estacionId] = {
        id: Date.now(),
        estacionId: estacionId,
        inicio: horaInicio.toISOString(),
        motivoId: motivoId,
        motivoNombre: motivo.nombre,
        motivoColor: motivo.color,
        motivoIcono: motivo.icono,
        descripcion: descripcion,
        operadores: maquina.operadores || [],
        procesoNombre: maquina.procesoNombre || null,
        pedidoId: maquina.pedidoId || null
    };

    // Cambiar estado de la estación a pausado
    if (maquina) {
        maquina.estadoAnterior = maquina.estado;
        maquina.estado = 'pausado';
        maquina.tiempoMuertoActivo = true;
    }

    guardarTiemposMuertos();
    saveEstadoMaquinas();

    // Re-renderizar
    if (supervisoraState.layout) {
        renderLayoutInSupervisora(supervisoraState.layout);
    }

    // Actualizar detalle si está seleccionada
    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    closeModal();
    showToast(`Tiempo muerto registrado en ${estacionId}: ${motivo.nombre}`, 'warning');

    // Crear notificación
    if (typeof agregarNotificacion === 'function') {
        agregarNotificacion({
            tipo: 'warning',
            titulo: 'Estación en paro',
            mensaje: `${estacionId} - ${motivo.nombre}`
        });
    }
}

function mostrarTiempoMuertoActivo(estacionId) {
    const tiempoMuerto = supervisoraState.tiemposMuertos.activos[estacionId];
    if (!tiempoMuerto) return;

    const inicio = new Date(tiempoMuerto.inicio);
    const ahora = new Date();
    const duracionMs = ahora - inicio;
    const duracionMin = Math.floor(duracionMs / 60000);
    const horas = Math.floor(duracionMin / 60);
    const minutos = duracionMin % 60;
    const duracionTexto = horas > 0 ? `${horas}h ${minutos}m` : `${minutos} min`;

    const content = `
        <div class="tiempo-muerto-activo">
            <div class="tm-activo-header">
                <div class="tm-activo-icono" style="background: ${tiempoMuerto.motivoColor}20; color: ${tiempoMuerto.motivoColor}">
                    <i class="fas ${tiempoMuerto.motivoIcono}"></i>
                </div>
                <div class="tm-activo-info">
                    <h4>${tiempoMuerto.motivoNombre}</h4>
                    <span class="tm-estacion">${estacionId}</span>
                </div>
            </div>

            <div class="tm-duracion-display">
                <div class="tm-duracion-icon">
                    <i class="fas fa-stopwatch"></i>
                </div>
                <div class="tm-duracion-tiempo">
                    <span class="duracion-valor">${duracionTexto}</span>
                    <span class="duracion-label">Tiempo transcurrido</span>
                </div>
                <div class="tm-duracion-inicio">
                    <span>Inicio: ${inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            ${tiempoMuerto.descripcion ? `
                <div class="tm-descripcion">
                    <label>Descripción:</label>
                    <p>${tiempoMuerto.descripcion}</p>
                </div>
            ` : ''}

            ${tiempoMuerto.operadores && tiempoMuerto.operadores.length > 0 ? `
                <div class="tm-operadores-afectados">
                    <label>Operadora(s) afectada(s):</label>
                    <div class="operadores-chips">
                        ${tiempoMuerto.operadores.map(op => `
                            <span class="op-chip">${op.nombre}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="form-group">
                <label><i class="fas fa-clipboard-check"></i> Solución aplicada</label>
                <textarea id="tmSolucion" class="form-control" rows="2"
                    placeholder="¿Cómo se resolvió el problema?"></textarea>
            </div>
        </div>
    `;

    openModal('Tiempo Muerto Activo', content, [
        { text: 'Cerrar', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: '<i class="fas fa-play-circle"></i> Finalizar Paro', class: 'btn-success', onclick: `finalizarTiempoMuerto('${estacionId}')` }
    ]);
}

function finalizarTiempoMuerto(estacionId) {
    const tiempoMuerto = supervisoraState.tiemposMuertos.activos[estacionId];
    if (!tiempoMuerto) return;

    const solucion = document.getElementById('tmSolucion')?.value || '';
    const fin = new Date();
    const inicio = new Date(tiempoMuerto.inicio);
    const duracionMs = fin - inicio;
    const duracionMin = Math.floor(duracionMs / 60000);

    // Crear registro de historial
    const registro = {
        ...tiempoMuerto,
        fin: fin.toISOString(),
        duracionMinutos: duracionMin,
        solucion: solucion,
        fecha: inicio.toISOString().split('T')[0]
    };

    // Agregar al historial
    supervisoraState.tiemposMuertos.historial.unshift(registro);

    // Mantener solo últimos 500 registros
    if (supervisoraState.tiemposMuertos.historial.length > 500) {
        supervisoraState.tiemposMuertos.historial = supervisoraState.tiemposMuertos.historial.slice(0, 500);
    }

    // Eliminar de activos
    delete supervisoraState.tiemposMuertos.activos[estacionId];

    // Restaurar estado de la estación
    const maquina = supervisoraState.maquinas[estacionId];
    if (maquina) {
        maquina.estado = maquina.estadoAnterior || (maquina.operadores && maquina.operadores.length > 0 ? 'activo' : 'inactivo');
        maquina.tiempoMuertoActivo = false;
        delete maquina.estadoAnterior;
    }

    guardarTiemposMuertos();
    saveEstadoMaquinas();

    // Re-renderizar
    if (supervisoraState.layout) {
        renderLayoutInSupervisora(supervisoraState.layout);
    }

    // Actualizar detalle si está seleccionada
    if (supervisoraState.selectedEstacion === estacionId) {
        showEstacionDetalle(estacionId);
    }

    closeModal();

    const horas = Math.floor(duracionMin / 60);
    const minutos = duracionMin % 60;
    const duracionTexto = horas > 0 ? `${horas}h ${minutos}m` : `${minutos} min`;

    showToast(`Paro finalizado en ${estacionId}. Duración: ${duracionTexto}`, 'success');

    // Notificación
    if (typeof agregarNotificacion === 'function') {
        agregarNotificacion({
            tipo: 'success',
            titulo: 'Paro finalizado',
            mensaje: `${estacionId} vuelve a estar activo (${duracionTexto})`
        });
    }
}

function getTiemposMuertosActivos() {
    return Object.values(supervisoraState.tiemposMuertos.activos || {});
}

function getHistorialTiemposMuertos(filtro = 'hoy') {
    const historial = supervisoraState.tiemposMuertos.historial || [];
    const hoy = new Date();

    switch(filtro) {
        case 'hoy':
            const fechaHoy = hoy.toISOString().split('T')[0];
            return historial.filter(h => h.fecha === fechaHoy);
        case 'semana':
            const hace7Dias = new Date(hoy);
            hace7Dias.setDate(hace7Dias.getDate() - 7);
            return historial.filter(h => new Date(h.fecha) >= hace7Dias);
        case 'mes':
            const hace30Dias = new Date(hoy);
            hace30Dias.setDate(hace30Dias.getDate() - 30);
            return historial.filter(h => new Date(h.fecha) >= hace30Dias);
        default:
            return historial;
    }
}

function calcularEstadisticasTiemposMuertos(filtro = 'hoy') {
    const historial = getHistorialTiemposMuertos(filtro);
    const activos = getTiemposMuertosActivos();

    const tiempoTotal = historial.reduce((sum, h) => sum + (h.duracionMinutos || 0), 0);
    const promedio = historial.length > 0 ? Math.round(tiempoTotal / historial.length) : 0;

    // Agrupar por motivo
    const porMotivo = {};
    historial.forEach(h => {
        if (!porMotivo[h.motivoId]) {
            porMotivo[h.motivoId] = {
                motivo: h.motivoNombre,
                color: h.motivoColor,
                icono: h.motivoIcono,
                cantidad: 0,
                tiempoTotal: 0
            };
        }
        porMotivo[h.motivoId].cantidad++;
        porMotivo[h.motivoId].tiempoTotal += h.duracionMinutos || 0;
    });

    return {
        totalParos: historial.length,
        tiempoTotal: tiempoTotal,
        promedio: promedio,
        activos: activos.length,
        porMotivo: Object.values(porMotivo).sort((a, b) => b.tiempoTotal - a.tiempoTotal)
    };
}

function exportarTiemposMuertosCSV() {
    const historial = supervisoraState.tiemposMuertos?.historial || [];

    if (historial.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }

    let csv = 'Fecha,Hora Inicio,Hora Fin,Estación,Motivo,Duración (min),Operadora,Descripción,Solución\n';

    historial.forEach(h => {
        const inicio = new Date(h.inicio);
        const fin = new Date(h.fin);
        const operadoras = h.operadores?.map(op => op.nombre).join('; ') || '';

        csv += `${h.fecha},${inicio.toLocaleTimeString()},${fin.toLocaleTimeString()},${h.estacionId},"${h.motivoNombre}",${h.duracionMinutos},"${operadoras}","${h.descripcion || ''}","${h.solucion || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiempos_muertos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('Historial de tiempos muertos exportado', 'success');
}

// ========================================
// ASIGNACIÓN DE PEDIDOS A ESTACIONES
// Integración con Panel Operadora
// ========================================

/**
 * Asigna un pedido a una estación para que la operadora lo vea
 */
function asignarPedidoAEstacion(estacionId, pedidoId, procesoId = null, meta = 100) {
    // 1. Guardar en asignaciones_estaciones (clave que lee Operadora)
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    asignaciones[estacionId] = {
        pedidoId: pedidoId,
        procesoId: procesoId,
        meta: meta,
        fechaAsignacion: new Date().toISOString(),
        asignadoPor: 'Coco'
    };

    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));

    // 2. Actualizar estado interno
    const maquina = supervisoraState.maquinas[estacionId];
    if (maquina) {
        maquina.pedidoId = pedidoId;
        maquina.procesoId = procesoId;
        maquina.estado = 'asignado';
    }

    // 3. Actualizar estado_maquinas
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    estadoMaquinas[estacionId] = {
        ...(estadoMaquinas[estacionId] || {}),
        estado: 'asignado',
        pedidoId: pedidoId,
        ultimaActualizacion: new Date().toISOString()
    };
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // 4. IMPORTANTE: Sincronizar datos del pedido a pedidos_activos
    // para que el panel operadora pueda ver los detalles
    sincronizarPedidoParaOperadoras(pedidoId);

    DEBUG_MODE && console.log('[SUPERVISORA] Pedido', pedidoId, 'asignado a estación', estacionId);
    showToast(`Pedido asignado a ${estacionId}`, 'success');

    return asignaciones[estacionId];
}

/**
 * Sincroniza los datos de un pedido específico a pedidos_activos
 */
function sincronizarPedidoParaOperadoras(pedidoId) {
    // Obtener pedidos activos actuales
    let pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');

    // Verificar si ya existe (actualizar si existe)
    const existeIndex = pedidosActivos.findIndex(p => p.id == pedidoId);

    // Buscar el pedido en db
    let pedidoData = null;

    // Fuente 1: db.getPedido
    if (typeof db !== 'undefined' && typeof db.getPedido === 'function') {
        pedidoData = db.getPedido(pedidoId);
        if (!pedidoData) {
            pedidoData = db.getPedido(parseInt(pedidoId));
        }
    }

    // Fuente 2: db.getPedidos (buscar en lista)
    if (!pedidoData && typeof db !== 'undefined' && typeof db.getPedidos === 'function') {
        const todosPedidos = db.getPedidos();
        pedidoData = todosPedidos.find(p => p.id == pedidoId);
    }

    // Fuente 3: Buscar en supervisoraState.pedidosHoy
    if (!pedidoData && supervisoraState.pedidosHoy) {
        pedidoData = supervisoraState.pedidosHoy.find(p => p.id == pedidoId);
    }

    if (pedidoData) {
        // Obtener nombre del cliente si no está
        let clienteNombre = pedidoData.clienteNombre || pedidoData.cliente;
        if (!clienteNombre && pedidoData.clienteId && typeof db !== 'undefined' && typeof db.getCliente === 'function') {
            const cliente = db.getCliente(pedidoData.clienteId);
            clienteNombre = cliente?.nombreComercial || cliente?.nombre || 'Cliente';
        }

        // Obtener datos completos del producto (nombre e imagen)
        let productoNombre = '';
        let productoImagen = null;

        if (pedidoData.productos && pedidoData.productos.length > 0) {
            const prod = pedidoData.productos[0];
            const productoId = parseInt(prod.productoId) || prod.productoId;

            // Buscar producto completo en la base de datos
            if (typeof db !== 'undefined' && typeof db.getProducto === 'function') {
                const productoCompleto = db.getProducto(productoId);
                if (productoCompleto) {
                    productoNombre = productoCompleto.nombre || prod.nombre || 'Producto';
                    productoImagen = productoCompleto.imagen || prod.imagen || null;
                } else {
                    productoNombre = prod.nombre || 'Producto';
                    productoImagen = prod.imagen || null;
                }
            } else {
                productoNombre = prod.nombre || 'Producto';
                productoImagen = prod.imagen || null;
            }
        } else {
            productoNombre = pedidoData.productoNombre || pedidoData.descripcion || 'Producto';
            productoImagen = pedidoData.imagen || null;
        }

        // Formatear pedido
        const pedidoFormateado = {
            id: pedidoData.id,
            codigo: pedidoData.codigo || `PED-${pedidoData.id}`,
            cliente: clienteNombre || 'Cliente',
            producto: productoNombre,
            productoNombre: productoNombre,
            cantidad: pedidoData.productos?.[0]?.cantidad || pedidoData.cantidad || pedidoData.cantidadTotal || 0,
            estado: pedidoData.estado || 'pendiente',
            prioridad: pedidoData.prioridad || 'normal',
            fechaEntrega: pedidoData.fechaEntrega,
            imagen: productoImagen,
            productoImagen: productoImagen,
            procesos: pedidoData.procesos || []
        };

        if (existeIndex >= 0) {
            // Actualizar existente
            pedidosActivos[existeIndex] = pedidoFormateado;
        } else {
            // Agregar nuevo
            pedidosActivos.push(pedidoFormateado);
        }

        localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
        DEBUG_MODE && console.log('[SUPERVISORA] Pedido sincronizado a pedidos_activos:', pedidoId, pedidoFormateado);
    } else {
        DEBUG_MODE && console.warn('[SUPERVISORA] No se encontró el pedido para sincronizar:', pedidoId);
        DEBUG_MODE && console.log('[SUPERVISORA] Intentando crear entrada básica...');

        // Crear entrada básica con la información disponible
        if (existeIndex < 0) {
            const pedidoBasico = {
                id: pedidoId,
                codigo: `PED-${pedidoId}`,
                cliente: 'Cliente',
                producto: 'Producto',
                cantidad: 100,
                estado: 'pendiente',
                prioridad: 'normal',
                procesos: []
            };
            pedidosActivos.push(pedidoBasico);
            localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
            DEBUG_MODE && console.log('[SUPERVISORA] Pedido básico creado:', pedidoId);
        }
    }
}

/**
 * Libera una estación de su pedido actual
 */
function liberarEstacionDePedido(estacionId) {
    // 1. Quitar de asignaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    delete asignaciones[estacionId];
    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));

    // 2. Actualizar estado
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    if (estadoMaquinas[estacionId]) {
        estadoMaquinas[estacionId].estado = 'disponible';
        estadoMaquinas[estacionId].pedidoId = null;
    }
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // 3. Actualizar estado interno
    const maquina = supervisoraState.maquinas[estacionId];
    if (maquina) {
        maquina.pedidoId = null;
        maquina.estado = 'disponible';
    }

    DEBUG_MODE && console.log('[SUPERVISORA] Estación', estacionId, 'liberada');
    showToast(`Estación ${estacionId} liberada`, 'info');
}

/**
 * Obtiene todas las asignaciones actuales
 */
function obtenerAsignacionesActuales() {
    return JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
}

/**
 * Muestra modal para asignar pedido a una estación
 */
function mostrarModalAsignarPedido(estacionId) {
    // Obtener pedidos activos
    let todosPedidos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');

    // También intentar desde db si está disponible
    if (typeof db !== 'undefined' && typeof db.getPedidos === 'function') {
        const pedidosDb = db.getPedidos().filter(p =>
            ['produccion', 'en_proceso', 'pendiente', 'en proceso'].includes((p.estado || '').toLowerCase())
        );
        // Combinar sin duplicados
        pedidosDb.forEach(p => {
            if (!todosPedidos.find(tp => tp.id === p.id)) {
                todosPedidos.push({
                    id: p.id,
                    codigo: p.codigo || `PED-${p.id}`,
                    cliente: p.clienteNombre || 'Cliente',
                    cantidad: p.cantidad || 0
                });
            }
        });
    }

    if (todosPedidos.length === 0) {
        showToast('No hay pedidos activos para asignar', 'warning');
        return;
    }

    const content = `
        <div class="asignar-pedido-form">
            <p>Asignar pedido a estación: <strong>${estacionId}</strong></p>

            <div class="form-group">
                <label>Seleccionar Pedido</label>
                <select id="pedidoAAsignar" class="form-control">
                    <option value="">-- Seleccionar --</option>
                    ${todosPedidos.map(p => `
                        <option value="${p.id}">
                            ${p.codigo || 'PED-' + p.id} - ${p.cliente || p.clienteNombre || 'Cliente'}
                            (${p.cantidad || 0} pzas)
                        </option>
                    `).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Meta de piezas para esta estación</label>
                <input type="number" id="metaEstacion" class="form-control" value="100" min="1">
            </div>
        </div>
    `;

    openModal('Asignar Pedido', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'closeModal()' },
        {
            text: 'Asignar',
            class: 'btn-primary',
            onclick: `confirmarAsignacionPedido('${estacionId}')`
        }
    ]);
}

function confirmarAsignacionPedido(estacionId) {
    const pedidoId = parseInt(document.getElementById('pedidoAAsignar').value);
    const meta = parseInt(document.getElementById('metaEstacion').value) || 100;

    if (!pedidoId) {
        showToast('Selecciona un pedido', 'warning');
        return;
    }

    asignarPedidoAEstacion(estacionId, pedidoId, null, meta);
    closeModal();

    // Refrescar vista
    if (typeof refreshData === 'function') {
        refreshData();
    }
}

// ========================================
// MENSAJES A OPERADORAS
// ========================================

/**
 * Muestra modal para enviar mensaje a operadoras
 */
function mostrarModalEnviarMensaje(destinatarioId = 'todos') {
    const operadoras = JSON.parse(localStorage.getItem('operadoras_db') || '[]');

    const content = `
        <div class="enviar-mensaje-form">
            <div class="form-group">
                <label>Destinatario</label>
                <select id="mensajeDestinatario" class="form-control">
                    <option value="todos" ${destinatarioId === 'todos' ? 'selected' : ''}>
                        📢 Todas las operadoras
                    </option>
                    ${operadoras.map(op => `
                        <option value="${op.id}" ${destinatarioId == op.id ? 'selected' : ''}>
                            👤 ${op.nombre}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Mensaje</label>
                <textarea id="mensajeTexto" class="form-control" rows="4"
                          placeholder="Escribe tu mensaje..."></textarea>
            </div>
            <div class="mensajes-rapidos" style="margin-top: 10px;">
                <label style="font-size: 12px; color: #666;">Mensajes rápidos:</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='Por favor acelerar el ritmo de producción'">
                        ⚡ Acelerar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='Descanso en 10 minutos'">
                        ☕ Descanso
                    </button>
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='Reunión breve al terminar el turno'">
                        📋 Reunión
                    </button>
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='¡Excelente trabajo! Sigan así'">
                        👏 Felicitar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='Favor de reportar avance'">
                        📊 Pedir reporte
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal('Enviar Mensaje a Operadoras', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'closeModal()' },
        { text: 'Enviar Mensaje', class: 'btn-primary', onclick: 'confirmarEnvioMensaje()' }
    ]);
}

/**
 * Confirma y envía el mensaje
 */
function confirmarEnvioMensaje() {
    const destinatario = document.getElementById('mensajeDestinatario').value;
    const texto = document.getElementById('mensajeTexto').value.trim();

    if (!texto) {
        showToast('Por favor escribe un mensaje', 'warning');
        return;
    }

    // Usar función de data.js si existe
    if (typeof enviarMensajeDeCocoAOperadoras === 'function') {
        enviarMensajeDeCocoAOperadoras(texto, destinatario);
    } else {
        // Implementación directa
        const mensajes = JSON.parse(localStorage.getItem('mensajes_operadoras') || '[]');
        mensajes.unshift({
            id: Date.now(),
            texto: texto,
            destinatarioId: destinatario,
            remitente: 'Coco',
            fecha: new Date().toISOString(),
            leido: false,
            leidoPor: []
        });
        localStorage.setItem('mensajes_operadoras', JSON.stringify(mensajes.slice(0, 100)));
    }

    closeModal();
    showToast('Mensaje enviado a ' + (destinatario === 'todos' ? 'todas las operadoras' : 'la operadora'), 'success');
}

// ========================================
// LECTURA DE NOTIFICACIONES DE OPERADORAS
// ========================================

/**
 * Verifica si hay nuevas notificaciones de operadoras
 * LLAMAR: Periódicamente con setInterval
 */
function verificarNotificacionesDeOperadoras() {
    // Leer de la clave correcta (notificaciones_coco)
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    const noLeidas = notificaciones.filter(n => !n.leida);

    if (noLeidas.length > 0) {
        let huboCambios = false;
        noLeidas.forEach(notif => {
            // Si es pedido listo para entrega, mostrar modal de cierre
            if (notif.tipo === 'pedido_listo_entrega') {
                mostrarModalCierrePedido(notif);
            } else if (typeof agregarNotificacion === 'function') {
                agregarNotificacion({
                    tipo: notif.tipo || 'alerta',
                    titulo: obtenerTituloNotificacionOp(notif),
                    mensaje: notif.mensaje || notif.descripcion,
                    icono: obtenerIconoNotificacionOp(notif.tipo),
                    color: obtenerColorNotificacionOp(notif.tipo),
                    origen: 'operadora',
                    origenId: notif.id,
                    operadoraId: notif.operadoraId,
                    operadoraNombre: notif.operadoraNombre,
                    estacionId: notif.estacionId,
                    fecha: notif.fecha
                });
            }

            // Marcar como leída en notificaciones_coco para que no se re-procese
            notif.leida = true;
            huboCambios = true;
        });

        // Guardar los cambios de vuelta a localStorage
        if (huboCambios) {
            localStorage.setItem('notificaciones_coco', JSON.stringify(notificaciones));
        }
    }

    return noLeidas;
}

/**
 * Marca una notificación de coco (operadora→supervisora) como leída
 */
function marcarNotificacionCocoLeida(notifId) {
    const notificaciones = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    const notif = notificaciones.find(n => n.id === notifId);
    if (notif) {
        notif.leida = true;
        localStorage.setItem('notificaciones_coco', JSON.stringify(notificaciones));
    }
}

function obtenerTituloNotificacionOp(notif) {
    const titulos = {
        'proceso_completado': '✅ Proceso completado',
        'empaque_completado': '📦 Empaque completado',
        'calidad_completado': '✅ Calidad completada',
        'pedido_listo_entrega': '🎉 PEDIDO LISTO PARA ENTREGA',
        'problema': '⚠️ Problema reportado',
        'problema_operadora': '⚠️ Problema de operadora',
        'sin_material': '📦 Sin material',
        'maquina': '🔧 Problema de máquina',
        'calidad': '❌ Problema de calidad',
        'pausa': '⏸️ Pausa iniciada',
        'llamada': '📞 Llamada de operadora',
        'ayuda': '🆘 Solicitud de ayuda'
    };
    return titulos[notif.tipo] || notif.titulo || '🔔 Notificación';
}

function obtenerIconoNotificacionOp(tipo) {
    const iconos = {
        'proceso_completado': 'fa-check-circle',
        'empaque_completado': 'fa-box',
        'calidad_completado': 'fa-clipboard-check',
        'pedido_listo_entrega': 'fa-truck-loading',
        'problema': 'fa-exclamation-triangle',
        'problema_operadora': 'fa-exclamation-triangle',
        'sin_material': 'fa-box-open',
        'maquina': 'fa-tools',
        'calidad': 'fa-times-circle',
        'pausa': 'fa-pause-circle',
        'llamada': 'fa-phone',
        'ayuda': 'fa-hands-helping'
    };
    return iconos[tipo] || 'fa-bell';
}

function obtenerColorNotificacionOp(tipo) {
    const colores = {
        'proceso_completado': '#10b981',
        'empaque_completado': '#10b981',
        'calidad_completado': '#10b981',
        'pedido_listo_entrega': '#22c55e',
        'problema': '#ef4444',
        'problema_operadora': '#ef4444',
        'sin_material': '#f59e0b',
        'maquina': '#dc2626',
        'calidad': '#ef4444',
        'pausa': '#3b82f6',
        'llamada': '#8b5cf6',
        'ayuda': '#ec4899'
    };
    return colores[tipo] || '#6b7280';
}

// ========================================
// CIERRE DE PEDIDO (EMPAQUE COMPLETADO)
// ========================================

/**
 * Muestra el modal de cierre de pedido cuando empaque termina
 */
function mostrarModalCierrePedido(notif) {
    const pedidoId = notif.pedidoId;

    // Obtener información completa del pedido
    const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const historialCompletados = JSON.parse(localStorage.getItem('historial_asignaciones_completadas') || '[]');

    const pedido = pedidosActivos.find(p => p.id == pedidoId || p.pedidoId == pedidoId);
    const pedidoERP = pedidosERP.find(p => p.id == pedidoId);

    // Obtener historial de procesos del pedido
    const procesosCompletados = historialCompletados.filter(h =>
        h.pedidoId == pedidoId || h.pedidoId == notif.pedidoId
    );

    // Construir resumen de procesos con botón de ajuste
    let resumenProcesosHTML = '';
    if (procesosCompletados.length > 0) {
        resumenProcesosHTML = `
            <table class="tabla-resumen-procesos">
                <thead>
                    <tr>
                        <th>Proceso</th>
                        <th>Equipo</th>
                        <th>Piezas</th>
                        <th>Tiempo</th>
                        <th>Ajustar</th>
                    </tr>
                </thead>
                <tbody>
                    ${procesosCompletados.map((p, index) => `
                        <tr data-proceso-index="${index}">
                            <td>${p.procesoNombre || 'Proceso'}</td>
                            <td>${p.nombresEquipo || '-'}</td>
                            <td class="piezas-celda" data-piezas="${p.piezasProducidas || 0}">${p.piezasProducidas || 0}</td>
                            <td>${p.tiempoTotalEquipoFormateado || '-'}</td>
                            <td>
                                <button class="btn-ajustar-cierre" onclick="ajustarCantidadEnCierre('proceso', ${index}, ${p.piezasProducidas || 0}, '${(p.procesoNombre || 'Proceso').replace(/'/g, "\\'")}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    // Información de productos con botón de ajuste
    let productosHTML = '<p>Sin información de productos</p>';
    if (pedido && pedido.productos && pedido.productos.length > 0) {
        productosHTML = `
            <table class="tabla-resumen-productos">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Pzas/Caja</th>
                        <th>Cajas</th>
                        <th>Ajustar</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedido.productos.map((prod, index) => {
                        const piezasPorCaja = prod.piezasPorCaja || prod.pzasCaja || 1;
                        const cantidad = prod.cantidad || 0;
                        const cajas = Math.ceil(cantidad / piezasPorCaja);
                        return `
                            <tr data-producto-index="${index}">
                                <td>${prod.nombre || prod.producto || '-'}</td>
                                <td class="cantidad-celda" data-cantidad="${cantidad}">${cantidad} pzas</td>
                                <td>${piezasPorCaja}</td>
                                <td class="cajas-celda">${cajas}</td>
                                <td>
                                    <button class="btn-ajustar-cierre" onclick="ajustarCantidadEnCierre('producto', ${index}, ${cantidad}, '${(prod.nombre || prod.producto || 'Producto').replace(/'/g, "\\'")}', ${pedidoId})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    const modalHTML = `
        <div class="modal-overlay-cierre" id="modalCierrePedido">
            <div class="modal-cierre-pedido">
                <div class="modal-cierre-header">
                    <div class="cierre-icono-exito">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h2>Pedido Listo para Entrega</h2>
                    <p class="cierre-subtitulo">El pedido #${pedidoId} ha completado todos los procesos</p>
                </div>

                <div class="modal-cierre-body">
                    <!-- Información del pedido -->
                    <div class="cierre-seccion">
                        <h3><i class="fas fa-info-circle"></i> Información del Pedido</h3>
                        <div class="cierre-info-grid">
                            <div class="cierre-info-item">
                                <span class="label">Pedido:</span>
                                <span class="valor">#${pedidoId}</span>
                            </div>
                            <div class="cierre-info-item">
                                <span class="label">Cliente:</span>
                                <span class="valor">${notif.cliente || pedido?.cliente || '-'}</span>
                            </div>
                            <div class="cierre-info-item">
                                <span class="label">Producto:</span>
                                <span class="valor">${notif.producto || pedido?.producto || '-'}</span>
                            </div>
                            <div class="cierre-info-item">
                                <span class="label">Total Piezas:</span>
                                <span class="valor destacado">${notif.piezas || pedido?.cantidad || '-'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Productos y cajas -->
                    <div class="cierre-seccion">
                        <h3><i class="fas fa-boxes"></i> Productos y Empaque</h3>
                        ${productosHTML}
                    </div>

                    <!-- Resumen de procesos -->
                    <div class="cierre-seccion">
                        <h3><i class="fas fa-tasks"></i> Procesos Completados</h3>
                        ${resumenProcesosHTML || '<p>Sin registro de procesos</p>'}
                    </div>

                    <!-- Equipo de empaque -->
                    <div class="cierre-seccion">
                        <h3><i class="fas fa-users"></i> Equipo de Empaque</h3>
                        <div class="cierre-equipo">
                            <span class="equipo-nombres">${notif.nombresEquipo || 'No especificado'}</span>
                            <span class="equipo-tiempo">Tiempo: ${notif.tiempoTotal || '-'}</span>
                        </div>
                    </div>

                    <!-- Confirmación -->
                    <div class="cierre-seccion cierre-confirmacion">
                        <h3><i class="fas fa-clipboard-check"></i> Confirmación de Cierre</h3>
                        <div class="cierre-checkbox-container">
                            <label class="cierre-checkbox">
                                <input type="checkbox" id="checkTodoEnOrden" onchange="verificarChecksCierre()">
                                <span>Confirmo que todo está en orden</span>
                            </label>
                            <label class="cierre-checkbox">
                                <input type="checkbox" id="checkCantidadesCorrectas" onchange="verificarChecksCierre()">
                                <span>Las cantidades son correctas</span>
                            </label>
                            <label class="cierre-checkbox">
                                <input type="checkbox" id="checkListoEntrega" onchange="verificarChecksCierre()">
                                <span>El pedido está listo para entrega al cliente</span>
                            </label>
                        </div>
                    </div>

                    <!-- Firma -->
                    <div class="cierre-seccion cierre-firma-seccion">
                        <h3><i class="fas fa-signature"></i> Firma de Autorización</h3>
                        <div class="cierre-firma-container">
                            <canvas id="canvasFirmaCierre" width="400" height="150"></canvas>
                            <button class="btn-limpiar-firma" onclick="limpiarFirmaCierre()">
                                <i class="fas fa-eraser"></i> Limpiar
                            </button>
                        </div>
                        <p class="firma-instruccion">Firme para autorizar el cierre del pedido</p>
                    </div>

                    <!-- Observaciones -->
                    <div class="cierre-seccion">
                        <h3><i class="fas fa-comment-alt"></i> Observaciones (Opcional)</h3>
                        <textarea id="observacionesCierre" placeholder="Agregar observaciones si es necesario..." rows="3"></textarea>
                    </div>
                </div>

                <div class="modal-cierre-footer">
                    <button class="btn-cancelar-cierre" onclick="cancelarCierrePedido()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-confirmar-cierre" id="btnConfirmarCierre" onclick="confirmarCierrePedido('${pedidoId}')" disabled>
                        <i class="fas fa-check"></i> Cerrar Pedido
                    </button>
                </div>
            </div>
        </div>
    `;

    // Eliminar modal anterior si existe
    const modalAnterior = document.getElementById('modalCierrePedido');
    if (modalAnterior) modalAnterior.remove();

    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Inicializar canvas de firma
    setTimeout(() => inicializarCanvasFirma(), 100);

    // Reproducir sonido de notificación
    if (typeof reproducirSonido === 'function') reproducirSonido('exito');
}

/**
 * Inicializa el canvas para la firma
 */
let firmaCierreCtx = null;
let firmandoCierre = false;

function inicializarCanvasFirma() {
    const canvas = document.getElementById('canvasFirmaCierre');
    if (!canvas) return;

    firmaCierreCtx = canvas.getContext('2d');
    firmaCierreCtx.strokeStyle = '#1a1a2e';
    firmaCierreCtx.lineWidth = 2;
    firmaCierreCtx.lineCap = 'round';
    firmaCierreCtx.fillStyle = '#fff';
    firmaCierreCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Eventos de mouse
    canvas.addEventListener('mousedown', iniciarFirmaCierre);
    canvas.addEventListener('mousemove', dibujarFirmaCierre);
    canvas.addEventListener('mouseup', terminarFirmaCierre);
    canvas.addEventListener('mouseout', terminarFirmaCierre);

    // Eventos táctiles
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        iniciarFirmaCierre({ offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
    });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        dibujarFirmaCierre({ offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top });
    });
    canvas.addEventListener('touchend', terminarFirmaCierre);
}

function iniciarFirmaCierre(e) {
    firmandoCierre = true;
    firmaCierreCtx.beginPath();
    firmaCierreCtx.moveTo(e.offsetX, e.offsetY);
}

function dibujarFirmaCierre(e) {
    if (!firmandoCierre) return;
    firmaCierreCtx.lineTo(e.offsetX, e.offsetY);
    firmaCierreCtx.stroke();
}

function terminarFirmaCierre() {
    firmandoCierre = false;
    verificarChecksCierre();
}

function limpiarFirmaCierre() {
    const canvas = document.getElementById('canvasFirmaCierre');
    if (canvas && firmaCierreCtx) {
        firmaCierreCtx.fillStyle = '#fff';
        firmaCierreCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    verificarChecksCierre();
}

/**
 * Verifica si se puede habilitar el botón de cierre
 */
function verificarChecksCierre() {
    const check1 = document.getElementById('checkTodoEnOrden')?.checked;
    const check2 = document.getElementById('checkCantidadesCorrectas')?.checked;
    const check3 = document.getElementById('checkListoEntrega')?.checked;
    const tieneFirma = verificarFirmaNoVacia();

    const btnConfirmar = document.getElementById('btnConfirmarCierre');
    if (btnConfirmar) {
        btnConfirmar.disabled = !(check1 && check2 && check3 && tieneFirma);
    }
}

function verificarFirmaNoVacia() {
    const canvas = document.getElementById('canvasFirmaCierre');
    if (!canvas) return false;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Verificar si hay píxeles que no sean blancos
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) {
            return true;
        }
    }
    return false;
}

/**
 * Cancela el cierre del pedido
 */
function cancelarCierrePedido() {
    const modal = document.getElementById('modalCierrePedido');
    if (modal) modal.remove();
}

/**
 * Abre el modal de cierre de pedido manualmente (sin notificación)
 */
function abrirCierrePedidoManual(pedidoId) {
    // Obtener información del pedido
    const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
    const pedido = pedidosActivos.find(p => p.id == pedidoId);

    if (!pedido) {
        showToast('No se encontró el pedido', 'error');
        return;
    }

    // Obtener cliente
    const cliente = typeof db !== 'undefined' ? db.getCliente(pedido.clienteId) : null;
    const clienteNombre = cliente?.nombreComercial || pedido.clienteNombre || pedido.cliente || 'N/A';

    // Obtener producto
    const prod = pedido.productos?.[0];
    const productoNombre = prod?.nombre || prod?.producto || pedido.producto || 'N/A';
    const cantidad = prod?.cantidad || pedido.cantidad || 0;

    // Crear notificación simulada para usar la función existente
    const notifSimulada = {
        pedidoId: pedidoId,
        cliente: clienteNombre,
        producto: productoNombre,
        piezas: cantidad,
        nombresEquipo: 'Manual',
        tiempoTotal: '-'
    };

    mostrarModalCierrePedido(notifSimulada);
}

// ========================================
// AJUSTE DE CANTIDADES
// ========================================

/**
 * Muestra el modal para ajustar la cantidad de piezas de un proceso
 */
function mostrarModalAjusteCantidad(procesoId, pedidoId, piezasActuales, cantidadTotal, procesoNombre) {
    const modalHTML = `
        <div class="modal-overlay-ajuste" id="modalAjusteCantidad">
            <div class="modal-ajuste">
                <div class="modal-ajuste-header">
                    <h3><i class="fas fa-edit"></i> Ajustar Cantidad</h3>
                    <button class="btn-cerrar-ajuste" onclick="cerrarModalAjuste()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-ajuste-body">
                    <div class="ajuste-info">
                        <p><strong>Proceso:</strong> ${procesoNombre}</p>
                        <p><strong>Pedido:</strong> #${pedidoId}</p>
                    </div>

                    <div class="ajuste-actual">
                        <span class="label">Cantidad actual:</span>
                        <span class="valor">${piezasActuales} / ${cantidadTotal} piezas</span>
                    </div>

                    <div class="ajuste-input-group">
                        <label for="nuevaCantidad"><i class="fas fa-cubes"></i> Nueva cantidad de piezas:</label>
                        <input type="number" id="nuevaCantidad" value="${piezasActuales}" min="0" max="${cantidadTotal * 2}" step="1">
                    </div>

                    <div class="ajuste-motivo-group">
                        <label for="motivoAjuste"><i class="fas fa-comment-alt"></i> Motivo del ajuste:</label>
                        <select id="motivoAjuste">
                            <option value="">-- Seleccionar motivo --</option>
                            <option value="error_captura">Error en captura</option>
                            <option value="piezas_defectuosas">Piezas defectuosas/rechazadas</option>
                            <option value="reconteo">Reconteo físico</option>
                            <option value="ajuste_inventario">Ajuste de inventario</option>
                            <option value="correccion_sistema">Corrección del sistema</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div class="ajuste-observaciones-group">
                        <label for="observacionesAjuste"><i class="fas fa-sticky-note"></i> Observaciones (opcional):</label>
                        <textarea id="observacionesAjuste" rows="2" placeholder="Detalles adicionales del ajuste..."></textarea>
                    </div>

                    <div class="ajuste-preview">
                        <span class="label">Resultado:</span>
                        <span class="valor" id="previewAjuste">${piezasActuales} → ${piezasActuales} piezas (sin cambio)</span>
                    </div>
                </div>
                <div class="modal-ajuste-footer">
                    <button class="btn-cancelar-ajuste" onclick="cerrarModalAjuste()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button class="btn-confirmar-ajuste" onclick="confirmarAjusteCantidad(${procesoId}, ${pedidoId}, ${piezasActuales})">
                        <i class="fas fa-check"></i> Guardar Ajuste
                    </button>
                </div>
            </div>
        </div>
    `;

    // Eliminar modal anterior si existe
    const modalAnterior = document.getElementById('modalAjusteCantidad');
    if (modalAnterior) modalAnterior.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Agregar evento para actualizar preview
    const inputCantidad = document.getElementById('nuevaCantidad');
    inputCantidad.addEventListener('input', () => {
        const nuevaCantidad = parseInt(inputCantidad.value) || 0;
        const diferencia = nuevaCantidad - piezasActuales;
        let texto = `${piezasActuales} → ${nuevaCantidad} piezas`;
        if (diferencia > 0) {
            texto += ` (+${diferencia})`;
        } else if (diferencia < 0) {
            texto += ` (${diferencia})`;
        } else {
            texto += ' (sin cambio)';
        }
        document.getElementById('previewAjuste').textContent = texto;
    });

    inputCantidad.focus();
    inputCantidad.select();
}

/**
 * Cierra el modal de ajuste
 */
function cerrarModalAjuste() {
    const modal = document.getElementById('modalAjusteCantidad');
    if (modal) modal.remove();
}

/**
 * Confirma y guarda el ajuste de cantidad
 */
function confirmarAjusteCantidad(procesoId, pedidoId, piezasAnteriores) {
    const nuevaCantidad = parseInt(document.getElementById('nuevaCantidad').value) || 0;
    const motivo = document.getElementById('motivoAjuste').value;
    const observaciones = document.getElementById('observacionesAjuste').value;

    if (!motivo) {
        showToast('Debe seleccionar un motivo para el ajuste', 'warning');
        return;
    }

    if (nuevaCantidad === piezasAnteriores) {
        showToast('La cantidad no ha cambiado', 'info');
        cerrarModalAjuste();
        return;
    }

    // Buscar y actualizar el proceso en pedidos_activos
    const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
    const pedido = pedidosActivos.find(p => p.id == pedidoId);

    if (pedido && pedido.procesos) {
        const proceso = pedido.procesos.find(p => p.id == procesoId);
        if (proceso) {
            proceso.piezas = nuevaCantidad;
            proceso.ultimoAjuste = {
                fecha: new Date().toISOString(),
                piezasAnteriores: piezasAnteriores,
                piezasNuevas: nuevaCantidad,
                motivo: motivo,
                observaciones: observaciones,
                usuario: supervisoraState?.nombre || 'Supervisora'
            };
            localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
        }
    }

    // Actualizar también en pedidos_erp
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const pedidoERP = pedidosERP.find(p => p.id == pedidoId);
    if (pedidoERP && pedidoERP.procesos) {
        const procesoERP = pedidoERP.procesos.find(p => p.id == procesoId);
        if (procesoERP) {
            procesoERP.piezas = nuevaCantidad;
            localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
        }
    }

    // Registrar en historial de ajustes
    const historialAjustes = JSON.parse(localStorage.getItem('historial_ajustes_cantidad') || '[]');
    historialAjustes.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        pedidoId: pedidoId,
        procesoId: procesoId,
        piezasAnteriores: piezasAnteriores,
        piezasNuevas: nuevaCantidad,
        diferencia: nuevaCantidad - piezasAnteriores,
        motivo: motivo,
        observaciones: observaciones,
        usuario: supervisoraState?.nombre || 'Supervisora'
    });
    localStorage.setItem('historial_ajustes_cantidad', JSON.stringify(historialAjustes.slice(0, 500)));

    // Cerrar modal y actualizar UI
    cerrarModalAjuste();
    closeModal(); // Cerrar modal de detalle del proceso

    // Refrescar vista
    if (typeof cargarPedidosDelDia === 'function') cargarPedidosDelDia();
    if (typeof renderizarPedidosHoy === 'function') renderizarPedidosHoy();
    // Refrescar mapa de planta para actualizar barras de avance
    if (supervisoraState && supervisoraState.layout) {
        renderLayoutInSupervisora(supervisoraState.layout);
    }

    const diferencia = nuevaCantidad - piezasAnteriores;
    const signo = diferencia > 0 ? '+' : '';
    showToast(`Cantidad ajustada: ${piezasAnteriores} → ${nuevaCantidad} (${signo}${diferencia})`, 'success');
}

/**
 * Muestra un mini-modal para ajustar cantidad directamente desde el cierre de pedido
 */
function ajustarCantidadEnCierre(tipo, index, cantidadActual, nombre, pedidoId) {
    const modalAjusteHTML = `
        <div class="modal-overlay-ajuste-cierre" id="modalAjusteCierrePedido">
            <div class="modal-ajuste-cierre">
                <div class="modal-ajuste-cierre-header">
                    <h4><i class="fas fa-edit"></i> Ajustar ${tipo === 'producto' ? 'Producto' : 'Proceso'}</h4>
                    <button class="btn-cerrar-ajuste-cierre" onclick="cerrarAjusteCierre()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-ajuste-cierre-body">
                    <p class="ajuste-cierre-nombre"><strong>${nombre}</strong></p>
                    <div class="ajuste-cierre-input">
                        <label>Cantidad:</label>
                        <input type="number" id="inputAjusteCierre" value="${cantidadActual}" min="0" step="1">
                    </div>
                    <div class="ajuste-cierre-motivo">
                        <label>Motivo:</label>
                        <select id="motivoAjusteCierre">
                            <option value="error_conteo">Error de conteo</option>
                            <option value="reconteo">Reconteo físico</option>
                            <option value="piezas_defectuosas">Piezas defectuosas</option>
                            <option value="ajuste_final">Ajuste final</option>
                        </select>
                    </div>
                </div>
                <div class="modal-ajuste-cierre-footer">
                    <button class="btn-cancelar-ajuste-cierre" onclick="cerrarAjusteCierre()">Cancelar</button>
                    <button class="btn-guardar-ajuste-cierre" onclick="guardarAjusteCierre('${tipo}', ${index}, ${cantidadActual}, ${pedidoId || 'null'})">
                        <i class="fas fa-check"></i> Guardar
                    </button>
                </div>
            </div>
        </div>
    `;

    // Eliminar modal anterior si existe
    const modalAnterior = document.getElementById('modalAjusteCierrePedido');
    if (modalAnterior) modalAnterior.remove();

    document.body.insertAdjacentHTML('beforeend', modalAjusteHTML);

    // Enfocar input
    setTimeout(() => document.getElementById('inputAjusteCierre')?.focus(), 100);
}

function cerrarAjusteCierre() {
    const modal = document.getElementById('modalAjusteCierrePedido');
    if (modal) modal.remove();
}

function guardarAjusteCierre(tipo, index, cantidadAnterior, pedidoId) {
    const nuevaCantidad = parseInt(document.getElementById('inputAjusteCierre').value) || 0;
    const motivo = document.getElementById('motivoAjusteCierre').value;

    if (nuevaCantidad === cantidadAnterior) {
        cerrarAjusteCierre();
        return;
    }

    // Actualizar en la tabla del modal de cierre
    if (tipo === 'producto') {
        const fila = document.querySelector(`[data-producto-index="${index}"]`);
        if (fila) {
            const celdaCantidad = fila.querySelector('.cantidad-celda');
            const celdaCajas = fila.querySelector('.cajas-celda');
            if (celdaCantidad) {
                celdaCantidad.textContent = `${nuevaCantidad} pzas`;
                celdaCantidad.dataset.cantidad = nuevaCantidad;
                celdaCantidad.classList.add('ajustado');
            }
            // Recalcular cajas (asumiendo piezas por caja de la fila)
            const pzasCajaText = fila.children[2]?.textContent || '1';
            const pzasCaja = parseInt(pzasCajaText) || 1;
            if (celdaCajas) {
                celdaCajas.textContent = Math.ceil(nuevaCantidad / pzasCaja);
            }
        }

        // Actualizar en localStorage
        if (pedidoId) {
            const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
            const pedido = pedidosActivos.find(p => p.id == pedidoId);
            if (pedido && pedido.productos && pedido.productos[index]) {
                pedido.productos[index].cantidad = nuevaCantidad;
                pedido.productos[index].ajusteEnCierre = {
                    cantidadAnterior,
                    motivo,
                    fecha: new Date().toISOString()
                };
                localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
            }
        }
    } else if (tipo === 'proceso') {
        const fila = document.querySelector(`[data-proceso-index="${index}"]`);
        if (fila) {
            const celdaPiezas = fila.querySelector('.piezas-celda');
            if (celdaPiezas) {
                celdaPiezas.textContent = nuevaCantidad;
                celdaPiezas.dataset.piezas = nuevaCantidad;
                celdaPiezas.classList.add('ajustado');
            }
        }

        // Actualizar historial de asignaciones completadas
        const historial = JSON.parse(localStorage.getItem('historial_asignaciones_completadas') || '[]');
        if (historial[index]) {
            historial[index].piezasProducidas = nuevaCantidad;
            historial[index].ajusteEnCierre = {
                cantidadAnterior,
                motivo,
                fecha: new Date().toISOString()
            };
            localStorage.setItem('historial_asignaciones_completadas', JSON.stringify(historial));
        }
    }

    // Registrar en historial de ajustes
    const historialAjustes = JSON.parse(localStorage.getItem('historial_ajustes_cantidad') || '[]');
    historialAjustes.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        tipo: tipo,
        index: index,
        pedidoId: pedidoId,
        cantidadAnterior: cantidadAnterior,
        cantidadNueva: nuevaCantidad,
        diferencia: nuevaCantidad - cantidadAnterior,
        motivo: motivo,
        contexto: 'cierre_pedido',
        usuario: supervisoraState?.nombre || 'Supervisora'
    });
    localStorage.setItem('historial_ajustes_cantidad', JSON.stringify(historialAjustes.slice(0, 500)));

    cerrarAjusteCierre();
    // Refrescar mapa de planta para actualizar barras de avance
    if (supervisoraState && supervisoraState.layout) {
        renderLayoutInSupervisora(supervisoraState.layout);
    }
    showToast(`Cantidad ajustada: ${cantidadAnterior} → ${nuevaCantidad}`, 'success');
}

/**
 * Confirma y ejecuta el cierre del pedido
 */
function confirmarCierrePedido(pedidoId) {
    const observaciones = document.getElementById('observacionesCierre')?.value || '';
    const canvas = document.getElementById('canvasFirmaCierre');
    const firmaBase64 = canvas ? canvas.toDataURL('image/png') : null;

    // Obtener datos del pedido
    const pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');
    const pedidoIndex = pedidosActivos.findIndex(p => p.id == pedidoId || p.pedidoId == pedidoId);
    const pedido = pedidoIndex >= 0 ? pedidosActivos[pedidoIndex] : null;

    // Crear registro de cierre
    const registroCierre = {
        id: Date.now(),
        pedidoId: pedidoId,
        cliente: pedido?.cliente || '',
        producto: pedido?.producto || '',
        cantidad: pedido?.cantidad || 0,
        fechaCierre: new Date().toISOString(),
        cerradoPor: supervisoraState?.nombre || 'Supervisora',
        firma: firmaBase64,
        observaciones: observaciones,
        estado: 'cerrado'
    };

    // Guardar en historial de pedidos cerrados
    const pedidosCerrados = JSON.parse(localStorage.getItem('pedidos_cerrados') || '[]');
    pedidosCerrados.unshift(registroCierre);
    localStorage.setItem('pedidos_cerrados', JSON.stringify(pedidosCerrados));

    // Remover de pedidos activos
    if (pedidoIndex >= 0) {
        pedidosActivos.splice(pedidoIndex, 1);
        localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));
    }

    // Actualizar pedidos_erp
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const pedidoERP = pedidosERP.find(p => p.id == pedidoId);
    if (pedidoERP) {
        pedidoERP.estado = 'cerrado';
        pedidoERP.fechaCierre = new Date().toISOString();
        localStorage.setItem('pedidos_erp', JSON.stringify(pedidosERP));
    }

    // Actualizar pedidosHoy en supervisoraState
    if (supervisoraState && supervisoraState.pedidosHoy) {
        const idx = supervisoraState.pedidosHoy.findIndex(p => p.id == pedidoId);
        if (idx >= 0) {
            supervisoraState.pedidosHoy.splice(idx, 1);
        }
    }

    // Notificar a administración (key local)
    const notificacionesAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
    const notifData = {
        id: Date.now(),
        tipo: 'pedido_completado',
        titulo: 'Pedido Completado y Listo para Entrega',
        mensaje: `Pedido #${pedidoId} cerrado por ${supervisoraState?.nombre || 'Supervisora'} - Listo para entrega`,
        pedidoId: pedidoId,
        cliente: pedido?.cliente || pedido?.clienteNombre || '',
        fecha: new Date().toISOString(),
        leida: false
    };
    notificacionesAdmin.unshift(notifData);
    localStorage.setItem('notificaciones_admin', JSON.stringify(notificacionesAdmin.slice(0, 200)));

    // También agregar a notificaciones_coco (sincronizada via realtime-sync)
    const notificacionesCoco = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
    notificacionesCoco.unshift(notifData);
    localStorage.setItem('notificaciones_coco', JSON.stringify(notificacionesCoco.slice(0, 200)));

    // Cerrar modal
    const modal = document.getElementById('modalCierrePedido');
    if (modal) modal.remove();

    // Actualizar UI
    if (typeof cargarPedidosDelDia === 'function') cargarPedidosDelDia();
    if (typeof renderizarPedidosHoy === 'function') renderizarPedidosHoy();

    // Mostrar confirmación
    if (typeof mostrarToast === 'function') {
        mostrarToast(`Pedido #${pedidoId} cerrado exitosamente`, 'success');
    } else {
        alert(`Pedido #${pedidoId} cerrado exitosamente`);
    }

    if (typeof reproducirSonido === 'function') reproducirSonido('exito');
}

// ========================================
// LECTURA DE PRODUCCIÓN DE OPERADORAS
// ========================================

/**
 * Obtiene la producción del día desde historial_produccion
 */
function obtenerProduccionOperadorasHoy() {
    const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const hoy = new Date().toISOString().split('T')[0];

    return historial.filter(h => h.fecha && h.fecha.startsWith(hoy));
}

/**
 * Calcula estadísticas de producción del día
 */
function calcularEstadisticasProduccionHoy() {
    const produccion = obtenerProduccionOperadorasHoy();

    // Total de piezas
    const totalPiezas = produccion.reduce((sum, p) => sum + (p.cantidad || 0), 0);

    // Por operadora
    const porOperadora = {};
    produccion.forEach(p => {
        const id = p.operadoraId || 'desconocido';
        if (!porOperadora[id]) {
            porOperadora[id] = {
                id: id,
                nombre: p.operadoraNombre || 'Operadora',
                estacion: p.estacionId,
                piezas: 0,
                capturas: 0
            };
        }
        porOperadora[id].piezas += p.cantidad || 0;
        porOperadora[id].capturas++;
    });

    // Por estación
    const porEstacion = {};
    produccion.forEach(p => {
        const id = p.estacionId || 'desconocida';
        if (!porEstacion[id]) {
            porEstacion[id] = { id: id, piezas: 0 };
        }
        porEstacion[id].piezas += p.cantidad || 0;
    });

    return {
        totalPiezas,
        totalCapturas: produccion.length,
        porOperadora: Object.values(porOperadora),
        porEstacion: Object.values(porEstacion)
    };
}

// Iniciar verificación periódica de notificaciones (cada 15 segundos)
setInterval(verificarNotificacionesDeOperadoras, 15000);

// Verificar inmediatamente al cargar
setTimeout(verificarNotificacionesDeOperadoras, 2000);

// ========================================
// NOTIFICACIONES DE DIRECCIÓN (Admin → Supervisora)
// ========================================
function verificarNotificacionesDeDireccion() {
    var notificaciones;
    try { notificaciones = JSON.parse(localStorage.getItem('notificaciones_admin_to_supervisora') || '[]'); }
    catch(e) { return; }

    var noLeidas = notificaciones.filter(function(n) { return !n.leida; });
    if (noLeidas.length === 0) return;

    var huboCambios = false;
    noLeidas.forEach(function(notif) {
        // Determinar tipo de notificación para supervisora
        var tipoNotif = 'info';
        if (notif.prioridad === 'critica' || notif.prioridad === 'alta') tipoNotif = 'danger';
        else if (notif.prioridad === 'media') tipoNotif = 'warning';

        var tituloPrefix = '';
        if (notif.tipo === 'cambio_prioridad') tituloPrefix = '🚩 ';
        else if (notif.tipo === 'solicitud_reporte') tituloPrefix = '📋 ';
        else tituloPrefix = '📩 ';

        if (typeof agregarNotificacion === 'function') {
            agregarNotificacion({
                titulo: tituloPrefix + (notif.titulo || 'Mensaje de Dirección'),
                mensaje: notif.mensaje || '',
                tipo: tipoNotif,
                accion: notif.pedidoId ? 'verPedido(' + notif.pedidoId + ')' : null
            });
        }

        notif.leida = true;
        huboCambios = true;
    });

    if (huboCambios) {
        localStorage.setItem('notificaciones_admin_to_supervisora', JSON.stringify(notificaciones));
    }
}

// Verificar notificaciones de dirección cada 15 segundos
setInterval(verificarNotificacionesDeDireccion, 15000);
setTimeout(verificarNotificacionesDeDireccion, 3000);

// ========================================
// POLLING DE PRODUCCIÓN Y ESTADO
// ========================================

/**
 * Actualiza datos provenientes de operadoras
 */
function actualizarDatosDeOperadoras() {
    // 0. Sincronizar operadores asignados desde Admin
    sincronizarOperadoresDesdeAdmin();

    // 1. Leer producción del día
    const produccion = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const hoy = new Date().toISOString().split('T')[0];
    const produccionHoy = produccion.filter(p => p.fecha?.startsWith(hoy));

    // Calcular piezas por estación
    const piezasPorEstacion = {};
    produccionHoy.forEach(p => {
        if (p.estacionId) {
            piezasPorEstacion[p.estacionId] = (piezasPorEstacion[p.estacionId] || 0) + (p.cantidad || 0);
        }
    });

    // Actualizar estado de máquinas con piezas
    Object.entries(piezasPorEstacion).forEach(([estacionId, piezas]) => {
        if (supervisoraState.maquinas[estacionId]) {
            supervisoraState.maquinas[estacionId].piezasHoy = piezas;
        }
    });

    // 2. Leer estado de máquinas actualizado por operadoras
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    Object.entries(estadoMaquinas).forEach(([estacionId, estado]) => {
        if (supervisoraState.maquinas[estacionId]) {
            // IMPORTANTE: Si el operador terminó su proceso (estado = disponible, procesoActivo = false)
            // limpiar la estación completamente
            if (estado.estado === 'disponible' && estado.procesoActivo === false) {
                const teniaProcesoAntes = supervisoraState.maquinas[estacionId].procesoId !== null;

                // Limpiar la estación
                supervisoraState.maquinas[estacionId].procesoId = null;
                supervisoraState.maquinas[estacionId].procesoNombre = '';
                supervisoraState.maquinas[estacionId].pedidoId = null;
                supervisoraState.maquinas[estacionId].estado = 'inactivo';
                supervisoraState.maquinas[estacionId].operadores = [];
                supervisoraState.maquinas[estacionId].piezasHoy = 0;

                if (teniaProcesoAntes) {
                    DEBUG_MODE && console.log('[SUPERVISORA] Estación', estacionId, 'limpiada - operador terminó proceso');
                }
            } else {
                // Comportamiento normal para estaciones activas
                if (estado.piezasHoy !== undefined) {
                    supervisoraState.maquinas[estacionId].piezasHoy = estado.piezasHoy;
                }
                if (estado.estado === 'trabajando') {
                    supervisoraState.maquinas[estacionId].estado = 'activo';
                }
                // Sincronizar operador desde estado_maquinas
                if (estado.operadorNombre && estado.operadorId) {
                    if (!supervisoraState.maquinas[estacionId].operadores) {
                        supervisoraState.maquinas[estacionId].operadores = [];
                    }
                    const yaExiste = supervisoraState.maquinas[estacionId].operadores.some(
                        op => op.id === estado.operadorId
                    );
                    if (!yaExiste) {
                        supervisoraState.maquinas[estacionId].operadores.push({
                            id: estado.operadorId,
                            nombre: estado.operadorNombre,
                            iniciales: estado.iniciales || estado.operadorNombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                        });
                    }
                }
                // También manejar el formato antiguo
                if (estado.operadoraNombre && estado.operadoraId) {
                    if (!supervisoraState.maquinas[estacionId].operadores) {
                        supervisoraState.maquinas[estacionId].operadores = [];
                    }
                    const yaExiste = supervisoraState.maquinas[estacionId].operadores.some(
                        op => op.id === estado.operadoraId
                    );
                    if (!yaExiste) {
                        supervisoraState.maquinas[estacionId].operadores.push({
                            id: estado.operadoraId,
                            nombre: estado.operadoraNombre
                        });
                    }
                }
            }
        }
    });

    // 3. Verificar procesos completados
    verificarProcesosCompletados();

    // 3.5 Actualizar dependencias después de verificar completados
    actualizarDependenciasProcesos();

    // 4. Actualizar UI
    updateStats();

    // Solo re-renderizar si no hay modal abierto
    const modalVisible = document.getElementById('modalOverlay')?.style.display === 'flex';
    if (!modalVisible) {
        // Actualizar lista de pedidos (menú lateral)
        renderPedidosList();

        // Actualizar mapa de planta
        if (supervisoraState.layout) {
            renderLayoutInSupervisora(supervisoraState.layout);
        }
    }
}

/**
 * Verifica si hay procesos completados por operadoras
 * Lee de múltiples fuentes: asignaciones_estaciones, historial_asignaciones_completadas, pedidos_erp
 */
function verificarProcesosCompletados() {
    let huboCompletados = false;
    let asignacionesModificadas = false;

    // 1. Verificar asignaciones activas con estado completado
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const asignacionesAEliminar = [];

    Object.entries(asignaciones).forEach(([estacionId, asignacion]) => {
        if (asignacion.estado === 'completado') {
            const pedido = supervisoraState.pedidosHoy.find(p => p.id == asignacion.pedidoId);

            if (pedido && pedido.procesos) {
                const proceso = pedido.procesos.find(p => p.id == asignacion.procesoId);

                if (proceso && proceso.estado !== 'completado') {
                    proceso.estado = 'completado';
                    proceso.piezas = asignacion.piezasProducidas || proceso.piezas || 0;
                    proceso.fechaCompletado = asignacion.fechaFin;
                    DEBUG_MODE && console.log('[SUPERVISORA] Proceso marcado como completado:', proceso.nombre);
                    huboCompletados = true;
                }
            }

            // Limpiar la máquina completamente
            if (supervisoraState.maquinas[estacionId]) {
                supervisoraState.maquinas[estacionId].procesoId = null;
                supervisoraState.maquinas[estacionId].procesoNombre = '';
                supervisoraState.maquinas[estacionId].pedidoId = null;
                supervisoraState.maquinas[estacionId].estado = 'inactivo';
                supervisoraState.maquinas[estacionId].operadores = [];
                supervisoraState.maquinas[estacionId].piezasHoy = 0;
                DEBUG_MODE && console.log('[SUPERVISORA] Estación', estacionId, 'limpiada tras proceso completado');
            }

            // Marcar para eliminar la asignación
            asignacionesAEliminar.push(estacionId);
            asignacionesModificadas = true;
        }
    });

    // Eliminar asignaciones completadas del localStorage
    asignacionesAEliminar.forEach(estacionId => {
        delete asignaciones[estacionId];
    });

    if (asignacionesModificadas) {
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
        DEBUG_MODE && console.log('[SUPERVISORA] Asignaciones eliminadas:', asignacionesAEliminar);
    }

    // 2. Verificar historial de asignaciones completadas (nuevas)
    const historialCompletadas = JSON.parse(localStorage.getItem('historial_asignaciones_completadas') || '[]');
    let historialModificado = false;

    historialCompletadas.forEach(asignacion => {
        if (!asignacion.marcadoComoCompletado) {
            const pedido = supervisoraState.pedidosHoy.find(p => p.id == asignacion.pedidoId);

            if (pedido && pedido.procesos) {
                const proceso = pedido.procesos.find(p => p.id == asignacion.procesoId);

                if (proceso && proceso.estado !== 'completado') {
                    proceso.estado = 'completado';
                    proceso.piezas = asignacion.piezasProducidas || proceso.piezas || 0;
                    proceso.fechaCompletado = asignacion.fechaFin;
                    proceso.operadoraId = asignacion.operadoraId;
                    proceso.operadoraNombre = asignacion.operadoraNombre;
                    proceso.estacionId = asignacion.estacionId;
                    DEBUG_MODE && console.log('[SUPERVISORA] Proceso completado desde historial:', proceso.nombre, 'piezas:', proceso.piezas);
                    huboCompletados = true;
                }
            }

            // Limpiar la estación asociada al proceso completado
            const estacionId = asignacion.estacionId;
            if (estacionId && supervisoraState.maquinas[estacionId]) {
                // Solo limpiar si el procesoId coincide o no hay proceso activo
                const maquina = supervisoraState.maquinas[estacionId];
                if (!maquina.procesoId || maquina.procesoId == asignacion.procesoId) {
                    supervisoraState.maquinas[estacionId].procesoId = null;
                    supervisoraState.maquinas[estacionId].procesoNombre = '';
                    supervisoraState.maquinas[estacionId].pedidoId = null;
                    supervisoraState.maquinas[estacionId].estado = 'inactivo';
                    supervisoraState.maquinas[estacionId].operadores = [];
                    supervisoraState.maquinas[estacionId].piezasHoy = 0;
                    DEBUG_MODE && console.log('[SUPERVISORA] Estación', estacionId, 'limpiada desde historial completado');
                }
            }

            asignacion.marcadoComoCompletado = true;
            historialModificado = true;
        }
    });

    if (historialModificado) {
        localStorage.setItem('historial_asignaciones_completadas', JSON.stringify(historialCompletadas));
    }

    // 3. Sincronizar estado de procesos desde pedidos_erp (fuente de verdad del operador)
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    pedidosERP.forEach(pedidoERP => {
        const pedido = supervisoraState.pedidosHoy.find(p => p.id == pedidoERP.id);
        if (pedido && pedido.procesos && pedidoERP.procesos) {
            pedidoERP.procesos.forEach(procesoERP => {
                // Buscar proceso por múltiples criterios ya que los IDs pueden no coincidir exactamente
                let proceso = pedido.procesos.find(p => p.id == procesoERP.id);

                // Si no se encontró por ID exacto, buscar por nombre y orden
                if (!proceso && procesoERP.nombre) {
                    proceso = pedido.procesos.find(p =>
                        (p.nombre || '').toLowerCase() === (procesoERP.nombre || '').toLowerCase() &&
                        (p.orden === procesoERP.orden || !procesoERP.orden)
                    );
                }

                // Si aún no se encontró, buscar solo por nombre
                if (!proceso && procesoERP.nombre) {
                    proceso = pedido.procesos.find(p =>
                        (p.nombre || '').toLowerCase() === (procesoERP.nombre || '').toLowerCase()
                    );
                }

                // También buscar por ID que contenga el procesoId (formato "pedidoId-prodId-procIdx")
                if (!proceso && procesoERP.id) {
                    const procesoIdStr = String(procesoERP.id);
                    proceso = pedido.procesos.find(p => {
                        const pIdStr = String(p.id);
                        return pIdStr.includes(procesoIdStr) || procesoIdStr.includes(pIdStr);
                    });
                }

                if (proceso) {
                    const piezasAntes = proceso.piezas || 0;
                    const piezasERP = procesoERP.piezas || 0;

                    // Actualizar estado si ERP tiene más avance
                    if (procesoERP.estado === 'completado' && proceso.estado !== 'completado') {
                        proceso.estado = 'completado';
                        proceso.piezas = piezasERP;
                        proceso.fechaCompletado = procesoERP.fechaCompletado;
                        proceso.operadoraId = procesoERP.operadoraId;
                        proceso.operadoraNombre = procesoERP.operadoraNombre;
                        proceso.estacionId = procesoERP.estacionId;
                        DEBUG_MODE && console.log('[SUPERVISORA] Proceso completado desde pedidos_erp:', proceso.nombre);
                        huboCompletados = true;

                        // Limpiar la estación asociada
                        const estacionId = procesoERP.estacionId;
                        if (estacionId && supervisoraState.maquinas[estacionId]) {
                            supervisoraState.maquinas[estacionId].procesoId = null;
                            supervisoraState.maquinas[estacionId].procesoNombre = '';
                            supervisoraState.maquinas[estacionId].pedidoId = null;
                            supervisoraState.maquinas[estacionId].estado = 'inactivo';
                            supervisoraState.maquinas[estacionId].operadores = [];
                            supervisoraState.maquinas[estacionId].piezasHoy = 0;
                            DEBUG_MODE && console.log('[SUPERVISORA] Estación', estacionId, 'limpiada desde pedidos_erp');

                            // También eliminar de asignaciones_estaciones
                            const asignacionesActuales = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
                            if (asignacionesActuales[estacionId]) {
                                delete asignacionesActuales[estacionId];
                                localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignacionesActuales));
                            }
                        }
                    } else if (procesoERP.estado === 'en-proceso' && proceso.estado === 'pendiente') {
                        proceso.estado = 'en-proceso';
                        proceso.piezas = piezasERP;
                        proceso.operadoraId = procesoERP.operadoraId;
                        proceso.operadoraNombre = procesoERP.operadoraNombre;
                        huboCompletados = true;
                    } else if (piezasERP > piezasAntes) {
                        // Actualizar piezas si hay más en ERP
                        DEBUG_MODE && console.log('[SUPERVISORA] Sincronizando piezas desde pedidos_erp:',
                            proceso.nombre, 'de', piezasAntes, 'a', piezasERP);
                        proceso.piezas = piezasERP;
                        proceso.ultimaActualizacion = procesoERP.ultimaActualizacion;
                        huboCompletados = true;
                    }
                } else {
                    DEBUG_MODE && console.log('[SUPERVISORA] Proceso de pedidos_erp no encontrado en pedidosHoy:',
                        procesoERP.id, procesoERP.nombre, 'pedido:', pedidoERP.id);
                }
            });
        }
    });

    // 3.5 También leer del historial de producción del día como fuente adicional
    const historialProduccion = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const hoy = new Date().toISOString().split('T')[0];
    const produccionHoy = historialProduccion.filter(h => h.fecha?.startsWith(hoy));

    if (produccionHoy.length > 0) {
        // Agrupar por pedidoId y procesoNombre
        const piezasPorProceso = {};
        produccionHoy.forEach(h => {
            if (h.pedidoId && h.procesoNombre) {
                const key = `${h.pedidoId}-${h.procesoNombre.toLowerCase().trim()}`;
                piezasPorProceso[key] = (piezasPorProceso[key] || 0) + (h.cantidad || 0);
            }
        });

        // Actualizar procesos con las piezas del historial
        supervisoraState.pedidosHoy.forEach(pedido => {
            if (pedido.procesos) {
                pedido.procesos.forEach(proceso => {
                    const key = `${pedido.id}-${(proceso.nombre || '').toLowerCase().trim()}`;
                    const piezasHistorial = piezasPorProceso[key] || 0;

                    if (piezasHistorial > (proceso.piezas || 0)) {
                        DEBUG_MODE && console.log('[SUPERVISORA] Actualizando piezas desde historial_produccion:',
                            proceso.nombre, 'pedido:', pedido.id, 'de', proceso.piezas, 'a', piezasHistorial);
                        proceso.piezas = piezasHistorial;
                        huboCompletados = true;
                    }
                });
            }
        });
    }

    // 4. Actualizar dependencias - habilitar procesos que dependían del completado
    if (huboCompletados) {
        actualizarDependenciasProcesos();
        DEBUG_MODE && console.log('[SUPERVISORA] Hubo cambios en procesos, actualizando UI...');
    }

    // SIEMPRE re-renderizar para mostrar piezas actualizadas
    // (Solo evitar si hay modal abierto para no interrumpir al usuario)
    const modalVisible = document.getElementById('modalOverlay')?.style.display === 'flex';
    if (!modalVisible) {
        renderPedidosList();

        // Actualizar mapa de planta
        if (supervisoraState.layout) {
            renderLayoutInSupervisora(supervisoraState.layout);
        }
    }

    // Actualizar estadísticas siempre
    updateStats();

    // Guardar estado
    saveEstadoMaquinas();
}

/**
 * Actualiza el estado de procesos dependientes cuando un proceso se completa
 */
function actualizarDependenciasProcesos() {
    DEBUG_MODE && console.log('[SUPERVISORA] Actualizando dependencias de procesos...');

    supervisoraState.pedidosHoy.forEach(pedido => {
        if (!pedido.procesos || pedido.procesos.length === 0) return;

        // Obtener procesos completados de este pedido
        const procesosCompletados = pedido.procesos.filter(p =>
            p.estado === 'completado' || p.estado === 'terminado'
        );

        if (procesosCompletados.length === 0) return;

        DEBUG_MODE && console.log('[SUPERVISORA] Pedido', pedido.id, '- Procesos completados:',
            procesosCompletados.map(p => p.nombre));

        // Verificar cada proceso pendiente si sus dependencias están satisfechas
        pedido.procesos.forEach(proceso => {
            if (proceso.estado === 'completado' || proceso.estado === 'terminado') return;
            if (proceso.estado === 'en-proceso' || proceso.estado === 'en_proceso') return;

            // Si el proceso estaba bloqueado, verificar si ahora puede habilitarse
            const disponibilidad = verificarDependenciasProceso(proceso, pedido);

            if (disponibilidad.disponible && (proceso.estado === 'bloqueado' || proceso.estado === 'pendiente')) {
                // Verificar que realmente estaba bloqueado por dependencias antes
                const estabaBlockeado = proceso.estado === 'bloqueado';
                if (estabaBlockeado) {
                    proceso.estado = 'pendiente';
                    DEBUG_MODE && console.log('[SUPERVISORA] Proceso desbloqueado:', proceso.nombre);
                }
            }
        });
    });
}

// ========================================
// ASIGNACIÓN AUTOMÁTICA A CALIDAD/EMPAQUE
// ========================================

/**
 * Verifica si un ID de estación corresponde a Calidad o Empaque
 * @param {string} estacionId - ID de la estación
 * @returns {boolean}
 */
function esEstacionCalidadEmpaqueId(estacionId) {
    if (!estacionId) return false;
    const id = estacionId.toUpperCase().trim();
    // E1, E2, E3... (Empaque)
    // Q1, Q2... (Quality/Calidad)
    // CA1, CA2... (Calidad)
    // EM1, EM2... (Empaque)
    return /^E\d+$/i.test(id) ||
           /^Q\d+$/i.test(id) ||
           /^CA\d*$/i.test(id) ||
           /^EM\d*$/i.test(id) ||
           id.includes('EMPAQUE') ||
           id.includes('CALIDAD') ||
           id.includes('QUALITY');
}

/**
 * Verifica si un proceso es de costura/cerrado (últimas etapas antes de calidad)
 * @param {Object} proceso - Objeto del proceso
 * @returns {boolean}
 */
function esProcesoCoturaCerrado(proceso) {
    if (!proceso || !proceso.nombre) return false;
    const nombre = proceso.nombre.toLowerCase();
    return nombre.includes('costura') ||
           nombre.includes('cerrado') ||
           nombre.includes('armado') ||
           nombre.includes('ensamble');
}

/**
 * Verifica si hay pedidos en último proceso de costura y los asigna automáticamente
 * a las estaciones de calidad/empaque
 */
function verificarAsignacionAutomaticaCalidadEmpaque() {
    // Obtener estaciones de calidad/empaque del layout
    const estacionesCalidadEmpaque = [];

    if (supervisoraState.layout && supervisoraState.layout.elementos) {
        supervisoraState.layout.elementos.forEach(elem => {
            if (elem.tipo === 'estacion' && esEstacionCalidadEmpaqueId(elem.id)) {
                estacionesCalidadEmpaque.push(elem.id);
            }
        });
    }

    // También buscar en maquinas del state
    Object.keys(supervisoraState.maquinas).forEach(estacionId => {
        if (esEstacionCalidadEmpaqueId(estacionId) && !estacionesCalidadEmpaque.includes(estacionId)) {
            estacionesCalidadEmpaque.push(estacionId);
        }
    });

    if (estacionesCalidadEmpaque.length === 0) {
        return; // No hay estaciones de calidad/empaque
    }

    DEBUG_MODE && console.log('[SUPERVISORA] Estaciones Calidad/Empaque encontradas:', estacionesCalidadEmpaque);

    // Buscar pedidos que tienen el último proceso de costura en ejecución
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const asignacionesMulti = JSON.parse(localStorage.getItem('asignaciones_multi_pedido') || '{}');

    supervisoraState.pedidosHoy.forEach(pedido => {
        if (!pedido.procesos || pedido.procesos.length === 0) return;

        // Filtrar procesos de costura/cerrado
        const procesosCostura = pedido.procesos.filter(p => esProcesoCoturaCerrado(p));

        if (procesosCostura.length === 0) return;

        // Obtener el último proceso de costura
        const ultimoCostura = procesosCostura[procesosCostura.length - 1];

        // Verificar si está en proceso (activo)
        const estaEnProceso = ultimoCostura.estado === 'en-proceso' ||
                              ultimoCostura.estado === 'en_proceso' ||
                              ultimoCostura.estado === 'activo';

        if (!estaEnProceso) return;

        DEBUG_MODE && console.log('[SUPERVISORA] Pedido', pedido.id, '- Último proceso costura EN PROCESO:', ultimoCostura.nombre);

        // Verificar si ya está asignado a calidad/empaque
        let yaAsignado = false;

        // Verificar en asignaciones normales
        Object.entries(asignaciones).forEach(([estId, asig]) => {
            if (asig.pedidoId == pedido.id && esEstacionCalidadEmpaqueId(estId)) {
                yaAsignado = true;
            }
        });

        // Verificar en asignaciones multi-pedido
        Object.entries(asignacionesMulti).forEach(([estId, pedidosArray]) => {
            if (Array.isArray(pedidosArray)) {
                pedidosArray.forEach(asig => {
                    if (asig.pedidoId == pedido.id) {
                        yaAsignado = true;
                    }
                });
            }
        });

        if (yaAsignado) {
            DEBUG_MODE && console.log('[SUPERVISORA] Pedido', pedido.id, 'ya asignado a calidad/empaque');
            return;
        }

        // Crear asignación automática para calidad/empaque
        // Asignar a TODAS las estaciones de calidad/empaque disponibles
        const producto = pedido.productos && pedido.productos[0] ? pedido.productos[0] : {};

        estacionesCalidadEmpaque.forEach(estacionId => {
            // Inicializar array de asignaciones multi si no existe
            if (!asignacionesMulti[estacionId]) {
                asignacionesMulti[estacionId] = [];
            }

            // Verificar si ya tiene este pedido
            const yaExiste = asignacionesMulti[estacionId].some(a => a.pedidoId == pedido.id);
            if (yaExiste) return;

            const nuevaAsignacion = {
                id: `${pedido.id}-${Date.now()}`,
                pedidoId: pedido.id,
                codigo: pedido.codigo || pedido.id,
                cliente: pedido.cliente,
                producto: producto.nombre || pedido.nombre || 'Producto',
                imagen: producto.imagen || pedido.imagen || '',
                procesoNombre: estacionId.toUpperCase().startsWith('E') ? 'Empaque' : 'Calidad',
                piezasCapturadas: 0,
                piezasMeta: producto.cantidad || pedido.cantidad || ultimoCostura.meta || 100,
                procesoIniciado: false,
                procesoEnPausa: false,
                tiempoProcesoInicio: null,
                tiempoProcesoAcumulado: 0,
                prioridad: pedido.prioridad || 'media',
                fechaAsignacion: new Date().toISOString(),
                asignacionAutomatica: true,
                ultimoProcesoCostura: ultimoCostura.nombre
            };

            asignacionesMulti[estacionId].push(nuevaAsignacion);

            DEBUG_MODE && console.log('[SUPERVISORA] Asignación automática creada para', estacionId, '- Pedido:', pedido.codigo);
        });
    });

    // Guardar asignaciones multi-pedido
    localStorage.setItem('asignaciones_multi_pedido', JSON.stringify(asignacionesMulti));
}

// Ejecutar verificación de asignación automática cada 10 segundos
setInterval(verificarAsignacionAutomaticaCalidadEmpaque, 10000);

// Primera ejecución después de 3 segundos
setTimeout(verificarAsignacionAutomaticaCalidadEmpaque, 3000);

// Polling cada 5 segundos para datos de operadoras (más frecuente para ver piezas en tiempo real)
setInterval(actualizarDatosDeOperadoras, 5000);

// Primera ejecución después de 2 segundos
setTimeout(actualizarDatosDeOperadoras, 2000);

// ========================================
// SINCRONIZAR OPERADORES DESDE ADMIN
// ========================================

/**
 * Sincroniza los operadores asignados desde el panel de Admin
 * Lee el mapa de estaciones y estado_maquinas de localStorage
 */
function sincronizarOperadoresDesdeAdmin() {
    // Leer mapa de estaciones desde Admin
    const mapaEstaciones = JSON.parse(localStorage.getItem('mapa_estaciones_planta') || '{}');

    // Leer estado de máquinas
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');

    // Para cada estación en el mapa
    Object.entries(mapaEstaciones).forEach(([estacionId, estacion]) => {
        // Si la estación existe en el layout de supervisora
        if (supervisoraState.maquinas[estacionId]) {
            // Si tiene operador asignado
            if (estacion.operadorId && estacion.operadorNombre) {
                // Inicializar array de operadores si no existe
                if (!supervisoraState.maquinas[estacionId].operadores) {
                    supervisoraState.maquinas[estacionId].operadores = [];
                }

                // Verificar si ya existe el operador
                const yaExiste = supervisoraState.maquinas[estacionId].operadores.some(
                    op => op.id === estacion.operadorId
                );

                if (!yaExiste) {
                    supervisoraState.maquinas[estacionId].operadores.push({
                        id: estacion.operadorId,
                        nombre: estacion.operadorNombre,
                        iniciales: estacion.operadorIniciales || estacion.operadorNombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                    });
                    DEBUG_MODE && console.log(`[SYNC] Operador "${estacion.operadorNombre}" sincronizado en estación ${estacionId}`);
                }
            }
        } else {
            // La estación no existe en el layout, crear entrada en maquinas
            if (estacion.operadorId) {
                supervisoraState.maquinas[estacionId] = {
                    id: estacionId,
                    tipo: 'estacion',
                    nombre: estacion.nombre || estacionId,
                    operadores: [{
                        id: estacion.operadorId,
                        nombre: estacion.operadorNombre,
                        iniciales: estacion.operadorIniciales || ''
                    }],
                    procesoId: null,
                    procesoNombre: '',
                    pedidoId: null,
                    estado: 'inactivo',
                    piezasHoy: 0,
                    ultimaActividad: null
                };
            }
        }
    });

    // También sincronizar desde estado_maquinas (datos más recientes)
    Object.entries(estadoMaquinas).forEach(([estacionId, estado]) => {
        if (supervisoraState.maquinas[estacionId] && estado.operadorId) {
            if (!supervisoraState.maquinas[estacionId].operadores) {
                supervisoraState.maquinas[estacionId].operadores = [];
            }

            const yaExiste = supervisoraState.maquinas[estacionId].operadores.some(
                op => op.id === estado.operadorId
            );

            if (!yaExiste) {
                supervisoraState.maquinas[estacionId].operadores.push({
                    id: estado.operadorId,
                    nombre: estado.operadorNombre || 'Operador',
                    iniciales: estado.iniciales || ''
                });
            }
        }
    });
}

// ========================================
// MENSAJES A OPERADORAS
// ========================================

/**
 * Muestra modal para enviar mensaje a operadoras
 */
function mostrarModalEnviarMensaje(destinatarioId = 'todos') {
    const operadoras = JSON.parse(localStorage.getItem('operadoras_db') || '[]');

    const content = `
        <div class="enviar-mensaje-form">
            <div class="form-group">
                <label>Destinatario</label>
                <select id="mensajeDestinatario" class="form-control">
                    <option value="todos" ${destinatarioId === 'todos' ? 'selected' : ''}>
                        📢 Todas las operadoras
                    </option>
                    ${operadoras.map(op => `
                        <option value="${op.id}" ${destinatarioId == op.id ? 'selected' : ''}>
                            👤 ${op.nombre}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Mensaje</label>
                <textarea id="mensajeTexto" class="form-control" rows="4"
                          placeholder="Escribe tu mensaje..."></textarea>
            </div>
            <div class="mensajes-rapidos" style="margin-top: 12px;">
                <label style="font-size: 12px; color: #888;">Mensajes rápidos:</label>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='Por favor acelerar el ritmo de producción'">
                        ⚡ Acelerar
                    </button>
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='Descanso en 10 minutos'">
                        ☕ Descanso
                    </button>
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='Reunión breve al terminar el turno'">
                        📋 Reunión
                    </button>
                    <button type="button" class="btn btn-sm btn-outline"
                            onclick="document.getElementById('mensajeTexto').value='¡Excelente trabajo! Sigan así'">
                        👏 Felicitar
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal('Enviar Mensaje a Operadoras', content, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarEnvioMensaje()">
            <i class="fas fa-paper-plane"></i> Enviar
        </button>
    `);
}

function confirmarEnvioMensaje() {
    const destinatario = document.getElementById('mensajeDestinatario').value;
    const texto = document.getElementById('mensajeTexto').value.trim();

    if (!texto) {
        showToast('Por favor escribe un mensaje', 'warning');
        return;
    }

    // Guardar mensaje
    const mensajes = JSON.parse(localStorage.getItem('mensajes_operadoras') || '[]');
    mensajes.unshift({
        id: Date.now(),
        texto: texto,
        destinatarioId: destinatario,
        remitente: 'Coco',
        fecha: new Date().toISOString(),
        leido: false,
        leidoPor: []
    });
    localStorage.setItem('mensajes_operadoras', JSON.stringify(mensajes.slice(0, 100)));

    closeModal();
    showToast('Mensaje enviado a operadoras', 'success');
}

DEBUG_MODE && console.log('[SUPERVISORA] Funciones de integración con Operadora cargadas');

// ========================================
// INVENTARIO GENERAL DE PIEZAS - SUPERVISORA
// ========================================

function showInventarioGeneralSupervisora() {
    const productos = typeof db !== 'undefined' ? db.getProductos() : [];
    const todasLasPiezas = typeof db !== 'undefined' ? db.getInventarioPiezas() : [];

    // Agrupar piezas por producto
    const piezasPorProducto = {};
    todasLasPiezas.forEach(pieza => {
        if (!piezasPorProducto[pieza.productoId]) {
            piezasPorProducto[pieza.productoId] = [];
        }
        piezasPorProducto[pieza.productoId].push(pieza);
    });

    // Productos con piezas en inventario
    const productosConInventario = productos.filter(p => piezasPorProducto[p.id] && piezasPorProducto[p.id].length > 0);

    // Estadísticas generales
    const totalPiezasTipos = todasLasPiezas.length;
    const totalCantidad = todasLasPiezas.reduce((sum, p) => sum + (p.cantidadDisponible || 0), 0);
    const piezasBajas = todasLasPiezas.filter(p => p.cantidadDisponible <= (p.cantidadMinima || 0)).length;

    const content = `
        <div class="inventario-general-sup">
            <!-- Estadísticas -->
            <div class="inv-stats-grid">
                <div class="inv-stat-box">
                    <i class="fas fa-cubes"></i>
                    <div class="inv-stat-data">
                        <span class="inv-stat-num">${totalPiezasTipos}</span>
                        <span class="inv-stat-txt">Tipos de Piezas</span>
                    </div>
                </div>
                <div class="inv-stat-box">
                    <i class="fas fa-boxes"></i>
                    <div class="inv-stat-data">
                        <span class="inv-stat-num">${totalCantidad.toLocaleString()}</span>
                        <span class="inv-stat-txt">Piezas Totales</span>
                    </div>
                </div>
                <div class="inv-stat-box">
                    <i class="fas fa-box-open"></i>
                    <div class="inv-stat-data">
                        <span class="inv-stat-num">${productosConInventario.length}</span>
                        <span class="inv-stat-txt">Productos</span>
                    </div>
                </div>
                <div class="inv-stat-box ${piezasBajas > 0 ? 'alerta' : ''}">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="inv-stat-data">
                        <span class="inv-stat-num">${piezasBajas}</span>
                        <span class="inv-stat-txt">Stock Bajo</span>
                    </div>
                </div>
            </div>

            <!-- Búsqueda -->
            <div class="inv-search-box">
                <i class="fas fa-search"></i>
                <input type="text" id="buscarInvSup" placeholder="Buscar producto o pieza..." onkeyup="filtrarInventarioSup()">
            </div>

            <!-- Lista de productos -->
            <div class="inv-productos-list" id="invProductosListSup">
                ${productosConInventario.length === 0 ? `
                    <div class="inv-empty">
                        <i class="fas fa-inbox"></i>
                        <p>No hay piezas en inventario</p>
                        <span>Agrega piezas desde el panel de administrador</span>
                    </div>
                ` : productosConInventario.map(producto => {
                    const piezas = piezasPorProducto[producto.id] || [];
                    const totalProducto = piezas.reduce((sum, p) => sum + (p.cantidadDisponible || 0), 0);
                    const tieneBajas = piezas.some(p => p.cantidadDisponible <= (p.cantidadMinima || 0));

                    return `
                        <div class="inv-prod-card ${tieneBajas ? 'alerta' : ''}" data-producto="${producto.nombre.toLowerCase()}">
                            <div class="inv-prod-header" onclick="toggleInvProductoSup(${producto.id})">
                                <div class="inv-prod-info">
                                    <span class="inv-prod-name">${producto.nombre}</span>
                                    <div class="inv-prod-badges">
                                        <span class="inv-badge tipos"><i class="fas fa-puzzle-piece"></i> ${piezas.length}</span>
                                        <span class="inv-badge cantidad"><i class="fas fa-boxes"></i> ${totalProducto.toLocaleString()}</span>
                                        ${tieneBajas ? '<span class="inv-badge alerta"><i class="fas fa-exclamation-circle"></i></span>' : ''}
                                    </div>
                                </div>
                                <i class="fas fa-chevron-down inv-chevron"></i>
                            </div>
                            <div class="inv-prod-detail" id="invDetail-${producto.id}">
                                ${piezas.map(pieza => {
                                    const porcentaje = pieza.cantidadMinima > 0 ? Math.min(100, (pieza.cantidadDisponible / pieza.cantidadMinima) * 100) : 100;
                                    const estado = pieza.cantidadDisponible <= 0 ? 'agotado' :
                                                   pieza.cantidadDisponible <= pieza.cantidadMinima ? 'bajo' : 'ok';
                                    return `
                                        <div class="inv-pieza-row ${estado}" data-pieza="${pieza.procesoNombre.toLowerCase()}">
                                            <div class="inv-pieza-icon ${estado}">
                                                <i class="fas fa-cube"></i>
                                            </div>
                                            <div class="inv-pieza-data">
                                                <span class="inv-pieza-name">${pieza.procesoNombre}</span>
                                                <div class="inv-pieza-bar">
                                                    <div class="inv-pieza-fill ${estado}" style="width: ${porcentaje}%"></div>
                                                </div>
                                            </div>
                                            <div class="inv-pieza-qty">
                                                <span class="qty-num">${pieza.cantidadDisponible.toLocaleString()}</span>
                                                <span class="qty-unit">${pieza.unidad || 'pzas'}</span>
                                            </div>
                                            <div class="inv-pieza-btns">
                                                <button class="inv-btn-assign" onclick="event.stopPropagation(); asignarCorteInventario(${pieza.id}, ${producto.id})" title="Asignar corte a operador">
                                                    <i class="fas fa-user-plus"></i>
                                                </button>
                                                <button class="inv-btn-add" onclick="event.stopPropagation(); agregarPiezasSup(${pieza.id})" title="Agregar">
                                                    <i class="fas fa-plus"></i>
                                                </button>
                                                <button class="inv-btn-sub" onclick="event.stopPropagation(); descontarPiezasSup(${pieza.id})" title="Descontar">
                                                    <i class="fas fa-minus"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    openModal('Inventario de Piezas', content);

    // Inyectar estilos si no existen
    if (!document.getElementById('inv-sup-styles')) {
        const styles = document.createElement('style');
        styles.id = 'inv-sup-styles';
        styles.textContent = `
            .inventario-general-sup {
                max-height: 70vh;
                overflow-y: auto;
                padding: 5px;
            }
            .inv-stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 15px;
            }
            .inv-stat-box {
                background: linear-gradient(135deg, #1e293b, #334155);
                border-radius: 10px;
                padding: 12px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .inv-stat-box i {
                font-size: 1.3rem;
                color: #60a5fa;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(96, 165, 250, 0.15);
                border-radius: 8px;
            }
            .inv-stat-box.alerta i {
                color: #fbbf24;
                background: rgba(251, 191, 36, 0.15);
            }
            .inv-stat-data {
                display: flex;
                flex-direction: column;
            }
            .inv-stat-num {
                font-size: 1.2rem;
                font-weight: 700;
                color: #f1f5f9;
            }
            .inv-stat-txt {
                font-size: 0.7rem;
                color: #94a3b8;
            }
            .inv-search-box {
                display: flex;
                align-items: center;
                background: #1e293b;
                border-radius: 8px;
                padding: 8px 12px;
                margin-bottom: 12px;
                gap: 8px;
            }
            .inv-search-box i { color: #64748b; }
            .inv-search-box input {
                flex: 1;
                background: transparent;
                border: none;
                color: #f1f5f9;
                font-size: 0.9rem;
                outline: none;
            }
            .inv-search-box input::placeholder { color: #64748b; }
            .inv-productos-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .inv-empty {
                text-align: center;
                padding: 30px;
                color: #64748b;
            }
            .inv-empty i {
                font-size: 2.5rem;
                margin-bottom: 10px;
                opacity: 0.5;
            }
            .inv-prod-card {
                background: #1e293b;
                border-radius: 10px;
                overflow: hidden;
                border: 1px solid #334155;
            }
            .inv-prod-card.alerta {
                border-color: #f59e0b;
            }
            .inv-prod-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 14px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .inv-prod-header:hover {
                background: #334155;
            }
            .inv-prod-info {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .inv-prod-name {
                font-weight: 600;
                color: #f1f5f9;
                font-size: 0.9rem;
            }
            .inv-prod-badges {
                display: flex;
                gap: 8px;
            }
            .inv-badge {
                font-size: 0.65rem;
                padding: 2px 6px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 3px;
            }
            .inv-badge.tipos {
                background: rgba(96, 165, 250, 0.15);
                color: #60a5fa;
            }
            .inv-badge.cantidad {
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
            }
            .inv-badge.alerta {
                background: rgba(245, 158, 11, 0.15);
                color: #fbbf24;
            }
            .inv-chevron {
                color: #64748b;
                transition: transform 0.3s;
            }
            .inv-prod-card.expanded .inv-chevron {
                transform: rotate(180deg);
            }
            .inv-prod-detail {
                display: none;
                background: #0f172a;
                border-top: 1px solid #334155;
            }
            .inv-prod-card.expanded .inv-prod-detail {
                display: block;
            }
            .inv-pieza-row {
                display: flex;
                align-items: center;
                padding: 10px 14px;
                gap: 10px;
                border-bottom: 1px solid #1e293b;
            }
            .inv-pieza-row:last-child {
                border-bottom: none;
            }
            .inv-pieza-icon {
                width: 32px;
                height: 32px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .inv-pieza-icon.ok {
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
            }
            .inv-pieza-icon.bajo {
                background: rgba(245, 158, 11, 0.15);
                color: #fbbf24;
            }
            .inv-pieza-icon.agotado {
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
            }
            .inv-pieza-data {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .inv-pieza-name {
                font-size: 0.8rem;
                color: #e2e8f0;
            }
            .inv-pieza-bar {
                height: 3px;
                background: #334155;
                border-radius: 2px;
                overflow: hidden;
            }
            .inv-pieza-fill {
                height: 100%;
                border-radius: 2px;
            }
            .inv-pieza-fill.ok { background: linear-gradient(90deg, #10b981, #34d399); }
            .inv-pieza-fill.bajo { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
            .inv-pieza-fill.agotado { background: linear-gradient(90deg, #ef4444, #f87171); }
            .inv-pieza-qty {
                text-align: right;
                min-width: 70px;
            }
            .qty-num {
                font-size: 1rem;
                font-weight: 700;
                color: #f1f5f9;
            }
            .qty-unit {
                font-size: 0.65rem;
                color: #64748b;
                margin-left: 3px;
            }
            .inv-pieza-btns {
                display: flex;
                gap: 5px;
            }
            .inv-btn-add, .inv-btn-sub, .inv-btn-assign {
                width: 26px;
                height: 26px;
                border-radius: 5px;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .inv-btn-assign {
                background: rgba(99, 102, 241, 0.15);
                color: #818cf8;
            }
            .inv-btn-assign:hover {
                background: rgba(99, 102, 241, 0.3);
            }
            .inv-btn-add {
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
            }
            .inv-btn-add:hover {
                background: rgba(16, 185, 129, 0.3);
            }
            .inv-btn-sub {
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
            }
            .inv-btn-sub:hover {
                background: rgba(239, 68, 68, 0.3);
            }
        `;
        document.head.appendChild(styles);
    }
}

// Expandir/colapsar producto en inventario
function toggleInvProductoSup(productoId) {
    const card = document.querySelector(`#invDetail-${productoId}`)?.closest('.inv-prod-card');
    if (card) {
        card.classList.toggle('expanded');
    }
}

// Filtrar inventario
function filtrarInventarioSup() {
    const busqueda = document.getElementById('buscarInvSup')?.value?.toLowerCase() || '';
    const cards = document.querySelectorAll('.inv-prod-card');

    cards.forEach(card => {
        const nombreProducto = card.dataset.producto || '';
        const piezas = card.querySelectorAll('.inv-pieza-row');
        let mostrar = nombreProducto.includes(busqueda);

        piezas.forEach(pieza => {
            const nombrePieza = pieza.dataset.pieza || '';
            if (nombrePieza.includes(busqueda)) {
                mostrar = true;
                pieza.style.display = '';
            } else if (busqueda && !nombreProducto.includes(busqueda)) {
                pieza.style.display = 'none';
            } else {
                pieza.style.display = '';
            }
        });

        card.style.display = mostrar ? '' : 'none';
        if (busqueda && mostrar) {
            card.classList.add('expanded');
        }
    });
}

// Agregar piezas al inventario
function agregarPiezasSup(piezaId) {
    const pieza = typeof db !== 'undefined' ? db.getInventarioPieza(piezaId) : null;
    if (!pieza) {
        showToast('Pieza no encontrada', 'error');
        return;
    }

    const content = `
        <div class="inv-modal-form">
            <p style="margin-bottom: 15px; color: #94a3b8;">
                <strong style="color: #f1f5f9;">${pieza.procesoNombre}</strong><br>
                Stock actual: <span style="color: #34d399; font-weight: 700;">${pieza.cantidadDisponible} ${pieza.unidad || 'pzas'}</span>
            </p>
            <div class="form-group" style="margin-bottom: 12px;">
                <label style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 5px; display: block;">Cantidad a agregar</label>
                <input type="number" id="cantidadAgregar" min="1" value="10"
                       style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; font-size: 1rem;">
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 5px; display: block;">Motivo (opcional)</label>
                <input type="text" id="motivoAgregar" placeholder="Ej: Producción extra, Reposición..."
                       style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; font-size: 0.9rem;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="closeModal()" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
                <button onclick="confirmarAgregarPiezasSup(${piezaId})" class="btn btn-success" style="flex: 1; background: linear-gradient(135deg, #10b981, #34d399);">
                    <i class="fas fa-plus"></i> Agregar
                </button>
            </div>
        </div>
    `;

    openModal(`Agregar Piezas`, content);
}

function confirmarAgregarPiezasSup(piezaId) {
    const cantidad = parseInt(document.getElementById('cantidadAgregar')?.value) || 0;
    const motivo = document.getElementById('motivoAgregar')?.value || 'Agregado desde supervisora';

    if (cantidad <= 0) {
        showToast('Ingresa una cantidad válida', 'warning');
        return;
    }

    if (typeof db !== 'undefined' && db.agregarPiezasInventario) {
        db.agregarPiezasInventario(piezaId, cantidad, motivo);
        showToast(`+${cantidad} piezas agregadas`, 'success');
        closeModal();
        // Reabrir el inventario para ver cambios
        setTimeout(() => showInventarioGeneralSupervisora(), 300);
    } else {
        showToast('Error: Base de datos no disponible', 'error');
    }
}

// Descontar piezas del inventario
function descontarPiezasSup(piezaId) {
    const pieza = typeof db !== 'undefined' ? db.getInventarioPieza(piezaId) : null;
    if (!pieza) {
        showToast('Pieza no encontrada', 'error');
        return;
    }

    const content = `
        <div class="inv-modal-form">
            <p style="margin-bottom: 15px; color: #94a3b8;">
                <strong style="color: #f1f5f9;">${pieza.procesoNombre}</strong><br>
                Stock actual: <span style="color: #34d399; font-weight: 700;">${pieza.cantidadDisponible} ${pieza.unidad || 'pzas'}</span>
            </p>
            <div class="form-group" style="margin-bottom: 12px;">
                <label style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 5px; display: block;">Cantidad a descontar</label>
                <input type="number" id="cantidadDescontar" min="1" max="${pieza.cantidadDisponible}" value="1"
                       style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; font-size: 1rem;">
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 5px; display: block;">Motivo</label>
                <select id="motivoDescontar" style="width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #f1f5f9; font-size: 0.9rem;">
                    <option value="Usado en producción">Usado en producción</option>
                    <option value="Ajuste de inventario">Ajuste de inventario</option>
                    <option value="Defectuoso/Merma">Defectuoso/Merma</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="closeModal()" class="btn btn-secondary" style="flex: 1;">Cancelar</button>
                <button onclick="confirmarDescontarPiezasSup(${piezaId})" class="btn btn-danger" style="flex: 1; background: linear-gradient(135deg, #ef4444, #f87171);">
                    <i class="fas fa-minus"></i> Descontar
                </button>
            </div>
        </div>
    `;

    openModal(`Descontar Piezas`, content);
}

function confirmarDescontarPiezasSup(piezaId) {
    const cantidad = parseInt(document.getElementById('cantidadDescontar')?.value) || 0;
    const motivo = document.getElementById('motivoDescontar')?.value || 'Descontado desde supervisora';

    if (cantidad <= 0) {
        showToast('Ingresa una cantidad válida', 'warning');
        return;
    }

    if (typeof db !== 'undefined' && db.descontarPiezasInventario) {
        const resultado = db.descontarPiezasInventario(piezaId, cantidad, motivo);
        if (resultado && resultado.error) {
            showToast(`Error: ${resultado.error}. Disponible: ${resultado.disponible}`, 'error');
        } else {
            showToast(`-${cantidad} piezas descontadas`, 'success');
            closeModal();
            // Reabrir el inventario para ver cambios
            setTimeout(() => showInventarioGeneralSupervisora(), 300);
        }
    } else {
        showToast('Error: Base de datos no disponible', 'error');
    }
}

// ========================================
// ASIGNAR CORTE DE INVENTARIO A OPERADOR
// ========================================

function asignarCorteInventario(piezaId, productoId) {
    const pieza = typeof db !== 'undefined' ? db.getInventarioPieza(piezaId) : null;
    const producto = typeof db !== 'undefined' ? db.getProducto(productoId) : null;

    if (!pieza || !producto) {
        showToast('Error: Pieza o producto no encontrado', 'error');
        return;
    }

    // Obtener estaciones disponibles con operadores asignados
    const estaciones = typeof db !== 'undefined' ? db.getEstaciones() : [];
    const personal = typeof db !== 'undefined' ? db.getPersonal() : [];
    const asignacionesActuales = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

    // Filtrar estaciones que tienen operador y no tienen trabajo asignado o están disponibles
    const estacionesDisponibles = estaciones.filter(est => {
        if (!est.operadorId) return false;
        const asignacion = asignacionesActuales[est.id];
        // Disponible si no tiene asignación o si la asignación no tiene pedido activo
        return !asignacion || !asignacion.pedidoId;
    });

    // Obtener todas las estaciones con operador para mostrar (incluso las ocupadas)
    const estacionesConOperador = estaciones.filter(est => est.operadorId);

    const content = `
        <div class="asignar-corte-modal">
            <div class="corte-info-header">
                <div class="corte-producto">
                    <i class="fas fa-box"></i>
                    <div>
                        <span class="corte-producto-nombre">${producto.nombre}</span>
                        <span class="corte-proceso-nombre">${pieza.procesoNombre}</span>
                    </div>
                </div>
                <div class="corte-stock-actual">
                    <span class="stock-label">Stock actual:</span>
                    <span class="stock-value">${pieza.cantidadDisponible} ${pieza.unidad || 'pzas'}</span>
                </div>
            </div>

            <div class="corte-form">
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-desktop"></i> Estación / Operador</label>
                        <select id="corteEstacion" onchange="actualizarInfoEstacionCorte()">
                            <option value="">Seleccionar estación...</option>
                            ${estacionesConOperador.map(est => {
                                const operador = personal.find(p => p.id === est.operadorId);
                                const asignacion = asignacionesActuales[est.id];
                                const ocupada = asignacion && asignacion.pedidoId;
                                return `
                                    <option value="${est.id}"
                                            data-operador-id="${est.operadorId}"
                                            data-operador-nombre="${operador?.nombre || 'Sin nombre'}"
                                            ${ocupada ? 'data-ocupada="true"' : ''}>
                                        ${est.nombre} - ${operador?.nombre || 'Sin operador'} ${ocupada ? '(Ocupada)' : ''}
                                    </option>
                                `;
                            }).join('')}
                        </select>
                        <div id="estacionOcupadaWarning" class="warning-msg" style="display: none;">
                            <i class="fas fa-exclamation-triangle"></i>
                            Esta estación tiene un trabajo asignado. Se reemplazará.
                        </div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-cubes"></i> Cantidad a producir</label>
                        <input type="number" id="corteCantidad" min="1" value="${pieza.cantidadMinima > pieza.cantidadDisponible ? pieza.cantidadMinima - pieza.cantidadDisponible : 50}"
                               placeholder="Cantidad de piezas a cortar">
                        <small style="color: #94a3b8; font-size: 0.75rem;">
                            ${pieza.cantidadMinima > 0 ? `Mínimo recomendado: ${pieza.cantidadMinima} pzas` : 'Ingresa la cantidad deseada'}
                        </small>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-clock"></i> Prioridad</label>
                        <select id="cortePrioridad">
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-sticky-note"></i> Notas (opcional)</label>
                        <input type="text" id="corteNotas" placeholder="Instrucciones especiales...">
                    </div>
                </div>
            </div>

            <div class="corte-actions">
                <button onclick="closeModal()" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancelar
                </button>
                <button onclick="confirmarAsignarCorte(${piezaId}, ${productoId})" class="btn btn-primary-corte">
                    <i class="fas fa-user-plus"></i> Asignar Corte
                </button>
            </div>
        </div>

        <style>
            .asignar-corte-modal {
                padding: 5px;
            }
            .corte-info-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #1e293b, #334155);
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
            }
            .corte-producto {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .corte-producto i {
                font-size: 1.5rem;
                color: #818cf8;
            }
            .corte-producto-nombre {
                display: block;
                font-weight: 600;
                color: #f1f5f9;
                font-size: 1rem;
            }
            .corte-proceso-nombre {
                display: block;
                color: #94a3b8;
                font-size: 0.85rem;
            }
            .corte-stock-actual {
                text-align: right;
            }
            .stock-label {
                display: block;
                font-size: 0.75rem;
                color: #94a3b8;
            }
            .stock-value {
                font-size: 1.2rem;
                font-weight: 700;
                color: #34d399;
            }
            .corte-form {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .corte-form .form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .corte-form label {
                font-size: 0.85rem;
                color: #94a3b8;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .corte-form label i {
                color: #60a5fa;
            }
            .corte-form select,
            .corte-form input {
                padding: 10px 12px;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 8px;
                color: #f1f5f9;
                font-size: 0.9rem;
            }
            .corte-form select:focus,
            .corte-form input:focus {
                outline: none;
                border-color: #60a5fa;
            }
            .warning-msg {
                background: rgba(245, 158, 11, 0.15);
                color: #fbbf24;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                margin-top: 6px;
            }
            .warning-msg i {
                margin-right: 6px;
            }
            .corte-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .corte-actions .btn {
                flex: 1;
                padding: 12px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .corte-actions .btn-secondary {
                background: #334155;
                border: none;
                color: #94a3b8;
            }
            .corte-actions .btn-secondary:hover {
                background: #475569;
            }
            .corte-actions .btn-primary-corte {
                background: linear-gradient(135deg, #6366f1, #818cf8);
                border: none;
                color: white;
            }
            .corte-actions .btn-primary-corte:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
            }
        </style>
    `;

    openModal('Asignar Corte de Inventario', content);
}

function actualizarInfoEstacionCorte() {
    const select = document.getElementById('corteEstacion');
    const warning = document.getElementById('estacionOcupadaWarning');
    const selectedOption = select.options[select.selectedIndex];

    if (selectedOption && selectedOption.dataset.ocupada === 'true') {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

function confirmarAsignarCorte(piezaId, productoId) {
    const estacionId = document.getElementById('corteEstacion')?.value;
    const cantidad = parseInt(document.getElementById('corteCantidad')?.value) || 0;
    const prioridad = document.getElementById('cortePrioridad')?.value || 'normal';
    const notas = document.getElementById('corteNotas')?.value || '';

    if (!estacionId) {
        showToast('Selecciona una estación', 'warning');
        return;
    }

    if (cantidad <= 0) {
        showToast('Ingresa una cantidad válida', 'warning');
        return;
    }

    const pieza = typeof db !== 'undefined' ? db.getInventarioPieza(piezaId) : null;
    const producto = typeof db !== 'undefined' ? db.getProducto(productoId) : null;
    const estaciones = typeof db !== 'undefined' ? db.getEstaciones() : [];
    const estacion = estaciones.find(e => e.id === estacionId);

    if (!pieza || !producto || !estacion) {
        showToast('Error: Datos no encontrados', 'error');
        return;
    }

    // Crear un "pedido virtual" para el corte de inventario
    const pedidoInventarioId = `INV-${Date.now()}`;
    const procesoId = `CORTE-INV-${piezaId}-${Date.now()}`;

    // 1. Guardar en asignaciones_estaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    asignaciones[estacionId] = {
        pedidoId: pedidoInventarioId,
        procesoId: procesoId,
        procesoNombre: pieza.procesoNombre,
        meta: cantidad,
        cantidadMeta: cantidad,
        fechaAsignacion: new Date().toISOString(),
        asignadoPor: 'Coco',
        esCorteInventario: true,
        piezaInventarioId: piezaId,
        productoId: productoId,
        productoNombre: producto.nombre,
        prioridad: prioridad,
        notas: notas
    };
    localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));

    // 2. Actualizar estado_maquinas
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    estadoMaquinas[estacionId] = {
        ...(estadoMaquinas[estacionId] || {}),
        estado: 'asignado',
        pedidoId: pedidoInventarioId,
        procesoId: procesoId,
        procesoNombre: pieza.procesoNombre,
        esCorteInventario: true,
        ultimaActualizacion: new Date().toISOString()
    };
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // 3. Crear pedido virtual en pedidos_activos para que operadora lo vea
    let pedidosActivos = JSON.parse(localStorage.getItem('pedidos_activos') || '[]');

    // Remover si ya existe
    pedidosActivos = pedidosActivos.filter(p => p.id !== pedidoInventarioId);

    pedidosActivos.push({
        id: pedidoInventarioId,
        codigo: pedidoInventarioId,
        cliente: 'INVENTARIO',
        clienteNombre: 'Producción para Inventario',
        producto: producto.nombre,
        productoNombre: producto.nombre,
        productoId: productoId,
        cantidad: cantidad,
        estado: 'en-proceso',
        prioridad: prioridad,
        esCorteInventario: true,
        piezaInventarioId: piezaId,
        procesoNombre: pieza.procesoNombre,
        notas: notas,
        fechaCreacion: new Date().toISOString(),
        procesos: [{
            id: procesoId,
            nombre: pieza.procesoNombre,
            tipo: 'corte',
            estado: 'pendiente',
            orden: 1,
            piezasCompletadas: 0,
            meta: cantidad,
            esCorteInventario: true,
            piezaInventarioId: piezaId
        }]
    });

    localStorage.setItem('pedidos_activos', JSON.stringify(pedidosActivos));

    // 4. Guardar en historial de cortes de inventario
    const historialCortes = JSON.parse(localStorage.getItem('historial_cortes_inventario') || '[]');
    historialCortes.unshift({
        id: Date.now(),
        piezaId: piezaId,
        productoId: productoId,
        productoNombre: producto.nombre,
        procesoNombre: pieza.procesoNombre,
        estacionId: estacionId,
        operadorId: estacion.operadorId,
        cantidad: cantidad,
        prioridad: prioridad,
        notas: notas,
        estado: 'asignado',
        fechaAsignacion: new Date().toISOString(),
        pedidoVirtualId: pedidoInventarioId
    });
    localStorage.setItem('historial_cortes_inventario', JSON.stringify(historialCortes.slice(0, 200)));

    // 5. Actualizar estado interno
    if (supervisoraState.maquinas[estacionId]) {
        supervisoraState.maquinas[estacionId].pedidoId = pedidoInventarioId;
        supervisoraState.maquinas[estacionId].procesoId = procesoId;
        supervisoraState.maquinas[estacionId].estado = 'asignado';
        supervisoraState.maquinas[estacionId].esCorteInventario = true;
    }

    closeModal();
    showToast(`Corte de ${cantidad} pzas asignado a ${estacion.nombre}`, 'success');

    // Refrescar la vista
    if (typeof renderMapaPlanta === 'function') {
        renderMapaPlanta();
    }

    DEBUG_MODE && console.log('[SUPERVISORA] Corte de inventario asignado:', {
        pieza: pieza.procesoNombre,
        producto: producto.nombre,
        estacion: estacionId,
        cantidad: cantidad
    });
}

// Exponer funciones globalmente
window.showInventarioGeneralSupervisora = showInventarioGeneralSupervisora;
window.toggleInvProductoSup = toggleInvProductoSup;
window.filtrarInventarioSup = filtrarInventarioSup;
window.agregarPiezasSup = agregarPiezasSup;
window.confirmarAgregarPiezasSup = confirmarAgregarPiezasSup;
window.descontarPiezasSup = descontarPiezasSup;
window.confirmarDescontarPiezasSup = confirmarDescontarPiezasSup;
window.asignarCorteInventario = asignarCorteInventario;
window.actualizarInfoEstacionCorte = actualizarInfoEstacionCorte;
window.confirmarAsignarCorte = confirmarAsignarCorte;

// ========================================
// SISTEMA DE ASISTENCIA
// ========================================

function abrirModalAsistencia() {
    const hoy = new Date().toISOString().split('T')[0];
    const operadores = supervisoraState.operadores || [];

    if (operadores.length === 0) {
        showToast('No hay operadores registrados', 'warning');
        return;
    }

    // Cargar asistencia guardada para hoy (localStorage fallback)
    let asistenciaHoy = {};
    try {
        const saved = JSON.parse(localStorage.getItem('asistencia_hoy') || '{}');
        if (saved.fecha === hoy) {
            asistenciaHoy = saved.registros || {};
        }
    } catch (e) {}

    let rows = '';
    operadores.forEach(op => {
        const reg = asistenciaHoy[op.id] || {};
        const tipo = reg.tipo || 'asistencia';
        const motivo = reg.motivo || '';

        rows += `
        <tr class="asistencia-row" data-operador-id="${op.id}">
            <td class="asistencia-nombre">
                <div class="asistencia-avatar">${getIniciales(op.nombre)}</div>
                <span>${op.nombre}</span>
            </td>
            <td class="asistencia-tipo-cell">
                <div class="asistencia-tipo-group">
                    <button class="asist-tipo-btn ${tipo === 'asistencia' ? 'active' : ''}" data-tipo="asistencia" onclick="setTipoAsistencia(${op.id}, 'asistencia', this)" title="Asistencia">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="asist-tipo-btn falta ${tipo === 'falta' ? 'active' : ''}" data-tipo="falta" onclick="setTipoAsistencia(${op.id}, 'falta', this)" title="Falta">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="asist-tipo-btn retardo ${tipo === 'retardo' ? 'active' : ''}" data-tipo="retardo" onclick="setTipoAsistencia(${op.id}, 'retardo', this)" title="Retardo">
                        <i class="fas fa-clock"></i>
                    </button>
                    <button class="asist-tipo-btn permiso ${tipo === 'permiso' ? 'active' : ''}" data-tipo="permiso" onclick="setTipoAsistencia(${op.id}, 'permiso', this)" title="Permiso">
                        <i class="fas fa-hand-paper"></i>
                    </button>
                </div>
            </td>
            <td class="asistencia-motivo-cell">
                <input type="text" class="asistencia-motivo-input" id="motivo-${op.id}" placeholder="Motivo..." value="${motivo}" ${tipo === 'asistencia' ? 'disabled' : ''}>
            </td>
        </tr>`;
    });

    const content = `
    <div class="asistencia-modal-content">
        <div class="asistencia-fecha">
            <i class="fas fa-calendar-day"></i>
            <span>Fecha: <strong>${hoy}</strong></span>
            <div class="asistencia-resumen" id="asistenciaResumen">
                <span class="asist-res-item ok"><i class="fas fa-check"></i> <span id="resAsistencia">${operadores.length}</span></span>
                <span class="asist-res-item falta"><i class="fas fa-times"></i> <span id="resFaltas">0</span></span>
                <span class="asist-res-item retardo"><i class="fas fa-clock"></i> <span id="resRetardos">0</span></span>
                <span class="asist-res-item permiso"><i class="fas fa-hand-paper"></i> <span id="resPermisos">0</span></span>
            </div>
        </div>
        <div class="asistencia-acciones-rapidas">
            <button class="btn btn-sm btn-outline" onclick="marcarTodosAsistencia()"><i class="fas fa-check-double"></i> Todos presentes</button>
        </div>
        <div class="asistencia-table-wrapper">
            <table class="asistencia-table">
                <thead>
                    <tr>
                        <th>Operadora</th>
                        <th>Estado</th>
                        <th>Motivo</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    </div>`;

    const footer = `
        <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarAsistencia()"><i class="fas fa-save"></i> Guardar Asistencia</button>
    `;

    openModal('Registro de Asistencia', content, footer);
    actualizarResumenAsistencia();
}

function setTipoAsistencia(operadorId, tipo, btn) {
    // Desactivar todos los botones del grupo
    const row = btn.closest('.asistencia-tipo-group');
    row.querySelectorAll('.asist-tipo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Habilitar/deshabilitar campo motivo
    const motivoInput = document.getElementById('motivo-' + operadorId);
    if (motivoInput) {
        motivoInput.disabled = (tipo === 'asistencia');
        if (tipo === 'asistencia') motivoInput.value = '';
    }

    actualizarResumenAsistencia();
}

function marcarTodosAsistencia() {
    document.querySelectorAll('.asistencia-row').forEach(row => {
        const btns = row.querySelectorAll('.asist-tipo-btn');
        btns.forEach(b => b.classList.remove('active'));
        btns[0].classList.add('active'); // Primer boton = asistencia

        const motivoInput = row.querySelector('.asistencia-motivo-input');
        if (motivoInput) {
            motivoInput.disabled = true;
            motivoInput.value = '';
        }
    });
    actualizarResumenAsistencia();
}

function actualizarResumenAsistencia() {
    let asistencias = 0, faltas = 0, retardos = 0, permisos = 0;
    document.querySelectorAll('.asistencia-row').forEach(row => {
        const activeBtn = row.querySelector('.asist-tipo-btn.active');
        if (!activeBtn) return;
        const tipo = activeBtn.dataset.tipo;
        if (tipo === 'asistencia') asistencias++;
        else if (tipo === 'falta') faltas++;
        else if (tipo === 'retardo') retardos++;
        else if (tipo === 'permiso') permisos++;
    });

    const el = (id) => document.getElementById(id);
    if (el('resAsistencia')) el('resAsistencia').textContent = asistencias;
    if (el('resFaltas')) el('resFaltas').textContent = faltas;
    if (el('resRetardos')) el('resRetardos').textContent = retardos;
    if (el('resPermisos')) el('resPermisos').textContent = permisos;
}

async function guardarAsistencia() {
    const hoy = new Date().toISOString().split('T')[0];
    const registros = {};
    const registrosArray = [];

    document.querySelectorAll('.asistencia-row').forEach(row => {
        const operadorId = parseInt(row.dataset.operadorId);
        const activeBtn = row.querySelector('.asist-tipo-btn.active');
        const tipo = activeBtn ? activeBtn.dataset.tipo : 'asistencia';
        const motivoInput = row.querySelector('.asistencia-motivo-input');
        const motivo = motivoInput ? motivoInput.value.trim() : '';

        registros[operadorId] = { tipo, motivo };
        registrosArray.push({
            personal_id: operadorId,
            fecha: hoy,
            tipo: tipo,
            motivo: motivo || null,
            registrado_por: 'Supervisora'
        });
    });

    // Guardar en localStorage como fallback
    localStorage.setItem('asistencia_hoy', JSON.stringify({
        fecha: hoy,
        registros: registros
    }));

    // Guardar historial completo en localStorage
    let historial = [];
    try {
        historial = JSON.parse(localStorage.getItem('historial_asistencia') || '[]');
    } catch (e) {}

    // Actualizar o insertar registros del día
    registrosArray.forEach(reg => {
        const idx = historial.findIndex(h => h.personal_id === reg.personal_id && h.fecha === reg.fecha);
        if (idx >= 0) {
            historial[idx] = { ...historial[idx], ...reg, updated_at: new Date().toISOString() };
        } else {
            historial.push({ ...reg, id: Date.now() + Math.random(), created_at: new Date().toISOString() });
        }
    });
    localStorage.setItem('historial_asistencia', JSON.stringify(historial));

    // Intentar guardar en Supabase via RPC
    const sb = window.supabaseInstance;
    if (sb) {
        try {
            for (const reg of registrosArray) {
                await sb.rpc('registrar_asistencia', {
                    p_personal_id: reg.personal_id,
                    p_fecha: reg.fecha,
                    p_tipo: reg.tipo,
                    p_motivo: reg.motivo,
                    p_observaciones: null,
                    p_registrado_por: reg.registrado_por
                });
            }
            DEBUG_MODE && console.log('[ASISTENCIA] Guardado en Supabase exitosamente');
        } catch (e) {
            DEBUG_MODE && console.warn('[ASISTENCIA] Error guardando en Supabase, usando localStorage:', e.message);
        }
    }

    // Sincronizar via realtime
    if (typeof syncManager !== 'undefined') {
        syncManager.set('asistencia_' + hoy, JSON.stringify(registros));
    }

    closeModal();

    const faltas = Object.values(registros).filter(r => r.tipo === 'falta').length;
    const retardos = Object.values(registros).filter(r => r.tipo === 'retardo').length;
    const permisos = Object.values(registros).filter(r => r.tipo === 'permiso').length;

    let msg = 'Asistencia registrada';
    if (faltas > 0 || retardos > 0 || permisos > 0) {
        const parts = [];
        if (faltas > 0) parts.push(faltas + ' falta' + (faltas > 1 ? 's' : ''));
        if (retardos > 0) parts.push(retardos + ' retardo' + (retardos > 1 ? 's' : ''));
        if (permisos > 0) parts.push(permisos + ' permiso' + (permisos > 1 ? 's' : ''));
        msg += ' (' + parts.join(', ') + ')';
    }
    showToast(msg, 'success');
}

// Exponer funciones de asistencia globalmente
window.abrirModalAsistencia = abrirModalAsistencia;
window.setTipoAsistencia = setTipoAsistencia;
window.marcarTodosAsistencia = marcarTodosAsistencia;
window.guardarAsistencia = guardarAsistencia;
