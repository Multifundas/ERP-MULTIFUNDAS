// ========================================
// ERP MULTIFUNDAS - APLICACIÓN PRINCIPAL
// ========================================
console.log('[app.js] Iniciando carga del módulo...');

// Estado de la aplicación
const app = {
    currentSection: 'dashboard',
    sidebarCollapsed: false
};

// ========================================
// UTILIDADES DE FILTRADO DE ESTADOS
// ========================================

/**
 * Estados que se consideran finalizados/inactivos para pedidos
 */
const ESTADOS_PEDIDO_INACTIVO = [
    'completado', 'entregado', 'terminado', 'cerrado', 'cancelado', 'anulado'
];

/**
 * Verifica si un pedido está en estado activo (no finalizado)
 * Usa lógica inversa: todo lo que NO sea completado/entregado/cancelado es activo
 */
function esPedidoActivo(pedido) {
    if (!pedido) {
        console.log('[esPedidoActivo] Pedido es null/undefined');
        return false;
    }
    if (!pedido.estado) {
        console.log('[esPedidoActivo] Pedido #' + pedido.id + ' no tiene estado, retornando TRUE (asumiendo activo)');
        return true; // Si no tiene estado, asumimos que es nuevo/activo
    }
    const estado = pedido.estado.toLowerCase().trim();
    const esInactivo = ESTADOS_PEDIDO_INACTIVO.some(e => estado === e || estado.includes(e));
    return !esInactivo;
}

/**
 * Filtra pedidos activos de un array
 */
function filtrarPedidosActivos(pedidos) {
    if (!Array.isArray(pedidos)) return [];
    return pedidos.filter(esPedidoActivo);
}

/**
 * Verifica si un pedido está pendiente (no iniciado)
 */
function esPedidoPendiente(pedido) {
    if (!pedido || !pedido.estado) return false;
    const estado = pedido.estado.toLowerCase().trim();
    return estado === 'pendiente' || estado === 'nuevo' || estado === 'por-iniciar';
}

/**
 * Verifica si un pedido está completado/entregado
 */
function esPedidoCompletado(pedido) {
    if (!pedido || !pedido.estado) return false;
    const estado = pedido.estado.toLowerCase().trim();
    return estado === 'completado' || estado === 'entregado' || estado === 'terminado' || estado === 'cerrado';
}

// ========================================
// OBJETO ADMIN PARA ACCESO DESDE CONSOLA
// ========================================
window.ADMIN = {
    limpiarTodo: () => {
        if (typeof limpiarTodosLosDatos === 'function') {
            return limpiarTodosLosDatos();
        } else {
            console.error('Función limpiarTodosLosDatos no disponible');
            return false;
        }
    },
    limpiarProduccion: () => {
        if (typeof limpiarDatosProduccion === 'function') {
            return limpiarDatosProduccion();
        } else {
            console.error('Función limpiarDatosProduccion no disponible');
            return false;
        }
    },
    verEstado: () => {
        console.log('=== ESTADO DEL SISTEMA ===');
        console.log('Clientes:', db.getClientes ? db.getClientes().length : 'N/A');
        console.log('Productos:', db.getProductos ? db.getProductos().length : 'N/A');
        console.log('Pedidos:', db.getPedidos ? db.getPedidos().length : 'N/A');
        console.log('Personal:', db.getPersonal ? db.getPersonal().length : 'N/A');
        console.log('Asignaciones:', Object.keys(JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}')).length);
        console.log('Historial producción:', JSON.parse(localStorage.getItem('historial_produccion') || '[]').length);
        console.log('Notificaciones:', JSON.parse(localStorage.getItem('notificaciones_coco') || '[]').length);
    },
    sincronizar: () => {
        if (typeof ejecutarSincronizacionCompleta === 'function') {
            ejecutarSincronizacionCompleta();
            console.log('✅ Sincronización ejecutada');
        }
    }
};

console.log('🔧 Comandos de Admin disponibles:');
console.log('   ADMIN.limpiarTodo()      - Borra TODOS los datos');
console.log('   ADMIN.limpiarProduccion() - Solo datos de producción');
console.log('   ADMIN.verEstado()        - Ver estado del sistema');
console.log('   ADMIN.sincronizar()      - Forzar sincronización');

// ========================================
// DROPDOWN DE HERRAMIENTAS
// ========================================
function toggleDropdownTools() {
    const dropdown = document.getElementById('toolsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function cerrarDropdownTools() {
    const dropdown = document.getElementById('toolsDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
}

// Cerrar dropdown al hacer clic fuera
document.addEventListener('click', (e) => {
    const toolsBtn = document.getElementById('toolsBtn');
    const toolsDropdown = document.getElementById('toolsDropdown');

    if (toolsBtn && toolsDropdown) {
        if (!toolsBtn.contains(e.target) && !toolsDropdown.contains(e.target)) {
            toolsDropdown.classList.remove('show');
        }
    }
});

// Exponer funciones globalmente
window.toggleDropdownTools = toggleDropdownTools;
window.cerrarDropdownTools = cerrarDropdownTools;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTopBar();
    initModal();
    initSearchBox();
    loadDashboard();
    loadNotifications();
    initLiveUpdates();

    // Sincronización inicial de datos para otros paneles
    setTimeout(() => {
        if (typeof sincronizarOperadorasParaLogin === 'function') {
            sincronizarOperadorasParaLogin();
        }
        if (typeof sincronizarPedidosParaOperadoras === 'function') {
            sincronizarPedidosParaOperadoras();
        }
        // Sincronizar estado de operadores al inicio
        sincronizarEstadoOperadoresAlInicio();
        console.log('[ADMIN] Sincronización inicial ejecutada');
    }, 1500);
});

// Sincronizar estado de operadores al inicio de la aplicación
function sincronizarEstadoOperadoresAlInicio() {
    const estaciones = db.getEstaciones();
    const personal = db.getPersonal();

    // Asegurar que estadoOperadores exista
    if (!db.data.estadoOperadores) {
        db.data.estadoOperadores = [];
    }

    // Para cada estación con operador asignado, crear/actualizar su estado
    estaciones.forEach(est => {
        if (est.operadorId) {
            const operador = personal.find(p => p.id === est.operadorId);
            if (operador) {
                const existeIndex = db.data.estadoOperadores.findIndex(e => e.estacionId === est.id);

                if (existeIndex === -1) {
                    // Crear nuevo registro
                    db.data.estadoOperadores.push({
                        estacionId: est.id,
                        operadorId: operador.id,
                        iniciales: getIniciales(operador.nombre),
                        estado: 'inactivo',
                        efectividad: 0,
                        piezasHoy: 0,
                        tiempoActivo: 0,
                        ultimaActualizacion: new Date().toISOString()
                    });
                } else {
                    // Actualizar iniciales si faltaban
                    if (!db.data.estadoOperadores[existeIndex].iniciales) {
                        db.data.estadoOperadores[existeIndex].iniciales = getIniciales(operador.nombre);
                    }
                }
            }
        }
    });

    db.save();

    // Sincronizar con localStorage
    sincronizarEstacionesConPaneles();

    // Recargar mapa
    if (typeof loadPlantMap === 'function') {
        loadPlantMap();
    }

    console.log('[ADMIN] Estado de operadores sincronizado al inicio');
}

// ========================================
// NAVEGACIÓN
// ========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navigateTo(section);
        });
    });
}

function navigateTo(section) {
    // Actualizar nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    // Actualizar secciones
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${section}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    app.currentSection = section;

    // Cargar contenido de la sección
    loadSectionContent(section);
}

function loadSectionContent(section) {
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'pedidos':
            loadPedidos();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'productos':
            loadProductos();
            break;
        case 'procesos':
            loadProcesos();
            break;
        case 'personal':
            loadPersonal();
            break;
        case 'costeo':
            loadCosteo();
            break;
        case 'reportes':
            loadReportes();
            break;
        case 'portal-clientes':
            loadPortalClientes();
            break;
        case 'auditoria':
            loadAuditoria();
            break;
    }
}

// ========================================
// TOP BAR
// ========================================
function initTopBar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');

    menuToggle.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
            app.sidebarCollapsed = sidebar.classList.contains('collapsed');
        }
    });

    notificationsBtn.addEventListener('click', () => {
        notificationsPanel.classList.toggle('active');
    });

    // Cerrar panel al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!notificationsPanel.contains(e.target) && !notificationsBtn.contains(e.target)) {
            notificationsPanel.classList.remove('active');
        }
    });
}

// ========================================
// MODAL
// ========================================
function initModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('modalCancel');

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

function openModal(title, content, onConfirmOrFooter) {
    console.log('[openModal] Abriendo modal:', title);

    const overlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    if (!overlay || !modalTitle || !modalBody) {
        console.error('[openModal] Elementos del modal no encontrados:', {overlay: !!overlay, modalTitle: !!modalTitle, modalBody: !!modalBody});
        return;
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    console.log('[openModal] Contenido asignado, longitud:', content?.length || 0);

    // Si el tercer parámetro es un string, es un footer personalizado
    if (typeof onConfirmOrFooter === 'string') {
        modalFooter.innerHTML = onConfirmOrFooter;
        modalFooter.style.display = 'flex';
    } else if (onConfirmOrFooter === null) {
        // Si es null, ocultar el footer
        modalFooter.style.display = 'none';
    } else if (typeof onConfirmOrFooter === 'function') {
        // Si es función, usar el comportamiento original
        modalFooter.style.display = 'flex';
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" id="modalCancel">Cancelar</button>
            <button class="btn btn-primary" id="modalConfirm">Confirmar</button>
        `;
        document.getElementById('modalConfirm').onclick = () => {
            onConfirmOrFooter();
            closeModal();
        };
        document.getElementById('modalCancel').onclick = closeModal;
    } else {
        // Si no hay tercer parámetro, mostrar footer por defecto
        modalFooter.style.display = 'flex';
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `;
    }

    overlay.classList.add('active');
    console.log('[openModal] Modal activado');
}

function closeModal() {
    const modalFooter = document.getElementById('modalFooter');
    if (modalFooter) {
        modalFooter.style.display = 'flex';
    }
    document.getElementById('modalOverlay').classList.remove('active');
}

// ========================================
// DASHBOARD
// ========================================

// Calcula el costo real vs estimado de los pedidos activos
function calcularCostoRealVsEstimado() {
    const pedidos = db.getPedidos() || [];
    const pedidosActivos = pedidos.filter(p => {
        const estado = (p.estado || 'pendiente').toLowerCase();
        return !['entregado', 'cancelado', 'anulado'].includes(estado);
    });

    let costoEstimado = 0;
    let costoReal = 0;

    pedidosActivos.forEach(pedido => {
        costoEstimado += pedido.presupuestoEstimado || 0;
        costoReal += pedido.costoReal || 0;
    });

    // Si no hay datos de costos, retornar sin datos
    if (costoEstimado === 0 && costoReal === 0) {
        return { hayDatos: false, costoEstimado: 0, costoReal: 0, variacionPorcentaje: 0 };
    }

    // Si hay costo estimado, calcular variación
    let variacionPorcentaje = 0;
    if (costoEstimado > 0) {
        variacionPorcentaje = ((costoReal - costoEstimado) / costoEstimado) * 100;
    }

    return {
        hayDatos: true,
        costoEstimado,
        costoReal,
        variacionPorcentaje
    };
}

function loadDashboard() {
    const periodo = document.getElementById('periodFilter')?.value || 'month';
    const stats = db.getDashboardStats(periodo);

    // Actualizar KPIs principales
    document.getElementById('procesosActivos').textContent = stats.procesosActivos;
    document.getElementById('clientesActivos').textContent = stats.clientesActivos;
    document.getElementById('operadoresActivos').textContent = stats.operadoresActivos;
    document.getElementById('ventaTotal').textContent = '$' + stats.ventaTotal.toLocaleString();

    // Actualizar métricas de efectividad y presupuesto
    const efectividadEl = document.getElementById('efectividadPromedio');
    if (efectividadEl) {
        efectividadEl.textContent = stats.efectividadPromedio + '%';
        const barEfect = document.querySelector('.metric-bar-fill.efectividad');
        if (barEfect) barEfect.style.width = Math.min(stats.efectividadPromedio, 100) + '%';
    }

    // Calcular y mostrar Costo Real vs Estimado
    const costoEstimadoEl = document.getElementById('vsCostoEstimado');
    if (costoEstimadoEl) {
        const costos = calcularCostoRealVsEstimado();

        if (costos.hayDatos) {
            const variacion = costos.variacionPorcentaje;
            const signo = variacion >= 0 ? '+' : '';
            const clase = variacion > 0 ? 'text-danger' : 'text-success';
            costoEstimadoEl.innerHTML = `<span class="${clase}">${signo}${variacion.toFixed(1)}%</span>`;

            const barCostos = document.querySelector('.metric-bar-fill.costos');
            if (barCostos) {
                barCostos.classList.remove('over', 'under');
                barCostos.classList.add(variacion > 0 ? 'over' : 'under');
                barCostos.style.width = Math.min(Math.abs(variacion) + 50, 100) + '%';
            }

            const detalleCostos = document.getElementById('costoEstimadoDetalle');
            if (detalleCostos) {
                if (variacion > 0) {
                    detalleCostos.textContent = `Costo real $${costos.costoReal.toLocaleString()} > Estimado $${costos.costoEstimado.toLocaleString()}`;
                } else if (variacion < 0) {
                    detalleCostos.textContent = `Costo real $${costos.costoReal.toLocaleString()} < Estimado $${costos.costoEstimado.toLocaleString()}`;
                } else {
                    detalleCostos.textContent = 'Costos en línea con estimado';
                }
            }
        } else {
            costoEstimadoEl.innerHTML = '<span class="text-muted">--%</span>';
            const detalleCostos = document.getElementById('costoEstimadoDetalle');
            if (detalleCostos) detalleCostos.textContent = 'Sin datos de producción';
        }
    }

    // Actualizar label de operadores
    const opsLabel = document.getElementById('operatorsCountLabel');
    if (opsLabel) opsLabel.textContent = `${stats.operadoresActivos} operadores activos`;

    // Actualizar resumen de estados
    document.getElementById('summaryAdelantados').textContent = stats.resumenEstados.adelantados;
    document.getElementById('summaryOnPace').textContent = stats.resumenEstados.onPace;
    document.getElementById('summaryRetrasados').textContent = stats.resumenEstados.retrasados;
    document.getElementById('summarySinAsignar').textContent = stats.resumenEstados.sinAsignar;

    // Cargar mapa de planta
    loadPlantMap();

    // Cargar alertas
    loadAlertas();

    // Cargar pedidos pendientes por entregar
    loadPedidosPendientes();

    // Cargar pedidos críticos
    loadPedidosCriticos();

    // Cargar costo vs estimado
    loadCostoVsEstimado();

    // Evento para cambio de período
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter && !periodFilter.hasAttribute('data-initialized')) {
        periodFilter.setAttribute('data-initialized', 'true');
        periodFilter.addEventListener('change', loadDashboard);
    }
}

// ========================================
// MAPA DE PLANTA
// ========================================
function loadPlantMap() {
    const container = document.getElementById('plantMapContainer');
    if (!container) return;

    const mapaData = db.getMapaPlantaData();

    // Obtener datos de asignaciones reales de localStorage
    const asignacionesEstaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    const supervisoraMaquinas = JSON.parse(localStorage.getItem('supervisora_maquinas') || '{}');

    container.innerHTML = mapaData.map(area => {
        const posicionesHtml = area.posiciones.map(pos => {
            // Obtener estado real de la estación desde localStorage
            const asignacion = asignacionesEstaciones[pos.id];
            const estadoMaquina = estadoMaquinas[pos.id];
            const maquinaSupervisora = supervisoraMaquinas[pos.id];

            // Recopilar TODOS los procesos asignados a esta estación
            let procesosActivos = [];

            // Proceso activo de supervisora_maquinas
            if (maquinaSupervisora?.procesoId) {
                procesosActivos.push({
                    nombre: maquinaSupervisora.procesoNombre || 'Proceso',
                    estado: maquinaSupervisora.estado || 'asignado',
                    piezas: maquinaSupervisora.piezasCompletadas || 0
                });
            }

            // Cola de procesos de supervisora
            if (maquinaSupervisora?.colaProcesos && Array.isArray(maquinaSupervisora.colaProcesos)) {
                maquinaSupervisora.colaProcesos.forEach(proc => {
                    procesosActivos.push({
                        nombre: proc.procesoNombre || 'En cola',
                        estado: 'pendiente',
                        piezas: 0
                    });
                });
            }

            // PROCESOS SIMULTÁNEOS desde estado_maquinas (todos son activos)
            if (estadoMaquina?.procesosSimultaneos && Array.isArray(estadoMaquina.procesosSimultaneos)) {
                estadoMaquina.procesosSimultaneos.forEach(proc => {
                    if (!procesosActivos.some(p => p.nombre === proc.procesoNombre)) {
                        procesosActivos.push({
                            nombre: proc.procesoNombre || 'Proceso',
                            estado: 'en_proceso',
                            piezas: proc.piezasCompletadas || 0
                        });
                    }
                });
            }

            // Proceso de asignaciones_estaciones (si no está duplicado)
            if (asignacion?.procesoNombre && !procesosActivos.some(p => p.nombre === asignacion.procesoNombre)) {
                procesosActivos.push({
                    nombre: asignacion.procesoNombre,
                    estado: asignacion.estado || 'asignado',
                    piezas: asignacion.piezasCompletadas || 0
                });
            }

            // Cola de asignaciones_estaciones
            if (asignacion?.colaProcesos && Array.isArray(asignacion.colaProcesos)) {
                asignacion.colaProcesos.forEach(proc => {
                    if (!procesosActivos.some(p => p.nombre === proc.procesoNombre)) {
                        procesosActivos.push({
                            nombre: proc.procesoNombre || 'En cola',
                            estado: 'pendiente',
                            piezas: 0
                        });
                    }
                });
            }

            const totalProcesos = procesosActivos.length;
            const tieneAsignacion = totalProcesos > 0 || asignacion?.procesoNombre || estadoMaquina?.procesoNombre;
            const estaTrabajando = estadoMaquina?.estado === 'trabajando' || estadoMaquina?.procesoActivo ||
                                   maquinaSupervisora?.estado === 'trabajando' || procesosActivos.some(p => p.estado === 'trabajando' || p.estado === 'en_proceso');
            const piezasHoy = estadoMaquina?.piezasHoy || maquinaSupervisora?.piezasCompletadas || 0;
            const operadorNombre = asignacion?.operadoraNombre || estadoMaquina?.operadoraNombre || maquinaSupervisora?.operadoraNombre || pos.operadorNombre;

            // Determinar estado visual
            let estado = pos.estado || 'empty';
            let colorBorde = '';

            if (tieneAsignacion) {
                if (estaTrabajando || piezasHoy > 0) {
                    estado = 'trabajando';
                    colorBorde = '#10b981'; // Verde
                } else {
                    estado = 'asignado';
                    colorBorde = '#f59e0b'; // Naranja
                }
            } else if (operadorNombre) {
                estado = 'disponible';
                colorBorde = '#6b7280'; // Gris
            }

            // Construir texto de proceso(s)
            let procesoTexto = '';
            let procesoTooltip = '';
            if (totalProcesos > 1) {
                procesoTexto = `${totalProcesos} procesos`;
                procesoTooltip = procesosActivos.map(p => p.nombre).join(', ');
            } else if (totalProcesos === 1) {
                procesoTexto = procesosActivos[0].nombre;
                procesoTooltip = procesoTexto;
            } else {
                procesoTexto = asignacion?.procesoNombre || estadoMaquina?.procesoNombre || '';
                procesoTooltip = procesoTexto;
            }

            const tooltip = tieneAsignacion
                ? `${operadorNombre || 'Operador'} - ${procesoTooltip}${piezasHoy > 0 ? ` (${piezasHoy} pzas)` : ''}`
                : operadorNombre
                    ? `${operadorNombre} - Sin proceso`
                    : pos.nombre;

            if (!operadorNombre && !tieneAsignacion) {
                return `
                    <div class="workstation empty clickable" data-tooltip="${pos.nombre}" data-id="${pos.id}" onclick="showPosicionDetalle('${pos.id}')">
                        <span class="workstation-code">${pos.id}</span>
                    </div>
                `;
            }

            // Iniciales del operador
            const iniciales = operadorNombre
                ? operadorNombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : '??';

            // Badge de múltiples procesos
            const badgeMultiple = totalProcesos > 1 ? `<span class="workstation-multi-badge">${totalProcesos}</span>` : '';

            return `
                <div class="workstation ${estado} clickable" data-tooltip="${tooltip}" data-id="${pos.id}" onclick="showPosicionDetalle('${pos.id}')" style="${colorBorde ? `border-color: ${colorBorde}; border-width: 2px;` : ''}">
                    <span class="workstation-initials">${iniciales}</span>
                    <span class="workstation-code">${pos.id}</span>
                    ${tieneAsignacion ? `<span class="workstation-proceso" title="${procesoTooltip}">${procesoTexto.substring(0, 10)}${procesoTexto.length > 10 ? '..' : ''}</span>` : ''}
                    ${estaTrabajando ? '<span class="workstation-trabajando"><i class="fas fa-circle"></i></span>' : ''}
                    ${badgeMultiple}
                </div>
            `;
        }).join('');

        // Mostrar cantidad de posiciones para todas las áreas
        const posicionesLabel = area.posiciones.length > 0 ? ` (${area.posiciones.length} posiciones)` : '';

        return `
            <div class="map-area" style="border-color: ${area.color}20;">
                <div class="map-area-header" style="color: ${area.color};">
                    ${area.nombre}${posicionesLabel}
                </div>
                <div class="map-area-positions">
                    ${posicionesHtml}
                </div>
            </div>
        `;
    }).join('');

    // Actualizar contadores del resumen
    updatePlantMapSummary();
}

// Función para actualizar el mapa de planta (puede llamarse después de cambios)
function updatePlantMap() {
    loadPlantMap();
}

// Actualizar contadores del resumen del mapa
function updatePlantMapSummary() {
    const estadoOps = db.getEstadoOperadores();
    const estaciones = db.getEstaciones();

    const adelantados = estadoOps.filter(e => e.estado === 'adelantado').length;
    const onPace = estadoOps.filter(e => e.estado === 'on-pace').length;
    const retrasados = estadoOps.filter(e => e.estado === 'retrasado' || e.estado === 'muy-retrasado').length;
    const sinAsignar = estaciones.filter(e => e.operadorId === null).length;
    const operadoresActivos = estadoOps.filter(e => e.estado !== 'inactivo').length;

    // Actualizar elementos del DOM
    const summaryAdelantados = document.getElementById('summaryAdelantados');
    const summaryOnPace = document.getElementById('summaryOnPace');
    const summaryRetrasados = document.getElementById('summaryRetrasados');
    const summarySinAsignar = document.getElementById('summarySinAsignar');
    const operatorsCountLabel = document.getElementById('operatorsCountLabel');

    if (summaryAdelantados) summaryAdelantados.textContent = adelantados;
    if (summaryOnPace) summaryOnPace.textContent = onPace;
    if (summaryRetrasados) summaryRetrasados.textContent = retrasados;
    if (summarySinAsignar) summarySinAsignar.textContent = sinAsignar;
    if (operatorsCountLabel) operatorsCountLabel.textContent = `${operadoresActivos} operadores activos`;
}

// ========================================
// GESTIÓN DE ÁREAS DE PLANTA
// ========================================
function showGestionAreasPlanta() {
    const areasPlanta = db.getAreasPlanta();
    const estaciones = db.getEstaciones();

    const content = `
        <div class="areas-planta-manager">
            <div class="manager-header">
                <p class="text-muted">Gestiona las áreas de trabajo y sus posiciones/estaciones.</p>
            </div>

            <div class="areas-list" id="areasPlantaList">
                ${areasPlanta.map(area => {
                    const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
                    const ocupadas = estacionesArea.filter(e => e.operadorId).length;
                    return `
                        <div class="area-planta-card" style="border-left: 4px solid ${area.color}">
                            <div class="area-planta-info">
                                <div class="area-planta-header">
                                    <span class="area-planta-color" style="background: ${area.color}"></span>
                                    <h4>${area.nombre}</h4>
                                </div>
                                <div class="area-planta-stats">
                                    <span><i class="fas fa-desktop"></i> ${estacionesArea.length} posiciones</span>
                                    <span><i class="fas fa-user"></i> ${ocupadas} ocupadas</span>
                                </div>
                            </div>
                            <div class="area-planta-actions">
                                <button class="btn btn-sm btn-outline-primary" onclick="verEstacionesAreaModal('${area.id}')" title="Ver posiciones">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" onclick="editarAreaPlanta('${area.id}')" title="Editar área">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="eliminarAreaPlanta('${area.id}')" title="Eliminar área">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="add-area-section">
                <button class="btn btn-primary btn-block" onclick="showAgregarAreaPlanta()">
                    <i class="fas fa-plus"></i> Agregar Nueva Área
                </button>
            </div>
        </div>
    `;

    openModal('Gestión de Áreas de Planta', content, null);
}

function showAgregarAreaPlanta() {
    const colores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    const content = `
        <form id="formNuevaArea" class="form-nueva-area">
            <div class="form-group">
                <label>Nombre del Área *</label>
                <input type="text" name="nombre" required placeholder="Ej: Costura, Empaque, etc.">
            </div>

            <div class="form-group">
                <label>Color del Área</label>
                <div class="color-picker-grid">
                    ${colores.map((c, i) => `
                        <label class="color-option">
                            <input type="radio" name="color" value="${c}" ${i === 0 ? 'checked' : ''}>
                            <span class="color-swatch" style="background: ${c}"></span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="form-group">
                <label>Cantidad de Posiciones Iniciales</label>
                <input type="number" name="posiciones" value="1" min="0" max="50">
                <small class="text-muted">Puedes agregar más posiciones después</small>
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="showGestionAreasPlanta()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarNuevaAreaPlanta()">
            <i class="fas fa-save"></i> Guardar
        </button>
    `;

    openModal('Nueva Área de Planta', content, footer);
}

function guardarNuevaAreaPlanta() {
    const form = document.getElementById('formNuevaArea');
    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const color = form.querySelector('[name="color"]:checked')?.value || '#3b82f6';
    const posiciones = parseInt(form.querySelector('[name="posiciones"]').value) || 0;

    if (!nombre) {
        showToast('El nombre del área es requerido', 'error');
        return;
    }

    // Crear ID del área
    const areaId = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);

    // Verificar si ya existe
    const areasExistentes = db.getAreasPlanta();
    if (areasExistentes.some(a => a.id === areaId)) {
        showToast('Ya existe un área con ese nombre', 'error');
        return;
    }

    // Agregar área
    const nuevaArea = {
        id: areaId,
        nombre: nombre,
        posiciones: posiciones,
        color: color
    };
    db.addAreaPlanta(nuevaArea);

    // Crear estaciones para esta área
    for (let i = 1; i <= posiciones; i++) {
        const estacionId = `${areaId.toUpperCase().substring(0, 3)}-${i}`;
        db.addEstacion({
            id: estacionId,
            nombre: `${nombre} ${i}`,
            areaPlantaId: areaId,
            operadorId: null,
            tipo: 'estacion'
        });
    }

    showToast(`Área "${nombre}" creada con ${posiciones} posiciones`, 'success');
    loadPlantMap();
    showGestionAreasPlanta();
}

function editarAreaPlanta(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    if (!area) return;

    const colores = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const estacionesArea = db.getEstaciones().filter(e => e.areaPlantaId === areaId);

    const content = `
        <form id="formEditarArea" data-area-id="${areaId}">
            <div class="form-group">
                <label>Nombre del Área *</label>
                <input type="text" name="nombre" value="${area.nombre}" required>
            </div>

            <div class="form-group">
                <label>Color del Área</label>
                <div class="color-picker-grid">
                    ${colores.map(c => `
                        <label class="color-option">
                            <input type="radio" name="color" value="${c}" ${area.color === c ? 'checked' : ''}>
                            <span class="color-swatch" style="background: ${c}"></span>
                        </label>
                    `).join('')}
                </div>
            </div>

            <div class="form-group">
                <label>Posiciones Actuales: ${estacionesArea.length}</label>
                <div class="posiciones-actions">
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="agregarPosicionesArea('${areaId}')">
                        <i class="fas fa-plus"></i> Agregar Posiciones
                    </button>
                </div>
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="showGestionAreasPlanta()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarEdicionAreaPlanta('${areaId}')">
            <i class="fas fa-save"></i> Guardar
        </button>
    `;

    openModal('Editar Área: ' + area.nombre, content, footer);
}

function guardarEdicionAreaPlanta(areaId) {
    const form = document.getElementById('formEditarArea');
    const nombre = form.querySelector('[name="nombre"]').value.trim();
    const color = form.querySelector('[name="color"]:checked')?.value;

    if (!nombre) {
        showToast('El nombre del área es requerido', 'error');
        return;
    }

    db.updateAreaPlanta(areaId, { nombre, color });
    showToast('Área actualizada correctamente', 'success');
    loadPlantMap();
    showGestionAreasPlanta();
}

function agregarPosicionesArea(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    if (!area) return;

    const estacionesExistentes = db.getEstaciones().filter(e => e.areaPlantaId === areaId);
    const ultimoNumero = estacionesExistentes.length;

    const content = `
        <form id="formAgregarPosiciones">
            <div class="form-group">
                <label>Área: ${area.nombre}</label>
                <p class="text-muted">Posiciones actuales: ${estacionesExistentes.length}</p>
            </div>
            <div class="form-group">
                <label>Cantidad de posiciones a agregar</label>
                <input type="number" name="cantidad" value="1" min="1" max="20">
            </div>
        </form>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="editarAreaPlanta('${areaId}')">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarAgregarPosiciones('${areaId}', ${ultimoNumero})">
            <i class="fas fa-plus"></i> Agregar
        </button>
    `;

    openModal('Agregar Posiciones', content, footer);
}

function confirmarAgregarPosiciones(areaId, ultimoNumero) {
    const form = document.getElementById('formAgregarPosiciones');
    const cantidad = parseInt(form.querySelector('[name="cantidad"]').value) || 1;
    const area = db.getAreasPlanta().find(a => a.id === areaId);

    console.log('Agregando posiciones:', { areaId, cantidad, ultimoNumero });

    for (let i = 1; i <= cantidad; i++) {
        const nuevoNumero = ultimoNumero + i;
        const estacionId = `${areaId.toUpperCase().substring(0, 3)}-${nuevoNumero}`;
        db.addEstacion({
            id: estacionId,
            nombre: `${area.nombre} ${nuevoNumero}`,
            areaPlantaId: areaId,
            operadorId: null,
            tipo: 'estacion'
        });
    }

    // Actualizar el contador de posiciones del área
    const nuevaCantidadTotal = db.getEstaciones().filter(e => e.areaPlantaId === areaId).length;
    db.updateAreaPlanta(areaId, { posiciones: nuevaCantidadTotal });

    console.log('Posiciones guardadas. Total en área:', nuevaCantidadTotal);

    showToast(`${cantidad} posicion(es) agregada(s) al área ${area.nombre}`, 'success');
    loadPlantMap();
    editarAreaPlanta(areaId);
}

function eliminarAreaPlanta(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    if (!area) return;

    const estacionesArea = db.getEstaciones().filter(e => e.areaPlantaId === areaId);
    const ocupadas = estacionesArea.filter(e => e.operadorId).length;

    if (ocupadas > 0) {
        showToast(`No se puede eliminar el área. Tiene ${ocupadas} posiciones ocupadas.`, 'error');
        return;
    }

    const content = `
        <div class="confirm-delete">
            <i class="fas fa-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
            <h4>¿Eliminar área "${area.nombre}"?</h4>
            <p class="text-muted">Esta acción eliminará el área y sus ${estacionesArea.length} posiciones.</p>
            <p class="text-danger"><strong>Esta acción no se puede deshacer.</strong></p>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="showGestionAreasPlanta()">Cancelar</button>
        <button class="btn btn-danger" onclick="confirmarEliminarArea('${areaId}')">
            <i class="fas fa-trash"></i> Eliminar
        </button>
    `;

    openModal('Confirmar Eliminación', content, footer);
}

function confirmarEliminarArea(areaId) {
    db.deleteAreaPlanta(areaId);
    showToast('Área eliminada correctamente', 'success');
    loadPlantMap();
    showGestionAreasPlanta();
}

function verEstacionesAreaModal(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    if (!area) return;

    const estaciones = db.getEstaciones().filter(e => e.areaPlantaId === areaId);
    const personal = db.getPersonal();
    const estadoOps = db.getEstadoOperadores();

    const content = `
        <div class="area-estaciones-modal">
            <div class="area-info-header" style="border-left: 4px solid ${area.color}; padding-left: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0; color: ${area.color}">${area.nombre}</h4>
                <p class="text-muted">${estaciones.length} posiciones</p>
            </div>

            <div class="estaciones-list">
                ${estaciones.length === 0 ? `
                    <p class="text-muted text-center">No hay posiciones en esta área</p>
                ` : estaciones.map(est => {
                    const operador = est.operadorId ? personal.find(p => p.id === est.operadorId) : null;
                    const estado = estadoOps.find(e => e.estacionId === est.id);
                    return `
                        <div class="estacion-list-item ${operador ? 'ocupada' : 'libre'}">
                            <div class="estacion-list-info">
                                <span class="estacion-list-id" id="estacion-id-${est.id}">${est.id}</span>
                                <span class="estacion-list-nombre">${est.nombre}</span>
                            </div>
                            <div class="estacion-list-operador">
                                ${operador ? `
                                    <span class="badge badge-${estado?.estado || 'empty'}">${operador.nombre}</span>
                                ` : `
                                    <span class="badge badge-empty">Vacante</span>
                                `}
                            </div>
                            <div class="estacion-list-actions">
                                <button class="btn btn-xs btn-outline-primary" onclick="renombrarEstacion('${est.id}', '${areaId}')" title="Renombrar posición">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-xs btn-outline-danger" onclick="eliminarEstacion('${est.id}', '${areaId}')" title="Eliminar posición" ${operador ? 'disabled' : ''}>
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="agregar-posicion-quick mt-2">
                <button class="btn btn-outline-primary btn-block" onclick="agregarPosicionesArea('${areaId}')">
                    <i class="fas fa-plus"></i> Agregar Posiciones
                </button>
            </div>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="showGestionAreasPlanta()">Volver</button>
    `;

    openModal('Posiciones: ' + area.nombre, content, footer);
}

function eliminarEstacion(estacionId, areaId) {
    const estacion = db.getEstacion(estacionId);
    if (!estacion) return;

    if (estacion.operadorId) {
        showToast('No se puede eliminar una posición ocupada', 'error');
        return;
    }

    // Eliminar la estación
    db.deleteEstacion(estacionId);
    showToast('Posición eliminada', 'success');
    loadPlantMap();
    verEstacionesAreaModal(areaId);
}

function eliminarEstacionConConfirm(estacionId, areaId) {
    const estacion = db.getEstacion(estacionId);
    if (!estacion) return;

    if (estacion.operadorId) {
        showToast('No se puede eliminar una posición con operador asignado', 'error');
        return;
    }

    if (confirm(`¿Eliminar la posición "${estacionId}" (${estacion.nombre})?`)) {
        db.deleteEstacion(estacionId);
        showToast('Posición eliminada', 'success');
        loadPlantMap();
        if (typeof loadProcesos === 'function') loadProcesos();
        verEstacionesArea(areaId);
    }
}

// ========================================
// RENOMBRAR ESTACIÓN/POSICIÓN
// ========================================
function renombrarEstacion(estacionId, areaId) {
    const estacion = db.getEstacion(estacionId);
    if (!estacion) return;

    const content = `
        <div class="renombrar-estacion-form">
            <p class="text-muted mb-2">
                Cambia el ID de la posición para que coincida con el mapa físico de la planta.
            </p>
            <div class="form-group">
                <label>ID Actual</label>
                <input type="text" value="${estacion.id}" disabled class="input-disabled">
            </div>
            <div class="form-group">
                <label>Nuevo ID de Posición *</label>
                <input type="text" id="nuevoIdEstacion" value="${estacion.id}" required
                    placeholder="Ej: C1, C2, M1, E1..." maxlength="10"
                    style="text-transform: uppercase;">
                <small class="form-hint">Usa un identificador corto y único (ej: C1, C2, M1, E1)</small>
            </div>
            <div class="form-group">
                <label>Nombre Descriptivo</label>
                <input type="text" id="nuevoNombreEstacion" value="${estacion.nombre}"
                    placeholder="Ej: Costura 1, Mesa 1...">
            </div>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="verEstacionesAreaModal('${areaId}')">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarRenombrarEstacion('${estacion.id}', '${areaId}')">
            <i class="fas fa-save"></i> Guardar Cambios
        </button>
    `;

    openModal('Renombrar Posición', content, footer);
}

function confirmarRenombrarEstacion(estacionIdActual, areaId) {
    const nuevoId = document.getElementById('nuevoIdEstacion').value.trim().toUpperCase();
    const nuevoNombre = document.getElementById('nuevoNombreEstacion').value.trim();

    if (!nuevoId) {
        showToast('El ID de posición es requerido', 'error');
        return;
    }

    // Verificar que el nuevo ID no exista ya (si es diferente al actual)
    if (nuevoId !== estacionIdActual) {
        const existente = db.getEstacion(nuevoId);
        if (existente) {
            showToast(`Ya existe una posición con el ID "${nuevoId}"`, 'error');
            return;
        }
    }

    // Obtener la estación actual
    const estacionActual = db.getEstacion(estacionIdActual);
    if (!estacionActual) {
        showToast('Estación no encontrada', 'error');
        return;
    }

    // Si el ID cambió, necesitamos actualizar todas las referencias
    if (nuevoId !== estacionIdActual) {
        // Actualizar en la lista de estaciones
        const estaciones = db.data.estaciones;
        const index = estaciones.findIndex(e => e.id === estacionIdActual);
        if (index !== -1) {
            estaciones[index].id = nuevoId;
            estaciones[index].nombre = nuevoNombre || nuevoId;
        }

        // Actualizar en personal (posiciones asignadas)
        const personal = db.data.personal || [];
        personal.forEach(emp => {
            if (emp.posiciones && emp.posiciones.includes(estacionIdActual)) {
                const posIndex = emp.posiciones.indexOf(estacionIdActual);
                if (posIndex !== -1) {
                    emp.posiciones[posIndex] = nuevoId;
                }
            }
        });

        // Actualizar en estadoOperadores
        const estadoOps = db.data.estadoOperadores || [];
        estadoOps.forEach(estado => {
            if (estado.estacionId === estacionIdActual) {
                estado.estacionId = nuevoId;
            }
        });

        // Actualizar en localStorage de sincronización
        actualizarEstacionEnSincronizacion(estacionIdActual, nuevoId);

        db.save();
        showToast(`Posición renombrada de "${estacionIdActual}" a "${nuevoId}"`, 'success');
    } else {
        // Solo cambió el nombre
        const estaciones = db.data.estaciones;
        const index = estaciones.findIndex(e => e.id === estacionIdActual);
        if (index !== -1) {
            estaciones[index].nombre = nuevoNombre || estacionIdActual;
        }
        db.save();
        showToast('Nombre actualizado', 'success');
    }

    // Recargar vistas
    loadPlantMap();
    sincronizarEstacionesConPaneles();
    verEstacionesAreaModal(areaId);
}

function actualizarEstacionEnSincronizacion(idAnterior, idNuevo) {
    // Actualizar asignaciones_estaciones
    const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    if (asignaciones[idAnterior]) {
        asignaciones[idNuevo] = asignaciones[idAnterior];
        delete asignaciones[idAnterior];
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    // Actualizar estado_maquinas
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    if (estadoMaquinas[idAnterior]) {
        estadoMaquinas[idNuevo] = estadoMaquinas[idAnterior];
        delete estadoMaquinas[idAnterior];
        localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));
    }
}

function sincronizarEstacionesConPaneles() {
    // Sincronizar estaciones con el panel de supervisora
    const estaciones = db.getEstaciones();
    const personal = db.getPersonal();

    // Crear mapa de estaciones para supervisora
    const mapaEstaciones = {};
    estaciones.forEach(est => {
        const operador = est.operadorId ? personal.find(p => p.id === est.operadorId) : null;
        mapaEstaciones[est.id] = {
            id: est.id,
            nombre: est.nombre,
            areaPlantaId: est.areaPlantaId,
            operadorId: est.operadorId,
            operadorNombre: operador ? operador.nombre : null,
            operadorIniciales: operador ? getIniciales(operador.nombre) : null
        };
    });

    localStorage.setItem('mapa_estaciones_planta', JSON.stringify(mapaEstaciones));

    // También actualizar estado_maquinas para supervisora
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    estaciones.forEach(est => {
        if (est.operadorId) {
            const operador = personal.find(p => p.id === est.operadorId);
            if (operador) {
                // Siempre actualizar o crear el estado de la máquina
                estadoMaquinas[est.id] = {
                    estacionId: est.id,
                    operadorId: est.operadorId,
                    operadorNombre: operador.nombre,
                    iniciales: getIniciales(operador.nombre),
                    estado: estadoMaquinas[est.id]?.estado || 'inactivo',
                    efectividad: estadoMaquinas[est.id]?.efectividad || 0,
                    piezasHoy: estadoMaquinas[est.id]?.piezasHoy || 0,
                    ultimaActualizacion: new Date().toISOString()
                };
            }
        } else {
            // Si no hay operador asignado, limpiar el estado
            if (estadoMaquinas[est.id]) {
                delete estadoMaquinas[est.id];
            }
        }
    });
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    // También sincronizar estadoOperadores en la DB
    sincronizarEstadoOperadoresDB();

    console.log('[SYNC] Estaciones sincronizadas con paneles:', Object.keys(mapaEstaciones).length);
}

function sincronizarEstadoOperadoresDB() {
    // Sincronizar estaciones con estadoOperadores en la DB
    const estaciones = db.getEstaciones();
    const personal = db.getPersonal();

    if (!db.data.estadoOperadores) {
        db.data.estadoOperadores = [];
    }

    estaciones.forEach(est => {
        const existeIndex = db.data.estadoOperadores.findIndex(e => e.estacionId === est.id);

        if (est.operadorId) {
            const operador = personal.find(p => p.id === est.operadorId);
            if (operador) {
                const nuevoEstado = {
                    estacionId: est.id,
                    operadorId: est.operadorId,
                    iniciales: getIniciales(operador.nombre),
                    estado: existeIndex !== -1 ? db.data.estadoOperadores[existeIndex].estado : 'inactivo',
                    efectividad: existeIndex !== -1 ? db.data.estadoOperadores[existeIndex].efectividad : 0,
                    piezasHoy: existeIndex !== -1 ? db.data.estadoOperadores[existeIndex].piezasHoy : 0,
                    tiempoActivo: existeIndex !== -1 ? db.data.estadoOperadores[existeIndex].tiempoActivo : 0,
                    ultimaActualizacion: new Date().toISOString()
                };

                if (existeIndex !== -1) {
                    db.data.estadoOperadores[existeIndex] = nuevoEstado;
                } else {
                    db.data.estadoOperadores.push(nuevoEstado);
                }
            }
        } else {
            // Si no hay operador, eliminar el estado de esa estación
            if (existeIndex !== -1) {
                db.data.estadoOperadores.splice(existeIndex, 1);
            }
        }
    });

    db.save();
}

function crearEstadoOperadorEnMapa(empleado, estacionId) {
    // Crear estado en estadoOperadores de la DB
    if (!db.data.estadoOperadores) {
        db.data.estadoOperadores = [];
    }

    // Verificar si ya existe
    const existeIndex = db.data.estadoOperadores.findIndex(e => e.estacionId === estacionId);
    const nuevoEstado = {
        estacionId: estacionId,
        operadorId: empleado.id,
        iniciales: getIniciales(empleado.nombre),
        estado: 'inactivo', // inactivo, produciendo, pausa, alerta
        efectividad: 0,
        piezasHoy: 0,
        tiempoActivo: 0,
        ultimaActualizacion: new Date().toISOString()
    };

    if (existeIndex !== -1) {
        // Actualizar registro existente manteniendo algunos datos
        db.data.estadoOperadores[existeIndex].operadorId = empleado.id;
        db.data.estadoOperadores[existeIndex].iniciales = getIniciales(empleado.nombre);
        db.data.estadoOperadores[existeIndex].ultimaActualizacion = new Date().toISOString();
    } else {
        // Crear nuevo registro
        db.data.estadoOperadores.push(nuevoEstado);
    }
    db.save();

    // También actualizar localStorage para sincronización inmediata
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    estadoMaquinas[estacionId] = {
        estacionId: estacionId,
        operadorId: empleado.id,
        operadorNombre: empleado.nombre,
        iniciales: getIniciales(empleado.nombre),
        estado: 'inactivo',
        ultimaActualizacion: new Date().toISOString()
    };
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    console.log(`[MAPA] Operador ${empleado.nombre} asignado a estación ${estacionId}`);
}

function eliminarEstadoOperadorDeMapa(estacionId) {
    // Eliminar de estadoOperadores en la DB
    if (db.data.estadoOperadores) {
        const index = db.data.estadoOperadores.findIndex(e => e.estacionId === estacionId);
        if (index !== -1) {
            db.data.estadoOperadores.splice(index, 1);
            db.save();
        }
    }

    // Eliminar de localStorage
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    if (estadoMaquinas[estacionId]) {
        delete estadoMaquinas[estacionId];
        localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));
    }

    console.log(`[MAPA] Estación ${estacionId} desasignada`);
}

// ========================================
// ALERTAS
// ========================================
function loadAlertas() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;

    // Generar alertas dinámicas basadas en datos reales
    const alertas = generarAlertasDinamicas();

    if (alertas.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No hay alertas activas</p>';
        return;
    }

    container.innerHTML = alertas.slice(0, 3).map((alerta, index) => `
        <div class="alert-card ${alerta.tipo}">
            <div class="alert-icon">
                <i class="fas ${alerta.tipo === 'warning' ? 'fa-exclamation-circle' : alerta.tipo === 'danger' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
            </div>
            <div class="alert-content">
                <span class="alert-title">${alerta.titulo}</span>
                <span class="alert-detail">${alerta.mensaje}</span>
            </div>
            ${alerta.accion ? `<button class="btn-small" onclick="${alerta.accion}">Revisar</button>` : ''}
        </div>
    `).join('');
}

// Genera alertas dinámicas basadas en el estado actual del sistema
function generarAlertasDinamicas() {
    const alertas = [];
    const pedidos = db.getPedidos() || [];
    const hoy = new Date();

    // Alerta: Pedidos atrasados
    pedidos.forEach(pedido => {
        if (!pedido.fechaEntrega) return;
        const entrega = new Date(pedido.fechaEntrega);
        const diasRestantes = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));
        const estado = (pedido.estado || '').toLowerCase();

        // Solo alertar si no está entregado/cancelado
        if (['entregado', 'cancelado', 'anulado'].includes(estado)) return;

        if (diasRestantes < 0) {
            alertas.push({
                tipo: 'danger',
                titulo: 'Pedido atrasado',
                mensaje: `Pedido #${pedido.id} tiene ${Math.abs(diasRestantes)} días de atraso`,
                accion: `viewPedido(${pedido.id})`
            });
        } else if (diasRestantes <= 2) {
            const productosArr = pedido.productos || [];
            const totalCantidad = productosArr.reduce((sum, p) => sum + (p.cantidad || 0), 0);
            const totalCompletadas = productosArr.reduce((sum, p) => sum + (p.completadas || 0), 0);
            const avance = totalCantidad > 0 ? Math.round((totalCompletadas / totalCantidad) * 100) : 0;

            if (avance < 80) {
                alertas.push({
                    tipo: 'warning',
                    titulo: 'Pedido en riesgo',
                    mensaje: `Pedido #${pedido.id} entrega en ${diasRestantes} días con ${avance}% avance`,
                    accion: `viewPedido(${pedido.id})`
                });
            }
        }
    });

    // Alerta: Pedidos sin asignar (pendientes sin procesos iniciados)
    const pedidosSinAsignar = pedidos.filter(p => {
        const estado = (p.estado || 'pendiente').toLowerCase();
        return estado === 'pendiente';
    });

    if (pedidosSinAsignar.length > 0) {
        alertas.push({
            tipo: 'info',
            titulo: 'Pedidos sin asignar',
            mensaje: `Hay ${pedidosSinAsignar.length} pedido(s) pendiente(s) de asignación`,
            accion: `showSection('pedidos')`
        });
    }

    return alertas;
}

// ========================================
// PEDIDOS CRÍTICOS
// ========================================
function loadPedidosCriticos() {
    const tbody = document.getElementById('criticalOrdersTable');
    if (!tbody) return;

    const pedidos = filtrarPedidosActivos(db.getPedidos() || []);
    const clientes = db.getClientes() || [];
    const productos = db.getProductos() || [];

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay pedidos críticos</td></tr>';
        return;
    }

    // Ordenar por fecha de entrega
    pedidos.sort((a, b) => new Date(a.fechaEntrega || '2099-12-31') - new Date(b.fechaEntrega || '2099-12-31'));

    tbody.innerHTML = pedidos.slice(0, 5).map(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);
        const productosArr = pedido.productos || [];
        const totalCantidad = productosArr.reduce((sum, p) => sum + (p.cantidad || 0), 0);
        const totalCompletadas = productosArr.reduce((sum, p) => sum + (p.completadas || 0), 0);
        const avance = totalCantidad > 0 ? Math.round((totalCompletadas / totalCantidad) * 100) : 0;

        const hoy = new Date();
        const entrega = new Date(pedido.fechaEntrega || '2099-12-31');
        const diasRestantes = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));

        let estado = 'success';
        let estadoTexto = 'En Tiempo';
        let rowClass = '';

        if (diasRestantes < 0) {
            estado = 'danger';
            estadoTexto = 'Atrasado';
            rowClass = 'status-danger';
        } else if (diasRestantes <= 2 && avance < 80) {
            estado = 'warning';
            estadoTexto = 'En Riesgo';
            rowClass = 'status-warning';
        }

        const productoNombre = productosArr.length > 0
            ? productos.find(pr => pr.id === productosArr[0].productoId)?.nombre || 'N/A'
            : 'N/A';

        return `
            <tr class="${rowClass}">
                <td><strong>#${pedido.id}</strong></td>
                <td>${cliente?.nombreComercial || 'N/A'}</td>
                <td>${productoNombre.substring(0, 25)}${productoNombre.length > 25 ? '...' : ''}</td>
                <td>${totalCantidad.toLocaleString()}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${avance}%"></div>
                        <span>${avance}%</span>
                    </div>
                </td>
                <td>${formatDate(pedido.fechaEntrega)}</td>
                <td><span class="status-badge ${estado}">${estadoTexto}</span></td>
                <td>
                    <button class="btn-icon-small" onclick="viewPedido(${pedido.id})"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon-small" onclick="showEditarPedido(${pedido.id})"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

// ========================================
// COSTO VS ESTIMADO
// ========================================
function loadCostoVsEstimado() {
    const container = document.getElementById('costComparisonContainer');
    if (!container) return;

    const periodo = document.getElementById('costPeriodFilter')?.value || 'month';
    const pedidos = db.getPedidos();
    const clientes = db.getClientes();
    const productos = db.getProductos();

    // Filtrar pedidos por periodo
    const hoy = new Date();
    let fechaInicio = new Date();

    switch(periodo) {
        case 'day':
            fechaInicio.setHours(0, 0, 0, 0);
            break;
        case 'week':
            fechaInicio.setDate(hoy.getDate() - 7);
            break;
        case 'month':
            fechaInicio.setMonth(hoy.getMonth() - 1);
            break;
        case 'bimester':
            fechaInicio.setMonth(hoy.getMonth() - 2);
            break;
        case 'semester':
            fechaInicio.setMonth(hoy.getMonth() - 6);
            break;
        case 'year':
            fechaInicio.setFullYear(hoy.getFullYear() - 1);
            break;
    }

    // Filtrar pedidos en el periodo (usando fecha de carga)
    const pedidosFiltrados = pedidos.filter(p => {
        const fechaCarga = new Date(p.fechaCarga);
        return fechaCarga >= fechaInicio && (p.presupuestoEstimado > 0 || p.costoReal > 0);
    });

    // Calcular totales
    let totalPresupuesto = 0;
    let totalCostoReal = 0;

    // Crear datos por producto
    const datosPorProducto = [];

    pedidosFiltrados.forEach(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);

        pedido.productos.forEach(prod => {
            const producto = productos.find(p => p.id === prod.productoId);
            if (!producto) return;

            // Estimar costo por producto basado en proporción
            const totalPiezasPedido = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);
            const proporcion = prod.cantidad / totalPiezasPedido;
            const presupuestoProducto = (pedido.presupuestoEstimado || 0) * proporcion;
            const costoRealProducto = (pedido.costoReal || 0) * proporcion;

            const existente = datosPorProducto.find(d => d.productoId === prod.productoId);
            if (existente) {
                existente.presupuesto += presupuestoProducto;
                existente.costoReal += costoRealProducto;
                existente.piezas += prod.cantidad;
            } else {
                datosPorProducto.push({
                    productoId: prod.productoId,
                    productoNombre: producto.nombre,
                    clienteNombre: cliente?.nombreComercial || 'N/A',
                    presupuesto: presupuestoProducto,
                    costoReal: costoRealProducto,
                    piezas: prod.cantidad
                });
            }

            totalPresupuesto += presupuestoProducto;
            totalCostoReal += costoRealProducto;
        });
    });

    // Calcular variación y estado para cada producto
    datosPorProducto.forEach(d => {
        d.variacion = d.presupuesto > 0 ? ((d.costoReal - d.presupuesto) / d.presupuesto) * 100 : 0;
        d.variacion = Math.round(d.variacion * 10) / 10;
        d.estado = d.variacion > 5 ? 'danger' : d.variacion > 0 ? 'warning' : 'success';
        d.costoPorPieza = d.piezas > 0 ? d.costoReal / d.piezas : 0;
        d.presupuestoPorPieza = d.piezas > 0 ? d.presupuesto / d.piezas : 0;
    });

    // Ordenar por variación (mayor primero)
    datosPorProducto.sort((a, b) => b.variacion - a.variacion);

    const variacionTotal = totalPresupuesto > 0 ? ((totalCostoReal - totalPresupuesto) / totalPresupuesto) * 100 : 0;
    const variacionTotalRounded = Math.round(variacionTotal * 10) / 10;

    const periodoLabel = {
        'day': 'Hoy',
        'week': 'Esta Semana',
        'month': 'Este Mes',
        'bimester': 'Bimestre',
        'semester': 'Semestre',
        'year': 'Año'
    }[periodo];

    container.innerHTML = `
        <div class="cost-kpi-grid">
            <div class="cost-kpi-card">
                <div class="cost-kpi-icon blue"><i class="fas fa-file-invoice-dollar"></i></div>
                <div class="cost-kpi-info">
                    <span class="cost-kpi-value">$${totalPresupuesto.toLocaleString()}</span>
                    <span class="cost-kpi-label">Presupuesto Estimado</span>
                </div>
            </div>
            <div class="cost-kpi-card">
                <div class="cost-kpi-icon ${variacionTotalRounded > 5 ? 'red' : variacionTotalRounded > 0 ? 'orange' : 'green'}"><i class="fas fa-receipt"></i></div>
                <div class="cost-kpi-info">
                    <span class="cost-kpi-value">$${totalCostoReal.toLocaleString()}</span>
                    <span class="cost-kpi-label">Costo Real</span>
                </div>
            </div>
            <div class="cost-kpi-card ${variacionTotalRounded > 5 ? 'highlight-danger' : variacionTotalRounded > 0 ? 'highlight-warning' : 'highlight-success'}">
                <div class="cost-kpi-icon ${variacionTotalRounded > 5 ? 'red' : variacionTotalRounded > 0 ? 'orange' : 'green'}"><i class="fas fa-percentage"></i></div>
                <div class="cost-kpi-info">
                    <span class="cost-kpi-value">${variacionTotalRounded > 0 ? '+' : ''}${variacionTotalRounded}%</span>
                    <span class="cost-kpi-label">Variación Total</span>
                </div>
            </div>
        </div>

        ${datosPorProducto.length > 0 ? `
            <div class="cost-table-container">
                <table class="data-table" id="tablaCostoVsEstimado">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cliente</th>
                            <th>Piezas</th>
                            <th>Presupuesto</th>
                            <th>Costo Real</th>
                            <th>$/Pieza Est.</th>
                            <th>$/Pieza Real</th>
                            <th>Variación</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${datosPorProducto.map(d => `
                            <tr>
                                <td><strong>${d.productoNombre.substring(0, 30)}${d.productoNombre.length > 30 ? '...' : ''}</strong></td>
                                <td>${d.clienteNombre}</td>
                                <td>${d.piezas.toLocaleString()}</td>
                                <td>$${d.presupuesto.toLocaleString()}</td>
                                <td>$${d.costoReal.toLocaleString()}</td>
                                <td>$${d.presupuestoPorPieza.toFixed(2)}</td>
                                <td>$${d.costoPorPieza.toFixed(2)}</td>
                                <td>
                                    <span class="status-badge ${d.estado}">
                                        ${d.variacion > 0 ? '+' : ''}${d.variacion}%
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="cost-export-action">
                <button class="btn btn-secondary btn-sm" onclick="exportTableToExcel('tablaCostoVsEstimado', 'costo_vs_estimado')">
                    <i class="fas fa-file-excel"></i> Exportar a Excel
                </button>
            </div>
        ` : `
            <div class="text-center text-muted" style="padding:30px">
                <i class="fas fa-chart-pie" style="font-size:2rem; margin-bottom:10px; display:block"></i>
                No hay datos de costos para el periodo seleccionado (${periodoLabel})
            </div>
        `}
    `;
}

// ========================================
// PEDIDOS PENDIENTES POR ENTREGAR
// ========================================
function loadPedidosPendientes() {
    console.log('[loadPedidosPendientes] === INICIANDO ===');

    const tbody = document.getElementById('pendingDeliveryTable');
    if (!tbody) {
        console.error('[loadPedidosPendientes] ERROR: Tabla pendingDeliveryTable NO ENCONTRADA');
        return;
    }
    console.log('[loadPedidosPendientes] Tabla encontrada OK');

    // Verificar que db existe
    if (typeof db === 'undefined') {
        console.error('[loadPedidosPendientes] ERROR: db no está definido');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error: Base de datos no disponible</td></tr>';
        return;
    }

    let todosPedidos = [];
    try {
        todosPedidos = db.getPedidos() || [];
        console.log('[loadPedidosPendientes] Total pedidos en DB:', todosPedidos.length);
        if (todosPedidos.length > 0) {
            console.log('[loadPedidosPendientes] Pedidos raw:', JSON.stringify(todosPedidos.map(p => ({id: p.id, estado: p.estado}))));
        } else {
            console.warn('[loadPedidosPendientes] ADVERTENCIA: No hay pedidos en la base de datos');
        }
    } catch (e) {
        console.error('[loadPedidosPendientes] ERROR al obtener pedidos:', e);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al obtener pedidos: ' + e.message + '</td></tr>';
        return;
    }

    // Mostrar TODOS los pedidos que NO estén entregados
    const estadosEntregados = ['entregado', 'cancelado', 'anulado'];
    const pedidos = todosPedidos.filter(p => {
        const estado = (p.estado || 'pendiente').toLowerCase().trim();
        const incluir = !estadosEntregados.includes(estado);
        console.log(`[loadPedidosPendientes] Pedido #${p.id} estado="${estado}" -> incluir=${incluir}`);
        return incluir;
    });

    console.log('[loadPedidosPendientes] Pedidos filtrados:', pedidos.length);

    const clientes = db.getClientes();
    const productos = db.getProductos();

    // Ordenar por fecha de entrega
    pedidos.sort((a, b) => new Date(a.fechaEntrega || '2099-12-31') - new Date(b.fechaEntrega || '2099-12-31'));

    if (pedidos.length === 0) {
        console.log('[loadPedidosPendientes] No hay pedidos, mostrando mensaje vacío');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay pedidos pendientes</td></tr>';
        return;
    }

    console.log('[loadPedidosPendientes] Generando HTML para', pedidos.length, 'pedidos...');

    try {
        tbody.innerHTML = pedidos.map(pedido => {
            const cliente = clientes.find(c => c.id === pedido.clienteId);
            const productosArr = pedido.productos || [];
            const totalCantidad = productosArr.reduce((sum, p) => sum + (p.cantidad || 0), 0);
            const totalCompletadas = productosArr.reduce((sum, p) => sum + (p.completadas || 0), 0);
            const avance = totalCantidad > 0 ? Math.round((totalCompletadas / totalCantidad) * 100) : 0;

            // Nombres de productos
            const nombresProductos = productosArr.map(pp => {
                const prod = productos.find(p => p.id === pp.productoId);
                return prod ? prod.nombre.substring(0, 20) : 'N/A';
            }).join(', ') || 'Sin productos';

            const hoy = new Date();
            const entrega = new Date(pedido.fechaEntrega);
            const diasRestantes = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));

            let estadoClass = 'success';
            let diasClass = '';

            if (diasRestantes < 0) {
                estadoClass = 'danger';
                diasClass = 'text-danger';
            } else if (diasRestantes <= 3) {
                estadoClass = 'warning';
                diasClass = 'text-warning';
            } else if (diasRestantes <= 7) {
                estadoClass = 'info';
            }

            const diasTexto = diasRestantes < 0
                ? `${Math.abs(diasRestantes)} días atrasado`
                : diasRestantes === 0
                ? 'Hoy'
                : diasRestantes === 1
                ? 'Mañana'
                : `${diasRestantes} días`;

            // Generar visualización de etapas
            const etapasHTML = generarEtapasPedido(pedido, productos);

            return `
                <tr>
                    <td><strong>#${pedido.id}</strong></td>
                    <td>${cliente?.nombreComercial || 'N/A'}</td>
                    <td title="${nombresProductos}">${nombresProductos.substring(0, 30)}${nombresProductos.length > 30 ? '...' : ''}</td>
                    <td>
                        ${totalCompletadas.toLocaleString()} / ${totalCantidad.toLocaleString()}
                        <div class="progress-bar-small">
                            <div class="progress" style="width:${avance}%"></div>
                        </div>
                    </td>
                    <td>${formatDate(pedido.fechaEntrega)}</td>
                    <td class="${diasClass}"><strong>${diasTexto}</strong></td>
                    <td><span class="status-badge ${estadoClass}">${pedido.estado === 'pendiente' ? 'Pendiente' : avance + '% completado'}</span></td>
                    <td>
                        <button class="btn-icon-small" onclick="viewPedido(${pedido.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon-small" onclick="showEditarPedido(${pedido.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon-small" onclick="toggleEtapasPedido(${pedido.id})" title="Ver etapas"><i class="fas fa-tasks"></i></button>
                    </td>
                </tr>
                <tr class="etapas-row" id="etapas-pedido-${pedido.id}" style="display:none">
                    <td colspan="8">
                        <div class="etapas-detalle">
                            ${etapasHTML}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    console.log('[loadPedidosPendientes] HTML generado exitosamente');
    } catch (error) {
        console.error('[loadPedidosPendientes] ERROR al generar HTML:', error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar pedidos: ' + error.message + '</td></tr>';
    }
}

// Generar HTML de etapas para un pedido
function generarEtapasPedido(pedido, productos) {
    const productosArr = pedido.productos || [];
    if (productosArr.length === 0) {
        return '<p class="text-muted">Sin productos definidos</p>';
    }

    // Leer datos sincronizados de localStorage
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const historialProduccion = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const pedidoERP = pedidosERP.find(pe => pe.id == pedido.id);

    console.log('[generarEtapasPedido] Pedido:', pedido.id, 'pedidoERP:', pedidoERP ? 'encontrado' : 'no encontrado');

    return productosArr.map(pp => {
        // Usar == para comparación flexible de tipos
        const producto = productos.find(p => p.id == pp.productoId);
        if (!producto) {
            console.warn('[generarEtapasPedido] Producto no encontrado:', pp.productoId);
            return '<p class="text-muted">Producto no encontrado</p>';
        }

        // Asegurar que avanceProcesos sea un array
        let avanceProcesos = pp.avanceProcesos;
        if (!avanceProcesos || typeof avanceProcesos !== 'object') {
            avanceProcesos = [];
        } else if (!Array.isArray(avanceProcesos)) {
            // Si es un objeto, convertirlo a array
            avanceProcesos = Object.values(avanceProcesos);
        }

        // Si no hay avanceProcesos, intentar obtener desde pedidos_erp
        if (!Array.isArray(avanceProcesos) || avanceProcesos.length === 0) {
            if (pedidoERP) {
                // Primero buscar en productos[].procesos
                const productoERP = pedidoERP.productos?.find(pe => pe.productoId == pp.productoId);
                if (productoERP && productoERP.procesos && productoERP.procesos.length > 0) {
                    avanceProcesos = productoERP.procesos.map(proc => ({
                        procesoId: proc.procesoId || proc.id,
                        procesoOrden: proc.orden || proc.procesoOrden || 1,
                        nombre: proc.nombre || proc.procesoNombre,
                        completadas: proc.piezasCompletadas || proc.completadas || proc.piezas || 0,
                        estado: proc.estado || 'pendiente'
                    }));
                }
                // Si no hay productos[].procesos, buscar en pedidoERP.procesos directamente
                else if (pedidoERP.procesos && pedidoERP.procesos.length > 0) {
                    avanceProcesos = pedidoERP.procesos.map(proc => ({
                        procesoId: proc.id || proc.procesoId,
                        procesoOrden: proc.orden || proc.procesoOrden || 1,
                        nombre: proc.nombre || proc.procesoNombre,
                        completadas: proc.piezas || proc.piezasCompletadas || proc.completadas || 0,
                        estado: proc.estado || 'pendiente'
                    }));
                    console.log('[generarEtapasPedido] Usando pedidoERP.procesos:', avanceProcesos.length);
                }
            }
        }

        // Si aún no hay avanceProcesos, generar desde rutaProcesos del producto
        if (!Array.isArray(avanceProcesos) || avanceProcesos.length === 0) {
            const rutaProcesos = producto.rutaProcesos || [];
            if (rutaProcesos.length === 0) {
                return `
                    <div class="etapas-producto">
                        <h5>${producto.nombre} (${pp.cantidad} piezas)</h5>
                        <p class="text-muted text-small">Este producto no tiene procesos definidos</p>
                    </div>
                `;
            }

            // Generar avanceProcesos desde rutaProcesos
            avanceProcesos = rutaProcesos.map((proc, i) => ({
                procesoId: proc.procesoId || `rp_${i}`,
                procesoOrden: proc.orden || i + 1,
                nombre: proc.nombre,
                completadas: 0,
                estado: 'pendiente'
            }));
        }

        // Sincronizar con historial de producción para obtener piezas reales
        avanceProcesos = avanceProcesos.map(proc => {
            // Buscar en historial de producción (el operador guarda cantidad, no piezas)
            const historial = historialProduccion.filter(h =>
                h.pedidoId == pedido.id &&
                (h.procesoId == proc.procesoId || h.procesoNombre === proc.nombre || h.proceso === proc.nombre)
            );
            // Sumar cantidad de cada registro del historial
            const piezasHistorial = historial.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

            // También buscar en pedidoERP.procesos por nombre (el operador guarda piezas aquí)
            let piezasERP = 0;
            if (pedidoERP && pedidoERP.procesos) {
                const procesoERP = pedidoERP.procesos.find(p => {
                    // Comparar por ID
                    if (p.id == proc.procesoId || p.procesoId == proc.procesoId) return true;
                    // Comparar por nombre (case insensitive y trim)
                    const nombreP = (p.nombre || '').toLowerCase().trim();
                    const nombreProc = (proc.nombre || '').toLowerCase().trim();
                    if (nombreP === nombreProc) return true;
                    // Comparar si uno contiene al otro
                    if (nombreP.includes(nombreProc) || nombreProc.includes(nombreP)) return true;
                    return false;
                });
                if (procesoERP) {
                    piezasERP = procesoERP.piezas || procesoERP.piezasCompletadas || procesoERP.completadas || 0;
                }
            }

            // Tomar el máximo entre las fuentes
            const completadas = Math.max(proc.completadas || 0, piezasHistorial, piezasERP);
            const porcentaje = pp.cantidad > 0 ? (completadas / pp.cantidad) * 100 : 0;

            console.log('[generarEtapasPedido] Proceso:', proc.nombre, 'historial:', piezasHistorial, 'ERP:', piezasERP, 'total:', completadas);

            return {
                ...proc,
                completadas: completadas,
                estado: porcentaje >= 100 ? 'completado' : completadas > 0 ? 'en_proceso' : 'pendiente'
            };
        });

        return `
            <div class="etapas-producto">
                <h5>${producto.nombre} <span class="text-muted">(${pp.completadas}/${pp.cantidad} piezas)</span></h5>
                <div class="etapas-timeline">
                    ${avanceProcesos.map(proc => {
                        const porcentaje = pp.cantidad > 0 ? Math.round((proc.completadas / pp.cantidad) * 100) : 0;
                        const estadoClass = proc.estado === 'completado' ? 'completado' : proc.estado === 'en_proceso' ? 'en_proceso' : 'pendiente';
                        const estadoTexto = proc.estado === 'completado' ? 'Completado' : proc.estado === 'en_proceso' ? 'En proceso' : 'Pendiente';
                        const iconClass = proc.estado === 'completado' ? 'fa-check' : proc.estado === 'en_proceso' ? 'fa-cog fa-spin' : 'fa-clock';

                        return `
                            <div class="etapa-item ${estadoClass}" title="${proc.nombre}: ${proc.completadas}/${pp.cantidad} (${porcentaje}%)">
                                <div class="etapa-numero">${proc.procesoOrden}</div>
                                <div class="etapa-info">
                                    <span class="etapa-nombre">${proc.nombre}</span>
                                    <div class="etapa-progress">
                                        <div class="etapa-progress-bar">
                                            <div class="etapa-progress-fill" style="width:${porcentaje}%"></div>
                                        </div>
                                        <span class="etapa-cantidad">${proc.completadas}/${pp.cantidad}</span>
                                    </div>
                                    <span class="etapa-status-badge ${estadoClass}">
                                        <i class="fas ${iconClass}"></i> ${estadoTexto}
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Toggle para mostrar/ocultar etapas
function toggleEtapasPedido(pedidoId) {
    const row = document.getElementById(`etapas-pedido-${pedidoId}`);
    if (row) {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
}

// Legacy function - mantener compatibilidad
function loadAreasLive() {
    // Esta función ya no se usa, el mapa de planta la reemplaza
    const areasGrid = document.getElementById('areasGrid');
    if (!areasGrid) return;

    const areas = db.getAreas();
    const produccion = db.getProduccionActiva();
    const personal = db.getPersonal();

    areasGrid.innerHTML = areas.map(area => {
        const operadoresEnArea = personal.filter(p => p.areaId === area.id && p.activo);
        const produccionEnArea = produccion.filter(p => {
            const proceso = db.getProceso(p.procesoId);
            return proceso && proceso.areaId === area.id;
        });

        const piezasHora = produccionEnArea.reduce((sum, p) => sum + Math.round(p.piezasRealizadas / 2), 0);

        return `
            <div class="area-card">
                <div class="area-header">
                    <span class="area-name">${area.nombre}</span>
                    <span class="area-status ${produccionEnArea.length > 0 ? '' : 'inactive'}"></span>
                </div>
                <div class="area-stats">
                    <div class="area-stat">
                        <span class="area-stat-value">${piezasHora}</span>
                        <span class="area-stat-label">pzas/hora</span>
                    </div>
                    <div class="area-stat">
                        <span class="area-stat-value">${produccionEnArea.length}</span>
                        <span class="area-stat-label">procesos</span>
                    </div>
                    <div class="area-stat">
                        <span class="area-stat-value">${operadoresEnArea.length}</span>
                        <span class="area-stat-label">operadores</span>
                    </div>
                </div>
                <div class="area-operators">
                    ${operadoresEnArea.slice(0, 4).map(op => {
                        const enProduccion = produccionEnArea.find(p => p.operadorId === op.id);
                        return `<span class="operator-chip">
                            <span class="status-dot ${enProduccion ? '' : 'paused'}"></span>
                            ${op.nombre.split(' ')[0]}
                        </span>`;
                    }).join('')}
                    ${operadoresEnArea.length > 4 ? `<span class="operator-chip">+${operadoresEnArea.length - 4}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// PEDIDOS
// ========================================
function loadPedidos() {
    // Usar la versión mejorada
    loadPedidosEnhanced();
}

function loadPedidosLegacy() {
    const section = document.getElementById('section-pedidos');
    const pedidos = db.getPedidos();
    const clientes = db.getClientes();
    const productos = db.getProductos();

    section.innerHTML = `
        <div class="section-header">
            <h1>Gestión de Pedidos</h1>
            <button class="btn btn-primary" onclick="showNuevoPedidoModal()">
                <i class="fas fa-plus"></i> Nuevo Pedido
            </button>
        </div>

        <div class="tabs">
            <button class="tab active" data-filter="todos">Todos</button>
            <button class="tab" data-filter="pendiente">Pendientes</button>
            <button class="tab" data-filter="produccion">En Producción</button>
            <button class="tab" data-filter="completado">Completados</button>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="pedidosTable">
                <thead>
                    <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Productos</th>
                        <th>Cantidad</th>
                        <th>Avance</th>
                        <th>Prioridad</th>
                        <th>Entrega</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedidos.map(pedido => {
                        const cliente = clientes.find(c => c.id === pedido.clienteId);
                        const totalCantidad = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);
                        const totalCompletadas = pedido.productos.reduce((sum, p) => sum + p.completadas, 0);
                        const avance = Math.round((totalCompletadas / totalCantidad) * 100);
                        const productosNombres = pedido.productos.map(p => {
                            const prod = productos.find(pr => pr.id === p.productoId);
                            return prod ? prod.nombre.substring(0, 20) + '...' : 'N/A';
                        }).join(', ');

                        // Generar HTML de etapas
                        const etapasHTML = generarEtapasPedido(pedido, productos);

                        return `
                            <tr data-estado="${pedido.estado}" class="pedido-row">
                                <td><strong>#${pedido.id}</strong></td>
                                <td>${cliente ? cliente.nombreComercial : 'N/A'}</td>
                                <td title="${productosNombres}">${pedido.productos.length} producto(s)</td>
                                <td>${totalCantidad.toLocaleString()}</td>
                                <td>
                                    <div class="progress-bar">
                                        <div class="progress" style="width: ${avance}%"></div>
                                        <span>${avance}%</span>
                                    </div>
                                </td>
                                <td><span class="status-badge ${pedido.prioridad === 'alta' ? 'danger' : pedido.prioridad === 'media' ? 'warning' : 'info'}">${pedido.prioridad}</span></td>
                                <td>${formatDate(pedido.fechaEntrega)}</td>
                                <td><span class="status-badge ${getEstadoBadgeClass(pedido.estado)}">${capitalizeFirst(pedido.estado)}</span></td>
                                <td>
                                    <button class="btn-icon-small" onclick="viewPedido(${pedido.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
                                    <button class="btn-icon-small" onclick="editPedido(${pedido.id})" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button class="btn-icon-small" onclick="toggleEtapasPedidoSeccion(${pedido.id})" title="Ver etapas"><i class="fas fa-tasks"></i></button>
                                </td>
                            </tr>
                            <tr class="etapas-row etapas-seccion-pedido" id="etapas-seccion-${pedido.id}" data-estado="${pedido.estado}" style="display:none">
                                <td colspan="9">
                                    <div class="etapas-detalle">
                                        ${etapasHTML}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Agregar eventos a los tabs
    section.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            section.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterPedidos(tab.dataset.filter);
        });
    });
}

// Toggle etapas en la sección de pedidos
function toggleEtapasPedidoSeccion(pedidoId) {
    const row = document.getElementById(`etapas-seccion-${pedidoId}`);
    if (row) {
        row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }
}

function filterPedidos(filter) {
    const rows = document.querySelectorAll('#pedidosTable tbody tr.pedido-row');
    const etapasRows = document.querySelectorAll('#pedidosTable tbody tr.etapas-seccion-pedido');

    rows.forEach(row => {
        if (filter === 'todos' || row.dataset.estado === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // También filtrar las filas de etapas
    etapasRows.forEach(row => {
        if (filter === 'todos' || row.dataset.estado === filter) {
            // Mantener el estado de visibilidad original (oculto por defecto)
            // Solo mostrar si estaba expandido
        } else {
            row.style.display = 'none';
        }
    });
}

function showNuevoPedidoModal() {
    const clientes = db.getClientes();
    const productos = db.getProductos();

    const content = `
        <form id="nuevoPedidoForm">
            <div class="form-group">
                <label>Cliente *</label>
                <select name="clienteId" required onchange="updateProductosCliente(this.value)">
                    <option value="">Seleccionar cliente...</option>
                    ${clientes.map(c => `<option value="${c.id}">${c.nombreComercial}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Productos</label>
                <div id="productosContainer">
                    <p class="text-muted">Seleccione un cliente para ver sus productos</p>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Prioridad *</label>
                    <select name="prioridad" required>
                        <option value="alta">Alta</option>
                        <option value="media" selected>Media</option>
                        <option value="baja">Baja</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha de Entrega *</label>
                    <input type="date" name="fechaEntrega" required>
                </div>
            </div>
            <div class="form-group">
                <label>Notas</label>
                <textarea name="notas" rows="2" placeholder="Notas adicionales..."></textarea>
            </div>
            <div class="form-group">
                <label><i class="fas fa-images"></i> Imágenes de Apoyo</label>
                <p class="text-muted text-small">Sube imágenes de referencia para los operadores (máx. 5 imágenes)</p>
                <div class="imagenes-upload-container">
                    <input type="file" id="imagenesApoyoInput" accept="image/*" multiple style="display:none" onchange="previsualizarImagenes(this)">
                    <button type="button" class="btn btn-secondary btn-upload" onclick="document.getElementById('imagenesApoyoInput').click()">
                        <i class="fas fa-upload"></i> Seleccionar Imágenes
                    </button>
                    <div id="imagenesPreviewContainer" class="imagenes-preview-grid"></div>
                </div>
            </div>
            <div class="presupuesto-estimado-section" id="presupuestoEstimadoSection" style="display:none;">
                <div class="presupuesto-card">
                    <span class="presupuesto-label"><i class="fas fa-calculator"></i> Presupuesto Estimado:</span>
                    <span class="presupuesto-valor" id="presupuestoEstimadoValor">$0.00</span>
                </div>
            </div>
        </form>
    `;

    openModal('Nuevo Pedido', content, savePedido);
}

function updateProductosCliente(clienteId) {
    const container = document.getElementById('productosContainer');
    if (!clienteId) {
        container.innerHTML = '<p class="text-muted">Seleccione un cliente para ver sus productos</p>';
        return;
    }

    const productos = db.getProductosByCliente(parseInt(clienteId));

    if (productos.length === 0) {
        container.innerHTML = '<p class="text-muted">Este cliente no tiene productos registrados</p>';
        return;
    }

    container.innerHTML = productos.map(p => `
        <div class="producto-pedido-row">
            <input type="checkbox" name="producto_${p.id}" id="prod_${p.id}"
                   data-precio="${p.precioVenta || 0}"
                   onchange="calcularPresupuestoPedido()">
            <label for="prod_${p.id}" class="producto-pedido-label">
                <span class="producto-nombre">${p.nombre}</span>
                <span class="producto-precio">$${(p.precioVenta || 0).toFixed(2)}</span>
            </label>
            <input type="number" name="cantidad_${p.id}" placeholder="Cant" min="1"
                   class="cantidad-input" data-precio="${p.precioVenta || 0}"
                   onchange="calcularPresupuestoPedido()" oninput="calcularPresupuestoPedido()">
        </div>
    `).join('');

    // Mostrar sección de presupuesto
    const seccionPresupuesto = document.getElementById('presupuestoEstimadoSection');
    if (seccionPresupuesto) {
        seccionPresupuesto.style.display = 'block';
    }
}

// Calcular presupuesto estimado mientras se seleccionan productos
function calcularPresupuestoPedido() {
    const container = document.getElementById('productosContainer');
    if (!container) return;

    let total = 0;
    const rows = container.querySelectorAll('.producto-pedido-row');

    rows.forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        const cantidadInput = row.querySelector('input[type="number"]');

        if (checkbox && checkbox.checked && cantidadInput) {
            const precio = parseFloat(checkbox.dataset.precio) || 0;
            const cantidad = parseInt(cantidadInput.value) || 0;
            total += precio * cantidad;
        }
    });

    const valorElement = document.getElementById('presupuestoEstimadoValor');
    if (valorElement) {
        valorElement.textContent = '$' + total.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
}

// Variable global para almacenar imágenes en base64
let imagenesApoyoPedido = [];

// Función para previsualizar imágenes seleccionadas
function previsualizarImagenes(input) {
    const container = document.getElementById('imagenesPreviewContainer');
    if (!container) return;

    const files = Array.from(input.files);

    // Limitar a 5 imágenes
    if (imagenesApoyoPedido.length + files.length > 5) {
        alert('Máximo 5 imágenes permitidas');
        return;
    }

    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            const imgId = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            imagenesApoyoPedido.push({
                id: imgId,
                nombre: file.name,
                data: base64
            });

            // Agregar preview
            const imgWrapper = document.createElement('div');
            imgWrapper.className = 'imagen-preview-item';
            imgWrapper.id = imgId;
            imgWrapper.innerHTML = `
                <img src="${base64}" alt="${file.name}" onclick="ampliarImagen('${base64}')">
                <button type="button" class="btn-remove-img" onclick="eliminarImagenPreview('${imgId}')" title="Eliminar">
                    <i class="fas fa-times"></i>
                </button>
                <span class="img-nombre">${file.name.substring(0, 15)}${file.name.length > 15 ? '...' : ''}</span>
            `;
            container.appendChild(imgWrapper);
        };
        reader.readAsDataURL(file);
    });

    // Limpiar input para permitir seleccionar las mismas imágenes de nuevo
    input.value = '';
}

// Función para eliminar imagen de preview
function eliminarImagenPreview(imgId) {
    imagenesApoyoPedido = imagenesApoyoPedido.filter(img => img.id !== imgId);
    const element = document.getElementById(imgId);
    if (element) element.remove();
}

// Función para ampliar imagen
function ampliarImagen(src) {
    const overlay = document.createElement('div');
    overlay.className = 'imagen-ampliar-overlay';
    overlay.innerHTML = `
        <div class="imagen-ampliar-container">
            <img src="${src}" alt="Imagen ampliada">
            <button class="btn-cerrar-imagen" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i> Cerrar
            </button>
        </div>
    `;
    overlay.onclick = function(e) {
        if (e.target === overlay) overlay.remove();
    };
    document.body.appendChild(overlay);
}

function savePedido() {
    const form = document.getElementById('nuevoPedidoForm');
    const formData = new FormData(form);

    const clienteId = parseInt(formData.get('clienteId'));
    if (!clienteId) {
        alert('Seleccione un cliente');
        return;
    }

    const productos = [];
    const allProductos = db.getProductosByCliente(clienteId);

    const procesosCatalogo = db.getProcesos();

    allProductos.forEach(p => {
        const checked = form.querySelector(`input[name="producto_${p.id}"]`).checked;
        const cantidad = parseInt(form.querySelector(`input[name="cantidad_${p.id}"]`).value);
        if (checked && cantidad > 0) {
            // Generar avanceProcesos desde rutaProcesos del producto
            const rutaProcesos = p.rutaProcesos || p.procesos || [];
            const avanceProcesos = rutaProcesos.map((proc, i) => {
                // rutaProcesos puede tener procesoId o solo nombre
                const procesoInfo = proc.procesoId
                    ? procesosCatalogo.find(pr => pr.id == proc.procesoId)
                    : procesosCatalogo.find(pr => pr.nombre === proc.nombre);
                return {
                    procesoId: proc.procesoId || proc.id || `rp_${i}`,
                    procesoOrden: proc.orden || i + 1,
                    nombre: proc.nombre || procesoInfo?.nombre || `Proceso ${i + 1}`,
                    completadas: 0,
                    estado: 'pendiente'
                };
            });

            productos.push({
                productoId: p.id,
                cantidad,
                completadas: 0,
                precioUnitario: p.precioVenta || 0,
                avanceProcesos: avanceProcesos
            });
        }
    });

    if (productos.length === 0) {
        alert('Seleccione al menos un producto con cantidad');
        return;
    }

    // Calcular presupuesto estimado basado en precio de venta de productos
    let presupuestoEstimado = 0;
    productos.forEach(p => {
        const producto = allProductos.find(pr => pr.id === p.productoId);
        if (producto && producto.precioVenta) {
            presupuestoEstimado += producto.precioVenta * p.cantidad;
        }
    });

    const pedido = {
        clienteId,
        productos,
        prioridad: formData.get('prioridad'),
        fechaEntrega: formData.get('fechaEntrega'),
        notas: formData.get('notas'),
        presupuestoEstimado: presupuestoEstimado,
        imagenesApoyo: imagenesApoyoPedido.map(img => ({
            nombre: img.nombre,
            data: img.data
        }))
    };

    // Limpiar imágenes después de guardar
    imagenesApoyoPedido = [];

    const nuevoPedido = db.addPedido(pedido);
    console.log('[savePedido] Pedido creado:', nuevoPedido);

    closeModal();

    // Recargar la sección correcta
    if (app.currentSection === 'dashboard') {
        console.log('[savePedido] Recargando dashboard...');
        loadPedidosPendientes();
        loadPedidosCriticos();
        if (typeof updateDashboardKPIs === 'function') {
            updateDashboardKPIs();
        }
    } else {
        loadPedidos();
    }

    if (typeof showToast === 'function') {
        showToast('Pedido #' + nuevoPedido.id + ' creado correctamente', 'success');
    }
}

// Exponer funciones de pedidos a window
window.showNuevoPedidoModal = showNuevoPedidoModal;
window.updateProductosCliente = updateProductosCliente;
window.calcularPresupuestoPedido = calcularPresupuestoPedido;
window.savePedido = savePedido;
window.viewPedido = viewPedido;
window.editPedido = editPedido;
window.showEditarPedido = showEditarPedido;
window.toggleEtapasPedido = toggleEtapasPedido;
window.loadPedidosPendientes = loadPedidosPendientes;
window.previsualizarImagenes = previsualizarImagenes;
window.eliminarImagenPreview = eliminarImagenPreview;
window.ampliarImagen = ampliarImagen;

function viewPedido(id) {
    const pedido = db.getPedido(id);
    if (!pedido) {
        console.error('[viewPedido] Pedido no encontrado:', id);
        return;
    }

    const cliente = db.getCliente(pedido.clienteId);
    const productos = db.getProductos();
    const procesos = db.getProcesos();

    console.log('[viewPedido] Pedido:', id, 'Productos en pedido:', pedido.productos?.length);
    console.log('[viewPedido] Catálogo productos:', productos.length, 'procesos:', procesos.length);

    // Leer datos sincronizados de localStorage
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const historialProduccion = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const pedidoERP = pedidosERP.find(pe => pe.id == id);
    console.log('[viewPedido] pedidoERP encontrado:', !!pedidoERP);

    // Generar HTML para el avance por proceso de cada producto
    const productosDetalleHTML = pedido.productos.map(p => {
        // Usar == para comparación flexible de tipos
        const prod = productos.find(pr => pr.id == p.productoId);
        const avanceGeneral = Math.round(((p.completadas || 0) / (p.cantidad || 1)) * 100);

        console.log('[viewPedido] Producto:', p.productoId, 'encontrado:', !!prod, 'rutaProcesos:', prod?.rutaProcesos?.length || 0);

        // Obtener avanceProcesos, generando desde rutaProcesos si no existe
        let avanceProcesos = p.avanceProcesos;

        // Si no hay avanceProcesos o está vacío, intentar obtener desde pedidos_erp
        if (!avanceProcesos || !Array.isArray(avanceProcesos) || avanceProcesos.length === 0) {
            if (pedidoERP) {
                // Primero buscar en productos[].procesos
                const productoERP = pedidoERP.productos?.find(pe => pe.productoId == p.productoId);
                if (productoERP && productoERP.procesos && productoERP.procesos.length > 0) {
                    console.log('[viewPedido] Usando procesos de productoERP:', productoERP.procesos.length);
                    avanceProcesos = productoERP.procesos.map(proc => ({
                        procesoId: proc.procesoId || proc.id,
                        nombre: proc.nombre || proc.procesoNombre,
                        procesoOrden: proc.orden || proc.procesoOrden || 1,
                        completadas: proc.piezasCompletadas || proc.completadas || proc.piezas || 0,
                        estado: proc.estado || 'pendiente'
                    }));
                }
                // Si no hay productos[].procesos, buscar en pedidoERP.procesos directamente
                // (el operador guarda aquí)
                else if (pedidoERP.procesos && pedidoERP.procesos.length > 0) {
                    console.log('[viewPedido] Usando pedidoERP.procesos directamente:', pedidoERP.procesos.length);
                    avanceProcesos = pedidoERP.procesos.map(proc => ({
                        procesoId: proc.id || proc.procesoId,
                        nombre: proc.nombre || proc.procesoNombre,
                        procesoOrden: proc.orden || proc.procesoOrden || 1,
                        completadas: proc.piezas || proc.piezasCompletadas || proc.completadas || 0,
                        estado: proc.estado || 'pendiente'
                    }));
                }
            }
        }

        // Si aún no hay avanceProcesos, generar desde rutaProcesos del producto
        if (!avanceProcesos || !Array.isArray(avanceProcesos) || avanceProcesos.length === 0) {
            const rutaProcesos = prod?.rutaProcesos || prod?.procesos || [];
            console.log('[viewPedido] Generando desde rutaProcesos:', rutaProcesos.length, rutaProcesos);
            if (rutaProcesos.length > 0) {
                avanceProcesos = rutaProcesos.map((proc, i) => {
                    // rutaProcesos puede tener procesoId o solo nombre
                    const procesoInfo = proc.procesoId
                        ? procesos.find(pr => pr.id == proc.procesoId)
                        : procesos.find(pr => pr.nombre === proc.nombre);
                    return {
                        procesoId: proc.procesoId || proc.id || `rp_${i}`,
                        nombre: proc.nombre || procesoInfo?.nombre || `Proceso ${i + 1}`,
                        procesoOrden: proc.orden || i + 1,
                        completadas: 0,
                        estado: 'pendiente'
                    };
                });
            }
        }

        // Sincronizar con historial de producción y pedidos_erp
        if (avanceProcesos && avanceProcesos.length > 0) {
            avanceProcesos = avanceProcesos.map(proc => {
                // Buscar en historial de producción (el operador guarda cantidad)
                const historial = historialProduccion.filter(h =>
                    h.pedidoId == id &&
                    (h.procesoId == proc.procesoId || h.procesoNombre === proc.nombre)
                );
                const piezasHistorial = historial.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

                // También buscar en pedidoERP.procesos por nombre (el operador guarda piezas aquí)
                let piezasERP = 0;
                if (pedidoERP && pedidoERP.procesos) {
                    const procesoERP = pedidoERP.procesos.find(pe => {
                        // Comparar por ID
                        if (pe.id == proc.procesoId || pe.procesoId == proc.procesoId) return true;
                        // Comparar por nombre (case insensitive y trim)
                        const nombrePE = (pe.nombre || '').toLowerCase().trim();
                        const nombreProc = (proc.nombre || '').toLowerCase().trim();
                        if (nombrePE === nombreProc) return true;
                        // Comparar si uno contiene al otro
                        if (nombrePE.includes(nombreProc) || nombreProc.includes(nombrePE)) return true;
                        return false;
                    });
                    if (procesoERP) {
                        piezasERP = procesoERP.piezas || procesoERP.piezasCompletadas || procesoERP.completadas || 0;
                        console.log('[viewPedido] Encontrado en pedidoERP.procesos:', procesoERP.nombre, 'piezas:', piezasERP);
                    }
                }

                // Tomar el máximo de todas las fuentes
                const completadas = Math.max(proc.completadas || 0, piezasHistorial, piezasERP);
                const porcentaje = p.cantidad > 0 ? (completadas / p.cantidad) * 100 : 0;

                return {
                    ...proc,
                    completadas: completadas,
                    estado: porcentaje >= 100 ? 'completado' : completadas > 0 ? 'en_proceso' : 'pendiente'
                };
            });
        }

        avanceProcesos = avanceProcesos || [];
        console.log('[viewPedido] avanceProcesos final:', avanceProcesos.length, avanceProcesos);

        let procesosHTML = '';
        if (avanceProcesos.length > 0) {
            procesosHTML = `
                <div class="proceso-avance-grid">
                    ${avanceProcesos.map(proc => {
                        const porcentaje = Math.round((proc.completadas / p.cantidad) * 100);
                        let estadoIcon = '';
                        let estadoClass = '';

                        if (proc.estado === 'completado') {
                            estadoIcon = '<i class="fas fa-check-circle"></i>';
                            estadoClass = 'proceso-completado';
                        } else if (proc.estado === 'en_proceso') {
                            estadoIcon = '<i class="fas fa-spinner fa-spin"></i>';
                            estadoClass = 'proceso-en-proceso';
                        } else {
                            estadoIcon = '<i class="fas fa-clock"></i>';
                            estadoClass = 'proceso-pendiente';
                        }

                        return `
                            <div class="proceso-avance-item ${estadoClass}">
                                <div class="proceso-avance-header">
                                    <span class="proceso-orden">${proc.procesoOrden}</span>
                                    <span class="proceso-nombre">${proc.nombre}</span>
                                    <span class="proceso-estado-icon">${estadoIcon}</span>
                                </div>
                                <div class="proceso-avance-bar">
                                    <div class="proceso-avance-fill" style="width:${porcentaje}%"></div>
                                </div>
                                <div class="proceso-avance-texto">
                                    ${proc.completadas} / ${p.cantidad} <span class="proceso-porcentaje">(${porcentaje}%)</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            procesosHTML = '<p class="text-muted text-small">No hay información de procesos disponible</p>';
        }

        return `
            <div class="producto-detalle-card">
                <div class="producto-detalle-header">
                    <h5>${prod ? prod.nombre : 'N/A'}</h5>
                    <div class="producto-avance-general">
                        <div class="progress-bar">
                            <div class="progress" style="width: ${avanceGeneral}%"></div>
                            <span>${avanceGeneral}%</span>
                        </div>
                        <span class="avance-texto">${p.completadas} / ${p.cantidad} piezas</span>
                    </div>
                </div>
                <div class="producto-detalle-procesos">
                    <h6><i class="fas fa-tasks"></i> Avance por Proceso</h6>
                    ${procesosHTML}
                </div>
            </div>
        `;
    }).join('');

    const content = `
        <div class="pedido-detalle-info">
            <div class="info-row">
                <span class="info-label"><i class="fas fa-user"></i> Cliente:</span>
                <span class="info-value">${cliente ? cliente.nombreComercial : 'N/A'}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-calendar-plus"></i> Fecha Carga:</span>
                <span class="info-value">${formatDate(pedido.fechaCarga)}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-calendar-check"></i> Fecha Entrega:</span>
                <span class="info-value">${formatDate(pedido.fechaEntrega)}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-flag"></i> Prioridad:</span>
                <span class="status-badge ${pedido.prioridad === 'alta' ? 'danger' : pedido.prioridad === 'media' ? 'warning' : 'info'}">${pedido.prioridad}</span>
            </div>
            <div class="info-row">
                <span class="info-label"><i class="fas fa-info-circle"></i> Estado:</span>
                <span class="status-badge ${getEstadoBadgeClass(pedido.estado)}">${capitalizeFirst(pedido.estado)}</span>
            </div>
        </div>

        ${generarSeccionPiezasDisponibles(id, pedido)}

        <div class="pedido-productos-detalle">
            <h4><i class="fas fa-box"></i> Productos y Avance por Proceso</h4>
            ${productosDetalleHTML}
        </div>

        ${pedido.notas ? `<div class="pedido-notas"><strong><i class="fas fa-sticky-note"></i> Notas:</strong> ${pedido.notas}</div>` : ''}

        ${generarSeccionImagenesApoyo(pedido)}
    `;

    openModal(`Pedido #${id}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Genera la sección de imágenes de apoyo para un pedido
function generarSeccionImagenesApoyo(pedido) {
    const imagenes = pedido.imagenesApoyo || [];

    if (imagenes.length === 0) {
        return '';
    }

    return `
        <div class="imagenes-apoyo-section">
            <h4><i class="fas fa-images"></i> Imágenes de Apoyo (${imagenes.length})</h4>
            <div class="imagenes-apoyo-grid">
                ${imagenes.map((img, index) => `
                    <div class="imagen-apoyo-item" onclick="ampliarImagen('${img.data}')" title="${img.nombre || 'Imagen ' + (index + 1)}">
                        <img src="${img.data}" alt="${img.nombre || 'Imagen de apoyo'}">
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Genera la sección de piezas disponibles del inventario para un pedido
function generarSeccionPiezasDisponibles(pedidoId, pedido) {
    const disponibilidad = verificarPiezasDisponibles(pedidoId);

    if (disponibilidad.length === 0) {
        return '';
    }

    const piezasConStock = disponibilidad.filter(d => d.cantidadDisponible > 0);

    if (piezasConStock.length === 0) {
        return '';
    }

    return `
        <div class="piezas-disponibles-section">
            <div class="piezas-header-info">
                <h4><i class="fas fa-cubes"></i> Piezas Pre-producidas Disponibles</h4>
                <button class="btn btn-sm btn-primary" onclick="mostrarUsarPiezasInventario(${pedidoId})">
                    <i class="fas fa-hand-holding"></i> Usar Piezas
                </button>
            </div>
            <div class="piezas-disponibles-grid">
                ${piezasConStock.map(d => `
                    <div class="pieza-disponible-card">
                        <div class="pieza-disp-icono">
                            <i class="fas fa-puzzle-piece"></i>
                        </div>
                        <div class="pieza-disp-info">
                            <span class="pieza-disp-nombre">${d.piezaNombre}</span>
                            <span class="pieza-disp-producto">${d.productoNombre}</span>
                        </div>
                        <div class="pieza-disp-cantidad">
                            <span class="cantidad">${d.cantidadDisponible}</span>
                            <span class="unidad">${d.unidad}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function editPedido(id) {
    showEditarPedido(id);
}

function showEditarPedido(id) {
    const pedido = db.getPedido(id);
    if (!pedido) return;

    const cliente = db.getCliente(pedido.clienteId);
    const productos = db.getProductos();

    const content = `
        <form id="editarPedidoForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Cliente</label>
                    <input type="text" value="${cliente ? cliente.nombreComercial : 'N/A'}" disabled>
                </div>
                <div class="form-group">
                    <label>Prioridad</label>
                    <select name="prioridad">
                        <option value="baja" ${pedido.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
                        <option value="media" ${pedido.prioridad === 'media' ? 'selected' : ''}>Media</option>
                        <option value="alta" ${pedido.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha de Entrega</label>
                    <input type="date" name="fechaEntrega" value="${pedido.fechaEntrega}">
                </div>
                <div class="form-group">
                    <label>Estado</label>
                    <select name="estado">
                        <option value="pendiente" ${pedido.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                        <option value="produccion" ${pedido.estado === 'produccion' ? 'selected' : ''}>En Producción</option>
                        <option value="completado" ${pedido.estado === 'completado' ? 'selected' : ''}>Completado</option>
                        <option value="entregado" ${pedido.estado === 'entregado' ? 'selected' : ''}>Entregado</option>
                    </select>
                </div>
            </div>

            <h4 class="mb-1 mt-2">Productos del Pedido</h4>
            <div class="pedido-productos-edit">
                ${pedido.productos.map((p, idx) => {
                    const prod = productos.find(pr => pr.id === p.productoId);
                    return `
                        <div class="producto-edit-row">
                            <div class="producto-edit-info">
                                <strong>${prod ? prod.nombre : 'N/A'}</strong>
                            </div>
                            <div class="producto-edit-fields">
                                <div class="form-group inline">
                                    <label>Cantidad</label>
                                    <input type="number" name="cantidad_${idx}" value="${p.cantidad}" min="1">
                                </div>
                                <div class="form-group inline">
                                    <label>Completadas</label>
                                    <input type="number" name="completadas_${idx}" value="${p.completadas}" min="0">
                                </div>
                                <div class="form-group inline">
                                    <label>Precio Unit.</label>
                                    <input type="number" name="precio_${idx}" value="${p.precioUnitario || 0}" step="0.01" min="0">
                                </div>
                            </div>
                            <input type="hidden" name="productoId_${idx}" value="${p.productoId}">
                        </div>
                    `;
                }).join('')}
            </div>
            <input type="hidden" name="numProductos" value="${pedido.productos.length}">

            <div class="form-group mt-2">
                <label>Notas</label>
                <textarea name="notas" rows="2">${pedido.notas || ''}</textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Presupuesto Estimado</label>
                    <input type="number" name="presupuestoEstimado" value="${pedido.presupuestoEstimado || 0}" step="0.01">
                </div>
                <div class="form-group">
                    <label>Costo Real</label>
                    <input type="number" name="costoReal" value="${pedido.costoReal || 0}" step="0.01">
                </div>
            </div>
        </form>
    `;

    openModal(`Editar Pedido #${id}`, content, () => {
        const form = document.getElementById('editarPedidoForm');
        const formData = new FormData(form);

        const numProductos = parseInt(formData.get('numProductos'));
        const productosActualizados = [];

        for (let i = 0; i < numProductos; i++) {
            productosActualizados.push({
                productoId: parseInt(formData.get(`productoId_${i}`)),
                cantidad: parseInt(formData.get(`cantidad_${i}`)),
                completadas: parseInt(formData.get(`completadas_${i}`)),
                precioUnitario: parseFloat(formData.get(`precio_${i}`)) || 0
            });
        }

        const updates = {
            prioridad: formData.get('prioridad'),
            fechaEntrega: formData.get('fechaEntrega'),
            estado: formData.get('estado'),
            productos: productosActualizados,
            notas: formData.get('notas'),
            presupuestoEstimado: parseFloat(formData.get('presupuestoEstimado')) || 0,
            costoReal: parseFloat(formData.get('costoReal')) || 0
        };

        db.updatePedido(id, updates);

        // Sincronizar pedidos con panel de operadora
        if (typeof sincronizarPedidosParaOperadoras === 'function') {
            sincronizarPedidosParaOperadoras();
        }

        closeModal();

        // Recargar sección actual
        if (app.currentSection === 'dashboard') {
            loadPedidosPendientes();
            loadPedidosCriticos();
            updateDashboardKPIs();
        } else {
            loadPedidos();
        }

        showToast('Pedido actualizado correctamente');
    });
}

function viewTimeline(id) {
    alert('Timeline del pedido en desarrollo');
}

// ========================================
// CLIENTES
// ========================================
function loadClientes() {
    // Usar la versión mejorada
    loadClientesEnhanced();
}

function loadClientesLegacy() {
    const section = document.getElementById('section-clientes');
    const clientes = db.getClientes();
    const productos = db.getProductos();

    section.innerHTML = `
        <div class="section-header">
            <h1>Gestión de Clientes</h1>
            <button class="btn btn-primary" onclick="showNuevoClienteModal()">
                <i class="fas fa-plus"></i> Nuevo Cliente
            </button>
        </div>

        <div class="cards-grid clientes-grid">
            ${clientes.map(cliente => {
                const articulosFrecuentes = cliente.articulosFrecuentes || [];
                return `
                <div class="card cliente-card">
                    <div class="card-header">
                        <span class="card-title">${cliente.nombreComercial}</span>
                        <span class="status-badge ${cliente.tipo === 'estrategico' ? 'success' : cliente.tipo === 'interno' ? 'info' : 'warning'}">${cliente.tipo}</span>
                    </div>
                    <p class="text-muted mb-1">${cliente.razonSocial}</p>
                    <div class="mb-1">
                        <i class="fas fa-user"></i> ${cliente.contacto}<br>
                        <i class="fas fa-envelope"></i> ${cliente.email}<br>
                        <i class="fas fa-phone"></i> ${cliente.telefono}
                    </div>

                    <!-- Artículos Frecuentes -->
                    <div class="articulos-frecuentes-section mt-2">
                        <div class="section-mini-header">
                            <span><i class="fas fa-shopping-cart"></i> Artículos Frecuentes</span>
                            <button class="btn-icon-small" onclick="addArticuloFrecuente(${cliente.id})" title="Agregar artículo">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        ${articulosFrecuentes.length > 0 ? `
                            <div class="articulos-lista">
                                ${articulosFrecuentes.map(art => {
                                    const prod = productos.find(p => p.id === art.productoId);
                                    return `
                                        <div class="articulo-item">
                                            <span class="articulo-nombre" title="${prod ? prod.nombre : 'Producto no encontrado'}">
                                                ${prod ? prod.nombre.substring(0, 25) + (prod.nombre.length > 25 ? '...' : '') : 'N/A'}
                                            </span>
                                            <span class="articulo-precio">$${(art.ultimoPrecio || 0).toFixed(2)}</span>
                                            <button class="btn-icon-tiny" onclick="removeArticuloFrecuente(${cliente.id}, ${art.productoId})" title="Quitar">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        ` : '<p class="text-muted text-small">Sin artículos frecuentes</p>'}
                    </div>

                    <div class="d-flex justify-between align-center mt-2">
                        <span class="text-muted" style="font-size:0.8rem">
                            <i class="fas fa-globe"></i> Portal: ${cliente.accesoPortal ? 'Activo' : 'Inactivo'}
                        </span>
                        <div>
                            <button class="btn-icon-small" onclick="viewCliente(${cliente.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
                            <button class="btn-icon-small" onclick="editCliente(${cliente.id})" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon-small" onclick="deleteCliente(${cliente.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

// Agregar artículo frecuente a un cliente
function addArticuloFrecuente(clienteId) {
    const cliente = db.getCliente(clienteId);
    const productos = db.getProductos();
    const articulosExistentes = (cliente.articulosFrecuentes || []).map(a => a.productoId);

    // Filtrar productos que no están ya agregados
    const productosDisponibles = productos.filter(p => !articulosExistentes.includes(p.id));

    if (productosDisponibles.length === 0) {
        showToast('Todos los productos ya están agregados');
        return;
    }

    const content = `
        <form id="articuloFrecuenteForm">
            <div class="form-group">
                <label>Producto</label>
                <select name="productoId" required>
                    <option value="">Seleccionar producto...</option>
                    ${productosDisponibles.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Último Precio Unitario</label>
                <input type="number" name="ultimoPrecio" step="0.01" min="0" placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Notas</label>
                <textarea name="notas" rows="2" placeholder="Ej: Pedido mensual, especificaciones especiales..."></textarea>
            </div>
        </form>
    `;

    openModal(`Agregar Artículo - ${cliente.nombreComercial}`, content, () => {
        const form = document.getElementById('articuloFrecuenteForm');
        const formData = new FormData(form);

        const productoId = parseInt(formData.get('productoId'));
        if (!productoId) {
            showToast('Seleccione un producto');
            return;
        }

        const articulo = {
            productoId,
            ultimoPrecio: parseFloat(formData.get('ultimoPrecio')) || 0,
            notas: formData.get('notas') || ''
        };

        db.addArticuloFrecuente(clienteId, articulo);
        closeModal();
        loadClientes();
        showToast('Artículo agregado');
    });
}

// Remover artículo frecuente de un cliente
function removeArticuloFrecuente(clienteId, productoId) {
    if (confirm('¿Eliminar este artículo de los frecuentes?')) {
        db.removeArticuloFrecuente(clienteId, productoId);
        loadClientes();
        showToast('Artículo removido');
    }
}

function showNuevoClienteModal() {
    const content = `
        <form id="nuevoClienteForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Razón Social *</label>
                    <input type="text" name="razonSocial" required>
                </div>
                <div class="form-group">
                    <label>Nombre Comercial *</label>
                    <input type="text" name="nombreComercial" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Tipo de Cliente *</label>
                    <select name="tipo" required>
                        <option value="externo">Externo</option>
                        <option value="estrategico">Estratégico</option>
                        <option value="interno">Interno</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Contacto Principal *</label>
                    <input type="text" name="contacto" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" name="telefono">
                </div>
            </div>
            <div class="form-group">
                <label>Dirección</label>
                <input type="text" name="direccion">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" name="accesoPortal"> Habilitar acceso al portal de clientes
                </label>
            </div>
            <div class="form-group" id="portalCredentials" style="display:none">
                <label>Usuario del Portal</label>
                <input type="text" name="usuario">
            </div>
        </form>
    `;

    openModal('Nuevo Cliente', content, saveCliente);

    // Toggle de credenciales
    setTimeout(() => {
        const checkbox = document.querySelector('input[name="accesoPortal"]');
        const credentials = document.getElementById('portalCredentials');
        checkbox.addEventListener('change', () => {
            credentials.style.display = checkbox.checked ? 'block' : 'none';
        });
    }, 100);
}

function saveCliente() {
    const form = document.getElementById('nuevoClienteForm');
    const formData = new FormData(form);

    const cliente = {
        razonSocial: formData.get('razonSocial'),
        nombreComercial: formData.get('nombreComercial'),
        tipo: formData.get('tipo'),
        contacto: formData.get('contacto'),
        email: formData.get('email'),
        telefono: formData.get('telefono') || '',
        direccion: formData.get('direccion') || '',
        accesoPortal: form.querySelector('input[name="accesoPortal"]').checked,
        usuario: formData.get('usuario') || null
    };

    db.addCliente(cliente);
    loadClientes();
}

function viewCliente(id) {
    const cliente = db.getCliente(id);
    const pedidos = db.getPedidosByCliente(id);
    const productos = db.getProductosByCliente(id);

    const content = `
        <div class="mb-2">
            <h4>${cliente.razonSocial}</h4>
            <p><strong>Tipo:</strong> ${cliente.tipo}</p>
            <p><strong>Contacto:</strong> ${cliente.contacto}</p>
            <p><strong>Email:</strong> ${cliente.email}</p>
            <p><strong>Teléfono:</strong> ${cliente.telefono || 'N/A'}</p>
            <p><strong>Dirección:</strong> ${cliente.direccion || 'N/A'}</p>
            <p><strong>Alta:</strong> ${formatDate(cliente.fechaAlta)}</p>
        </div>
        <div class="mb-2">
            <h4>Estadísticas</h4>
            <p><strong>Pedidos totales:</strong> ${pedidos.length}</p>
            <p><strong>Productos registrados:</strong> ${productos.length}</p>
        </div>
    `;

    openModal(cliente.nombreComercial, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function editCliente(id) {
    alert('Función de edición en desarrollo');
}

function deleteCliente(id) {
    if (confirm('¿Está seguro de eliminar este cliente?')) {
        db.deleteCliente(id);
        loadClientes();
    }
}

// ========================================
// PRODUCTOS
// ========================================
function loadProductos() {
    const section = document.getElementById('section-productos');
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const familias = db.getFamilias();
    const subfamilias = db.getSubfamilias();

    section.innerHTML = `
        <div class="section-header">
            <h1>Catálogo de Productos</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="showFamiliasModal()">
                    <i class="fas fa-tags"></i> Gestionar Familias
                </button>
                <button class="btn btn-primary" onclick="showNuevoProductoModal()">
                    <i class="fas fa-plus"></i> Nuevo Producto
                </button>
            </div>
        </div>

        <div class="filtros-productos">
            <div class="form-group">
                <label>Cliente</label>
                <select id="filterCliente" onchange="filterProductos()">
                    <option value="">Todos los clientes</option>
                    ${clientes.map(c => `<option value="${c.id}">${c.nombreComercial}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Familia</label>
                <select id="filterFamilia" onchange="filterProductos(); updateSubfamiliaFilter()">
                    <option value="">Todas las familias</option>
                    ${familias.map(f => `<option value="${f.id}">${f.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Subfamilia</label>
                <select id="filterSubfamilia" onchange="filterProductos()">
                    <option value="">Todas las subfamilias</option>
                    ${subfamilias.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="cards-grid productos-grid" id="productosGrid">
            ${renderProductos(productos, clientes, familias, subfamilias)}
        </div>
    `;
}

function updateSubfamiliaFilter() {
    const familiaId = document.getElementById('filterFamilia').value;
    const subfamiliaSelect = document.getElementById('filterSubfamilia');
    const subfamilias = db.getSubfamilias();

    if (familiaId) {
        const subfamiliasFiltered = subfamilias.filter(s => s.familiaId === parseInt(familiaId));
        subfamiliaSelect.innerHTML = `
            <option value="">Todas las subfamilias</option>
            ${subfamiliasFiltered.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
        `;
    } else {
        subfamiliaSelect.innerHTML = `
            <option value="">Todas las subfamilias</option>
            ${subfamilias.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
        `;
    }
}

function filterProductos() {
    const clienteId = document.getElementById('filterCliente').value;
    const familiaId = document.getElementById('filterFamilia').value;
    const subfamiliaId = document.getElementById('filterSubfamilia').value;
    const cards = document.querySelectorAll('#productosGrid .card');

    cards.forEach(card => {
        let show = true;

        if (clienteId && card.dataset.cliente !== clienteId) {
            show = false;
        }
        if (familiaId && card.dataset.familia !== familiaId) {
            show = false;
        }
        if (subfamiliaId && card.dataset.subfamilia !== subfamiliaId) {
            show = false;
        }

        card.style.display = show ? '' : 'none';
    });
}

function showFamiliasModal() {
    const familias = db.getFamilias();
    const subfamilias = db.getSubfamilias();

    const content = `
        <div class="familias-manager">
            <div class="manager-section">
                <h4><i class="fas fa-folder"></i> Familias</h4>
                <div class="familia-list">
                    ${familias.length === 0 ? '<p class="text-muted">No hay familias creadas</p>' : ''}
                    ${familias.map(f => `
                        <div class="familia-item" style="border-left: 4px solid ${f.color}">
                            <div class="familia-info">
                                <span class="familia-nombre">${f.nombre}</span>
                                <span class="familia-count">${db.getProductosByFamilia(f.id).length} productos</span>
                            </div>
                            <div class="familia-actions">
                                <button class="btn-icon-small" onclick="editFamilia(${f.id})" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon-small btn-danger" onclick="deleteFamilia(${f.id})" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="form-group mt-2">
                    <div class="input-group">
                        <input type="text" id="nuevaFamilia" placeholder="Nueva familia..." class="form-control">
                        <button class="btn btn-primary" onclick="addNuevaFamilia()">
                            <i class="fas fa-plus"></i> Agregar
                        </button>
                    </div>
                </div>
            </div>

            <div class="manager-section mt-3">
                <h4><i class="fas fa-folder-open"></i> Subfamilias</h4>
                <div class="subfamilia-list">
                    ${familias.length === 0 ? '<p class="text-muted">Primero crea una familia</p>' : ''}
                    ${familias.map(f => {
                        const subs = subfamilias.filter(s => s.familiaId === f.id);
                        return `
                            <div class="subfamilia-group">
                                <span class="subfamilia-parent" style="color: ${f.color}">
                                    <i class="fas fa-folder"></i> ${f.nombre}
                                </span>
                                <div class="subfamilia-items">
                                    ${subs.length === 0 ? '<span class="text-muted text-small">Sin subfamilias</span>' : ''}
                                    ${subs.map(s => `
                                        <div class="subfamilia-tag">
                                            <span>${s.nombre}</span>
                                            <div class="subfamilia-tag-actions">
                                                <button class="btn-icon-tiny" onclick="editSubfamilia(${s.id})" title="Editar">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-icon-tiny btn-danger" onclick="deleteSubfamilia(${s.id})" title="Eliminar">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="form-row mt-2">
                    <div class="form-group" style="flex: 1;">
                        <select id="familiaParaSubfamilia" class="form-control">
                            <option value="">Seleccionar familia</option>
                            ${familias.map(f => `<option value="${f.id}">${f.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 2;">
                        <div class="input-group">
                            <input type="text" id="nuevaSubfamilia" placeholder="Nueva subfamilia..." class="form-control">
                            <button class="btn btn-primary" onclick="addNuevaSubfamilia()">
                                <i class="fas fa-plus"></i> Agregar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    openModal('Gestionar Familias y Subfamilias', content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function addNuevaFamilia() {
    const nombre = document.getElementById('nuevaFamilia').value.trim();
    if (!nombre) {
        showToast('Ingrese un nombre para la familia');
        return;
    }

    const colores = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const color = colores[db.getFamilias().length % colores.length];

    db.addFamilia({ nombre, color });
    showToast('Familia agregada');
    showFamiliasModal();
}

function addNuevaSubfamilia() {
    const familiaId = document.getElementById('familiaParaSubfamilia').value;
    const nombre = document.getElementById('nuevaSubfamilia').value.trim();

    if (!familiaId) {
        showToast('Seleccione una familia');
        return;
    }
    if (!nombre) {
        showToast('Ingrese un nombre para la subfamilia');
        return;
    }

    db.addSubfamilia({ familiaId: parseInt(familiaId), nombre });
    showToast('Subfamilia agregada');
    showFamiliasModal();
}

// Editar familia
function editFamilia(id) {
    const familia = db.getFamilia(id);
    if (!familia) return;

    const content = `
        <div class="form-group">
            <label>Nombre de la Familia</label>
            <input type="text" id="editFamiliaNombre" value="${familia.nombre}" class="form-control">
        </div>
        <div class="form-group">
            <label>Color</label>
            <input type="color" id="editFamiliaColor" value="${familia.color || '#3b82f6'}" class="form-control">
        </div>
    `;

    openModal('Editar Familia', content, `
        <button class="btn btn-secondary" onclick="closeModal(); showFamiliasModal();">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarEdicionFamilia(${id})">Guardar</button>
    `);
}

function guardarEdicionFamilia(id) {
    const nombre = document.getElementById('editFamiliaNombre').value.trim();
    const color = document.getElementById('editFamiliaColor').value;

    if (!nombre) {
        showToast('El nombre es requerido', 'error');
        return;
    }

    db.updateFamilia(id, { nombre, color });
    showToast('Familia actualizada');
    closeModal();
    showFamiliasModal();
    loadProductos();
}

// Eliminar familia
function deleteFamilia(id) {
    const familia = db.getFamilia(id);
    if (!familia) return;

    const productosEnFamilia = db.getProductosByFamilia(id);
    const subfamiliasEnFamilia = db.getSubfamilias().filter(s => s.familiaId === id);

    let mensaje = `¿Eliminar la familia "${familia.nombre}"?`;
    if (productosEnFamilia.length > 0) {
        mensaje += `<br><br><strong class="text-warning">Advertencia:</strong> Hay ${productosEnFamilia.length} producto(s) en esta familia. Se les quitará la familia asignada.`;
    }
    if (subfamiliasEnFamilia.length > 0) {
        mensaje += `<br><br><strong class="text-warning">Advertencia:</strong> Se eliminarán ${subfamiliasEnFamilia.length} subfamilia(s) asociadas.`;
    }

    openModal('Confirmar Eliminación', `<p>${mensaje}</p>`, `
        <button class="btn btn-secondary" onclick="closeModal(); showFamiliasModal();">Cancelar</button>
        <button class="btn btn-danger" onclick="confirmarDeleteFamilia(${id})">Eliminar</button>
    `);
}

function confirmarDeleteFamilia(id) {
    // Quitar familia de productos
    const productos = db.getProductos();
    productos.forEach(p => {
        if (p.familiaId === id) {
            db.updateProducto(p.id, { familiaId: null, subfamiliaId: null });
        }
    });

    // Eliminar subfamilias de esta familia
    const subfamilias = db.getSubfamilias().filter(s => s.familiaId === id);
    subfamilias.forEach(s => db.deleteSubfamilia(s.id));

    // Eliminar familia
    db.deleteFamilia(id);

    showToast('Familia eliminada');
    closeModal();
    showFamiliasModal();
    loadProductos();
}

// Editar subfamilia
function editSubfamilia(id) {
    const subfamilia = db.getSubfamilia(id);
    if (!subfamilia) return;

    const familias = db.getFamilias();

    const content = `
        <div class="form-group">
            <label>Familia</label>
            <select id="editSubfamiliaFamilia" class="form-control">
                ${familias.map(f => `<option value="${f.id}" ${f.id === subfamilia.familiaId ? 'selected' : ''}>${f.nombre}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label>Nombre de la Subfamilia</label>
            <input type="text" id="editSubfamiliaNombre" value="${subfamilia.nombre}" class="form-control">
        </div>
    `;

    openModal('Editar Subfamilia', content, `
        <button class="btn btn-secondary" onclick="closeModal(); showFamiliasModal();">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarEdicionSubfamilia(${id})">Guardar</button>
    `);
}

function guardarEdicionSubfamilia(id) {
    const familiaId = parseInt(document.getElementById('editSubfamiliaFamilia').value);
    const nombre = document.getElementById('editSubfamiliaNombre').value.trim();

    if (!nombre) {
        showToast('El nombre es requerido', 'error');
        return;
    }

    db.updateSubfamilia(id, { familiaId, nombre });
    showToast('Subfamilia actualizada');
    closeModal();
    showFamiliasModal();
    loadProductos();
}

// Eliminar subfamilia
function deleteSubfamilia(id) {
    const subfamilia = db.getSubfamilia(id);
    if (!subfamilia) return;

    const productosEnSubfamilia = db.getProductos().filter(p => p.subfamiliaId === id);

    let mensaje = `¿Eliminar la subfamilia "${subfamilia.nombre}"?`;
    if (productosEnSubfamilia.length > 0) {
        mensaje += `<br><br><strong class="text-warning">Advertencia:</strong> Hay ${productosEnSubfamilia.length} producto(s) en esta subfamilia. Se les quitará la subfamilia asignada.`;
    }

    openModal('Confirmar Eliminación', `<p>${mensaje}</p>`, `
        <button class="btn btn-secondary" onclick="closeModal(); showFamiliasModal();">Cancelar</button>
        <button class="btn btn-danger" onclick="confirmarDeleteSubfamilia(${id})">Eliminar</button>
    `);
}

function confirmarDeleteSubfamilia(id) {
    // Quitar subfamilia de productos
    const productos = db.getProductos();
    productos.forEach(p => {
        if (p.subfamiliaId === id) {
            db.updateProducto(p.id, { subfamiliaId: null });
        }
    });

    // Eliminar subfamilia
    db.deleteSubfamilia(id);

    showToast('Subfamilia eliminada');
    closeModal();
    showFamiliasModal();
    loadProductos();
}

// Exponer funciones de familias a window
window.showFamiliasModal = showFamiliasModal;
window.addNuevaFamilia = addNuevaFamilia;
window.addNuevaSubfamilia = addNuevaSubfamilia;
window.editFamilia = editFamilia;
window.guardarEdicionFamilia = guardarEdicionFamilia;
window.deleteFamilia = deleteFamilia;
window.confirmarDeleteFamilia = confirmarDeleteFamilia;
window.editSubfamilia = editSubfamilia;
window.guardarEdicionSubfamilia = guardarEdicionSubfamilia;
window.deleteSubfamilia = deleteSubfamilia;
window.confirmarDeleteSubfamilia = confirmarDeleteSubfamilia;
window.updateSubfamiliaFilter = updateSubfamiliaFilter;
window.filterProductos = filterProductos;

function renderProductos(productos, clientes, familias, subfamilias) {
    familias = familias || db.getFamilias();
    subfamilias = subfamilias || db.getSubfamilias();

    return productos.map(producto => {
        const cliente = clientes.find(c => c.id === producto.clienteId);
        const familia = familias.find(f => f.id === producto.familiaId);
        const subfamilia = subfamilias.find(s => s.id === producto.subfamiliaId);
        const rutaProcesos = producto.rutaProcesos || [];
        const procesosHabilitados = rutaProcesos.filter(p => p.habilitado);

        return `
            <div class="card producto-card" data-cliente="${producto.clienteId}" data-familia="${producto.familiaId || ''}" data-subfamilia="${producto.subfamiliaId || ''}">
                <div class="card-header">
                    <span class="card-title">${producto.nombre}</span>
                    <span class="status-badge info">v${producto.version}</span>
                </div>

                ${producto.imagen ? `
                    <div class="producto-imagen">
                        <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.parentElement.style.display='none'">
                    </div>
                ` : `
                    <div class="producto-imagen-placeholder">
                        <i class="fas fa-image"></i>
                        <span>Sin imagen</span>
                    </div>
                `}

                <p class="text-muted mb-1">${cliente ? cliente.nombreComercial : 'N/A'}</p>

                ${familia || subfamilia ? `
                    <div class="producto-categorias">
                        ${familia ? `<span class="tag-categoria" style="background-color: ${familia.color}20; color: ${familia.color}; border: 1px solid ${familia.color}">${familia.nombre}</span>` : ''}
                        ${subfamilia ? `<span class="tag-subcategoria">${subfamilia.nombre}</span>` : ''}
                    </div>
                ` : ''}

                <div class="producto-info">
                    <div class="info-row">
                        <span class="info-icon"><i class="fas fa-ruler-combined"></i></span>
                        <span>${producto.medidas}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-icon"><i class="fas fa-tag"></i></span>
                        <span class="precio-venta">$${(producto.precioVenta || 0).toFixed(2)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-icon"><i class="fas fa-clock"></i></span>
                        <span>${producto.tiempoTotal} min/pza</span>
                    </div>
                    <div class="info-row">
                        <span class="info-icon"><i class="fas fa-tasks"></i></span>
                        <span>${procesosHabilitados.length} procesos activos</span>
                    </div>
                </div>

                ${producto.comentarios ? `
                    <div class="producto-comentarios">
                        <i class="fas fa-comment"></i>
                        <span>${producto.comentarios.substring(0, 50)}${producto.comentarios.length > 50 ? '...' : ''}</span>
                    </div>
                ` : ''}

                <div class="d-flex justify-between align-center mt-2">
                    <span class="status-badge ${producto.activo ? 'success' : 'warning'}">${producto.activo ? 'Activo' : 'Inactivo'}</span>
                    <div>
                        <button class="btn-icon-small" onclick="viewProducto(${producto.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon-small" onclick="editProducto(${producto.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon-small" onclick="duplicarProducto(${producto.id})" title="Duplicar"><i class="fas fa-copy"></i></button>
                        <button class="btn-icon-small" onclick="editRutaProcesos(${producto.id})" title="Ruta de Procesos"><i class="fas fa-route"></i></button>
                        <button class="btn-icon-small inventario-btn" onclick="gestionarInventarioPiezas(${producto.id})" title="Inventario Piezas"><i class="fas fa-cubes"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showNuevoProductoModal() {
    const clientes = db.getClientes();
    const familias = db.getFamilias();
    const subfamilias = db.getSubfamilias();

    const content = `
        <form id="nuevoProductoForm" class="producto-form-enhanced">
            <!-- Información Básica -->
            <div class="form-section">
                <h4><i class="fas fa-info-circle"></i> Información Básica</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Cliente *</label>
                        <select name="clienteId" required>
                            <option value="">Seleccionar...</option>
                            ${clientes.map(c => `<option value="${c.id}">${c.nombreComercial}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nombre del Producto *</label>
                        <input type="text" name="nombre" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Familia</label>
                        <select name="familiaId" id="productoFamiliaSelect" onchange="updateProductoSubfamilias()">
                            <option value="">Sin familia</option>
                            ${familias.map(f => `<option value="${f.id}">${f.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Subfamilia</label>
                        <select name="subfamiliaId" id="productoSubfamiliaSelect">
                            <option value="">Sin subfamilia</option>
                            ${subfamilias.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Especificaciones Técnicas -->
            <div class="form-section">
                <h4><i class="fas fa-ruler-combined"></i> Especificaciones Técnicas</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Medidas</label>
                        <input type="text" name="medidas" placeholder="Ej: 160cm x 62cm">
                    </div>
                    <div class="form-group">
                        <label>Metros x Pieza *</label>
                        <input type="number" name="mtsPorPieza" step="0.01" min="0" placeholder="0.00" required>
                        <small class="text-muted">Para verificación en corte</small>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> Precio de Venta *</label>
                        <div class="input-with-prefix">
                            <span class="input-prefix">$</span>
                            <input type="number" name="precioVenta" step="0.01" min="0" placeholder="0.00" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Tiempo Total (min/pza)</label>
                        <input type="number" name="tiempoTotal" id="tiempoTotalProducto" step="0.1" readonly class="input-readonly">
                        <small class="text-muted">Se calcula automáticamente de la ruta</small>
                    </div>
                </div>
                <div class="form-group">
                    <label>URL de Imagen</label>
                    <input type="text" name="imagen" placeholder="https://...">
                </div>
            </div>

            <!-- Costos de Mano de Obra -->
            <div class="form-section">
                <h4><i class="fas fa-dollar-sign"></i> Costos de Mano de Obra (por pieza)</h4>
                <div class="form-row form-row-4">
                    <div class="form-group">
                        <label><i class="fas fa-cut"></i> MO Corte</label>
                        <div class="input-with-prefix">
                            <span class="input-prefix">$</span>
                            <input type="number" name="moCorte" step="0.01" min="0" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-tshirt"></i> MO Costura</label>
                        <div class="input-with-prefix">
                            <span class="input-prefix">$</span>
                            <input type="number" name="moCostura" step="0.01" min="0" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-paint-brush"></i> MO Serigrafía</label>
                        <div class="input-with-prefix">
                            <span class="input-prefix">$</span>
                            <input type="number" name="moSerigrafia" step="0.01" min="0" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-box"></i> MO Empaque</label>
                        <div class="input-with-prefix">
                            <span class="input-prefix">$</span>
                            <input type="number" name="moEmpaque" step="0.01" min="0" placeholder="0.00">
                        </div>
                    </div>
                </div>
                <div class="mo-total-row">
                    <span class="mo-total-label">Total MO por pieza:</span>
                    <span class="mo-total-value" id="moTotalDisplay">$0.00</span>
                </div>
            </div>

            <!-- Lista de Materiales -->
            <div class="form-section">
                <h4><i class="fas fa-boxes"></i> Lista de Materiales</h4>
                <div class="lista-dinamica-materiales" id="listaMateriales">
                    <div class="material-row" data-index="0">
                        <input type="text" name="material_nombre_0" placeholder="Material" class="form-control">
                        <input type="number" name="material_cantidad_0" placeholder="Cant" step="0.01" min="0" class="form-control">
                        <select name="material_unidad_0" class="form-control">
                            <option value="">Ud</option>
                            <option value="mts">Mts</option>
                            <option value="cm">Cm</option>
                            <option value="pzas">Pzas</option>
                            <option value="kg">Kg</option>
                            <option value="gr">Gr</option>
                            <option value="lts">Lts</option>
                            <option value="rollos">Rollos</option>
                        </select>
                        <input type="text" name="material_medida_0" placeholder="Medida" class="form-control">
                        <input type="text" name="material_color_0" placeholder="Color" class="form-control">
                        <button type="button" class="btn-icon-small btn-danger" onclick="removeMaterialItem(this)" title="Eliminar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm mt-1" onclick="addMaterialItem()">
                    <i class="fas fa-plus"></i> Agregar Material
                </button>
            </div>

            <!-- Descripción Técnica -->
            <div class="form-section">
                <h4><i class="fas fa-clipboard-list"></i> Descripción Técnica</h4>
                <div class="lista-dinamica" id="listaDescripcion">
                    <div class="lista-item" data-index="0">
                        <input type="text" name="descripcion_0" placeholder="Característica o especificación" class="form-control">
                        <button type="button" class="btn-icon-small btn-danger" onclick="removeDescripcionItem(this)" title="Eliminar">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm mt-1" onclick="addDescripcionItem()">
                    <i class="fas fa-plus"></i> Agregar Especificación
                </button>
            </div>

            <!-- Comentarios -->
            <div class="form-section">
                <h4><i class="fas fa-comment"></i> Comentarios Adicionales</h4>
                <div class="form-group">
                    <textarea name="comentarios" rows="2" placeholder="Notas internas sobre el producto..."></textarea>
                </div>
            </div>

            <p class="text-muted mt-2" style="font-size:0.85rem">
                <i class="fas fa-info-circle"></i> Después de crear el producto, configure la ruta de procesos para calcular el tiempo total automáticamente.
            </p>
        </form>
    `;

    openModal('Nuevo Producto', content, saveProducto);

    // Inicializar cálculo de MO total
    setTimeout(() => {
        const moInputs = document.querySelectorAll('input[name^="mo"]');
        moInputs.forEach(input => {
            input.addEventListener('input', calcularMOTotal);
        });
    }, 100);
}

// Calcular total de mano de obra
function calcularMOTotal() {
    const moCorte = parseFloat(document.querySelector('input[name="moCorte"]')?.value) || 0;
    const moCostura = parseFloat(document.querySelector('input[name="moCostura"]')?.value) || 0;
    const moSerigrafia = parseFloat(document.querySelector('input[name="moSerigrafia"]')?.value) || 0;
    const moEmpaque = parseFloat(document.querySelector('input[name="moEmpaque"]')?.value) || 0;

    const total = moCorte + moCostura + moSerigrafia + moEmpaque;
    const display = document.getElementById('moTotalDisplay');
    if (display) {
        display.textContent = '$' + total.toFixed(2);
    }
}

// Funciones para lista dinámica de materiales
function addMaterialItem() {
    const lista = document.getElementById('listaMateriales');
    const items = lista.querySelectorAll('.material-row');
    const newIndex = items.length;

    const newItem = document.createElement('div');
    newItem.className = 'material-row';
    newItem.dataset.index = newIndex;
    newItem.innerHTML = `
        <input type="text" name="material_nombre_${newIndex}" placeholder="Material" class="form-control">
        <input type="number" name="material_cantidad_${newIndex}" placeholder="Cant" step="0.01" min="0" class="form-control">
        <select name="material_unidad_${newIndex}" class="form-control">
            <option value="">Ud</option>
            <option value="mts">Mts</option>
            <option value="cm">Cm</option>
            <option value="pzas">Pzas</option>
            <option value="kg">Kg</option>
            <option value="gr">Gr</option>
            <option value="lts">Lts</option>
            <option value="rollos">Rollos</option>
        </select>
        <input type="text" name="material_medida_${newIndex}" placeholder="Medida" class="form-control">
        <input type="text" name="material_color_${newIndex}" placeholder="Color" class="form-control">
        <button type="button" class="btn-icon-small btn-danger" onclick="removeMaterialItem(this)" title="Eliminar">
            <i class="fas fa-times"></i>
        </button>
    `;
    lista.appendChild(newItem);
}

function removeMaterialItem(btn) {
    const item = btn.closest('.material-row');
    const lista = document.getElementById('listaMateriales');
    if (lista.querySelectorAll('.material-row').length > 1) {
        item.remove();
    } else {
        // Si es el último, solo limpiar
        item.querySelectorAll('input').forEach(input => input.value = '');
    }
}

// Funciones para lista dinámica de descripción técnica
function addDescripcionItem() {
    const lista = document.getElementById('listaDescripcion');
    const items = lista.querySelectorAll('.lista-item');
    const newIndex = items.length;

    const newItem = document.createElement('div');
    newItem.className = 'lista-item';
    newItem.dataset.index = newIndex;
    newItem.innerHTML = `
        <input type="text" name="descripcion_${newIndex}" placeholder="Característica o especificación" class="form-control">
        <button type="button" class="btn-icon-small btn-danger" onclick="removeDescripcionItem(this)" title="Eliminar">
            <i class="fas fa-times"></i>
        </button>
    `;
    lista.appendChild(newItem);
}

function removeDescripcionItem(btn) {
    const item = btn.closest('.lista-item');
    const lista = document.getElementById('listaDescripcion');
    if (lista.querySelectorAll('.lista-item').length > 1) {
        item.remove();
    } else {
        item.querySelectorAll('input').forEach(input => input.value = '');
    }
}

// Exponer funciones a window
window.addMaterialItem = addMaterialItem;
window.removeMaterialItem = removeMaterialItem;
window.addDescripcionItem = addDescripcionItem;
window.removeDescripcionItem = removeDescripcionItem;
window.calcularMOTotal = calcularMOTotal;
window.saveProducto = saveProducto;
window.viewProducto = viewProducto;
window.editProducto = editProducto;
window.showNuevoProductoModal = showNuevoProductoModal;
window.updateProductoSubfamilias = updateProductoSubfamilias;
window.formatMaterialesParaEdicion = formatMaterialesParaEdicion;
window.formatDescripcionParaEdicion = formatDescripcionParaEdicion;
window.parseMaterialesDesdeTexto = parseMaterialesDesdeTexto;

function updateProductoSubfamilias() {
    const familiaId = document.getElementById('productoFamiliaSelect').value;
    const subfamiliaSelect = document.getElementById('productoSubfamiliaSelect');
    const subfamilias = db.getSubfamilias();

    if (familiaId) {
        const filtered = subfamilias.filter(s => s.familiaId === parseInt(familiaId));
        subfamiliaSelect.innerHTML = `
            <option value="">Sin subfamilia</option>
            ${filtered.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
        `;
    } else {
        subfamiliaSelect.innerHTML = `
            <option value="">Sin subfamilia</option>
            ${subfamilias.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
        `;
    }
}

function saveProducto() {
    const form = document.getElementById('nuevoProductoForm');
    const formData = new FormData(form);

    // Recopilar lista de materiales con todos los campos
    const materiales = [];
    const listaMateriales = document.getElementById('listaMateriales');
    if (listaMateriales) {
        listaMateriales.querySelectorAll('.material-row').forEach((item, index) => {
            const nombre = item.querySelector(`input[name="material_nombre_${index}"]`)?.value?.trim();
            const cantidad = parseFloat(item.querySelector(`input[name="material_cantidad_${index}"]`)?.value) || 0;
            const unidad = item.querySelector(`select[name="material_unidad_${index}"]`)?.value || '';
            const medida = item.querySelector(`input[name="material_medida_${index}"]`)?.value?.trim() || '';
            const color = item.querySelector(`input[name="material_color_${index}"]`)?.value?.trim() || '';

            if (nombre) {
                materiales.push({
                    nombre,
                    cantidad,
                    unidad,
                    medida,
                    color
                });
            }
        });
    }

    // Recopilar descripción técnica
    const descripcionTecnica = [];
    const listaDescripcion = document.getElementById('listaDescripcion');
    if (listaDescripcion) {
        listaDescripcion.querySelectorAll('.lista-item').forEach((item, index) => {
            const texto = item.querySelector(`input[name="descripcion_${index}"]`)?.value?.trim();
            if (texto) {
                descripcionTecnica.push(texto);
            }
        });
    }

    const producto = {
        clienteId: parseInt(formData.get('clienteId')),
        familiaId: formData.get('familiaId') ? parseInt(formData.get('familiaId')) : null,
        subfamiliaId: formData.get('subfamiliaId') ? parseInt(formData.get('subfamiliaId')) : null,
        nombre: formData.get('nombre'),
        medidas: formData.get('medidas') || '',
        mtsPorPieza: parseFloat(formData.get('mtsPorPieza')) || 0,
        precioVenta: parseFloat(formData.get('precioVenta')) || 0,
        materiales: materiales,
        descripcionTecnica: descripcionTecnica,
        comentarios: formData.get('comentarios') || '',
        rutaProcesos: [],
        tiempoTotal: 0, // Se calculará al configurar ruta
        imagen: formData.get('imagen') || null,
        // Costos de Mano de Obra
        costosMO: {
            corte: parseFloat(formData.get('moCorte')) || 0,
            costura: parseFloat(formData.get('moCostura')) || 0,
            serigrafia: parseFloat(formData.get('moSerigrafia')) || 0,
            empaque: parseFloat(formData.get('moEmpaque')) || 0
        }
    };

    // Calcular total MO
    producto.costosMO.total = producto.costosMO.corte + producto.costosMO.costura +
                              producto.costosMO.serigrafia + producto.costosMO.empaque;

    const nuevoProducto = db.addProducto(producto);
    loadProductos();

    // Preguntar si quiere configurar procesos
    setTimeout(() => {
        if (confirm('¿Desea configurar la ruta de procesos ahora?')) {
            editRutaProcesos(nuevoProducto.id);
        }
    }, 300);
}

function viewProducto(id) {
    const producto = db.getProducto(id);
    const cliente = db.getCliente(producto.clienteId);
    const bom = db.getBOM(id);
    const rutaProcesos = producto.rutaProcesos || [];
    const materiales = producto.materiales || [];
    const descripcionTecnica = producto.descripcionTecnica || [];
    const costosMO = producto.costosMO || {};

    const content = `
        <div class="producto-detalle-header">
            ${producto.imagen ? `
                <div class="producto-detalle-imagen">
                    <img src="${producto.imagen}" alt="${producto.nombre}">
                </div>
            ` : ''}
            <div class="producto-detalle-info">
                <p><strong>Cliente:</strong> ${cliente?.nombreComercial || 'N/A'}</p>
                <p><strong>Medidas:</strong> ${producto.medidas || 'N/A'}</p>
                <p><strong>Metros x Pieza:</strong> ${producto.mtsPorPieza || 0} mts</p>
                <p><strong>Precio de Venta:</strong> <span class="precio-venta-destacado">$${(producto.precioVenta || 0).toFixed(2)}</span></p>
                <p><strong>Tiempo Total:</strong> ${producto.tiempoTotal || 0} min/pza</p>
                <p><strong>Versión:</strong> ${producto.version}</p>
            </div>
        </div>

        <!-- Costos de Mano de Obra -->
        ${costosMO && (costosMO.corte || costosMO.costura || costosMO.serigrafia || costosMO.empaque) ? `
            <div class="producto-mo-section mt-2">
                <h4><i class="fas fa-dollar-sign"></i> Costos de Mano de Obra (por pieza)</h4>
                <div class="mo-grid">
                    <div class="mo-item">
                        <span class="mo-label"><i class="fas fa-cut"></i> Corte</span>
                        <span class="mo-value">$${(costosMO.corte || 0).toFixed(2)}</span>
                    </div>
                    <div class="mo-item">
                        <span class="mo-label"><i class="fas fa-tshirt"></i> Costura</span>
                        <span class="mo-value">$${(costosMO.costura || 0).toFixed(2)}</span>
                    </div>
                    <div class="mo-item">
                        <span class="mo-label"><i class="fas fa-paint-brush"></i> Serigrafía</span>
                        <span class="mo-value">$${(costosMO.serigrafia || 0).toFixed(2)}</span>
                    </div>
                    <div class="mo-item">
                        <span class="mo-label"><i class="fas fa-box"></i> Empaque</span>
                        <span class="mo-value">$${(costosMO.empaque || 0).toFixed(2)}</span>
                    </div>
                    <div class="mo-item total">
                        <span class="mo-label">Total MO</span>
                        <span class="mo-value">$${(costosMO.total || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- Lista de Materiales -->
        ${(() => {
            // Si es array con objetos que tienen propiedad nombre
            if (Array.isArray(materiales) && materiales.length > 0 && materiales[0] && typeof materiales[0] === 'object' && materiales[0].nombre) {
                return `
                    <div class="producto-materiales-section mt-2">
                        <h4><i class="fas fa-boxes"></i> Lista de Materiales (${materiales.length})</h4>
                        <table class="materiales-tabla">
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th>Cantidad</th>
                                    <th>Unidad</th>
                                    <th>Medida</th>
                                    <th>Color</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${materiales.map(m => `
                                    <tr>
                                        <td class="material-nombre-cell"><strong>${m.nombre || ''}</strong></td>
                                        <td class="material-cantidad-cell">${m.cantidad || '-'}</td>
                                        <td class="material-unidad-cell">${m.unidad || '-'}</td>
                                        <td class="material-medida-cell">${m.medida || '-'}</td>
                                        <td class="material-color-cell">
                                            ${m.color ? `<span class="color-tag">${m.color}</span>` : '-'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            // Si es array de objetos sin propiedad nombre (formato legacy o corrupto)
            if (Array.isArray(materiales) && materiales.length > 0 && materiales[0] && typeof materiales[0] === 'object') {
                // Intentar mostrar los objetos de alguna forma legible
                return `
                    <div class="producto-materiales-section mt-2">
                        <h4><i class="fas fa-boxes"></i> Lista de Materiales (${materiales.length})</h4>
                        <ul class="materiales-lista">
                            ${materiales.map(m => `<li>${Object.values(m).filter(v => v).join(' - ')}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            // Si es array de strings
            if (Array.isArray(materiales) && materiales.length > 0 && typeof materiales[0] === 'string') {
                return `
                    <div class="producto-materiales-section mt-2">
                        <h4><i class="fas fa-boxes"></i> Materiales</h4>
                        <ul class="materiales-lista">
                            ${materiales.map(m => `<li>${m}</li>`).join('')}
                        </ul>
                    </div>
                `;
            }
            // Si es string
            if (typeof materiales === 'string' && materiales.trim()) {
                return `
                    <div class="producto-materiales-section mt-2">
                        <h4><i class="fas fa-boxes"></i> Materiales</h4>
                        <p>${materiales}</p>
                    </div>
                `;
            }
            return '';
        })()}

        <!-- Descripción Técnica -->
        ${Array.isArray(descripcionTecnica) && descripcionTecnica.length > 0 ? `
            <div class="producto-descripcion-section mt-2">
                <h4><i class="fas fa-clipboard-list"></i> Descripción Técnica</h4>
                <ul class="descripcion-lista">
                    ${descripcionTecnica.map(d => `<li>${d}</li>`).join('')}
                </ul>
            </div>
        ` : (producto.descripcion ? `
            <div class="producto-descripcion-section mt-2">
                <h4><i class="fas fa-clipboard-list"></i> Descripción</h4>
                <p>${producto.descripcion}</p>
            </div>
        ` : '')}

        ${producto.comentarios ? `
            <div class="producto-comentarios-full mt-2">
                <h4><i class="fas fa-comment"></i> Comentarios</h4>
                <p>${producto.comentarios}</p>
            </div>
        ` : ''}

        <h4 class="mt-2"><i class="fas fa-route"></i> Ruta de Producción (${rutaProcesos.length} procesos)</h4>
        <div class="ruta-procesos-view">
            ${rutaProcesos.map((proc, index) => {
                const tipoDep = proc.tipoDependencia || 'secuencial';
                const esOpcional = proc.esOpcional || false;
                const tieneParalelos = proc.puedeParaleloCon && proc.puedeParaleloCon.length > 0;

                return `
                    <div class="proceso-item ${proc.habilitado ? '' : 'deshabilitado'} ${tipoDep}">
                        <div class="proceso-orden">${proc.orden}</div>
                        <div class="proceso-info">
                            <span class="proceso-nombre">
                                ${proc.nombre}
                                ${tipoDep === 'paralelo' ? '<i class="fas fa-code-branch" style="color: var(--success-color); margin-left: 5px;" title="Paralelo"></i>' : ''}
                                ${tipoDep === 'independiente' ? '<i class="fas fa-unlink" style="color: var(--info-color); margin-left: 5px;" title="Independiente"></i>' : ''}
                                ${esOpcional ? '<i class="fas fa-forward" style="color: var(--warning-color); margin-left: 5px;" title="Opcional"></i>' : ''}
                            </span>
                            <div class="proceso-stats">
                                <span><i class="fas fa-tachometer-alt"></i> ${proc.capacidadHora} pzas/hr</span>
                                <span><i class="fas fa-stopwatch"></i> ${proc.tiempoEstandar} min</span>
                                ${tieneParalelos ? `<span class="paralelo-info"><i class="fas fa-code-branch"></i> Paralelo con P${proc.puedeParaleloCon.map(p => p + 1).join(', P')}</span>` : ''}
                            </div>
                            <div class="proceso-badges">
                                ${esOpcional ? '<span class="badge-proceso opcional">Opcional</span>' : ''}
                                ${tipoDep === 'paralelo' ? '<span class="badge-proceso paralelo">Paralelo</span>' : ''}
                                ${tipoDep === 'independiente' ? '<span class="badge-proceso independiente">Independiente</span>' : ''}
                            </div>
                        </div>
                        <span class="status-badge ${proc.habilitado ? 'success' : 'secondary'}">${proc.habilitado ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    ${index < rutaProcesos.length - 1 ? `<div class="proceso-arrow ${rutaProcesos[index + 1]?.tipoDependencia === 'paralelo' ? 'paralelo' : ''}"><i class="fas fa-arrow-down"></i></div>` : ''}
                `;
            }).join('')}
        </div>

        ${bom.length > 0 ? `
            <h4 class="mt-2"><i class="fas fa-boxes"></i> BOM (Lista de Materiales)</h4>
            <table class="data-table">
                <thead><tr><th>Material</th><th>Cantidad</th></tr></thead>
                <tbody>
                    ${bom.map(b => {
                        const mat = db.getMaterial(b.materialId);
                        return `<tr><td>${mat?.nombre || 'N/A'}</td><td>${b.cantidad} ${b.unidad}</td></tr>`;
                    }).join('')}
                </tbody>
            </table>
        ` : ''}
    `;

    openModal(producto.nombre, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Funciones helper para formatear datos en edición
function formatMaterialesParaEdicion(materiales) {
    if (!materiales) return '';

    // Si es array de objetos con estructura {nombre, cantidad, unidad, medida, color}
    if (Array.isArray(materiales) && materiales.length > 0) {
        if (materiales[0] && typeof materiales[0] === 'object' && materiales[0].nombre) {
            return materiales.map(m => {
                const partes = [m.nombre || ''];
                if (m.cantidad) partes.push(m.cantidad);
                if (m.unidad) partes.push(m.unidad);
                if (m.medida) partes.push(m.medida);
                if (m.color) partes.push(m.color);
                return partes.join(', ');
            }).join('\n');
        }
        // Si es array de objetos sin propiedad nombre
        if (materiales[0] && typeof materiales[0] === 'object') {
            return materiales.map(m => Object.values(m).filter(v => v).join(', ')).join('\n');
        }
        // Si es array de strings
        if (typeof materiales[0] === 'string') {
            return materiales.join('\n');
        }
        return '';
    }

    // Si es string con [object Object], es un dato corrupto
    if (typeof materiales === 'string' && materiales.includes('[object Object]')) {
        return ''; // Datos corruptos, mejor vacío
    }

    // Si es string, devolverlo tal cual
    if (typeof materiales === 'string') {
        return materiales;
    }

    return '';
}

function formatDescripcionParaEdicion(descripcion) {
    if (!descripcion) return '';

    // Si es array, unir con saltos de línea
    if (Array.isArray(descripcion)) {
        return descripcion.join('\n');
    }

    // Si es string, devolverlo tal cual
    if (typeof descripcion === 'string') {
        return descripcion;
    }

    return '';
}

// Convierte texto del textarea a array de objetos de materiales
// Formato esperado: Material, Cantidad, Unidad, Medida, Color (uno por línea)
function parseMaterialesDesdeTexto(texto) {
    if (!texto || !texto.trim()) return [];

    const lineas = texto.split('\n').filter(l => l.trim());
    return lineas.map(linea => {
        const partes = linea.split(',').map(p => p.trim());
        return {
            nombre: partes[0] || '',
            cantidad: parseFloat(partes[1]) || 0,
            unidad: partes[2] || '',
            medida: partes[3] || '',
            color: partes[4] || ''
        };
    }).filter(m => m.nombre); // Solo incluir materiales que tengan nombre
}

function editProducto(id) {
    const producto = db.getProducto(id);
    const clientes = db.getClientes();

    const content = `
        <form id="editarProductoForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Cliente *</label>
                    <select name="clienteId" required>
                        ${clientes.map(c => `<option value="${c.id}" ${producto.clienteId === c.id ? 'selected' : ''}>${c.nombreComercial}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Nombre del Producto *</label>
                    <input type="text" name="nombre" value="${producto.nombre}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Medidas</label>
                    <input type="text" name="medidas" value="${producto.medidas || ''}" placeholder="Ej: 160cm x 62cm">
                </div>
                <div class="form-group">
                    <label>Mts x Pieza</label>
                    <input type="number" name="mtsPorPieza" step="0.01" value="${producto.mtsPorPieza || ''}" placeholder="0.00">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label><i class="fas fa-tag"></i> Precio de Venta</label>
                    <div class="input-with-prefix">
                        <span class="input-prefix">$</span>
                        <input type="number" name="precioVenta" step="0.01" min="0" value="${producto.precioVenta || ''}" placeholder="0.00">
                    </div>
                </div>
                <div class="form-group">
                    <label>Tiempo Total (min/pza)</label>
                    <input type="number" name="tiempoTotal" step="0.1" value="${producto.tiempoTotal || 0}" readonly class="readonly-field">
                </div>
            </div>
            <div class="form-group">
                <label>Materiales</label>
                <textarea name="materiales" rows="2">${formatMaterialesParaEdicion(producto.materiales || producto.listaMateriales)}</textarea>
                <small class="text-muted">Formato: Material, Cantidad, Unidad, Medida, Color (uno por línea)</small>
            </div>
            <div class="form-group">
                <label>Descripción Técnica</label>
                <textarea name="descripcion" rows="2">${formatDescripcionParaEdicion(producto.descripcionTecnica || producto.descripcion)}</textarea>
                <small class="text-muted">Una característica por línea</small>
            </div>
            <div class="form-group">
                <label>Comentarios Adicionales</label>
                <textarea name="comentarios" rows="3" placeholder="Notas internas sobre el producto...">${producto.comentarios || ''}</textarea>
            </div>
            <div class="form-group">
                <label>URL de Imagen</label>
                <input type="text" name="imagen" value="${producto.imagen || ''}" placeholder="https://...">
                <small class="text-muted">Ingrese la URL de una imagen del producto</small>
            </div>
            <div class="form-group">
                <label><input type="checkbox" name="activo" ${producto.activo ? 'checked' : ''}> Producto activo</label>
            </div>
        </form>
    `;

    openModal('Editar Producto', content, () => {
        const form = document.getElementById('editarProductoForm');

        // Procesar materiales del textarea a array de objetos
        const materialesTexto = form.querySelector('[name="materiales"]').value;
        const materialesArray = parseMaterialesDesdeTexto(materialesTexto);

        // Procesar descripción del textarea a array
        const descripcionTexto = form.querySelector('[name="descripcion"]').value;
        const descripcionArray = descripcionTexto.split('\n').map(l => l.trim()).filter(l => l);

        const updates = {
            clienteId: parseInt(form.querySelector('[name="clienteId"]').value),
            nombre: form.querySelector('[name="nombre"]').value,
            medidas: form.querySelector('[name="medidas"]').value,
            mtsPorPieza: parseFloat(form.querySelector('[name="mtsPorPieza"]').value) || 0,
            precioVenta: parseFloat(form.querySelector('[name="precioVenta"]').value) || 0,
            tiempoTotal: parseFloat(form.querySelector('[name="tiempoTotal"]').value) || 0,
            materiales: materialesArray,
            descripcionTecnica: descripcionArray,
            comentarios: form.querySelector('[name="comentarios"]').value,
            imagen: form.querySelector('[name="imagen"]').value || null,
            activo: form.querySelector('[name="activo"]').checked
        };

        db.updateProducto(id, updates);
        loadProductos();
    });
}

// Función para duplicar un producto existente
function duplicarProducto(id) {
    const producto = db.getProducto(id);
    if (!producto) {
        showToast('Producto no encontrado', 'error');
        return;
    }

    const clientes = db.getClientes();
    const familias = db.getFamilias();
    const subfamilias = db.getSubfamilias();

    // Preparar datos para mostrar en el formulario
    const rutaProcesosJSON = JSON.stringify(producto.rutaProcesos || []);

    const content = `
        <form id="duplicarProductoForm" class="producto-form-enhanced">
            <div class="alert alert-info mb-2">
                <i class="fas fa-info-circle"></i>
                <span>Duplicando: <strong>${producto.nombre}</strong>. Modifique los campos necesarios y guarde.</span>
            </div>

            <!-- Información Básica -->
            <div class="form-section">
                <h4><i class="fas fa-info-circle"></i> Información Básica</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Cliente *</label>
                        <select name="clienteId" required>
                            <option value="">Seleccionar...</option>
                            ${clientes.map(c => `<option value="${c.id}" ${producto.clienteId === c.id ? 'selected' : ''}>${c.nombreComercial}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Nombre del Producto *</label>
                        <input type="text" name="nombre" value="${producto.nombre} (Copia)" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Familia</label>
                        <select name="familiaId" id="dupFamiliaSelect" onchange="updateDupSubfamilias()">
                            <option value="">Sin familia</option>
                            ${familias.map(f => `<option value="${f.id}" ${producto.familiaId === f.id ? 'selected' : ''}>${f.nombre}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Subfamilia</label>
                        <select name="subfamiliaId" id="dupSubfamiliaSelect">
                            <option value="">Sin subfamilia</option>
                            ${subfamilias.filter(s => s.familiaId === producto.familiaId).map(s =>
                                `<option value="${s.id}" ${producto.subfamiliaId === s.id ? 'selected' : ''}>${s.nombre}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Especificaciones -->
            <div class="form-section">
                <h4><i class="fas fa-ruler-combined"></i> Especificaciones</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Medidas</label>
                        <input type="text" name="medidas" value="${producto.medidas || ''}" placeholder="Ej: 160cm x 62cm">
                    </div>
                    <div class="form-group">
                        <label>Mts x Pieza</label>
                        <input type="number" name="mtsPorPieza" step="0.01" value="${producto.mtsPorPieza || ''}" placeholder="Ej: 1.5">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label><i class="fas fa-tag"></i> Precio de Venta</label>
                        <div class="input-with-prefix">
                            <span class="input-prefix">$</span>
                            <input type="number" name="precioVenta" step="0.01" min="0" value="${producto.precioVenta || ''}" placeholder="0.00">
                        </div>
                    </div>
                    <div class="form-group"></div>
                </div>
            </div>

            <!-- Costos MO -->
            <div class="form-section">
                <h4><i class="fas fa-hand-holding-usd"></i> Costos de Mano de Obra</h4>
                <div class="mo-grid">
                    <div class="form-group">
                        <label>MO Corte</label>
                        <input type="number" name="moCorte" step="0.01" value="${producto.moCorte || ''}" placeholder="$0.00">
                    </div>
                    <div class="form-group">
                        <label>MO Costura</label>
                        <input type="number" name="moCostura" step="0.01" value="${producto.moCostura || ''}" placeholder="$0.00">
                    </div>
                    <div class="form-group">
                        <label>MO Serigrafía</label>
                        <input type="number" name="moSerigrafia" step="0.01" value="${producto.moSerigrafia || ''}" placeholder="$0.00">
                    </div>
                    <div class="form-group">
                        <label>MO Empaque</label>
                        <input type="number" name="moEmpaque" step="0.01" value="${producto.moEmpaque || ''}" placeholder="$0.00">
                    </div>
                </div>
                <div class="form-group">
                    <label>Tiempo Total (min/pza)</label>
                    <input type="number" name="tiempoTotal" step="0.1" value="${producto.tiempoTotal || 0}" readonly class="readonly-field">
                    <small class="text-muted">Se calcula automáticamente desde la ruta de procesos</small>
                </div>
            </div>

            <!-- Lista de Materiales -->
            <div class="form-section">
                <h4><i class="fas fa-boxes"></i> Lista de Materiales</h4>
                <div id="dupMaterialesList">
                    ${(producto.listaMateriales && producto.listaMateriales.length > 0) ?
                        producto.listaMateriales.map((mat, idx) => `
                            <div class="material-row" data-index="${idx}">
                                <input type="text" name="material_nombre[]" placeholder="Material" value="${mat.nombre || ''}">
                                <input type="number" name="material_cantidad[]" placeholder="Cant" step="0.01" value="${mat.cantidad || ''}">
                                <input type="text" name="material_unidad[]" placeholder="Unidad" value="${mat.unidad || ''}">
                                <input type="text" name="material_medida[]" placeholder="Medida" value="${mat.medida || ''}">
                                <input type="text" name="material_color[]" placeholder="Color" value="${mat.color || ''}">
                                <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('') :
                        `<div class="material-row" data-index="0">
                            <input type="text" name="material_nombre[]" placeholder="Material">
                            <input type="number" name="material_cantidad[]" placeholder="Cant" step="0.01">
                            <input type="text" name="material_unidad[]" placeholder="Unidad">
                            <input type="text" name="material_medida[]" placeholder="Medida">
                            <input type="text" name="material_color[]" placeholder="Color">
                            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`
                    }
                </div>
                <button type="button" class="btn btn-sm btn-secondary mt-1" onclick="addDupMaterialItem()">
                    <i class="fas fa-plus"></i> Agregar Material
                </button>
            </div>

            <!-- Descripción Técnica -->
            <div class="form-section">
                <h4><i class="fas fa-clipboard-list"></i> Descripción Técnica</h4>
                <div id="dupDescripcionList">
                    ${(producto.descripcionTecnica && producto.descripcionTecnica.length > 0) ?
                        producto.descripcionTecnica.map((desc, idx) => `
                            <div class="descripcion-row" data-index="${idx}">
                                <input type="text" name="descripcion_item[]" placeholder="Característica técnica" value="${desc}">
                                <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('') :
                        `<div class="descripcion-row" data-index="0">
                            <input type="text" name="descripcion_item[]" placeholder="Característica técnica">
                            <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>`
                    }
                </div>
                <button type="button" class="btn btn-sm btn-secondary mt-1" onclick="addDupDescripcionItem()">
                    <i class="fas fa-plus"></i> Agregar Característica
                </button>
            </div>

            <!-- Otros -->
            <div class="form-section">
                <h4><i class="fas fa-cog"></i> Otros</h4>
                <div class="form-group">
                    <label>Comentarios Adicionales</label>
                    <textarea name="comentarios" rows="2" placeholder="Notas internas...">${producto.comentarios || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>URL de Imagen</label>
                    <input type="text" name="imagen" value="${producto.imagen || ''}" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label><input type="checkbox" name="activo" checked> Producto activo</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" name="copiarRuta" checked> Copiar ruta de procesos</label>
                </div>
            </div>

            <!-- Datos ocultos para copiar ruta -->
            <input type="hidden" id="dupRutaProcesos" value='${rutaProcesosJSON.replace(/'/g, "&#39;")}'>
        </form>
    `;

    openModal('Duplicar Producto', content, () => {
        const form = document.getElementById('duplicarProductoForm');

        // Recolectar lista de materiales
        const listaMateriales = [];
        const materialRows = form.querySelectorAll('.material-row');
        materialRows.forEach(row => {
            const nombre = row.querySelector('[name="material_nombre[]"]').value.trim();
            if (nombre) {
                listaMateriales.push({
                    nombre: nombre,
                    cantidad: parseFloat(row.querySelector('[name="material_cantidad[]"]').value) || 0,
                    unidad: row.querySelector('[name="material_unidad[]"]').value.trim(),
                    medida: row.querySelector('[name="material_medida[]"]').value.trim(),
                    color: row.querySelector('[name="material_color[]"]').value.trim()
                });
            }
        });

        // Recolectar descripción técnica
        const descripcionTecnica = [];
        const descRows = form.querySelectorAll('.descripcion-row');
        descRows.forEach(row => {
            const item = row.querySelector('[name="descripcion_item[]"]').value.trim();
            if (item) {
                descripcionTecnica.push(item);
            }
        });

        // Obtener ruta de procesos si se debe copiar
        let rutaProcesos = [];
        const copiarRuta = form.querySelector('[name="copiarRuta"]').checked;
        if (copiarRuta) {
            try {
                rutaProcesos = JSON.parse(document.getElementById('dupRutaProcesos').value);
            } catch (e) {
                rutaProcesos = [];
            }
        }

        const nuevoProducto = {
            clienteId: parseInt(form.querySelector('[name="clienteId"]').value),
            nombre: form.querySelector('[name="nombre"]').value,
            familiaId: parseInt(form.querySelector('[name="familiaId"]').value) || null,
            subfamiliaId: parseInt(form.querySelector('[name="subfamiliaId"]').value) || null,
            medidas: form.querySelector('[name="medidas"]').value,
            mtsPorPieza: parseFloat(form.querySelector('[name="mtsPorPieza"]').value) || null,
            precioVenta: parseFloat(form.querySelector('[name="precioVenta"]').value) || 0,
            moCorte: parseFloat(form.querySelector('[name="moCorte"]').value) || 0,
            moCostura: parseFloat(form.querySelector('[name="moCostura"]').value) || 0,
            moSerigrafia: parseFloat(form.querySelector('[name="moSerigrafia"]').value) || 0,
            moEmpaque: parseFloat(form.querySelector('[name="moEmpaque"]').value) || 0,
            tiempoTotal: parseFloat(form.querySelector('[name="tiempoTotal"]').value) || 0,
            materiales: listaMateriales,
            descripcionTecnica: descripcionTecnica,
            comentarios: form.querySelector('[name="comentarios"]').value,
            imagen: form.querySelector('[name="imagen"]').value || null,
            activo: form.querySelector('[name="activo"]').checked,
            rutaProcesos: rutaProcesos,
            version: 1
        };

        db.addProducto(nuevoProducto);
        showToast('Producto duplicado exitosamente', 'success');
        loadProductos();
    });
}

// Funciones auxiliares para el formulario de duplicar
function updateDupSubfamilias() {
    const familiaId = parseInt(document.getElementById('dupFamiliaSelect').value);
    const subfamiliaSelect = document.getElementById('dupSubfamiliaSelect');
    const subfamilias = db.getSubfamilias().filter(s => s.familiaId === familiaId);

    subfamiliaSelect.innerHTML = '<option value="">Sin subfamilia</option>' +
        subfamilias.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
}

function addDupMaterialItem() {
    const container = document.getElementById('dupMaterialesList');
    const index = container.querySelectorAll('.material-row').length;
    const newRow = document.createElement('div');
    newRow.className = 'material-row';
    newRow.dataset.index = index;
    newRow.innerHTML = `
        <input type="text" name="material_nombre[]" placeholder="Material">
        <input type="number" name="material_cantidad[]" placeholder="Cant" step="0.01">
        <input type="text" name="material_unidad[]" placeholder="Unidad">
        <input type="text" name="material_medida[]" placeholder="Medida">
        <input type="text" name="material_color[]" placeholder="Color">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(newRow);
}

function addDupDescripcionItem() {
    const container = document.getElementById('dupDescripcionList');
    const index = container.querySelectorAll('.descripcion-row').length;
    const newRow = document.createElement('div');
    newRow.className = 'descripcion-row';
    newRow.dataset.index = index;
    newRow.innerHTML = `
        <input type="text" name="descripcion_item[]" placeholder="Característica técnica">
        <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(newRow);
}

// Exponer funciones a window
window.duplicarProducto = duplicarProducto;
window.updateDupSubfamilias = updateDupSubfamilias;
window.addDupMaterialItem = addDupMaterialItem;
window.addDupDescripcionItem = addDupDescripcionItem;

// ========================================
// INVENTARIO GENERAL DE PIEZAS
// ========================================
function showInventarioGeneralModal() {
    const productos = db.getProductos();
    const todasLasPiezas = db.getInventarioPiezas();

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

    // Productos sin inventario configurado
    const productosSinInventario = productos.filter(p => !piezasPorProducto[p.id] || piezasPorProducto[p.id].length === 0);

    // Estadísticas generales
    const totalPiezasTipos = todasLasPiezas.length;
    const totalCantidad = todasLasPiezas.reduce((sum, p) => sum + (p.cantidadDisponible || 0), 0);
    const piezasBajas = todasLasPiezas.filter(p => p.cantidadDisponible <= (p.cantidadMinima || 0)).length;

    const content = `
        <div class="inventario-general-container">
            <!-- Estadísticas -->
            <div class="inventario-stats-row">
                <div class="inv-stat-card">
                    <i class="fas fa-cubes"></i>
                    <div class="inv-stat-info">
                        <span class="inv-stat-value">${totalPiezasTipos}</span>
                        <span class="inv-stat-label">Tipos de Piezas</span>
                    </div>
                </div>
                <div class="inv-stat-card">
                    <i class="fas fa-boxes"></i>
                    <div class="inv-stat-info">
                        <span class="inv-stat-value">${totalCantidad.toLocaleString()}</span>
                        <span class="inv-stat-label">Piezas Totales</span>
                    </div>
                </div>
                <div class="inv-stat-card">
                    <i class="fas fa-box-open"></i>
                    <div class="inv-stat-info">
                        <span class="inv-stat-value">${productosConInventario.length}</span>
                        <span class="inv-stat-label">Productos con Inventario</span>
                    </div>
                </div>
                <div class="inv-stat-card ${piezasBajas > 0 ? 'alerta' : ''}">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="inv-stat-info">
                        <span class="inv-stat-value">${piezasBajas}</span>
                        <span class="inv-stat-label">Stock Bajo</span>
                    </div>
                </div>
            </div>

            <!-- Filtro de búsqueda -->
            <div class="inventario-search-bar">
                <i class="fas fa-search"></i>
                <input type="text" id="buscarInventario" placeholder="Buscar producto o pieza..." onkeyup="filtrarInventarioGeneral()">
            </div>

            <!-- Lista de productos con inventario -->
            <div class="inventario-productos-lista" id="inventarioProductosLista">
                ${productosConInventario.length === 0 ? `
                    <div class="inventario-empty">
                        <i class="fas fa-inbox"></i>
                        <p>No hay piezas en inventario</p>
                        <span>Selecciona un producto para agregar piezas intermedias</span>
                    </div>
                ` : productosConInventario.map(producto => {
                    const piezas = piezasPorProducto[producto.id] || [];
                    const totalProducto = piezas.reduce((sum, p) => sum + (p.cantidadDisponible || 0), 0);
                    const tieneBajas = piezas.some(p => p.cantidadDisponible <= (p.cantidadMinima || 0));

                    return `
                        <div class="inventario-producto-card ${tieneBajas ? 'tiene-alertas' : ''}" data-producto-nombre="${producto.nombre.toLowerCase()}">
                            <div class="inv-producto-header" onclick="toggleInventarioProducto(${producto.id})">
                                <div class="inv-producto-info">
                                    <span class="inv-producto-nombre">${producto.nombre}</span>
                                    <span class="inv-producto-stats">
                                        <span class="badge-piezas"><i class="fas fa-puzzle-piece"></i> ${piezas.length} tipos</span>
                                        <span class="badge-cantidad"><i class="fas fa-boxes"></i> ${totalProducto.toLocaleString()} pzas</span>
                                        ${tieneBajas ? '<span class="badge-alerta"><i class="fas fa-exclamation-circle"></i> Stock bajo</span>' : ''}
                                    </span>
                                </div>
                                <div class="inv-producto-actions">
                                    <button class="btn-icon" onclick="event.stopPropagation(); gestionarInventarioPiezas(${producto.id})" title="Gestionar inventario">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <i class="fas fa-chevron-down inv-expand-icon"></i>
                                </div>
                            </div>
                            <div class="inv-producto-piezas" id="invPiezas-${producto.id}">
                                ${piezas.map(pieza => {
                                    const porcentaje = pieza.cantidadMinima > 0 ? Math.min(100, (pieza.cantidadDisponible / pieza.cantidadMinima) * 100) : 100;
                                    const estadoClase = pieza.cantidadDisponible <= 0 ? 'agotado' :
                                                       pieza.cantidadDisponible <= pieza.cantidadMinima ? 'bajo' : 'ok';
                                    return `
                                        <div class="inv-pieza-item ${estadoClase}" data-pieza-nombre="${pieza.procesoNombre.toLowerCase()}">
                                            <div class="inv-pieza-icono">
                                                <i class="fas fa-cube"></i>
                                            </div>
                                            <div class="inv-pieza-info">
                                                <span class="inv-pieza-nombre">${pieza.procesoNombre}</span>
                                                <div class="inv-pieza-barra">
                                                    <div class="inv-pieza-progreso ${estadoClase}" style="width: ${porcentaje}%"></div>
                                                </div>
                                            </div>
                                            <div class="inv-pieza-cantidad">
                                                <span class="cantidad-actual">${pieza.cantidadDisponible.toLocaleString()}</span>
                                                <span class="cantidad-unidad">${pieza.unidad || 'pzas'}</span>
                                            </div>
                                            <div class="inv-pieza-acciones">
                                                <button class="btn-mini btn-agregar" onclick="event.stopPropagation(); agregarPiezasModal(${pieza.id})" title="Agregar">
                                                    <i class="fas fa-plus"></i>
                                                </button>
                                                <button class="btn-mini btn-descontar" onclick="event.stopPropagation(); descontarPiezasModal(${pieza.id})" title="Descontar">
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

            <!-- Productos sin inventario -->
            ${productosSinInventario.length > 0 ? `
                <div class="inventario-sin-config">
                    <h4><i class="fas fa-box"></i> Productos sin inventario configurado (${productosSinInventario.length})</h4>
                    <div class="productos-sin-inv-grid">
                        ${productosSinInventario.slice(0, 10).map(p => `
                            <div class="producto-sin-inv-chip" onclick="gestionarInventarioPiezas(${p.id})">
                                <span>${p.nombre}</span>
                                <i class="fas fa-plus-circle"></i>
                            </div>
                        `).join('')}
                        ${productosSinInventario.length > 10 ? `
                            <div class="producto-sin-inv-chip mas" onclick="mostrarTodosProductosSinInventario()">
                                <span>+${productosSinInventario.length - 10} más</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    openModal('Inventario General de Piezas', content, null);
    document.getElementById('modalFooter').style.display = 'none';

    // Agregar estilos inline si no existen
    if (!document.getElementById('inventario-general-styles')) {
        const styles = document.createElement('style');
        styles.id = 'inventario-general-styles';
        styles.textContent = `
            .inventario-general-container {
                max-height: 70vh;
                overflow-y: auto;
            }
            .inventario-stats-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 20px;
            }
            .inv-stat-card {
                background: linear-gradient(135deg, #1e293b, #334155);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .inv-stat-card i {
                font-size: 1.5rem;
                color: #60a5fa;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(96, 165, 250, 0.15);
                border-radius: 10px;
            }
            .inv-stat-card.alerta i {
                color: #f59e0b;
                background: rgba(245, 158, 11, 0.15);
            }
            .inv-stat-info {
                display: flex;
                flex-direction: column;
            }
            .inv-stat-value {
                font-size: 1.4rem;
                font-weight: 700;
                color: #f1f5f9;
            }
            .inv-stat-label {
                font-size: 0.75rem;
                color: #94a3b8;
            }
            .inventario-search-bar {
                display: flex;
                align-items: center;
                background: #1e293b;
                border-radius: 10px;
                padding: 10px 16px;
                margin-bottom: 16px;
                gap: 10px;
            }
            .inventario-search-bar i {
                color: #64748b;
            }
            .inventario-search-bar input {
                flex: 1;
                background: transparent;
                border: none;
                color: #f1f5f9;
                font-size: 0.95rem;
                outline: none;
            }
            .inventario-search-bar input::placeholder {
                color: #64748b;
            }
            .inventario-productos-lista {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .inventario-empty {
                text-align: center;
                padding: 40px 20px;
                color: #64748b;
            }
            .inventario-empty i {
                font-size: 3rem;
                margin-bottom: 12px;
                opacity: 0.5;
            }
            .inventario-empty p {
                font-size: 1.1rem;
                color: #94a3b8;
                margin-bottom: 4px;
            }
            .inventario-producto-card {
                background: #1e293b;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #334155;
            }
            .inventario-producto-card.tiene-alertas {
                border-color: #f59e0b;
            }
            .inv-producto-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .inv-producto-header:hover {
                background: #334155;
            }
            .inv-producto-info {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .inv-producto-nombre {
                font-weight: 600;
                color: #f1f5f9;
                font-size: 0.95rem;
            }
            .inv-producto-stats {
                display: flex;
                gap: 10px;
            }
            .inv-producto-stats span {
                font-size: 0.7rem;
                padding: 3px 8px;
                border-radius: 6px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .badge-piezas {
                background: rgba(96, 165, 250, 0.15);
                color: #60a5fa;
            }
            .badge-cantidad {
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
            }
            .badge-alerta {
                background: rgba(245, 158, 11, 0.15);
                color: #fbbf24;
            }
            .inv-producto-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .inv-producto-actions .btn-icon {
                background: rgba(96, 165, 250, 0.1);
                border: none;
                color: #60a5fa;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .inv-producto-actions .btn-icon:hover {
                background: rgba(96, 165, 250, 0.25);
            }
            .inv-expand-icon {
                color: #64748b;
                transition: transform 0.3s;
            }
            .inventario-producto-card.expanded .inv-expand-icon {
                transform: rotate(180deg);
            }
            .inv-producto-piezas {
                display: none;
                background: #0f172a;
                border-top: 1px solid #334155;
            }
            .inventario-producto-card.expanded .inv-producto-piezas {
                display: block;
            }
            .inv-pieza-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                gap: 12px;
                border-bottom: 1px solid #1e293b;
            }
            .inv-pieza-item:last-child {
                border-bottom: none;
            }
            .inv-pieza-icono {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
            }
            .inv-pieza-item.bajo .inv-pieza-icono {
                background: rgba(245, 158, 11, 0.15);
                color: #fbbf24;
            }
            .inv-pieza-item.agotado .inv-pieza-icono {
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
            }
            .inv-pieza-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .inv-pieza-nombre {
                font-size: 0.85rem;
                color: #e2e8f0;
            }
            .inv-pieza-barra {
                height: 4px;
                background: #334155;
                border-radius: 2px;
                overflow: hidden;
            }
            .inv-pieza-progreso {
                height: 100%;
                border-radius: 2px;
                transition: width 0.3s;
            }
            .inv-pieza-progreso.ok {
                background: linear-gradient(90deg, #10b981, #34d399);
            }
            .inv-pieza-progreso.bajo {
                background: linear-gradient(90deg, #f59e0b, #fbbf24);
            }
            .inv-pieza-progreso.agotado {
                background: linear-gradient(90deg, #ef4444, #f87171);
            }
            .inv-pieza-cantidad {
                text-align: right;
                min-width: 80px;
            }
            .cantidad-actual {
                font-size: 1.1rem;
                font-weight: 700;
                color: #f1f5f9;
            }
            .cantidad-unidad {
                font-size: 0.7rem;
                color: #64748b;
                margin-left: 4px;
            }
            .inv-pieza-acciones {
                display: flex;
                gap: 6px;
            }
            .btn-mini {
                width: 28px;
                height: 28px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            .btn-agregar {
                background: rgba(16, 185, 129, 0.15);
                color: #34d399;
            }
            .btn-agregar:hover {
                background: rgba(16, 185, 129, 0.3);
            }
            .btn-descontar {
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
            }
            .btn-descontar:hover {
                background: rgba(239, 68, 68, 0.3);
            }
            .inventario-sin-config {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #334155;
            }
            .inventario-sin-config h4 {
                font-size: 0.85rem;
                color: #94a3b8;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .productos-sin-inv-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            .producto-sin-inv-chip {
                background: #1e293b;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 0.8rem;
                color: #94a3b8;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
                border: 1px solid transparent;
            }
            .producto-sin-inv-chip:hover {
                background: #334155;
                color: #f1f5f9;
                border-color: #60a5fa;
            }
            .producto-sin-inv-chip i {
                color: #60a5fa;
            }
            .producto-sin-inv-chip.mas {
                background: rgba(96, 165, 250, 0.1);
                color: #60a5fa;
            }
        `;
        document.head.appendChild(styles);
    }
}

// Función para expandir/colapsar inventario de producto
function toggleInventarioProducto(productoId) {
    const card = document.querySelector(`.inventario-producto-card [id="invPiezas-${productoId}"]`)?.closest('.inventario-producto-card');
    if (card) {
        card.classList.toggle('expanded');
    }
}

// Función para filtrar inventario general
function filtrarInventarioGeneral() {
    const busqueda = document.getElementById('buscarInventario')?.value?.toLowerCase() || '';
    const cards = document.querySelectorAll('.inventario-producto-card');

    cards.forEach(card => {
        const nombreProducto = card.dataset.productoNombre || '';
        const piezas = card.querySelectorAll('.inv-pieza-item');
        let mostrarCard = nombreProducto.includes(busqueda);

        // También buscar en las piezas
        piezas.forEach(pieza => {
            const nombrePieza = pieza.dataset.piezaNombre || '';
            if (nombrePieza.includes(busqueda)) {
                mostrarCard = true;
                pieza.style.display = '';
            } else if (busqueda && !nombreProducto.includes(busqueda)) {
                pieza.style.display = 'none';
            } else {
                pieza.style.display = '';
            }
        });

        card.style.display = mostrarCard ? '' : 'none';

        // Auto-expandir si hay búsqueda
        if (busqueda && mostrarCard) {
            card.classList.add('expanded');
        }
    });
}

// Exponer funciones a window
window.showInventarioGeneralModal = showInventarioGeneralModal;
window.toggleInventarioProducto = toggleInventarioProducto;
window.filtrarInventarioGeneral = filtrarInventarioGeneral;

// ========================================
// INVENTARIO DE PIEZAS INTERMEDIAS
// ========================================
function gestionarInventarioPiezas(productoId) {
    const producto = db.getProducto(productoId);
    const rutaProcesos = producto.rutaProcesos || [];
    const inventarioPiezas = db.getInventarioPiezasByProducto(productoId);

    // Procesos que típicamente generan piezas intermedias
    const procesosPreproducibles = rutaProcesos.filter(p =>
        p.nombre.toLowerCase().includes('corte') ||
        p.nombre.toLowerCase().includes('ventana') ||
        p.nombre.toLowerCase().includes('preparado') ||
        p.esPreproducible
    );

    const content = `
        <div class="inventario-piezas-container">
            <div class="inventario-header-info">
                <p class="text-muted">
                    <i class="fas fa-info-circle"></i>
                    Gestione el inventario de piezas pre-producidas para <strong>${producto.nombre}</strong>.
                    Estas piezas se pueden producir por adelantado y descontar cuando se usen en pedidos.
                </p>
            </div>

            <!-- Piezas existentes -->
            <div class="inventario-lista">
                <h4><i class="fas fa-cubes"></i> Piezas en Inventario</h4>
                ${inventarioPiezas.length === 0 ? `
                    <p class="text-muted text-center py-2">No hay piezas intermedias configuradas para este producto</p>
                ` : `
                    <div class="piezas-grid">
                        ${inventarioPiezas.map(pieza => `
                            <div class="pieza-card ${pieza.cantidadDisponible <= pieza.cantidadMinima ? 'alerta-baja' : ''}">
                                <div class="pieza-header">
                                    <span class="pieza-nombre">${pieza.procesoNombre}</span>
                                    ${pieza.cantidadDisponible <= pieza.cantidadMinima ?
                                        '<span class="badge-alerta"><i class="fas fa-exclamation-triangle"></i> Bajo</span>' : ''}
                                </div>
                                <div class="pieza-descripcion">${pieza.descripcion || 'Sin descripción'}</div>
                                <div class="pieza-cantidad">
                                    <span class="cantidad-valor">${pieza.cantidadDisponible}</span>
                                    <span class="cantidad-unidad">${pieza.unidad}</span>
                                </div>
                                <div class="pieza-minimo">Mínimo: ${pieza.cantidadMinima} ${pieza.unidad}</div>
                                <div class="pieza-acciones">
                                    <button class="btn btn-sm btn-success" onclick="agregarPiezasModal(${pieza.id})" title="Agregar">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                    <button class="btn btn-sm btn-warning" onclick="descontarPiezasModal(${pieza.id})" title="Descontar">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <button class="btn btn-sm btn-secondary" onclick="verHistorialPieza(${pieza.id})" title="Historial">
                                        <i class="fas fa-history"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline" onclick="editarPiezaInventario(${pieza.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <!-- Agregar nueva pieza -->
            <div class="agregar-pieza-section mt-3">
                <h4><i class="fas fa-plus-circle"></i> Agregar Pieza al Inventario</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Proceso / Pieza</label>
                        <select id="nuevaPiezaProceso" class="form-control">
                            <option value="">Seleccionar proceso...</option>
                            ${rutaProcesos.map(p => {
                                const yaExiste = inventarioPiezas.find(ip => ip.procesoNombre === p.nombre);
                                return `<option value="${p.nombre}" ${yaExiste ? 'disabled' : ''}>${p.nombre} ${yaExiste ? '(ya existe)' : ''}</option>`;
                            }).join('')}
                            <option value="__custom__">+ Otro (personalizado)</option>
                        </select>
                    </div>
                    <div class="form-group" id="customProcesoGroup" style="display:none;">
                        <label>Nombre personalizado</label>
                        <input type="text" id="nuevaPiezaCustom" class="form-control" placeholder="Ej: Ventana Tipo A">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Descripción</label>
                        <input type="text" id="nuevaPiezaDesc" class="form-control" placeholder="Descripción de la pieza">
                    </div>
                    <div class="form-group">
                        <label>Cantidad Inicial</label>
                        <input type="number" id="nuevaPiezaCant" class="form-control" value="0" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Cantidad Mínima (alerta)</label>
                        <input type="number" id="nuevaPiezaMin" class="form-control" value="50" min="0">
                    </div>
                    <div class="form-group">
                        <label>Unidad</label>
                        <select id="nuevaPiezaUnidad" class="form-control">
                            <option value="pzas">Piezas</option>
                            <option value="mts">Metros</option>
                            <option value="kg">Kilogramos</option>
                            <option value="rollos">Rollos</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="crearPiezaInventario(${productoId})">
                    <i class="fas fa-plus"></i> Crear Pieza en Inventario
                </button>
            </div>
        </div>
    `;

    openModal(`Inventario de Piezas - ${producto.nombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';

    // Event listener para mostrar campo personalizado
    setTimeout(() => {
        const selectProceso = document.getElementById('nuevaPiezaProceso');
        if (selectProceso) {
            selectProceso.addEventListener('change', function() {
                const customGroup = document.getElementById('customProcesoGroup');
                if (this.value === '__custom__') {
                    customGroup.style.display = 'block';
                } else {
                    customGroup.style.display = 'none';
                }
            });
        }
    }, 100);
}

function crearPiezaInventario(productoId) {
    const procesoSelect = document.getElementById('nuevaPiezaProceso');
    let procesoNombre = procesoSelect.value;

    if (procesoNombre === '__custom__') {
        procesoNombre = document.getElementById('nuevaPiezaCustom').value.trim();
    }

    if (!procesoNombre) {
        showToast('Seleccione o ingrese un nombre de pieza', 'error');
        return;
    }

    const descripcion = document.getElementById('nuevaPiezaDesc').value.trim();
    const cantidadInicial = parseInt(document.getElementById('nuevaPiezaCant').value) || 0;
    const cantidadMinima = parseInt(document.getElementById('nuevaPiezaMin').value) || 0;
    const unidad = document.getElementById('nuevaPiezaUnidad').value;

    // Verificar si ya existe
    const existente = db.getInventarioPiezaByProductoProceso(productoId, procesoNombre);
    if (existente) {
        showToast('Ya existe una pieza con ese nombre para este producto', 'error');
        return;
    }

    db.addInventarioPieza({
        productoId: productoId,
        procesoNombre: procesoNombre,
        descripcion: descripcion,
        cantidadDisponible: cantidadInicial,
        cantidadMinima: cantidadMinima,
        unidad: unidad
    });

    showToast('Pieza agregada al inventario', 'success');
    gestionarInventarioPiezas(productoId);
}

function agregarPiezasModal(piezaId) {
    const pieza = db.getInventarioPieza(piezaId);
    if (!pieza) return;

    const content = `
        <div class="agregar-piezas-form">
            <p>Agregar piezas a: <strong>${pieza.procesoNombre}</strong></p>
            <p class="text-muted">Disponible actual: ${pieza.cantidadDisponible} ${pieza.unidad}</p>

            <div class="form-group">
                <label>Cantidad a agregar</label>
                <input type="number" id="cantidadAgregar" class="form-control" value="100" min="1">
            </div>
            <div class="form-group">
                <label>Motivo</label>
                <select id="motivoAgregar" class="form-control">
                    <option value="Producción anticipada">Producción anticipada</option>
                    <option value="Excedente de pedido">Excedente de pedido</option>
                    <option value="Ajuste de inventario">Ajuste de inventario</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Notas adicionales</label>
                <input type="text" id="notasAgregar" class="form-control" placeholder="Opcional">
            </div>
        </div>
    `;

    openModal('Agregar Piezas', content, () => {
        const cantidad = parseInt(document.getElementById('cantidadAgregar').value);
        const motivo = document.getElementById('motivoAgregar').value;
        const notas = document.getElementById('notasAgregar').value;

        if (cantidad <= 0) {
            showToast('Ingrese una cantidad válida', 'error');
            return;
        }

        const motivoCompleto = notas ? `${motivo}: ${notas}` : motivo;
        db.agregarPiezasInventario(piezaId, cantidad, motivoCompleto);

        showToast(`Se agregaron ${cantidad} ${pieza.unidad}`, 'success');
        gestionarInventarioPiezas(pieza.productoId);
    });
}

function descontarPiezasModal(piezaId) {
    const pieza = db.getInventarioPieza(piezaId);
    if (!pieza) return;

    const content = `
        <div class="descontar-piezas-form">
            <p>Descontar piezas de: <strong>${pieza.procesoNombre}</strong></p>
            <p class="text-muted">Disponible actual: <strong>${pieza.cantidadDisponible} ${pieza.unidad}</strong></p>

            <div class="form-group">
                <label>Cantidad a descontar</label>
                <input type="number" id="cantidadDescontar" class="form-control" value="1" min="1" max="${pieza.cantidadDisponible}">
            </div>
            <div class="form-group">
                <label>Motivo</label>
                <select id="motivoDescontar" class="form-control">
                    <option value="Uso en producción">Uso en producción</option>
                    <option value="Defectuoso/Merma">Defectuoso/Merma</option>
                    <option value="Ajuste de inventario">Ajuste de inventario</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Pedido relacionado (opcional)</label>
                <input type="text" id="pedidoRelacionado" class="form-control" placeholder="# de pedido">
            </div>
        </div>
    `;

    openModal('Descontar Piezas', content, () => {
        const cantidad = parseInt(document.getElementById('cantidadDescontar').value);
        const motivo = document.getElementById('motivoDescontar').value;
        const pedido = document.getElementById('pedidoRelacionado').value;

        if (cantidad <= 0) {
            showToast('Ingrese una cantidad válida', 'error');
            return;
        }

        if (cantidad > pieza.cantidadDisponible) {
            showToast('Cantidad insuficiente en inventario', 'error');
            return;
        }

        const resultado = db.descontarPiezasInventario(piezaId, cantidad, motivo, pedido || null);

        if (resultado.error) {
            showToast(resultado.error, 'error');
            return;
        }

        showToast(`Se descontaron ${cantidad} ${pieza.unidad}`, 'success');
        gestionarInventarioPiezas(pieza.productoId);
    });
}

function verHistorialPieza(piezaId) {
    const pieza = db.getInventarioPieza(piezaId);
    if (!pieza) return;

    const historial = pieza.historialMovimientos || [];

    const content = `
        <div class="historial-pieza">
            <div class="historial-resumen">
                <p><strong>Pieza:</strong> ${pieza.procesoNombre}</p>
                <p><strong>Disponible:</strong> ${pieza.cantidadDisponible} ${pieza.unidad}</p>
                <p><strong>Última actualización:</strong> ${new Date(pieza.ultimaActualizacion).toLocaleString('es-MX')}</p>
            </div>

            <h4 class="mt-2"><i class="fas fa-history"></i> Historial de Movimientos</h4>
            ${historial.length === 0 ? `
                <p class="text-muted text-center">No hay movimientos registrados</p>
            ` : `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Cantidad</th>
                            <th>Motivo</th>
                            <th>Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historial.slice(0, 20).map(mov => `
                            <tr class="${mov.tipo === 'entrada' ? 'row-success' : 'row-warning'}">
                                <td>${new Date(mov.fecha).toLocaleString('es-MX', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})}</td>
                                <td>
                                    <span class="badge ${mov.tipo === 'entrada' ? 'badge-success' : 'badge-warning'}">
                                        <i class="fas fa-${mov.tipo === 'entrada' ? 'arrow-up' : 'arrow-down'}"></i>
                                        ${mov.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                                    </span>
                                </td>
                                <td class="${mov.tipo === 'entrada' ? 'text-success' : 'text-warning'}">
                                    ${mov.tipo === 'entrada' ? '+' : '-'}${mov.cantidad}
                                </td>
                                <td>${mov.motivo}${mov.pedidoId ? ` (Pedido #${mov.pedidoId})` : ''}</td>
                                <td>${mov.saldoNuevo}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${historial.length > 20 ? `<p class="text-muted text-center mt-1">Mostrando últimos 20 movimientos de ${historial.length}</p>` : ''}
            `}
        </div>
    `;

    openModal(`Historial - ${pieza.procesoNombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function editarPiezaInventario(piezaId) {
    const pieza = db.getInventarioPieza(piezaId);
    if (!pieza) return;

    const content = `
        <div class="editar-pieza-form">
            <div class="form-group">
                <label>Nombre de la Pieza</label>
                <input type="text" id="editPiezaNombre" class="form-control" value="${pieza.procesoNombre}">
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <input type="text" id="editPiezaDesc" class="form-control" value="${pieza.descripcion || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Cantidad Actual</label>
                    <input type="number" id="editPiezaCant" class="form-control" value="${pieza.cantidadDisponible}" min="0">
                </div>
                <div class="form-group">
                    <label>Cantidad Mínima</label>
                    <input type="number" id="editPiezaMin" class="form-control" value="${pieza.cantidadMinima}" min="0">
                </div>
            </div>
            <div class="form-group">
                <label>Unidad</label>
                <select id="editPiezaUnidad" class="form-control">
                    <option value="pzas" ${pieza.unidad === 'pzas' ? 'selected' : ''}>Piezas</option>
                    <option value="mts" ${pieza.unidad === 'mts' ? 'selected' : ''}>Metros</option>
                    <option value="kg" ${pieza.unidad === 'kg' ? 'selected' : ''}>Kilogramos</option>
                    <option value="rollos" ${pieza.unidad === 'rollos' ? 'selected' : ''}>Rollos</option>
                </select>
            </div>
            <hr>
            <button class="btn btn-danger btn-sm" onclick="eliminarPiezaInventario(${piezaId})">
                <i class="fas fa-trash"></i> Eliminar Pieza
            </button>
        </div>
    `;

    openModal('Editar Pieza', content, () => {
        const updates = {
            procesoNombre: document.getElementById('editPiezaNombre').value.trim(),
            descripcion: document.getElementById('editPiezaDesc').value.trim(),
            cantidadDisponible: parseInt(document.getElementById('editPiezaCant').value) || 0,
            cantidadMinima: parseInt(document.getElementById('editPiezaMin').value) || 0,
            unidad: document.getElementById('editPiezaUnidad').value
        };

        db.updateInventarioPieza(piezaId, updates);
        showToast('Pieza actualizada', 'success');
        gestionarInventarioPiezas(pieza.productoId);
    });
}

function eliminarPiezaInventario(piezaId) {
    const pieza = db.getInventarioPieza(piezaId);
    if (!pieza) return;

    if (confirm(`¿Eliminar "${pieza.procesoNombre}" del inventario?\n\nEsta acción no se puede deshacer.`)) {
        const productoId = pieza.productoId;
        db.deleteInventarioPieza(piezaId);
        showToast('Pieza eliminada del inventario', 'success');
        closeModal();
        gestionarInventarioPiezas(productoId);
    }
}

// Función para verificar y mostrar disponibilidad de piezas para un pedido
function verificarPiezasDisponibles(pedidoId) {
    const pedido = db.getPedido(pedidoId);
    if (!pedido) return [];

    const disponibilidad = [];

    pedido.productos.forEach(prodPedido => {
        const producto = db.getProducto(prodPedido.productoId);
        if (!producto) return;

        const piezasInventario = db.getInventarioPiezasByProducto(prodPedido.productoId);

        piezasInventario.forEach(pieza => {
            const cantidadNecesaria = prodPedido.cantidad - (prodPedido.completadas || 0);
            const puedeUsar = Math.min(pieza.cantidadDisponible, cantidadNecesaria);

            disponibilidad.push({
                productoId: prodPedido.productoId,
                productoNombre: producto.nombre,
                piezaId: pieza.id,
                piezaNombre: pieza.procesoNombre,
                cantidadDisponible: pieza.cantidadDisponible,
                cantidadNecesaria: cantidadNecesaria,
                puedeUsar: puedeUsar,
                unidad: pieza.unidad
            });
        });
    });

    return disponibilidad;
}

// Función para usar piezas del inventario en un pedido
function usarPiezasInventarioPedido(piezaId, cantidad, pedidoId) {
    const pieza = db.getInventarioPieza(piezaId);
    if (!pieza) {
        showToast('Pieza no encontrada', 'error');
        return false;
    }

    if (cantidad > pieza.cantidadDisponible) {
        showToast(`Solo hay ${pieza.cantidadDisponible} ${pieza.unidad} disponibles`, 'error');
        return false;
    }

    const resultado = db.descontarPiezasInventario(
        piezaId,
        cantidad,
        `Usado para Pedido #${pedidoId}`,
        pedidoId
    );

    if (resultado.error) {
        showToast(resultado.error, 'error');
        return false;
    }

    // Actualizar avance del pedido en el proceso correspondiente
    const pedido = db.getPedido(pedidoId);
    if (pedido) {
        pedido.productos.forEach(prod => {
            if (prod.productoId === pieza.productoId) {
                // Buscar el proceso correspondiente en avanceProcesos
                if (prod.avanceProcesos) {
                    const proceso = prod.avanceProcesos.find(p =>
                        p.nombre.toLowerCase().includes(pieza.procesoNombre.toLowerCase()) ||
                        pieza.procesoNombre.toLowerCase().includes(p.nombre.toLowerCase())
                    );
                    if (proceso) {
                        proceso.completadas = Math.min((proceso.completadas || 0) + cantidad, prod.cantidad);
                        if (proceso.completadas >= prod.cantidad) {
                            proceso.estado = 'completado';
                        } else if (proceso.completadas > 0) {
                            proceso.estado = 'en_proceso';
                        }
                    }
                }
            }
        });
        db.updatePedido(pedidoId, { productos: pedido.productos });
    }

    showToast(`Se usaron ${cantidad} ${pieza.unidad} del inventario`, 'success');
    return true;
}

// Modal para usar piezas del inventario en producción
function mostrarUsarPiezasInventario(pedidoId) {
    const disponibilidad = verificarPiezasDisponibles(pedidoId);

    if (disponibilidad.length === 0) {
        showToast('No hay piezas intermedias disponibles para este pedido', 'info');
        return;
    }

    const content = `
        <div class="usar-piezas-container">
            <div class="info-banner mb-2">
                <i class="fas fa-info-circle"></i>
                <span>Seleccione las piezas pre-producidas que desea usar para este pedido.
                El sistema descontará del inventario y actualizará el avance del pedido.</span>
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Pieza</th>
                        <th>Disponible</th>
                        <th>Necesarias</th>
                        <th>Usar</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${disponibilidad.map(d => `
                        <tr class="${d.cantidadDisponible > 0 ? '' : 'row-disabled'}">
                            <td>${d.productoNombre}</td>
                            <td><strong>${d.piezaNombre}</strong></td>
                            <td>
                                <span class="badge ${d.cantidadDisponible > 0 ? 'badge-success' : 'badge-danger'}">
                                    ${d.cantidadDisponible} ${d.unidad}
                                </span>
                            </td>
                            <td>${d.cantidadNecesaria} ${d.unidad}</td>
                            <td>
                                <input type="number"
                                       id="usarPieza_${d.piezaId}"
                                       class="form-control form-control-sm"
                                       style="width: 80px;"
                                       value="${d.puedeUsar}"
                                       min="0"
                                       max="${Math.min(d.cantidadDisponible, d.cantidadNecesaria)}"
                                       ${d.cantidadDisponible === 0 ? 'disabled' : ''}>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-primary"
                                        onclick="confirmarUsarPieza(${d.piezaId}, ${pedidoId})"
                                        ${d.cantidadDisponible === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-check"></i> Usar
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    openModal('Usar Piezas del Inventario - Pedido #' + pedidoId, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function confirmarUsarPieza(piezaId, pedidoId) {
    const input = document.getElementById(`usarPieza_${piezaId}`);
    const cantidad = parseInt(input.value) || 0;

    if (cantidad <= 0) {
        showToast('Ingrese una cantidad válida', 'warning');
        return;
    }

    if (usarPiezasInventarioPedido(piezaId, cantidad, pedidoId)) {
        // Recargar el modal con datos actualizados
        mostrarUsarPiezasInventario(pedidoId);
    }
}

// Exponer funciones a window
window.gestionarInventarioPiezas = gestionarInventarioPiezas;
window.crearPiezaInventario = crearPiezaInventario;
window.agregarPiezasModal = agregarPiezasModal;
window.descontarPiezasModal = descontarPiezasModal;
window.verHistorialPieza = verHistorialPieza;
window.editarPiezaInventario = editarPiezaInventario;
window.eliminarPiezaInventario = eliminarPiezaInventario;
window.verificarPiezasDisponibles = verificarPiezasDisponibles;
window.usarPiezasInventarioPedido = usarPiezasInventarioPedido;
window.mostrarUsarPiezasInventario = mostrarUsarPiezasInventario;
window.confirmarUsarPieza = confirmarUsarPieza;

function editRutaProcesos(id) {
    const producto = db.getProducto(id);
    const rutaProcesos = producto.rutaProcesos || [];
    const areasPlanta = db.getAreasPlanta();

    const getAreasOptions = (selectedArea) => {
        return areasPlanta.map(area =>
            `<option value="${area.id}" ${selectedArea === area.id ? 'selected' : ''}>${area.nombre}</option>`
        ).join('');
    };

    // Generar opciones de dependencia (procesos anteriores)
    const getDependenciaOptions = (currentIndex, dependeDe) => {
        let options = '<option value="">Ninguno (inicio)</option>';
        for (let i = 0; i < currentIndex; i++) {
            const proc = rutaProcesos[i];
            if (proc) {
                const selected = dependeDe === i ? 'selected' : '';
                options += `<option value="${i}" ${selected}>Proceso ${i + 1}: ${proc.nombre}</option>`;
            }
        }
        return options;
    };

    // Generar opciones de procesos paralelos
    const getParaleloOptions = (currentIndex, puedeParaleloCon) => {
        const paralelos = puedeParaleloCon || [];
        let checkboxes = '';
        for (let i = 0; i < rutaProcesos.length; i++) {
            if (i !== currentIndex) {
                const proc = rutaProcesos[i];
                const checked = paralelos.includes(i) ? 'checked' : '';
                checkboxes += `
                    <label class="paralelo-checkbox">
                        <input type="checkbox" name="paralelo_${currentIndex}_${i}" ${checked}>
                        <span>${proc.nombre}</span>
                    </label>
                `;
            }
        }
        return checkboxes || '<span class="text-muted">No hay otros procesos</span>';
    };

    const content = `
        <p class="text-muted mb-2">Configure la ruta de procesos para <strong>${producto.nombre}</strong></p>

        <div class="proceso-leyenda mb-2">
            <span class="leyenda-item"><i class="fas fa-link" style="color: var(--primary-color)"></i> Secuencial (depende del anterior)</span>
            <span class="leyenda-item"><i class="fas fa-code-branch" style="color: var(--success-color)"></i> Paralelo (puede trabajarse simultáneamente)</span>
            <span class="leyenda-item"><i class="fas fa-forward" style="color: var(--warning-color)"></i> Opcional (se puede saltar)</span>
        </div>

        <div id="rutaProcesosContainer">
            ${rutaProcesos.map((proc, index) => generarProcesoEditItem(proc, index, getAreasOptions, rutaProcesos)).join('')}
        </div>

        <div class="mt-2 d-flex gap-2">
            <button type="button" class="btn btn-secondary" onclick="addNuevoProceso()">
                <i class="fas fa-plus"></i> Agregar Proceso
            </button>
            <button type="button" class="btn btn-outline" onclick="mostrarVistaGraficaRuta()">
                <i class="fas fa-project-diagram"></i> Ver Diagrama
            </button>
        </div>
    `;

    openModal('Ruta de Procesos', content, () => {
        guardarRutaProcesos(id);
    });

    // Guardar ID del producto para agregar procesos
    window.currentProductoId = id;
}

// Generar HTML para cada proceso en el editor
function generarProcesoEditItem(proc, index, getAreasOptions, rutaProcesos) {
    const tipoDependencia = proc.tipoDependencia || 'secuencial';
    const esOpcional = proc.esOpcional || false;
    const puedeParaleloCon = proc.puedeParaleloCon || [];

    return `
        <div class="proceso-edit-item" data-index="${index}">
            <div class="proceso-edit-header">
                <div class="proceso-edit-orden">${proc.orden || index + 1}</div>
                <div class="proceso-tipo-indicador">
                    ${tipoDependencia === 'paralelo' ? '<i class="fas fa-code-branch" style="color: var(--success-color)" title="Paralelo"></i>' : ''}
                    ${tipoDependencia === 'secuencial' && index > 0 ? '<i class="fas fa-link" style="color: var(--primary-color)" title="Secuencial"></i>' : ''}
                    ${esOpcional ? '<i class="fas fa-forward" style="color: var(--warning-color)" title="Opcional"></i>' : ''}
                </div>
            </div>
            <div class="proceso-edit-fields">
                <input type="text" name="nombre_${index}" value="${proc.nombre}" placeholder="Nombre del proceso" required>
                <div class="proceso-edit-numbers">
                    <div>
                        <label>Área</label>
                        <select name="area_${index}" class="area-select">
                            <option value="">Sin asignar</option>
                            ${getAreasOptions(proc.areaPlantaId)}
                        </select>
                    </div>
                    <div>
                        <label>Capacidad/hr</label>
                        <input type="number" name="capacidad_${index}" value="${proc.capacidadHora || 20}" min="1">
                    </div>
                    <div>
                        <label>Tiempo (min)</label>
                        <input type="number" name="tiempo_${index}" value="${proc.tiempoEstandar || 2}" step="0.1" min="0.1">
                    </div>
                </div>

                <!-- Configuración de dependencias -->
                <div class="proceso-dependencias-config">
                    <div class="dependencia-row">
                        <div class="dependencia-field">
                            <label><i class="fas fa-sitemap"></i> Tipo de flujo</label>
                            <select name="tipoDependencia_${index}" onchange="actualizarVistasDependencia(${index})">
                                <option value="secuencial" ${tipoDependencia === 'secuencial' ? 'selected' : ''}>Secuencial (requiere proceso anterior)</option>
                                <option value="paralelo" ${tipoDependencia === 'paralelo' ? 'selected' : ''}>Paralelo (puede trabajarse a la par)</option>
                                <option value="independiente" ${tipoDependencia === 'independiente' ? 'selected' : ''}>Independiente (sin dependencias)</option>
                            </select>
                        </div>
                        <div class="dependencia-field">
                            <label><i class="fas fa-question-circle"></i> Obligatoriedad</label>
                            <select name="esOpcional_${index}">
                                <option value="false" ${!esOpcional ? 'selected' : ''}>Obligatorio</option>
                                <option value="true" ${esOpcional ? 'selected' : ''}>Opcional (se puede saltar)</option>
                            </select>
                        </div>
                    </div>

                    ${index > 0 ? `
                        <div class="dependencia-row" id="dependeDeRow_${index}" style="${tipoDependencia === 'independiente' ? 'display:none' : ''}">
                            <div class="dependencia-field">
                                <label><i class="fas fa-arrow-left"></i> Depende de</label>
                                <select name="dependeDe_${index}">
                                    <option value="">Ninguno específico</option>
                                    ${generarOpcionesDependencia(index, proc.dependeDe, rutaProcesos)}
                                </select>
                            </div>
                        </div>
                    ` : ''}

                    <div class="dependencia-row paralelos-config" id="paralelosRow_${index}" style="${tipoDependencia !== 'paralelo' ? 'display:none' : ''}">
                        <div class="dependencia-field full-width">
                            <label><i class="fas fa-code-branch"></i> Puede trabajarse en paralelo con:</label>
                            <div class="paralelos-checkboxes" id="paralelosCheckboxes_${index}">
                                ${generarCheckboxesParalelos(index, puedeParaleloCon, rutaProcesos)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="proceso-edit-toggle">
                <label title="Habilitar/Deshabilitar proceso">
                    <input type="checkbox" name="habilitado_${index}" ${proc.habilitado !== false ? 'checked' : ''}>
                    <span class="toggle-label">${proc.habilitado !== false ? 'Activo' : 'Inactivo'}</span>
                </label>
            </div>
            <button type="button" class="btn-icon-small danger" onclick="removeProceso(${index})" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// Generar opciones de dependencia para un proceso
function generarOpcionesDependencia(currentIndex, dependeDe, rutaProcesos) {
    let options = '';
    for (let i = 0; i < currentIndex; i++) {
        const proc = rutaProcesos[i];
        if (proc) {
            const selected = dependeDe === i ? 'selected' : '';
            options += `<option value="${i}" ${selected}>Proceso ${i + 1}: ${proc.nombre}</option>`;
        }
    }
    return options;
}

// Generar checkboxes para procesos paralelos
function generarCheckboxesParalelos(currentIndex, puedeParaleloCon, rutaProcesos) {
    const paralelos = puedeParaleloCon || [];
    let html = '';
    for (let i = 0; i < rutaProcesos.length; i++) {
        if (i !== currentIndex) {
            const proc = rutaProcesos[i];
            const checked = paralelos.includes(i) ? 'checked' : '';
            html += `
                <label class="paralelo-checkbox">
                    <input type="checkbox" name="paralelo_${currentIndex}_${i}" ${checked}>
                    <span>P${i + 1}: ${proc.nombre}</span>
                </label>
            `;
        }
    }
    return html || '<span class="text-muted">Agregue más procesos para configurar paralelos</span>';
}

// Actualizar vistas cuando cambia el tipo de dependencia
function actualizarVistasDependencia(index) {
    const tipoSelect = document.querySelector(`[name="tipoDependencia_${index}"]`);
    const tipo = tipoSelect?.value || 'secuencial';

    const dependeDeRow = document.getElementById(`dependeDeRow_${index}`);
    const paralelosRow = document.getElementById(`paralelosRow_${index}`);

    if (dependeDeRow) {
        dependeDeRow.style.display = tipo === 'independiente' ? 'none' : '';
    }

    if (paralelosRow) {
        paralelosRow.style.display = tipo === 'paralelo' ? '' : 'none';
    }
}

// Guardar la ruta de procesos con todas las configuraciones
function guardarRutaProcesos(productoId) {
    const container = document.getElementById('rutaProcesosContainer');
    const items = container.querySelectorAll('.proceso-edit-item');
    const nuevaRuta = [];

    items.forEach((item, index) => {
        const idx = item.dataset.index;
        const nombre = item.querySelector(`[name="nombre_${idx}"]`)?.value;
        const areaPlantaId = item.querySelector(`[name="area_${idx}"]`)?.value || null;
        const capacidad = parseInt(item.querySelector(`[name="capacidad_${idx}"]`)?.value) || 20;
        const tiempo = parseFloat(item.querySelector(`[name="tiempo_${idx}"]`)?.value) || 2.0;
        const habilitado = item.querySelector(`[name="habilitado_${idx}"]`)?.checked;

        // Nuevos campos de dependencia
        const tipoDependencia = item.querySelector(`[name="tipoDependencia_${idx}"]`)?.value || 'secuencial';
        const esOpcional = item.querySelector(`[name="esOpcional_${idx}"]`)?.value === 'true';
        const dependeDeSelect = item.querySelector(`[name="dependeDe_${idx}"]`);
        const dependeDe = dependeDeSelect?.value ? parseInt(dependeDeSelect.value) : null;

        // Obtener procesos paralelos
        const puedeParaleloCon = [];
        const paraleloCheckboxes = item.querySelectorAll(`[name^="paralelo_${idx}_"]`);
        paraleloCheckboxes.forEach(cb => {
            if (cb.checked) {
                const parts = cb.name.split('_');
                const paraleloIndex = parseInt(parts[2]);
                puedeParaleloCon.push(paraleloIndex);
            }
        });

        if (nombre && nombre.trim()) {
            nuevaRuta.push({
                orden: index + 1,
                nombre: nombre.trim(),
                areaPlantaId: areaPlantaId || null,
                capacidadHora: capacidad,
                tiempoEstandar: tiempo,
                habilitado: habilitado,
                tipoDependencia: tipoDependencia,
                esOpcional: esOpcional,
                dependeDe: dependeDe,
                puedeParaleloCon: puedeParaleloCon
            });
        }
    });

    // Calcular tiempo total (considerando paralelos)
    const tiempoTotal = calcularTiempoTotalRuta(nuevaRuta);

    db.updateProducto(productoId, {
        rutaProcesos: nuevaRuta,
        tiempoTotal: Math.round(tiempoTotal * 10) / 10
    });

    showToast('Ruta de procesos actualizada', 'success');
    loadProductos();
}

// Calcular tiempo total considerando procesos paralelos
function calcularTiempoTotalRuta(ruta) {
    let tiempoTotal = 0;
    const procesados = new Set();

    ruta.forEach((proc, index) => {
        if (!proc.habilitado) return;

        // Si es paralelo con otros procesos, solo contar el mayor tiempo del grupo
        if (proc.tipoDependencia === 'paralelo' && proc.puedeParaleloCon?.length > 0) {
            const grupoParalelo = [index, ...proc.puedeParaleloCon];
            const noProcesados = grupoParalelo.filter(i => !procesados.has(i));

            if (noProcesados.length > 0) {
                const tiemposGrupo = noProcesados.map(i => ruta[i]?.tiempoEstandar || 0);
                tiempoTotal += Math.max(...tiemposGrupo);
                noProcesados.forEach(i => procesados.add(i));
            }
        } else if (!procesados.has(index)) {
            tiempoTotal += proc.tiempoEstandar || 0;
            procesados.add(index);
        }
    });

    return tiempoTotal;
}

// Mostrar diagrama visual de la ruta
function mostrarVistaGraficaRuta() {
    const container = document.getElementById('rutaProcesosContainer');
    const items = container.querySelectorAll('.proceso-edit-item');
    const procesos = [];

    items.forEach((item, index) => {
        const idx = item.dataset.index;
        procesos.push({
            nombre: item.querySelector(`[name="nombre_${idx}"]`)?.value || `Proceso ${index + 1}`,
            tipoDependencia: item.querySelector(`[name="tipoDependencia_${idx}"]`)?.value || 'secuencial',
            esOpcional: item.querySelector(`[name="esOpcional_${idx}"]`)?.value === 'true',
            habilitado: item.querySelector(`[name="habilitado_${idx}"]`)?.checked
        });
    });

    let diagramaHtml = '<div class="ruta-diagrama">';

    procesos.forEach((proc, index) => {
        const claseNodo = `diagrama-nodo ${proc.tipoDependencia} ${proc.esOpcional ? 'opcional' : ''} ${!proc.habilitado ? 'inactivo' : ''}`;

        diagramaHtml += `
            <div class="${claseNodo}">
                <div class="nodo-numero">${index + 1}</div>
                <div class="nodo-nombre">${proc.nombre}</div>
                <div class="nodo-badges">
                    ${proc.tipoDependencia === 'paralelo' ? '<span class="badge-mini paralelo">Paralelo</span>' : ''}
                    ${proc.esOpcional ? '<span class="badge-mini opcional">Opcional</span>' : ''}
                    ${!proc.habilitado ? '<span class="badge-mini inactivo">Inactivo</span>' : ''}
                </div>
            </div>
        `;

        if (index < procesos.length - 1) {
            const siguiente = procesos[index + 1];
            let conectoresClass = 'diagrama-conector';
            if (siguiente.tipoDependencia === 'paralelo') {
                conectoresClass += ' paralelo';
            } else if (siguiente.tipoDependencia === 'independiente') {
                conectoresClass += ' independiente';
            }
            diagramaHtml += `<div class="${conectoresClass}"><i class="fas fa-arrow-down"></i></div>`;
        }
    });

    diagramaHtml += '</div>';

    // Agregar leyenda
    diagramaHtml += `
        <div class="diagrama-leyenda mt-2">
            <div class="leyenda-item"><div class="leyenda-color secuencial"></div> Secuencial</div>
            <div class="leyenda-item"><div class="leyenda-color paralelo"></div> Paralelo</div>
            <div class="leyenda-item"><div class="leyenda-color independiente"></div> Independiente</div>
            <div class="leyenda-item"><div class="leyenda-color opcional"></div> Opcional</div>
        </div>
    `;

    openModal('Diagrama de Ruta', diagramaHtml, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function addNuevoProceso() {
    const container = document.getElementById('rutaProcesosContainer');
    const items = container.querySelectorAll('.proceso-edit-item');
    const newIndex = items.length;
    const newOrden = newIndex + 1;
    const areasPlanta = db.getAreasPlanta();

    const areasOptions = areasPlanta.map(area =>
        `<option value="${area.id}">${area.nombre}</option>`
    ).join('');

    // Generar opciones de dependencia basadas en procesos existentes
    let dependenciaOptions = '';
    items.forEach((item, i) => {
        const nombre = item.querySelector(`[name="nombre_${item.dataset.index}"]`)?.value || `Proceso ${i + 1}`;
        dependenciaOptions += `<option value="${i}">Proceso ${i + 1}: ${nombre}</option>`;
    });

    // Generar checkboxes de paralelos
    let paralelosCheckboxes = '';
    items.forEach((item, i) => {
        const nombre = item.querySelector(`[name="nombre_${item.dataset.index}"]`)?.value || `Proceso ${i + 1}`;
        paralelosCheckboxes += `
            <label class="paralelo-checkbox">
                <input type="checkbox" name="paralelo_${newIndex}_${i}">
                <span>P${i + 1}: ${nombre}</span>
            </label>
        `;
    });

    const newItem = document.createElement('div');
    newItem.className = 'proceso-edit-item';
    newItem.dataset.index = newIndex;
    newItem.innerHTML = `
        <div class="proceso-edit-header">
            <div class="proceso-edit-orden">${newOrden}</div>
            <div class="proceso-tipo-indicador"></div>
        </div>
        <div class="proceso-edit-fields">
            <input type="text" name="nombre_${newIndex}" value="" placeholder="Nombre del proceso" required>
            <div class="proceso-edit-numbers">
                <div>
                    <label>Área</label>
                    <select name="area_${newIndex}" class="area-select">
                        <option value="">Sin asignar</option>
                        ${areasOptions}
                    </select>
                </div>
                <div>
                    <label>Capacidad/hr</label>
                    <input type="number" name="capacidad_${newIndex}" value="20" min="1">
                </div>
                <div>
                    <label>Tiempo (min)</label>
                    <input type="number" name="tiempo_${newIndex}" value="2.0" step="0.1" min="0.1">
                </div>
            </div>

            <!-- Configuración de dependencias -->
            <div class="proceso-dependencias-config">
                <div class="dependencia-row">
                    <div class="dependencia-field">
                        <label><i class="fas fa-sitemap"></i> Tipo de flujo</label>
                        <select name="tipoDependencia_${newIndex}" onchange="actualizarVistasDependencia(${newIndex})">
                            <option value="secuencial">Secuencial (requiere proceso anterior)</option>
                            <option value="paralelo">Paralelo (puede trabajarse a la par)</option>
                            <option value="independiente">Independiente (sin dependencias)</option>
                        </select>
                    </div>
                    <div class="dependencia-field">
                        <label><i class="fas fa-question-circle"></i> Obligatoriedad</label>
                        <select name="esOpcional_${newIndex}">
                            <option value="false">Obligatorio</option>
                            <option value="true">Opcional (se puede saltar)</option>
                        </select>
                    </div>
                </div>

                ${newIndex > 0 ? `
                    <div class="dependencia-row" id="dependeDeRow_${newIndex}">
                        <div class="dependencia-field">
                            <label><i class="fas fa-arrow-left"></i> Depende de</label>
                            <select name="dependeDe_${newIndex}">
                                <option value="">Ninguno específico</option>
                                ${dependenciaOptions}
                            </select>
                        </div>
                    </div>
                ` : ''}

                <div class="dependencia-row paralelos-config" id="paralelosRow_${newIndex}" style="display:none">
                    <div class="dependencia-field full-width">
                        <label><i class="fas fa-code-branch"></i> Puede trabajarse en paralelo con:</label>
                        <div class="paralelos-checkboxes" id="paralelosCheckboxes_${newIndex}">
                            ${paralelosCheckboxes || '<span class="text-muted">Agregue más procesos para configurar paralelos</span>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="proceso-edit-toggle">
            <label title="Habilitar/Deshabilitar proceso">
                <input type="checkbox" name="habilitado_${newIndex}" checked>
                <span class="toggle-label">Activo</span>
            </label>
        </div>
        <button type="button" class="btn-icon-small danger" onclick="removeProceso(${newIndex})" title="Eliminar">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(newItem);

    // Enfocar el campo de nombre
    newItem.querySelector(`[name="nombre_${newIndex}"]`).focus();
}

function removeProceso(index) {
    const item = document.querySelector(`.proceso-edit-item[data-index="${index}"]`);
    if (item) {
        item.remove();
        // Reordenar
        const items = document.querySelectorAll('.proceso-edit-item');
        items.forEach((item, i) => {
            item.querySelector('.proceso-edit-orden').textContent = i + 1;
        });
    }
}

// ========================================
// ÁREAS DE PLANTA
// ========================================
function loadProcesos() {
    const section = document.getElementById('section-procesos');
    const areasPlanta = db.getAreasPlanta();
    const estaciones = db.getEstaciones();
    const personal = db.getPersonal();
    const estadoOps = db.getEstadoOperadores();

    section.innerHTML = `
        <div class="section-header">
            <h1>Áreas de Planta</h1>
            <button class="btn btn-primary" onclick="showNuevaAreaPlantaModal()">
                <i class="fas fa-plus"></i> Nueva Área
            </button>
        </div>

        <p class="text-muted mb-2">
            <i class="fas fa-info-circle"></i> Las áreas representan las zonas físicas de la planta. Los procesos de producción se configuran en cada producto individual.
        </p>

        <div class="cards-grid">
            ${areasPlanta.map(area => {
                const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
                const estacionesOcupadas = estacionesArea.filter(e => e.operadorId !== null);
                const operadoresEnArea = estacionesOcupadas.map(e => {
                    const emp = personal.find(p => p.id === e.operadorId);
                    const estado = estadoOps.find(o => o.operadorId === e.operadorId);
                    return { empleado: emp, estado: estado, estacion: e };
                }).filter(o => o.empleado);

                return `
                    <div class="card area-card">
                        <div class="card-header">
                            <span class="card-title">
                                <span style="display:inline-block; width:12px; height:12px; background:${area.color}; border-radius:50%; margin-right:8px"></span>
                                ${area.nombre}
                            </span>
                        </div>
                        <div class="area-stats-grid">
                            <div class="area-stat-item">
                                <span class="stat-value">${estacionesArea.length}</span>
                                <span class="stat-label">Posiciones</span>
                            </div>
                            <div class="area-stat-item">
                                <span class="stat-value">${estacionesOcupadas.length}</span>
                                <span class="stat-label">Ocupadas</span>
                            </div>
                            <div class="area-stat-item">
                                <span class="stat-value">${estacionesArea.length - estacionesOcupadas.length}</span>
                                <span class="stat-label">Disponibles</span>
                            </div>
                        </div>

                        ${operadoresEnArea.length > 0 ? `
                            <div class="area-operadores">
                                <strong style="font-size:0.8rem; color:var(--text-secondary)">Operadores activos:</strong>
                                <div class="operadores-list mt-1">
                                    ${operadoresEnArea.slice(0, 6).map(o => `
                                        <div class="operador-mini">
                                            <span class="workstation ${o.estado?.estado || 'empty'}" style="width:24px;height:24px;display:inline-flex">
                                                <span class="workstation-initials" style="font-size:0.6rem">${o.estado?.iniciales || getIniciales(o.empleado.nombre)}</span>
                                            </span>
                                            <span>${o.empleado.nombre.split(' ')[0]}</span>
                                        </div>
                                    `).join('')}
                                    ${operadoresEnArea.length > 6 ? `<span class="text-muted">+${operadoresEnArea.length - 6} más</span>` : ''}
                                </div>
                            </div>
                        ` : `
                            <p class="text-muted" style="font-size:0.85rem; margin-top:10px">
                                <i class="fas fa-user-slash"></i> Sin operadores asignados
                            </p>
                        `}

                        <div class="mt-2">
                            <button class="btn-small" onclick="editAreaPlanta('${area.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-small" onclick="verEstacionesArea('${area.id}')">
                                <i class="fas fa-eye"></i> Ver Estaciones
                            </button>
                            <button class="btn-small btn-danger-outline" onclick="eliminarAreaPlantaEnhanced('${area.id}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function showNuevaAreaPlantaModal() {
    const content = `
        <form id="nuevaAreaPlantaForm">
            <div class="form-group">
                <label>Nombre del Área *</label>
                <input type="text" name="nombre" required placeholder="Ej: Costura, Empaque, Corte...">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Número de Posiciones *</label>
                    <input type="number" name="posiciones" min="1" required value="4">
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" name="color" value="#3b82f6">
                </div>
            </div>
            <p class="text-muted" style="font-size:0.8rem">
                <i class="fas fa-info-circle"></i> Se crearán automáticamente las estaciones de trabajo para esta área.
            </p>
        </form>
    `;

    openModal('Nueva Área de Planta', content, () => {
        const form = document.getElementById('nuevaAreaPlantaForm');
        const nombre = form.querySelector('[name="nombre"]').value.trim();
        const posiciones = parseInt(form.querySelector('[name="posiciones"]').value) || 1;
        const color = form.querySelector('[name="color"]').value;

        if (!nombre) {
            alert('El nombre del área es requerido');
            return;
        }

        // Generar ID del área - asegurarnos que sea único
        const areaId = nombre.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8) + Date.now().toString().slice(-4);

        // Crear área usando el nuevo método
        const nuevaArea = {
            id: areaId,
            nombre: nombre,
            posiciones: posiciones,
            color: color
        };

        db.addAreaPlanta(nuevaArea);

        // Crear estaciones usando el nuevo método
        const prefijo = nombre.substring(0, 2).toUpperCase();
        for (let i = 1; i <= posiciones; i++) {
            const estacionId = `${prefijo}${i}_${Date.now().toString().slice(-4)}`;
            const estacion = {
                id: estacionId,
                areaPlantaId: areaId,
                nombre: `${nombre} ${i}`,
                operadorId: null
            };
            db.addEstacion(estacion);
        }

        // Recargar la sección de áreas y también actualizar el mapa si está visible
        loadProcesos();

        // Actualizar el mapa de planta en el dashboard si existe
        if (document.getElementById('plantMapGrid')) {
            updatePlantMap();
        }
    });
}

function editAreaPlanta(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    if (!area) return;

    const content = `
        <form id="editarAreaPlantaForm">
            <div class="form-group">
                <label>Nombre del Área *</label>
                <input type="text" name="nombre" value="${area.nombre}" required>
            </div>
            <div class="form-group">
                <label>Color</label>
                <input type="color" name="color" value="${area.color}">
            </div>
            <p class="text-muted" style="font-size:0.8rem">
                <i class="fas fa-info-circle"></i> Para agregar o quitar posiciones, use "Ver Estaciones".
            </p>
        </form>
    `;

    openModal('Editar Área', content, () => {
        const form = document.getElementById('editarAreaPlantaForm');
        const index = db.data.areasPlanta.findIndex(a => a.id === areaId);
        if (index !== -1) {
            db.data.areasPlanta[index].nombre = form.querySelector('[name="nombre"]').value;
            db.data.areasPlanta[index].color = form.querySelector('[name="color"]').value;
            db.save();
            loadProcesos();
        }
    });
}

function verEstacionesArea(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    const estaciones = db.getEstaciones().filter(e => e.areaPlantaId === areaId);
    const personal = db.getPersonal();
    const estadoOps = db.getEstadoOperadores();

    const content = `
        <h4 class="mb-2">${area.nombre} - ${estaciones.length} estaciones</h4>
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Operador</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${estaciones.map(est => {
                    const operador = est.operadorId ? personal.find(p => p.id === est.operadorId) : null;
                    const estado = estadoOps.find(e => e.estacionId === est.id);
                    return `
                        <tr>
                            <td><strong>${est.id}</strong></td>
                            <td><span class="text-muted">${est.nombre}</span></td>
                            <td>
                                ${operador ? `
                                    <span class="workstation ${estado?.estado || 'empty'}" style="width:24px;height:24px;display:inline-flex;vertical-align:middle;margin-right:8px">
                                        <span class="workstation-initials" style="font-size:0.6rem">${estado?.iniciales || getIniciales(operador.nombre)}</span>
                                    </span>
                                    ${operador.nombre}
                                ` : '<span class="text-muted">Sin asignar</span>'}
                            </td>
                            <td>
                                ${estado ? `<span class="status-badge ${getEstadoBadgeClass(estado.estado)}">${getEstadoTexto(estado.estado)}</span>` : '-'}
                            </td>
                            <td>
                                <button class="btn-icon-small" onclick="renombrarEstacion('${est.id}', '${areaId}')" title="Renombrar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon-small" onclick="showAsignarDesdeEstacion('${est.id}')" title="Asignar operador">
                                    <i class="fas fa-user-plus"></i>
                                </button>
                                <button class="btn-icon-small danger" onclick="eliminarEstacionConConfirm('${est.id}', '${areaId}')" title="Eliminar" ${operador ? 'disabled' : ''}>
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <div class="mt-2">
            <button class="btn btn-outline-primary" onclick="agregarPosicionesArea('${areaId}')">
                <i class="fas fa-plus"></i> Agregar Posiciones
            </button>
        </div>
    `;

    openModal(`Estaciones - ${area.nombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// ========================================
// PERSONAL
// ========================================
function loadPersonal() {
    const section = document.getElementById('section-personal');
    const personal = db.getPersonal();
    const areas = db.getAreas();
    const estaciones = db.getEstaciones();
    const estadoOps = db.getEstadoOperadores();

    // Separar activos e inhabilitados
    const personalActivo = personal.filter(p => p.activo !== false);
    const personalInhabilitado = personal.filter(p => p.activo === false);

    section.innerHTML = `
        <div class="section-header">
            <h1>Gestión de Personal</h1>
            <button class="btn btn-primary" onclick="showNuevoEmpleadoModal()">
                <i class="fas fa-plus"></i> Nuevo Empleado
            </button>
        </div>

        <div class="tabs">
            <button class="tab active" data-filter="todos">Todos (${personalActivo.length})</button>
            <button class="tab" data-filter="operador">Operadores</button>
            <button class="tab" data-filter="supervisora">Supervisoras</button>
            <button class="tab" data-filter="inhabilitados" style="color: var(--danger-color);">
                <i class="fas fa-user-slash"></i> Inhabilitados (${personalInhabilitado.length})
            </button>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="personalTable">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>No. Emp</th>
                        <th>Iniciales</th>
                        <th>Rol</th>
                        <th>Posiciones Asignadas</th>
                        <th>Horario</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${personal.map(emp => {
                        const area = areas.find(a => a.id === emp.areaId);
                        const posiciones = emp.posiciones || [];
                        const estadoOp = estadoOps.find(e => e.operadorId === emp.id);
                        const estadoActual = estadoOp ? estadoOp.estado : 'sin-asignar';
                        const iniciales = estadoOp ? estadoOp.iniciales : getIniciales(emp.nombre);
                        const estaInhabilitado = emp.activo === false;

                        return `
                            <tr data-rol="${emp.rol}" data-activo="${emp.activo !== false}" class="${estaInhabilitado ? 'row-inhabilitado' : ''}">
                                <td>
                                    <strong>${emp.nombre}</strong>
                                    ${estaInhabilitado ? '<span class="badge-inhabilitado">INHABILITADO</span>' : ''}
                                    ${emp.bloqueado ? '<span class="badge-bloqueado"><i class="fas fa-lock"></i></span>' : ''}
                                    ${emp.fechaBaja ? `<br><small class="text-muted">Baja: ${new Date(emp.fechaBaja).toLocaleDateString()}</small>` : ''}
                                </td>
                                <td>
                                    ${emp.numEmpleado ? `<code class="num-empleado">${emp.numEmpleado}</code>` : '<span class="text-muted">-</span>'}
                                </td>
                                <td>
                                    <span class="workstation ${estaInhabilitado ? 'inhabilitado' : estadoActual}" style="width:32px;height:32px;display:inline-flex;">
                                        <span class="workstation-initials">${iniciales}</span>
                                    </span>
                                </td>
                                <td><span class="status-badge ${emp.rol === 'supervisora' ? 'info' : emp.rol === 'administrador' ? 'warning' : 'success'}">${capitalizeFirst(emp.rol)}</span></td>
                                <td>
                                    ${estaInhabilitado
                                        ? '<span class="text-muted">N/A</span>'
                                        : posiciones.length > 0
                                            ? posiciones.map(p => `<span class="status-badge info" style="margin-right:4px">${p}</span>`).join('')
                                            : '<span class="text-muted">Sin asignar</span>'
                                    }
                                    ${!estaInhabilitado ? `
                                        <button class="btn-icon-small" onclick="showAsignarPosicionesModal(${emp.id})" title="Asignar posiciones">
                                            <i class="fas fa-map-marker-alt"></i>
                                        </button>
                                    ` : ''}
                                </td>
                                <td>
                                    <div class="horario-info">
                                        <span class="horario-entrada"><i class="fas fa-sign-in-alt"></i> ${emp.horaEntrada || '08:00'}</span>
                                        <span class="horario-salida"><i class="fas fa-sign-out-alt"></i> ${emp.horaSalida || '17:00'}</span>
                                        <span class="horario-comida"><i class="fas fa-utensils"></i> ${emp.horaComida || '13:00'}</span>
                                    </div>
                                </td>
                                <td>
                                    ${estaInhabilitado
                                        ? '<span class="status-badge danger"><i class="fas fa-user-slash"></i> Inhabilitado</span>'
                                        : `<span class="status-badge ${getEstadoBadgeClass(estadoActual)}">${getEstadoTexto(estadoActual)}</span>`
                                    }
                                </td>
                                <td>
                                    <button class="btn-icon-small" onclick="editEmpleado(${emp.id})" title="Editar"><i class="fas fa-edit"></i></button>
                                    ${emp.rol === 'operador' ? `
                                        <button class="btn-icon-small" onclick="verCredenciales(${emp.id})" title="Ver credenciales">
                                            <i class="fas fa-key"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn-icon-small ${estaInhabilitado ? 'btn-success' : 'btn-danger'}"
                                            onclick="toggleEmpleadoEstado(${emp.id})"
                                            title="${estaInhabilitado ? 'Rehabilitar empleado' : 'Inhabilitar empleado'}">
                                        <i class="fas fa-${estaInhabilitado ? 'user-check' : 'user-slash'}"></i>
                                    </button>
                                    ${estaInhabilitado ? `
                                        <button class="btn-icon-small" onclick="verHistorialEmpleado(${emp.id})" title="Ver historial">
                                            <i class="fas fa-history"></i>
                                        </button>
                                    ` : ''}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <!-- Mapa de Asignaciones -->
        <div class="mt-3">
            <h3><i class="fas fa-map"></i> Mapa de Asignaciones Actual</h3>
            <div class="plant-map-container mt-2" id="personalPlantMap">
                <!-- Se carga dinámicamente -->
            </div>
        </div>
    `;

    // Cargar mapa de asignaciones
    loadPersonalPlantMap();

    section.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            section.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterPersonal(tab.dataset.filter);
        });
    });
}

function loadPersonalPlantMap() {
    const container = document.getElementById('personalPlantMap');
    if (!container) return;

    const mapaData = db.getMapaPlantaData();

    container.innerHTML = mapaData.map(area => {
        const posicionesHtml = area.posiciones.map(pos => {
            const estado = pos.estado || 'empty';
            const tooltip = pos.operadorNombre
                ? `${pos.operadorNombre}`
                : `${pos.nombre} - Disponible`;

            if (estado === 'empty' || !pos.operadorId) {
                return `
                    <div class="workstation empty" data-tooltip="${tooltip}" data-id="${pos.id}" onclick="showAsignarDesdeEstacion('${pos.id}')">
                        <span class="workstation-code">${pos.id}</span>
                    </div>
                `;
            }

            return `
                <div class="workstation ${estado}" data-tooltip="${tooltip}" data-id="${pos.id}">
                    <span class="workstation-initials">${pos.iniciales || '??'}</span>
                    <span class="workstation-code">${pos.id}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="map-area" style="border-color: ${area.color}20;">
                <div class="map-area-header" style="color: ${area.color};">
                    ${area.nombre}
                </div>
                <div class="map-area-positions">
                    ${posicionesHtml}
                </div>
            </div>
        `;
    }).join('');
}

function getIniciales(nombre) {
    if (!nombre || typeof nombre !== 'string') return '??';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2 && partes[0] && partes[1]) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
}

function getEstadoTexto(estado) {
    const textos = {
        'adelantado': 'Adelantado',
        'on-pace': 'On Pace',
        'retrasado': 'Retrasado',
        'muy-retrasado': 'Muy Retrasado',
        'inactivo': 'Inactivo',
        'sin-asignar': 'Sin Asignar'
    };
    return textos[estado] || estado;
}

function getEstadoBadgeClass(estado) {
    const clases = {
        'adelantado': 'success',
        'on-pace': 'info',
        'retrasado': 'warning',
        'muy-retrasado': 'danger',
        'inactivo': 'secondary',
        'sin-asignar': 'secondary'
    };
    return clases[estado] || 'secondary';
}

function filterPersonal(filter) {
    const rows = document.querySelectorAll('#personalTable tbody tr');
    rows.forEach(row => {
        const esActivo = row.dataset.activo === 'true';
        const rol = row.dataset.rol;

        if (filter === 'todos') {
            // Mostrar solo activos
            row.style.display = esActivo ? '' : 'none';
        } else if (filter === 'inhabilitados') {
            // Mostrar solo inhabilitados
            row.style.display = !esActivo ? '' : 'none';
        } else {
            // Filtrar por rol (solo activos)
            row.style.display = (esActivo && rol === filter) ? '' : 'none';
        }
    });
}

function showAsignarPosicionesModal(empleadoId) {
    const empleado = db.getEmpleado(empleadoId);
    if (!empleado) {
        console.error('Empleado no encontrado:', empleadoId);
        alert('Error: Empleado no encontrado');
        return;
    }

    const estaciones = db.getEstaciones();
    const areasPlanta = db.getAreasPlanta();

    // Obtener posiciones del empleado desde su campo Y desde las estaciones asignadas
    const posicionesDesdeEmpleado = empleado.posiciones || [];
    const posicionesDesdeEstaciones = estaciones
        .filter(e => e.operadorId === empleadoId)
        .map(e => e.id);

    // Combinar ambas fuentes (union de ambos arrays)
    const posicionesActuales = [...new Set([...posicionesDesdeEmpleado, ...posicionesDesdeEstaciones])];

    const content = `
        <form id="asignarPosicionesForm">
            <p class="mb-2">Asignar posiciones de trabajo a <strong>${empleado.nombre}</strong></p>
            <p class="text-muted mb-2">Un empleado puede tener múltiples posiciones asignadas.</p>

            ${areasPlanta.map(area => {
                const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
                return `
                    <div class="mb-2">
                        <strong>${area.nombre}</strong>
                        <div class="d-flex gap-1" style="flex-wrap:wrap; margin-top:8px">
                            ${estacionesArea.map(est => {
                                const checked = posicionesActuales.includes(est.id);
                                const ocupada = est.operadorId && est.operadorId !== empleadoId;
                                const ocupadaPor = ocupada ? db.getEmpleado(est.operadorId)?.nombre : null;

                                return `
                                    <label style="display:flex;align-items:center;gap:4px;padding:4px 8px;background:${checked ? '#e0f2fe' : ocupada ? '#fee2e2' : '#f3f4f6'};border-radius:4px;cursor:${ocupada ? 'not-allowed' : 'pointer'}">
                                        <input type="checkbox"
                                            name="posicion"
                                            value="${est.id}"
                                            ${checked ? 'checked' : ''}
                                            ${ocupada ? 'disabled' : ''}>
                                        ${est.id}
                                        ${ocupada ? `<small class="text-danger">(${ocupadaPor?.split(' ')[0]})</small>` : ''}
                                    </label>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </form>
    `;

    openModal('Asignar Posiciones', content, () => {
        try {
            const form = document.getElementById('asignarPosicionesForm');
            if (!form) {
                console.error('Formulario no encontrado');
                alert('Error: No se pudo encontrar el formulario');
                return;
            }

            const checkboxes = form.querySelectorAll('input[name="posicion"]:checked');
            const nuevasPosiciones = Array.from(checkboxes).map(cb => cb.value);

            console.log('Guardando posiciones para empleado', empleadoId, ':', nuevasPosiciones);

            // Obtener empleado para crear estado en mapa
            const empleado = db.getEmpleado(empleadoId);

            // Primero liberar las estaciones que ya no estan asignadas
            const estaciones = db.getEstaciones();
            estaciones.forEach(est => {
                if (est.operadorId === empleadoId && !nuevasPosiciones.includes(est.id)) {
                    console.log('Liberando estacion:', est.id);
                    db.asignarOperadorAEstacion(est.id, null);
                    // Eliminar del mapa
                    eliminarEstadoOperadorDeMapa(est.id);
                }
            });

            // Asignar las nuevas posiciones
            nuevasPosiciones.forEach(posId => {
                console.log('Asignando estacion:', posId, 'a empleado:', empleadoId);
                db.asignarOperadorAEstacion(posId, empleadoId);
                // Crear estado en el mapa
                crearEstadoOperadorEnMapa(empleado, posId);
            });

            // Actualizar empleado con sus posiciones
            db.updateEmpleado(empleadoId, { posiciones: nuevasPosiciones });

            console.log('Posiciones guardadas correctamente');

            // Sincronizar con paneles
            sincronizarEstacionesConPaneles();

            // Recargar mapa
            if (typeof loadPlantMap === 'function') {
                loadPlantMap();
            }

            // Recargar la vista de personal
            loadPersonal();
            showToast('Posiciones actualizadas correctamente', 'success');
        } catch (error) {
            console.error('Error al guardar posiciones:', error);
            alert('Error al guardar las posiciones: ' + error.message);
        }
    });
}

function showAsignarDesdeEstacion(estacionId) {
    const estacion = db.getEstacion(estacionId);
    const personal = db.getPersonal().filter(p => p.rol === 'operador' && p.activo);

    const content = `
        <p class="mb-2">Asignar operador a la estación <strong>${estacionId}</strong></p>
        <div class="form-group">
            <label>Seleccionar Operador</label>
            <select id="selectOperador" class="form-control">
                <option value="">-- Sin asignar --</option>
                ${personal.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
            </select>
        </div>
    `;

    openModal('Asignar Operador', content, () => {
        const operadorId = document.getElementById('selectOperador').value;
        db.asignarOperadorAEstacion(estacionId, operadorId ? parseInt(operadorId) : null);

        if (operadorId) {
            const emp = db.getEmpleado(parseInt(operadorId));
            const posiciones = emp.posiciones || [];
            if (!posiciones.includes(estacionId)) {
                posiciones.push(estacionId);
                db.updateEmpleado(parseInt(operadorId), { posiciones });
            }
            // Crear estado en el mapa
            crearEstadoOperadorEnMapa(emp, estacionId);
        } else {
            // Si se quita el operador, eliminar del mapa
            eliminarEstadoOperadorDeMapa(estacionId);
        }

        // Sincronizar con paneles
        sincronizarEstacionesConPaneles();

        // Recargar mapa
        if (typeof loadPlantMap === 'function') {
            loadPlantMap();
        }

        loadPersonal();
        showToast(operadorId ? 'Operador asignado correctamente' : 'Operador desasignado', 'success');
    });
}

function showNuevoEmpleadoModal() {
    const areas = db.getAreas();
    const areasPlanta = db.getAreasPlanta();
    const estaciones = db.getEstaciones();
    const nuevoNumEmpleado = generarNumEmpleado();
    const pinAleatorio = generarPINAleatorio(4);

    const content = `
        <form id="nuevoEmpleadoForm" class="form-empleado-completo">
            <!-- Sección: Información Personal -->
            <div class="form-section">
                <h4 class="form-section-title">
                    <i class="fas fa-user"></i> Información Personal
                </h4>
                <div class="form-group">
                    <label>Nombre Completo *</label>
                    <input type="text" name="nombre" required placeholder="Nombre y apellidos">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Rol *</label>
                        <select name="rol" required onchange="toggleAreaField(this.value); toggleCredencialesSection(this.value)">
                            <option value="operador">Operador</option>
                            <option value="supervisora">Supervisora</option>
                            <option value="administrador">Administrador</option>
                        </select>
                    </div>
                    <div class="form-group" id="areaField">
                        <label>Área (Procesos)</label>
                        <select name="areaId">
                            <option value="">Seleccionar...</option>
                            ${areas.map(a => `<option value="${a.id}">${a.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Sección: Credenciales de Acceso -->
            <div class="form-section" id="credencialesSection">
                <h4 class="form-section-title">
                    <i class="fas fa-key"></i> Credenciales de Acceso
                </h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Número de Empleado *</label>
                        <input type="text" name="numEmpleado" value="${nuevoNumEmpleado}" required maxlength="6" pattern="[0-9]+" title="Solo números">
                        <small class="form-hint">Identificador único para el panel de operadora</small>
                    </div>
                    <div class="form-group">
                        <label>PIN de Acceso *</label>
                        <div class="input-with-action">
                            <input type="text" name="pin" value="${pinAleatorio}" required maxlength="4" pattern="[0-9]{4}" title="4 dígitos">
                            <button type="button" class="btn-inline" onclick="regenerarPIN()" title="Generar nuevo PIN">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <small class="form-hint">PIN de 4 dígitos para iniciar sesión</small>
                    </div>
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="pinTemporal" checked>
                        <span>PIN temporal (el empleado deberá cambiarlo en su primer acceso)</span>
                    </label>
                </div>
            </div>

            <!-- Sección: Horarios -->
            <div class="form-section">
                <h4 class="form-section-title">
                    <i class="fas fa-clock"></i> Horarios
                </h4>
                <div class="form-row" style="grid-template-columns: repeat(2, 1fr);">
                    <div class="form-group">
                        <label>Hora Entrada *</label>
                        <input type="time" name="horaEntrada" required value="08:00" onchange="calcularSueldos()">
                    </div>
                    <div class="form-group">
                        <label>Hora Salida *</label>
                        <input type="time" name="horaSalida" required value="17:00" onchange="calcularSueldos()">
                    </div>
                </div>
                <div class="form-group">
                    <label class="checkbox-label sin-comida-toggle">
                        <input type="checkbox" name="sinHoraComida" onchange="toggleHoraComida(this)">
                        <span><i class="fas fa-utensils"></i> Sin hora de comida (jornada continua)</span>
                    </label>
                </div>
                <div class="form-row hora-comida-fields" style="grid-template-columns: repeat(2, 1fr);">
                    <div class="form-group">
                        <label>Inicio Comida</label>
                        <input type="time" name="horaComidaInicio" value="13:00" onchange="calcularSueldos()">
                    </div>
                    <div class="form-group">
                        <label>Fin Comida</label>
                        <input type="time" name="horaComidaFin" value="13:30" onchange="calcularSueldos()">
                    </div>
                </div>
                <div class="form-group">
                    <label class="horas-calculadas-label">
                        <i class="fas fa-calculator"></i> Horas reales trabajadas por día:
                        <strong id="horasRealesDia">8.5</strong> hrs
                    </label>
                </div>
            </div>

            <!-- Sección: Salario -->
            <div class="form-section">
                <h4 class="form-section-title">
                    <i class="fas fa-money-bill-wave"></i> Salario
                </h4>
                <div class="salario-grid">
                    <div class="salario-grupo">
                        <h5 class="salario-subtitulo">Componentes del Sueldo</h5>
                        <div class="form-row" style="grid-template-columns: repeat(3, 1fr);">
                            <div class="form-group">
                                <label>Salario Semanal *</label>
                                <div class="input-money">
                                    <span class="currency">$</span>
                                    <input type="number" name="salarioSemanal" step="0.01" required value="2000" onchange="calcularSueldos()">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Premio Puntualidad</label>
                                <div class="input-money">
                                    <span class="currency">$</span>
                                    <input type="number" name="premioPuntualidad" step="0.01" value="200" onchange="calcularSueldos()">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Premio Producción</label>
                                <div class="input-money">
                                    <span class="currency">$</span>
                                    <input type="number" name="premioProduccion" step="0.01" value="300" onchange="calcularSueldos()">
                                </div>
                            </div>
                        </div>
                        <div class="form-group sueldo-resultado">
                            <label>Sueldo Bruto Semanal</label>
                            <div class="sueldo-display bruto">
                                $<span id="sueldoBruto">2,500.00</span>
                            </div>
                        </div>
                    </div>

                    <div class="salario-grupo prevision-social">
                        <h5 class="salario-subtitulo">
                            <i class="fas fa-shield-alt"></i> Previsión Social
                            <span class="porcentaje-badge">40% del Bruto</span>
                        </h5>
                        <div class="form-group">
                            <label>Costo Previsión Social (40%)</label>
                            <div class="input-money prevision-display">
                                <span class="currency">$</span>
                                <input type="number" name="previsionSocial" step="0.01" value="1000" readonly class="readonly-input">
                            </div>
                            <small class="form-hint">
                                <i class="fas fa-calculator"></i> Calculado automáticamente: 40% × Sueldo Bruto
                                <br>Incluye IMSS, Infonavit, ISR, SAR, etc.
                            </small>
                        </div>
                    </div>

                    <div class="salario-grupo resumen-final">
                        <h5 class="salario-subtitulo">Sueldo Neto Calculado</h5>
                        <div class="sueldos-calculados">
                            <div class="sueldo-item">
                                <span class="sueldo-label">Sueldo Neto Semanal</span>
                                <span class="sueldo-valor neto" id="sueldoNetoSemanal">Calculando...</span>
                            </div>
                            <div class="sueldo-item">
                                <span class="sueldo-label">Sueldo Neto Diario</span>
                                <span class="sueldo-valor" id="sueldoNetoDiario">Calculando...</span>
                                <small class="sueldo-nota">(Semanal ÷ 5 días)</small>
                            </div>
                            <div class="sueldo-item">
                                <span class="sueldo-label">Sueldo por Hora</span>
                                <span class="sueldo-valor" id="sueldoPorHora">Calculando...</span>
                                <small class="sueldo-nota">(Diario ÷ <span id="horasCalculo">8.5</span> hrs)</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sección: Permisos Específicos -->
            <div class="form-section" id="permisosSection">
                <h4 class="form-section-title">
                    <i class="fas fa-shield-alt"></i> Permisos Específicos
                </h4>
                <div class="permisos-grid">
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_capturar" checked>
                        <span class="permiso-label">
                            <i class="fas fa-edit"></i>
                            Capturar Producción
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_pausar" checked>
                        <span class="permiso-label">
                            <i class="fas fa-pause"></i>
                            Pausar/Reanudar
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_reportar" checked>
                        <span class="permiso-label">
                            <i class="fas fa-exclamation-triangle"></i>
                            Reportar Problemas
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_fotos" checked>
                        <span class="permiso-label">
                            <i class="fas fa-camera"></i>
                            Tomar Fotos
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_historial">
                        <span class="permiso-label">
                            <i class="fas fa-history"></i>
                            Ver Historial
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_ranking">
                        <span class="permiso-label">
                            <i class="fas fa-trophy"></i>
                            Ver Ranking
                        </span>
                    </label>
                </div>
            </div>

            <!-- Sección: Posiciones en Planta -->
            <div class="form-section" id="posicionesField">
                <h4 class="form-section-title">
                    <i class="fas fa-map-marker-alt"></i> Posiciones en Planta
                </h4>
                <p class="form-hint" style="margin-bottom: 10px;">
                    <i class="fas fa-info-circle"></i> Selecciona las posiciones donde puede trabajar este empleado.
                    <span class="ocupada-hint">Las marcadas en naranja ya tienen operador asignado.</span>
                </p>
                <div class="posiciones-container">
                    ${areasPlanta.map(area => {
                        const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
                        if (estacionesArea.length === 0) return '';
                        return `
                            <div class="area-posiciones">
                                <strong class="area-nombre">${area.nombre}</strong>
                                <div class="posiciones-list">
                                    ${estacionesArea.map(est => {
                                        const ocupada = est.operadorId !== null;
                                        const operador = ocupada ? db.getEmpleado(est.operadorId) : null;
                                        const tooltip = ocupada && operador ? `Asignada a: ${operador.nombre}` : '';
                                        return `
                                        <label class="posicion-checkbox ${ocupada ? 'ocupada' : ''}" title="${tooltip}">
                                            <input type="checkbox" name="posicion" value="${est.id}">
                                            <span>${est.id}</span>
                                            ${ocupada ? '<i class="fas fa-user-check ocupada-icon"></i>' : ''}
                                        </label>
                                    `}).join('')}
                                </div>
                            </div>
                        `;
                    }).join('') || '<p class="text-muted">No hay posiciones disponibles. Ve a Configuración > Áreas de Planta para crear estaciones.</p>'}
                </div>
            </div>
        </form>
    `;

    openModal('Nuevo Empleado', content, () => {
        guardarNuevoEmpleado();
    });

    // Calcular sueldos iniciales después de abrir el modal
    setTimeout(() => {
        calcularSueldos();
    }, 100);
}

function guardarNuevoEmpleado() {
    const form = document.getElementById('nuevoEmpleadoForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const checkboxes = form.querySelectorAll('input[name="posicion"]:checked');
    const posiciones = Array.from(checkboxes).map(cb => cb.value);

    // Recopilar permisos
    const permisos = {
        capturar: form.querySelector('[name="permiso_capturar"]')?.checked || false,
        pausar: form.querySelector('[name="permiso_pausar"]')?.checked || false,
        reportar: form.querySelector('[name="permiso_reportar"]')?.checked || false,
        fotos: form.querySelector('[name="permiso_fotos"]')?.checked || false,
        historial: form.querySelector('[name="permiso_historial"]')?.checked || false,
        ranking: form.querySelector('[name="permiso_ranking"]')?.checked || false
    };

    // Calcular horas reales trabajadas
    const horaEntrada = form.querySelector('[name="horaEntrada"]').value;
    const horaSalida = form.querySelector('[name="horaSalida"]').value;
    const horaComidaInicio = form.querySelector('[name="horaComidaInicio"]').value;
    const horaComidaFin = form.querySelector('[name="horaComidaFin"]').value;
    const horasReales = calcularHorasReales(horaEntrada, horaSalida, horaComidaInicio, horaComidaFin);

    // Obtener valores de salario
    const salarioSemanal = parseFloat(form.querySelector('[name="salarioSemanal"]').value) || 0;
    const premioPuntualidad = parseFloat(form.querySelector('[name="premioPuntualidad"]').value) || 0;
    const premioProduccion = parseFloat(form.querySelector('[name="premioProduccion"]').value) || 0;
    const previsionSocial = parseFloat(form.querySelector('[name="previsionSocial"]').value) || 0;

    // Calcular sueldos
    const sueldoBruto = salarioSemanal + premioPuntualidad + premioProduccion;
    const sueldoNetoSemanal = sueldoBruto + previsionSocial;
    const sueldoNetoDiario = sueldoNetoSemanal / 5;
    const sueldoPorHora = horasReales > 0 ? sueldoNetoDiario / horasReales : 0;

    const sinHoraComida = form.querySelector('[name="sinHoraComida"]')?.checked || false;

    const empleado = {
        nombre: form.querySelector('[name="nombre"]').value,
        rol: form.querySelector('[name="rol"]').value,
        areaId: form.querySelector('[name="areaId"]')?.value ? parseInt(form.querySelector('[name="areaId"]').value) : null,
        // Horarios
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        sinHoraComida: sinHoraComida,
        horaComidaInicio: sinHoraComida ? null : (horaComidaInicio || null),
        horaComidaFin: sinHoraComida ? null : (horaComidaFin || null),
        horasRealesDia: horasReales,
        // Salario - Componentes
        salarioSemanal: salarioSemanal,
        premioPuntualidad: premioPuntualidad,
        premioProduccion: premioProduccion,
        sueldoBruto: sueldoBruto,
        previsionSocial: previsionSocial,
        // Salario - Calculados
        sueldoNetoSemanal: sueldoNetoSemanal,
        sueldoNetoDiario: sueldoNetoDiario,
        // IMPORTANTE: salarioHora = Sueldo Neto por Hora (usado para calcular costo por producto)
        salarioHora: sueldoPorHora,
        posiciones: posiciones,
        // Credenciales
        numEmpleado: form.querySelector('[name="numEmpleado"]').value,
        pin: form.querySelector('[name="pin"]').value,
        pinTemporal: form.querySelector('[name="pinTemporal"]')?.checked || false,
        bloqueado: false,
        intentosFallidos: 0,
        ultimoAcceso: null,
        // Permisos
        permisos: permisos
    };

    const nuevoEmpleado = db.addEmpleado(empleado);

    // Asignar estaciones y crear estado de operador
    posiciones.forEach(posId => {
        db.asignarOperadorAEstacion(posId, nuevoEmpleado.id);

        // Crear estado de operador para el mapa de planta
        crearEstadoOperadorEnMapa(nuevoEmpleado, posId);
    });

    // Sincronizar con panel de operadora
    if (typeof sincronizarOperadorasParaLogin === 'function') {
        sincronizarOperadorasParaLogin();
    } else if (typeof sincronizarOperadorasDB === 'function') {
        sincronizarOperadorasDB();
    }

    // Sincronizar estaciones con todos los paneles
    sincronizarEstacionesConPaneles();

    // Recargar mapa de planta si está visible
    if (typeof loadPlantMap === 'function') {
        loadPlantMap();
    }

    closeModal();
    loadPersonal();

    // Mostrar confirmación
    showToast(`Empleado "${empleado.nombre}" creado con éxito. Número: ${empleado.numEmpleado}`, 'success');
}

function regenerarPIN() {
    const pinInput = document.querySelector('[name="pin"]');
    if (pinInput) {
        pinInput.value = generarPINAleatorio(4);
    }
}

// ========================================
// FUNCIONES DE HORA DE COMIDA
// ========================================

function toggleHoraComida(checkbox) {
    const container = document.querySelector('.hora-comida-fields');
    const inputInicio = document.querySelector('[name="horaComidaInicio"]');
    const inputFin = document.querySelector('[name="horaComidaFin"]');

    if (checkbox.checked) {
        // Sin hora de comida
        container.style.display = 'none';
        if (inputInicio) inputInicio.value = '';
        if (inputFin) inputFin.value = '';
    } else {
        // Con hora de comida
        container.style.display = 'grid';
        if (inputInicio && !inputInicio.value) inputInicio.value = '13:00';
        if (inputFin && !inputFin.value) inputFin.value = '13:30';
    }

    // Recalcular sueldos
    calcularSueldos();
}

function toggleHoraComidaEdit(checkbox) {
    const container = document.querySelector('.hora-comida-fields-edit');
    const inputInicio = document.querySelector('#editarEmpleadoForm [name="horaComidaInicio"]');
    const inputFin = document.querySelector('#editarEmpleadoForm [name="horaComidaFin"]');

    if (checkbox.checked) {
        // Sin hora de comida
        container.style.display = 'none';
        if (inputInicio) inputInicio.value = '';
        if (inputFin) inputFin.value = '';
    } else {
        // Con hora de comida
        container.style.display = 'grid';
        if (inputInicio && !inputInicio.value) inputInicio.value = '13:00';
        if (inputFin && !inputFin.value) inputFin.value = '13:30';
    }

    // Recalcular sueldos
    calcularSueldosEdit();
}

// ========================================
// FUNCIONES DE CÁLCULO DE SUELDOS
// ========================================

function calcularHorasReales(horaEntrada, horaSalida, horaComidaInicio, horaComidaFin) {
    if (!horaEntrada || !horaSalida) return 8;

    const [entradaH, entradaM] = horaEntrada.split(':').map(Number);
    const [salidaH, salidaM] = horaSalida.split(':').map(Number);

    const entradaMinutos = entradaH * 60 + entradaM;
    const salidaMinutos = salidaH * 60 + salidaM;

    let totalMinutos = salidaMinutos - entradaMinutos;

    // Restar tiempo de comida si está definido
    if (horaComidaInicio && horaComidaFin) {
        const [comidaInicioH, comidaInicioM] = horaComidaInicio.split(':').map(Number);
        const [comidaFinH, comidaFinM] = horaComidaFin.split(':').map(Number);
        const comidaInicioMinutos = comidaInicioH * 60 + comidaInicioM;
        const comidaFinMinutos = comidaFinH * 60 + comidaFinM;
        const tiempoComida = comidaFinMinutos - comidaInicioMinutos;
        totalMinutos -= tiempoComida;
    }

    return Math.max(0, totalMinutos / 60);
}

function calcularSueldos() {
    const form = document.getElementById('nuevoEmpleadoForm') || document.getElementById('editarEmpleadoForm');
    if (!form) return;

    // Obtener horarios
    const horaEntrada = form.querySelector('[name="horaEntrada"]')?.value;
    const horaSalida = form.querySelector('[name="horaSalida"]')?.value;
    const horaComidaInicio = form.querySelector('[name="horaComidaInicio"]')?.value;
    const horaComidaFin = form.querySelector('[name="horaComidaFin"]')?.value;

    // Calcular horas reales
    const horasReales = calcularHorasReales(horaEntrada, horaSalida, horaComidaInicio, horaComidaFin);

    // Actualizar display de horas
    const horasRealesDiaEl = document.getElementById('horasRealesDia');
    const horasCalculoEl = document.getElementById('horasCalculo');
    if (horasRealesDiaEl) horasRealesDiaEl.textContent = horasReales.toFixed(1);
    if (horasCalculoEl) horasCalculoEl.textContent = horasReales.toFixed(1);

    // Obtener valores de salario
    const salarioSemanal = parseFloat(form.querySelector('[name="salarioSemanal"]')?.value) || 0;
    const premioPuntualidad = parseFloat(form.querySelector('[name="premioPuntualidad"]')?.value) || 0;
    const premioProduccion = parseFloat(form.querySelector('[name="premioProduccion"]')?.value) || 0;

    // Calcular sueldo bruto
    const sueldoBruto = salarioSemanal + premioPuntualidad + premioProduccion;

    // Calcular previsión social automáticamente (40% del bruto)
    const previsionSocial = sueldoBruto * 0.40;

    // Actualizar campo de previsión social
    const previsionInput = form.querySelector('[name="previsionSocial"]');
    if (previsionInput) {
        previsionInput.value = previsionSocial.toFixed(2);
    }

    // Calcular sueldo neto (bruto + previsión social)
    const sueldoNetoSemanal = sueldoBruto + previsionSocial;

    // Calcular sueldo diario (semanal / 5 días)
    const sueldoNetoDiario = sueldoNetoSemanal / 5;

    // Calcular sueldo por hora (diario / horas reales)
    const sueldoPorHora = horasReales > 0 ? sueldoNetoDiario / horasReales : 0;

    // Actualizar displays
    const formatMoney = (num) => num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const sueldoBrutoEl = document.getElementById('sueldoBruto');
    const sueldoNetoSemanalEl = document.getElementById('sueldoNetoSemanal');
    const sueldoNetoDiarioEl = document.getElementById('sueldoNetoDiario');
    const sueldoPorHoraEl = document.getElementById('sueldoPorHora');

    if (sueldoBrutoEl) sueldoBrutoEl.textContent = formatMoney(sueldoBruto);
    if (sueldoNetoSemanalEl) sueldoNetoSemanalEl.textContent = '$' + formatMoney(sueldoNetoSemanal);
    if (sueldoNetoDiarioEl) sueldoNetoDiarioEl.textContent = '$' + formatMoney(sueldoNetoDiario);
    if (sueldoPorHoraEl) sueldoPorHoraEl.textContent = '$' + formatMoney(sueldoPorHora);
}

// Exponer funciones globalmente
window.calcularSueldos = calcularSueldos;
window.calcularHorasReales = calcularHorasReales;
window.toggleHoraComida = toggleHoraComida;
window.toggleHoraComidaEdit = toggleHoraComidaEdit;

// Exponer funciones de estaciones globalmente
window.renombrarEstacion = renombrarEstacion;
window.confirmarRenombrarEstacion = confirmarRenombrarEstacion;
window.eliminarEstacionConConfirm = eliminarEstacionConConfirm;
window.sincronizarEstacionesConPaneles = sincronizarEstacionesConPaneles;
window.crearEstadoOperadorEnMapa = crearEstadoOperadorEnMapa;
window.eliminarEstadoOperadorDeMapa = eliminarEstadoOperadorDeMapa;
window.sincronizarEstadoOperadoresDB = sincronizarEstadoOperadoresDB;
window.asignarOperadorAEstacionDesdeModal = asignarOperadorAEstacionDesdeModal;
window.desasignarOperadorDeEstacion = desasignarOperadorDeEstacion;
window.showPosicionDetalle = showPosicionDetalle;
window.showPosicionSinOperador = showPosicionSinOperador;
window.calcularEstadisticasEmpleado = calcularEstadisticasEmpleado;
window.sincronizarEstadoOperadoresAlInicio = sincronizarEstadoOperadoresAlInicio;

function toggleCredencialesSection(rol) {
    const credencialesSection = document.getElementById('credencialesSection');
    const permisosSection = document.getElementById('permisosSection');

    // Mostrar credenciales para todos los roles que usen panel operadora
    if (credencialesSection) {
        credencialesSection.style.display = (rol === 'operador' || rol === 'supervisora') ? 'block' : 'none';
    }

    // Mostrar permisos específicos solo para operadores
    if (permisosSection) {
        permisosSection.style.display = rol === 'operador' ? 'block' : 'none';
    }
}

function toggleAreaField(rol) {
    const areaField = document.getElementById('areaField');
    const posicionesField = document.getElementById('posicionesField');
    if (areaField) areaField.style.display = rol === 'supervisora' ? 'none' : 'block';
    if (posicionesField) posicionesField.style.display = rol === 'supervisora' ? 'none' : 'block';
}

function editEmpleado(id) {
    const empleado = db.getEmpleado(id);
    const areas = db.getAreas();
    const areasPlanta = db.getAreasPlanta();
    const estaciones = db.getEstaciones();

    // Obtener permisos actuales o usar valores por defecto
    const permisos = empleado.permisos || {
        capturar: true, pausar: true, reportar: true,
        fotos: true, historial: false, ranking: false
    };

    // Calcular valores de salario si no existen
    const salarioSemanal = empleado.salarioSemanal || (empleado.salarioHora * (empleado.horasRealesDia || 8.5) * 5) || 2000;
    const premioPuntualidad = empleado.premioPuntualidad || 0;
    const premioProduccion = empleado.premioProduccion || 0;
    const sueldoBruto = salarioSemanal + premioPuntualidad + premioProduccion;
    const previsionSocial = empleado.previsionSocial || (sueldoBruto * 0.40);

    const content = `
        <form id="editarEmpleadoForm" class="form-empleado-completo">
            <!-- Sección: Información Personal -->
            <div class="form-section">
                <h4 class="form-section-title">
                    <i class="fas fa-user"></i> Información Personal
                </h4>
                <div class="form-group">
                    <label>Nombre Completo *</label>
                    <input type="text" name="nombre" value="${empleado.nombre}" required placeholder="Nombre y apellidos">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Rol *</label>
                        <select name="rol" required onchange="toggleAreaFieldEdit(this.value); toggleCredencialesSectionEdit(this.value)">
                            <option value="operador" ${empleado.rol === 'operador' ? 'selected' : ''}>Operador</option>
                            <option value="supervisora" ${empleado.rol === 'supervisora' ? 'selected' : ''}>Supervisora</option>
                            <option value="administrador" ${empleado.rol === 'administrador' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                    <div class="form-group" id="areaFieldEdit" style="${empleado.rol === 'administrador' ? 'display:none' : ''}">
                        <label>Área (Procesos)</label>
                        <select name="areaId">
                            <option value="">Seleccionar...</option>
                            ${areas.map(a => `<option value="${a.id}" ${empleado.areaId === a.id ? 'selected' : ''}>${a.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Sección: Credenciales de Acceso -->
            <div class="form-section" id="credencialesSectionEdit" style="${empleado.rol === 'administrador' ? 'display:none' : ''}">
                <h4 class="form-section-title">
                    <i class="fas fa-key"></i> Credenciales de Acceso
                </h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Número de Empleado *</label>
                        <input type="text" name="numEmpleado" value="${empleado.numEmpleado || ''}" required maxlength="6" pattern="[0-9]+" title="Solo números">
                        <small class="form-hint">Identificador único para el panel de operadora</small>
                    </div>
                    <div class="form-group">
                        <label>PIN de Acceso *</label>
                        <div class="input-with-action">
                            <input type="text" name="pin" value="${empleado.pin || ''}" required maxlength="4" pattern="[0-9]{4}" title="4 dígitos">
                            <button type="button" class="btn-inline" onclick="regenerarPINEdit()" title="Generar nuevo PIN">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <small class="form-hint">PIN de 4 dígitos para iniciar sesión</small>
                    </div>
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="bloqueado" ${empleado.bloqueado ? 'checked' : ''}>
                        <span>Cuenta bloqueada (no puede iniciar sesión)</span>
                    </label>
                </div>
            </div>

            <!-- Sección: Horarios -->
            <div class="form-section">
                <h4 class="form-section-title">
                    <i class="fas fa-clock"></i> Horarios
                </h4>
                <div class="form-row" style="grid-template-columns: repeat(2, 1fr);">
                    <div class="form-group">
                        <label>Hora Entrada *</label>
                        <input type="time" name="horaEntrada" required value="${empleado.horaEntrada || '08:00'}" onchange="calcularSueldosEdit()">
                    </div>
                    <div class="form-group">
                        <label>Hora Salida *</label>
                        <input type="time" name="horaSalida" required value="${empleado.horaSalida || '17:00'}" onchange="calcularSueldosEdit()">
                    </div>
                </div>
                <div class="form-group">
                    <label class="checkbox-label sin-comida-toggle">
                        <input type="checkbox" name="sinHoraComida" ${empleado.sinHoraComida ? 'checked' : ''} onchange="toggleHoraComidaEdit(this)">
                        <span><i class="fas fa-utensils"></i> Sin hora de comida (jornada continua)</span>
                    </label>
                </div>
                <div class="form-row hora-comida-fields-edit" style="grid-template-columns: repeat(2, 1fr); ${empleado.sinHoraComida ? 'display:none;' : ''}">
                    <div class="form-group">
                        <label>Inicio Comida</label>
                        <input type="time" name="horaComidaInicio" value="${empleado.horaComidaInicio || ''}" onchange="calcularSueldosEdit()">
                    </div>
                    <div class="form-group">
                        <label>Fin Comida</label>
                        <input type="time" name="horaComidaFin" value="${empleado.horaComidaFin || ''}" onchange="calcularSueldosEdit()">
                    </div>
                </div>
                <div class="form-group">
                    <label class="horas-calculadas-label">
                        <i class="fas fa-calculator"></i> Horas reales trabajadas por día:
                        <strong id="horasRealesDiaEdit">${empleado.horasRealesDia?.toFixed(1) || '8.5'}</strong> hrs
                    </label>
                </div>
            </div>

            <!-- Sección: Salario -->
            <div class="form-section">
                <h4 class="form-section-title">
                    <i class="fas fa-money-bill-wave"></i> Salario
                </h4>
                <div class="salario-grid">
                    <div class="salario-grupo">
                        <h5 class="salario-subtitulo">Componentes del Sueldo</h5>
                        <div class="form-row" style="grid-template-columns: repeat(3, 1fr);">
                            <div class="form-group">
                                <label>Salario Semanal *</label>
                                <div class="input-money">
                                    <span class="currency">$</span>
                                    <input type="number" name="salarioSemanal" step="0.01" required value="${salarioSemanal.toFixed(2)}" onchange="calcularSueldosEdit()">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Premio Puntualidad</label>
                                <div class="input-money">
                                    <span class="currency">$</span>
                                    <input type="number" name="premioPuntualidad" step="0.01" value="${premioPuntualidad.toFixed(2)}" onchange="calcularSueldosEdit()">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Premio Producción</label>
                                <div class="input-money">
                                    <span class="currency">$</span>
                                    <input type="number" name="premioProduccion" step="0.01" value="${premioProduccion.toFixed(2)}" onchange="calcularSueldosEdit()">
                                </div>
                            </div>
                        </div>
                        <div class="form-group sueldo-resultado">
                            <label>Sueldo Bruto Semanal</label>
                            <div class="sueldo-display bruto">
                                $<span id="sueldoBrutoEdit">${sueldoBruto.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span>
                            </div>
                        </div>
                    </div>

                    <div class="salario-grupo prevision-social">
                        <h5 class="salario-subtitulo">
                            <i class="fas fa-shield-alt"></i> Previsión Social
                            <span class="porcentaje-badge">40% del Bruto</span>
                        </h5>
                        <div class="form-group">
                            <label>Costo Previsión Social (40%)</label>
                            <div class="input-money prevision-display">
                                <span class="currency">$</span>
                                <input type="number" name="previsionSocial" step="0.01" value="${previsionSocial.toFixed(2)}" readonly class="readonly-input">
                            </div>
                            <small class="form-hint">
                                <i class="fas fa-calculator"></i> Calculado automáticamente: 40% × Sueldo Bruto
                            </small>
                        </div>
                    </div>

                    <div class="salario-grupo resumen-final">
                        <h5 class="salario-subtitulo">Sueldo Neto Calculado</h5>
                        <div class="sueldos-calculados">
                            <div class="sueldo-item">
                                <span class="sueldo-label">Sueldo Neto Semanal</span>
                                <span class="sueldo-valor neto" id="sueldoNetoSemanalEdit">Calculando...</span>
                            </div>
                            <div class="sueldo-item">
                                <span class="sueldo-label">Sueldo Neto Diario</span>
                                <span class="sueldo-valor" id="sueldoNetoDiarioEdit">Calculando...</span>
                                <small class="sueldo-nota">(Semanal ÷ 5 días)</small>
                            </div>
                            <div class="sueldo-item">
                                <span class="sueldo-label">Sueldo por Hora</span>
                                <span class="sueldo-valor" id="sueldoPorHoraEdit">Calculando...</span>
                                <small class="sueldo-nota">(Diario ÷ <span id="horasCalculoEdit">${empleado.horasRealesDia?.toFixed(1) || '8.5'}</span> hrs)</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sección: Permisos Específicos -->
            <div class="form-section" id="permisosSectionEdit" style="${empleado.rol === 'administrador' ? 'display:none' : ''}">
                <h4 class="form-section-title">
                    <i class="fas fa-shield-alt"></i> Permisos Específicos
                </h4>
                <div class="permisos-grid">
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_capturar" ${permisos.capturar ? 'checked' : ''}>
                        <span class="permiso-label">
                            <i class="fas fa-edit"></i>
                            Capturar Producción
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_pausar" ${permisos.pausar ? 'checked' : ''}>
                        <span class="permiso-label">
                            <i class="fas fa-pause"></i>
                            Pausar/Reanudar
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_reportar" ${permisos.reportar ? 'checked' : ''}>
                        <span class="permiso-label">
                            <i class="fas fa-exclamation-triangle"></i>
                            Reportar Problemas
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_fotos" ${permisos.fotos ? 'checked' : ''}>
                        <span class="permiso-label">
                            <i class="fas fa-camera"></i>
                            Tomar Fotos
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_historial" ${permisos.historial ? 'checked' : ''}>
                        <span class="permiso-label">
                            <i class="fas fa-history"></i>
                            Ver Historial
                        </span>
                    </label>
                    <label class="permiso-item">
                        <input type="checkbox" name="permiso_ranking" ${permisos.ranking ? 'checked' : ''}>
                        <span class="permiso-label">
                            <i class="fas fa-trophy"></i>
                            Ver Ranking
                        </span>
                    </label>
                </div>
            </div>

            <!-- Sección: Posiciones en Planta -->
            <div class="form-section" id="posicionesFieldEdit" style="${empleado.rol === 'administrador' ? 'display:none' : ''}">
                <h4 class="form-section-title">
                    <i class="fas fa-map-marker-alt"></i> Posiciones en Planta
                </h4>
                <p class="form-hint" style="margin-bottom: 10px;">
                    <i class="fas fa-info-circle"></i> Selecciona las posiciones donde puede trabajar este empleado.
                    <span class="ocupada-hint">Las marcadas en naranja tienen otro operador asignado.</span>
                </p>
                <div class="posiciones-container">
                    ${areasPlanta.map(area => {
                        const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
                        if (estacionesArea.length === 0) return '';
                        return `
                            <div class="area-posiciones">
                                <strong class="area-nombre">${area.nombre}</strong>
                                <div class="posiciones-list">
                                    ${estacionesArea.map(est => {
                                        const ocupadaPorOtro = est.operadorId !== null && est.operadorId !== id;
                                        const asignadaAEste = empleado.posiciones && empleado.posiciones.includes(est.id);
                                        const operadorOtro = ocupadaPorOtro ? db.getEmpleado(est.operadorId) : null;
                                        const tooltip = ocupadaPorOtro && operadorOtro ? 'Asignada a: ' + operadorOtro.nombre : '';
                                        return `
                                        <label class="posicion-checkbox ${ocupadaPorOtro ? 'ocupada' : ''}" title="${tooltip}">
                                            <input type="checkbox" name="posicion" value="${est.id}" ${asignadaAEste ? 'checked' : ''}>
                                            <span>${est.id}</span>
                                            ${ocupadaPorOtro ? '<i class="fas fa-user-check ocupada-icon"></i>' : ''}
                                        </label>
                                    `}).join('')}
                                </div>
                            </div>
                        `;
                    }).join('') || '<p class="text-muted">No hay posiciones disponibles.</p>'}
                </div>
            </div>
        </form>
    `;

    openModal('Editar Empleado: ' + empleado.nombre, content, () => {
        guardarEdicionEmpleado(id);
    });

    // Calcular sueldos iniciales después de abrir el modal
    setTimeout(() => {
        calcularSueldosEdit();
    }, 100);
}

function guardarEdicionEmpleado(id) {
    const form = document.getElementById('editarEmpleadoForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Obtener posiciones seleccionadas
    const checkboxes = form.querySelectorAll('input[name="posicion"]:checked');
    const posiciones = Array.from(checkboxes).map(cb => cb.value);

    // Recopilar permisos
    const permisos = {
        capturar: form.querySelector('[name="permiso_capturar"]')?.checked || false,
        pausar: form.querySelector('[name="permiso_pausar"]')?.checked || false,
        reportar: form.querySelector('[name="permiso_reportar"]')?.checked || false,
        fotos: form.querySelector('[name="permiso_fotos"]')?.checked || false,
        historial: form.querySelector('[name="permiso_historial"]')?.checked || false,
        ranking: form.querySelector('[name="permiso_ranking"]')?.checked || false
    };

    // Calcular horas reales trabajadas
    const horaEntrada = form.querySelector('[name="horaEntrada"]').value;
    const horaSalida = form.querySelector('[name="horaSalida"]').value;
    const horaComidaInicio = form.querySelector('[name="horaComidaInicio"]').value;
    const horaComidaFin = form.querySelector('[name="horaComidaFin"]').value;
    const horasReales = calcularHorasReales(horaEntrada, horaSalida, horaComidaInicio, horaComidaFin);

    // Obtener valores de salario
    const salarioSemanal = parseFloat(form.querySelector('[name="salarioSemanal"]').value) || 0;
    const premioPuntualidad = parseFloat(form.querySelector('[name="premioPuntualidad"]').value) || 0;
    const premioProduccion = parseFloat(form.querySelector('[name="premioProduccion"]').value) || 0;
    const sueldoBruto = salarioSemanal + premioPuntualidad + premioProduccion;
    const previsionSocial = sueldoBruto * 0.40;
    const sueldoNetoSemanal = sueldoBruto + previsionSocial;
    const sueldoNetoDiario = sueldoNetoSemanal / 5;
    const sueldoPorHora = horasReales > 0 ? sueldoNetoDiario / horasReales : 0;

    const sinHoraComida = form.querySelector('[name="sinHoraComida"]')?.checked || false;

    const updates = {
        nombre: form.querySelector('[name="nombre"]').value,
        rol: form.querySelector('[name="rol"]').value,
        areaId: form.querySelector('[name="areaId"]')?.value ? parseInt(form.querySelector('[name="areaId"]').value) : null,
        // Horarios
        horaEntrada: horaEntrada,
        horaSalida: horaSalida,
        sinHoraComida: sinHoraComida,
        horaComidaInicio: sinHoraComida ? null : (horaComidaInicio || null),
        horaComidaFin: sinHoraComida ? null : (horaComidaFin || null),
        horasRealesDia: horasReales,
        // Salario
        salarioSemanal: salarioSemanal,
        premioPuntualidad: premioPuntualidad,
        premioProduccion: premioProduccion,
        sueldoBruto: sueldoBruto,
        previsionSocial: previsionSocial,
        sueldoNetoSemanal: sueldoNetoSemanal,
        sueldoNetoDiario: sueldoNetoDiario,
        salarioHora: sueldoPorHora,
        // Posiciones
        posiciones: posiciones,
        // Credenciales
        numEmpleado: form.querySelector('[name="numEmpleado"]')?.value || '',
        pin: form.querySelector('[name="pin"]')?.value || '',
        bloqueado: form.querySelector('[name="bloqueado"]')?.checked || false,
        // Permisos
        permisos: permisos
    };

    // Obtener posiciones anteriores para desasignar
    const empleadoAnterior = db.getEmpleado(id);
    const posicionesAnteriores = empleadoAnterior.posiciones || [];

    // Desasignar posiciones que ya no están seleccionadas
    posicionesAnteriores.forEach(posId => {
        if (!posiciones.includes(posId)) {
            db.asignarOperadorAEstacion(posId, null);
            // Eliminar del estado de operadores
            eliminarEstadoOperadorDeMapa(posId);
        }
    });

    // Asignar nuevas posiciones
    posiciones.forEach(posId => {
        const estacion = db.getEstacion(posId);
        if (estacion) {
            // Asignar solo si no estaba asignado a este empleado
            if (estacion.operadorId !== id) {
                db.asignarOperadorAEstacion(posId, id);
            }
            // Siempre crear/actualizar el estado en el mapa
            crearEstadoOperadorEnMapa({ id: id, nombre: updates.nombre }, posId);
        }
    });

    // Actualizar empleado
    db.updateEmpleado(id, updates);

    // Sincronizar con paneles
    if (typeof sincronizarOperadorasParaLogin === 'function') {
        sincronizarOperadorasParaLogin();
    }
    sincronizarEstacionesConPaneles();

    // Recargar mapa de planta si está visible
    if (typeof loadPlantMap === 'function') {
        loadPlantMap();
    }

    closeModal();
    loadPersonal();
    showToast('Empleado actualizado correctamente', 'success');
}

// Funciones auxiliares para el formulario de edición
function toggleAreaFieldEdit(rol) {
    const areaField = document.getElementById('areaFieldEdit');
    if (areaField) {
        areaField.style.display = (rol === 'administrador') ? 'none' : 'block';
    }
}

function toggleCredencialesSectionEdit(rol) {
    const credencialesSection = document.getElementById('credencialesSectionEdit');
    const permisosSection = document.getElementById('permisosSectionEdit');
    const posicionesField = document.getElementById('posicionesFieldEdit');

    if (credencialesSection) {
        credencialesSection.style.display = (rol === 'operador' || rol === 'supervisora') ? 'block' : 'none';
    }
    if (permisosSection) {
        permisosSection.style.display = (rol === 'operador' || rol === 'supervisora') ? 'block' : 'none';
    }
    if (posicionesField) {
        posicionesField.style.display = (rol === 'operador') ? 'block' : 'none';
    }
}

function regenerarPINEdit() {
    const pinInput = document.querySelector('#editarEmpleadoForm [name="pin"]');
    if (pinInput) {
        pinInput.value = generarPINAleatorio(4);
    }
}

function calcularSueldosEdit() {
    const form = document.getElementById('editarEmpleadoForm');
    if (!form) return;

    // Obtener horarios
    const horaEntrada = form.querySelector('[name="horaEntrada"]')?.value;
    const horaSalida = form.querySelector('[name="horaSalida"]')?.value;
    const horaComidaInicio = form.querySelector('[name="horaComidaInicio"]')?.value;
    const horaComidaFin = form.querySelector('[name="horaComidaFin"]')?.value;

    // Calcular horas reales
    const horasReales = calcularHorasReales(horaEntrada, horaSalida, horaComidaInicio, horaComidaFin);

    // Actualizar display de horas
    const horasRealesDiaEl = document.getElementById('horasRealesDiaEdit');
    const horasCalculoEl = document.getElementById('horasCalculoEdit');
    if (horasRealesDiaEl) horasRealesDiaEl.textContent = horasReales.toFixed(1);
    if (horasCalculoEl) horasCalculoEl.textContent = horasReales.toFixed(1);

    // Obtener valores de salario
    const salarioSemanal = parseFloat(form.querySelector('[name="salarioSemanal"]')?.value) || 0;
    const premioPuntualidad = parseFloat(form.querySelector('[name="premioPuntualidad"]')?.value) || 0;
    const premioProduccion = parseFloat(form.querySelector('[name="premioProduccion"]')?.value) || 0;

    // Calcular sueldo bruto
    const sueldoBruto = salarioSemanal + premioPuntualidad + premioProduccion;

    // Calcular previsión social automáticamente (40% del bruto)
    const previsionSocial = sueldoBruto * 0.40;

    // Actualizar campo de previsión social
    const previsionInput = form.querySelector('[name="previsionSocial"]');
    if (previsionInput) {
        previsionInput.value = previsionSocial.toFixed(2);
    }

    // Calcular sueldo neto
    const sueldoNetoSemanal = sueldoBruto + previsionSocial;
    const sueldoNetoDiario = sueldoNetoSemanal / 5;
    const sueldoPorHora = horasReales > 0 ? sueldoNetoDiario / horasReales : 0;

    // Actualizar displays
    const formatMoney = (num) => num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const sueldoBrutoEl = document.getElementById('sueldoBrutoEdit');
    const sueldoNetoSemanalEl = document.getElementById('sueldoNetoSemanalEdit');
    const sueldoNetoDiarioEl = document.getElementById('sueldoNetoDiarioEdit');
    const sueldoPorHoraEl = document.getElementById('sueldoPorHoraEdit');

    if (sueldoBrutoEl) sueldoBrutoEl.textContent = formatMoney(sueldoBruto);
    if (sueldoNetoSemanalEl) sueldoNetoSemanalEl.textContent = '$' + formatMoney(sueldoNetoSemanal);
    if (sueldoNetoDiarioEl) sueldoNetoDiarioEl.textContent = '$' + formatMoney(sueldoNetoDiario);
    if (sueldoPorHoraEl) sueldoPorHoraEl.textContent = '$' + formatMoney(sueldoPorHora);
}

// Exponer funciones de edición de empleados globalmente
window.editEmpleado = editEmpleado;
window.guardarEdicionEmpleado = guardarEdicionEmpleado;
window.toggleAreaFieldEdit = toggleAreaFieldEdit;
window.toggleCredencialesSectionEdit = toggleCredencialesSectionEdit;
window.regenerarPINEdit = regenerarPINEdit;
window.calcularSueldosEdit = calcularSueldosEdit;

function toggleEmpleado(id) {
    // Función legacy - redirigir a la nueva
    toggleEmpleadoEstado(id);
}

// ========================================
// COSTEO
// ========================================
function loadCosteo() {
    const section = document.getElementById('section-costeo');
    const materiales = db.getMateriales();

    section.innerHTML = `
        <div class="section-header">
            <h1>Costeo de Producción</h1>
            <button class="btn btn-primary" onclick="showNuevoMaterialModal()">
                <i class="fas fa-plus"></i> Nuevo Material
            </button>
        </div>

        <div class="tabs">
            <button class="tab active" data-tab="materiales">Materiales</button>
            <button class="tab" data-tab="manoObra">Mano de Obra</button>
            <button class="tab" data-tab="reporteCosto">Reporte de Costos</button>
        </div>

        <div id="costeoContent">
            <div class="orders-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Unidad</th>
                            <th>Costo</th>
                            <th>Proveedor</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materiales.map(mat => `
                            <tr>
                                <td><strong>${mat.nombre}</strong></td>
                                <td>${mat.unidad}</td>
                                <td>$${mat.costo.toFixed(2)}</td>
                                <td>${mat.proveedor}</td>
                                <td>
                                    <button class="btn-icon-small" onclick="editMaterial(${mat.id})"><i class="fas fa-edit"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    section.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            section.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadCosteoTab(tab.dataset.tab);
        });
    });
}

function loadCosteoTab(tab) {
    const content = document.getElementById('costeoContent');

    switch(tab) {
        case 'materiales':
            loadCosteo();
            break;
        case 'manoObra':
            content.innerHTML = `
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-info">
                            <span class="kpi-label">Costo Promedio/Hora (Operadores)</span>
                            <span class="kpi-value">$52.50</span>
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-info">
                            <span class="kpi-label">Costo Promedio/Hora (Supervisoras)</span>
                            <span class="kpi-value">$80.00</span>
                        </div>
                    </div>
                </div>
                <div class="orders-table-container mt-2">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Rol</th>
                                <th>Área</th>
                                <th>Salario/Hora</th>
                                <th>Costo/Hora (con cargas)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${db.getPersonal().filter(e => e.activo).map(emp => {
                                const area = db.getArea(emp.areaId);
                                const costoConCargas = emp.salarioHora * 1.35; // Factor de cargas sociales
                                return `
                                    <tr>
                                        <td>${emp.nombre}</td>
                                        <td>${capitalizeFirst(emp.rol)}</td>
                                        <td>${area ? area.nombre : 'Todas'}</td>
                                        <td>$${emp.salarioHora.toFixed(2)}</td>
                                        <td>$${costoConCargas.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            break;
        case 'reporteCosto':
            const productos = db.getProductos();
            content.innerHTML = `
                <h3 class="mb-2">Costo por Producto</h3>
                <div class="orders-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cliente</th>
                                <th>Costo Material</th>
                                <th>Costo MOD</th>
                                <th>Costo Total/Pza</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productos.map(prod => {
                                const cliente = db.getCliente(prod.clienteId);
                                const bom = db.getBOM(prod.id);
                                let costoMaterial = 0;
                                bom.forEach(b => {
                                    const mat = db.getMaterial(b.materialId);
                                    if (mat) costoMaterial += mat.costo * b.cantidad;
                                });
                                const costoMOD = prod.tiempoTotal * (52.50 / 60); // Costo promedio por minuto
                                return `
                                    <tr>
                                        <td>${prod.nombre}</td>
                                        <td>${cliente?.nombreComercial || 'N/A'}</td>
                                        <td>$${costoMaterial.toFixed(2)}</td>
                                        <td>$${costoMOD.toFixed(2)}</td>
                                        <td><strong>$${(costoMaterial + costoMOD).toFixed(2)}</strong></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            break;
    }
}

function showNuevoMaterialModal() {
    const content = `
        <form id="nuevoMaterialForm">
            <div class="form-group">
                <label>Nombre del Material *</label>
                <input type="text" name="nombre" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Unidad *</label>
                    <select name="unidad" required>
                        <option value="metro">Metro</option>
                        <option value="pieza">Pieza</option>
                        <option value="rollo">Rollo</option>
                        <option value="kg">Kilogramo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Costo por Unidad *</label>
                    <input type="number" name="costo" step="0.01" required>
                </div>
            </div>
            <div class="form-group">
                <label>Proveedor</label>
                <input type="text" name="proveedor">
            </div>
        </form>
    `;

    openModal('Nuevo Material', content, () => {
        const form = document.getElementById('nuevoMaterialForm');
        const material = {
            nombre: form.querySelector('[name="nombre"]').value,
            unidad: form.querySelector('[name="unidad"]').value,
            costo: parseFloat(form.querySelector('[name="costo"]').value),
            proveedor: form.querySelector('[name="proveedor"]').value || ''
        };

        db.addMaterial(material);
        loadCosteo();
    });
}

function editMaterial(id) {
    alert('Edición de material en desarrollo');
}

// ========================================
// REPORTES
// ========================================
function loadReportes() {
    const section = document.getElementById('section-reportes');

    section.innerHTML = `
        <div class="section-header">
            <h1>Reportes y Analítica</h1>
            <select id="reportPeriod" style="padding:8px 15px; border-radius:var(--radius-md)" onchange="onReportPeriodChange()">
                <option value="hoy">Hoy</option>
                <option value="semana" selected>Esta Semana</option>
                <option value="quincena">Últimos 15 días</option>
                <option value="mes">Este Mes</option>
                <option value="historico">Histórico (Todo)</option>
            </select>
        </div>

        <div class="tabs reportes-tabs">
            <button class="tab active" data-report="operador">Por Operador</button>
            <button class="tab" data-report="proceso-producto">Proceso-Producto</button>
            <button class="tab" data-report="tiempos">Tiempos Productivos</button>
            <button class="tab" data-report="calidad">Control Calidad</button>
            <button class="tab" data-report="costos">Costos</button>
            <button class="tab" data-report="comparativo">Comparativo Semanal</button>
            <button class="tab" data-report="cliente-articulo">Cliente/Artículo</button>
        </div>

        <div id="reportContent">
            <!-- Contenido se carga dinámicamente -->
        </div>
    `;

    // Cargar reporte por defecto
    loadReporteOperador();

    section.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            section.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const reportType = tab.dataset.report;
            switch(reportType) {
                case 'operador':
                    loadReporteOperador();
                    break;
                case 'proceso-producto':
                    loadReporteProcesoProducto();
                    break;
                case 'tiempos':
                    loadReporteTiempos();
                    break;
                case 'calidad':
                    loadReporteCalidad();
                    break;
                case 'costos':
                    loadReporteCostos();
                    break;
                case 'comparativo':
                    loadReporteComparativo();
                    break;
                case 'cliente-articulo':
                    loadReporteClienteArticulo();
                    break;
            }
        });
    });
}

// Reporte: Producción por Operador - MEJORADO CON DESGLOSE
function loadReporteOperador() {
    const container = document.getElementById('reportContent');
    const personal = db.getPersonal().filter(p => p.rol === 'operador' && p.activo);
    const estadoOps = db.getEstadoOperadores();
    const areas = db.getAreas();
    const productos = db.getProductos();
    const estaciones = db.getEstaciones();

    // Obtener datos reales de producción
    const historialProduccion = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
    const asignacionesEstaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');

    // Filtrar pedidos por periodo seleccionado
    const todosPedidos = filtrarPedidosActivos(db.getPedidos());
    const pedidos = filtrarPorPeriodo(todosPedidos, 'fechaCarga');
    const labelPeriodo = getLabelPeriodo();

    // Obtener rango de fechas del periodo
    const periodoSeleccionado = document.getElementById('periodoReporte')?.value || 'hoy';
    const ahora = new Date();
    let fechaInicio = new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    switch (periodoSeleccionado) {
        case 'semana':
            fechaInicio.setDate(fechaInicio.getDate() - 7);
            break;
        case 'mes':
            fechaInicio.setMonth(fechaInicio.getMonth() - 1);
            break;
        case 'trimestre':
            fechaInicio.setMonth(fechaInicio.getMonth() - 3);
            break;
    }

    // Generar datos detallados por operador basados en DATOS REALES
    const datosOperadores = personal.map(op => {
        const estado = estadoOps.find(e => e.operadorId === op.id);
        const area = areas.find(a => a.id === op.areaId);

        // Encontrar estación(es) asignada(s) a este operador
        const estacionesOperador = estaciones.filter(e => e.operadorId === op.id);
        const estacionIds = estacionesOperador.map(e => e.id);

        // Filtrar historial de producción solo para este operador en el periodo
        const historialOperador = historialProduccion.filter(h => {
            // Verificar que pertenece a este operador
            const esDeOperador = h.operadoraId == op.id ||
                                 (h.estacionId && estacionIds.includes(h.estacionId));
            if (!esDeOperador) return false;

            // Verificar que es del tipo captura (no descansos u otros)
            if (h.tipo && h.tipo !== 'captura_operadora') return false;

            // Verificar que está dentro del periodo
            if (h.fecha) {
                const fechaRegistro = new Date(h.fecha);
                return fechaRegistro >= fechaInicio && fechaRegistro <= ahora;
            }
            return true;
        });

        // Obtener asignaciones actuales del operador desde asignaciones_estaciones
        const asignacionesOperador = [];
        estacionIds.forEach(estacionId => {
            const asignacion = asignacionesEstaciones[estacionId];
            if (asignacion) {
                asignacionesOperador.push({
                    estacionId,
                    ...asignacion
                });
            }
        });

        // Agrupar historial por proceso para obtener procesosRealizados
        const procesosPorClave = {};
        historialOperador.forEach(h => {
            if (!h.procesoNombre || !h.cantidad) return;

            const clave = `${h.pedidoId}-${h.procesoId || h.procesoNombre}`;
            if (!procesosPorClave[clave]) {
                // Buscar el pedido para obtener información del producto
                const pedido = pedidosERP.find(p => p.id == h.pedidoId) ||
                              pedidos.find(p => p.id == h.pedidoId);
                const productoInfo = pedido?.productos?.[0];
                const producto = productoInfo ? productos.find(p => p.id == productoInfo.productoId) : null;

                // Buscar tiempo estimado del proceso
                let tiempoEstimado = 5;
                if (producto && producto.rutaProcesos) {
                    const procesoRuta = producto.rutaProcesos.find(rp =>
                        rp.nombre && rp.nombre.toLowerCase() === (h.procesoNombre || '').toLowerCase()
                    );
                    if (procesoRuta) {
                        tiempoEstimado = procesoRuta.tiempoEstandar || procesoRuta.tiempoEstimado || 5;
                    }
                }

                procesosPorClave[clave] = {
                    pedidoId: h.pedidoId,
                    procesoId: h.procesoId,
                    procesoNombre: h.procesoNombre,
                    productoNombre: producto?.nombre || h.productoNombre || 'Producto',
                    piezasRealizadas: 0,
                    tiempoEstimado: tiempoEstimado,
                    meta: h.meta || 100
                };
            }
            procesosPorClave[clave].piezasRealizadas += h.cantidad || 0;
        });

        // Agregar asignaciones actuales que no estén en el historial
        asignacionesOperador.forEach(asig => {
            if (asig.procesoNombre && asig.pedidoId) {
                const clave = `${asig.pedidoId}-${asig.procesoId || asig.procesoNombre}`;
                if (!procesosPorClave[clave]) {
                    const pedido = pedidosERP.find(p => p.id == asig.pedidoId) ||
                                  pedidos.find(p => p.id == asig.pedidoId);
                    const productoInfo = pedido?.productos?.[0];
                    const producto = productoInfo ? productos.find(p => p.id == productoInfo.productoId) : null;

                    procesosPorClave[clave] = {
                        pedidoId: asig.pedidoId,
                        procesoId: asig.procesoId,
                        procesoNombre: asig.procesoNombre,
                        productoNombre: producto?.nombre || 'Producto',
                        piezasRealizadas: 0,
                        tiempoEstimado: 5,
                        meta: asig.meta || asig.cantidadMeta || 100
                    };
                }
                // Actualizar meta si está disponible
                if (asig.meta || asig.cantidadMeta) {
                    procesosPorClave[clave].meta = asig.meta || asig.cantidadMeta;
                }
            }
        });

        // Convertir a arrays
        const procesosRealizados = Object.values(procesosPorClave).map(proc => {
            const metaProceso = proc.meta || Math.floor(60 / proc.tiempoEstimado) * 8;
            const rendimiento = metaProceso > 0 ? Math.round((proc.piezasRealizadas / metaProceso) * 100) : 0;
            return {
                ...proc,
                metaProceso,
                rendimiento
            };
        });

        // Agrupar por producto
        const productosPorId = {};
        procesosRealizados.forEach(proc => {
            const pedido = pedidosERP.find(p => p.id == proc.pedidoId) ||
                          pedidos.find(p => p.id == proc.pedidoId);
            const productoInfo = pedido?.productos?.[0];
            const productoId = productoInfo?.productoId || 0;

            if (!productosPorId[`${proc.pedidoId}-${productoId}`]) {
                productosPorId[`${proc.pedidoId}-${productoId}`] = {
                    productoId,
                    nombre: proc.productoNombre,
                    pedidoId: proc.pedidoId,
                    piezasRealizadas: 0,
                    metaAsignada: 0
                };
            }
            productosPorId[`${proc.pedidoId}-${productoId}`].piezasRealizadas += proc.piezasRealizadas;
            productosPorId[`${proc.pedidoId}-${productoId}`].metaAsignada += proc.metaProceso;
        });

        const productosAsignados = Object.values(productosPorId).map(prod => ({
            ...prod,
            rendimiento: prod.metaAsignada > 0 ? Math.round((prod.piezasRealizadas / prod.metaAsignada) * 100) : 0
        }));

        // Calcular totales
        const piezasHoy = procesosRealizados.reduce((sum, p) => sum + p.piezasRealizadas, 0);
        const metaDiaria = procesosRealizados.reduce((sum, p) => sum + p.metaProceso, 0) || 120;
        const efectividad = estado ? estado.efectividad : (piezasHoy > 0 ? Math.round((piezasHoy / metaDiaria) * 100) : 0);

        // Calcular promedio de rendimiento por productos
        const promedioProductos = productosAsignados.length > 0
            ? Math.round(productosAsignados.reduce((sum, p) => sum + p.rendimiento, 0) / productosAsignados.length)
            : 0;

        // Calcular promedio de rendimiento por procesos
        const promedioProcesos = procesosRealizados.length > 0
            ? Math.round(procesosRealizados.reduce((sum, p) => sum + p.rendimiento, 0) / procesosRealizados.length)
            : 0;

        // Promedio general (solo considera métricas con datos)
        let metricas = [];
        if (efectividad > 0) metricas.push(efectividad);
        if (promedioProductos > 0) metricas.push(promedioProductos);
        if (promedioProcesos > 0) metricas.push(promedioProcesos);
        const promedioGeneral = metricas.length > 0
            ? Math.round(metricas.reduce((a, b) => a + b, 0) / metricas.length)
            : 0;

        return {
            ...op,
            area: area ? area.nombre : 'Sin asignar',
            piezasHoy,
            metaDiaria,
            efectividad,
            cumplimiento: metaDiaria > 0 ? Math.round((piezasHoy / metaDiaria) * 100) : 0,
            productosAsignados,
            procesosRealizados,
            promedioProductos,
            promedioProcesos,
            promedioGeneral
        };
    });

    // Ordenar por promedio general
    datosOperadores.sort((a, b) => b.promedioGeneral - a.promedioGeneral);

    const totalPiezas = datosOperadores.reduce((sum, o) => sum + o.piezasHoy, 0);
    const efectividadPromedio = datosOperadores.length > 0
        ? Math.round(datosOperadores.reduce((sum, o) => sum + o.efectividad, 0) / datosOperadores.length)
        : 0;
    const promedioGeneralGlobal = datosOperadores.length > 0
        ? Math.round(datosOperadores.reduce((sum, o) => sum + o.promedioGeneral, 0) / datosOperadores.length)
        : 0;

    container.innerHTML = `
        <div class="report-header-actions">
            <span class="periodo-badge">
                <i class="fas fa-calendar-alt"></i> ${labelPeriodo}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="exportReporteOperadoresCompleto()">
                <i class="fas fa-file-excel"></i> Exportar Completo
            </button>
            <button class="btn btn-primary btn-sm" onclick="exportReporteOperadores()">
                <i class="fas fa-file-excel"></i> Exportar Resumen
            </button>
        </div>

        <div class="kpi-grid mb-2" style="grid-template-columns: repeat(4, 1fr);">
            <div class="kpi-card">
                <div class="kpi-icon blue"><i class="fas fa-users"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${datosOperadores.length}</span>
                    <span class="kpi-label">Operadores Activos</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon green"><i class="fas fa-box"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${totalPiezas.toLocaleString()}</span>
                    <span class="kpi-label">Piezas (${labelPeriodo})</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon orange"><i class="fas fa-percentage"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${efectividadPromedio}%</span>
                    <span class="kpi-label">Efectividad Promedio</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon purple"><i class="fas fa-chart-line"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${promedioGeneralGlobal}%</span>
                    <span class="kpi-label">Rendimiento General</span>
                </div>
            </div>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="tablaReporteOperadores">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Operador</th>
                        <th>Área</th>
                        <th>Piezas Hoy</th>
                        <th>Cumplimiento</th>
                        <th>Rend. Productos</th>
                        <th>Rend. Procesos</th>
                        <th>Promedio General</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${datosOperadores.map((op, i) => `
                        <tr class="${op.promedioGeneral >= 100 ? 'row-success' : op.promedioGeneral >= 80 ? '' : 'row-warning'}">
                            <td>${i + 1}</td>
                            <td>
                                <strong>${op.nombre}</strong>
                                <br><small class="text-muted">${op.horaEntrada} - ${op.horaSalida}</small>
                            </td>
                            <td>${op.area}</td>
                            <td>
                                <strong>${op.piezasHoy}</strong>
                                <small class="text-muted">/ ${op.metaDiaria}</small>
                            </td>
                            <td>
                                <div class="progress-bar-small">
                                    <div class="progress ${op.cumplimiento >= 100 ? 'green' : op.cumplimiento >= 80 ? 'yellow' : 'red'}" style="width:${Math.min(op.cumplimiento, 100)}%"></div>
                                </div>
                                <span class="text-small">${op.cumplimiento}%</span>
                            </td>
                            <td>
                                <span class="status-badge ${op.promedioProductos >= 100 ? 'success' : op.promedioProductos >= 80 ? 'warning' : 'danger'}">
                                    ${op.promedioProductos}%
                                </span>
                                <small class="text-muted d-block">${op.productosAsignados.length} productos</small>
                            </td>
                            <td>
                                <span class="status-badge ${op.promedioProcesos >= 100 ? 'success' : op.promedioProcesos >= 80 ? 'warning' : 'danger'}">
                                    ${op.promedioProcesos}%
                                </span>
                                <small class="text-muted d-block">${op.procesosRealizados.length} procesos</small>
                            </td>
                            <td>
                                <span class="promedio-general-badge ${op.promedioGeneral >= 100 ? 'excelente' : op.promedioGeneral >= 90 ? 'bueno' : op.promedioGeneral >= 80 ? 'regular' : 'bajo'}">
                                    ${op.promedioGeneral}%
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-icon" onclick="verDetalleOperadorReporte(${op.id})" title="Ver desglose">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <style>
            .promedio-general-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 0.9rem;
            }
            .promedio-general-badge.excelente { background: #d1fae5; color: #059669; }
            .promedio-general-badge.bueno { background: #dbeafe; color: #2563eb; }
            .promedio-general-badge.regular { background: #fef3c7; color: #d97706; }
            .promedio-general-badge.bajo { background: #fee2e2; color: #dc2626; }
            .row-success { background: #f0fdf4 !important; }
            .row-warning { background: #fffbeb !important; }
            .kpi-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
        </style>
    `;

    // Guardar datos para exportación y detalle
    window.datosOperadoresReporte = datosOperadores;
}

// Ver detalle completo de un operador
function verDetalleOperadorReporte(operadorId) {
    const operador = window.datosOperadoresReporte?.find(o => o.id === operadorId);
    if (!operador) return;

    const content = `
        <div class="operador-detalle-reporte">
            <!-- Header del operador -->
            <div class="operador-header-detalle" style="display: flex; gap: 20px; align-items: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid var(--border-color);">
                <div class="operador-avatar" style="width: 70px; height: 70px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.8rem; font-weight: 700;">
                    ${operador.nombre.charAt(0)}
                </div>
                <div>
                    <h3 style="margin: 0;">${operador.nombre}</h3>
                    <p style="margin: 5px 0; color: var(--text-muted);">${operador.area} • ${operador.horaEntrada} - ${operador.horaSalida}</p>
                </div>
                <div style="margin-left: auto; text-align: right;">
                    <div class="promedio-general-badge ${operador.promedioGeneral >= 100 ? 'excelente' : operador.promedioGeneral >= 90 ? 'bueno' : operador.promedioGeneral >= 80 ? 'regular' : 'bajo'}" style="font-size: 1.5rem; padding: 10px 20px;">
                        ${operador.promedioGeneral}%
                    </div>
                    <small style="color: var(--text-muted);">Promedio General</small>
                </div>
            </div>

            <!-- KPIs del operador -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                <div class="mini-kpi" style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">${operador.piezasHoy}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Piezas Hoy</div>
                </div>
                <div class="mini-kpi" style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">${operador.cumplimiento}%</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Cumplimiento</div>
                </div>
                <div class="mini-kpi" style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;">${operador.promedioProductos}%</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Rend. Productos</div>
                </div>
                <div class="mini-kpi" style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #8b5cf6;">${operador.promedioProcesos}%</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Rend. Procesos</div>
                </div>
            </div>

            <!-- Desglose por Producto -->
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-box" style="color: #f59e0b;"></i> Rendimiento por Producto
                </h4>
                ${operador.productosAsignados.length > 0 ? `
                    <table class="data-table" style="font-size: 0.9rem;">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Pedido</th>
                                <th>Piezas</th>
                                <th>Meta</th>
                                <th>Rendimiento</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${operador.productosAsignados.map(prod => `
                                <tr>
                                    <td><strong>${prod.nombre}</strong></td>
                                    <td>#${prod.pedidoId}</td>
                                    <td>${prod.piezasRealizadas}</td>
                                    <td>${prod.metaAsignada}</td>
                                    <td>
                                        <span class="status-badge ${prod.rendimiento >= 100 ? 'success' : prod.rendimiento >= 80 ? 'warning' : 'danger'}">
                                            ${prod.rendimiento}%
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="text-muted">No hay productos asignados</p>'}
            </div>

            <!-- Desglose por Proceso -->
            <div>
                <h4 style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-cogs" style="color: #8b5cf6;"></i> Rendimiento por Proceso
                </h4>
                ${operador.procesosRealizados.length > 0 ? `
                    <table class="data-table" style="font-size: 0.9rem;">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Proceso</th>
                                <th>Piezas</th>
                                <th>Meta</th>
                                <th>Tiempo Est.</th>
                                <th>Rendimiento</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${operador.procesosRealizados.map(proc => `
                                <tr>
                                    <td>${proc.productoNombre}</td>
                                    <td><strong>${proc.procesoNombre}</strong></td>
                                    <td>${proc.piezasRealizadas}</td>
                                    <td>${proc.metaProceso}</td>
                                    <td>${proc.tiempoEstimado} min</td>
                                    <td>
                                        <span class="status-badge ${proc.rendimiento >= 100 ? 'success' : proc.rendimiento >= 80 ? 'warning' : 'danger'}">
                                            ${proc.rendimiento}%
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="text-muted">No hay procesos realizados</p>'}
            </div>
        </div>
    `;

    openModal(`Reporte Detallado - ${operador.nombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Exportar reporte completo de operadores con desglose
function exportReporteOperadoresCompleto() {
    const datos = window.datosOperadoresReporte;
    if (!datos || datos.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
    }

    // Crear múltiples hojas
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen de Operadores
    const resumenData = datos.map((op, i) => ({
        '#': i + 1,
        'Operador': op.nombre,
        'Área': op.area,
        'Horario': `${op.horaEntrada} - ${op.horaSalida}`,
        'Piezas Hoy': op.piezasHoy,
        'Meta Diaria': op.metaDiaria,
        'Cumplimiento %': op.cumplimiento,
        'Rend. Productos %': op.promedioProductos,
        'Rend. Procesos %': op.promedioProcesos,
        'Promedio General %': op.promedioGeneral
    }));

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Operadores');

    // Hoja 2: Desglose por Producto
    const productosData = [];
    datos.forEach(op => {
        op.productosAsignados.forEach(prod => {
            productosData.push({
                'Operador': op.nombre,
                'Producto': prod.nombre,
                'Pedido': `#${prod.pedidoId}`,
                'Piezas Realizadas': prod.piezasRealizadas,
                'Meta Asignada': prod.metaAsignada,
                'Rendimiento %': prod.rendimiento
            });
        });
    });

    if (productosData.length > 0) {
        const wsProductos = XLSX.utils.json_to_sheet(productosData);
        XLSX.utils.book_append_sheet(wb, wsProductos, 'Por Producto');
    }

    // Hoja 3: Desglose por Proceso
    const procesosData = [];
    datos.forEach(op => {
        op.procesosRealizados.forEach(proc => {
            procesosData.push({
                'Operador': op.nombre,
                'Producto': proc.productoNombre,
                'Proceso': proc.procesoNombre,
                'Piezas Realizadas': proc.piezasRealizadas,
                'Meta': proc.metaProceso,
                'Tiempo Est. (min)': proc.tiempoEstimado,
                'Rendimiento %': proc.rendimiento
            });
        });
    });

    if (procesosData.length > 0) {
        const wsProcesos = XLSX.utils.json_to_sheet(procesosData);
        XLSX.utils.book_append_sheet(wb, wsProcesos, 'Por Proceso');
    }

    // Descargar
    XLSX.writeFile(wb, `reporte_operadores_completo_${formatDateForFile(new Date())}.xlsx`);
    showToast('Reporte completo exportado con 3 hojas', 'success');
}

// Reporte: Producción por Proceso-Producto
function loadReporteProcesoProducto() {
    const container = document.getElementById('reportContent');
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const labelPeriodo = getLabelPeriodo();

    container.innerHTML = `
        <div class="report-header-actions" style="margin-bottom: 15px;">
            <span class="periodo-badge">
                <i class="fas fa-calendar-alt"></i> ${labelPeriodo}
            </span>
        </div>
        <div class="form-group" style="max-width:300px; margin-bottom:20px">
            <select id="reporteProductoSelect" onchange="loadDetalleProcesoProducto(this.value)">
                <option value="">Seleccionar producto...</option>
                ${productos.map(p => {
                    const cliente = clientes.find(c => c.id === p.clienteId);
                    return `<option value="${p.id}">${p.nombre} (${cliente ? cliente.nombreComercial : 'N/A'})</option>`;
                }).join('')}
            </select>
        </div>
        <div id="detalleProcesoProducto">
            <p class="text-muted text-center">Seleccione un producto para ver la producción por proceso</p>
        </div>
    `;
}

function loadDetalleProcesoProducto(productoId) {
    const container = document.getElementById('detalleProcesoProducto');
    if (!productoId) {
        container.innerHTML = '<p class="text-muted text-center">Seleccione un producto para ver la producción por proceso</p>';
        return;
    }

    const producto = db.getProducto(parseInt(productoId));
    if (!producto || !producto.rutaProcesos) return;

    const procesosData = producto.rutaProcesos.map(proceso => {
        const piezasCompletadas = Math.floor(Math.random() * 200) + 50;
        const metaDiaria = proceso.capacidadHora * 8;
        const tiempoReal = proceso.tiempoEstandar * (1 + (Math.random() * 0.3 - 0.15));

        return {
            ...proceso,
            piezasCompletadas,
            metaDiaria,
            tiempoReal: Math.round(tiempoReal * 100) / 100,
            eficiencia: Math.round((piezasCompletadas / metaDiaria) * 100),
            variacionTiempo: Math.round(((tiempoReal - proceso.tiempoEstandar) / proceso.tiempoEstandar) * 100)
        };
    });

    container.innerHTML = `
        <div class="report-header-actions">
            <button class="btn btn-secondary btn-sm" onclick="exportReporteToExcel('reporte_proceso_producto')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        </div>

        <div class="card mb-2">
            <h4>${producto.nombre}</h4>
            <p class="text-muted">${producto.medidas} | Tiempo total: ${producto.tiempoTotal} min/pza</p>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="tablaReporteProceso">
                <thead>
                    <tr>
                        <th>Orden</th>
                        <th>Proceso</th>
                        <th>Cap/Hora</th>
                        <th>T. Estándar</th>
                        <th>T. Real</th>
                        <th>Variación</th>
                        <th>Piezas Hoy</th>
                        <th>Eficiencia</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${procesosData.map(p => `
                        <tr>
                            <td>${p.orden}</td>
                            <td><strong>${p.nombre}</strong></td>
                            <td>${p.capacidadHora}</td>
                            <td>${p.tiempoEstandar} min</td>
                            <td>${p.tiempoReal} min</td>
                            <td>
                                <span class="${p.variacionTiempo > 0 ? 'text-danger' : 'text-success'}">
                                    ${p.variacionTiempo > 0 ? '+' : ''}${p.variacionTiempo}%
                                </span>
                            </td>
                            <td>${p.piezasCompletadas}</td>
                            <td>
                                <div class="progress-bar-small">
                                    <div class="progress ${p.eficiencia >= 90 ? 'green' : p.eficiencia >= 70 ? 'yellow' : 'red'}" style="width:${Math.min(p.eficiencia, 100)}%"></div>
                                </div>
                                <span class="text-small">${p.eficiencia}%</span>
                            </td>
                            <td>
                                <span class="status-badge ${p.habilitado ? 'success' : 'warning'}">
                                    ${p.habilitado ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Reporte: Tiempos Productivos vs Total
function loadReporteTiempos() {
    const container = document.getElementById('reportContent');
    const personal = db.getPersonal().filter(p => p.rol === 'operador' && p.activo);
    const labelPeriodo = getLabelPeriodo();

    // Simular datos de tiempos
    const datosTiempos = personal.slice(0, 10).map(op => {
        const horasTotales = 8;
        const tiempoProductivo = Math.random() * 2 + 5.5; // 5.5 a 7.5 horas
        const tiempoPausas = Math.random() * 0.5 + 0.5; // 0.5 a 1 hora
        const tiempoSetup = Math.random() * 0.5 + 0.25; // 15 a 45 min
        const tiempoInactivo = horasTotales - tiempoProductivo - tiempoPausas - tiempoSetup;

        return {
            ...op,
            horasTotales,
            tiempoProductivo: Math.round(tiempoProductivo * 100) / 100,
            tiempoPausas: Math.round(tiempoPausas * 100) / 100,
            tiempoSetup: Math.round(tiempoSetup * 100) / 100,
            tiempoInactivo: Math.round(Math.max(tiempoInactivo, 0) * 100) / 100,
            utilizacion: Math.round((tiempoProductivo / horasTotales) * 100)
        };
    });

    const promedioUtilizacion = Math.round(datosTiempos.reduce((sum, d) => sum + d.utilizacion, 0) / datosTiempos.length);
    const totalProductivo = datosTiempos.reduce((sum, d) => sum + d.tiempoProductivo, 0);
    const totalPausas = datosTiempos.reduce((sum, d) => sum + d.tiempoPausas, 0);

    container.innerHTML = `
        <div class="report-header-actions">
            <span class="periodo-badge">
                <i class="fas fa-calendar-alt"></i> ${labelPeriodo}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="exportReporteToExcel('reporte_tiempos')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        </div>

        <div class="kpi-grid mb-2">
            <div class="kpi-card">
                <div class="kpi-icon green"><i class="fas fa-clock"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${promedioUtilizacion}%</span>
                    <span class="kpi-label">Utilización Promedio</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon blue"><i class="fas fa-play"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${Math.round(totalProductivo)}h</span>
                    <span class="kpi-label">Tiempo Productivo Total</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon orange"><i class="fas fa-pause"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${Math.round(totalPausas * 10) / 10}h</span>
                    <span class="kpi-label">Tiempo en Pausas</span>
                </div>
            </div>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="tablaReporteTiempos">
                <thead>
                    <tr>
                        <th>Operador</th>
                        <th>Hrs Totales</th>
                        <th>Productivo</th>
                        <th>Pausas</th>
                        <th>Setup</th>
                        <th>Inactivo</th>
                        <th>% Utilización</th>
                    </tr>
                </thead>
                <tbody>
                    ${datosTiempos.map(d => `
                        <tr>
                            <td><strong>${d.nombre}</strong></td>
                            <td>${d.horasTotales}h</td>
                            <td class="text-success">${d.tiempoProductivo}h</td>
                            <td class="text-warning">${d.tiempoPausas}h</td>
                            <td class="text-info">${d.tiempoSetup}h</td>
                            <td class="text-danger">${d.tiempoInactivo}h</td>
                            <td>
                                <div class="time-bar">
                                    <div class="time-segment productivo" style="width:${(d.tiempoProductivo/d.horasTotales)*100}%"></div>
                                    <div class="time-segment pausas" style="width:${(d.tiempoPausas/d.horasTotales)*100}%"></div>
                                    <div class="time-segment setup" style="width:${(d.tiempoSetup/d.horasTotales)*100}%"></div>
                                    <div class="time-segment inactivo" style="width:${(d.tiempoInactivo/d.horasTotales)*100}%"></div>
                                </div>
                                <span class="text-small">${d.utilizacion}%</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="card mt-2">
            <h4>Leyenda</h4>
            <div class="legend-tiempos">
                <span><span class="legend-dot productivo"></span> Productivo</span>
                <span><span class="legend-dot pausas"></span> Pausas</span>
                <span><span class="legend-dot setup"></span> Setup</span>
                <span><span class="legend-dot inactivo"></span> Inactivo</span>
            </div>
        </div>
    `;
}

// Reporte: Control de Calidad
function loadReporteCalidad() {
    const container = document.getElementById('reportContent');
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const labelPeriodo = getLabelPeriodo();

    // Simular datos de calidad
    const datosCalidad = productos.map(p => {
        const cliente = clientes.find(c => c.id === p.clienteId);
        const piezasRevisadas = Math.floor(Math.random() * 300) + 100;
        const piezasAprobadas = Math.floor(piezasRevisadas * (0.92 + Math.random() * 0.07));
        const piezasRechazadas = piezasRevisadas - piezasAprobadas;
        const defectosComunes = [
            { tipo: 'Costura irregular', cantidad: Math.floor(Math.random() * 5) },
            { tipo: 'Medida incorrecta', cantidad: Math.floor(Math.random() * 3) },
            { tipo: 'Manchas', cantidad: Math.floor(Math.random() * 2) },
            { tipo: 'Material dañado', cantidad: Math.floor(Math.random() * 2) }
        ].filter(d => d.cantidad > 0);

        return {
            producto: p.nombre,
            cliente: cliente ? cliente.nombreComercial : 'N/A',
            piezasRevisadas,
            piezasAprobadas,
            piezasRechazadas,
            tasaAprobacion: Math.round((piezasAprobadas / piezasRevisadas) * 1000) / 10,
            defectos: defectosComunes
        };
    });

    const totalRevisadas = datosCalidad.reduce((sum, d) => sum + d.piezasRevisadas, 0);
    const totalAprobadas = datosCalidad.reduce((sum, d) => sum + d.piezasAprobadas, 0);
    const tasaGlobal = Math.round((totalAprobadas / totalRevisadas) * 1000) / 10;

    container.innerHTML = `
        <div class="report-header-actions">
            <span class="periodo-badge">
                <i class="fas fa-calendar-alt"></i> ${labelPeriodo}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="exportReporteToExcel('reporte_calidad')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        </div>

        <div class="kpi-grid mb-2">
            <div class="kpi-card">
                <div class="kpi-icon blue"><i class="fas fa-search"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${totalRevisadas.toLocaleString()}</span>
                    <span class="kpi-label">Piezas Revisadas</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon green"><i class="fas fa-check-circle"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${totalAprobadas.toLocaleString()}</span>
                    <span class="kpi-label">Piezas Aprobadas</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon ${tasaGlobal >= 95 ? 'green' : tasaGlobal >= 90 ? 'orange' : 'red'}"><i class="fas fa-percentage"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${tasaGlobal}%</span>
                    <span class="kpi-label">Tasa de Calidad Global</span>
                </div>
            </div>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="tablaReporteCalidad">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cliente</th>
                        <th>Revisadas</th>
                        <th>Aprobadas</th>
                        <th>Rechazadas</th>
                        <th>Tasa Calidad</th>
                        <th>Defectos Comunes</th>
                    </tr>
                </thead>
                <tbody>
                    ${datosCalidad.map(d => `
                        <tr>
                            <td><strong>${d.producto}</strong></td>
                            <td>${d.cliente}</td>
                            <td>${d.piezasRevisadas}</td>
                            <td class="text-success">${d.piezasAprobadas}</td>
                            <td class="text-danger">${d.piezasRechazadas}</td>
                            <td>
                                <span class="status-badge ${d.tasaAprobacion >= 95 ? 'success' : d.tasaAprobacion >= 90 ? 'warning' : 'danger'}">
                                    ${d.tasaAprobacion}%
                                </span>
                            </td>
                            <td>
                                ${d.defectos.length > 0
                                    ? d.defectos.map(def => `<span class="tag-small">${def.tipo} (${def.cantidad})</span>`).join(' ')
                                    : '<span class="text-success">Sin defectos</span>'
                                }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Reporte: Análisis de Costo por Producto
function loadReporteCostos() {
    const container = document.getElementById('reportContent');
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const materiales = db.getMateriales();
    const labelPeriodo = getLabelPeriodo();

    container.innerHTML = `
        <div class="report-header-actions" style="margin-bottom: 15px;">
            <span class="periodo-badge">
                <i class="fas fa-calendar-alt"></i> ${labelPeriodo}
            </span>
        </div>
        <div class="form-group" style="max-width:300px; margin-bottom:20px">
            <select id="reporteCostoProductoSelect" onchange="loadDetalleCostoProducto(this.value)">
                <option value="">Seleccionar producto...</option>
                ${productos.map(p => {
                    const cliente = clientes.find(c => c.id === p.clienteId);
                    return `<option value="${p.id}">${p.nombre} (${cliente ? cliente.nombreComercial : 'N/A'})</option>`;
                }).join('')}
            </select>
        </div>
        <div id="detalleCostoProducto">
            <p class="text-muted text-center">Seleccione un producto para ver el análisis de costos detallado por proceso</p>
        </div>
    `;
}

function loadDetalleCostoProducto(productoId) {
    const container = document.getElementById('detalleCostoProducto');
    if (!productoId) {
        container.innerHTML = '<p class="text-muted text-center">Seleccione un producto para ver el análisis de costos detallado por proceso</p>';
        return;
    }

    const producto = db.getProducto(parseInt(productoId));
    const cliente = db.getCliente(producto.clienteId);
    const bom = db.getBOM(parseInt(productoId));
    const materiales = db.getMateriales();

    // Calcular costo de materiales
    let costoMateriales = 0;
    const detalleMateriales = bom.map(b => {
        const material = materiales.find(m => m.id === b.materialId);
        const costo = material ? material.costo * b.cantidad : 0;
        costoMateriales += costo;
        return {
            nombre: material ? material.nombre : 'N/A',
            cantidad: b.cantidad,
            unidad: b.unidad,
            costoUnitario: material ? material.costo : 0,
            costoTotal: Math.round(costo * 100) / 100
        };
    });

    // Calcular costo de mano de obra por proceso
    const salarioHoraPromedio = 50; // Salario promedio por hora
    const costosProcesos = producto.rutaProcesos.map(p => {
        const costoMO = (p.tiempoEstandar / 60) * salarioHoraPromedio;
        return {
            orden: p.orden,
            nombre: p.nombre,
            tiempoMin: p.tiempoEstandar,
            costoMO: Math.round(costoMO * 100) / 100
        };
    });

    const costoManoObra = costosProcesos.reduce((sum, p) => sum + p.costoMO, 0);
    const costoIndirecto = (costoMateriales + costoManoObra) * 0.15; // 15% indirectos
    const costoTotal = costoMateriales + costoManoObra + costoIndirecto;

    container.innerHTML = `
        <div class="report-header-actions">
            <button class="btn btn-secondary btn-sm" onclick="exportReporteToExcel('reporte_costos')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        </div>

        <div class="card mb-2">
            <h4>${producto.nombre}</h4>
            <p class="text-muted">${cliente ? cliente.nombreComercial : 'N/A'} | ${producto.medidas}</p>
        </div>

        <div class="kpi-grid mb-2">
            <div class="kpi-card">
                <div class="kpi-icon blue"><i class="fas fa-cubes"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">$${costoMateriales.toFixed(2)}</span>
                    <span class="kpi-label">Costo Materiales</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon orange"><i class="fas fa-user-clock"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">$${costoManoObra.toFixed(2)}</span>
                    <span class="kpi-label">Costo Mano de Obra</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon purple"><i class="fas fa-cog"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">$${costoIndirecto.toFixed(2)}</span>
                    <span class="kpi-label">Costos Indirectos (15%)</span>
                </div>
            </div>
            <div class="kpi-card highlight">
                <div class="kpi-icon green"><i class="fas fa-dollar-sign"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">$${costoTotal.toFixed(2)}</span>
                    <span class="kpi-label">Costo Total por Pieza</span>
                </div>
            </div>
        </div>

        <div class="cards-grid">
            <div class="card">
                <h4><i class="fas fa-cubes"></i> Desglose de Materiales</h4>
                <table class="data-table mt-1" id="tablaReporteCostosMat">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Cantidad</th>
                            <th>Costo Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detalleMateriales.map(m => `
                            <tr>
                                <td>${m.nombre}</td>
                                <td>${m.cantidad} ${m.unidad}</td>
                                <td>$${m.costoUnitario.toFixed(2)}</td>
                                <td><strong>$${m.costoTotal.toFixed(2)}</strong></td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="3"><strong>Total Materiales</strong></td>
                            <td><strong>$${costoMateriales.toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="card">
                <h4><i class="fas fa-user-clock"></i> Costo por Proceso (Mano de Obra)</h4>
                <table class="data-table mt-1">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Proceso</th>
                            <th>Tiempo</th>
                            <th>Costo MO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costosProcesos.map(p => `
                            <tr>
                                <td>${p.orden}</td>
                                <td>${p.nombre}</td>
                                <td>${p.tiempoMin} min</td>
                                <td><strong>$${p.costoMO.toFixed(2)}</strong></td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2"><strong>Total Mano de Obra</strong></td>
                            <td><strong>${producto.tiempoTotal} min</strong></td>
                            <td><strong>$${costoManoObra.toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Reporte: Comparativo Semanal de Producción
function loadReporteComparativo() {
    const container = document.getElementById('reportContent');
    const labelPeriodo = getLabelPeriodo();

    // Simular datos de las últimas 4 semanas
    const semanas = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
    const datosSemanales = semanas.map((sem, i) => {
        const base = 2000 + (i * 150);
        return {
            semana: sem,
            piezasProducidas: Math.floor(base + Math.random() * 500),
            piezasPlaneadas: Math.floor(base + 300),
            efectividad: Math.floor(80 + Math.random() * 20),
            calidadPorcentaje: Math.floor(92 + Math.random() * 7),
            horasTrabajadas: Math.floor(350 + Math.random() * 50)
        };
    });

    datosSemanales.forEach(d => {
        d.cumplimiento = Math.round((d.piezasProducidas / d.piezasPlaneadas) * 100);
        d.piezasPorHora = Math.round(d.piezasProducidas / d.horasTrabajadas * 10) / 10;
    });

    // Calcular variaciones
    for (let i = 1; i < datosSemanales.length; i++) {
        const prev = datosSemanales[i - 1];
        const curr = datosSemanales[i];
        curr.variacionPiezas = Math.round(((curr.piezasProducidas - prev.piezasProducidas) / prev.piezasProducidas) * 100);
        curr.variacionEfectividad = curr.efectividad - prev.efectividad;
    }
    datosSemanales[0].variacionPiezas = 0;
    datosSemanales[0].variacionEfectividad = 0;

    const ultimaSemana = datosSemanales[datosSemanales.length - 1];

    container.innerHTML = `
        <div class="report-header-actions">
            <span class="periodo-badge">
                <i class="fas fa-calendar-alt"></i> ${labelPeriodo}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="exportReporteToExcel('reporte_comparativo')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        </div>

        <div class="kpi-grid mb-2">
            <div class="kpi-card">
                <div class="kpi-icon blue"><i class="fas fa-chart-line"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${ultimaSemana.piezasProducidas.toLocaleString()}</span>
                    <span class="kpi-label">Piezas Esta Semana</span>
                    <span class="kpi-trend ${ultimaSemana.variacionPiezas >= 0 ? 'positive' : 'negative'}">
                        ${ultimaSemana.variacionPiezas >= 0 ? '+' : ''}${ultimaSemana.variacionPiezas}%
                    </span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon green"><i class="fas fa-bullseye"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${ultimaSemana.cumplimiento}%</span>
                    <span class="kpi-label">Cumplimiento Plan</span>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-icon orange"><i class="fas fa-tachometer-alt"></i></div>
                <div class="kpi-info">
                    <span class="kpi-value">${ultimaSemana.piezasPorHora}</span>
                    <span class="kpi-label">Piezas/Hora</span>
                </div>
            </div>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="tablaReporteComparativo">
                <thead>
                    <tr>
                        <th>Semana</th>
                        <th>Producidas</th>
                        <th>Planeadas</th>
                        <th>Cumplimiento</th>
                        <th>Variación</th>
                        <th>Efectividad</th>
                        <th>Calidad</th>
                        <th>Hrs Trabajadas</th>
                        <th>Pzas/Hora</th>
                    </tr>
                </thead>
                <tbody>
                    ${datosSemanales.map(d => `
                        <tr>
                            <td><strong>${d.semana}</strong></td>
                            <td>${d.piezasProducidas.toLocaleString()}</td>
                            <td>${d.piezasPlaneadas.toLocaleString()}</td>
                            <td>
                                <span class="status-badge ${d.cumplimiento >= 100 ? 'success' : d.cumplimiento >= 90 ? 'warning' : 'danger'}">
                                    ${d.cumplimiento}%
                                </span>
                            </td>
                            <td>
                                <span class="${d.variacionPiezas >= 0 ? 'text-success' : 'text-danger'}">
                                    ${d.variacionPiezas >= 0 ? '+' : ''}${d.variacionPiezas}%
                                </span>
                            </td>
                            <td>${d.efectividad}%</td>
                            <td>${d.calidadPorcentaje}%</td>
                            <td>${d.horasTrabajadas}h</td>
                            <td>${d.piezasPorHora}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="card mt-2">
            <h4>Gráfico de Tendencia</h4>
            <div class="chart-container">
                <div class="simple-bar-chart">
                    ${datosSemanales.map(d => `
                        <div class="bar-group">
                            <div class="bar-wrapper">
                                <div class="bar producidas" style="height:${(d.piezasProducidas / 3000) * 100}%" title="${d.piezasProducidas} producidas"></div>
                                <div class="bar planeadas" style="height:${(d.piezasPlaneadas / 3000) * 100}%" title="${d.piezasPlaneadas} planeadas"></div>
                            </div>
                            <span class="bar-label">${d.semana.replace('Semana ', 'S')}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="chart-legend">
                    <span><span class="legend-square producidas"></span> Producidas</span>
                    <span><span class="legend-square planeadas"></span> Planeadas</span>
                </div>
            </div>
        </div>
    `;
}

// Reporte: Pedidos por Cliente/Artículo
function loadReporteClienteArticulo() {
    const container = document.getElementById('reportContent');
    const clientes = db.getClientes();
    const productos = db.getProductos();
    const labelPeriodo = getLabelPeriodo();

    // Filtrar pedidos por periodo seleccionado
    const todosPedidos = db.getPedidos();
    const pedidos = filtrarPorPeriodo(todosPedidos, 'fechaCarga');

    // Agrupar pedidos por cliente
    const resumenClientes = clientes.map(cliente => {
        const pedidosCliente = pedidos.filter(p => p.clienteId === cliente.id);
        const productosComprados = {};
        let totalPiezas = 0;
        let totalVenta = 0;

        pedidosCliente.forEach(pedido => {
            pedido.productos.forEach(prod => {
                const producto = productos.find(p => p.id === prod.productoId);
                if (producto) {
                    if (!productosComprados[producto.id]) {
                        productosComprados[producto.id] = {
                            nombre: producto.nombre,
                            cantidadTotal: 0,
                            ventaTotal: 0,
                            pedidos: 0
                        };
                    }
                    productosComprados[producto.id].cantidadTotal += prod.cantidad;
                    productosComprados[producto.id].ventaTotal += prod.cantidad * (prod.precioUnitario || 0);
                    productosComprados[producto.id].pedidos++;
                    totalPiezas += prod.cantidad;
                    totalVenta += prod.cantidad * (prod.precioUnitario || 0);
                }
            });
        });

        return {
            cliente,
            totalPedidos: pedidosCliente.length,
            totalPiezas,
            totalVenta,
            productos: Object.values(productosComprados)
        };
    }).filter(r => r.totalPedidos > 0);

    container.innerHTML = `
        <div class="report-header-actions">
            <span class="periodo-badge">
                <i class="fas fa-calendar-alt"></i> ${labelPeriodo}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="exportReporteToExcel('reporte_cliente_articulo')">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
        </div>

        <div class="form-group" style="max-width:300px; margin-bottom:20px">
            <select id="reporteClienteSelect" onchange="loadDetalleClienteArticulo(this.value)">
                <option value="">Ver todos los clientes</option>
                ${resumenClientes.map(r => `<option value="${r.cliente.id}">${r.cliente.nombreComercial}</option>`).join('')}
            </select>
        </div>

        <div id="detalleClienteArticulo">
            ${resumenClientes.map(r => `
                <div class="card cliente-resumen-card mb-2">
                    <div class="card-header">
                        <span class="card-title">${r.cliente.nombreComercial}</span>
                        <span class="status-badge ${r.cliente.tipo === 'estrategico' ? 'success' : 'info'}">${r.cliente.tipo}</span>
                    </div>
                    <div class="cliente-stats">
                        <div class="stat">
                            <span class="stat-value">${r.totalPedidos}</span>
                            <span class="stat-label">Pedidos</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">${r.totalPiezas.toLocaleString()}</span>
                            <span class="stat-label">Piezas</span>
                        </div>
                        <div class="stat">
                            <span class="stat-value">$${r.totalVenta.toLocaleString()}</span>
                            <span class="stat-label">Venta Total</span>
                        </div>
                    </div>
                    <table class="data-table mt-1" id="tablaReporteCliente_${r.cliente.id}">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Pedidos</th>
                                <th>Piezas</th>
                                <th>Venta</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${r.productos.map(p => `
                                <tr>
                                    <td>${p.nombre}</td>
                                    <td>${p.pedidos}</td>
                                    <td>${p.cantidadTotal.toLocaleString()}</td>
                                    <td>$${p.ventaTotal.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>
    `;
}

function loadDetalleClienteArticulo(clienteId) {
    const container = document.getElementById('detalleClienteArticulo');

    if (!clienteId) {
        loadReporteClienteArticulo();
        return;
    }

    const cliente = db.getCliente(parseInt(clienteId));
    const pedidos = db.getPedidosByCliente(parseInt(clienteId));
    const productos = db.getProductos();

    // Historial detallado de pedidos
    const historial = pedidos.map(pedido => {
        const detalleProductos = pedido.productos.map(prod => {
            const producto = productos.find(p => p.id === prod.productoId);
            return {
                nombre: producto ? producto.nombre : 'N/A',
                cantidad: prod.cantidad,
                completadas: prod.completadas,
                precioUnitario: prod.precioUnitario || 0,
                subtotal: prod.cantidad * (prod.precioUnitario || 0)
            };
        });

        return {
            id: pedido.id,
            fecha: pedido.fechaCarga,
            fechaEntrega: pedido.fechaEntrega,
            estado: pedido.estado,
            productos: detalleProductos,
            total: detalleProductos.reduce((sum, p) => sum + p.subtotal, 0)
        };
    });

    container.innerHTML = `
        <div class="card mb-2">
            <div class="d-flex justify-between align-center">
                <h4>${cliente.nombreComercial}</h4>
                <button class="btn btn-secondary btn-small" onclick="loadReporteClienteArticulo()">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
            </div>
            <p class="text-muted">${cliente.razonSocial}</p>
        </div>

        <h4 class="mb-1">Historial de Pedidos</h4>
        ${historial.map(h => `
            <div class="card pedido-historial-card mb-1">
                <div class="pedido-header">
                    <span class="pedido-id">#${h.id}</span>
                    <span class="status-badge ${h.estado === 'produccion' ? 'warning' : h.estado === 'completado' ? 'success' : 'info'}">
                        ${h.estado}
                    </span>
                </div>
                <div class="pedido-fechas">
                    <span><i class="fas fa-calendar"></i> Carga: ${formatDate(h.fecha)}</span>
                    <span><i class="fas fa-truck"></i> Entrega: ${formatDate(h.fechaEntrega)}</span>
                </div>
                <table class="data-table mt-1">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Completadas</th>
                            <th>Precio Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${h.productos.map(p => `
                            <tr>
                                <td>${p.nombre}</td>
                                <td>${p.cantidad.toLocaleString()}</td>
                                <td>${p.completadas.toLocaleString()}</td>
                                <td>$${p.precioUnitario.toFixed(2)}</td>
                                <td><strong>$${p.subtotal.toLocaleString()}</strong></td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="4"><strong>Total Pedido</strong></td>
                            <td><strong>$${h.total.toLocaleString()}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `).join('')}
    `;
}

// ========================================
// PORTAL DE CLIENTES
// ========================================
function loadPortalClientes() {
    const section = document.getElementById('section-portal-clientes');
    const clientes = db.getClientes().filter(c => c.accesoPortal);

    section.innerHTML = `
        <div class="section-header">
            <h1>Administración Portal Clientes</h1>
        </div>

        <div class="kpi-grid mb-2">
            <div class="kpi-card small">
                <div class="kpi-info">
                    <span class="kpi-label">Accesos Activos</span>
                    <span class="kpi-value">${clientes.length}</span>
                </div>
            </div>
            <div class="kpi-card small">
                <div class="kpi-info">
                    <span class="kpi-label">Logins Hoy</span>
                    <span class="kpi-value">5</span>
                </div>
            </div>
        </div>

        <div class="orders-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Usuario</th>
                        <th>Estado</th>
                        <th>Último Acceso</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${clientes.map(cliente => `
                        <tr>
                            <td><strong>${cliente.nombreComercial}</strong></td>
                            <td>${cliente.usuario || 'No configurado'}</td>
                            <td><span class="status-badge success">Activo</span></td>
                            <td>${formatDate(new Date().toISOString().split('T')[0])}</td>
                            <td>
                                <button class="btn-icon-small" onclick="configPortalCliente(${cliente.id})"><i class="fas fa-cog"></i></button>
                                <button class="btn-icon-small" onclick="togglePortalCliente(${cliente.id})"><i class="fas fa-power-off"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="card mt-2">
            <h4>Configuración de Visibilidad</h4>
            <p class="text-muted mb-2">Define qué información pueden ver los clientes en su portal</p>
            <div class="form-group">
                <label><input type="checkbox" checked> % Avance por producto</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox" checked> Estatus general (corte/costura/empaque)</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox"> Fecha estimada de entrega (ETA)</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox"> Detalle de procesos</label>
            </div>
        </div>
    `;
}

function configPortalCliente(id) {
    alert('Configuración de portal en desarrollo');
}

function togglePortalCliente(id) {
    alert('Toggle de acceso en desarrollo');
}

// ========================================
// AUDITORÍA
// ========================================
function loadAuditoria() {
    const section = document.getElementById('section-auditoria');
    const auditoria = db.getAuditoria();

    section.innerHTML = `
        <div class="section-header">
            <h1>Bitácora de Auditoría</h1>
            <div>
                <select id="auditFilter" style="padding:8px 15px; border-radius:var(--radius-md); margin-right:10px">
                    <option value="">Todas las acciones</option>
                    <option value="cliente">Clientes</option>
                    <option value="pedido">Pedidos</option>
                    <option value="producto">Productos</option>
                    <option value="proceso">Procesos</option>
                    <option value="material">Materiales</option>
                </select>
                <button class="btn btn-secondary" onclick="exportAuditoria()">
                    <i class="fas fa-download"></i> Exportar
                </button>
            </div>
        </div>

        <div class="orders-table-container">
            <table class="data-table" id="auditoriaTable">
                <thead>
                    <tr>
                        <th>Fecha/Hora</th>
                        <th>Usuario</th>
                        <th>Acción</th>
                        <th>Detalle</th>
                        <th>Entidad</th>
                    </tr>
                </thead>
                <tbody>
                    ${auditoria.map(log => `
                        <tr data-entidad="${log.entidad}">
                            <td>${formatDateTime(log.fecha)}</td>
                            <td>${log.usuario}</td>
                            <td><strong>${log.accion}</strong></td>
                            <td>${log.detalle}</td>
                            <td><span class="status-badge info">${capitalizeFirst(log.entidad)}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('auditFilter').addEventListener('change', (e) => {
        const filter = e.target.value;
        document.querySelectorAll('#auditoriaTable tbody tr').forEach(row => {
            if (!filter || row.dataset.entidad === filter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

function exportAuditoria() {
    alert('Exportación en desarrollo');
}

// ========================================
// NOTIFICACIONES
// ========================================
function loadNotifications() {
    const list = document.getElementById('notificationsList');
    const notifications = db.getNotificaciones();
    const badge = document.querySelector('.btn-icon .badge');
    const unread = db.getNotificacionesNoLeidas().length;

    badge.textContent = unread;
    badge.style.display = unread > 0 ? 'block' : 'none';

    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${notif.leida ? '' : 'unread'}" onclick="markNotificationRead(${notif.id})">
            <div class="notification-title">
                <i class="fas ${notif.tipo === 'warning' ? 'fa-exclamation-triangle text-warning' : notif.tipo === 'danger' ? 'fa-times-circle text-danger' : 'fa-info-circle text-info'}"></i>
                ${notif.titulo}
            </div>
            <div class="notification-text">${notif.mensaje}</div>
            <div class="notification-time">${formatDateTime(notif.fecha)}</div>
        </div>
    `).join('');

    // Marcar todas como leídas
    document.querySelector('.notifications-header .btn-link').onclick = () => {
        db.marcarTodasLeidas();
        loadNotifications();
    };
}

function markNotificationRead(id) {
    db.marcarNotificacionLeida(id);
    loadNotifications();
}

// Revisar y gestionar una alerta
function revisarAlerta(id) {
    const notificacion = db.getNotificaciones().find(n => n.id === id);
    if (!notificacion) return;

    const content = `
        <div class="alert-review-container">
            <div class="alert-card ${notificacion.tipo} mb-2">
                <div class="alert-icon">
                    <i class="fas ${notificacion.tipo === 'warning' ? 'fa-exclamation-circle' : notificacion.tipo === 'danger' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
                </div>
                <div class="alert-content">
                    <span class="alert-title">${notificacion.titulo}</span>
                    <span class="alert-detail">${notificacion.mensaje}</span>
                    <span class="alert-date text-muted">${formatDateTime(notificacion.fecha)}</span>
                </div>
            </div>

            <div class="form-group">
                <label>Acción a tomar</label>
                <select id="alertaAccion">
                    <option value="resolver">Marcar como resuelta</option>
                    <option value="ignorar">Ignorar (no es un problema)</option>
                    <option value="escalar">Escalar a supervisión</option>
                    <option value="pendiente">Dejar pendiente para después</option>
                </select>
            </div>

            <div class="form-group">
                <label>Comentarios / Notas</label>
                <textarea id="alertaComentarios" rows="3" placeholder="Describe la acción tomada o el motivo de la decisión..."></textarea>
            </div>

            ${notificacion.tipo === 'warning' && notificacion.titulo.includes('Exceso') ? `
                <div class="alert-action-section">
                    <h4>Acciones Rápidas</h4>
                    <button class="btn btn-secondary btn-small" onclick="ajustarPiezasAlerta(${id})">
                        <i class="fas fa-edit"></i> Ajustar cantidad de piezas
                    </button>
                </div>
            ` : ''}

            ${notificacion.tipo === 'danger' && notificacion.titulo.includes('inactivo') ? `
                <div class="alert-action-section">
                    <h4>Acciones Rápidas</h4>
                    <button class="btn btn-secondary btn-small" onclick="verDetalleOperadorInactivo(${id})">
                        <i class="fas fa-user"></i> Ver detalle del operador
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="registrarPausaOperador(${id})">
                        <i class="fas fa-pause"></i> Registrar pausa autorizada
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    openModal('Revisar Alerta', content, () => {
        const accion = document.getElementById('alertaAccion').value;
        const comentarios = document.getElementById('alertaComentarios').value;

        // Registrar en auditoría
        db.addAuditoria(
            'Alerta revisada',
            `Alerta "${notificacion.titulo}" - Acción: ${accion}. ${comentarios ? 'Comentario: ' + comentarios : ''}`,
            'notificacion',
            id
        );

        if (accion === 'resolver' || accion === 'ignorar') {
            db.marcarNotificacionLeida(id);
        }

        closeModal();
        loadAlertas();
        loadNotifications();

        // Mostrar confirmación
        showToast(`Alerta ${accion === 'resolver' ? 'resuelta' : accion === 'ignorar' ? 'ignorada' : accion === 'escalar' ? 'escalada' : 'marcada como pendiente'}`);
    });
}

// Ajustar piezas desde alerta de exceso
function ajustarPiezasAlerta(alertaId) {
    closeModal();
    const notificacion = db.getNotificaciones().find(n => n.id === alertaId);
    if (!notificacion) return;

    // Extraer número de pedido del mensaje
    const match = notificacion.mensaje.match(/#(\d+)/);
    if (match) {
        const pedidoId = parseInt(match[1]);
        const pedido = db.getPedido(pedidoId);
        if (pedido) {
            showEditarPedido(pedidoId);
        }
    }
}

// Ver detalle de operador inactivo
function verDetalleOperadorInactivo(alertaId) {
    closeModal();
    // Navegar a la sección de personal
    navigateToSection('personal');
}

// Registrar pausa de operador
function registrarPausaOperador(alertaId) {
    const notificacion = db.getNotificaciones().find(n => n.id === alertaId);
    if (!notificacion) return;

    closeModal();

    const content = `
        <form id="pausaForm">
            <div class="form-group">
                <label>Tipo de Pausa</label>
                <select name="tipoPausa" required>
                    <option value="comida">Comida</option>
                    <option value="descanso">Descanso programado</option>
                    <option value="bano">Baño</option>
                    <option value="medico">Médico</option>
                    <option value="capacitacion">Capacitación</option>
                    <option value="otro">Otro</option>
                </select>
            </div>
            <div class="form-group">
                <label>Duración estimada (minutos)</label>
                <input type="number" name="duracion" value="15" min="5" max="120" required>
            </div>
            <div class="form-group">
                <label>Observaciones</label>
                <textarea name="observaciones" rows="2"></textarea>
            </div>
        </form>
    `;

    openModal('Registrar Pausa Autorizada', content, () => {
        const form = document.getElementById('pausaForm');
        const formData = new FormData(form);

        db.addAuditoria(
            'Pausa registrada',
            `Tipo: ${formData.get('tipoPausa')}, Duración: ${formData.get('duracion')} min. ${formData.get('observaciones') || ''}`,
            'personal',
            0
        );

        db.marcarNotificacionLeida(alertaId);
        closeModal();
        loadAlertas();
        showToast('Pausa registrada correctamente');
    });
}

// Función para mostrar toast de confirmación
function showToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-message ${tipo}`;

    const iconos = {
        'success': 'fa-check-circle',
        'error': 'fa-times-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    const icono = iconos[tipo] || 'fa-check-circle';

    toast.innerHTML = `<i class="fas ${icono}"></i> ${mensaje}`;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// AJUSTES DEL SISTEMA
// ========================================

function mostrarAjustesSistema() {
    const config = getConfigSistema();

    const content = `
        <div class="ajustes-sistema-container">
            <!-- Tabs de navegación -->
            <div class="ajustes-tabs">
                <button class="ajustes-tab active" onclick="cambiarTabAjustes('pausas')" data-tab="pausas">
                    <i class="fas fa-pause-circle"></i> Motivos de Pausa
                </button>
                <button class="ajustes-tab" onclick="cambiarTabAjustes('autenticacion')" data-tab="autenticacion">
                    <i class="fas fa-key"></i> Autenticación
                </button>
                <button class="ajustes-tab" onclick="cambiarTabAjustes('produccion')" data-tab="produccion">
                    <i class="fas fa-industry"></i> Producción
                </button>
                <button class="ajustes-tab" onclick="cambiarTabAjustes('notificaciones')" data-tab="notificaciones">
                    <i class="fas fa-bell"></i> Notificaciones
                </button>
                <button class="ajustes-tab" onclick="cambiarTabAjustes('roles')" data-tab="roles">
                    <i class="fas fa-users-cog"></i> Roles
                </button>
            </div>

            <!-- Contenido de tabs -->
            <div class="ajustes-content">
                <!-- Tab: Motivos de Pausa -->
                <div class="ajustes-panel active" id="panel-pausas">
                    <div class="panel-header-ajustes">
                        <h4><i class="fas fa-pause-circle"></i> Configuración de Motivos de Pausa</h4>
                        <button class="btn btn-sm btn-primary" onclick="agregarMotivoPausa()">
                            <i class="fas fa-plus"></i> Nuevo Motivo
                        </button>
                    </div>
                    <p class="panel-description">Define qué motivos de pausa están disponibles y cómo afectan al tiempo de producción.</p>

                    <div class="pausas-config-list" id="pausasConfigList">
                        ${renderizarMotivosPausa(config.motivosPausa)}
                    </div>
                </div>

                <!-- Tab: Autenticación -->
                <div class="ajustes-panel" id="panel-autenticacion">
                    <h4><i class="fas fa-key"></i> Configuración de Autenticación</h4>
                    <p class="panel-description">Configura las opciones de seguridad para el acceso de empleados.</p>

                    <div class="ajustes-form">
                        <div class="ajuste-row">
                            <label class="ajuste-switch">
                                <input type="checkbox" id="config_requierePIN" ${config.autenticacion.requierePIN ? 'checked' : ''} onchange="actualizarConfigAutenticacion()">
                                <span class="switch-slider"></span>
                            </label>
                            <div class="ajuste-info">
                                <span class="ajuste-label">Requerir PIN para acceso</span>
                                <span class="ajuste-desc">Los operadores necesitarán ingresar su PIN para iniciar sesión</span>
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Longitud del PIN</label>
                                <select id="config_longitudPIN" onchange="actualizarConfigAutenticacion()">
                                    <option value="4" ${config.autenticacion.longitudPIN === 4 ? 'selected' : ''}>4 dígitos</option>
                                    <option value="6" ${config.autenticacion.longitudPIN === 6 ? 'selected' : ''}>6 dígitos</option>
                                </select>
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Intentos máximos antes de bloqueo</label>
                                <input type="number" id="config_intentosMaximos" value="${config.autenticacion.intentosMaximos}" min="1" max="10" onchange="actualizarConfigAutenticacion()">
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Tiempo de bloqueo (minutos)</label>
                                <input type="number" id="config_bloqueoTemporal" value="${config.autenticacion.bloqueoTemporal}" min="5" max="60" onchange="actualizarConfigAutenticacion()">
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Expiración de sesión (minutos)</label>
                                <input type="number" id="config_sesionExpira" value="${config.autenticacion.sesionExpira}" min="60" max="960" onchange="actualizarConfigAutenticacion()">
                                <span class="input-hint">${Math.round(config.autenticacion.sesionExpira / 60)} horas</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab: Producción -->
                <div class="ajustes-panel" id="panel-produccion">
                    <h4><i class="fas fa-industry"></i> Configuración de Producción</h4>
                    <p class="panel-description">Ajusta los parámetros de alertas y metas de producción.</p>

                    <div class="ajustes-form">
                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Alerta de inactividad (minutos)</label>
                                <input type="number" id="config_alertaInactividad" value="${config.produccion.alertaInactividad}" min="5" max="120" onchange="actualizarConfigProduccion()">
                                <span class="input-hint">Tiempo sin actividad antes de notificar a supervisora</span>
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Meta mínima por hora (piezas)</label>
                                <input type="number" id="config_metaMinimaPorHora" value="${config.produccion.metaMinimaPorHora}" min="1" max="100" onchange="actualizarConfigProduccion()">
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Tolerancia de exceso (%)</label>
                                <input type="number" id="config_toleranciaExceso" value="${config.produccion.toleranciaExceso}" min="0" max="20" onchange="actualizarConfigProduccion()">
                                <span class="input-hint">Porcentaje sobre la meta permitido sin alerta</span>
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <label class="ajuste-switch">
                                <input type="checkbox" id="config_requiereFotoDefecto" ${config.produccion.requiereFotoDefecto ? 'checked' : ''} onchange="actualizarConfigProduccion()">
                                <span class="switch-slider"></span>
                            </label>
                            <div class="ajuste-info">
                                <span class="ajuste-label">Requerir foto al reportar defectos</span>
                                <span class="ajuste-desc">Obligar a capturar evidencia fotográfica de problemas de calidad</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab: Notificaciones -->
                <div class="ajustes-panel" id="panel-notificaciones">
                    <h4><i class="fas fa-bell"></i> Configuración de Notificaciones</h4>
                    <p class="panel-description">Configura cómo se manejan las alertas y notificaciones.</p>

                    <div class="ajustes-form">
                        <div class="ajuste-row">
                            <label class="ajuste-switch">
                                <input type="checkbox" id="config_sonidoActivo" ${config.notificaciones.sonidoActivo ? 'checked' : ''} onchange="actualizarConfigNotificaciones()">
                                <span class="switch-slider"></span>
                            </label>
                            <div class="ajuste-info">
                                <span class="ajuste-label">Sonidos de notificación</span>
                                <span class="ajuste-desc">Reproducir sonidos al recibir alertas</span>
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <label class="ajuste-switch">
                                <input type="checkbox" id="config_notificarPausaLarga" ${config.notificaciones.notificarPausaLarga ? 'checked' : ''} onchange="actualizarConfigNotificaciones()">
                                <span class="switch-slider"></span>
                            </label>
                            <div class="ajuste-info">
                                <span class="ajuste-label">Notificar pausas prolongadas</span>
                                <span class="ajuste-desc">Alertar cuando una pausa excede el tiempo límite</span>
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <div class="ajuste-input-group">
                                <label>Tiempo límite de pausa (minutos)</label>
                                <input type="number" id="config_tiempoPausaLarga" value="${config.notificaciones.tiempoPausaLarga}" min="5" max="60" onchange="actualizarConfigNotificaciones()">
                            </div>
                        </div>

                        <div class="ajuste-row">
                            <label class="ajuste-switch">
                                <input type="checkbox" id="config_notificarInactividad" ${config.notificaciones.notificarInactividad ? 'checked' : ''} onchange="actualizarConfigNotificaciones()">
                                <span class="switch-slider"></span>
                            </label>
                            <div class="ajuste-info">
                                <span class="ajuste-label">Notificar inactividad</span>
                                <span class="ajuste-desc">Alertar cuando un operador no tiene actividad</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab: Roles -->
                <div class="ajustes-panel" id="panel-roles">
                    <h4><i class="fas fa-users-cog"></i> Roles y Permisos</h4>
                    <p class="panel-description">Define los roles del sistema y sus permisos asociados.</p>

                    <div class="roles-list">
                        ${Object.entries(config.roles).map(([key, rol]) => `
                            <div class="rol-card">
                                <div class="rol-header">
                                    <div class="rol-icon ${key}">
                                        <i class="fas ${key === 'administrador' ? 'fa-crown' : key === 'supervisora' ? 'fa-user-tie' : 'fa-user-cog'}"></i>
                                    </div>
                                    <div class="rol-info">
                                        <h5>${rol.nombre}</h5>
                                        <span>${rol.descripcion}</span>
                                    </div>
                                </div>
                                <div class="rol-permisos">
                                    <span class="permisos-label">Permisos:</span>
                                    <div class="permisos-tags">
                                        ${rol.permisos.map(p => `<span class="permiso-tag">${formatearPermiso(p)}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        <button class="btn btn-primary" onclick="guardarAjustesSistema()">
            <i class="fas fa-save"></i> Guardar Cambios
        </button>
    `;

    openModal('Ajustes del Sistema', content, footer);
}

function cambiarTabAjustes(tabId) {
    // Desactivar todos los tabs y paneles
    document.querySelectorAll('.ajustes-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ajustes-panel').forEach(p => p.classList.remove('active'));

    // Activar el tab y panel seleccionado
    document.querySelector(`.ajustes-tab[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`panel-${tabId}`)?.classList.add('active');
}

function renderizarMotivosPausa(motivos) {
    return motivos.map(motivo => `
        <div class="pausa-config-item ${!motivo.activo ? 'inactive' : ''}" data-id="${motivo.id}">
            <div class="pausa-info">
                <div class="pausa-icon" style="background-color: ${motivo.color}20; color: ${motivo.color}">
                    <i class="fas ${motivo.icono}"></i>
                </div>
                <div class="pausa-detalles">
                    <span class="pausa-nombre">${motivo.nombre}</span>
                    <div class="pausa-flags">
                        ${motivo.detieneTiempo ? '<span class="flag detiene"><i class="fas fa-clock"></i> Detiene tiempo</span>' : ''}
                        ${motivo.notificaCoco ? '<span class="flag notifica"><i class="fas fa-bell"></i> Notifica a Coco</span>' : ''}
                    </div>
                </div>
            </div>
            <div class="pausa-actions">
                <label class="switch-mini">
                    <input type="checkbox" ${motivo.activo ? 'checked' : ''} onchange="toggleMotivoPausa('${motivo.id}', this.checked)">
                    <span class="switch-slider-mini"></span>
                </label>
                <button class="btn-icon-sm" onclick="editarMotivoPausa('${motivo.id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                ${!['bano', 'comida', 'descanso'].includes(motivo.id) ? `
                    <button class="btn-icon-sm danger" onclick="eliminarMotivoPausa('${motivo.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function formatearPermiso(permiso) {
    const permisoMap = {
        'todo': 'Acceso Total',
        'ver_dashboard': 'Ver Dashboard',
        'ver_personal': 'Ver Personal',
        'asignar_tareas': 'Asignar Tareas',
        'ver_reportes': 'Ver Reportes',
        'gestionar_pausas': 'Gestionar Pausas',
        'capturar_produccion': 'Capturar Producción',
        'reportar_problemas': 'Reportar Problemas',
        'ver_propias_estadisticas': 'Ver Estadísticas Propias'
    };
    return permisoMap[permiso] || permiso;
}

function actualizarConfigAutenticacion() {
    const config = getConfigSistema();
    config.autenticacion.requierePIN = document.getElementById('config_requierePIN')?.checked || false;
    config.autenticacion.longitudPIN = parseInt(document.getElementById('config_longitudPIN')?.value) || 4;
    config.autenticacion.intentosMaximos = parseInt(document.getElementById('config_intentosMaximos')?.value) || 3;
    config.autenticacion.bloqueoTemporal = parseInt(document.getElementById('config_bloqueoTemporal')?.value) || 15;
    config.autenticacion.sesionExpira = parseInt(document.getElementById('config_sesionExpira')?.value) || 480;

    // Actualizar hint de horas
    const horasHint = document.querySelector('#panel-autenticacion .input-hint');
    if (horasHint) {
        horasHint.textContent = Math.round(config.autenticacion.sesionExpira / 60) + ' horas';
    }

    setConfigSistema(config);
}

function actualizarConfigProduccion() {
    const config = getConfigSistema();
    config.produccion.alertaInactividad = parseInt(document.getElementById('config_alertaInactividad')?.value) || 30;
    config.produccion.metaMinimaPorHora = parseInt(document.getElementById('config_metaMinimaPorHora')?.value) || 10;
    config.produccion.toleranciaExceso = parseInt(document.getElementById('config_toleranciaExceso')?.value) || 5;
    config.produccion.requiereFotoDefecto = document.getElementById('config_requiereFotoDefecto')?.checked || false;
    setConfigSistema(config);
}

function actualizarConfigNotificaciones() {
    const config = getConfigSistema();
    config.notificaciones.sonidoActivo = document.getElementById('config_sonidoActivo')?.checked || false;
    config.notificaciones.notificarPausaLarga = document.getElementById('config_notificarPausaLarga')?.checked || false;
    config.notificaciones.tiempoPausaLarga = parseInt(document.getElementById('config_tiempoPausaLarga')?.value) || 15;
    config.notificaciones.notificarInactividad = document.getElementById('config_notificarInactividad')?.checked || false;
    setConfigSistema(config);
}

function toggleMotivoPausa(motivoId, activo) {
    updateMotivoPausa(motivoId, { activo });
    const item = document.querySelector(`.pausa-config-item[data-id="${motivoId}"]`);
    if (item) {
        item.classList.toggle('inactive', !activo);
    }
}

function agregarMotivoPausa() {
    const content = `
        <form id="nuevoMotivoForm">
            <div class="form-group">
                <label>Nombre del motivo *</label>
                <input type="text" name="nombre" required placeholder="Ej: Capacitación">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Icono</label>
                    <select name="icono">
                        <option value="fa-pause">Pausa (default)</option>
                        <option value="fa-user">Personal</option>
                        <option value="fa-book">Capacitación</option>
                        <option value="fa-phone">Llamada</option>
                        <option value="fa-medkit">Médico</option>
                        <option value="fa-users">Reunión</option>
                        <option value="fa-wrench">Mantenimiento</option>
                        <option value="fa-broom">Limpieza</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" name="color" value="#6b7280">
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="detieneTiempo">
                    <span><i class="fas fa-clock"></i> Detiene el tiempo de producción</span>
                </label>
                <small class="form-hint">El tiempo de esta pausa no contará como tiempo productivo</small>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="notificaCoco">
                    <span><i class="fas fa-bell"></i> Notifica a Coco (supervisora)</span>
                </label>
                <small class="form-hint">Se enviará una alerta cuando se use este motivo</small>
            </div>
        </form>
    `;

    openModal('Nuevo Motivo de Pausa', content, () => {
        const form = document.getElementById('nuevoMotivoForm');
        const nuevoMotivo = addMotivoPausa({
            nombre: form.querySelector('[name="nombre"]').value,
            icono: form.querySelector('[name="icono"]').value,
            color: form.querySelector('[name="color"]').value,
            detieneTiempo: form.querySelector('[name="detieneTiempo"]').checked,
            notificaCoco: form.querySelector('[name="notificaCoco"]').checked
        });

        // Recargar la lista
        const lista = document.getElementById('pausasConfigList');
        if (lista) {
            lista.innerHTML = renderizarMotivosPausa(getConfigSistema().motivosPausa);
        }

        showToast(`Motivo "${nuevoMotivo.nombre}" agregado`);
    });
}

function editarMotivoPausa(motivoId) {
    const motivo = getMotivoPausa(motivoId);
    if (!motivo) return;

    const content = `
        <form id="editarMotivoForm">
            <div class="form-group">
                <label>Nombre del motivo *</label>
                <input type="text" name="nombre" required value="${motivo.nombre}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Icono</label>
                    <select name="icono">
                        <option value="fa-pause" ${motivo.icono === 'fa-pause' ? 'selected' : ''}>Pausa</option>
                        <option value="fa-restroom" ${motivo.icono === 'fa-restroom' ? 'selected' : ''}>Baño</option>
                        <option value="fa-utensils" ${motivo.icono === 'fa-utensils' ? 'selected' : ''}>Comida</option>
                        <option value="fa-coffee" ${motivo.icono === 'fa-coffee' ? 'selected' : ''}>Descanso</option>
                        <option value="fa-box-open" ${motivo.icono === 'fa-box-open' ? 'selected' : ''}>Material</option>
                        <option value="fa-tools" ${motivo.icono === 'fa-tools' ? 'selected' : ''}>Herramienta</option>
                        <option value="fa-question-circle" ${motivo.icono === 'fa-question-circle' ? 'selected' : ''}>Pregunta</option>
                        <option value="fa-exclamation-triangle" ${motivo.icono === 'fa-exclamation-triangle' ? 'selected' : ''}>Alerta</option>
                        <option value="fa-user" ${motivo.icono === 'fa-user' ? 'selected' : ''}>Personal</option>
                        <option value="fa-book" ${motivo.icono === 'fa-book' ? 'selected' : ''}>Capacitación</option>
                        <option value="fa-phone" ${motivo.icono === 'fa-phone' ? 'selected' : ''}>Llamada</option>
                        <option value="fa-medkit" ${motivo.icono === 'fa-medkit' ? 'selected' : ''}>Médico</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" name="color" value="${motivo.color}">
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="detieneTiempo" ${motivo.detieneTiempo ? 'checked' : ''}>
                    <span><i class="fas fa-clock"></i> Detiene el tiempo de producción</span>
                </label>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" name="notificaCoco" ${motivo.notificaCoco ? 'checked' : ''}>
                    <span><i class="fas fa-bell"></i> Notifica a Coco (supervisora)</span>
                </label>
            </div>
        </form>
    `;

    openModal('Editar Motivo de Pausa', content, () => {
        const form = document.getElementById('editarMotivoForm');
        updateMotivoPausa(motivoId, {
            nombre: form.querySelector('[name="nombre"]').value,
            icono: form.querySelector('[name="icono"]').value,
            color: form.querySelector('[name="color"]').value,
            detieneTiempo: form.querySelector('[name="detieneTiempo"]').checked,
            notificaCoco: form.querySelector('[name="notificaCoco"]').checked
        });

        // Recargar la lista
        const lista = document.getElementById('pausasConfigList');
        if (lista) {
            lista.innerHTML = renderizarMotivosPausa(getConfigSistema().motivosPausa);
        }

        showToast('Motivo actualizado');
    });
}

function eliminarMotivoPausa(motivoId) {
    const motivo = getMotivoPausa(motivoId);
    if (!motivo) return;

    if (confirm(`¿Eliminar el motivo "${motivo.nombre}"?`)) {
        deleteMotivoPausa(motivoId);

        // Recargar la lista
        const lista = document.getElementById('pausasConfigList');
        if (lista) {
            lista.innerHTML = renderizarMotivosPausa(getConfigSistema().motivosPausa);
        }

        showToast('Motivo eliminado', 'warning');
    }
}

function guardarAjustesSistema() {
    // Las configuraciones se guardan en tiempo real al cambiar cada campo
    sincronizarOperadorasDB();
    sincronizarConfigOperadora();
    closeModal();
    showToast('Ajustes guardados correctamente', 'success');
}

// ========================================
// GESTIÓN DE CREDENCIALES DE EMPLEADOS
// ========================================

function verCredenciales(empleadoId) {
    const empleado = db.getEmpleado(empleadoId);
    if (!empleado) return;

    const content = `
        <div class="credenciales-view">
            <div class="empleado-header-cred">
                <div class="avatar-cred">
                    ${empleado.foto ? `<img src="${empleado.foto}" alt="">` : `<i class="fas fa-user"></i>`}
                </div>
                <div class="empleado-info-cred">
                    <h4>${empleado.nombre}</h4>
                    <span class="rol-badge ${empleado.rol}">${empleado.rol}</span>
                </div>
            </div>

            <div class="credenciales-datos">
                <div class="dato-row">
                    <span class="dato-label"><i class="fas fa-id-badge"></i> Número de Empleado</span>
                    <span class="dato-value">${empleado.numEmpleado || 'No asignado'}</span>
                </div>
                <div class="dato-row">
                    <span class="dato-label"><i class="fas fa-key"></i> PIN Actual</span>
                    <span class="dato-value pin-masked" id="pinMasked">****</span>
                    <button class="btn-link-sm" onclick="toggleVerPIN(${empleadoId})">
                        <i class="fas fa-eye" id="togglePINIcon"></i>
                    </button>
                </div>
                <div class="dato-row">
                    <span class="dato-label"><i class="fas fa-clock"></i> Último Acceso</span>
                    <span class="dato-value">${empleado.ultimoAcceso ? formatDateTime(empleado.ultimoAcceso) : 'Nunca'}</span>
                </div>
                <div class="dato-row">
                    <span class="dato-label"><i class="fas fa-exclamation-triangle"></i> Intentos Fallidos</span>
                    <span class="dato-value ${empleado.intentosFallidos > 0 ? 'text-danger' : ''}">${empleado.intentosFallidos || 0}</span>
                </div>
                <div class="dato-row">
                    <span class="dato-label"><i class="fas fa-lock"></i> Estado</span>
                    <span class="dato-value ${empleado.bloqueado ? 'text-danger' : 'text-success'}">
                        ${empleado.bloqueado ? '<i class="fas fa-ban"></i> Bloqueado' : '<i class="fas fa-check"></i> Activo'}
                    </span>
                </div>
            </div>

            <div class="credenciales-acciones">
                <button class="btn btn-outline" onclick="resetearPinEmpleado(${empleadoId})">
                    <i class="fas fa-redo"></i> Resetear PIN
                </button>
                ${empleado.bloqueado ?
                    `<button class="btn btn-success" onclick="toggleBloqueoEmpleado(${empleadoId}, false)">
                        <i class="fas fa-unlock"></i> Desbloquear
                    </button>` :
                    `<button class="btn btn-danger" onclick="toggleBloqueoEmpleado(${empleadoId}, true)">
                        <i class="fas fa-lock"></i> Bloquear
                    </button>`
                }
            </div>

            ${empleado.permisos ? `
                <div class="permisos-resumen">
                    <h5><i class="fas fa-shield-alt"></i> Permisos Actuales</h5>
                    <div class="permisos-badges">
                        ${Object.entries(empleado.permisos).map(([key, val]) => val ?
                            `<span class="permiso-badge activo"><i class="fas fa-check"></i> ${formatearPermisoEmpleado(key)}</span>` :
                            `<span class="permiso-badge inactivo"><i class="fas fa-times"></i> ${formatearPermisoEmpleado(key)}</span>`
                        ).join('')}
                    </div>
                    <button class="btn btn-sm btn-outline mt-2" onclick="editarPermisosEmpleado(${empleadoId})">
                        <i class="fas fa-edit"></i> Editar Permisos
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    openModal('Credenciales de Empleado', content, `
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    `);
}

function toggleVerPIN(empleadoId) {
    const empleado = db.getEmpleado(empleadoId);
    const maskedEl = document.getElementById('pinMasked');
    const iconEl = document.getElementById('togglePINIcon');

    if (maskedEl.textContent === '****') {
        maskedEl.textContent = empleado.pin || '----';
        iconEl.classList.remove('fa-eye');
        iconEl.classList.add('fa-eye-slash');
    } else {
        maskedEl.textContent = '****';
        iconEl.classList.remove('fa-eye-slash');
        iconEl.classList.add('fa-eye');
    }
}

function resetearPinEmpleado(empleadoId) {
    const empleado = db.getEmpleado(empleadoId);
    if (!empleado) return;

    const nuevoPIN = generarPINAleatorio(4);

    if (confirm(`¿Resetear el PIN de ${empleado.nombre}?\n\nEl nuevo PIN será: ${nuevoPIN}`)) {
        db.updateEmpleado(empleadoId, {
            pin: nuevoPIN,
            pinTemporal: true,
            intentosFallidos: 0,
            bloqueado: false
        });

        sincronizarOperadorasDB();
        closeModal();
        showToast(`PIN reseteado. Nuevo PIN: ${nuevoPIN}`, 'success');
    }
}

function toggleBloqueoEmpleado(empleadoId, bloquear) {
    const empleado = db.getEmpleado(empleadoId);
    if (!empleado) return;

    const accion = bloquear ? 'bloquear' : 'desbloquear';
    if (confirm(`¿Desea ${accion} a ${empleado.nombre}?`)) {
        db.updateEmpleado(empleadoId, {
            bloqueado: bloquear,
            intentosFallidos: bloquear ? empleado.intentosFallidos : 0
        });

        sincronizarOperadorasDB();
        closeModal();
        showToast(`Empleado ${bloquear ? 'bloqueado' : 'desbloqueado'}`, bloquear ? 'warning' : 'success');
    }
}

function editarPermisosEmpleado(empleadoId) {
    const empleado = db.getEmpleado(empleadoId);
    if (!empleado) return;

    const permisos = empleado.permisos || {};

    const content = `
        <form id="editarPermisosForm">
            <p class="form-description">Configurar permisos para <strong>${empleado.nombre}</strong></p>

            <div class="permisos-grid-edit">
                <label class="permiso-toggle">
                    <input type="checkbox" name="capturar" ${permisos.capturar !== false ? 'checked' : ''}>
                    <span class="toggle-content">
                        <i class="fas fa-edit"></i>
                        <span>Capturar Producción</span>
                    </span>
                </label>

                <label class="permiso-toggle">
                    <input type="checkbox" name="pausar" ${permisos.pausar !== false ? 'checked' : ''}>
                    <span class="toggle-content">
                        <i class="fas fa-pause"></i>
                        <span>Pausar/Reanudar</span>
                    </span>
                </label>

                <label class="permiso-toggle">
                    <input type="checkbox" name="reportar" ${permisos.reportar !== false ? 'checked' : ''}>
                    <span class="toggle-content">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Reportar Problemas</span>
                    </span>
                </label>

                <label class="permiso-toggle">
                    <input type="checkbox" name="fotos" ${permisos.fotos !== false ? 'checked' : ''}>
                    <span class="toggle-content">
                        <i class="fas fa-camera"></i>
                        <span>Tomar Fotos</span>
                    </span>
                </label>

                <label class="permiso-toggle">
                    <input type="checkbox" name="historial" ${permisos.historial ? 'checked' : ''}>
                    <span class="toggle-content">
                        <i class="fas fa-history"></i>
                        <span>Ver Historial</span>
                    </span>
                </label>

                <label class="permiso-toggle">
                    <input type="checkbox" name="ranking" ${permisos.ranking ? 'checked' : ''}>
                    <span class="toggle-content">
                        <i class="fas fa-trophy"></i>
                        <span>Ver Ranking</span>
                    </span>
                </label>
            </div>
        </form>
    `;

    openModal('Editar Permisos', content, () => {
        const form = document.getElementById('editarPermisosForm');
        const nuevosPermisos = {
            capturar: form.querySelector('[name="capturar"]').checked,
            pausar: form.querySelector('[name="pausar"]').checked,
            reportar: form.querySelector('[name="reportar"]').checked,
            fotos: form.querySelector('[name="fotos"]').checked,
            historial: form.querySelector('[name="historial"]').checked,
            ranking: form.querySelector('[name="ranking"]').checked
        };

        db.updateEmpleado(empleadoId, { permisos: nuevosPermisos });
        sincronizarOperadorasDB();
        showToast('Permisos actualizados');
    });
}

function formatearPermisoEmpleado(key) {
    const map = {
        capturar: 'Capturar',
        pausar: 'Pausar',
        reportar: 'Reportar',
        fotos: 'Fotos',
        historial: 'Historial',
        ranking: 'Ranking'
    };
    return map[key] || key;
}

// ========================================
// ACTUALIZACIONES EN VIVO
// ========================================
function initLiveUpdates() {
    // Simular actualizaciones cada 30 segundos
    setInterval(() => {
        if (app.currentSection === 'dashboard') {
            loadAreasLive();
        }
    }, 30000);
}

// ========================================
// UTILIDADES
// ========================================
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getEstadoBadgeClass(estado) {
    switch(estado) {
        case 'completado': return 'success';
        case 'produccion': return 'info';
        case 'pendiente': return 'warning';
        case 'cancelado': return 'danger';
        default: return 'info';
    }
}

// Función para resetear la base de datos (útil para desarrollo)
function resetDatabase() {
    if (confirm('¿Está seguro de resetear la base de datos? Se perderán todos los cambios.')) {
        db.reset();
        location.reload();
    }
}

// ========================================
// EXPORTACIÓN A EXCEL
// ========================================
function exportTableToExcel(tableId, filename = 'reporte') {
    // Buscar la tabla por ID o selector
    let table = document.getElementById(tableId);
    if (!table) {
        table = document.querySelector(tableId);
    }
    if (!table) {
        alert('No se encontró la tabla para exportar');
        return;
    }

    // Construir contenido CSV
    const rows = table.querySelectorAll('tr');
    let csvContent = '\uFEFF'; // BOM para UTF-8

    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = [];
        cells.forEach(cell => {
            // Limpiar el contenido de la celda (quitar HTML, progress bars, etc.)
            let cellText = cell.innerText || cell.textContent;
            cellText = cellText.replace(/[\n\r]/g, ' ').trim();
            // Escapar comillas dobles
            cellText = cellText.replace(/"/g, '""');
            // Envolver en comillas si contiene comas o comillas
            if (cellText.includes(',') || cellText.includes('"') || cellText.includes(';')) {
                cellText = `"${cellText}"`;
            }
            rowData.push(cellText);
        });
        csvContent += rowData.join(',') + '\r\n';
    });

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const fecha = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${fecha}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportReporteToExcel(reportName) {
    // Encontrar la tabla dentro del contenedor de reportes
    const container = document.getElementById('reportContent');
    if (!container) return;

    const table = container.querySelector('table.data-table');
    if (!table) {
        alert('No hay datos para exportar en este momento');
        return;
    }

    // Generar un ID temporal si la tabla no tiene uno
    if (!table.id) {
        table.id = 'temp-export-table';
    }

    exportTableToExcel(table.id, reportName);

    // Limpiar el ID temporal
    if (table.id === 'temp-export-table') {
        table.removeAttribute('id');
    }
}

// ========================================
// DETALLES DE KPIs (Click handlers)
// ========================================
function showKPIDetalle(tipo) {
    const personal = db.getPersonal();
    const pedidos = db.getPedidos();
    const clientes = db.getClientes();
    const produccionActiva = db.getProduccionActiva();
    const estadoOps = db.getEstadoOperadores();
    const procesos = db.getProcesos();
    const productos = db.getProductos();

    let title = '';
    let content = '';

    switch(tipo) {
        case 'procesos':
            title = 'Detalle de Procesos Activos';
            const procesosActivos = produccionActiva;
            content = `
                <div class="kpi-detail-summary">
                    <p><strong>${procesosActivos.length}</strong> procesos en ejecución</p>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Proceso</th>
                            <th>Operador</th>
                            <th>Piezas Realizadas</th>
                            <th>Inicio</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${procesosActivos.map(prod => {
                            const proceso = procesos.find(p => p.id === prod.procesoId);
                            const operador = personal.find(p => p.id === prod.operadorId);
                            return `
                                <tr>
                                    <td><strong>#${prod.pedidoId}</strong></td>
                                    <td>${proceso?.nombre || 'N/A'}</td>
                                    <td>${operador?.nombre || 'N/A'}</td>
                                    <td>${prod.piezasRealizadas}</td>
                                    <td>${new Date(prod.inicio).toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            break;

        case 'clientes':
            title = 'Detalle de Clientes Activos';
            const pedidosActivos = filtrarPedidosActivos(pedidos);
            const clientesActivosIds = [...new Set(pedidosActivos.map(p => p.clienteId))];
            const clientesActivos = clientes.filter(c => clientesActivosIds.includes(c.id));

            content = `
                <div class="kpi-detail-summary">
                    <p><strong>${clientesActivos.length}</strong> clientes con pedidos en producción</p>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Pedidos en Producción</th>
                            <th>Piezas Totales</th>
                            <th>Valor en Producción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientesActivos.map(cliente => {
                            const pedidosCliente = pedidosActivos.filter(p => p.clienteId === cliente.id);
                            const totalPiezas = pedidosCliente.reduce((sum, p) =>
                                sum + p.productos.reduce((s, pr) => s + pr.cantidad, 0), 0);
                            const valorTotal = pedidosCliente.reduce((sum, p) =>
                                sum + p.productos.reduce((s, pr) => s + (pr.cantidad * (pr.precioUnitario || 0)), 0), 0);
                            return `
                                <tr>
                                    <td><strong>${cliente.nombreComercial}</strong></td>
                                    <td>${pedidosCliente.length}</td>
                                    <td>${totalPiezas.toLocaleString()}</td>
                                    <td>$${valorTotal.toLocaleString()}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            break;

        case 'operadores':
            title = 'Detalle de Operadores Activos';
            const operadoresActivos = estadoOps.filter(e => e.estado !== 'inactivo');

            content = `
                <div class="kpi-detail-summary">
                    <p><strong>${operadoresActivos.length}</strong> operadores trabajando</p>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Operador</th>
                            <th>Estación</th>
                            <th>Estado</th>
                            <th>Efectividad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${operadoresActivos.map(estado => {
                            const operador = personal.find(p => p.id === estado.operadorId);
                            return `
                                <tr>
                                    <td>
                                        <span class="workstation ${estado.estado}" style="width:28px;height:28px;display:inline-flex;vertical-align:middle;margin-right:8px">
                                            <span class="workstation-initials" style="font-size:0.7rem">${estado.iniciales}</span>
                                        </span>
                                        ${operador?.nombre || 'N/A'}
                                    </td>
                                    <td><strong>${estado.estacionId}</strong></td>
                                    <td><span class="status-badge ${getEstadoBadgeClass(estado.estado)}">${getEstadoTexto(estado.estado)}</span></td>
                                    <td>${estado.efectividad}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            break;

        case 'ventas':
            title = 'Detalle de Venta en Fabricación';
            const pedidosEnProduccion = filtrarPedidosActivos(pedidos);
            let ventaTotal = 0;

            content = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pedidosEnProduccion.map(pedido => {
                            const cliente = clientes.find(c => c.id === pedido.clienteId);
                            return pedido.productos.map(prod => {
                                const producto = productos.find(p => p.id === prod.productoId);
                                const total = prod.cantidad * (prod.precioUnitario || 0);
                                ventaTotal += total;
                                return `
                                    <tr>
                                        <td><strong>#${pedido.id}</strong></td>
                                        <td>${cliente?.nombreComercial || 'N/A'}</td>
                                        <td>${producto?.nombre?.substring(0, 25) || 'N/A'}...</td>
                                        <td>${prod.cantidad.toLocaleString()}</td>
                                        <td>$${(prod.precioUnitario || 0).toFixed(2)}</td>
                                        <td><strong>$${total.toLocaleString()}</strong></td>
                                    </tr>
                                `;
                            }).join('');
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" style="text-align:right"><strong>Total en Fabricación:</strong></td>
                            <td><strong style="font-size:1.2rem">$${ventaTotal.toLocaleString()}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            `;
            break;

        case 'efectividad':
            title = 'Detalle de Efectividad por Operador';
            const opsConEfectividad = estadoOps.filter(e => e.efectividad > 0).sort((a, b) => b.efectividad - a.efectividad);

            content = `
                <div class="kpi-detail-summary">
                    <p>Efectividad = Piezas reales / Piezas esperadas por hora</p>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ranking</th>
                            <th>Operador</th>
                            <th>Estación</th>
                            <th>Efectividad</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${opsConEfectividad.map((estado, index) => {
                            const operador = personal.find(p => p.id === estado.operadorId);
                            return `
                                <tr>
                                    <td><strong>#${index + 1}</strong></td>
                                    <td>
                                        <span class="workstation ${estado.estado}" style="width:28px;height:28px;display:inline-flex;vertical-align:middle;margin-right:8px">
                                            <span class="workstation-initials" style="font-size:0.7rem">${estado.iniciales}</span>
                                        </span>
                                        ${operador?.nombre || 'N/A'}
                                    </td>
                                    <td>${estado.estacionId}</td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:8px">
                                            <div class="progress-bar" style="width:100px">
                                                <div class="progress ${estado.efectividad >= 100 ? 'success' : estado.efectividad >= 90 ? '' : 'warning'}" style="width:${Math.min(estado.efectividad, 130)}%"></div>
                                            </div>
                                            <strong>${estado.efectividad}%</strong>
                                        </div>
                                    </td>
                                    <td><span class="status-badge ${getEstadoBadgeClass(estado.estado)}">${getEstadoTexto(estado.estado)}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            break;

        case 'presupuesto':
            title = 'Detalle de Presupuesto vs Real';
            const pedidosConPresupuesto = pedidos.filter(p => esPedidoActivo(p) && p.presupuestoEstimado);
            let totalPresupuesto = 0;
            let totalReal = 0;

            content = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Presupuesto</th>
                            <th>Costo Real</th>
                            <th>Variación</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pedidosConPresupuesto.map(pedido => {
                            const cliente = clientes.find(c => c.id === pedido.clienteId);
                            const variacion = ((pedido.costoReal - pedido.presupuestoEstimado) / pedido.presupuestoEstimado) * 100;
                            totalPresupuesto += pedido.presupuestoEstimado;
                            totalReal += pedido.costoReal;
                            return `
                                <tr>
                                    <td><strong>#${pedido.id}</strong></td>
                                    <td>${cliente?.nombreComercial || 'N/A'}</td>
                                    <td>$${pedido.presupuestoEstimado.toLocaleString()}</td>
                                    <td>$${pedido.costoReal.toLocaleString()}</td>
                                    <td class="${variacion > 0 ? 'text-danger' : 'text-success'}">
                                        <strong>${variacion >= 0 ? '+' : ''}${variacion.toFixed(1)}%</strong>
                                    </td>
                                    <td>
                                        <span class="status-badge ${variacion > 5 ? 'danger' : variacion > 0 ? 'warning' : 'success'}">
                                            ${variacion > 5 ? 'Excedido' : variacion > 0 ? 'Por encima' : 'Dentro'}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="text-align:right"><strong>Totales:</strong></td>
                            <td><strong>$${totalPresupuesto.toLocaleString()}</strong></td>
                            <td><strong>$${totalReal.toLocaleString()}</strong></td>
                            <td class="${totalReal > totalPresupuesto ? 'text-danger' : 'text-success'}">
                                <strong>${totalReal > totalPresupuesto ? '+' : ''}${(((totalReal - totalPresupuesto) / totalPresupuesto) * 100).toFixed(1)}%</strong>
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            `;
            break;
    }

    openModal(title, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// ========================================
// DETALLE DE POSICIÓN EN MAPA DE PLANTA
// ========================================
function showPosicionDetalle(estacionId) {
    console.log('[showPosicionDetalle] Iniciando para estación:', estacionId);

    try {
        const estacion = db.getEstacion(estacionId);
        console.log('[showPosicionDetalle] Estación encontrada:', estacion);

        if (!estacion) {
            console.error('[showPosicionDetalle] Estación no encontrada:', estacionId);
            showToast('Estación no encontrada', 'error');
            return;
        }

        const personal = db.getPersonal() || [];
        const estadoOps = db.getEstadoOperadores() || [];
        const produccionActiva = db.getProduccionActiva() || [];
        const historialProduccion = (db.getHistorialProduccion && db.getHistorialProduccion()) || [];
        const pedidos = db.getPedidos() || [];
        const productos = db.getProductos() || [];
        const procesos = db.getProcesos() || [];
        const clientes = db.getClientes() || [];

        console.log('[showPosicionDetalle] Datos cargados - Personal:', personal.length, 'EstadoOps:', estadoOps.length);

        const operador = estacion.operadorId ? personal.find(p => p.id === estacion.operadorId) : null;
        const estadoOp = estadoOps.find(e => e.estacionId === estacionId);

        console.log('[showPosicionDetalle] Operador asignado:', operador ? operador.nombre : 'Ninguno');

        // Si no hay operador asignado, mostrar modal simple
        if (!operador) {
            console.log('[showPosicionDetalle] Mostrando modal sin operador');
            showPosicionSinOperador(estacionId, estacion, personal);
            return;
        }

        // Buscar producción activa del operador
        const produccionOp = produccionActiva.find(p => p.operadorId === operador.id);

        // Calcular estadísticas del empleado con manejo de errores
        let estadisticasEmpleado = { efectividad: 0, piezasHoy: 0, piezasSemana: 0, tiempoPromedio: 0 };
        try {
            const stats = calcularEstadisticasEmpleado(operador.id, historialProduccion, produccionActiva);
            estadisticasEmpleado = {
                efectividad: Number(stats.efectividad) || 0,
                piezasHoy: Number(stats.piezasHoy) || 0,
                piezasSemana: Number(stats.piezasSemana) || 0,
                tiempoPromedio: Number(stats.tiempoPromedio) || 0
            };
        } catch (e) {
            console.warn('[showPosicionDetalle] Error calculando estadísticas:', e);
        }
        console.log('[showPosicionDetalle] Estadísticas:', estadisticasEmpleado);

    // Obtener historial reciente del operador (últimos 7 días)
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);
    const historialReciente = historialProduccion
        .filter(h => {
            if (h.operadorId !== operador.id || !h.fecha) return false;
            try {
                const fecha = new Date(h.fecha);
                return !isNaN(fecha.getTime()) && fecha >= hace7Dias;
            } catch (e) {
                return false;
            }
        })
        .sort((a, b) => {
            try {
                return new Date(b.fecha) - new Date(a.fecha);
            } catch (e) {
                return 0;
            }
        })
        .slice(0, 5);

    // Sección de información del empleado
    let infoEmpleadoHtml = `
        <div class="empleado-detalle-card">
            <div class="empleado-header-detalle">
                <div class="empleado-avatar-grande ${estadoOp?.estado || 'inactivo'}">
                    <span class="iniciales-grandes">${estadoOp?.iniciales || getIniciales(operador.nombre)}</span>
                </div>
                <div class="empleado-info-principal">
                    <h3 class="empleado-nombre-grande">${operador.nombre}</h3>
                    <div class="empleado-meta">
                        <span class="meta-item"><i class="fas fa-id-badge"></i> #${operador.numEmpleado || 'N/A'}</span>
                        <span class="meta-item"><i class="fas fa-map-marker-alt"></i> ${estacionId}</span>
                        <span class="status-badge ${getEstadoBadgeClass(estadoOp?.estado || 'inactivo')}">${getEstadoTexto(estadoOp?.estado || 'inactivo')}</span>
                    </div>
                    <div class="empleado-horario">
                        <i class="fas fa-clock"></i> ${operador.horaEntrada || '08:00'} - ${operador.horaSalida || '17:00'}
                        <span class="text-muted">(${operador.horasRealesDia?.toFixed(1) || '8.5'} hrs/día)</span>
                    </div>
                </div>
            </div>

            <!-- KPIs del Empleado -->
            <div class="empleado-kpis">
                <div class="kpi-card ${estadisticasEmpleado.efectividad >= 100 ? 'success' : estadisticasEmpleado.efectividad >= 80 ? 'warning' : 'danger'}">
                    <div class="kpi-valor">${estadisticasEmpleado.efectividad.toFixed(0)}%</div>
                    <div class="kpi-label">Efectividad</div>
                </div>
                <div class="kpi-card info">
                    <div class="kpi-valor">${estadisticasEmpleado.piezasHoy}</div>
                    <div class="kpi-label">Piezas Hoy</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-valor">${estadisticasEmpleado.piezasSemana}</div>
                    <div class="kpi-label">Piezas Semana</div>
                </div>
                <div class="kpi-card ${estadisticasEmpleado.tiempoPromedio <= 1 ? 'success' : 'warning'}">
                    <div class="kpi-valor">${estadisticasEmpleado.tiempoPromedio.toFixed(1)}</div>
                    <div class="kpi-label">Min/Pieza Prom</div>
                </div>
            </div>
        </div>
    `;

    // Sección de producción actual
    let produccionActualHtml = '';
    if (produccionOp) {
        const pedido = pedidos.find(p => p.id === produccionOp.pedidoId);
        const producto = productos.find(p => p.id === produccionOp.productoId);
        const proceso = procesos.find(p => p.id === produccionOp.procesoId);
        const cliente = pedido ? clientes.find(c => c.id === pedido.clienteId) : null;

        // Calcular avance
        const horaInicio = new Date(produccionOp.inicio);
        const ahora = new Date();
        const minutosTrabajados = (ahora - horaInicio) / (1000 * 60);
        const tiempoEstandar = proceso?.tiempoEstandar || 3;
        const piezasEsperadas = Math.round(minutosTrabajados / tiempoEstandar);
        const avanceReal = produccionOp.piezasRealizadas || 0;
        const diferencia = avanceReal - piezasEsperadas;
        const porcentajeAvance = piezasEsperadas > 0 ? Math.round((avanceReal / piezasEsperadas) * 100) : 0;

        // Calcular tiempo restante estimado
        const piezasMeta = produccionOp.piezasMeta || pedido?.cantidad || 100;
        const piezasRestantes = piezasMeta - avanceReal;
        const tiempoRestanteMin = piezasRestantes * tiempoEstandar;
        const horasRestantes = Math.floor(tiempoRestanteMin / 60);
        const minutosRestantes = Math.round(tiempoRestanteMin % 60);

        produccionActualHtml = `
            <div class="seccion-produccion-activa">
                <h4 class="seccion-titulo"><i class="fas fa-cog fa-spin"></i> Trabajando Actualmente</h4>

                <div class="produccion-info-grid">
                    <div class="produccion-info-item">
                        <span class="info-label"><i class="fas fa-building"></i> Cliente</span>
                        <span class="info-valor">${cliente?.nombreComercial || 'N/A'}</span>
                    </div>
                    <div class="produccion-info-item">
                        <span class="info-label"><i class="fas fa-file-alt"></i> Pedido</span>
                        <span class="info-valor">#${produccionOp.pedidoId}</span>
                    </div>
                    <div class="produccion-info-item span-2">
                        <span class="info-label"><i class="fas fa-box"></i> Producto</span>
                        <span class="info-valor">${producto?.nombre || 'N/A'}</span>
                    </div>
                    <div class="produccion-info-item">
                        <span class="info-label"><i class="fas fa-tools"></i> Proceso</span>
                        <span class="info-valor">${proceso?.nombre || 'N/A'}</span>
                    </div>
                    <div class="produccion-info-item">
                        <span class="info-label"><i class="fas fa-stopwatch"></i> Tiempo Estándar</span>
                        <span class="info-valor">${tiempoEstandar} min/pza</span>
                    </div>
                    <div class="produccion-info-item">
                        <span class="info-label"><i class="fas fa-play-circle"></i> Inicio</span>
                        <span class="info-valor">${horaInicio.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                    <div class="produccion-info-item">
                        <span class="info-label"><i class="fas fa-hourglass-half"></i> Tiempo Activo</span>
                        <span class="info-valor">${Math.floor(minutosTrabajados / 60)}h ${Math.round(minutosTrabajados % 60)}m</span>
                    </div>
                </div>

                <div class="avance-produccion">
                    <h5><i class="fas fa-chart-line"></i> Avance de Producción</h5>
                    <div class="progress-container">
                        <div class="progress-bar-custom">
                            <div class="progress-fill ${porcentajeAvance >= 100 ? 'success' : porcentajeAvance >= 80 ? 'warning' : 'danger'}"
                                 style="width: ${Math.min(porcentajeAvance, 100)}%"></div>
                        </div>
                        <span class="progress-text">${porcentajeAvance}%</span>
                    </div>

                    <div class="avance-numeros">
                        <div class="avance-numero-item">
                            <span class="numero grande ${diferencia >= 0 ? 'success' : 'danger'}">${avanceReal}</span>
                            <span class="etiqueta">Piezas Hechas</span>
                        </div>
                        <div class="avance-numero-item">
                            <span class="numero">${piezasEsperadas}</span>
                            <span class="etiqueta">Esperadas</span>
                        </div>
                        <div class="avance-numero-item ${diferencia >= 0 ? 'positivo' : 'negativo'}">
                            <span class="numero ${diferencia >= 0 ? 'success' : 'danger'}">${diferencia >= 0 ? '+' : ''}${diferencia}</span>
                            <span class="etiqueta">Diferencia</span>
                        </div>
                        <div class="avance-numero-item">
                            <span class="numero">${piezasMeta}</span>
                            <span class="etiqueta">Meta Total</span>
                        </div>
                    </div>

                    ${piezasRestantes > 0 ? `
                        <div class="tiempo-restante">
                            <i class="fas fa-clock"></i>
                            <span>Tiempo estimado restante: <strong>${horasRestantes}h ${minutosRestantes}m</strong> (${piezasRestantes} piezas)</span>
                        </div>
                    ` : `
                        <div class="meta-cumplida">
                            <i class="fas fa-check-circle"></i>
                            <span>¡Meta cumplida!</span>
                        </div>
                    `}
                </div>

                ${produccionOp.pausas && produccionOp.pausas.length > 0 ? `
                    <div class="pausas-lista">
                        <h5><i class="fas fa-pause-circle"></i> Pausas Registradas (${produccionOp.pausas.length})</h5>
                        <ul>
                            ${produccionOp.pausas.map(p => `
                                <li>
                                    <span class="pausa-tiempo">${p.inicio} - ${p.fin || 'En curso'}</span>
                                    <span class="pausa-motivo">${p.motivo}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    } else {
        produccionActualHtml = `
            <div class="sin-produccion-activa">
                <div class="sin-produccion-icono">
                    <i class="fas fa-pause-circle"></i>
                </div>
                <h4>Sin Producción Activa</h4>
                <p>El operador está asignado a esta estación pero no tiene producción activa en este momento.</p>
            </div>
        `;
    }

    // Sección de historial reciente
    let historialHtml = '';
    if (historialReciente.length > 0) {
        historialHtml = `
            <div class="historial-reciente">
                <h4 class="seccion-titulo"><i class="fas fa-history"></i> Historial Reciente (Últimos 7 días)</h4>
                <table class="tabla-historial">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Proceso</th>
                            <th>Piezas</th>
                            <th>Efect.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historialReciente.map(h => {
                            const prod = productos.find(p => p.id === h.productoId);
                            const proc = procesos.find(p => p.id === h.procesoId);
                            const fecha = new Date(h.fecha);
                            return `
                                <tr>
                                    <td>${fecha.toLocaleDateString('es-MX', {day: '2-digit', month: 'short'})}</td>
                                    <td>${prod?.nombre?.substring(0, 20) || 'N/A'}...</td>
                                    <td>${proc?.nombre || 'N/A'}</td>
                                    <td><strong>${h.piezasRealizadas || 0}</strong></td>
                                    <td class="${(h.efectividad || 0) >= 100 ? 'text-success' : (h.efectividad || 0) >= 80 ? 'text-warning' : 'text-danger'}">
                                        ${(h.efectividad || 0).toFixed(0)}%
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Sección de procesos asignados al operador
    const procesosAsignadosHtml = generarSeccionProcesosAsignados(operador.id, pedidos, productos, procesos, clientes);

    // Sección de salario (si está disponible)
    let salarioHtml = '';
    if (operador.salarioSemanal || operador.salarioHora) {
        salarioHtml = `
            <div class="salario-resumen">
                <h4 class="seccion-titulo"><i class="fas fa-money-bill-wave"></i> Información Salarial</h4>
                <div class="salario-items">
                    <div class="salario-item">
                        <span class="salario-label">Sueldo Semanal</span>
                        <span class="salario-valor">$${(operador.salarioSemanal || 0).toLocaleString('es-MX')}</span>
                    </div>
                    <div class="salario-item">
                        <span class="salario-label">Sueldo Neto Semanal</span>
                        <span class="salario-valor">$${(operador.sueldoNetoSemanal || 0).toLocaleString('es-MX')}</span>
                    </div>
                    <div class="salario-item">
                        <span class="salario-label">Por Hora</span>
                        <span class="salario-valor">$${(operador.salarioHora || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Sección de asignación
    const operadoresDisponibles = personal.filter(p => p.rol === 'operador' && p.activo !== false);
    const asignacionHtml = `
        <div class="asignacion-section">
            <h4 class="seccion-titulo"><i class="fas fa-user-cog"></i> Gestión de Asignación</h4>
            <div class="asignacion-actions">
                <button class="btn btn-danger btn-sm" onclick="desasignarOperadorDeEstacion('${estacionId}')">
                    <i class="fas fa-user-minus"></i> Desasignar de esta Estación
                </button>
                <button class="btn btn-secondary btn-sm" onclick="editEmpleado(${operador.id}); closeModal();">
                    <i class="fas fa-edit"></i> Editar Empleado
                </button>
            </div>
            <div class="reasignar-section">
                <p class="text-muted">Reasignar a otro operador:</p>
                <div class="reasignar-form">
                    <select id="selectOperadorAsignar" class="form-control">
                        <option value="">-- Seleccionar operador --</option>
                        ${operadoresDisponibles.map(op => `
                            <option value="${op.id}" ${op.id === operador.id ? 'disabled' : ''}>
                                ${op.nombre} ${op.posiciones && op.posiciones.length > 0 ? '(' + op.posiciones.length + ' posiciones)' : ''}
                            </option>
                        `).join('')}
                    </select>
                    <button class="btn btn-primary btn-sm" onclick="asignarOperadorAEstacionDesdeModal('${estacionId}')">
                        <i class="fas fa-exchange-alt"></i> Reasignar
                    </button>
                </div>
            </div>
        </div>
    `;

    const content = `
        <div class="posicion-detalle-completo">
            ${infoEmpleadoHtml}
            ${produccionActualHtml}
            ${procesosAsignadosHtml}
            ${historialHtml}
            ${salarioHtml}
            ${asignacionHtml}
        </div>
    `;

    console.log('[showPosicionDetalle] Abriendo modal con contenido');
    openModal(`Estación ${estacionId} - ${operador.nombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
    console.log('[showPosicionDetalle] Modal abierto exitosamente');

    } catch (error) {
        console.error('[showPosicionDetalle] Error:', error);
        console.error('[showPosicionDetalle] Stack:', error.stack);
        showToast('Error al cargar detalles de la posición', 'error');
    }
}

// Genera la sección de procesos asignados a un operador
function generarSeccionProcesosAsignados(operadorId, pedidos, productos, procesos, clientes) {
    // Obtener asignaciones desde múltiples fuentes en localStorage
    const asignacionesEstaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');
    const supervisoraMaquinas = JSON.parse(localStorage.getItem('supervisora_maquinas') || '{}');
    const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');

    // Buscar la estación del operador
    const estaciones = db.getEstaciones() || [];
    const estacionOperador = estaciones.find(e => e.operadorId === operadorId);
    const estacionId = estacionOperador?.id;

    console.log('[generarSeccionProcesosAsignados] Buscando para operador:', operadorId, 'Estación:', estacionId);

    // Buscar todas las asignaciones del operador
    let asignacionesOperador = [];

    // Función auxiliar para agregar proceso si no está duplicado
    const agregarProceso = (proc, esActivo = false, esSimultaneo = false) => {
        const yaExiste = asignacionesOperador.some(a =>
            a.pedidoId === proc.pedidoId && a.procesoId === proc.procesoId
        );
        if (!yaExiste && proc.procesoId) {
            asignacionesOperador.push({
                ...proc,
                esActivo: esActivo || proc.esActivo || false,
                esSimultaneo: esSimultaneo
            });
        }
    };

    // 1. Desde supervisora_maquinas (proceso activo y cola)
    if (estacionId && supervisoraMaquinas[estacionId]) {
        const maquina = supervisoraMaquinas[estacionId];
        console.log('[generarSeccionProcesosAsignados] Maquina encontrada:', maquina);

        // Proceso principal activo
        if (maquina.procesoId) {
            agregarProceso({
                pedidoId: maquina.pedidoId,
                productoId: maquina.productoId,
                procesoId: maquina.procesoId,
                procesoNombre: maquina.procesoNombre,
                estado: maquina.estado || 'en_proceso',
                piezasAsignadas: maquina.piezasAsignadas || maquina.cantidad || 0,
                piezasCompletadas: maquina.piezasCompletadas || 0,
                prioridad: maquina.prioridad || 'normal',
                esActivo: true
            }, true, false);
        }

        // Procesos simultáneos (todos son activos y marcados como simultáneos)
        if (maquina.procesosSimultaneos && Array.isArray(maquina.procesosSimultaneos)) {
            maquina.procesosSimultaneos.forEach(proc => {
                agregarProceso({
                    pedidoId: proc.pedidoId,
                    productoId: proc.productoId,
                    procesoId: proc.procesoId,
                    procesoNombre: proc.procesoNombre,
                    estado: proc.estado || 'en_proceso',
                    piezasAsignadas: proc.piezasAsignadas || proc.cantidad || 0,
                    piezasCompletadas: proc.piezasCompletadas || 0,
                    prioridad: proc.prioridad || 'normal',
                    esActivo: true
                }, true, true);
            });
        }

        // Cola de procesos - verificar si alguno está siendo trabajado simultáneamente
        // Obtener IDs de procesos simultáneos activos
        const procesosSimultaneosIds = (maquina.procesosSimultaneos || []).map(p => p.procesoId);
        // También verificar en estado_maquinas
        const estadoMaqSimultaneos = estadoMaquinas[estacionId]?.procesosSimultaneos || [];
        const simultaneosDesdeEstado = estadoMaqSimultaneos.map(p => p.procesoId);
        const todosSimultaneos = [...new Set([...procesosSimultaneosIds, ...simultaneosDesdeEstado])];

        if (maquina.colaProcesos && Array.isArray(maquina.colaProcesos)) {
            maquina.colaProcesos.forEach((proc, index) => {
                // Verificar si este proceso está siendo trabajado simultáneamente
                const esSimultaneo = todosSimultaneos.includes(proc.procesoId) ||
                                     todosSimultaneos.includes(String(proc.procesoId));

                agregarProceso({
                    pedidoId: proc.pedidoId,
                    productoId: proc.productoId,
                    procesoId: proc.procesoId,
                    procesoNombre: proc.procesoNombre,
                    estado: esSimultaneo ? 'en_proceso' : 'pendiente',
                    piezasAsignadas: proc.piezasAsignadas || proc.cantidad || 0,
                    piezasCompletadas: proc.piezasCompletadas || 0,
                    prioridad: proc.prioridad || 'normal',
                    posicionCola: esSimultaneo ? null : index + 1
                }, esSimultaneo, esSimultaneo);
            });
        }
    }

    // 1.5. Desde estado_maquinas (donde el operador guarda los procesos simultáneos)
    if (estacionId && estadoMaquinas[estacionId]) {
        const estadoMaq = estadoMaquinas[estacionId];
        console.log('[generarSeccionProcesosAsignados] Estado maquina encontrado:', estadoMaq);

        // Procesos simultáneos desde estado_maquinas (donde el operador los guarda)
        if (estadoMaq.procesosSimultaneos && Array.isArray(estadoMaq.procesosSimultaneos)) {
            estadoMaq.procesosSimultaneos.forEach(proc => {
                agregarProceso({
                    pedidoId: proc.pedidoId,
                    productoId: proc.productoId,
                    procesoId: proc.procesoId,
                    procesoNombre: proc.procesoNombre,
                    estado: estadoMaq.estado || 'en_proceso',
                    piezasAsignadas: proc.piezasAsignadas || proc.cantidad || 0,
                    piezasCompletadas: proc.piezasCompletadas || 0,
                    prioridad: proc.prioridad || 'normal',
                    esActivo: true
                }, true, true);
            });
        }
    }

    // 2. Desde asignaciones_estaciones
    if (estacionId && asignacionesEstaciones[estacionId]) {
        const asig = asignacionesEstaciones[estacionId];
        console.log('[generarSeccionProcesosAsignados] Asignación estación:', asig);

        // Proceso principal
        if (asig.procesoId) {
            agregarProceso({
                pedidoId: asig.pedidoId,
                productoId: asig.productoId,
                procesoId: asig.procesoId,
                procesoNombre: asig.procesoNombre,
                estado: asig.estado || 'en_proceso',
                piezasAsignadas: asig.piezasAsignadas || asig.cantidad || 0,
                piezasCompletadas: asig.piezasCompletadas || 0,
                prioridad: asig.prioridad || 'normal',
                esActivo: true
            }, true);
        }

        // Procesos simultáneos desde asignaciones_estaciones
        if (asig.procesosSimultaneos && Array.isArray(asig.procesosSimultaneos)) {
            asig.procesosSimultaneos.forEach(proc => {
                agregarProceso({
                    pedidoId: proc.pedidoId,
                    productoId: proc.productoId,
                    procesoId: proc.procesoId,
                    procesoNombre: proc.procesoNombre,
                    estado: proc.estado || 'en_proceso',
                    piezasAsignadas: proc.piezasAsignadas || proc.cantidad || 0,
                    piezasCompletadas: proc.piezasCompletadas || 0,
                    prioridad: proc.prioridad || 'normal',
                    esActivo: true
                }, true, true);
            });
        }

        // Cola de procesos desde asignaciones_estaciones
        // Verificar si algún proceso de la cola está siendo trabajado simultáneamente
        const procesosSimultaneosActivos = asig.procesosSimultaneosActivos || [];

        if (asig.colaProcesos && Array.isArray(asig.colaProcesos)) {
            asig.colaProcesos.forEach((proc, index) => {
                // Verificar si este proceso está siendo trabajado simultáneamente
                const esSimultaneo = procesosSimultaneosActivos.includes(proc.procesoId) ||
                                     procesosSimultaneosActivos.includes(String(proc.procesoId));

                agregarProceso({
                    pedidoId: proc.pedidoId,
                    productoId: proc.productoId,
                    procesoId: proc.procesoId,
                    procesoNombre: proc.procesoNombre,
                    estado: esSimultaneo ? 'en_proceso' : 'pendiente',
                    piezasAsignadas: proc.piezasAsignadas || proc.cantidad || 0,
                    piezasCompletadas: proc.piezasCompletadas || 0,
                    prioridad: proc.prioridad || 'normal',
                    posicionCola: esSimultaneo ? null : index + 1
                }, esSimultaneo, esSimultaneo);
            });
        }
    }

    // 3. Desde estado_maquinas (incluye procesosSimultaneos)
    if (estacionId && estadoMaquinas[estacionId]) {
        const estado = estadoMaquinas[estacionId];

        // Proceso principal
        if (estado.procesoId) {
            agregarProceso({
                pedidoId: estado.pedidoId,
                productoId: estado.productoId,
                procesoId: estado.procesoId,
                procesoNombre: estado.procesoNombre,
                estado: estado.estado || 'en_proceso',
                piezasAsignadas: estado.piezasAsignadas || 0,
                piezasCompletadas: estado.piezasCompletadas || estado.piezasHoy || 0,
                prioridad: estado.prioridad || 'normal',
                esActivo: true
            }, true);
        }

        // PROCESOS SIMULTÁNEOS - Todos son activos y marcados como simultáneos
        if (estado.procesosSimultaneos && Array.isArray(estado.procesosSimultaneos)) {
            console.log('[generarSeccionProcesosAsignados] Procesos simultáneos encontrados:', estado.procesosSimultaneos.length);
            estado.procesosSimultaneos.forEach(proc => {
                // Usar pedidoId del proceso o del estado general
                const pedidoIdProc = proc.pedidoId || estado.pedidoId;
                agregarProceso({
                    pedidoId: pedidoIdProc,
                    productoId: proc.productoId || estado.productoId,
                    procesoId: proc.procesoId,
                    procesoNombre: proc.procesoNombre,
                    estado: 'en_proceso',
                    piezasAsignadas: proc.piezasAsignadas || proc.cantidad || 0,
                    piezasCompletadas: proc.piezasCompletadas || 0,
                    prioridad: proc.prioridad || 'normal',
                    esActivo: true
                }, true, true);
            });
        }
    }

    // 4. IMPORTANTE: Sincronizar piezas desde pedidos_erp (fuente de verdad del operador)
    // El operador guarda las piezas en pedidos_erp, así que debemos leerlas de ahí
    const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
    const historialProduccion = JSON.parse(localStorage.getItem('historial_produccion') || '[]');

    asignacionesOperador.forEach(asig => {
        console.log('[generarSeccionProcesosAsignados] Procesando asignación:', asig.procesoNombre, 'procesoId:', asig.procesoId, 'pedidoId:', asig.pedidoId);

        // Inicializar piezasCompletadas en 0 si no está definido
        if (asig.piezasCompletadas === undefined || asig.piezasCompletadas === null) {
            asig.piezasCompletadas = 0;
        }

        // Buscar piezas del historial de producción del día
        // IMPORTANTE: Solo buscar registros que coincidan con el pedidoId Y procesoId/nombre
        const hoy = new Date().toISOString().split('T')[0];
        const produccionProceso = historialProduccion.filter(h => {
            if (!h.fecha?.startsWith(hoy)) return false;

            // DEBE coincidir el pedidoId si la asignación lo tiene
            if (asig.pedidoId && h.pedidoId && h.pedidoId != asig.pedidoId) {
                return false;
            }

            // Coincidencia por procesoId (más confiable)
            if (asig.procesoId && h.procesoId && h.procesoId == asig.procesoId) {
                return true;
            }

            // Coincidencia por nombre de proceso SOLO si también coincide el pedidoId
            if (asig.procesoNombre && h.procesoNombre && asig.pedidoId && h.pedidoId == asig.pedidoId) {
                const nombreAsig = (asig.procesoNombre || '').toLowerCase().trim();
                const nombreHist = (h.procesoNombre || '').toLowerCase().trim();
                if (nombreAsig === nombreHist) return true;
            }

            return false;
        });

        if (produccionProceso.length > 0) {
            const totalPiezasHistorial = produccionProceso.reduce((sum, h) => sum + (h.cantidad || 0), 0);
            console.log('[generarSeccionProcesosAsignados] Historial encontrado para', asig.procesoNombre,
                'pedido:', asig.pedidoId, ':', totalPiezasHistorial, 'piezas de', produccionProceso.length, 'registros');
            asig.piezasCompletadas = totalPiezasHistorial;
        }

        // Buscar el pedido en pedidos_erp SOLO por ID (no por nombre para evitar confusiones)
        let pedidoERP = asig.pedidoId ? pedidosERP.find(p => p.id == asig.pedidoId) : null;

        // Obtener cantidad total del pedido (piezasAsignadas)
        if (pedidoERP && (!asig.piezasAsignadas || asig.piezasAsignadas === 0)) {
            asig.piezasAsignadas = pedidoERP.cantidad || 0;
        }

        // También buscar en el pedido original de la DB
        const pedidoDB = pedidos.find(p => p.id == asig.pedidoId);
        if (pedidoDB && (!asig.piezasAsignadas || asig.piezasAsignadas === 0)) {
            asig.piezasAsignadas = pedidoDB.productos?.[0]?.cantidad || pedidoDB.cantidad || pedidoDB.cantidadTotal || 0;
        }

        // Buscar piezas en pedidos_erp SOLO si tenemos el pedido correcto
        if (pedidoERP && pedidoERP.procesos) {
            // Buscar primero por procesoId exacto
            let procesoERP = pedidoERP.procesos.find(proc => proc.id == asig.procesoId);

            // Si no encontró por ID, buscar por nombre DENTRO del mismo pedido
            if (!procesoERP && asig.procesoNombre) {
                procesoERP = pedidoERP.procesos.find(proc =>
                    (proc.nombre || '').toLowerCase().trim() === (asig.procesoNombre || '').toLowerCase().trim()
                );
            }

            if (procesoERP) {
                const piezasERP = procesoERP.piezas || 0;
                // Solo actualizar si las piezas de ERP son mayores (y son del mismo pedido)
                if (piezasERP > asig.piezasCompletadas) {
                    console.log('[generarSeccionProcesosAsignados] Actualizando piezas desde pedidos_erp:',
                        asig.procesoNombre, 'pedido:', asig.pedidoId, 'de', asig.piezasCompletadas, 'a', piezasERP);
                    asig.piezasCompletadas = piezasERP;
                }
                if (procesoERP.estado && procesoERP.estado !== 'pendiente') {
                    asig.estado = procesoERP.estado === 'en-proceso' ? 'en_proceso' : procesoERP.estado;
                }
            }
        }

        // Revisar estado_maquinas para piezasHoy (solo si coincide procesoId Y pedidoId)
        if (estacionId && estadoMaquinas[estacionId]) {
            const estadoMaq = estadoMaquinas[estacionId];
            // Verificar que sea el mismo proceso Y el mismo pedido
            const mismoProcesoYPedido = estadoMaq.procesoId == asig.procesoId &&
                (!asig.pedidoId || !estadoMaq.pedidoId || estadoMaq.pedidoId == asig.pedidoId);

            if (mismoProcesoYPedido && estadoMaq.piezasHoy > asig.piezasCompletadas) {
                console.log('[generarSeccionProcesosAsignados] Actualizando desde estado_maquinas:',
                    asig.procesoNombre, 'piezasHoy:', estadoMaq.piezasHoy);
                asig.piezasCompletadas = estadoMaq.piezasHoy;
            }
        }

        // Log final del estado de la asignación
        console.log('[generarSeccionProcesosAsignados] Resultado:', asig.procesoNombre,
            'pedidoId:', asig.pedidoId, 'piezasCompletadas:', asig.piezasCompletadas, 'piezasAsignadas:', asig.piezasAsignadas);
    });

    // Segunda pasada: si alguna asignación no tiene piezasAsignadas, usar el máximo encontrado
    const maxPiezasAsignadas = Math.max(...asignacionesOperador.map(a => a.piezasAsignadas || 0), 0);
    asignacionesOperador.forEach(asig => {
        if (!asig.piezasAsignadas || asig.piezasAsignadas === 0) {
            asig.piezasAsignadas = maxPiezasAsignadas;
        }
    });

    console.log('[generarSeccionProcesosAsignados] Total asignaciones encontradas:', asignacionesOperador.length);

    if (asignacionesOperador.length === 0) {
        return `
            <div class="procesos-asignados-section">
                <h4 class="seccion-titulo"><i class="fas fa-tasks"></i> Procesos Asignados</h4>
                <div class="sin-asignaciones">
                    <i class="fas fa-inbox"></i>
                    <p>No hay procesos asignados actualmente</p>
                </div>
            </div>
        `;
    }

    // Ordenar por prioridad y estado
    const prioridadOrden = { 'alta': 0, 'media': 1, 'normal': 2, 'baja': 3 };
    const estadoOrden = { 'en_proceso': 0, 'iniciado': 0, 'asignado': 1, 'pendiente': 2, 'completado': 3 };

    asignacionesOperador.sort((a, b) => {
        const estadoA = estadoOrden[a.estado] ?? 2;
        const estadoB = estadoOrden[b.estado] ?? 2;
        if (estadoA !== estadoB) return estadoA - estadoB;

        const prioA = prioridadOrden[a.prioridad] ?? 2;
        const prioB = prioridadOrden[b.prioridad] ?? 2;
        return prioA - prioB;
    });

    const procesosHtml = asignacionesOperador.map(asig => {
        const pedido = pedidos.find(p => p.id == asig.pedidoId);
        const producto = productos.find(p => p.id == asig.productoId);
        const cliente = pedido ? clientes.find(c => c.id === pedido.clienteId) : null;
        const proceso = procesos.find(p => p.id == asig.procesoId);

        // Obtener piezas asignadas del pedido si no está definido
        let piezasTotal = asig.piezasAsignadas || 0;
        if (piezasTotal === 0 && pedido) {
            piezasTotal = pedido.productos?.[0]?.cantidad || pedido.cantidad || pedido.cantidadTotal || 0;
        }
        // También buscar en pedidos_erp
        if (piezasTotal === 0) {
            const pedidoERP = pedidosERP.find(p => p.id == asig.pedidoId);
            if (pedidoERP) {
                piezasTotal = pedidoERP.cantidad || 0;
            }
        }

        // Asegurar que piezasCompletadas sea un número
        const piezasCompletadas = asig.piezasCompletadas || 0;

        // Calcular avance
        const avance = piezasTotal > 0
            ? Math.round((piezasCompletadas / piezasTotal) * 100)
            : (piezasCompletadas > 0 ? 100 : 0);

        // Determinar clase de estado
        let estadoClass = 'pendiente';
        let estadoTexto = 'Pendiente';
        let estadoIcono = 'fa-clock';

        if (asig.estado === 'completado' || asig.estado === 'finalizado') {
            estadoClass = 'completado';
            estadoTexto = 'Completado';
            estadoIcono = 'fa-check-circle';
        } else if (asig.estado === 'en_proceso' || asig.estado === 'iniciado' || asig.estado === 'trabajando') {
            estadoClass = 'en-proceso';
            estadoTexto = 'En Proceso';
            estadoIcono = 'fa-cog fa-spin';
        } else if (asig.estado === 'asignado') {
            estadoClass = 'asignado';
            estadoTexto = 'Asignado';
            estadoIcono = 'fa-user-check';
        } else if (asig.estado === 'pausado') {
            estadoClass = 'pausado';
            estadoTexto = 'Pausado';
            estadoIcono = 'fa-pause-circle';
        }

        // Clase de prioridad
        const prioridadClass = asig.prioridad === 'alta' ? 'prioridad-alta' : asig.prioridad === 'baja' ? 'prioridad-baja' : '';

        // Indicador de activo, simultáneo o posición en cola
        let indicadorPosicion = '';
        if (asig.esSimultaneo) {
            indicadorPosicion = '<span class="proceso-simultaneo-badge"><i class="fas fa-layer-group"></i> Trabajo Simultáneo</span>';
        } else if (asig.esActivo) {
            indicadorPosicion = '<span class="proceso-activo-badge"><i class="fas fa-play"></i> ACTIVO</span>';
        } else if (asig.posicionCola) {
            indicadorPosicion = `<span class="proceso-cola-badge">En cola #${asig.posicionCola}</span>`;
        }

        return `
            <div class="proceso-asignado-card ${estadoClass} ${prioridadClass} ${asig.esActivo ? 'es-activo' : ''}">
                <div class="proceso-asignado-header">
                    <div class="proceso-estado-indicador">
                        <i class="fas ${estadoIcono}"></i>
                    </div>
                    <div class="proceso-info-principal">
                        <span class="proceso-nombre-asig">${asig.procesoNombre || proceso?.nombre || 'Proceso'}</span>
                        <span class="proceso-pedido">Pedido #${asig.pedidoId || 'N/A'} - ${cliente?.nombreComercial || 'Cliente'}</span>
                    </div>
                    <div class="proceso-badges">
                        ${indicadorPosicion}
                        <div class="proceso-estado-badge ${estadoClass}">
                            ${estadoTexto}
                        </div>
                    </div>
                </div>

                <div class="proceso-asignado-body">
                    <div class="proceso-producto">
                        <i class="fas fa-box"></i>
                        <span>${producto?.nombre || 'Producto'}</span>
                    </div>

                    <div class="proceso-avance-container">
                        <div class="proceso-avance-bar">
                            <div class="proceso-avance-fill ${estadoClass}" style="width: ${Math.min(avance, 100)}%"></div>
                        </div>
                        <div class="proceso-avance-texto">
                            <span class="piezas-completadas">${piezasCompletadas.toLocaleString()}</span>
                            <span class="piezas-separador">/</span>
                            <span class="piezas-total">${piezasTotal.toLocaleString()}</span>
                            <span class="piezas-porcentaje">(${Math.min(avance, 100)}%)</span>
                        </div>
                    </div>

                    ${asig.prioridad === 'alta' ? `
                        <div class="proceso-prioridad-badge alta">
                            <i class="fas fa-exclamation-triangle"></i> Prioridad Alta
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Resumen de estados
    const totalProcesos = asignacionesOperador.length;
    const enProceso = asignacionesOperador.filter(a => ['en_proceso', 'iniciado', 'trabajando'].includes(a.estado)).length;
    const pendientes = asignacionesOperador.filter(a => ['pendiente', 'asignado'].includes(a.estado)).length;
    const completados = asignacionesOperador.filter(a => ['completado', 'finalizado'].includes(a.estado)).length;

    return `
        <div class="procesos-asignados-section">
            <h4 class="seccion-titulo"><i class="fas fa-tasks"></i> Procesos Asignados (${totalProcesos})</h4>

            <div class="procesos-resumen-estados">
                <div class="estado-resumen en-proceso">
                    <span class="estado-numero">${enProceso}</span>
                    <span class="estado-label">En Proceso</span>
                </div>
                <div class="estado-resumen pendiente">
                    <span class="estado-numero">${pendientes}</span>
                    <span class="estado-label">Pendientes</span>
                </div>
                <div class="estado-resumen completado">
                    <span class="estado-numero">${completados}</span>
                    <span class="estado-label">Completados</span>
                </div>
            </div>

            <div class="procesos-asignados-lista">
                ${procesosHtml}
            </div>
        </div>
    `;
}

// Modal simplificado para posición sin operador
function showPosicionSinOperador(estacionId, estacion, personal) {
    console.log('[showPosicionSinOperador] Iniciando para estación:', estacionId);
    const operadoresDisponibles = personal.filter(p => p.rol === 'operador' && p.activo !== false);
    console.log('[showPosicionSinOperador] Operadores disponibles:', operadoresDisponibles.length);

    const content = `
        <div class="posicion-sin-operador">
            <div class="estacion-header-vacia">
                <div class="estacion-icono-vacio">
                    <i class="fas fa-desktop"></i>
                </div>
                <div class="estacion-info-vacia">
                    <h3>${estacion.nombre}</h3>
                    <span class="estacion-codigo">${estacionId}</span>
                    <span class="status-badge warning">Sin Asignar</span>
                </div>
            </div>

            <div class="mensaje-sin-operador">
                <i class="fas fa-user-plus"></i>
                <p>Esta estación no tiene operador asignado.</p>
                <p class="text-muted">Selecciona un operador para asignar a esta posición de trabajo.</p>
            </div>

            <div class="asignar-operador-form">
                <div class="form-group">
                    <label><i class="fas fa-user"></i> Seleccionar Operador</label>
                    <select id="selectOperadorAsignar" class="form-control">
                        <option value="">-- Seleccionar operador --</option>
                        ${operadoresDisponibles.map(op => `
                            <option value="${op.id}">
                                ${op.nombre}
                                ${op.posiciones && op.posiciones.length > 0 ?
                                    `(${op.posiciones.length} posición${op.posiciones.length > 1 ? 'es' : ''})` :
                                    '(Disponible)'}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <button class="btn btn-primary btn-block" onclick="asignarOperadorAEstacionDesdeModal('${estacionId}')">
                    <i class="fas fa-user-plus"></i> Asignar Operador
                </button>
            </div>
        </div>
    `;

    console.log('[showPosicionSinOperador] Abriendo modal');
    openModal(`Estación ${estacionId}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
    console.log('[showPosicionSinOperador] Modal abierto exitosamente');
}

// Asegurar que las funciones estén disponibles globalmente
if (typeof window !== 'undefined') {
    window.showPosicionDetalle = showPosicionDetalle;
    window.showPosicionSinOperador = showPosicionSinOperador;
    console.log('[app.js] Funciones de posición exportadas a window');
}

// Función para calcular estadísticas del empleado
function calcularEstadisticasEmpleado(operadorId, historialProduccion, produccionActiva) {
    // Valores por defecto
    const resultado = { piezasHoy: 0, piezasSemana: 0, efectividad: 0, tiempoPromedio: 0 };

    try {
        // Validar inputs
        if (!operadorId) return resultado;
        historialProduccion = historialProduccion || [];
        produccionActiva = produccionActiva || [];

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());

        // Producción de hoy (activa)
        let piezasHoy = 0;
        const produccionHoy = produccionActiva.find(p => p.operadorId === operadorId);
        if (produccionHoy) {
            piezasHoy = produccionHoy.piezasRealizadas || 0;
        }

        // Historial de hoy
        historialProduccion.forEach(h => {
            if (h.operadorId === operadorId && h.fecha) {
                try {
                    const fecha = new Date(h.fecha);
                    if (!isNaN(fecha.getTime())) {
                        fecha.setHours(0, 0, 0, 0);
                        if (fecha.getTime() === hoy.getTime()) {
                            piezasHoy += (h.piezasRealizadas || 0);
                        }
                    }
                } catch (e) { /* ignorar errores de fecha */ }
            }
        });

        // Producción de la semana
        let piezasSemana = piezasHoy;
        historialProduccion.forEach(h => {
            if (h.operadorId === operadorId && h.fecha) {
                try {
                    const fecha = new Date(h.fecha);
                    if (!isNaN(fecha.getTime()) && fecha >= inicioSemana) {
                        fecha.setHours(0, 0, 0, 0);
                        if (fecha.getTime() !== hoy.getTime()) {
                            piezasSemana += (h.piezasRealizadas || 0);
                        }
                    }
                } catch (e) { /* ignorar errores de fecha */ }
            }
        });

        // Efectividad promedio (últimos 7 días)
        let efectividadTotal = 0;
        let countEfectividad = 0;
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);

        historialProduccion.forEach(h => {
            if (h.operadorId === operadorId && h.fecha && h.efectividad) {
                try {
                    const fecha = new Date(h.fecha);
                    if (!isNaN(fecha.getTime()) && fecha >= hace7Dias) {
                        efectividadTotal += h.efectividad;
                        countEfectividad++;
                    }
                } catch (e) { /* ignorar errores de fecha */ }
            }
        });
        const efectividad = countEfectividad > 0 ? efectividadTotal / countEfectividad : 0;

        // Tiempo promedio por pieza
        let tiempoTotal = 0;
        let piezasTotales = 0;
        historialProduccion.forEach(h => {
            if (h.operadorId === operadorId && h.tiempoTotal && h.piezasRealizadas) {
                tiempoTotal += h.tiempoTotal;
                piezasTotales += h.piezasRealizadas;
            }
        });
        const tiempoPromedio = piezasTotales > 0 ? tiempoTotal / piezasTotales : 0;

        return { piezasHoy, piezasSemana, efectividad, tiempoPromedio };
    } catch (error) {
        console.warn('Error en calcularEstadisticasEmpleado:', error);
        return resultado;
    }
}

function asignarOperadorAEstacionDesdeModal(estacionId) {
    const select = document.getElementById('selectOperadorAsignar');
    const operadorId = parseInt(select.value);

    if (!operadorId) {
        showToast('Selecciona un operador', 'warning');
        return;
    }

    const empleado = db.getEmpleado(operadorId);
    if (!empleado) {
        showToast('Operador no encontrado', 'error');
        return;
    }

    // Asignar en la DB
    db.asignarOperadorAEstacion(estacionId, operadorId);

    // Actualizar posiciones del empleado
    const posiciones = empleado.posiciones || [];
    if (!posiciones.includes(estacionId)) {
        posiciones.push(estacionId);
        db.updateEmpleado(operadorId, { posiciones: posiciones });
    }

    // Crear estado en el mapa
    crearEstadoOperadorEnMapa(empleado, estacionId);

    // Sincronizar con paneles
    sincronizarEstacionesConPaneles();

    // Recargar mapa
    loadPlantMap();

    closeModal();
    showToast(`Operador ${empleado.nombre} asignado a estación ${estacionId}`, 'success');
}

function desasignarOperadorDeEstacion(estacionId) {
    const estacion = db.getEstacion(estacionId);
    if (!estacion || !estacion.operadorId) {
        showToast('No hay operador asignado', 'warning');
        return;
    }

    const empleado = db.getEmpleado(estacion.operadorId);

    // Desasignar de la estación
    db.asignarOperadorAEstacion(estacionId, null);

    // Quitar de las posiciones del empleado
    if (empleado && empleado.posiciones) {
        const posiciones = empleado.posiciones.filter(p => p !== estacionId);
        db.updateEmpleado(empleado.id, { posiciones: posiciones });
    }

    // Eliminar del estado del mapa
    eliminarEstadoOperadorDeMapa(estacionId);

    // Sincronizar con paneles
    sincronizarEstacionesConPaneles();

    // Recargar mapa
    loadPlantMap();

    closeModal();
    showToast(`Operador desasignado de estación ${estacionId}`, 'success');
}

// ========================================
// SECCIÓN PEDIDOS MEJORADA v2
// ========================================
function loadPedidosEnhanced() {
    const section = document.getElementById('section-pedidos');
    const pedidos = db.getPedidos();
    const clientes = db.getClientes();
    const productos = db.getProductos();

    // Calcular estadísticas de pedidos
    const pedidosPendientes = pedidos.filter(p => esPedidoPendiente(p)).length;
    const pedidosProduccion = filtrarPedidosActivos(pedidos).length;
    const pedidosCompletados = pedidos.filter(p => esPedidoCompletado(p)).length;
    const pedidosEntregados = pedidos.filter(p => (p.estado || '').toLowerCase() === 'entregado').length;

    section.innerHTML = `
        <div class="section-header">
            <h1>Gestión de Pedidos</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="exportPedidosToExcel()">
                    <i class="fas fa-file-excel"></i> Exportar
                </button>
                <button class="btn btn-primary" onclick="showNuevoPedidoModal()">
                    <i class="fas fa-plus"></i> Nuevo Pedido
                </button>
            </div>
        </div>

        <!-- KPIs de Pedidos -->
        <div class="pedidos-kpi-bar">
            <div class="pedido-kpi-item" onclick="filterPedidosTable('pendiente')">
                <span class="kpi-number warning">${pedidosPendientes}</span>
                <span class="kpi-text">Pendientes</span>
            </div>
            <div class="pedido-kpi-item" onclick="filterPedidosTable('produccion')">
                <span class="kpi-number info">${pedidosProduccion}</span>
                <span class="kpi-text">En Producción</span>
            </div>
            <div class="pedido-kpi-item" onclick="filterPedidosTable('completado')">
                <span class="kpi-number success">${pedidosCompletados}</span>
                <span class="kpi-text">Completados</span>
            </div>
            <div class="pedido-kpi-item" onclick="filterPedidosTable('entregado')">
                <span class="kpi-number secondary">${pedidosEntregados}</span>
                <span class="kpi-text">Entregados</span>
            </div>
        </div>

        <!-- Filtros -->
        <div class="pedidos-filters-bar">
            <div class="filter-group">
                <label><i class="fas fa-user"></i> Cliente</label>
                <select id="filterPedidoCliente" onchange="applyPedidosFilters()">
                    <option value="">Todos</option>
                    ${clientes.map(c => `<option value="${c.id}">${c.nombreComercial}</option>`).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label><i class="fas fa-flag"></i> Prioridad</label>
                <select id="filterPedidoPrioridad" onchange="applyPedidosFilters()">
                    <option value="">Todas</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                </select>
            </div>
            <div class="filter-group">
                <label><i class="fas fa-calendar"></i> Fecha Entrega</label>
                <select id="filterPedidoFecha" onchange="applyPedidosFilters()">
                    <option value="">Todas</option>
                    <option value="hoy">Hoy</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Este Mes</option>
                    <option value="atrasados">Atrasados</option>
                </select>
            </div>
            <div class="filter-group">
                <label><i class="fas fa-search"></i> Buscar</label>
                <input type="text" id="searchPedido" placeholder="# Pedido..." onkeyup="applyPedidosFilters()">
            </div>
            <button class="btn btn-secondary btn-sm" onclick="clearPedidosFilters()">
                <i class="fas fa-times"></i> Limpiar
            </button>
        </div>

        <!-- Tabla de Pedidos -->
        <div class="orders-table-container">
            <table class="data-table pedidos-enhanced-table" id="pedidosEnhancedTable">
                <thead>
                    <tr>
                        <th class="sortable" onclick="sortPedidosTable('id')">
                            # Pedido <i class="fas fa-sort"></i>
                        </th>
                        <th class="sortable" onclick="sortPedidosTable('cliente')">
                            Cliente <i class="fas fa-sort"></i>
                        </th>
                        <th>Productos</th>
                        <th class="sortable" onclick="sortPedidosTable('fechaEntrega')">
                            F. Entrega <i class="fas fa-sort"></i>
                        </th>
                        <th>Prioridad</th>
                        <th>Avance</th>
                        <th>Costo MO</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedidos.map(pedido => {
                        const cliente = clientes.find(c => c.id === pedido.clienteId);
                        const productosPedido = pedido.productos.map(p => {
                            const prod = productos.find(pr => pr.id === p.productoId);
                            return { ...p, nombre: prod ? prod.nombre : 'N/A' };
                        });

                        // Calcular avance general
                        const totalPiezas = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);
                        const totalCompletadas = pedido.productos.reduce((sum, p) => sum + p.completadas, 0);
                        const avance = totalPiezas > 0 ? Math.round((totalCompletadas / totalPiezas) * 100) : 0;

                        // Calcular costo MO estimado
                        const costoMO = calcularCostoMOPedido(pedido);

                        // Verificar si está atrasado
                        const hoy = new Date();
                        const fechaEntrega = new Date(pedido.fechaEntrega);
                        const atrasado = fechaEntrega < hoy && pedido.estado !== 'entregado' && pedido.estado !== 'completado';

                        return `
                            <tr data-pedido-id="${pedido.id}"
                                data-cliente="${pedido.clienteId}"
                                data-prioridad="${pedido.prioridad}"
                                data-estado="${pedido.estado}"
                                data-fecha="${pedido.fechaEntrega}"
                                class="${atrasado ? 'row-atrasado' : ''}">
                                <td>
                                    <strong class="pedido-number">#${pedido.id}</strong>
                                    <small class="pedido-fecha-carga">${formatDate(pedido.fechaCarga)}</small>
                                </td>
                                <td>
                                    <div class="cliente-cell">
                                        <span class="cliente-nombre">${cliente ? cliente.nombreComercial : 'N/A'}</span>
                                        <span class="cliente-tipo status-badge ${cliente?.tipo === 'estrategico' ? 'success' : 'info'}">${cliente?.tipo || ''}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="productos-cell">
                                        ${productosPedido.slice(0, 2).map(p => `
                                            <span class="producto-item" title="${p.nombre}">
                                                ${p.nombre.substring(0, 20)}${p.nombre.length > 20 ? '...' : ''}
                                                <small>(${p.cantidad})</small>
                                            </span>
                                        `).join('')}
                                        ${productosPedido.length > 2 ? `<span class="mas-productos">+${productosPedido.length - 2} más</span>` : ''}
                                    </div>
                                </td>
                                <td class="${atrasado ? 'fecha-atrasada' : ''}">
                                    <span class="fecha-entrega ${atrasado ? 'atrasado' : ''}">
                                        ${atrasado ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
                                        ${formatDate(pedido.fechaEntrega)}
                                    </span>
                                    ${atrasado ? `<small class="dias-atraso">${calcularDiasAtraso(pedido.fechaEntrega)} días</small>` : ''}
                                </td>
                                <td>
                                    <span class="status-badge ${pedido.prioridad === 'alta' ? 'danger' : pedido.prioridad === 'media' ? 'warning' : 'info'}">
                                        ${capitalizeFirst(pedido.prioridad)}
                                    </span>
                                </td>
                                <td>
                                    <div class="avance-cell">
                                        <div class="progress-bar-mini">
                                            <div class="progress ${avance >= 100 ? 'green' : avance >= 50 ? 'blue' : 'orange'}" style="width:${avance}%"></div>
                                        </div>
                                        <span class="avance-texto">${avance}%</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="costo-mo">$${costoMO.toLocaleString()}</span>
                                </td>
                                <td>
                                    <span class="status-badge ${getEstadoBadgeClass(pedido.estado)}">
                                        ${capitalizeFirst(pedido.estado)}
                                    </span>
                                </td>
                                <td>
                                    <div class="acciones-cell">
                                        <button class="btn-icon-small" onclick="viewPedidoTimeline(${pedido.id})" title="Ver Timeline">
                                            <i class="fas fa-clock"></i>
                                        </button>
                                        <button class="btn-icon-small" onclick="viewPedido(${pedido.id})" title="Ver Detalle">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-icon-small" onclick="showEditarPedido(${pedido.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn-icon-small danger" onclick="deletePedido(${pedido.id})" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Calcular costo de mano de obra de un pedido
function calcularCostoMOPedido(pedido) {
    const productos = db.getProductos();
    const personal = db.getPersonal();
    const salarioPromedio = personal.filter(p => p.rol === 'operador').reduce((sum, p) => sum + p.salarioHora, 0) /
                           personal.filter(p => p.rol === 'operador').length || 50;

    let costoTotal = 0;
    pedido.productos.forEach(p => {
        const producto = productos.find(pr => pr.id === p.productoId);
        if (producto) {
            const tiempoMinutos = producto.tiempoTotal * p.cantidad;
            const tiempoHoras = tiempoMinutos / 60;
            costoTotal += tiempoHoras * salarioPromedio;
        }
    });

    return Math.round(costoTotal);
}

// Calcular días de atraso
function calcularDiasAtraso(fechaEntrega) {
    const hoy = new Date();
    const fecha = new Date(fechaEntrega);
    const diff = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
    return diff;
}

// Filtrar tabla de pedidos por estado
function filterPedidosTable(estado) {
    const rows = document.querySelectorAll('#pedidosEnhancedTable tbody tr');
    rows.forEach(row => {
        if (!estado || row.dataset.estado === estado) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Resaltar KPI activo
    document.querySelectorAll('.pedido-kpi-item').forEach(item => item.classList.remove('active'));
    if (estado) {
        event.currentTarget.classList.add('active');
    }
}

// Aplicar filtros de pedidos
function applyPedidosFilters() {
    const clienteFilter = document.getElementById('filterPedidoCliente').value;
    const prioridadFilter = document.getElementById('filterPedidoPrioridad').value;
    const fechaFilter = document.getElementById('filterPedidoFecha').value;
    const searchFilter = document.getElementById('searchPedido').value.toLowerCase();

    const hoy = new Date();
    const rows = document.querySelectorAll('#pedidosEnhancedTable tbody tr');

    rows.forEach(row => {
        let show = true;

        // Filtro por cliente
        if (clienteFilter && row.dataset.cliente !== clienteFilter) {
            show = false;
        }

        // Filtro por prioridad
        if (prioridadFilter && row.dataset.prioridad !== prioridadFilter) {
            show = false;
        }

        // Filtro por fecha
        if (fechaFilter) {
            const fechaEntrega = new Date(row.dataset.fecha);
            switch(fechaFilter) {
                case 'hoy':
                    if (fechaEntrega.toDateString() !== hoy.toDateString()) show = false;
                    break;
                case 'semana':
                    const inicioSemana = new Date(hoy);
                    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
                    const finSemana = new Date(inicioSemana);
                    finSemana.setDate(inicioSemana.getDate() + 6);
                    if (fechaEntrega < inicioSemana || fechaEntrega > finSemana) show = false;
                    break;
                case 'mes':
                    if (fechaEntrega.getMonth() !== hoy.getMonth() || fechaEntrega.getFullYear() !== hoy.getFullYear()) show = false;
                    break;
                case 'atrasados':
                    if (fechaEntrega >= hoy || row.dataset.estado === 'entregado' || row.dataset.estado === 'completado') show = false;
                    break;
            }
        }

        // Filtro por búsqueda
        if (searchFilter) {
            const pedidoId = row.dataset.pedidoId;
            if (!pedidoId.includes(searchFilter)) show = false;
        }

        row.style.display = show ? '' : 'none';
    });
}

// Limpiar filtros
function clearPedidosFilters() {
    document.getElementById('filterPedidoCliente').value = '';
    document.getElementById('filterPedidoPrioridad').value = '';
    document.getElementById('filterPedidoFecha').value = '';
    document.getElementById('searchPedido').value = '';

    document.querySelectorAll('#pedidosEnhancedTable tbody tr').forEach(row => {
        row.style.display = '';
    });

    document.querySelectorAll('.pedido-kpi-item').forEach(item => item.classList.remove('active'));
}

// Ordenar tabla de pedidos
function sortPedidosTable(column) {
    const table = document.getElementById('pedidosEnhancedTable');
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // Toggle dirección de ordenamiento
    table.dataset.sortDir = table.dataset.sortCol === column && table.dataset.sortDir === 'asc' ? 'desc' : 'asc';
    table.dataset.sortCol = column;

    const dir = table.dataset.sortDir === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
        let aVal, bVal;
        switch(column) {
            case 'id':
                aVal = parseInt(a.dataset.pedidoId);
                bVal = parseInt(b.dataset.pedidoId);
                break;
            case 'cliente':
                aVal = a.querySelector('.cliente-nombre').textContent;
                bVal = b.querySelector('.cliente-nombre').textContent;
                break;
            case 'fechaEntrega':
                aVal = new Date(a.dataset.fecha);
                bVal = new Date(b.dataset.fecha);
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
    });

    rows.forEach(row => tbody.appendChild(row));
}

// Vista de Timeline del pedido
function viewPedidoTimeline(id) {
    const pedido = db.getPedido(id);
    const cliente = db.getCliente(pedido.clienteId);
    const productos = db.getProductos();

    // Generar timeline de procesos para cada producto
    const timelineContent = pedido.productos.map(p => {
        const prod = productos.find(pr => pr.id === p.productoId);
        const avanceProcesos = p.avanceProcesos || [];

        return `
            <div class="timeline-producto">
                <h4><i class="fas fa-box"></i> ${prod ? prod.nombre : 'N/A'}</h4>
                <div class="timeline-info">
                    <span>${p.completadas} / ${p.cantidad} piezas (${Math.round((p.completadas/p.cantidad)*100)}%)</span>
                </div>
                <div class="timeline-container">
                    ${avanceProcesos.length > 0 ? avanceProcesos.map((proc, idx) => {
                        const porcentaje = Math.round((proc.completadas / p.cantidad) * 100);
                        return `
                            <div class="timeline-step ${proc.estado}">
                                <div class="timeline-dot">
                                    ${proc.estado === 'completado' ? '<i class="fas fa-check"></i>' :
                                      proc.estado === 'en_proceso' ? '<i class="fas fa-spinner fa-spin"></i>' :
                                      '<i class="fas fa-circle"></i>'}
                                </div>
                                <div class="timeline-content">
                                    <span class="timeline-orden">${proc.procesoOrden}</span>
                                    <span class="timeline-nombre">${proc.nombre}</span>
                                    <span class="timeline-avance">${proc.completadas}/${p.cantidad} (${porcentaje}%)</span>
                                </div>
                                ${idx < avanceProcesos.length - 1 ? '<div class="timeline-line"></div>' : ''}
                            </div>
                        `;
                    }).join('') : '<p class="text-muted">Sin información de procesos</p>'}
                </div>
            </div>
        `;
    }).join('');

    const content = `
        <div class="pedido-timeline-header">
            <div class="timeline-info-row">
                <span><i class="fas fa-user"></i> ${cliente ? cliente.nombreComercial : 'N/A'}</span>
                <span><i class="fas fa-calendar-plus"></i> Carga: ${formatDate(pedido.fechaCarga)}</span>
                <span><i class="fas fa-calendar-check"></i> Entrega: ${formatDate(pedido.fechaEntrega)}</span>
                <span class="status-badge ${getEstadoBadgeClass(pedido.estado)}">${capitalizeFirst(pedido.estado)}</span>
            </div>
        </div>

        <div class="pedido-timeline-body">
            ${timelineContent}
        </div>

        ${pedido.notas ? `<div class="pedido-notas mt-2"><strong>Notas:</strong> ${pedido.notas}</div>` : ''}
    `;

    openModal(`Timeline Pedido #${id}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Eliminar pedido
function deletePedido(id) {
    if (confirm('¿Está seguro de eliminar este pedido? Esta acción no se puede deshacer.')) {
        db.deletePedido(id);
        loadPedidos();
        showToast('Pedido eliminado');
    }
}

// Exportar pedidos a Excel
function exportPedidosToExcel() {
    const table = document.getElementById('pedidosEnhancedTable');
    if (table) {
        exportTableToExcel('pedidosEnhancedTable', 'pedidos');
        showToast('Exportación completada');
    }
}

// ========================================
// SECCIÓN CLIENTES MEJORADA v2
// ========================================
function loadClientesEnhanced() {
    const section = document.getElementById('section-clientes');
    const clientes = db.getClientes();
    const productos = db.getProductos();
    const pedidos = db.getPedidos();

    section.innerHTML = `
        <div class="section-header">
            <h1>Gestión de Clientes</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="exportClientesToExcel()">
                    <i class="fas fa-file-excel"></i> Exportar
                </button>
                <button class="btn btn-primary" onclick="showNuevoClienteEnhancedModal()">
                    <i class="fas fa-plus"></i> Nuevo Cliente
                </button>
            </div>
        </div>

        <!-- Filtros -->
        <div class="clientes-filters-bar">
            <div class="filter-group">
                <label>Tipo</label>
                <select id="filterClienteTipo" onchange="applyClientesFilters()">
                    <option value="">Todos</option>
                    <option value="estrategico">Estratégico</option>
                    <option value="externo">Externo</option>
                    <option value="interno">Interno</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Portal</label>
                <select id="filterClientePortal" onchange="applyClientesFilters()">
                    <option value="">Todos</option>
                    <option value="true">Con Acceso</option>
                    <option value="false">Sin Acceso</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Buscar</label>
                <input type="text" id="searchCliente" placeholder="Nombre, RFC..." onkeyup="applyClientesFilters()">
            </div>
        </div>

        <!-- Grid de Clientes -->
        <div class="cards-grid clientes-grid" id="clientesGrid">
            ${clientes.map(cliente => {
                const articulosFrecuentes = cliente.articulosFrecuentes || [];
                const pedidosCliente = pedidos.filter(p => p.clienteId === cliente.id);
                const pedidosActivos = pedidosCliente.filter(p => esPedidoActivo(p) || esPedidoPendiente(p)).length;

                return `
                <div class="card cliente-card-enhanced"
                     data-tipo="${cliente.tipo}"
                     data-portal="${cliente.accesoPortal}"
                     data-nombre="${cliente.nombreComercial.toLowerCase()} ${cliente.razonSocial.toLowerCase()} ${cliente.rfc || ''}">
                    <div class="card-header">
                        <span class="card-title">${cliente.nombreComercial}</span>
                        <span class="status-badge ${cliente.tipo === 'estrategico' ? 'success' : cliente.tipo === 'interno' ? 'info' : 'warning'}">${cliente.tipo}</span>
                    </div>

                    <p class="cliente-razon-social">${cliente.razonSocial}</p>
                    ${cliente.rfc ? `<p class="cliente-rfc"><i class="fas fa-id-card"></i> ${cliente.rfc}</p>` : ''}

                    <div class="cliente-contacto mb-1">
                        <div><i class="fas fa-user"></i> ${cliente.contacto}</div>
                        <div><i class="fas fa-envelope"></i> ${cliente.email}</div>
                        <div><i class="fas fa-phone"></i> ${cliente.telefono || 'N/A'}</div>
                    </div>

                    ${cliente.direccion ? `
                        <div class="cliente-direccion">
                            <i class="fas fa-map-marker-alt"></i> ${cliente.direccion}
                        </div>
                    ` : ''}

                    <div class="cliente-stats-mini">
                        <div class="stat-mini">
                            <span class="stat-value">${pedidosCliente.length}</span>
                            <span class="stat-label">Pedidos</span>
                        </div>
                        <div class="stat-mini">
                            <span class="stat-value ${pedidosActivos > 0 ? 'text-info' : ''}">${pedidosActivos}</span>
                            <span class="stat-label">Activos</span>
                        </div>
                        <div class="stat-mini">
                            <span class="stat-value">${articulosFrecuentes.length}</span>
                            <span class="stat-label">Artículos</span>
                        </div>
                    </div>

                    <div class="d-flex justify-between align-center mt-2">
                        <span class="portal-status ${cliente.accesoPortal ? 'active' : ''}">
                            <i class="fas fa-${cliente.accesoPortal ? 'check-circle' : 'times-circle'}"></i>
                            Portal ${cliente.accesoPortal ? 'Activo' : 'Inactivo'}
                        </span>
                        <div class="acciones-cell">
                            <button class="btn-icon-small" onclick="viewClienteDetalle(${cliente.id})" title="Ver detalle">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon-small" onclick="editClienteEnhanced(${cliente.id})" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon-small danger" onclick="deleteCliente(${cliente.id})" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

// Aplicar filtros de clientes
function applyClientesFilters() {
    const tipoFilter = document.getElementById('filterClienteTipo').value;
    const portalFilter = document.getElementById('filterClientePortal').value;
    const searchFilter = document.getElementById('searchCliente').value.toLowerCase();

    const cards = document.querySelectorAll('#clientesGrid .cliente-card-enhanced');

    cards.forEach(card => {
        let show = true;

        if (tipoFilter && card.dataset.tipo !== tipoFilter) {
            show = false;
        }

        if (portalFilter && card.dataset.portal !== portalFilter) {
            show = false;
        }

        if (searchFilter && !card.dataset.nombre.includes(searchFilter)) {
            show = false;
        }

        card.style.display = show ? '' : 'none';
    });
}

// Modal de nuevo cliente mejorado
function showNuevoClienteEnhancedModal() {
    const content = `
        <form id="nuevoClienteEnhancedForm">
            <div class="form-section">
                <h4><i class="fas fa-building"></i> Datos Fiscales</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Razón Social *</label>
                        <input type="text" name="razonSocial" required>
                    </div>
                    <div class="form-group">
                        <label>Nombre Comercial *</label>
                        <input type="text" name="nombreComercial" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>RFC</label>
                        <input type="text" name="rfc" placeholder="XXX000000XXX" maxlength="13"
                               oninput="validateRFC(this)">
                        <small class="text-muted">13 caracteres para personas morales</small>
                    </div>
                    <div class="form-group">
                        <label>Tipo de Cliente *</label>
                        <select name="tipo" required>
                            <option value="externo">Externo</option>
                            <option value="estrategico">Estratégico</option>
                            <option value="interno">Interno</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4><i class="fas fa-user"></i> Contacto Principal</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" name="contacto" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="telefono" placeholder="55 1234 5678">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Alternativo</label>
                        <input type="tel" name="telefonoAlt" placeholder="55 8765 4321">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4><i class="fas fa-map-marker-alt"></i> Dirección</h4>
                <div class="form-group">
                    <label>Calle y Número</label>
                    <input type="text" name="calle" placeholder="Av. Reforma 123">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Colonia</label>
                        <input type="text" name="colonia">
                    </div>
                    <div class="form-group">
                        <label>C.P.</label>
                        <input type="text" name="cp" maxlength="5">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ciudad</label>
                        <input type="text" name="ciudad">
                    </div>
                    <div class="form-group">
                        <label>Estado</label>
                        <input type="text" name="estado">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4><i class="fas fa-globe"></i> Portal de Clientes</h4>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="accesoPortal" id="accesoPortalCheck"
                               onchange="togglePortalFields(this.checked)">
                        Habilitar acceso al portal de clientes
                    </label>
                </div>
                <div id="portalFieldsContainer" style="display:none">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Usuario</label>
                            <input type="text" name="usuario" placeholder="usuario123">
                        </div>
                        <div class="form-group">
                            <label>Contraseña Temporal</label>
                            <input type="password" name="password" placeholder="••••••••">
                        </div>
                    </div>
                </div>
            </div>
        </form>
    `;

    openModal('Nuevo Cliente', content, () => {
        const form = document.getElementById('nuevoClienteEnhancedForm');
        const formData = new FormData(form);

        // Construir dirección completa
        const direccion = [
            formData.get('calle'),
            formData.get('colonia'),
            formData.get('cp') ? `C.P. ${formData.get('cp')}` : '',
            formData.get('ciudad'),
            formData.get('estado')
        ].filter(Boolean).join(', ');

        const cliente = {
            razonSocial: formData.get('razonSocial'),
            nombreComercial: formData.get('nombreComercial'),
            rfc: formData.get('rfc')?.toUpperCase() || null,
            tipo: formData.get('tipo'),
            contacto: formData.get('contacto'),
            email: formData.get('email'),
            telefono: formData.get('telefono') || '',
            telefonoAlt: formData.get('telefonoAlt') || '',
            direccion: direccion,
            accesoPortal: form.querySelector('#accesoPortalCheck').checked,
            usuario: formData.get('usuario') || null
        };

        db.addCliente(cliente);
        loadClientes();
        closeModal();
        showToast('Cliente agregado correctamente');
    });
}

// Toggle campos de portal
function togglePortalFields(checked) {
    const container = document.getElementById('portalFieldsContainer');
    container.style.display = checked ? 'block' : 'none';
}

// Validar RFC
function validateRFC(input) {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Ver detalle de cliente
function viewClienteDetalle(id) {
    const cliente = db.getCliente(id);
    const pedidos = db.getPedidosByCliente(id);
    const productos = db.getProductosByCliente(id);
    const articulosFrecuentes = cliente.articulosFrecuentes || [];

    // Calcular estadísticas
    const totalVentas = pedidos.reduce((sum, p) => {
        return sum + p.productos.reduce((s, prod) => s + (prod.cantidad * (prod.precioUnitario || 0)), 0);
    }, 0);

    const pedidosCompletados = pedidos.filter(p => p.estado === 'completado' || p.estado === 'entregado').length;
    const pedidosActivos = pedidos.filter(p => esPedidoActivo(p) || esPedidoPendiente(p)).length;

    const content = `
        <div class="cliente-detalle-header">
            <div class="cliente-info-principal">
                <h3>${cliente.razonSocial}</h3>
                <p class="text-muted">${cliente.nombreComercial}</p>
                ${cliente.rfc ? `<p><strong>RFC:</strong> ${cliente.rfc}</p>` : ''}
            </div>
            <span class="status-badge large ${cliente.tipo === 'estrategico' ? 'success' : 'info'}">${capitalizeFirst(cliente.tipo)}</span>
        </div>

        <div class="cliente-stats-grid">
            <div class="stat-card">
                <span class="stat-icon"><i class="fas fa-file-invoice"></i></span>
                <div>
                    <span class="stat-value">${pedidos.length}</span>
                    <span class="stat-label">Pedidos Totales</span>
                </div>
            </div>
            <div class="stat-card">
                <span class="stat-icon info"><i class="fas fa-clock"></i></span>
                <div>
                    <span class="stat-value">${pedidosActivos}</span>
                    <span class="stat-label">Pedidos Activos</span>
                </div>
            </div>
            <div class="stat-card">
                <span class="stat-icon success"><i class="fas fa-check-circle"></i></span>
                <div>
                    <span class="stat-value">${pedidosCompletados}</span>
                    <span class="stat-label">Completados</span>
                </div>
            </div>
            <div class="stat-card">
                <span class="stat-icon green"><i class="fas fa-dollar-sign"></i></span>
                <div>
                    <span class="stat-value">$${totalVentas.toLocaleString()}</span>
                    <span class="stat-label">Ventas Totales</span>
                </div>
            </div>
        </div>

        <div class="cliente-info-grid mt-2">
            <div class="info-section">
                <h4><i class="fas fa-user"></i> Contacto</h4>
                <p><strong>Nombre:</strong> ${cliente.contacto}</p>
                <p><strong>Email:</strong> ${cliente.email}</p>
                <p><strong>Teléfono:</strong> ${cliente.telefono || 'N/A'}</p>
                ${cliente.telefonoAlt ? `<p><strong>Tel. Alternativo:</strong> ${cliente.telefonoAlt}</p>` : ''}
            </div>
            <div class="info-section">
                <h4><i class="fas fa-map-marker-alt"></i> Dirección</h4>
                <p>${cliente.direccion || 'Sin dirección registrada'}</p>
            </div>
        </div>

        ${articulosFrecuentes.length > 0 ? `
            <div class="articulos-section mt-2">
                <h4><i class="fas fa-star"></i> Artículos Frecuentes</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Último Precio</th>
                            <th>Notas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${articulosFrecuentes.map(art => {
                            const prod = productos.find(p => p.id === art.productoId);
                            return `
                                <tr>
                                    <td>${prod ? prod.nombre : 'N/A'}</td>
                                    <td>$${(art.ultimoPrecio || 0).toFixed(2)}</td>
                                    <td>${art.notas || '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}

        <div class="info-footer mt-2">
            <span class="text-muted"><i class="fas fa-calendar"></i> Alta: ${formatDate(cliente.fechaAlta)}</span>
            <span class="portal-status ${cliente.accesoPortal ? 'active' : ''}">
                <i class="fas fa-globe"></i> Portal: ${cliente.accesoPortal ? 'Activo' : 'Inactivo'}
            </span>
        </div>
    `;

    openModal(cliente.nombreComercial, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Editar cliente mejorado
function editClienteEnhanced(id) {
    const cliente = db.getCliente(id);

    // Separar dirección si existe
    const direccionParts = (cliente.direccion || '').split(', ');

    const content = `
        <form id="editarClienteEnhancedForm">
            <div class="form-section">
                <h4><i class="fas fa-building"></i> Datos Fiscales</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Razón Social *</label>
                        <input type="text" name="razonSocial" value="${cliente.razonSocial}" required>
                    </div>
                    <div class="form-group">
                        <label>Nombre Comercial *</label>
                        <input type="text" name="nombreComercial" value="${cliente.nombreComercial}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>RFC</label>
                        <input type="text" name="rfc" value="${cliente.rfc || ''}" maxlength="13" oninput="validateRFC(this)">
                    </div>
                    <div class="form-group">
                        <label>Tipo de Cliente *</label>
                        <select name="tipo" required>
                            <option value="externo" ${cliente.tipo === 'externo' ? 'selected' : ''}>Externo</option>
                            <option value="estrategico" ${cliente.tipo === 'estrategico' ? 'selected' : ''}>Estratégico</option>
                            <option value="interno" ${cliente.tipo === 'interno' ? 'selected' : ''}>Interno</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4><i class="fas fa-user"></i> Contacto</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre *</label>
                        <input type="text" name="contacto" value="${cliente.contacto}" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" value="${cliente.email}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="telefono" value="${cliente.telefono || ''}">
                    </div>
                    <div class="form-group">
                        <label>Teléfono Alt.</label>
                        <input type="tel" name="telefonoAlt" value="${cliente.telefonoAlt || ''}">
                    </div>
                </div>
            </div>

            <div class="form-section">
                <h4><i class="fas fa-map-marker-alt"></i> Dirección</h4>
                <div class="form-group">
                    <label>Dirección Completa</label>
                    <input type="text" name="direccion" value="${cliente.direccion || ''}">
                </div>
            </div>

            <div class="form-section">
                <h4><i class="fas fa-globe"></i> Portal</h4>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" name="accesoPortal" ${cliente.accesoPortal ? 'checked' : ''}>
                        Acceso al portal habilitado
                    </label>
                </div>
            </div>
        </form>
    `;

    openModal('Editar Cliente', content, () => {
        const form = document.getElementById('editarClienteEnhancedForm');
        const formData = new FormData(form);

        const updates = {
            razonSocial: formData.get('razonSocial'),
            nombreComercial: formData.get('nombreComercial'),
            rfc: formData.get('rfc')?.toUpperCase() || null,
            tipo: formData.get('tipo'),
            contacto: formData.get('contacto'),
            email: formData.get('email'),
            telefono: formData.get('telefono') || '',
            telefonoAlt: formData.get('telefonoAlt') || '',
            direccion: formData.get('direccion') || '',
            accesoPortal: form.querySelector('[name="accesoPortal"]').checked
        };

        db.updateCliente(id, updates);
        loadClientes();
        closeModal();
        showToast('Cliente actualizado');
    });
}

// Exportar clientes a Excel
function exportClientesToExcel() {
    const clientes = db.getClientes();

    // Crear tabla temporal para exportar
    const tempTable = document.createElement('table');
    tempTable.innerHTML = `
        <thead>
            <tr>
                <th>Nombre Comercial</th>
                <th>Razón Social</th>
                <th>RFC</th>
                <th>Tipo</th>
                <th>Contacto</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Portal</th>
            </tr>
        </thead>
        <tbody>
            ${clientes.map(c => `
                <tr>
                    <td>${c.nombreComercial}</td>
                    <td>${c.razonSocial}</td>
                    <td>${c.rfc || ''}</td>
                    <td>${c.tipo}</td>
                    <td>${c.contacto}</td>
                    <td>${c.email}</td>
                    <td>${c.telefono || ''}</td>
                    <td>${c.direccion || ''}</td>
                    <td>${c.accesoPortal ? 'Sí' : 'No'}</td>
                </tr>
            `).join('')}
        </tbody>
    `;

    tempTable.id = 'tempClientesTable';
    document.body.appendChild(tempTable);
    tempTable.style.display = 'none';

    exportTableToExcel('tempClientesTable', 'clientes');

    document.body.removeChild(tempTable);
    showToast('Exportación completada');
}

// ========================================
// SECCIÓN PRODUCTOS MEJORADA v2
// ========================================
function loadProductosEnhanced() {
    const section = document.getElementById('section-productos');
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const familias = db.getFamilias();
    const subfamilias = db.getSubfamilias();

    // Estadísticas
    const productosActivos = productos.filter(p => p.activo).length;
    const productosPorFamilia = familias.map(f => ({
        ...f,
        count: productos.filter(p => p.familiaId === f.id).length
    }));

    section.innerHTML = `
        <div class="section-header">
            <h1>Catálogo de Productos</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="showInventarioGeneralModal()">
                    <i class="fas fa-warehouse"></i> Inventario Piezas
                </button>
                <button class="btn btn-secondary" onclick="showFamiliasModal()">
                    <i class="fas fa-tags"></i> Gestionar Familias
                </button>
                <button class="btn btn-secondary" onclick="exportProductosToExcel()">
                    <i class="fas fa-file-excel"></i> Exportar
                </button>
                <button class="btn btn-primary" onclick="showNuevoProductoModal()">
                    <i class="fas fa-plus"></i> Nuevo Producto
                </button>
            </div>
        </div>

        <!-- Stats Bar -->
        <div class="productos-stats-bar">
            <div class="stat-pill">
                <span class="stat-value">${productos.length}</span>
                <span class="stat-label">Total</span>
            </div>
            <div class="stat-pill active">
                <span class="stat-value">${productosActivos}</span>
                <span class="stat-label">Activos</span>
            </div>
            ${productosPorFamilia.map(f => `
                <div class="stat-pill" style="border-color: ${f.color}">
                    <span class="stat-value" style="color: ${f.color}">${f.count}</span>
                    <span class="stat-label">${f.nombre}</span>
                </div>
            `).join('')}
        </div>

        <!-- Filtros -->
        <div class="filtros-productos enhanced">
            <div class="form-group">
                <label>Cliente</label>
                <select id="filterCliente" onchange="filterProductos()">
                    <option value="">Todos</option>
                    ${clientes.map(c => `<option value="${c.id}">${c.nombreComercial}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Familia</label>
                <select id="filterFamilia" onchange="filterProductos(); updateSubfamiliaFilter()">
                    <option value="">Todas</option>
                    ${familias.map(f => `<option value="${f.id}">${f.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Subfamilia</label>
                <select id="filterSubfamilia" onchange="filterProductos()">
                    <option value="">Todas</option>
                    ${subfamilias.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Estado</label>
                <select id="filterEstadoProd" onchange="filterProductos()">
                    <option value="">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                </select>
            </div>
            <div class="form-group">
                <label>Buscar</label>
                <input type="text" id="searchProducto" placeholder="Nombre..." onkeyup="filterProductos()">
            </div>
        </div>

        <!-- Grid de Productos -->
        <div class="cards-grid productos-grid" id="productosGrid">
            ${renderProductosEnhanced(productos, clientes, familias, subfamilias)}
        </div>
    `;
}

function renderProductosEnhanced(productos, clientes, familias, subfamilias) {
    return productos.map(producto => {
        const cliente = clientes.find(c => c.id === producto.clienteId);
        const familia = familias.find(f => f.id === producto.familiaId);
        const subfamilia = subfamilias.find(s => s.id === producto.subfamiliaId);
        const rutaProcesos = producto.rutaProcesos || [];
        const procesosHabilitados = rutaProcesos.filter(p => p.habilitado);

        return `
            <div class="card producto-card-enhanced"
                 data-cliente="${producto.clienteId}"
                 data-familia="${producto.familiaId || ''}"
                 data-subfamilia="${producto.subfamiliaId || ''}"
                 data-estado="${producto.activo ? 'activo' : 'inactivo'}"
                 data-nombre="${producto.nombre.toLowerCase()}">

                <div class="card-header">
                    <span class="card-title">${producto.nombre}</span>
                    <span class="status-badge info">v${producto.version}</span>
                </div>

                ${producto.imagen ? `
                    <div class="producto-imagen">
                        <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.parentElement.innerHTML='<div class=\\'producto-imagen-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">
                    </div>
                ` : `
                    <div class="producto-imagen-placeholder">
                        <i class="fas fa-image"></i>
                    </div>
                `}

                <div class="producto-meta">
                    <span class="cliente-badge">${cliente ? cliente.nombreComercial : 'N/A'}</span>
                    ${familia ? `<span class="familia-badge" style="background-color: ${familia.color}20; color: ${familia.color}; border: 1px solid ${familia.color}">${familia.nombre}</span>` : ''}
                </div>

                <div class="producto-specs">
                    <div class="spec-item">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${producto.medidas || 'N/A'}</span>
                    </div>
                    <div class="spec-item precio-destacado">
                        <i class="fas fa-tag"></i>
                        <span>$${(producto.precioVenta || 0).toFixed(2)}</span>
                    </div>
                    <div class="spec-item">
                        <i class="fas fa-clock"></i>
                        <span>${producto.tiempoTotal} min/pza</span>
                    </div>
                    <div class="spec-item">
                        <i class="fas fa-tasks"></i>
                        <span>${procesosHabilitados.length} procesos</span>
                    </div>
                </div>

                ${producto.comentarios ? `
                    <div class="producto-nota">
                        <i class="fas fa-sticky-note"></i>
                        ${producto.comentarios.substring(0, 60)}${producto.comentarios.length > 60 ? '...' : ''}
                    </div>
                ` : ''}

                <div class="producto-footer">
                    <span class="status-badge ${producto.activo ? 'success' : 'secondary'}">
                        ${producto.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <div class="acciones-cell">
                        <button class="btn-icon-small" onclick="viewProductoDetalle(${producto.id})" title="Ver detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon-small" onclick="editProducto(${producto.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon-small" onclick="duplicarProducto(${producto.id})" title="Duplicar">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn-icon-small" onclick="editRutaProcesos(${producto.id})" title="Ruta">
                            <i class="fas fa-route"></i>
                        </button>
                        <button class="btn-icon-small inventario-btn" onclick="gestionarInventarioPiezas(${producto.id})" title="Inventario Piezas">
                            <i class="fas fa-cubes"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Vista detallada de producto con ruta de producción visual
function viewProductoDetalle(id) {
    const producto = db.getProducto(id);
    const cliente = db.getCliente(producto.clienteId);
    const familia = db.getFamilias().find(f => f.id === producto.familiaId);
    const subfamilia = db.getSubfamilias().find(s => s.id === producto.subfamiliaId);
    const rutaProcesos = producto.rutaProcesos || [];
    const listaMateriales = producto.materiales || producto.listaMateriales || [];
    const descripcionTecnica = producto.descripcionTecnica || [];
    const costosMO = producto.costosMO || {};

    // Calcular costo de MO total
    const costoMOTotal = (costosMO.corte || 0) + (costosMO.costura || 0) +
                         (costosMO.serigrafia || 0) + (costosMO.empaque || 0);

    const content = `
        <div class="producto-detalle-full">
            <div class="detalle-header-grid">
                ${producto.imagen ? `
                    <div class="producto-imagen-grande">
                        <img src="${producto.imagen}" alt="${producto.nombre}">
                    </div>
                ` : ''}
                <div class="producto-info-principal">
                    <h3>${producto.nombre}</h3>
                    <p class="text-muted">${cliente?.nombreComercial || 'N/A'}</p>
                    <div class="categorias-badges">
                        ${familia ? `<span class="familia-badge large" style="background: ${familia.color}20; color: ${familia.color}; border: 1px solid ${familia.color}">${familia.nombre}</span>` : ''}
                        ${subfamilia ? `<span class="subfamilia-badge">${subfamilia.nombre}</span>` : ''}
                    </div>

                    <div class="specs-grid mt-2">
                        <div class="spec-box">
                            <span class="spec-value">${producto.medidas || 'N/A'}</span>
                            <span class="spec-label">Medidas</span>
                        </div>
                        <div class="spec-box highlight">
                            <span class="spec-value">$${(producto.precioVenta || 0).toFixed(2)}</span>
                            <span class="spec-label">Precio Venta</span>
                        </div>
                        <div class="spec-box">
                            <span class="spec-value">${producto.mtsPorPieza || 0}</span>
                            <span class="spec-label">Mts/Pieza</span>
                        </div>
                        <div class="spec-box">
                            <span class="spec-value">${producto.tiempoTotal || 0} min</span>
                            <span class="spec-label">Tiempo/pza</span>
                        </div>
                        <div class="spec-box">
                            <span class="spec-value">${rutaProcesos.filter(p => p.habilitado).length}</span>
                            <span class="spec-label">Procesos</span>
                        </div>
                        <div class="spec-box">
                            <span class="spec-value">v${producto.version || 1}</span>
                            <span class="spec-label">Versión</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Costos de Mano de Obra -->
            ${costoMOTotal > 0 ? `
                <div class="info-block mt-2">
                    <h4><i class="fas fa-hand-holding-usd"></i> Costos de Mano de Obra (por pieza)</h4>
                    <div class="mo-display-grid">
                        <div class="mo-display-item">
                            <i class="fas fa-cut"></i>
                            <span class="mo-label">Corte</span>
                            <span class="mo-value">$${(costosMO.corte || 0).toFixed(2)}</span>
                        </div>
                        <div class="mo-display-item">
                            <i class="fas fa-tshirt"></i>
                            <span class="mo-label">Costura</span>
                            <span class="mo-value">$${(costosMO.costura || 0).toFixed(2)}</span>
                        </div>
                        <div class="mo-display-item">
                            <i class="fas fa-paint-brush"></i>
                            <span class="mo-label">Serigrafía</span>
                            <span class="mo-value">$${(costosMO.serigrafia || 0).toFixed(2)}</span>
                        </div>
                        <div class="mo-display-item">
                            <i class="fas fa-box"></i>
                            <span class="mo-label">Empaque</span>
                            <span class="mo-value">$${(costosMO.empaque || 0).toFixed(2)}</span>
                        </div>
                        <div class="mo-display-item total">
                            <i class="fas fa-calculator"></i>
                            <span class="mo-label">Total MO</span>
                            <span class="mo-value">$${costoMOTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Lista de Materiales -->
            ${(() => {
                // Si es array con objetos que tienen propiedad nombre
                if (Array.isArray(listaMateriales) && listaMateriales.length > 0 && listaMateriales[0] && typeof listaMateriales[0] === 'object' && listaMateriales[0].nombre) {
                    return `
                        <div class="info-block mt-2">
                            <h4><i class="fas fa-boxes"></i> Lista de Materiales (${listaMateriales.length})</h4>
                            <table class="data-table compact">
                                <thead>
                                    <tr>
                                        <th>Material</th>
                                        <th>Cantidad</th>
                                        <th>Unidad</th>
                                        <th>Medida</th>
                                        <th>Color</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${listaMateriales.map(m => `
                                        <tr>
                                            <td><strong>${m.nombre || ''}</strong></td>
                                            <td>${m.cantidad || '-'}</td>
                                            <td>${m.unidad || '-'}</td>
                                            <td>${m.medida || '-'}</td>
                                            <td>${m.color ? `<span class="color-badge">${m.color}</span>` : '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
                // Si es array de objetos sin propiedad nombre (formato legacy o corrupto)
                if (Array.isArray(listaMateriales) && listaMateriales.length > 0 && listaMateriales[0] && typeof listaMateriales[0] === 'object') {
                    return `
                        <div class="info-block mt-2">
                            <h4><i class="fas fa-boxes"></i> Lista de Materiales (${listaMateriales.length})</h4>
                            <ul class="materiales-lista">
                                ${listaMateriales.map(m => `<li>${Object.values(m).filter(v => v).join(' - ')}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
                // Si es array de strings
                if (Array.isArray(listaMateriales) && listaMateriales.length > 0 && typeof listaMateriales[0] === 'string') {
                    return `
                        <div class="info-block mt-2">
                            <h4><i class="fas fa-boxes"></i> Materiales</h4>
                            <ul class="materiales-lista">
                                ${listaMateriales.map(m => `<li>${m}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
                // Si es string
                if (typeof listaMateriales === 'string' && listaMateriales.trim()) {
                    return `
                        <div class="info-block mt-2">
                            <h4><i class="fas fa-boxes"></i> Materiales</h4>
                            <p>${listaMateriales}</p>
                        </div>
                    `;
                }
                return '';
            })()}

            <!-- Descripción Técnica -->
            ${Array.isArray(descripcionTecnica) && descripcionTecnica.length > 0 ? `
                <div class="info-block mt-2">
                    <h4><i class="fas fa-clipboard-list"></i> Descripción Técnica</h4>
                    <ul class="descripcion-tecnica-lista">
                        ${descripcionTecnica.map(d => `<li><i class="fas fa-check-circle"></i> ${d}</li>`).join('')}
                    </ul>
                </div>
            ` : (producto.descripcion ? `
                <div class="info-block mt-2">
                    <h4><i class="fas fa-file-alt"></i> Descripción</h4>
                    <p>${producto.descripcion}</p>
                </div>
            ` : '')}

            <!-- Ruta de Producción -->
            ${rutaProcesos.length > 0 ? `
                <div class="ruta-produccion-visual mt-2">
                    <h4><i class="fas fa-route"></i> Ruta de Producción (${rutaProcesos.filter(p => p.habilitado).length} activos)</h4>
                    <div class="proceso-flow">
                        ${rutaProcesos.map((proc, idx) => `
                            <div class="proceso-node ${proc.habilitado ? '' : 'disabled'}">
                                <div class="proceso-node-number">${proc.orden}</div>
                                <div class="proceso-node-content">
                                    <span class="proceso-node-name">${proc.nombre}</span>
                                    <div class="proceso-node-stats">
                                        <span><i class="fas fa-tachometer-alt"></i> ${proc.capacidadHora || 0} pzas/hr</span>
                                        <span><i class="fas fa-stopwatch"></i> ${proc.tiempoEstandar || 0} min</span>
                                    </div>
                                </div>
                            </div>
                            ${idx < rutaProcesos.length - 1 ? '<div class="proceso-connector"><i class="fas fa-arrow-right"></i></div>' : ''}
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${producto.comentarios ? `
                <div class="info-block mt-2">
                    <h4><i class="fas fa-sticky-note"></i> Comentarios</h4>
                    <p>${producto.comentarios}</p>
                </div>
            ` : ''}
        </div>
    `;

    openModal(producto.nombre, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Exponer viewProductoDetalle a window
window.viewProductoDetalle = viewProductoDetalle;

// Exportar productos a Excel
function exportProductosToExcel() {
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const familias = db.getFamilias();

    const tempTable = document.createElement('table');
    tempTable.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Cliente</th>
                <th>Familia</th>
                <th>Medidas</th>
                <th>Tiempo Total</th>
                <th>Procesos</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            ${productos.map(p => {
                const cliente = clientes.find(c => c.id === p.clienteId);
                const familia = familias.find(f => f.id === p.familiaId);
                return `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.nombre}</td>
                        <td>${cliente?.nombreComercial || 'N/A'}</td>
                        <td>${familia?.nombre || 'N/A'}</td>
                        <td>${p.medidas}</td>
                        <td>${p.tiempoTotal}</td>
                        <td>${(p.rutaProcesos || []).length}</td>
                        <td>${p.activo ? 'Activo' : 'Inactivo'}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

    tempTable.id = 'tempProductosTable';
    document.body.appendChild(tempTable);
    tempTable.style.display = 'none';

    exportTableToExcel('tempProductosTable', 'productos');
    document.body.removeChild(tempTable);
    showToast('Exportación completada');
}

// ========================================
// SECCIÓN ÁREAS DE PLANTA MEJORADA v2
// ========================================
function loadProcesosEnhanced() {
    const section = document.getElementById('section-procesos');
    const areasPlanta = db.getAreasPlanta();
    const estaciones = db.getEstaciones();
    const personal = db.getPersonal();
    const estadoOps = db.getEstadoOperadores();
    const productos = db.getProductos();

    // Calcular estadísticas
    const totalPosiciones = estaciones.length;
    const posicionesOcupadas = estaciones.filter(e => e.operadorId !== null).length;
    const ocupacion = Math.round((posicionesOcupadas / totalPosiciones) * 100);

    section.innerHTML = `
        <div class="section-header">
            <h1>Áreas de Planta y Procesos</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="showEditorRutasModal()">
                    <i class="fas fa-project-diagram"></i> Editor de Rutas
                </button>
                <button class="btn btn-primary" onclick="showNuevaAreaPlantaModal()">
                    <i class="fas fa-plus"></i> Nueva Área
                </button>
            </div>
        </div>

        <!-- KPIs de Ocupación -->
        <div class="areas-kpi-bar">
            <div class="kpi-mini">
                <span class="kpi-icon blue"><i class="fas fa-th"></i></span>
                <div>
                    <span class="kpi-value">${totalPosiciones}</span>
                    <span class="kpi-label">Posiciones</span>
                </div>
            </div>
            <div class="kpi-mini">
                <span class="kpi-icon green"><i class="fas fa-user-check"></i></span>
                <div>
                    <span class="kpi-value">${posicionesOcupadas}</span>
                    <span class="kpi-label">Ocupadas</span>
                </div>
            </div>
            <div class="kpi-mini">
                <span class="kpi-icon ${ocupacion >= 80 ? 'green' : ocupacion >= 50 ? 'orange' : 'red'}"><i class="fas fa-percentage"></i></span>
                <div>
                    <span class="kpi-value">${ocupacion}%</span>
                    <span class="kpi-label">Ocupación</span>
                </div>
            </div>
            <div class="kpi-mini">
                <span class="kpi-icon purple"><i class="fas fa-sitemap"></i></span>
                <div>
                    <span class="kpi-value">${areasPlanta.length}</span>
                    <span class="kpi-label">Áreas</span>
                </div>
            </div>
        </div>

        <!-- Grid de Áreas -->
        <div class="areas-grid-enhanced">
            ${areasPlanta.map(area => {
                const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
                const estacionesOcupadas = estacionesArea.filter(e => e.operadorId !== null);
                const ocupacionArea = estacionesArea.length > 0 ? Math.round((estacionesOcupadas.length / estacionesArea.length) * 100) : 0;

                const operadoresEnArea = estacionesOcupadas.map(e => {
                    const emp = personal.find(p => p.id === e.operadorId);
                    const estado = estadoOps.find(o => o.operadorId === e.operadorId);
                    return { empleado: emp, estado: estado };
                }).filter(o => o.empleado);

                return `
                    <div class="area-card-enhanced" style="border-top: 4px solid ${area.color}">
                        <div class="area-header">
                            <h3>
                                <span class="area-color-dot" style="background: ${area.color}"></span>
                                ${area.nombre}
                            </h3>
                            <div class="area-actions">
                                <button class="btn-icon-small" onclick="editAreaPlanta('${area.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon-small" onclick="verEstacionesArea('${area.id}')" title="Ver Estaciones">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn-icon-small danger" onclick="eliminarAreaPlantaEnhanced('${area.id}')" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>

                        <div class="area-stats">
                            <div class="area-stat">
                                <span class="stat-number">${estacionesArea.length}</span>
                                <span class="stat-text">Posiciones</span>
                            </div>
                            <div class="area-stat">
                                <span class="stat-number">${estacionesOcupadas.length}</span>
                                <span class="stat-text">Ocupadas</span>
                            </div>
                            <div class="area-stat">
                                <span class="stat-number ${ocupacionArea >= 80 ? 'text-success' : ocupacionArea >= 50 ? 'text-warning' : 'text-danger'}">${ocupacionArea}%</span>
                                <span class="stat-text">Ocupación</span>
                            </div>
                        </div>

                        <div class="area-operadores-mini">
                            ${operadoresEnArea.slice(0, 8).map(o => `
                                <div class="op-mini ${o.estado?.estado || 'empty'}" title="${o.empleado.nombre}">
                                    ${o.estado?.iniciales || getIniciales(o.empleado.nombre)}
                                </div>
                            `).join('')}
                            ${operadoresEnArea.length > 8 ? `<span class="op-more">+${operadoresEnArea.length - 8}</span>` : ''}
                            ${operadoresEnArea.length === 0 ? '<span class="text-muted text-small">Sin operadores</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <!-- Mapa Visual -->
        <div class="plant-map-section mt-3">
            <h3><i class="fas fa-map"></i> Mapa de Planta</h3>
            <div class="plant-map-container" id="areasPlantMap">
                <!-- Se carga con loadAreasPlantMap -->
            </div>
        </div>
    `;

    // Cargar mapa
    loadAreasPlantMap();
}

// Cargar mapa en sección de áreas
function loadAreasPlantMap() {
    const container = document.getElementById('areasPlantMap');
    if (!container) return;

    const mapaData = db.getMapaPlantaData();

    container.innerHTML = mapaData.map(area => {
        const posicionesHtml = area.posiciones.map(pos => {
            const estado = pos.estado || 'empty';

            if (estado === 'empty' || !pos.operadorId) {
                return `
                    <div class="workstation empty" data-id="${pos.id}">
                        <span class="workstation-code">${pos.id}</span>
                    </div>
                `;
            }

            return `
                <div class="workstation ${estado}" data-id="${pos.id}">
                    <span class="workstation-initials">${pos.iniciales || '??'}</span>
                    <span class="workstation-code">${pos.id}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="map-area" style="border-color: ${area.color}20;">
                <div class="map-area-header" style="color: ${area.color};">
                    ${area.nombre} (${area.posiciones.length})
                </div>
                <div class="map-area-positions">
                    ${posicionesHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Modal de editor de rutas de productos
function showEditorRutasModal() {
    const productos = db.getProductos();
    const clientes = db.getClientes();

    const content = `
        <div class="rutas-editor">
            <p class="text-muted mb-2">Seleccione un producto para editar su ruta de producción</p>

            <div class="form-group">
                <label>Producto</label>
                <select id="rutaProductoSelect" onchange="loadRutaParaEditar(this.value)">
                    <option value="">Seleccionar...</option>
                    ${productos.map(p => {
                        const cliente = clientes.find(c => c.id === p.clienteId);
                        return `<option value="${p.id}">${p.nombre} (${cliente?.nombreComercial || 'N/A'})</option>`;
                    }).join('')}
                </select>
            </div>

            <div id="rutaEditorContainer">
                <p class="text-muted text-center">Seleccione un producto para ver su ruta</p>
            </div>
        </div>
    `;

    openModal('Editor de Rutas de Producción', content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function loadRutaParaEditar(productoId) {
    if (!productoId) return;

    const container = document.getElementById('rutaEditorContainer');
    const producto = db.getProducto(parseInt(productoId));

    if (!producto) {
        container.innerHTML = '<p class="text-danger">Producto no encontrado</p>';
        return;
    }

    container.innerHTML = `
        <div class="ruta-preview mt-2">
            <h4>${producto.nombre}</h4>
            <p class="text-muted">${producto.rutaProcesos?.length || 0} procesos configurados</p>

            <button class="btn btn-primary mt-2" onclick="closeModal(); editRutaProcesos(${producto.id})">
                <i class="fas fa-edit"></i> Editar Ruta Completa
            </button>
        </div>
    `;
}

// ========================================
// ELIMINAR ÁREA DE PLANTA (Enhanced)
// ========================================
function eliminarAreaPlantaEnhanced(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    if (!area) return;

    const estacionesArea = db.getEstaciones().filter(e => e.areaPlantaId === areaId);
    const ocupadas = estacionesArea.filter(e => e.operadorId).length;

    if (ocupadas > 0) {
        showToast(`No se puede eliminar "${area.nombre}". Tiene ${ocupadas} posiciones con operadores asignados. Desasigna los operadores primero.`, 'error');
        return;
    }

    const content = `
        <div class="confirm-delete" style="text-align: center; padding: 20px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #f59e0b; margin-bottom: 15px;"></i>
            <h3>¿Eliminar área "${area.nombre}"?</h3>
            <p class="text-muted" style="margin: 15px 0;">
                Esta acción eliminará el área y todas sus <strong>${estacionesArea.length} posiciones</strong>.
            </p>
            <p class="text-danger" style="font-weight: bold;">
                <i class="fas fa-ban"></i> Esta acción NO se puede deshacer.
            </p>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">
            <i class="fas fa-times"></i> Cancelar
        </button>
        <button class="btn btn-danger" onclick="confirmarEliminarAreaEnhanced('${areaId}')">
            <i class="fas fa-trash"></i> Sí, Eliminar Área
        </button>
    `;

    openModal('Confirmar Eliminación', content, footer);
}

function confirmarEliminarAreaEnhanced(areaId) {
    const area = db.getAreasPlanta().find(a => a.id === areaId);
    const nombreArea = area ? area.nombre : 'Área';

    db.deleteAreaPlanta(areaId);
    closeModal();
    showToast(`Área "${nombreArea}" eliminada correctamente`, 'success');
    loadProcesos(); // Recargar la vista
}

// ========================================
// SECCIÓN PERSONAL MEJORADA v2
// ========================================
function loadPersonalEnhanced() {
    const section = document.getElementById('section-personal');
    const personal = db.getPersonal();
    const areasPlanta = db.getAreasPlanta();
    const estadoOps = db.getEstadoOperadores();

    // Estadísticas
    const totalActivos = personal.filter(p => p.activo).length;
    const operadores = personal.filter(p => p.rol === 'operador' && p.activo).length;
    const supervisoras = personal.filter(p => p.rol === 'supervisora' && p.activo).length;

    section.innerHTML = `
        <div class="section-header">
            <h1>Gestión de Personal</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="exportPersonalToExcel()">
                    <i class="fas fa-file-excel"></i> Exportar
                </button>
                <button class="btn btn-primary" onclick="showNuevoEmpleadoModal()">
                    <i class="fas fa-plus"></i> Nuevo Empleado
                </button>
            </div>
        </div>

        <!-- KPIs -->
        <div class="personal-kpi-bar">
            <div class="kpi-mini" onclick="filterPersonalTable('todos')">
                <span class="kpi-icon blue"><i class="fas fa-users"></i></span>
                <div>
                    <span class="kpi-value">${totalActivos}</span>
                    <span class="kpi-label">Activos</span>
                </div>
            </div>
            <div class="kpi-mini" onclick="filterPersonalTable('operador')">
                <span class="kpi-icon green"><i class="fas fa-user-cog"></i></span>
                <div>
                    <span class="kpi-value">${operadores}</span>
                    <span class="kpi-label">Operadores</span>
                </div>
            </div>
            <div class="kpi-mini" onclick="filterPersonalTable('supervisora')">
                <span class="kpi-icon purple"><i class="fas fa-user-tie"></i></span>
                <div>
                    <span class="kpi-value">${supervisoras}</span>
                    <span class="kpi-label">Supervisoras</span>
                </div>
            </div>
        </div>

        <!-- Filtros -->
        <div class="personal-filters">
            <div class="tabs">
                <button class="tab active" data-filter="todos">Todos</button>
                <button class="tab" data-filter="operador">Operadores</button>
                <button class="tab" data-filter="supervisora">Supervisoras</button>
            </div>
            <div class="search-box">
                <input type="text" id="searchPersonal" placeholder="Buscar por nombre..." onkeyup="searchPersonal()">
            </div>
        </div>

        <!-- Tabla -->
        <div class="orders-table-container">
            <table class="data-table" id="personalTableEnhanced">
                <thead>
                    <tr>
                        <th>Empleado</th>
                        <th>Rol</th>
                        <th>Horario</th>
                        <th>Posiciones</th>
                        <th>Salario/Hr</th>
                        <th>Estado Actual</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${personal.filter(p => p.activo).map(emp => {
                        const posiciones = emp.posiciones || [];
                        const estadoOp = estadoOps.find(e => e.operadorId === emp.id);
                        const estadoActual = estadoOp ? estadoOp.estado : 'sin-asignar';
                        const iniciales = estadoOp ? estadoOp.iniciales : getIniciales(emp.nombre);

                        return `
                            <tr data-rol="${emp.rol}" data-nombre="${emp.nombre.toLowerCase()}">
                                <td>
                                    <div class="empleado-cell">
                                        <span class="workstation ${estadoActual}" style="width:36px;height:36px;display:inline-flex;">
                                            <span class="workstation-initials">${iniciales}</span>
                                        </span>
                                        <div>
                                            <strong>${emp.nombre}</strong>
                                            ${emp.email ? `<small class="text-muted d-block">${emp.email}</small>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge ${emp.rol === 'supervisora' ? 'info' : 'success'}">
                                        ${capitalizeFirst(emp.rol)}
                                    </span>
                                </td>
                                <td>
                                    <div class="horario-cell">
                                        <span><i class="fas fa-sign-in-alt"></i> ${emp.horaEntrada || '08:00'}</span>
                                        <span><i class="fas fa-sign-out-alt"></i> ${emp.horaSalida || '17:00'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="posiciones-cell">
                                        ${posiciones.length > 0
                                            ? posiciones.map(p => `<span class="pos-tag">${p}</span>`).join('')
                                            : '<span class="text-muted">Sin asignar</span>'
                                        }
                                        <button class="btn-icon-tiny" onclick="showAsignarPosicionesModal(${emp.id})" title="Asignar">
                                            <i class="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </td>
                                <td>$${emp.salarioHora?.toFixed(2) || '0.00'}</td>
                                <td>
                                    <span class="status-badge ${getEstadoBadgeClass(estadoActual)}">
                                        ${getEstadoTexto(estadoActual)}
                                    </span>
                                </td>
                                <td>
                                    <div class="acciones-cell">
                                        <button class="btn-icon-small" onclick="editEmpleado(${emp.id})" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn-icon-small ${emp.activo ? 'danger' : 'success'}" onclick="toggleEmpleado(${emp.id})" title="${emp.activo ? 'Desactivar' : 'Activar'}">
                                            <i class="fas fa-power-off"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <!-- Mapa de Personal -->
        <div class="mt-3">
            <h3><i class="fas fa-map"></i> Mapa de Asignaciones</h3>
            <div class="plant-map-container mt-2" id="personalPlantMap">
            </div>
        </div>
    `;

    // Cargar mapa
    loadPersonalPlantMap();

    // Event listeners para tabs
    section.querySelectorAll('.tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            section.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            filterPersonalTable(tab.dataset.filter);
        });
    });
}

// Filtrar tabla de personal
function filterPersonalTable(filter) {
    const rows = document.querySelectorAll('#personalTableEnhanced tbody tr');
    rows.forEach(row => {
        if (filter === 'todos' || row.dataset.rol === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Buscar personal
function searchPersonal() {
    const search = document.getElementById('searchPersonal').value.toLowerCase();
    const rows = document.querySelectorAll('#personalTableEnhanced tbody tr');

    rows.forEach(row => {
        const nombre = row.dataset.nombre;
        row.style.display = nombre.includes(search) ? '' : 'none';
    });
}

// Exportar personal
function exportPersonalToExcel() {
    const table = document.getElementById('personalTableEnhanced');
    if (table) {
        exportTableToExcel('personalTableEnhanced', 'personal');
        showToast('Exportación completada');
    }
}

// ========================================
// SECCIÓN COSTEO MEJORADA v2
// ========================================
function loadCosteoEnhanced() {
    const section = document.getElementById('section-costeo');
    const materiales = db.getMateriales();
    const personal = db.getPersonal().filter(p => p.activo);

    // Calcular estadísticas
    const costoPromedioMaterial = materiales.length > 0
        ? materiales.reduce((sum, m) => sum + m.costo, 0) / materiales.length
        : 0;

    const salarioPromedioOperadores = personal.filter(p => p.rol === 'operador').reduce((sum, p) => sum + p.salarioHora, 0) /
        personal.filter(p => p.rol === 'operador').length || 0;

    section.innerHTML = `
        <div class="section-header">
            <h1>Costeo de Producción</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="openSimuladorCostos()">
                    <i class="fas fa-calculator"></i> Simulador de Costos
                </button>
                <button class="btn btn-primary" onclick="showNuevoMaterialEnhancedModal()">
                    <i class="fas fa-plus"></i> Nuevo Material
                </button>
            </div>
        </div>

        <!-- KPIs de Costeo -->
        <div class="costeo-kpi-bar">
            <div class="kpi-card-mini">
                <span class="kpi-icon blue"><i class="fas fa-cubes"></i></span>
                <div>
                    <span class="kpi-value">${materiales.length}</span>
                    <span class="kpi-label">Materiales</span>
                </div>
            </div>
            <div class="kpi-card-mini">
                <span class="kpi-icon green"><i class="fas fa-dollar-sign"></i></span>
                <div>
                    <span class="kpi-value">$${costoPromedioMaterial.toFixed(2)}</span>
                    <span class="kpi-label">Costo Prom. Material</span>
                </div>
            </div>
            <div class="kpi-card-mini">
                <span class="kpi-icon orange"><i class="fas fa-user-clock"></i></span>
                <div>
                    <span class="kpi-value">$${salarioPromedioOperadores.toFixed(2)}</span>
                    <span class="kpi-label">Salario Prom./Hr</span>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="tabs costeo-tabs">
            <button class="tab active" data-tab="materiales">Materiales</button>
            <button class="tab" data-tab="manoObra">Mano de Obra</button>
            <button class="tab" data-tab="reporteCosto">Análisis de Costos</button>
        </div>

        <div id="costeoContent">
            ${renderTablaMateriales(materiales)}
        </div>
    `;

    // Event listeners
    section.querySelectorAll('.costeo-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            section.querySelectorAll('.costeo-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadCosteoTabEnhanced(tab.dataset.tab);
        });
    });
}

function renderTablaMateriales(materiales) {
    return `
        <div class="orders-table-container">
            <table class="data-table" id="materialesTable">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Material</th>
                        <th>Unidad</th>
                        <th>Costo Unit.</th>
                        <th>Proveedor</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${materiales.map(mat => `
                        <tr>
                            <td><code>${mat.sku || 'N/A'}</code></td>
                            <td><strong>${mat.nombre}</strong></td>
                            <td>${mat.unidad}</td>
                            <td>$${mat.costo.toFixed(2)}</td>
                            <td>${mat.proveedor || 'N/A'}</td>
                            <td>${mat.stock || '-'}</td>
                            <td>
                                <button class="btn-icon-small" onclick="editMaterialEnhanced(${mat.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function loadCosteoTabEnhanced(tab) {
    const container = document.getElementById('costeoContent');

    switch(tab) {
        case 'materiales':
            container.innerHTML = renderTablaMateriales(db.getMateriales());
            break;

        case 'manoObra':
            const personal = db.getPersonal().filter(p => p.activo);
            const operadores = personal.filter(p => p.rol === 'operador');
            const supervisoras = personal.filter(p => p.rol === 'supervisora');

            const salarioPromOp = operadores.reduce((sum, p) => sum + p.salarioHora, 0) / operadores.length || 0;
            const salarioPromSup = supervisoras.reduce((sum, p) => sum + p.salarioHora, 0) / supervisoras.length || 0;

            container.innerHTML = `
                <div class="kpi-grid mb-2">
                    <div class="kpi-card">
                        <div class="kpi-info">
                            <span class="kpi-label">Costo Promedio/Hora (Operadores)</span>
                            <span class="kpi-value">$${salarioPromOp.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-info">
                            <span class="kpi-label">Costo Promedio/Hora (Supervisoras)</span>
                            <span class="kpi-value">$${salarioPromSup.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="orders-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Empleado</th>
                                <th>Rol</th>
                                <th>Horario</th>
                                <th>Salario/Hora</th>
                                <th>Costo/Hora (con cargas)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${personal.map(emp => {
                                const costoConCargas = emp.salarioHora * 1.35;
                                return `
                                    <tr>
                                        <td>${emp.nombre}</td>
                                        <td><span class="status-badge ${emp.rol === 'supervisora' ? 'info' : 'success'}">${capitalizeFirst(emp.rol)}</span></td>
                                        <td>${emp.horaEntrada || '08:00'} - ${emp.horaSalida || '17:00'}</td>
                                        <td>$${emp.salarioHora.toFixed(2)}</td>
                                        <td><strong>$${costoConCargas.toFixed(2)}</strong></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            break;

        case 'reporteCosto':
            container.innerHTML = renderAnalisisCostos();
            break;
    }
}

function renderAnalisisCostos() {
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const materiales = db.getMateriales();
    const salarioPromedio = 50;

    return `
        <h3 class="mb-2">Costo por Producto</h3>
        <div class="orders-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cliente</th>
                        <th>Tiempo</th>
                        <th>Costo Material</th>
                        <th>Costo MO</th>
                        <th>Costo Total/Pza</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(prod => {
                        const cliente = clientes.find(c => c.id === prod.clienteId);
                        const bom = db.getBOM(prod.id);
                        let costoMaterial = 0;
                        bom.forEach(b => {
                            const mat = materiales.find(m => m.id === b.materialId);
                            if (mat) costoMaterial += mat.costo * b.cantidad;
                        });
                        const costoMO = (prod.tiempoTotal / 60) * salarioPromedio;
                        return `
                            <tr>
                                <td><strong>${prod.nombre}</strong></td>
                                <td>${cliente?.nombreComercial || 'N/A'}</td>
                                <td>${prod.tiempoTotal} min</td>
                                <td>$${costoMaterial.toFixed(2)}</td>
                                <td>$${costoMO.toFixed(2)}</td>
                                <td><strong>$${(costoMaterial + costoMO).toFixed(2)}</strong></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Modal de nuevo material mejorado
function showNuevoMaterialEnhancedModal() {
    const content = `
        <form id="nuevoMaterialEnhancedForm">
            <div class="form-row">
                <div class="form-group">
                    <label>SKU</label>
                    <input type="text" name="sku" placeholder="MAT-001">
                </div>
                <div class="form-group">
                    <label>Nombre del Material *</label>
                    <input type="text" name="nombre" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Unidad *</label>
                    <select name="unidad" required>
                        <option value="metro">Metro</option>
                        <option value="pieza">Pieza</option>
                        <option value="rollo">Rollo</option>
                        <option value="kg">Kilogramo</option>
                        <option value="litro">Litro</option>
                        <option value="caja">Caja</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Costo por Unidad *</label>
                    <input type="number" name="costo" step="0.01" required placeholder="0.00">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Proveedor</label>
                    <input type="text" name="proveedor" placeholder="Nombre del proveedor">
                </div>
                <div class="form-group">
                    <label>Stock Actual</label>
                    <input type="number" name="stock" placeholder="0">
                </div>
            </div>
        </form>
    `;

    openModal('Nuevo Material', content, () => {
        const form = document.getElementById('nuevoMaterialEnhancedForm');
        const formData = new FormData(form);

        const material = {
            sku: formData.get('sku') || null,
            nombre: formData.get('nombre'),
            unidad: formData.get('unidad'),
            costo: parseFloat(formData.get('costo')) || 0,
            proveedor: formData.get('proveedor') || '',
            stock: parseInt(formData.get('stock')) || 0
        };

        db.addMaterial(material);
        loadCosteo();
        closeModal();
        showToast('Material agregado');
    });
}

function editMaterialEnhanced(id) {
    const material = db.getMaterial(id);

    const content = `
        <form id="editarMaterialForm">
            <div class="form-row">
                <div class="form-group">
                    <label>SKU</label>
                    <input type="text" name="sku" value="${material.sku || ''}">
                </div>
                <div class="form-group">
                    <label>Nombre *</label>
                    <input type="text" name="nombre" value="${material.nombre}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Unidad *</label>
                    <select name="unidad" required>
                        <option value="metro" ${material.unidad === 'metro' ? 'selected' : ''}>Metro</option>
                        <option value="pieza" ${material.unidad === 'pieza' ? 'selected' : ''}>Pieza</option>
                        <option value="rollo" ${material.unidad === 'rollo' ? 'selected' : ''}>Rollo</option>
                        <option value="kg" ${material.unidad === 'kg' ? 'selected' : ''}>Kilogramo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Costo *</label>
                    <input type="number" name="costo" step="0.01" value="${material.costo}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Proveedor</label>
                <input type="text" name="proveedor" value="${material.proveedor || ''}">
            </div>
        </form>
    `;

    openModal('Editar Material', content, () => {
        const form = document.getElementById('editarMaterialForm');
        const formData = new FormData(form);

        db.updateMaterial(id, {
            sku: formData.get('sku'),
            nombre: formData.get('nombre'),
            unidad: formData.get('unidad'),
            costo: parseFloat(formData.get('costo')),
            proveedor: formData.get('proveedor')
        });

        loadCosteo();
        closeModal();
        showToast('Material actualizado');
    });
}

// ========================================
// SECCIÓN AUDITORÍA MEJORADA v2
// ========================================
function loadAuditoriaEnhanced() {
    const section = document.getElementById('section-auditoria');
    const auditoria = db.getAuditoria();

    // Estadísticas
    const hoy = new Date().toDateString();
    const accionesHoy = auditoria.filter(a => new Date(a.fecha).toDateString() === hoy).length;

    section.innerHTML = `
        <div class="section-header">
            <h1>Bitácora de Auditoría</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="exportAuditoriaToExcel()">
                    <i class="fas fa-download"></i> Exportar
                </button>
            </div>
        </div>

        <!-- Filtros -->
        <div class="auditoria-filters">
            <div class="filter-group">
                <label>Tipo de Entidad</label>
                <select id="auditFilterEntidad" onchange="applyAuditoriaFilters()">
                    <option value="">Todas</option>
                    <option value="cliente">Clientes</option>
                    <option value="pedido">Pedidos</option>
                    <option value="producto">Productos</option>
                    <option value="proceso">Procesos</option>
                    <option value="material">Materiales</option>
                    <option value="personal">Personal</option>
                    <option value="areaPlanta">Áreas</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Fecha</label>
                <select id="auditFilterFecha" onchange="applyAuditoriaFilters()">
                    <option value="">Todas</option>
                    <option value="hoy">Hoy</option>
                    <option value="semana">Esta Semana</option>
                    <option value="mes">Este Mes</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Buscar</label>
                <input type="text" id="auditSearch" placeholder="Acción o detalle..." onkeyup="applyAuditoriaFilters()">
            </div>
        </div>

        <!-- Stats -->
        <div class="audit-stats mb-2">
            <span><i class="fas fa-history"></i> ${auditoria.length} registros totales</span>
            <span><i class="fas fa-calendar-day"></i> ${accionesHoy} acciones hoy</span>
        </div>

        <!-- Tabla -->
        <div class="orders-table-container">
            <table class="data-table" id="auditoriaTableEnhanced">
                <thead>
                    <tr>
                        <th>Fecha/Hora</th>
                        <th>Usuario</th>
                        <th>Acción</th>
                        <th>Detalle</th>
                        <th>Entidad</th>
                        <th>ID</th>
                    </tr>
                </thead>
                <tbody>
                    ${auditoria.map(log => `
                        <tr data-entidad="${log.entidad}" data-fecha="${log.fecha}">
                            <td>
                                <span class="audit-fecha">${formatDateTime(log.fecha)}</span>
                            </td>
                            <td>
                                <span class="audit-usuario">${log.usuario || 'Sistema'}</span>
                            </td>
                            <td>
                                <strong>${log.accion}</strong>
                            </td>
                            <td>
                                <span class="audit-detalle">${log.detalle}</span>
                            </td>
                            <td>
                                <span class="status-badge info">${capitalizeFirst(log.entidad)}</span>
                            </td>
                            <td>
                                <code>${log.entidadId || '-'}</code>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Aplicar filtros de auditoría
function applyAuditoriaFilters() {
    const entidadFilter = document.getElementById('auditFilterEntidad').value;
    const fechaFilter = document.getElementById('auditFilterFecha').value;
    const searchFilter = document.getElementById('auditSearch').value.toLowerCase();

    const hoy = new Date();
    const rows = document.querySelectorAll('#auditoriaTableEnhanced tbody tr');

    rows.forEach(row => {
        let show = true;

        if (entidadFilter && row.dataset.entidad !== entidadFilter) {
            show = false;
        }

        if (fechaFilter) {
            const fechaLog = new Date(row.dataset.fecha);
            switch(fechaFilter) {
                case 'hoy':
                    if (fechaLog.toDateString() !== hoy.toDateString()) show = false;
                    break;
                case 'semana':
                    const inicioSemana = new Date(hoy);
                    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
                    if (fechaLog < inicioSemana) show = false;
                    break;
                case 'mes':
                    if (fechaLog.getMonth() !== hoy.getMonth() || fechaLog.getFullYear() !== hoy.getFullYear()) show = false;
                    break;
            }
        }

        if (searchFilter) {
            const texto = row.textContent.toLowerCase();
            if (!texto.includes(searchFilter)) show = false;
        }

        row.style.display = show ? '' : 'none';
    });
}

// Exportar auditoría
function exportAuditoriaToExcel() {
    const table = document.getElementById('auditoriaTableEnhanced');
    if (table) {
        exportTableToExcel('auditoriaTableEnhanced', 'auditoria');
        showToast('Exportación completada');
    }
}

// ========================================
// CONECTAR FUNCIONES MEJORADAS AL SISTEMA
// ========================================

// Reemplazar carga de productos con versión mejorada
const originalLoadProductos = window.loadProductos;
window.loadProductos = function() {
    loadProductosEnhanced();
};

// Reemplazar carga de procesos (áreas) con versión mejorada
const originalLoadProcesos = window.loadProcesos;
window.loadProcesos = function() {
    loadProcesosEnhanced();
};

// Reemplazar carga de personal con versión mejorada
const originalLoadPersonal = window.loadPersonal;
window.loadPersonal = function() {
    loadPersonalEnhanced();
};

// Reemplazar carga de costeo con versión mejorada
const originalLoadCosteo = window.loadCosteo;
window.loadCosteo = function() {
    loadCosteoEnhanced();
};

// Reemplazar carga de auditoría con versión mejorada
const originalLoadAuditoria = window.loadAuditoria;
window.loadAuditoria = function() {
    loadAuditoriaEnhanced();
};

// ========================================
// FUNCIONES AUXILIARES ADICIONALES
// ========================================

// Eliminar cliente
function deleteCliente(id) {
    const cliente = db.getCliente(id);
    if (!cliente) return;

    const pedidosCliente = db.getPedidosByCliente(id);
    if (pedidosCliente.length > 0) {
        alert('No se puede eliminar el cliente porque tiene pedidos asociados.');
        return;
    }

    if (confirm(`¿Está seguro de eliminar al cliente "${cliente.nombreComercial}"?`)) {
        db.deleteCliente(id);
        loadClientes();
        showToast('Cliente eliminado');
    }
}

// Filtrar productos
function filterProductos() {
    const clienteFilter = document.getElementById('filterCliente')?.value || '';
    const familiaFilter = document.getElementById('filterFamilia')?.value || '';
    const subfamiliaFilter = document.getElementById('filterSubfamilia')?.value || '';
    const estadoFilter = document.getElementById('filterEstadoProd')?.value || '';
    const searchFilter = (document.getElementById('searchProducto')?.value || '').toLowerCase();

    const cards = document.querySelectorAll('#productosGrid .producto-card-enhanced');

    cards.forEach(card => {
        let show = true;

        if (clienteFilter && card.dataset.cliente !== clienteFilter) show = false;
        if (familiaFilter && card.dataset.familia !== familiaFilter) show = false;
        if (subfamiliaFilter && card.dataset.subfamilia !== subfamiliaFilter) show = false;
        if (estadoFilter && card.dataset.estado !== estadoFilter) show = false;
        if (searchFilter && !card.dataset.nombre.includes(searchFilter)) show = false;

        card.style.display = show ? '' : 'none';
    });
}

// Actualizar filtro de subfamilia basado en familia seleccionada
function updateSubfamiliaFilter() {
    const familiaId = document.getElementById('filterFamilia')?.value;
    const subfamiliaSelect = document.getElementById('filterSubfamilia');
    if (!subfamiliaSelect) return;

    const subfamilias = db.getSubfamilias();

    if (familiaId) {
        const subfamiliasFiltradas = subfamilias.filter(s => s.familiaId === parseInt(familiaId));
        subfamiliaSelect.innerHTML = `
            <option value="">Todas</option>
            ${subfamiliasFiltradas.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
        `;
    } else {
        subfamiliaSelect.innerHTML = `
            <option value="">Todas</option>
            ${subfamilias.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('')}
        `;
    }
}

// Cargar mapa de personal
function loadPersonalPlantMap() {
    const container = document.getElementById('personalPlantMap');
    if (!container) return;

    const mapaData = db.getMapaPlantaData();

    container.innerHTML = mapaData.map(area => {
        const posicionesHtml = area.posiciones.map(pos => {
            const estado = pos.estado || 'empty';

            if (estado === 'empty' || !pos.operadorId) {
                return `
                    <div class="workstation empty" data-id="${pos.id}" onclick="showAsignarDesdeEstacion('${pos.id}')">
                        <span class="workstation-code">${pos.id}</span>
                    </div>
                `;
            }

            return `
                <div class="workstation ${estado}" data-id="${pos.id}" onclick="showPosicionDetalle('${pos.id}')">
                    <span class="workstation-initials">${pos.iniciales || '??'}</span>
                    <span class="workstation-code">${pos.id}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="map-area" style="border-color: ${area.color}20;">
                <div class="map-area-header" style="color: ${area.color};">
                    ${area.nombre} (${area.posiciones.length})
                </div>
                <div class="map-area-positions">
                    ${posicionesHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Ver estaciones de un área
function verEstacionesAreaEnhanced(areaId) {
    const area = db.getAreaPlanta(areaId);
    const estaciones = db.getEstaciones().filter(e => e.areaPlantaId === areaId);
    const personal = db.getPersonal();
    const estadoOps = db.getEstadoOperadores();

    const content = `
        <div class="area-estaciones-view">
            <div class="area-info-header" style="border-left: 4px solid ${area.color}; padding-left: 15px; margin-bottom: 20px;">
                <h3>${area.nombre}</h3>
                <p class="text-muted">${estaciones.length} posiciones de trabajo</p>
            </div>

            <div class="estaciones-grid">
                ${estaciones.map(est => {
                    const operador = est.operadorId ? personal.find(p => p.id === est.operadorId) : null;
                    const estado = estadoOps.find(e => e.operadorId === est.operadorId);

                    return `
                        <div class="estacion-card ${operador ? 'ocupada' : 'libre'}">
                            <div class="estacion-card-header">
                                <div class="estacion-id">${est.id}</div>
                                <div class="estacion-card-actions">
                                    <button class="btn-icon-mini" onclick="renombrarEstacion('${est.id}', '${areaId}')" title="Renombrar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    ${!operador ? `
                                        <button class="btn-icon-mini danger" onclick="eliminarEstacionConConfirm('${est.id}', '${areaId}')" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="estacion-nombre">${est.nombre}</div>
                            ${operador ? `
                                <div class="estacion-operador">
                                    <span class="workstation ${estado?.estado || 'empty'}" style="width:32px;height:32px;display:inline-flex;">
                                        <span class="workstation-initials" style="font-size:0.75rem">${estado?.iniciales || getIniciales(operador.nombre)}</span>
                                    </span>
                                    <span class="operador-nombre">${operador.nombre}</span>
                                </div>
                                <span class="status-badge small ${getEstadoBadgeClass(estado?.estado || 'empty')}">${estado?.efectividad || 0}%</span>
                            ` : `
                                <div class="estacion-libre">
                                    <i class="fas fa-user-plus"></i>
                                    <span>Disponible</span>
                                </div>
                                <button class="btn btn-small btn-secondary" onclick="showAsignarDesdeEstacion('${est.id}')">
                                    Asignar
                                </button>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="mt-2">
                <button class="btn btn-outline-primary" onclick="agregarPosicionesArea('${areaId}')">
                    <i class="fas fa-plus"></i> Agregar Posiciones
                </button>
            </div>
        </div>
    `;

    openModal(`Estaciones: ${area.nombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Editar área de planta
function editAreaPlanta(areaId) {
    const area = db.getAreaPlanta(areaId);
    if (!area) return;

    const content = `
        <form id="editarAreaForm">
            <div class="form-group">
                <label>Nombre del Área *</label>
                <input type="text" name="nombre" value="${area.nombre}" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Posiciones</label>
                    <input type="number" name="posiciones" value="${area.posiciones}" min="1">
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <input type="color" name="color" value="${area.color}">
                </div>
            </div>
        </form>
    `;

    openModal('Editar Área', content, () => {
        const form = document.getElementById('editarAreaForm');

        db.updateAreaPlanta(areaId, {
            nombre: form.querySelector('[name="nombre"]').value,
            posiciones: parseInt(form.querySelector('[name="posiciones"]').value),
            color: form.querySelector('[name="color"]').value
        });

        loadProcesos();
        closeModal();
        showToast('Área actualizada');
    });
}

// Obtener iniciales de un nombre
function getIniciales(nombre) {
    if (!nombre) return '??';
    const partes = nombre.split(' ');
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
}

// Obtener texto de estado
function getEstadoTexto(estado) {
    switch(estado) {
        case 'adelantado': return 'Adelantado';
        case 'retrasado': return 'Retrasado';
        case 'muy-retrasado': return 'Muy Retrasado';
        case 'inactivo': return 'Inactivo';
        case 'empty': return 'Sin asignar';
        case 'sin-asignar': return 'Sin asignar';
        default: return capitalizeFirst(estado);
    }
}

// ========================================
// EXPORTACIÓN REAL A EXCEL (SheetJS)
// ========================================

function formatDateForFile(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function exportToExcel(data, filename, sheetName = 'Datos') {
    if (!data || data.length === 0) {
        showToastEnhanced('No hay datos para exportar', 'warning');
        return;
    }

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Crear worksheet desde los datos
    const ws = XLSX.utils.json_to_sheet(data);

    // Ajustar ancho de columnas automáticamente
    const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Descargar archivo
    XLSX.writeFile(wb, `${filename}_${formatDateForFile(new Date())}.xlsx`);

    showToastEnhanced('Archivo Excel descargado correctamente', 'success');
}

// Exportar reporte de operadores
function exportReporteOperadores() {
    const personal = db.getPersonal().filter(p => p.rol === 'operador' && p.activo);
    const estadoOps = db.getEstadoOperadores();
    const areas = db.getAreas();

    const data = personal.map(op => {
        const estado = estadoOps.find(e => e.operadorId === op.id);
        const area = areas.find(a => a.id === op.areaId);

        return {
            'Nombre': op.nombre,
            'Área': area ? area.nombre : 'Sin asignar',
            'Hora Entrada': op.horaEntrada || '08:00',
            'Hora Salida': op.horaSalida || '17:00',
            'Efectividad %': estado ? estado.efectividad : 0,
            'Estado': estado ? estado.estado : 'Sin datos',
            'Salario/Hora': `$${op.salarioHora}`
        };
    });

    exportToExcel(data, 'reporte_operadores', 'Operadores');
}

// Exportar reporte de pedidos
function exportReportePedidos() {
    const pedidos = db.getPedidos();
    const clientes = db.getClientes();
    const productos = db.getProductos();

    const data = pedidos.map(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);
        const prod = pedido.productos[0];
        const producto = productos.find(p => p.id === prod?.productoId);
        const progreso = prod ? Math.round((prod.completadas / prod.cantidad) * 100) : 0;

        return {
            'ID Pedido': pedido.id,
            'Cliente': cliente ? cliente.nombreComercial : 'N/A',
            'Producto': producto ? producto.nombre : 'N/A',
            'Cantidad': prod ? prod.cantidad : 0,
            'Completadas': prod ? prod.completadas : 0,
            'Progreso %': progreso,
            'Precio Unitario': prod ? `$${prod.precioUnitario}` : '$0',
            'Valor Total': prod ? `$${(prod.cantidad * prod.precioUnitario).toLocaleString()}` : '$0',
            'Prioridad': pedido.prioridad,
            'Fecha Carga': pedido.fechaCarga,
            'Fecha Entrega': pedido.fechaEntrega,
            'Estado': pedido.estado,
            'Presupuesto': `$${pedido.presupuestoEstimado?.toLocaleString() || 0}`,
            'Costo Real': `$${pedido.costoReal?.toLocaleString() || 0}`
        };
    });

    exportToExcel(data, 'reporte_pedidos', 'Pedidos');
}

// Exportar reporte de producción por proceso
function exportReporteProduccion() {
    const pedidos = filtrarPedidosActivos(db.getPedidos());
    const productos = db.getProductos();
    const clientes = db.getClientes();

    const data = [];

    pedidos.forEach(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);
        pedido.productos.forEach(prod => {
            const producto = productos.find(p => p.id === prod.productoId);
            if (prod.avanceProcesos && prod.avanceProcesos.length > 0) {
                prod.avanceProcesos.forEach(proceso => {
                    data.push({
                        'Pedido': pedido.id,
                        'Cliente': cliente?.nombreComercial || 'N/A',
                        'Producto': producto?.nombre || 'N/A',
                        'Proceso': proceso.nombre,
                        'Orden': proceso.procesoOrden,
                        'Completadas': proceso.completadas,
                        'Total': prod.cantidad,
                        'Progreso %': Math.round((proceso.completadas / prod.cantidad) * 100),
                        'Estado': proceso.estado
                    });
                });
            }
        });
    });

    exportToExcel(data, 'reporte_produccion', 'Producción');
}

// Exportar clientes
function exportClientesExcel() {
    const clientes = db.getClientes();
    const pedidos = db.getPedidos();

    const data = clientes.map(cliente => {
        const pedidosCliente = pedidos.filter(p => p.clienteId === cliente.id);
        const pedidosActivos = pedidosCliente.filter(p => p.estado !== 'entregado').length;

        return {
            'ID': cliente.id,
            'Razón Social': cliente.razonSocial,
            'Nombre Comercial': cliente.nombreComercial,
            'RFC': cliente.rfc || 'N/A',
            'Tipo': cliente.tipo,
            'Contacto': cliente.contacto,
            'Email': cliente.email,
            'Teléfono': cliente.telefono || 'N/A',
            'Dirección': cliente.direccion || 'N/A',
            'Pedidos Activos': pedidosActivos,
            'Total Pedidos': pedidosCliente.length,
            'Acceso Portal': cliente.accesoPortal ? 'Sí' : 'No',
            'Fecha Alta': cliente.fechaAlta
        };
    });

    exportToExcel(data, 'clientes', 'Clientes');
}

// Exportar personal
function exportPersonalExcel() {
    const personal = db.getPersonal();
    const areas = db.getAreas();

    const data = personal.map(p => {
        const area = areas.find(a => a.id === p.areaId);
        return {
            'ID': p.id,
            'Nombre': p.nombre,
            'Rol': p.rol,
            'Área': area ? area.nombre : 'General',
            'Hora Entrada': p.horaEntrada || '08:00',
            'Hora Salida': p.horaSalida || '17:00',
            'Hora Comida': p.horaComida || '13:00',
            'Salario/Hora': `$${p.salarioHora}`,
            'Posiciones': p.posiciones?.join(', ') || 'N/A',
            'Activo': p.activo ? 'Sí' : 'No'
        };
    });

    exportToExcel(data, 'personal', 'Personal');
}

// Exportar materiales
function exportMaterialesExcel() {
    const materiales = db.getMateriales();

    const data = materiales.map(m => ({
        'ID': m.id,
        'SKU': m.sku || 'N/A',
        'Nombre': m.nombre,
        'Unidad': m.unidad,
        'Costo': `$${m.costo.toFixed(2)}`,
        'Proveedor': m.proveedor || 'N/A',
        'Stock': m.stock || 0
    }));

    exportToExcel(data, 'materiales', 'Materiales');
}

// Exportar auditoría
function exportAuditoriaExcel() {
    const auditoria = db.getAuditoria();

    const data = auditoria.map(log => ({
        'ID': log.id,
        'Fecha': formatDateTime(log.fecha),
        'Usuario': log.usuario || 'Sistema',
        'Acción': log.accion,
        'Detalle': log.detalle,
        'Entidad': log.entidad,
        'Entidad ID': log.entidadId || 'N/A'
    }));

    exportToExcel(data, 'auditoria', 'Auditoría');
}

// Exportar productos
function exportProductosExcel() {
    const productos = db.getProductos();
    const clientes = db.getClientes();
    const familias = db.getFamilias();

    const data = productos.map(p => {
        const cliente = clientes.find(c => c.id === p.clienteId);
        const familia = familias.find(f => f.id === p.familiaId);

        return {
            'ID': p.id,
            'Nombre': p.nombre,
            'Cliente': cliente?.nombreComercial || 'N/A',
            'Familia': familia?.nombre || 'N/A',
            'Medidas': p.medidas || 'N/A',
            'Tiempo Total (min)': p.tiempoTotal,
            'Procesos': (p.rutaProcesos || []).length,
            'Materiales': p.materiales || 'N/A',
            'Versión': p.version,
            'Activo': p.activo ? 'Sí' : 'No'
        };
    });

    exportToExcel(data, 'productos', 'Productos');
}

// ========================================
// TOAST NOTIFICATIONS MEJORADAS
// ========================================

function showToastEnhanced(message, type = 'info', duration = 3000) {
    // Remover toast existente
    const existingToast = document.querySelector('.toast-enhanced');
    if (existingToast) {
        existingToast.remove();
    }

    // Crear nuevo toast
    const toast = document.createElement('div');
    toast.className = `toast-enhanced ${type}`;

    const icon = type === 'success' ? 'fa-check-circle' :
                 type === 'error' ? 'fa-times-circle' :
                 type === 'warning' ? 'fa-exclamation-triangle' :
                 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Auto-remover
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========================================
// GRÁFICAS CON CHART.JS
// ========================================

// Colores del tema
const chartColors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    pink: '#ec4899',
    gray: '#6b7280'
};

const chartColorsArray = [
    chartColors.primary,
    chartColors.success,
    chartColors.warning,
    chartColors.danger,
    chartColors.purple,
    chartColors.cyan,
    chartColors.pink
];

// Destruir gráfica existente si existe
function destroyChart(chartId) {
    const existingChart = Chart.getChart(chartId);
    if (existingChart) {
        existingChart.destroy();
    }
}

// Gráfica de producción por área (Doughnut)
function renderChartProduccionPorArea(containerId) {
    destroyChart(containerId);

    const areasPlanta = db.getAreasPlanta();
    const estaciones = db.getEstaciones();

    // Contar operadores por área
    const dataByArea = areasPlanta.map(area => {
        const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
        const operadoresActivos = estacionesArea.filter(e => e.operadorId !== null).length;
        return {
            area: area.nombre,
            operadores: operadoresActivos,
            color: area.color
        };
    }).filter(d => d.operadores > 0);

    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dataByArea.map(d => d.area),
            datasets: [{
                data: dataByArea.map(d => d.operadores),
                backgroundColor: dataByArea.map(d => d.color),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                title: {
                    display: true,
                    text: 'Operadores por Área',
                    font: { size: 16, weight: 'bold' }
                }
            }
        }
    });
}

// Gráfica de efectividad por operador (Bar horizontal) - CON CLICK PARA VER DETALLE
function renderChartEfectividadOperadores(containerId) {
    destroyChart(containerId);

    const personal = db.getPersonal().filter(p => p.rol === 'operador' && p.activo);
    const estadoOps = db.getEstadoOperadores();

    const operadoresData = personal.map(op => {
        const estado = estadoOps.find(e => e.operadorId === op.id);
        return {
            id: op.id,
            nombre: op.nombre.split(' ')[0],
            nombreCompleto: op.nombre,
            efectividad: estado ? estado.efectividad : 0
        };
    }).filter(d => d.efectividad > 0)
      .sort((a, b) => b.efectividad - a.efectividad)
      .slice(0, 10);

    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: operadoresData.map(d => d.nombre),
            datasets: [{
                label: 'Efectividad %',
                data: operadoresData.map(d => d.efectividad),
                backgroundColor: operadoresData.map(d =>
                    d.efectividad >= 110 ? chartColors.success :
                    d.efectividad >= 100 ? chartColors.primary :
                    d.efectividad >= 90 ? chartColors.warning :
                    chartColors.danger
                ),
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const operadorId = operadoresData[index].id;
                    navigateTo('personal');
                    setTimeout(() => {
                        if (typeof verDetallePersona === 'function') {
                            verDetallePersona(operadorId);
                        }
                    }, 300);
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Top 10 Operadores (clic para ver detalle)',
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        title: (items) => operadoresData[items[0].dataIndex].nombreCompleto,
                        afterBody: () => 'Clic para ver detalle del operador'
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 150,
                    grid: { display: false }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Gráfica de progreso de pedidos (Bar) - CON CLICK PARA VER DETALLE
function renderChartProgresoPedidos(containerId) {
    destroyChart(containerId);

    const pedidos = db.getPedidos().filter(p => p.estado !== 'entregado' && p.estado !== 'completado');
    const clientes = db.getClientes();

    const pedidosData = pedidos.slice(0, 6);
    const data = pedidosData.map(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);
        const prod = pedido.productos[0];
        const progreso = prod ? Math.round((prod.completadas / prod.cantidad) * 100) : 0;

        return {
            id: pedido.id,
            label: `#${pedido.id}`,
            cliente: cliente?.nombreComercial?.substring(0, 10) || 'N/A',
            progreso,
            prioridad: pedido.prioridad
        };
    });

    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => `${d.label} (${d.cliente})`),
            datasets: [{
                label: 'Progreso %',
                data: data.map(d => d.progreso),
                backgroundColor: data.map(d =>
                    d.prioridad === 'alta' ? chartColors.danger :
                    d.prioridad === 'media' ? chartColors.warning :
                    chartColors.primary
                ),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const pedidoId = data[index].id;
                    navigateTo('pedidos');
                    setTimeout(() => {
                        if (typeof verDetallePedido === 'function') {
                            verDetallePedido(pedidoId);
                        }
                    }, 300);
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Progreso de Pedidos Activos (clic para ver detalle)',
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        afterBody: () => 'Clic para ver detalle del pedido'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

// Gráfica de tendencia semanal (Line)
function renderChartTendenciaSemanal(containerId) {
    destroyChart(containerId);

    // Datos simulados de las últimas 4 semanas
    const semanas = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
    const produccion = [1200, 1350, 1280, 1450];
    const meta = [1300, 1300, 1300, 1300];

    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: semanas,
            datasets: [
                {
                    label: 'Producción',
                    data: produccion,
                    borderColor: chartColors.primary,
                    backgroundColor: chartColors.primary + '20',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Meta',
                    data: meta,
                    borderColor: chartColors.gray,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Tendencia de Producción Semanal',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 1000
                }
            }
        }
    });
}

// Gráfica de costos vs presupuesto (Bar agrupado) - CON CLICK PARA VER DETALLE
function renderChartCostosVsPresupuesto(containerId) {
    destroyChart(containerId);

    const pedidos = db.getPedidos().filter(p => p.presupuestoEstimado > 0);
    const pedidosData = pedidos.slice(0, 5);

    const data = pedidosData.map(p => ({
        pedidoId: p.id,
        id: `#${p.id}`,
        presupuesto: p.presupuestoEstimado,
        real: p.costoReal || 0
    }));

    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.id),
            datasets: [
                {
                    label: 'Presupuesto',
                    data: data.map(d => d.presupuesto),
                    backgroundColor: chartColors.primary,
                    borderRadius: 4
                },
                {
                    label: 'Costo Real',
                    data: data.map(d => d.real),
                    backgroundColor: data.map(d =>
                        d.real > d.presupuesto ? chartColors.danger : chartColors.success
                    ),
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const pedidoId = data[index].pedidoId;
                    navigateTo('pedidos');
                    setTimeout(() => {
                        if (typeof verDetallePedido === 'function') {
                            verDetallePedido(pedidoId);
                        }
                    }, 300);
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Costo vs Presupuesto (clic para detalle)',
                    font: { size: 14, weight: 'bold' }
                },
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        afterBody: () => 'Clic para ver detalle del pedido'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '$' + value.toLocaleString()
                    }
                }
            }
        }
    });
}

// Gráfica de distribución de estados (Pie)
function renderChartEstadosOperadores(containerId) {
    destroyChart(containerId);

    const estadoOps = db.getEstadoOperadores();
    const estaciones = db.getEstaciones();

    const estados = {
        'Adelantado': estadoOps.filter(e => e.estado === 'adelantado').length,
        'Retrasado': estadoOps.filter(e => e.estado === 'retrasado').length,
        'Muy Retrasado': estadoOps.filter(e => e.estado === 'muy-retrasado').length,
        'Inactivo': estadoOps.filter(e => e.estado === 'inactivo').length,
        'Sin Asignar': estaciones.filter(e => e.operadorId === null).length
    };

    const coloresEstados = {
        'Adelantado': chartColors.success,
        'Retrasado': chartColors.warning,
        'Muy Retrasado': chartColors.danger,
        'Inactivo': chartColors.gray,
        'Sin Asignar': '#e5e7eb'
    };

    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(estados),
            datasets: [{
                data: Object.values(estados),
                backgroundColor: Object.keys(estados).map(k => coloresEstados[k]),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribución de Estados',
                    font: { size: 16, weight: 'bold' }
                },
                legend: {
                    position: 'right',
                    labels: {
                        padding: 12,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// ========================================
// SECCIÓN DE GRÁFICAS EN DASHBOARD
// ========================================

function loadDashboardCharts() {
    // Verificar si ya existe el contenedor de gráficas
    let chartsSection = document.getElementById('dashboardChartsSection');

    if (!chartsSection) {
        // Crear sección de gráficas después del mapa de planta
        const plantMapSection = document.querySelector('.plant-map-section');
        if (!plantMapSection) return;

        chartsSection = document.createElement('div');
        chartsSection.id = 'dashboardChartsSection';
        chartsSection.className = 'dashboard-charts-section';
        chartsSection.innerHTML = `
            <div class="section-header-inline">
                <h3><i class="fas fa-chart-bar"></i> Analítica Visual</h3>
            </div>

            <div class="charts-grid">
                <div class="chart-card">
                    <canvas id="chartProgresoPedidos"></canvas>
                </div>
                <div class="chart-card">
                    <canvas id="chartEstadosOperadores"></canvas>
                </div>
                <div class="chart-card">
                    <canvas id="chartEfectividadOperadores"></canvas>
                </div>
                <div class="chart-card">
                    <canvas id="chartCostosVsPresupuesto"></canvas>
                </div>
            </div>
        `;

        plantMapSection.after(chartsSection);
    }

    // Renderizar gráficas con pequeño delay para asegurar que el DOM está listo
    setTimeout(() => {
        renderChartProgresoPedidos('chartProgresoPedidos');
        renderChartEstadosOperadores('chartEstadosOperadores');
        renderChartEfectividadOperadores('chartEfectividadOperadores');
        renderChartCostosVsPresupuesto('chartCostosVsPresupuesto');
    }, 100);
}

// ========================================
// SIMULADOR DE COSTOS
// ========================================

function openSimuladorCostos() {
    const productos = db.getProductos();
    const clientes = db.getClientes();

    const content = `
        <div class="simulador-costos">
            <div class="form-group">
                <label>Seleccionar Producto</label>
                <select id="simProducto" onchange="calcularSimulacion()">
                    <option value="">-- Seleccionar --</option>
                    ${productos.map(p => {
                        const cliente = clientes.find(c => c.id === p.clienteId);
                        return `<option value="${p.id}">${p.nombre} (${cliente?.nombreComercial || 'N/A'})</option>`;
                    }).join('')}
                </select>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Cantidad de Piezas</label>
                    <input type="number" id="simCantidad" value="100" min="1" onchange="calcularSimulacion()">
                </div>
                <div class="form-group">
                    <label>Precio de Venta Unitario</label>
                    <input type="number" id="simPrecioVenta" value="85" min="0" step="0.01" onchange="calcularSimulacion()">
                </div>
            </div>

            <hr style="margin: 20px 0;">

            <div id="simResultados" class="simulacion-resultados">
                <p class="text-muted text-center">Selecciona un producto para ver la simulación</p>
            </div>
        </div>
    `;

    openModal('Simulador de Costos', content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function calcularSimulacion() {
    const productoId = parseInt(document.getElementById('simProducto').value);
    const cantidad = parseInt(document.getElementById('simCantidad').value) || 0;
    const precioVenta = parseFloat(document.getElementById('simPrecioVenta').value) || 0;

    const container = document.getElementById('simResultados');

    if (!productoId || cantidad <= 0) {
        container.innerHTML = '<p class="text-muted text-center">Selecciona un producto y cantidad válidos</p>';
        return;
    }

    const producto = db.getProducto(productoId);
    const bom = db.getBOM(productoId);
    const materiales = db.getMateriales();

    // Calcular costo de materiales
    let costoMateriales = 0;
    const detalleMateriales = bom.map(item => {
        const material = materiales.find(m => m.id === item.materialId);
        if (material) {
            const costoItem = material.costo * item.cantidad;
            costoMateriales += costoItem;
            return {
                nombre: material.nombre,
                cantidad: item.cantidad,
                unidad: item.unidad,
                costoUnitario: material.costo,
                costoTotal: costoItem
            };
        }
        return null;
    }).filter(Boolean);

    // Calcular costo de mano de obra (basado en tiempo total del producto)
    const tiempoTotal = producto.tiempoTotal || 20; // minutos por pieza
    const costoHora = 50; // promedio
    const costoMOPorPieza = (tiempoTotal / 60) * costoHora;

    // Totales
    const costoTotalMateriales = costoMateriales * cantidad;
    const costoTotalMO = costoMOPorPieza * cantidad;
    const costoIndirecto = (costoTotalMateriales + costoTotalMO) * 0.15; // 15% indirectos
    const costoTotal = costoTotalMateriales + costoTotalMO + costoIndirecto;
    const ingresoTotal = precioVenta * cantidad;
    const utilidad = ingresoTotal - costoTotal;
    const margen = ingresoTotal > 0 ? ((utilidad / ingresoTotal) * 100) : 0;

    container.innerHTML = `
        <div class="sim-section">
            <h4><i class="fas fa-cubes"></i> Materiales por Pieza</h4>
            ${detalleMateriales.length > 0 ? `
                <table class="sim-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Cantidad</th>
                            <th>Costo Unit.</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${detalleMateriales.map(m => `
                            <tr>
                                <td>${m.nombre}</td>
                                <td>${m.cantidad} ${m.unidad}</td>
                                <td>$${m.costoUnitario.toFixed(2)}</td>
                                <td>$${m.costoTotal.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="3"><strong>Total Materiales/Pieza</strong></td>
                            <td><strong>$${costoMateriales.toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            ` : '<p class="text-muted">Sin BOM configurado - usando estimado</p>'}
        </div>

        <div class="sim-section">
            <h4><i class="fas fa-user-clock"></i> Mano de Obra</h4>
            <div class="sim-info-row">
                <span>Tiempo por pieza:</span>
                <strong>${tiempoTotal} min</strong>
            </div>
            <div class="sim-info-row">
                <span>Costo MO por pieza:</span>
                <strong>$${costoMOPorPieza.toFixed(2)}</strong>
            </div>
        </div>

        <div class="sim-section sim-totales">
            <h4><i class="fas fa-calculator"></i> Resumen para ${cantidad.toLocaleString()} piezas</h4>
            <div class="sim-grid">
                <div class="sim-item">
                    <span class="sim-label">Costo Materiales</span>
                    <span class="sim-value">$${costoTotalMateriales.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="sim-item">
                    <span class="sim-label">Costo Mano de Obra</span>
                    <span class="sim-value">$${costoTotalMO.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="sim-item">
                    <span class="sim-label">Costos Indirectos (15%)</span>
                    <span class="sim-value">$${costoIndirecto.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="sim-item highlight-danger">
                    <span class="sim-label">COSTO TOTAL</span>
                    <span class="sim-value">$${costoTotal.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="sim-item">
                    <span class="sim-label">Ingreso por Venta</span>
                    <span class="sim-value">$${ingresoTotal.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="sim-item ${utilidad >= 0 ? 'highlight-success' : 'highlight-danger'}">
                    <span class="sim-label">UTILIDAD</span>
                    <span class="sim-value">$${utilidad.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
            </div>
            <div class="sim-margen ${margen >= 30 ? 'margen-bueno' : margen >= 15 ? 'margen-medio' : 'margen-bajo'}">
                <span>Margen de Utilidad:</span>
                <strong>${margen.toFixed(1)}%</strong>
                <span class="margen-indicador">${margen >= 30 ? '✓ Excelente' : margen >= 15 ? '⚠ Aceptable' : '✗ Bajo'}</span>
            </div>
        </div>

        <div class="sim-section sim-equilibrio">
            <h4><i class="fas fa-balance-scale"></i> Análisis de Punto de Equilibrio</h4>
            <div class="equilibrio-grid">
                <div class="equilibrio-item">
                    <span class="equilibrio-label">Costo por pieza</span>
                    <span class="equilibrio-value">$${(costoTotal / cantidad).toFixed(2)}</span>
                </div>
                <div class="equilibrio-item">
                    <span class="equilibrio-label">Precio mínimo (margen 30%)</span>
                    <span class="equilibrio-value">$${((costoTotal / cantidad) / 0.7).toFixed(2)}</span>
                </div>
                <div class="equilibrio-item">
                    <span class="equilibrio-label">Precio mínimo (margen 20%)</span>
                    <span class="equilibrio-value">$${((costoTotal / cantidad) / 0.8).toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
}

// ========================================
// INTEGRACIÓN CON DASHBOARD
// ========================================

// Override de la función loadDashboard para agregar gráficas
const originalLoadDashboard = window.loadDashboard;
if (typeof originalLoadDashboard === 'function') {
    window.loadDashboard = function() {
        originalLoadDashboard();
        // Cargar gráficas después del dashboard
        setTimeout(loadDashboardCharts, 500);
    };
}

// ========================================
// BUSCADOR GLOBAL
// ========================================

// Variable global para el timeout
var globalSearchTimeout = null;

// Inicializar el buscador
function initSearchBox() {
    var searchInput = document.getElementById('globalSearchInput');
    var searchBox = document.getElementById('searchBox');

    if (!searchInput || !searchBox) {
        return;
    }

    // Crear contenedor de resultados si no existe
    var searchResults = document.getElementById('searchResults');
    if (!searchResults) {
        searchResults = document.createElement('div');
        searchResults.id = 'searchResults';
        searchResults.className = 'search-results-dropdown';
        searchBox.appendChild(searchResults);
    }

    // Evento de búsqueda - usar múltiples eventos para compatibilidad
    function handleSearch() {
        var query = searchInput.value.trim();
        var resultsEl = document.getElementById('searchResults');

        clearTimeout(globalSearchTimeout);

        if (query.length < 2) {
            if (resultsEl) {
                resultsEl.classList.remove('active');
                resultsEl.innerHTML = '';
            }
            return;
        }

        globalSearchTimeout = setTimeout(function() {
            performGlobalSearch(query);
        }, 250);
    }

    searchInput.oninput = handleSearch;
    searchInput.onkeyup = handleSearch;

    // Cerrar resultados al hacer click fuera
    document.addEventListener('click', function(e) {
        var resultsEl = document.getElementById('searchResults');
        var inputEl = document.getElementById('globalSearchInput');
        if (resultsEl && inputEl) {
            if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) {
                resultsEl.classList.remove('active');
            }
        }
    });

    // Navegación con teclado
    searchInput.onkeydown = function(e) {
        var resultsEl = document.getElementById('searchResults');
        if (!resultsEl) return;

        var items = resultsEl.querySelectorAll('.search-result-item');
        var activeItem = resultsEl.querySelector('.search-result-item.active');
        var currentIndex = -1;

        for (var i = 0; i < items.length; i++) {
            if (items[i] === activeItem) {
                currentIndex = i;
                break;
            }
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentIndex < items.length - 1) {
                for (var j = 0; j < items.length; j++) {
                    items[j].classList.remove('active');
                }
                items[currentIndex + 1].classList.add('active');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                for (var k = 0; k < items.length; k++) {
                    items[k].classList.remove('active');
                }
                items[currentIndex - 1].classList.add('active');
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeItem) {
                activeItem.click();
            }
        } else if (e.key === 'Escape') {
            resultsEl.classList.remove('active');
            searchInput.blur();
        }
    };
}

// Realizar búsqueda global
function performGlobalSearch(query) {
    var searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    var queryLower = query.toLowerCase();
    var results = [];

    // Buscar en Pedidos
    const pedidos = db.getPedidos();
    pedidos.forEach(pedido => {
        const cliente = db.getClientes().find(c => c.id === pedido.clienteId);
        const clienteNombre = cliente?.nombre || '';
        const productos = pedido.productos?.map(p => {
            const prod = db.getProductos().find(pr => pr.id === p.productoId);
            return prod?.nombre || '';
        }).join(', ') || '';

        if (
            pedido.id.toString().includes(queryLower) ||
            clienteNombre.toLowerCase().includes(queryLower) ||
            productos.toLowerCase().includes(queryLower) ||
            (pedido.estado && pedido.estado.toLowerCase().includes(queryLower))
        ) {
            results.push({
                type: 'pedido',
                icon: 'fas fa-clipboard-list',
                title: `Pedido #${pedido.id}`,
                subtitle: `${clienteNombre} - ${pedido.estado?.toUpperCase() || 'Sin estado'}`,
                extra: productos.substring(0, 50) + (productos.length > 50 ? '...' : ''),
                action: () => openPedidoDetail(pedido.id)
            });
        }
    });

    // Buscar en Clientes
    const clientes = db.getClientes();
    clientes.forEach(cliente => {
        if (
            cliente.nombre.toLowerCase().includes(queryLower) ||
            (cliente.rfc && cliente.rfc.toLowerCase().includes(queryLower)) ||
            (cliente.email && cliente.email.toLowerCase().includes(queryLower)) ||
            (cliente.telefono && cliente.telefono.includes(query))
        ) {
            results.push({
                type: 'cliente',
                icon: 'fas fa-building',
                title: cliente.nombre,
                subtitle: cliente.rfc || 'Sin RFC',
                extra: cliente.email || cliente.telefono || '',
                action: () => openClienteDetail(cliente.id)
            });
        }
    });

    // Buscar en Productos
    const productos = db.getProductos();
    productos.forEach(producto => {
        if (
            producto.nombre.toLowerCase().includes(queryLower) ||
            (producto.sku && producto.sku.toLowerCase().includes(queryLower)) ||
            (producto.familia && producto.familia.toLowerCase().includes(queryLower))
        ) {
            results.push({
                type: 'producto',
                icon: 'fas fa-box',
                title: producto.nombre,
                subtitle: producto.sku || 'Sin SKU',
                extra: producto.familia || '',
                action: () => openProductoDetail(producto.id)
            });
        }
    });

    // Buscar en Personal
    const personal = db.getPersonal();
    personal.forEach(persona => {
        if (
            persona.nombre.toLowerCase().includes(queryLower) ||
            (persona.puesto && persona.puesto.toLowerCase().includes(queryLower)) ||
            (persona.numeroEmpleado && persona.numeroEmpleado.toLowerCase().includes(queryLower))
        ) {
            results.push({
                type: 'personal',
                icon: 'fas fa-id-badge',
                title: persona.nombre,
                subtitle: persona.puesto || 'Sin puesto',
                extra: `#${persona.numeroEmpleado || persona.id}`,
                action: () => openPersonaDetail(persona.id)
            });
        }
    });

    // Buscar en Áreas de Planta
    const areas = db.getAreasPlanta();
    areas.forEach(area => {
        if (
            area.nombre.toLowerCase().includes(queryLower) ||
            (area.descripcion && area.descripcion.toLowerCase().includes(queryLower))
        ) {
            results.push({
                type: 'area',
                icon: 'fas fa-th-large',
                title: area.nombre,
                subtitle: `${area.estaciones || 0} estaciones`,
                extra: area.descripcion || '',
                action: () => {
                    navigateTo('procesos');
                    setTimeout(() => verDetalleArea(area.id), 300);
                }
            });
        }
    });

    // Renderizar resultados
    renderSearchResults(results, query);
}

// Renderizar resultados de búsqueda
function renderSearchResults(results, query) {
    var searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="search-no-results">
                <i class="fas fa-search"></i>
                <p>No se encontraron resultados para "<strong>${escapeHtml(query)}</strong>"</p>
            </div>
        `;
        searchResults.classList.add('active');
        return;
    }

    // Agrupar por tipo
    const grouped = {
        pedido: results.filter(r => r.type === 'pedido'),
        cliente: results.filter(r => r.type === 'cliente'),
        producto: results.filter(r => r.type === 'producto'),
        personal: results.filter(r => r.type === 'personal'),
        area: results.filter(r => r.type === 'area')
    };

    const typeLabels = {
        pedido: 'Pedidos',
        cliente: 'Clientes',
        producto: 'Productos',
        personal: 'Personal',
        area: 'Áreas de Planta'
    };

    const typeColors = {
        pedido: '#3b82f6',
        cliente: '#10b981',
        producto: '#f59e0b',
        personal: '#8b5cf6',
        area: '#ef4444'
    };

    let html = `<div class="search-results-header">
        <span>${results.length} resultado${results.length !== 1 ? 's' : ''} para "<strong>${escapeHtml(query)}</strong>"</span>
    </div>`;

    Object.keys(grouped).forEach(type => {
        const items = grouped[type];
        if (items.length === 0) return;

        html += `
            <div class="search-results-group">
                <div class="search-group-header" style="border-left-color: ${typeColors[type]}">
                    <span>${typeLabels[type]}</span>
                    <span class="search-group-count">${items.length}</span>
                </div>
                ${items.slice(0, 5).map((item, index) => `
                    <div class="search-result-item ${index === 0 && type === 'pedido' ? 'active' : ''}"
                         data-type="${item.type}" onclick="handleSearchResultClick(this, ${results.indexOf(item)})">
                        <div class="search-result-icon" style="background: ${typeColors[item.type]}20; color: ${typeColors[item.type]}">
                            <i class="${item.icon}"></i>
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-title">${highlightMatch(item.title, query)}</div>
                            <div class="search-result-subtitle">${highlightMatch(item.subtitle, query)}</div>
                            ${item.extra ? `<div class="search-result-extra">${highlightMatch(item.extra, query)}</div>` : ''}
                        </div>
                        <i class="fas fa-chevron-right search-result-arrow"></i>
                    </div>
                `).join('')}
                ${items.length > 5 ? `
                    <div class="search-see-more" onclick="seeMoreResults('${type}', '${escapeHtml(query)}')">
                        Ver ${items.length - 5} más en ${typeLabels[type]}
                    </div>
                ` : ''}
            </div>
        `;
    });

    searchResults.innerHTML = html;
    searchResults.classList.add('active');

    // Guardar resultados para navegación
    window.currentSearchResults = results;
}

// Manejar click en resultado
function handleSearchResultClick(element, index) {
    const results = window.currentSearchResults;
    if (results && results[index]) {
        results[index].action();
        document.getElementById('searchResults').classList.remove('active');
        document.querySelector('.search-box input').value = '';
    }
}

// Ver más resultados de un tipo
function seeMoreResults(type, query) {
    const sectionMap = {
        pedido: 'pedidos',
        cliente: 'clientes',
        producto: 'productos',
        personal: 'personal',
        area: 'procesos'
    };

    navigateTo(sectionMap[type]);
    document.getElementById('searchResults').classList.remove('active');

    // Intentar buscar en la sección
    setTimeout(() => {
        const sectionSearch = document.querySelector(`#section-${sectionMap[type]} input[type="text"]`);
        if (sectionSearch) {
            sectionSearch.value = query;
            sectionSearch.dispatchEvent(new Event('input'));
        }
    }, 300);
}

// Resaltar coincidencias
function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// Escapar caracteres especiales para regex
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Funciones auxiliares para abrir detalles
function openPedidoDetail(pedidoId) {
    navigateTo('pedidos');
    setTimeout(() => {
        if (typeof verDetallePedido === 'function') {
            verDetallePedido(pedidoId);
        }
    }, 300);
}

function openClienteDetail(clienteId) {
    navigateTo('clientes');
    setTimeout(() => {
        if (typeof verDetalleCliente === 'function') {
            verDetalleCliente(clienteId);
        }
    }, 300);
}

function openProductoDetail(productoId) {
    navigateTo('productos');
    setTimeout(() => {
        if (typeof verDetalleProducto === 'function') {
            verDetalleProducto(productoId);
        }
    }, 300);
}

function openPersonaDetail(personaId) {
    navigateTo('personal');
    setTimeout(() => {
        if (typeof verDetallePersona === 'function') {
            verDetallePersona(personaId);
        }
    }, 300);
}

// ========================================
// TOUR GUIADO (ONBOARDING)
// ========================================

function startTour() {
    if (typeof introJs === 'undefined') {
        showToast('Cargando tour...', 'info');
        return;
    }

    const intro = introJs();

    intro.setOptions({
        steps: [
            {
                title: '¡Bienvenido! 👋',
                intro: 'Este es el ERP de Multifundas. Te mostraremos las funciones principales del sistema.'
            },
            {
                element: '.sidebar',
                title: 'Menú de Navegación',
                intro: 'Desde aquí puedes acceder a todas las secciones: Pedidos, Clientes, Productos, Procesos, Personal, Costeo, Reportes y más.',
                position: 'right'
            },
            {
                element: '.kpi-grid',
                title: 'KPIs Principales',
                intro: 'Vista rápida de las métricas más importantes: procesos activos, clientes, operadores trabajando y ventas totales.',
                position: 'bottom'
            },
            {
                element: '.plant-map-section',
                title: 'Mapa de Planta',
                intro: 'Visualiza en tiempo real el estado de cada área y estación de trabajo. Los colores indican el estado de los operadores.',
                position: 'top'
            },
            {
                element: '#searchBox',
                title: 'Búsqueda Rápida',
                intro: 'Busca pedidos, clientes, productos o personal rápidamente escribiendo aquí.',
                position: 'bottom'
            },
            {
                element: '#notificationsBtn',
                title: 'Notificaciones',
                intro: 'Aquí verás alertas importantes: pedidos atrasados, entregas próximas, operadores inactivos y más.',
                position: 'left'
            },
            {
                element: '[data-section="pedidos"]',
                title: 'Gestión de Pedidos',
                intro: 'Administra todos los pedidos de producción, crea nuevos, actualiza estados y ve el progreso.',
                position: 'right'
            },
            {
                element: '[data-section="costeo"]',
                title: 'Costeo y Simulador',
                intro: 'Gestiona materiales, costos de mano de obra y usa el simulador para calcular rentabilidad.',
                position: 'right'
            },
            {
                element: '[data-section="reportes"]',
                title: 'Reportes',
                intro: 'Genera reportes detallados de producción, operadores y costos. Exporta a Excel o PDF.',
                position: 'right'
            },
            {
                title: '¡Listo! 🎉',
                intro: 'Ya conoces lo básico del sistema. Explora cada sección para descubrir más funcionalidades. ¡Éxito!'
            }
        ],
        showProgress: true,
        showBullets: true,
        exitOnOverlayClick: false,
        showStepNumbers: true,
        keyboardNavigation: true,
        doneLabel: 'Finalizar',
        nextLabel: 'Siguiente →',
        prevLabel: '← Anterior',
        skipLabel: 'Saltar tour'
    });

    intro.oncomplete(function() {
        localStorage.setItem('tourCompleted', 'true');
        showToast('¡Tour completado! Ya conoces el sistema', 'success');
    });

    intro.onexit(function() {
        localStorage.setItem('tourCompleted', 'true');
    });

    intro.start();
}

function checkFirstVisit() {
    if (!localStorage.getItem('tourCompleted')) {
        setTimeout(() => {
            const startTourModal = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">👋</div>
                    <h3 style="margin-bottom: 15px;">¡Bienvenido al ERP Multifundas!</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 25px;">
                        Parece que es tu primera vez aquí. ¿Te gustaría un tour rápido para conocer las funciones principales?
                    </p>
                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button class="btn btn-primary" onclick="closeModal(); startTour();">
                            <i class="fas fa-play"></i> Iniciar Tour
                        </button>
                        <button class="btn btn-secondary" onclick="localStorage.setItem('tourCompleted', 'true'); closeModal();">
                            Explorar solo
                        </button>
                    </div>
                </div>
            `;
            openModal('', startTourModal, null);
            document.getElementById('modalFooter').style.display = 'none';
        }, 1500);
    }
}

// ========================================
// IMPORTAR DESDE EXCEL
// ========================================

function openImportarExcel(tipo) {
    const templates = {
        clientes: {
            titulo: 'Importar Clientes',
            columnas: ['razonSocial', 'nombreComercial', 'tipo', 'contacto', 'email', 'telefono', 'direccion'],
            ejemplo: 'Empresa SA de CV, Empresa, estrategico, Juan Pérez, juan@empresa.com, 5512345678, Calle 123'
        },
        productos: {
            titulo: 'Importar Productos',
            columnas: ['nombre', 'clienteId', 'medidas', 'materiales', 'descripcion'],
            ejemplo: 'Funda Industrial, 1, 100x50cm, Tela premium, Funda resistente'
        },
        personal: {
            titulo: 'Importar Personal',
            columnas: ['nombre', 'rol', 'areaId', 'horaEntrada', 'horaSalida', 'salarioHora'],
            ejemplo: 'María García, operador, 7, 08:00, 17:00, 55'
        },
        materiales: {
            titulo: 'Importar Materiales',
            columnas: ['nombre', 'unidad', 'costo', 'proveedor'],
            ejemplo: 'Tela Oxford, metro, 28.50, Textiles del Norte'
        }
    };

    const config = templates[tipo];
    if (!config) return;

    const content = `
        <div class="importar-excel">
            <div class="import-info">
                <h4><i class="fas fa-info-circle"></i> Formato Requerido</h4>
                <p><strong>Columnas:</strong></p>
                <code>${config.columnas.join(', ')}</code>
                <p style="margin-top: 10px;"><strong>Ejemplo:</strong></p>
                <code style="font-size: 0.8rem;">${config.ejemplo}</code>
            </div>

            <div class="form-group">
                <label><i class="fas fa-file-excel"></i> Seleccionar archivo Excel o CSV</label>
                <input type="file" id="importFile" accept=".xlsx,.xls,.csv" class="form-control" onchange="previewImport('${tipo}')">
            </div>

            <div id="importPreview" class="import-preview" style="display: none;">
                <h5><i class="fas fa-eye"></i> Vista Previa</h5>
                <div id="previewTable" style="max-height: 200px; overflow: auto;"></div>
                <p id="previewCount" class="text-success" style="margin-top: 10px;"></p>
            </div>

            <div class="import-template">
                <p><i class="fas fa-download"></i> ¿No tienes el formato correcto?</p>
                <button class="btn btn-sm btn-secondary" onclick="downloadTemplate('${tipo}')">
                    <i class="fas fa-file-download"></i> Descargar Plantilla
                </button>
            </div>
        </div>
    `;

    openModal(config.titulo, content, () => executeImport(tipo));
    document.getElementById('modalConfirm').innerHTML = '<i class="fas fa-upload"></i> Importar Datos';
}

function previewImport(tipo) {
    const file = document.getElementById('importFile').files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        let data;

        try {
            if (file.name.endsWith('.csv')) {
                data = parseCSV(e.target.result);
            } else {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                data = XLSX.utils.sheet_to_json(sheet);
            }

            window.importData = data;

            const preview = document.getElementById('importPreview');
            const previewTable = document.getElementById('previewTable');
            const previewCount = document.getElementById('previewCount');

            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                const previewRows = data.slice(0, 5);

                previewTable.innerHTML = `
                    <table class="data-table" style="font-size: 0.8rem;">
                        <thead>
                            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${previewRows.map(row => `
                                <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
                previewCount.innerHTML = `<i class="fas fa-check-circle"></i> ${data.length} registros listos para importar`;
                preview.style.display = 'block';
            }
        } catch (error) {
            showToast('Error al leer el archivo: ' + error.message, 'error');
        }
    };

    if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsBinaryString(file);
    }
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => {
            obj[h] = values[i] || '';
        });
        return obj;
    }).filter(row => Object.values(row).some(v => v));
}

function executeImport(tipo) {
    const data = window.importData;
    if (!data || data.length === 0) {
        showToast('No hay datos para importar', 'error');
        return;
    }

    let imported = 0;
    let errors = 0;

    data.forEach(row => {
        try {
            switch(tipo) {
                case 'clientes':
                    db.addCliente({
                        razonSocial: row.razonSocial || row['Razón Social'] || '',
                        nombreComercial: row.nombreComercial || row['Nombre Comercial'] || row.razonSocial || '',
                        tipo: row.tipo || 'externo',
                        contacto: row.contacto || '',
                        email: row.email || '',
                        telefono: row.telefono || '',
                        direccion: row.direccion || '',
                        accesoPortal: false,
                        fechaAlta: new Date().toISOString().split('T')[0]
                    });
                    break;

                case 'productos':
                    db.addProducto({
                        nombre: row.nombre || '',
                        clienteId: parseInt(row.clienteId) || null,
                        medidas: row.medidas || '',
                        materiales: row.materiales || '',
                        descripcion: row.descripcion || '',
                        rutaProcesos: [],
                        activo: true
                    });
                    break;

                case 'personal':
                    db.addPersonal({
                        nombre: row.nombre || '',
                        rol: row.rol || 'operador',
                        areaId: parseInt(row.areaId) || null,
                        horaEntrada: row.horaEntrada || '08:00',
                        horaSalida: row.horaSalida || '17:00',
                        horaComida: '13:00',
                        salarioHora: parseFloat(row.salarioHora) || 50,
                        activo: true,
                        posiciones: []
                    });
                    break;

                case 'materiales':
                    db.addMaterial({
                        nombre: row.nombre || '',
                        unidad: row.unidad || 'pieza',
                        costo: parseFloat(row.costo) || 0,
                        proveedor: row.proveedor || ''
                    });
                    break;
            }
            imported++;
        } catch (e) {
            console.error('Error importando:', row, e);
            errors++;
        }
    });

    window.importData = null;
    loadSectionContent(app.currentSection);

    if (imported > 0) {
        showToast(`Importación exitosa: ${imported} registros agregados`, 'success');
        db.addAuditoria('Importación masiva', `${tipo}: ${imported} registros importados`, tipo, null);
    }
    if (errors > 0) {
        showToast(`${errors} registros con errores`, 'warning');
    }
}

function downloadTemplate(tipo) {
    const templates = {
        clientes: [
            { razonSocial: 'Empresa Ejemplo SA de CV', nombreComercial: 'Empresa Ejemplo', tipo: 'estrategico', contacto: 'Juan Pérez', email: 'contacto@empresa.com', telefono: '5551234567', direccion: 'Av. Principal 123, Ciudad' }
        ],
        productos: [
            { nombre: 'Funda Industrial Ejemplo', clienteId: 1, medidas: '120x80cm', materiales: 'Tela Oxford, Cierre, Velcro', descripcion: 'Funda resistente para uso industrial' }
        ],
        personal: [
            { nombre: 'María García López', rol: 'operador', areaId: 7, horaEntrada: '08:00', horaSalida: '17:00', salarioHora: 55 }
        ],
        materiales: [
            { nombre: 'Tela Oxford Premium', unidad: 'metro', costo: 32.50, proveedor: 'Textiles del Norte SA' }
        ]
    };

    const data = templates[tipo];
    if (!data) return;

    exportToExcel(data, `plantilla_${tipo}`, 'Plantilla');
    showToast('Plantilla descargada', 'success');
}

// ========================================
// BACKUP Y RESTORE
// ========================================

function openBackupRestore() {
    const lastBackup = localStorage.getItem('lastBackup') || 'Nunca';

    const content = `
        <div class="backup-restore">
            <div class="backup-section" style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4><i class="fas fa-download" style="color: #10b981;"></i> Crear Respaldo</h4>
                <p>Descarga una copia completa de todos los datos del sistema (pedidos, clientes, productos, personal, etc.).</p>
                <button class="btn btn-primary" onclick="createBackup()" style="margin-top: 10px;">
                    <i class="fas fa-database"></i> Descargar Respaldo Completo
                </button>
                <p class="text-muted" style="margin-top: 10px; font-size: 0.85rem;">
                    <i class="fas fa-clock"></i> Último respaldo: ${lastBackup}
                </p>
            </div>

            <div class="restore-section" style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h4><i class="fas fa-upload" style="color: #f59e0b;"></i> Restaurar Respaldo</h4>
                <p style="color: #b45309;"><i class="fas fa-exclamation-triangle"></i> <strong>Advertencia:</strong> Esto reemplazará TODOS los datos actuales.</p>
                <div class="form-group" style="margin: 15px 0;">
                    <input type="file" id="restoreFile" accept=".json" class="form-control">
                </div>
                <button class="btn" style="background: #f59e0b; color: white;" onclick="restoreBackup()">
                    <i class="fas fa-undo"></i> Restaurar desde Archivo
                </button>
            </div>

            <div class="reset-section" style="background: #fef2f2; padding: 20px; border-radius: 8px;">
                <h4><i class="fas fa-trash" style="color: #ef4444;"></i> Restablecer Sistema</h4>
                <p style="color: #dc2626;"><strong>Peligro:</strong> Elimina PERMANENTEMENTE todos los datos y vuelve a la configuración inicial.</p>
                <button class="btn" style="background: transparent; border: 2px solid #ef4444; color: #ef4444;" onclick="resetSystem()">
                    <i class="fas fa-exclamation-circle"></i> Restablecer Todo
                </button>
            </div>
        </div>
    `;

    openModal('Respaldo y Restauración', content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

function createBackup() {
    const allData = {
        clientes: db.getClientes(),
        pedidos: db.getPedidos(),
        productos: db.getProductos(),
        personal: db.getPersonal(),
        materiales: db.getMateriales(),
        areas: db.getAreas(),
        areasPlanta: db.getAreasPlanta(),
        estaciones: db.getEstaciones(),
        auditoria: db.getAuditoria(),
        bom: db.getBOM()
    };

    const backup = {
        version: '1.0',
        fecha: new Date().toISOString(),
        sistema: 'ERP Multifundas',
        data: allData
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_multifundas_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    localStorage.setItem('lastBackup', new Date().toLocaleString('es-MX'));
    showToast('Respaldo creado correctamente', 'success');
    db.addAuditoria('Respaldo creado', 'Backup completo del sistema descargado', 'sistema', null);

    closeModal();
    openBackupRestore();
}

function restoreBackup() {
    const file = document.getElementById('restoreFile').files[0];
    if (!file) {
        showToast('Selecciona un archivo de respaldo (.json)', 'error');
        return;
    }

    if (!confirm('⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales del sistema.\n\n¿Estás seguro de que deseas continuar?')) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);

            if (!backup.data || !backup.version || !backup.sistema) {
                throw new Error('El archivo no tiene un formato de respaldo válido');
            }

            // Restaurar cada colección
            const currentData = JSON.parse(localStorage.getItem('erp_multifundas_db') || '{}');

            if (backup.data.clientes) currentData.clientes = backup.data.clientes;
            if (backup.data.pedidos) currentData.pedidos = backup.data.pedidos;
            if (backup.data.productos) currentData.productos = backup.data.productos;
            if (backup.data.personal) currentData.personal = backup.data.personal;
            if (backup.data.materiales) currentData.materiales = backup.data.materiales;
            if (backup.data.areas) currentData.areas = backup.data.areas;
            if (backup.data.areasPlanta) currentData.areasPlanta = backup.data.areasPlanta;
            if (backup.data.estaciones) currentData.estaciones = backup.data.estaciones;
            if (backup.data.bom) currentData.bom = backup.data.bom;

            localStorage.setItem('erp_multifundas_db', JSON.stringify(currentData));

            showToast('Respaldo restaurado correctamente. Recargando...', 'success');

            setTimeout(() => {
                location.reload();
            }, 2000);

        } catch (error) {
            console.error('Error restaurando:', error);
            showToast('Error al restaurar: ' + error.message, 'error');
        }
    };

    reader.readAsText(file);
}

function resetSystem() {
    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará PERMANENTEMENTE todos los datos del sistema.\n\nEsta acción NO se puede deshacer.\n\n¿Estás absolutamente seguro?')) {
        return;
    }

    if (!confirm('🚨 CONFIRMACIÓN FINAL:\n\nSe eliminarán todos los:\n- Pedidos\n- Clientes\n- Productos\n- Personal\n- Materiales\n- Registros de auditoría\n\n¿Continuar?')) {
        return;
    }

    localStorage.removeItem('erp_multifundas_db');
    localStorage.removeItem('tourCompleted');
    localStorage.removeItem('lastBackup');

    showToast('Sistema restablecido. Recargando...', 'warning');

    setTimeout(() => {
        location.reload();
    }, 1500);
}

// ========================================
// MENÚ DE HERRAMIENTAS RÁPIDAS
// ========================================

function openToolsMenu() {
    // Redirigir al menú de herramientas completo
    openToolsMenuComplete();
}

// ========================================
// ATAJOS DE TECLADO
// ========================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ignorar si está en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        // Ctrl/Cmd + K = Búsqueda
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('globalSearchInput');
            if (searchInput) searchInput.focus();
        }

        // ? = Mostrar atajos
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            showShortcutsHelp();
        }

        // T = Herramientas
        if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            openToolsMenu();
        }

        // Números 1-9 para navegación
        if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
            const sections = ['dashboard', 'pedidos', 'clientes', 'productos', 'procesos', 'personal', 'costeo', 'reportes', 'auditoria'];
            const index = parseInt(e.key) - 1;
            if (sections[index]) {
                e.preventDefault();
                navigateTo(sections[index]);
            }
        }

        // Escape = Cerrar modal
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

function showShortcutsHelp() {
    const content = `
        <div class="shortcuts-help">
            <div class="shortcut-group">
                <h4>Navegación</h4>
                <div class="shortcut-item"><kbd>1</kbd> - <kbd>9</kbd> <span>Ir a sección</span></div>
                <div class="shortcut-item"><kbd>Ctrl</kbd> + <kbd>K</kbd> <span>Búsqueda rápida</span></div>
                <div class="shortcut-item"><kbd>Esc</kbd> <span>Cerrar modal</span></div>
            </div>
            <div class="shortcut-group">
                <h4>Herramientas</h4>
                <div class="shortcut-item"><kbd>T</kbd> <span>Abrir herramientas</span></div>
                <div class="shortcut-item"><kbd>?</kbd> <span>Ver esta ayuda</span></div>
            </div>
            <div class="shortcut-group">
                <h4>Secciones</h4>
                <div class="shortcut-item"><kbd>1</kbd> Dashboard</div>
                <div class="shortcut-item"><kbd>2</kbd> Pedidos</div>
                <div class="shortcut-item"><kbd>3</kbd> Clientes</div>
                <div class="shortcut-item"><kbd>4</kbd> Productos</div>
                <div class="shortcut-item"><kbd>5</kbd> Procesos</div>
                <div class="shortcut-item"><kbd>6</kbd> Personal</div>
                <div class="shortcut-item"><kbd>7</kbd> Costeo</div>
                <div class="shortcut-item"><kbd>8</kbd> Reportes</div>
            </div>
        </div>

        <style>
            .shortcuts-help {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 25px;
            }
            .shortcut-group h4 {
                margin-bottom: 15px;
                color: var(--primary-color);
                border-bottom: 2px solid var(--primary-color);
                padding-bottom: 8px;
            }
            .shortcut-item {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 10px;
                font-size: 0.9rem;
            }
            kbd {
                background: var(--bg-tertiary);
                border: 1px solid var(--border-color);
                padding: 3px 8px;
                border-radius: 4px;
                font-family: monospace;
                font-size: 0.85rem;
                box-shadow: 0 2px 0 var(--border-color);
            }
        </style>
    `;

    openModal('Atajos de Teclado', content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// Inicializar atajos de teclado al cargar
document.addEventListener('DOMContentLoaded', function() {
    initKeyboardShortcuts();
    // Verificar primera visita después de un momento
    setTimeout(checkFirstVisit, 2000);
});

// ========================================
// FILTRO DE PERIODO PARA REPORTES
// ========================================

// Función para manejar cambio de periodo en reportes
function onReportPeriodChange() {
    // Recargar el reporte activo con el nuevo periodo
    const activeTab = document.querySelector('.reportes-tabs .tab.active');
    if (activeTab) {
        activeTab.click();
    }
}

// Función auxiliar para filtrar datos por periodo
function filtrarPorPeriodo(items, campoFecha = 'fecha') {
    const periodo = document.getElementById('reportPeriod')?.value || 'semana';
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    let fechaInicio;

    switch(periodo) {
        case 'hoy':
            fechaInicio = hoy;
            break;
        case 'semana':
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(fechaInicio.getDate() - 7);
            break;
        case 'quincena':
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(fechaInicio.getDate() - 15);
            break;
        case 'mes':
            fechaInicio = new Date(hoy);
            fechaInicio.setMonth(fechaInicio.getMonth() - 1);
            break;
        case 'historico':
            // Retornar todos los items sin filtrar
            return items;
        default:
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(fechaInicio.getDate() - 7);
    }

    return items.filter(item => {
        const fechaItem = new Date(item[campoFecha]);
        return fechaItem >= fechaInicio;
    });
}

// Obtener label del periodo actual
function getLabelPeriodo() {
    const periodo = document.getElementById('reportPeriod')?.value || 'semana';
    const labels = {
        'hoy': 'Hoy',
        'semana': 'Esta Semana',
        'quincena': 'Últimos 15 días',
        'mes': 'Este Mes',
        'historico': 'Histórico (Todo)'
    };
    return labels[periodo] || 'Esta Semana';
}

// Obtener rango de fechas del periodo actual
function getRangoPeriodo() {
    const periodo = document.getElementById('reportPeriod')?.value || 'semana';
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    let fechaInicio;
    const fechaFin = new Date(hoy);
    fechaFin.setHours(23, 59, 59, 999);

    switch(periodo) {
        case 'hoy':
            fechaInicio = hoy;
            break;
        case 'semana':
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(fechaInicio.getDate() - 7);
            break;
        case 'quincena':
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(fechaInicio.getDate() - 15);
            break;
        case 'mes':
            fechaInicio = new Date(hoy);
            fechaInicio.setMonth(fechaInicio.getMonth() - 1);
            break;
        case 'historico':
            fechaInicio = new Date(2020, 0, 1); // Fecha muy antigua
            break;
        default:
            fechaInicio = new Date(hoy);
            fechaInicio.setDate(fechaInicio.getDate() - 7);
    }

    return { inicio: fechaInicio, fin: fechaFin };
}

// ========================================
// GESTIÓN DE ESTADO DE EMPLEADOS (INHABILITAR/REHABILITAR)
// ========================================

// Función para inhabilitar o rehabilitar un empleado
function toggleEmpleadoEstado(id) {
    const emp = db.getEmpleado(id);
    const estaActivo = emp.activo !== false;

    if (estaActivo) {
        // Mostrar modal para inhabilitar con motivo
        showInhabilitarEmpleadoModal(id);
    } else {
        // Rehabilitar directamente con confirmación
        if (confirm(`¿Desea rehabilitar a ${emp.nombre}?\n\nEl empleado volverá a estar disponible para asignaciones.`)) {
            db.updateEmpleado(id, {
                activo: true,
                fechaRehabilitacion: new Date().toISOString(),
                motivoBaja: null,
                fechaBaja: null
            });
            showToast(`${emp.nombre} ha sido rehabilitado exitosamente`, 'success');
            loadPersonal();
        }
    }
}

// Modal para inhabilitar empleado con motivo
function showInhabilitarEmpleadoModal(empleadoId) {
    const empleado = db.getEmpleado(empleadoId);

    const content = `
        <form id="inhabilitarEmpleadoForm">
            <div class="alert alert-warning mb-3">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Atención:</strong> Al inhabilitar a este empleado, se eliminará de todas las asignaciones activas pero sus datos e historial se conservarán.
            </div>

            <div class="empleado-info-card mb-3">
                <div class="empleado-avatar">
                    <span class="workstation" style="width:60px;height:60px;display:inline-flex;">
                        <span class="workstation-initials">${getIniciales(empleado.nombre)}</span>
                    </span>
                </div>
                <div class="empleado-details">
                    <h4>${empleado.nombre}</h4>
                    <p><strong>Rol:</strong> ${capitalizeFirst(empleado.rol)}</p>
                    <p><strong>Fecha de ingreso:</strong> ${empleado.fechaIngreso ? new Date(empleado.fechaIngreso).toLocaleDateString() : 'No registrada'}</p>
                </div>
            </div>

            <div class="form-group">
                <label>Motivo de la baja <span class="required">*</span></label>
                <select id="motivoBaja" required>
                    <option value="">Seleccionar motivo...</option>
                    <option value="renuncia">Renuncia voluntaria</option>
                    <option value="despido">Despido</option>
                    <option value="fin_contrato">Fin de contrato</option>
                    <option value="licencia">Licencia prolongada</option>
                    <option value="incapacidad">Incapacidad</option>
                    <option value="jubilacion">Jubilación</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div class="form-group" id="otroMotivoGroup" style="display:none;">
                <label>Especifique el motivo</label>
                <input type="text" id="otroMotivo" placeholder="Describa el motivo...">
            </div>

            <div class="form-group">
                <label>Fecha de baja</label>
                <input type="date" id="fechaBaja" value="${new Date().toISOString().split('T')[0]}">
            </div>

            <div class="form-group">
                <label>Observaciones adicionales</label>
                <textarea id="observacionesBaja" rows="3" placeholder="Notas adicionales sobre la baja..."></textarea>
            </div>
        </form>

        <script>
            document.getElementById('motivoBaja').addEventListener('change', function() {
                document.getElementById('otroMotivoGroup').style.display = this.value === 'otro' ? 'block' : 'none';
            });
        </script>
    `;

    openModal('Inhabilitar Empleado', content, () => confirmarInhabilitarEmpleado(empleadoId));
}

// Confirmar inhabilitación
function confirmarInhabilitarEmpleado(empleadoId) {
    const motivo = document.getElementById('motivoBaja').value;
    const otroMotivo = document.getElementById('otroMotivo')?.value;
    const fechaBaja = document.getElementById('fechaBaja').value;
    const observaciones = document.getElementById('observacionesBaja').value;

    if (!motivo) {
        showToast('Debe seleccionar un motivo de baja', 'error');
        return;
    }

    const empleado = db.getEmpleado(empleadoId);
    const motivoFinal = motivo === 'otro' ? otroMotivo : motivo;

    // Guardar historial de baja
    const historialBajas = empleado.historialBajas || [];
    historialBajas.push({
        fecha: fechaBaja || new Date().toISOString().split('T')[0],
        motivo: motivoFinal,
        observaciones: observaciones,
        registradoPor: 'Admin',
        timestamp: new Date().toISOString()
    });

    // Actualizar empleado
    db.updateEmpleado(empleadoId, {
        activo: false,
        fechaBaja: fechaBaja || new Date().toISOString().split('T')[0],
        motivoBaja: motivoFinal,
        observacionesBaja: observaciones,
        historialBajas: historialBajas,
        posiciones: [] // Liberar posiciones asignadas
    });

    // Liberar estaciones asignadas
    const estadoOps = db.getEstadoOperadores();
    const estadoOp = estadoOps.find(e => e.operadorId === empleadoId);
    if (estadoOp) {
        db.updateEstadoOperador(empleadoId, { estado: 'inhabilitado', estacionId: null });
    }

    closeModal();
    showToast(`${empleado.nombre} ha sido inhabilitado. Sus datos se conservan en el sistema.`, 'warning');
    loadPersonal();
}

// Ver historial de un empleado inhabilitado
function verHistorialEmpleado(empleadoId) {
    const empleado = db.getEmpleado(empleadoId);
    const historial = empleado.historialBajas || [];

    const motivosTexto = {
        'renuncia': 'Renuncia voluntaria',
        'despido': 'Despido',
        'fin_contrato': 'Fin de contrato',
        'licencia': 'Licencia prolongada',
        'incapacidad': 'Incapacidad',
        'jubilacion': 'Jubilación',
        'otro': 'Otro'
    };

    const content = `
        <div class="empleado-historial">
            <div class="empleado-info-card mb-3">
                <div class="empleado-avatar">
                    <span class="workstation inhabilitado" style="width:60px;height:60px;display:inline-flex;">
                        <span class="workstation-initials">${getIniciales(empleado.nombre)}</span>
                    </span>
                </div>
                <div class="empleado-details">
                    <h4>${empleado.nombre}</h4>
                    <p><strong>Rol:</strong> ${capitalizeFirst(empleado.rol)}</p>
                    <p><strong>Estado:</strong> <span class="status-badge danger">Inhabilitado</span></p>
                </div>
            </div>

            <h4><i class="fas fa-clock"></i> Información de Baja Actual</h4>
            <div class="card mb-3" style="padding: 15px;">
                <p><strong>Fecha de baja:</strong> ${empleado.fechaBaja ? new Date(empleado.fechaBaja).toLocaleDateString() : 'No registrada'}</p>
                <p><strong>Motivo:</strong> ${motivosTexto[empleado.motivoBaja] || empleado.motivoBaja || 'No especificado'}</p>
                ${empleado.observacionesBaja ? `<p><strong>Observaciones:</strong> ${empleado.observacionesBaja}</p>` : ''}
            </div>

            ${historial.length > 0 ? `
                <h4><i class="fas fa-history"></i> Historial de Bajas</h4>
                <div class="historial-timeline">
                    ${historial.map((h, idx) => `
                        <div class="historial-item">
                            <div class="historial-fecha">
                                <i class="fas fa-calendar"></i>
                                ${new Date(h.fecha).toLocaleDateString()}
                            </div>
                            <div class="historial-contenido">
                                <strong>${motivosTexto[h.motivo] || h.motivo}</strong>
                                ${h.observaciones ? `<p class="text-muted">${h.observaciones}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="text-muted">No hay historial de bajas anteriores.</p>'}

            <div class="mt-3">
                <button class="btn btn-success" onclick="toggleEmpleadoEstado(${empleadoId}); closeModal();">
                    <i class="fas fa-user-check"></i> Rehabilitar Empleado
                </button>
            </div>
        </div>
    `;

    openModal(`Historial - ${empleado.nombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
}

// ========================================
// DIAGRAMA DE GANTT
// ========================================

function openGanttView() {
    const pedidos = db.getPedidos().filter(p => p.estado !== 'entregado');
    const clientes = db.getClientes();

    if (pedidos.length === 0) {
        openModal('📊 Diagrama de Gantt', `
            <div class="empty-state-modern">
                <i class="fas fa-calendar-times"></i>
                <h3>Sin Pedidos Activos</h3>
                <p>No hay pedidos en producción para mostrar</p>
            </div>
        `, null);
        document.getElementById('modalFooter').style.display = 'none';
        return;
    }

    const tasks = pedidos.map(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);
        const prod = pedido.productos[0];
        const progreso = prod ? Math.round((prod.completadas / prod.cantidad) * 100) : 0;

        return {
            id: `pedido-${pedido.id}`,
            name: `#${pedido.id} ${cliente?.nombreComercial || ''}`,
            start: pedido.fechaCarga,
            end: pedido.fechaEntrega,
            progress: progreso,
            custom_class: `gantt-${pedido.prioridad}`
        };
    });

    const content = `
        <div class="gantt-modern">
            <div class="gantt-toolbar-modern">
                <div class="gantt-view-btns">
                    <button class="view-btn active" onclick="changeGanttView('Week'); setActiveViewBtn(this)">
                        <i class="fas fa-calendar-week"></i> Semana
                    </button>
                    <button class="view-btn" onclick="changeGanttView('Month'); setActiveViewBtn(this)">
                        <i class="fas fa-calendar"></i> Mes
                    </button>
                    <button class="view-btn" onclick="changeGanttView('Day'); setActiveViewBtn(this)">
                        <i class="fas fa-calendar-day"></i> Día
                    </button>
                </div>
                <div class="gantt-legend-modern">
                    <span class="legend-item"><span class="dot alta"></span>Alta</span>
                    <span class="legend-item"><span class="dot media"></span>Media</span>
                    <span class="legend-item"><span class="dot baja"></span>Normal</span>
                </div>
            </div>
            <div id="ganttContainer" class="gantt-container-modern"></div>
        </div>
    `;

    openModal('📊 Diagrama de Gantt', content, null);
    document.getElementById('modalFooter').style.display = 'none';
    document.querySelector('.modal').style.maxWidth = '95vw';
    document.querySelector('.modal').style.width = '1200px';

    setTimeout(() => {
        window.ganttChart = new Gantt("#ganttContainer", tasks, {
            view_mode: 'Week',
            date_format: 'YYYY-MM-DD',
            language: 'es',
            bar_height: 35,
            bar_corner_radius: 5,
            padding: 18,
            popup_trigger: 'click',
            custom_popup_html: function(task) {
                const pedidoId = task.id.replace('pedido-', '');
                const pedido = db.getPedido(parseInt(pedidoId));
                const cliente = clientes.find(c => c.id === pedido?.clienteId);

                return `
                    <div class="gantt-popup-modern">
                        <div class="popup-header">
                            <strong>${task.name}</strong>
                            <span class="popup-progress">${task.progress}%</span>
                        </div>
                        <div class="popup-dates">
                            <span><i class="fas fa-play"></i> ${task.start}</span>
                            <span><i class="fas fa-flag-checkered"></i> ${task.end}</span>
                        </div>
                        <div class="popup-progress-bar">
                            <div class="popup-progress-fill" style="width: ${task.progress}%"></div>
                        </div>
                        <button class="popup-btn" onclick="closeModal(); viewPedido(${pedidoId})">
                            Ver Pedido <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                `;
            }
        });
    }, 200);
}

function setActiveViewBtn(btn) {
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function changeGanttView(mode) {
    if (window.ganttChart) {
        window.ganttChart.change_view_mode(mode);
    }
}

function openGanttPedido(pedidoId) {
    const pedido = db.getPedido(pedidoId);
    if (!pedido) return;

    const cliente = db.getCliente(pedido.clienteId);
    const prod = pedido.productos[0];
    const producto = db.getProducto(prod?.productoId);

    const tasks = [];
    let currentDate = new Date(pedido.fechaCarga);
    const diasTotales = Math.ceil((new Date(pedido.fechaEntrega) - new Date(pedido.fechaCarga)) / (1000 * 60 * 60 * 24));
    const diasPorProceso = Math.max(1, Math.floor(diasTotales / (prod?.avanceProcesos?.length || 1)));

    prod?.avanceProcesos?.forEach((proceso, index) => {
        const startDate = new Date(currentDate);
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + diasPorProceso);

        const progreso = prod.cantidad > 0 ? Math.round((proceso.completadas / prod.cantidad) * 100) : 0;

        tasks.push({
            id: `proc-${index}`,
            name: `${index + 1}. ${proceso.nombre}`,
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            progress: progreso,
            dependencies: index > 0 ? `proc-${index - 1}` : '',
            custom_class: proceso.estado === 'completado' ? 'gantt-completado' :
                         proceso.estado === 'en_proceso' ? 'gantt-en-proceso' : 'gantt-pendiente'
        });

        currentDate = new Date(endDate);
    });

    const content = `
        <div class="gantt-pedido-header">
            <div class="pedido-info">
                <h4>Pedido #${pedido.id}</h4>
                <p>${cliente?.razonSocial || 'N/A'} - ${producto?.nombre || 'Producto'}</p>
                <p><strong>${prod?.completadas || 0}</strong> / ${prod?.cantidad || 0} piezas completadas</p>
            </div>
            <div class="pedido-dates">
                <span><i class="fas fa-calendar-plus"></i> Inicio: ${pedido.fechaCarga}</span>
                <span><i class="fas fa-calendar-check"></i> Entrega: ${pedido.fechaEntrega}</span>
            </div>
        </div>
        <div class="gantt-legend mb-3">
            <span class="legend-item"><span class="dot completado"></span> Completado</span>
            <span class="legend-item"><span class="dot en-proceso"></span> En Proceso</span>
            <span class="legend-item"><span class="dot pendiente"></span> Pendiente</span>
        </div>
        <div id="ganttPedidoContainer" class="gantt-container"></div>
    `;

    openModal('Timeline de Producción', content, null);
    document.getElementById('modalFooter').style.display = 'none';
    document.querySelector('.modal').style.maxWidth = '95vw';
    document.querySelector('.modal').style.width = '1200px';

    setTimeout(() => {
        if (tasks.length > 0 && typeof Gantt !== 'undefined') {
            new Gantt("#ganttPedidoContainer", tasks, {
                view_mode: 'Day',
                date_format: 'YYYY-MM-DD',
                language: 'es',
                bar_height: 30,
                bar_corner_radius: 5,
                padding: 15
            });
        } else {
            document.getElementById('ganttPedidoContainer').innerHTML = '<p class="text-muted p-4">No hay procesos definidos</p>';
        }
    }, 300);
}

// ========================================
// CALENDARIO DE ENTREGAS
// ========================================

function openCalendarioEntregas() {
    window.calendarioMes = new Date().getMonth();
    window.calendarioAnio = new Date().getFullYear();
    renderCalendarioMejorado();
}

function renderCalendarioMejorado() {
    const mes = window.calendarioMes;
    const anio = window.calendarioAnio;
    const pedidos = db.getPedidos();
    const clientes = db.getClientes();

    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Agrupar pedidos por día
    const pedidosPorDia = {};
    pedidos.forEach(pedido => {
        if (pedido.fechaEntrega) {
            const [year, month, day] = pedido.fechaEntrega.split('-').map(Number);
            if (year === anio && month === mes + 1) {
                if (!pedidosPorDia[day]) pedidosPorDia[day] = [];
                pedidosPorDia[day].push(pedido);
            }
        }
    });

    // Generar días
    let diasHTML = '';
    const hoy = new Date();

    // Días vacíos
    for (let i = 0; i < primerDiaSemana; i++) {
        diasHTML += '<div class="cal-day-new empty"></div>';
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
        const esHoy = dia === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
        const pedidosDelDia = pedidosPorDia[dia] || [];
        const numPedidos = pedidosDelDia.length;

        // Determinar color por prioridad más alta
        let colorClass = '';
        if (pedidosDelDia.some(p => p.prioridad === 'alta')) colorClass = 'has-alta';
        else if (pedidosDelDia.some(p => p.prioridad === 'media')) colorClass = 'has-media';
        else if (numPedidos > 0) colorClass = 'has-baja';

        diasHTML += `
            <div class="cal-day-new ${esHoy ? 'today' : ''} ${colorClass}"
                 onclick="showDiaDetalleNuevo(${anio}, ${mes + 1}, ${dia})"
                 ${numPedidos > 0 ? `data-tooltip="${numPedidos} entrega(s)"` : ''}>
                <span class="day-number">${dia}</span>
                ${numPedidos > 0 ? `<span class="day-badge">${numPedidos}</span>` : ''}
            </div>
        `;
    }

    // Estadísticas del mes
    const pedidosMes = pedidos.filter(p => {
        if (!p.fechaEntrega) return false;
        const [y, m] = p.fechaEntrega.split('-').map(Number);
        return y === anio && m === mes + 1;
    });
    const altaPrioridad = pedidosMes.filter(p => p.prioridad === 'alta').length;
    const mediaPrioridad = pedidosMes.filter(p => p.prioridad === 'media').length;

    const content = `
        <div class="calendario-modern">
            <!-- Header con navegación -->
            <div class="cal-header-modern">
                <button class="cal-nav-btn" onclick="cambiarMesNuevo(-1)">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="cal-title">
                    <h2>${meses[mes]}</h2>
                    <span>${anio}</span>
                </div>
                <button class="cal-nav-btn" onclick="cambiarMesNuevo(1)">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>

            <!-- Stats rápidos -->
            <div class="cal-stats">
                <div class="cal-stat">
                    <span class="cal-stat-value">${pedidosMes.length}</span>
                    <span class="cal-stat-label">Entregas</span>
                </div>
                <div class="cal-stat alta">
                    <span class="cal-stat-value">${altaPrioridad}</span>
                    <span class="cal-stat-label">Urgentes</span>
                </div>
                <div class="cal-stat media">
                    <span class="cal-stat-value">${mediaPrioridad}</span>
                    <span class="cal-stat-label">Media</span>
                </div>
                <div class="cal-stat">
                    <span class="cal-stat-value">${Object.keys(pedidosPorDia).length}</span>
                    <span class="cal-stat-label">Días</span>
                </div>
            </div>

            <!-- Leyenda -->
            <div class="cal-legend-modern">
                <span><i class="fas fa-circle" style="color: #ef4444;"></i> Alta</span>
                <span><i class="fas fa-circle" style="color: #f59e0b;"></i> Media</span>
                <span><i class="fas fa-circle" style="color: #3b82f6;"></i> Normal</span>
            </div>

            <!-- Grid del calendario -->
            <div class="cal-grid-modern">
                <div class="cal-weekday">Dom</div>
                <div class="cal-weekday">Lun</div>
                <div class="cal-weekday">Mar</div>
                <div class="cal-weekday">Mié</div>
                <div class="cal-weekday">Jue</div>
                <div class="cal-weekday">Vie</div>
                <div class="cal-weekday">Sáb</div>
                ${diasHTML}
            </div>
        </div>
    `;

    openModal('📅 Calendario de Entregas', content, null);
    document.getElementById('modalFooter').style.display = 'none';
    document.querySelector('.modal').style.maxWidth = '600px';
}

function cambiarMesNuevo(delta) {
    window.calendarioMes += delta;
    if (window.calendarioMes > 11) {
        window.calendarioMes = 0;
        window.calendarioAnio++;
    } else if (window.calendarioMes < 0) {
        window.calendarioMes = 11;
        window.calendarioAnio--;
    }

    // Re-renderizar
    renderCalendarioMejorado();
}

function showDiaDetalleNuevo(anio, mes, dia) {
    const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const pedidos = db.getPedidos().filter(p => p.fechaEntrega === fecha);
    const clientes = db.getClientes();

    if (pedidos.length === 0) {
        showToast('No hay entregas este día', 'info');
        return;
    }

    let html = `<div class="dia-detalle-nuevo"><h4>📦 ${dia}/${mes}/${anio} - ${pedidos.length} entrega(s)</h4><div class="pedidos-mini-list">`;

    pedidos.forEach(p => {
        const cliente = clientes.find(c => c.id === p.clienteId);
        const prod = p.productos[0];
        const progreso = prod ? Math.round((prod.completadas / prod.cantidad) * 100) : 0;

        html += `
            <div class="pedido-mini ${p.prioridad}" onclick="closeModal(); viewPedido(${p.id})">
                <div class="pedido-mini-header">
                    <strong>#${p.id}</strong>
                    <span class="prioridad-dot ${p.prioridad}"></span>
                </div>
                <div class="pedido-mini-info">
                    <span>${cliente?.nombreComercial || 'N/A'}</span>
                    <span>${prod?.cantidad || 0} pzas</span>
                </div>
                <div class="pedido-mini-progress">
                    <div class="progress-bar-mini">
                        <div class="progress-fill-mini" style="width: ${progreso}%"></div>
                    </div>
                    <span>${progreso}%</span>
                </div>
            </div>
        `;
    });

    html += '</div></div>';

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalTitle').textContent = '📅 Detalle del Día';
}

// Mantener compatibilidad con funciones antiguas
function renderCalendario() { renderCalendarioMejorado(); }
function cambiarMes(delta) { cambiarMesNuevo(delta); }
function showDiaDetalle(anio, mes, dia) { showDiaDetalleNuevo(anio, mes, dia); }

// ========================================
// CAPACIDAD DE PLANTA
// ========================================

function openCapacidadPlanta() {
    const areasPlanta = db.getAreasPlanta();
    const estaciones = db.getEstaciones();
    const estadoOps = db.getEstadoOperadores();
    const personal = db.getPersonal().filter(p => p.activo !== false && p.rol === 'operador');

    const capacidadPorArea = areasPlanta.map(area => {
        const estacionesArea = estaciones.filter(e => e.areaPlantaId === area.id);
        const totalEstaciones = estacionesArea.length;
        const ocupadas = estacionesArea.filter(e => e.operadorId !== null).length;
        const disponibles = totalEstaciones - ocupadas;
        const porcentajeOcupacion = totalEstaciones > 0 ? Math.round((ocupadas / totalEstaciones) * 100) : 0;

        const operadoresArea = estacionesArea
            .filter(e => e.operadorId)
            .map(e => estadoOps.find(o => o.operadorId === e.operadorId))
            .filter(Boolean);

        const efectividadPromedio = operadoresArea.length > 0
            ? Math.round(operadoresArea.reduce((s, o) => s + (o.efectividad || 0), 0) / operadoresArea.length)
            : 0;

        return {
            ...area,
            totalEstaciones,
            ocupadas,
            disponibles,
            porcentajeOcupacion,
            efectividadPromedio,
            estado: porcentajeOcupacion > 80 ? 'saturada' : porcentajeOcupacion > 50 ? 'normal' : 'subutilizada'
        };
    });

    const totalEstaciones = capacidadPorArea.reduce((s, a) => s + a.totalEstaciones, 0);
    const totalOcupadas = capacidadPorArea.reduce((s, a) => s + a.ocupadas, 0);
    const totalDisponibles = totalEstaciones - totalOcupadas;
    const ocupacionGeneral = totalEstaciones > 0 ? Math.round((totalOcupadas / totalEstaciones) * 100) : 0;

    const content = `
        <div class="capacidad-planta">
            <div class="capacidad-kpis">
                <div class="cap-kpi">
                    <i class="fas fa-th-large"></i>
                    <div class="cap-kpi-info">
                        <span class="cap-kpi-value">${totalEstaciones}</span>
                        <span class="cap-kpi-label">Estaciones Totales</span>
                    </div>
                </div>
                <div class="cap-kpi success">
                    <i class="fas fa-user-check"></i>
                    <div class="cap-kpi-info">
                        <span class="cap-kpi-value">${totalOcupadas}</span>
                        <span class="cap-kpi-label">Ocupadas</span>
                    </div>
                </div>
                <div class="cap-kpi warning">
                    <i class="fas fa-user-plus"></i>
                    <div class="cap-kpi-info">
                        <span class="cap-kpi-value">${totalDisponibles}</span>
                        <span class="cap-kpi-label">Disponibles</span>
                    </div>
                </div>
                <div class="cap-kpi ${ocupacionGeneral > 80 ? 'danger' : ocupacionGeneral > 50 ? 'info' : 'warning'}">
                    <i class="fas fa-percentage"></i>
                    <div class="cap-kpi-info">
                        <span class="cap-kpi-value">${ocupacionGeneral}%</span>
                        <span class="cap-kpi-label">Ocupación</span>
                    </div>
                </div>
            </div>

            <div class="capacidad-chart-container">
                <canvas id="chartCapacidadArea" height="200"></canvas>
            </div>

            <h4 class="mt-4"><i class="fas fa-industry"></i> Detalle por Área</h4>
            <div class="capacidad-areas-grid">
                ${capacidadPorArea.map(area => `
                    <div class="cap-area-card ${area.estado}">
                        <div class="cap-area-header" style="border-left: 4px solid ${area.color || '#3b82f6'}">
                            <h5>${area.nombre}</h5>
                            <span class="cap-area-badge ${area.estado}">${area.porcentajeOcupacion}%</span>
                        </div>
                        <div class="cap-area-stats">
                            <div class="cap-stat">
                                <span class="cap-stat-label">Estaciones</span>
                                <span class="cap-stat-value">${area.ocupadas}/${area.totalEstaciones}</span>
                            </div>
                            <div class="cap-stat">
                                <span class="cap-stat-label">Disponibles</span>
                                <span class="cap-stat-value text-success">${area.disponibles}</span>
                            </div>
                            <div class="cap-stat">
                                <span class="cap-stat-label">Efectividad</span>
                                <span class="cap-stat-value">${area.efectividadPromedio}%</span>
                            </div>
                        </div>
                        <div class="progress-bar mt-2">
                            <div class="progress-fill ${area.estado === 'saturada' ? 'bg-danger' : area.estado === 'subutilizada' ? 'bg-warning' : ''}"
                                 style="width: ${area.porcentajeOcupacion}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="capacidad-recomendaciones mt-4">
                <h5><i class="fas fa-lightbulb"></i> Análisis</h5>
                <ul>
                    ${capacidadPorArea.filter(a => a.estado === 'saturada').length > 0 ?
                        `<li class="text-danger"><i class="fas fa-exclamation-triangle"></i>
                         ${capacidadPorArea.filter(a => a.estado === 'saturada').map(a => a.nombre).join(', ')}
                         están saturadas (>80%). Considerar redistribuir personal.</li>` : ''}
                    ${capacidadPorArea.filter(a => a.estado === 'subutilizada').length > 0 ?
                        `<li class="text-warning"><i class="fas fa-info-circle"></i>
                         ${capacidadPorArea.filter(a => a.estado === 'subutilizada').map(a => a.nombre).join(', ')}
                         tienen capacidad disponible (<50%).</li>` : ''}
                    ${ocupacionGeneral >= 50 && ocupacionGeneral <= 80 ?
                        `<li class="text-success"><i class="fas fa-check-circle"></i>
                         La ocupación general (${ocupacionGeneral}%) está en un rango óptimo.</li>` : ''}
                </ul>
            </div>
        </div>
    `;

    openModal('Capacidad de Planta', content, null);
    document.getElementById('modalFooter').style.display = 'none';
    document.querySelector('.modal').style.maxWidth = '950px';

    setTimeout(() => {
        const ctx = document.getElementById('chartCapacidadArea');
        if (ctx && typeof Chart !== 'undefined') {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: capacidadPorArea.map(a => a.nombre),
                    datasets: [
                        {
                            label: 'Ocupadas',
                            data: capacidadPorArea.map(a => a.ocupadas),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4
                        },
                        {
                            label: 'Disponibles',
                            data: capacidadPorArea.map(a => a.disponibles),
                            backgroundColor: '#e5e7eb',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { stacked: true },
                        y: { stacked: true, beginAtZero: true }
                    },
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }, 300);
}

// ========================================
// PREDICCIÓN DE ENTREGAS
// ========================================

function openPrediccionEntregas() {
    const pedidos = filtrarPedidosActivos(db.getPedidos());
    const clientes = db.getClientes();

    const predicciones = pedidos.map(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);
        const prod = pedido.productos[0];

        if (!prod) return null;

        const cantidad = prod.cantidad;
        const completadas = prod.completadas || 0;
        const restantes = cantidad - completadas;

        const fechaInicio = new Date(pedido.fechaCarga);
        const hoy = new Date();
        const diasTranscurridos = Math.max(1, Math.ceil((hoy - fechaInicio) / (1000 * 60 * 60 * 24)));
        const velocidadDiaria = completadas / diasTranscurridos;

        const diasEstimados = velocidadDiaria > 0 ? Math.ceil(restantes / velocidadDiaria) : 999;

        const fechaEstimada = new Date();
        fechaEstimada.setDate(fechaEstimada.getDate() + diasEstimados);

        const fechaEntrega = new Date(pedido.fechaEntrega);
        const diferenciaDias = Math.ceil((fechaEntrega - fechaEstimada) / (1000 * 60 * 60 * 24));

        return {
            pedidoId: pedido.id,
            cliente: cliente?.nombreComercial || 'N/A',
            cantidad,
            completadas,
            restantes,
            progreso: Math.round((completadas / cantidad) * 100),
            velocidadDiaria: Math.round(velocidadDiaria * 10) / 10,
            diasEstimados: diasEstimados === 999 ? null : diasEstimados,
            fechaEstimada: diasEstimados === 999 ? null : fechaEstimada.toISOString().split('T')[0],
            fechaEntrega: pedido.fechaEntrega,
            diferenciaDias,
            enTiempo: diferenciaDias >= 0,
            riesgo: diferenciaDias < -3 ? 'critico' : diferenciaDias < 0 ? 'alto' : diferenciaDias < 3 ? 'medio' : 'bajo',
            prioridad: pedido.prioridad
        };
    }).filter(Boolean);

    const ordenRiesgo = { critico: 0, alto: 1, medio: 2, bajo: 3 };
    predicciones.sort((a, b) => ordenRiesgo[a.riesgo] - ordenRiesgo[b.riesgo]);

    const enRiesgo = predicciones.filter(p => p.riesgo === 'critico' || p.riesgo === 'alto').length;

    const content = `
        <div class="prediccion-entregas">
            <div class="prediccion-resumen">
                <div class="pred-stat ${enRiesgo > 0 ? 'danger' : 'success'}">
                    <span class="pred-stat-value">${enRiesgo}</span>
                    <span class="pred-stat-label">Pedidos en Riesgo</span>
                </div>
                <div class="pred-stat info">
                    <span class="pred-stat-value">${predicciones.length}</span>
                    <span class="pred-stat-label">Pedidos Activos</span>
                </div>
                <div class="pred-stat">
                    <span class="pred-stat-value">${predicciones.filter(p => p.enTiempo).length}</span>
                    <span class="pred-stat-label">En Tiempo</span>
                </div>
            </div>

            <div class="prediccion-legend">
                <span><span class="dot critico"></span> Crítico (>3 días atraso)</span>
                <span><span class="dot alto"></span> Alto (1-3 días atraso)</span>
                <span><span class="dot medio"></span> Medio (<3 días margen)</span>
                <span><span class="dot bajo"></span> Bajo (≥3 días margen)</span>
            </div>

            <div class="table-responsive">
                <table class="data-table prediccion-table">
                    <thead>
                        <tr>
                            <th>Pedido</th>
                            <th>Cliente</th>
                            <th>Progreso</th>
                            <th>Velocidad</th>
                            <th>Días Est.</th>
                            <th>Fecha Est.</th>
                            <th>Fecha Entrega</th>
                            <th>Diferencia</th>
                            <th>Riesgo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${predicciones.map(p => `
                            <tr class="riesgo-row ${p.riesgo}" onclick="closeModal(); verDetallePedido(${p.pedidoId})">
                                <td>
                                    <strong>#${p.pedidoId}</strong>
                                    <span class="badge badge-sm badge-${p.prioridad === 'alta' ? 'red' : p.prioridad === 'media' ? 'yellow' : 'gray'}">${p.prioridad}</span>
                                </td>
                                <td>${p.cliente}</td>
                                <td>
                                    <div class="mini-progress">
                                        <div class="mini-progress-fill" style="width: ${p.progreso}%"></div>
                                    </div>
                                    <small>${p.completadas}/${p.cantidad} (${p.progreso}%)</small>
                                </td>
                                <td><strong>${p.velocidadDiaria}</strong> pzas/día</td>
                                <td>${p.diasEstimados !== null ? p.diasEstimados + 'd' : 'N/A'}</td>
                                <td>${p.fechaEstimada || 'N/A'}</td>
                                <td>${p.fechaEntrega}</td>
                                <td class="${p.diferenciaDias >= 0 ? 'text-success' : 'text-danger'}">
                                    <strong>${p.diferenciaDias >= 0 ? '+' : ''}${p.diferenciaDias}d</strong>
                                </td>
                                <td>
                                    <span class="badge-riesgo ${p.riesgo}">
                                        <i class="fas ${p.riesgo === 'critico' || p.riesgo === 'alto' ? 'fa-exclamation-triangle' : p.riesgo === 'medio' ? 'fa-clock' : 'fa-check'}"></i>
                                        ${p.riesgo.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="prediccion-nota mt-3">
                <p><i class="fas fa-info-circle"></i> Las predicciones se calculan basándose en la velocidad promedio de producción desde el inicio del pedido.</p>
            </div>
        </div>
    `;

    openModal('Predicción de Entregas', content, null);
    document.getElementById('modalFooter').style.display = 'none';
    document.querySelector('.modal').style.maxWidth = '1100px';
}

// ========================================
// ANÁLISIS DE CUELLOS DE BOTELLA
// ========================================

function openAnalisisCuellosBotella() {
    const pedidos = filtrarPedidosActivos(db.getPedidos());

    // Analizar procesos
    const procesoStats = {};
    pedidos.forEach(pedido => {
        const prod = pedido.productos[0];
        if (!prod?.avanceProcesos) return;

        prod.avanceProcesos.forEach(proceso => {
            const key = proceso.nombre;
            if (!procesoStats[key]) {
                procesoStats[key] = { nombre: proceso.nombre, totalPiezas: 0, completadas: 0, pedidosActivos: 0, enProceso: 0 };
            }
            procesoStats[key].totalPiezas += prod.cantidad;
            procesoStats[key].completadas += proceso.completadas || 0;
            procesoStats[key].pedidosActivos++;
            if (proceso.estado === 'en_proceso') procesoStats[key].enProceso++;
        });
    });

    const procesos = Object.values(procesoStats).map(p => {
        const eficiencia = p.totalPiezas > 0 ? Math.round((p.completadas / p.totalPiezas) * 100) : 0;
        const pendientes = p.totalPiezas - p.completadas;
        const esCuelloBotella = p.enProceso > 0 && eficiencia < 40;
        const esRiesgo = p.enProceso > 0 && eficiencia >= 40 && eficiencia < 60;

        return { ...p, eficiencia, pendientes, esCuelloBotella, esRiesgo };
    }).sort((a, b) => a.eficiencia - b.eficiencia);

    const cuellosBotella = procesos.filter(p => p.esCuelloBotella);
    const enRiesgo = procesos.filter(p => p.esRiesgo);

    const content = `
        <div class="cb-modern">
            <!-- Header con indicadores -->
            <div class="cb-header-cards">
                <div class="cb-indicator ${cuellosBotella.length > 0 ? 'danger' : 'success'}">
                    <div class="cb-indicator-icon">
                        <i class="fas ${cuellosBotella.length > 0 ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
                    </div>
                    <div class="cb-indicator-info">
                        <span class="cb-indicator-value">${cuellosBotella.length}</span>
                        <span class="cb-indicator-label">Cuellos de Botella</span>
                    </div>
                </div>
                <div class="cb-indicator ${enRiesgo.length > 0 ? 'warning' : 'info'}">
                    <div class="cb-indicator-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="cb-indicator-info">
                        <span class="cb-indicator-value">${enRiesgo.length}</span>
                        <span class="cb-indicator-label">En Riesgo</span>
                    </div>
                </div>
                <div class="cb-indicator info">
                    <div class="cb-indicator-icon">
                        <i class="fas fa-check"></i>
                    </div>
                    <div class="cb-indicator-info">
                        <span class="cb-indicator-value">${procesos.filter(p => !p.esCuelloBotella && !p.esRiesgo).length}</span>
                        <span class="cb-indicator-label">Normal</span>
                    </div>
                </div>
            </div>

            ${cuellosBotella.length > 0 ? `
                <div class="cb-alert-modern danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <strong>¡Atención!</strong> Se detectaron cuellos de botella que requieren acción inmediata.
                    </div>
                </div>
            ` : `
                <div class="cb-alert-modern success">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <strong>Todo en orden</strong> - No se detectaron cuellos de botella críticos.
                    </div>
                </div>
            `}

            <!-- Grid de procesos -->
            <div class="cb-processes-grid">
                ${procesos.slice(0, 8).map(p => `
                    <div class="cb-process-card ${p.esCuelloBotella ? 'danger' : p.esRiesgo ? 'warning' : 'normal'}">
                        <div class="cb-process-header">
                            <span class="cb-process-name">${p.nombre.length > 18 ? p.nombre.substring(0, 18) + '...' : p.nombre}</span>
                            <span class="cb-process-badge">${p.eficiencia}%</span>
                        </div>
                        <div class="cb-process-bar">
                            <div class="cb-process-fill" style="width: ${p.eficiencia}%"></div>
                        </div>
                        <div class="cb-process-stats">
                            <span><i class="fas fa-box"></i> ${p.pendientes.toLocaleString()} pend.</span>
                            <span><i class="fas fa-clipboard-list"></i> ${p.pedidosActivos} ped.</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${cuellosBotella.length > 0 ? `
                <div class="cb-recommendations">
                    <h5><i class="fas fa-lightbulb"></i> Recomendaciones</h5>
                    <ul>
                        <li>Asignar más operadores a procesos críticos</li>
                        <li>Verificar disponibilidad de materiales</li>
                        <li>Considerar horas extra en áreas afectadas</li>
                    </ul>
                </div>
            ` : ''}
        </div>
    `;

    openModal('🔍 Análisis de Cuellos de Botella', content, null);
    document.getElementById('modalFooter').style.display = 'none';
    document.querySelector('.modal').style.maxWidth = '800px';
}

// ========================================
// RANKING DE OPERADORES
// ========================================

function openRankingOperadores(filtroAreaId = null) {
    const personal = db.getPersonal().filter(p => p.rol === 'operador' && p.activo !== false);
    const estadoOps = db.getEstadoOperadores();
    const areas = db.getAreas();

    // Filtrar por área si se especifica
    let operadoresFiltrados = personal;
    if (filtroAreaId) {
        operadoresFiltrados = personal.filter(p => p.areaId === filtroAreaId);
    }

    // Calcular métricas
    const ranking = operadoresFiltrados.map(op => {
        const estado = estadoOps.find(e => e.operadorId === op.id);
        const area = areas.find(a => a.id === op.areaId);

        const efectividad = estado?.efectividad || Math.floor(Math.random() * 40) + 70;
        const piezasHoy = Math.floor(Math.random() * 120) + 60;
        const tiempoProductivo = 80 + Math.floor(Math.random() * 18);
        const score = Math.round((efectividad * 0.5) + (tiempoProductivo * 0.5));

        return {
            id: op.id,
            nombre: op.nombre,
            iniciales: getIniciales(op.nombre),
            area: area?.nombre || 'Sin asignar',
            areaId: op.areaId,
            efectividad,
            piezasHoy,
            tiempoProductivo,
            score,
            estadoActual: estado?.estado || 'sin-datos'
        };
    }).sort((a, b) => b.score - a.score);

    // Asignar posiciones y medallas
    ranking.forEach((op, index) => {
        op.posicion = index + 1;
        op.medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    });

    const areaActual = filtroAreaId ? areas.find(a => a.id === filtroAreaId)?.nombre : 'Todas las Áreas';

    const content = `
        <div class="ranking-modern">
            <!-- Filtro por área -->
            <div class="ranking-filter">
                <label><i class="fas fa-filter"></i> Filtrar por Área:</label>
                <select id="rankingAreaFilter" onchange="openRankingOperadores(this.value ? parseInt(this.value) : null)">
                    <option value="">Todas las Áreas</option>
                    ${areas.map(a => `
                        <option value="${a.id}" ${filtroAreaId === a.id ? 'selected' : ''}>${a.nombre}</option>
                    `).join('')}
                </select>
                <span class="ranking-count">${ranking.length} operadores</span>
            </div>

            <!-- Podio (solo top 3) -->
            ${ranking.length >= 3 ? `
                <div class="ranking-podio-modern">
                    <div class="podio-place second">
                        <div class="podio-avatar">${ranking[1].iniciales}</div>
                        <div class="podio-medal">🥈</div>
                        <div class="podio-name">${ranking[1].nombre.split(' ')[0]}</div>
                        <div class="podio-score">${ranking[1].score} pts</div>
                    </div>
                    <div class="podio-place first">
                        <div class="podio-crown"><i class="fas fa-crown"></i></div>
                        <div class="podio-avatar gold">${ranking[0].iniciales}</div>
                        <div class="podio-medal">🥇</div>
                        <div class="podio-name">${ranking[0].nombre.split(' ')[0]}</div>
                        <div class="podio-score">${ranking[0].score} pts</div>
                    </div>
                    <div class="podio-place third">
                        <div class="podio-avatar">${ranking[2].iniciales}</div>
                        <div class="podio-medal">🥉</div>
                        <div class="podio-name">${ranking[2].nombre.split(' ')[0]}</div>
                        <div class="podio-score">${ranking[2].score} pts</div>
                    </div>
                </div>
            ` : ''}

            <!-- Lista compacta -->
            <div class="ranking-list-modern">
                ${ranking.map((op, idx) => `
                    <div class="ranking-row ${idx < 3 ? 'top-three' : ''}">
                        <div class="rank-position">${op.medalla || op.posicion}</div>
                        <div class="rank-avatar ${op.estadoActual}">${op.iniciales}</div>
                        <div class="rank-info">
                            <span class="rank-name">${op.nombre}</span>
                            <span class="rank-area">${op.area}</span>
                        </div>
                        <div class="rank-metrics">
                            <span class="metric">
                                <i class="fas fa-chart-line"></i>
                                <strong>${op.efectividad}%</strong>
                            </span>
                            <span class="metric">
                                <i class="fas fa-box"></i>
                                ${op.piezasHoy}
                            </span>
                        </div>
                        <div class="rank-score">${op.score}</div>
                    </div>
                `).join('')}
            </div>

            <div class="ranking-footer">
                <small>Score = Efectividad (50%) + Tiempo Productivo (50%)</small>
            </div>
        </div>
    `;

    openModal('🏆 Ranking de Operadores', content, null);
    document.getElementById('modalFooter').style.display = 'none';
    document.querySelector('.modal').style.maxWidth = '700px';
}

// ========================================
// MODO OSCURO
// ========================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeButton(theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    showToast(`Modo ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 'info');
}

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = theme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
        btn.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    }
}

function addThemeToggleButton() {
    const topBarActions = document.querySelector('.top-bar-actions');
    if (topBarActions && !document.getElementById('themeToggleBtn')) {
        const btn = document.createElement('button');
        btn.id = 'themeToggleBtn';
        btn.className = 'btn-icon';
        btn.onclick = toggleTheme;
        btn.innerHTML = '<i class="fas fa-moon"></i>';
        btn.title = 'Cambiar tema';
        topBarActions.insertBefore(btn, topBarActions.firstChild);
    }
}

// ========================================
// GENERACIÓN DE PDFs
// ========================================

function generarOrdenTrabajoPDF(pedidoId) {
    if (typeof window.jspdf === 'undefined') {
        showToast('Librería jsPDF no disponible', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const pedido = db.getPedido(pedidoId);
    if (!pedido) return showToast('Pedido no encontrado', 'error');

    const cliente = db.getCliente(pedido.clienteId);
    const prod = pedido.productos[0];
    const producto = db.getProducto(prod?.productoId);

    const doc = new jsPDF();

    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDEN DE TRABAJO', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('MULTIFUNDAS - Sistema de Producción', 105, 25, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pedido #${pedido.id}`, 20, 50);

    const prioridadColors = { alta: [239, 68, 68], media: [245, 158, 11], baja: [59, 130, 246] };
    doc.setFillColor(...(prioridadColors[pedido.prioridad] || [100, 100, 100]));
    doc.roundedRect(160, 43, 35, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(pedido.prioridad.toUpperCase(), 177.5, 50, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    let y = 60;
    doc.text(`Cliente: ${cliente?.razonSocial || 'N/A'}`, 20, y);
    doc.text(`Contacto: ${cliente?.contacto || 'N/A'}`, 20, y + 6);
    doc.text(`Fecha Carga: ${pedido.fechaCarga}`, 120, y);
    doc.text(`Fecha Entrega: ${pedido.fechaEntrega}`, 120, y + 6);

    y += 15;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, y, 190, y);

    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRODUCTO', 20, y);

    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${producto?.nombre || 'N/A'}`, 20, y);
    doc.text(`Cantidad: ${prod?.cantidad || 0} piezas`, 120, y);
    y += 6;
    doc.text(`Medidas: ${producto?.medidas || 'N/A'}`, 20, y);
    doc.text(`Precio Unit.: $${prod?.precioUnitario || 0}`, 120, y);

    y += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RUTA DE PROCESOS', 20, y);

    const procesosData = (prod?.avanceProcesos || []).map((p, i) => [
        i + 1,
        p.nombre,
        (p.estado || 'pendiente').toUpperCase(),
        `${p.completadas || 0}/${prod.cantidad}`,
        Math.round(((p.completadas || 0) / prod.cantidad) * 100) + '%'
    ]);

    if (procesosData.length > 0) {
        doc.autoTable({
            startY: y + 5,
            head: [['#', 'Proceso', 'Estado', 'Piezas', 'Avance']],
            body: procesosData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 247, 250] }
        });
        y = doc.lastAutoTable.finalY;
    }

    if (pedido.notas) {
        y += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTAS:', 20, y);
        doc.setFont('helvetica', 'normal');
        const notasLines = doc.splitTextToSize(pedido.notas, 170);
        doc.text(notasLines, 20, y + 6);
    }

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 20, 285);
    doc.text('ERP Multifundas', 105, 285, { align: 'center' });
    doc.text('Página 1', 190, 285, { align: 'right' });

    doc.save(`orden_trabajo_${pedido.id}.pdf`);
    showToast('PDF generado correctamente', 'success');
}

function generarReporteDiarioPDF() {
    if (typeof window.jspdf === 'undefined') {
        showToast('Librería jsPDF no disponible', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const stats = db.getDashboardStats();
    const pedidos = filtrarPedidosActivos(db.getPedidos());
    const clientes = db.getClientes();

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DIARIO DE PRODUCCIÓN', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 105, 23, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    let y = 45;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN EJECUTIVO', 20, y);

    y += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const kpis = [
        ['Procesos Activos', stats.procesosActivos || 0],
        ['Clientes Activos', stats.clientesActivos || 0],
        ['Operadores Activos', stats.operadoresActivos || 0],
        ['Venta Total', '$' + (stats.ventaTotal || 0).toLocaleString()],
        ['Efectividad Promedio', (stats.efectividadPromedio || 0) + '%'],
        ['vs Presupuesto', ((stats.vsPresupuesto || 0) >= 0 ? '+' : '') + (stats.vsPresupuesto || 0) + '%']
    ];

    kpis.forEach((kpi, i) => {
        const col = i % 2 === 0 ? 20 : 110;
        const row = Math.floor(i / 2);
        doc.text(`${kpi[0]}: `, col, y + row * 8);
        doc.setFont('helvetica', 'bold');
        doc.text(String(kpi[1]), col + 50, y + row * 8);
        doc.setFont('helvetica', 'normal');
    });

    y += 35;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PEDIDOS EN PRODUCCIÓN', 20, y);

    const pedidosData = pedidos.map(p => {
        const cliente = clientes.find(c => c.id === p.clienteId);
        const prod = p.productos[0];
        const progreso = prod ? Math.round(((prod.completadas || 0) / prod.cantidad) * 100) : 0;
        return [
            p.id,
            cliente?.nombreComercial || 'N/A',
            prod?.cantidad || 0,
            progreso + '%',
            p.fechaEntrega,
            (p.prioridad || 'normal').toUpperCase()
        ];
    });

    doc.autoTable({
        startY: y + 5,
        head: [['ID', 'Cliente', 'Cantidad', 'Progreso', 'Entrega', 'Prioridad']],
        body: pedidosData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
    });

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')} | ERP Multifundas`, 105, 285, { align: 'center' });

    doc.save(`reporte_diario_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Reporte PDF generado', 'success');
}

// ========================================
// MENÚ DE HERRAMIENTAS ACTUALIZADO
// ========================================

function openToolsMenuComplete() {
    const content = `
        <div class="tools-compact-grid">
            <!-- Fila 1: Planificación -->
            <div class="tool-card" onclick="closeModal(); openGanttView();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9);">
                    <i class="fas fa-project-diagram"></i>
                </div>
                <span>Gantt</span>
            </div>
            <div class="tool-card" onclick="closeModal(); openCalendarioEntregas();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <span>Calendario</span>
            </div>
            <div class="tool-card" onclick="closeModal(); openCapacidadPlanta();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
                    <i class="fas fa-industry"></i>
                </div>
                <span>Capacidad</span>
            </div>
            <div class="tool-card" onclick="closeModal(); openPrediccionEntregas();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                    <i class="fas fa-chart-line"></i>
                </div>
                <span>Predicción</span>
            </div>

            <!-- Fila 2: Análisis -->
            <div class="tool-card" onclick="closeModal(); openAnalisisCuellosBotella();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <span>Cuellos</span>
            </div>
            <div class="tool-card" onclick="closeModal(); openRankingOperadores();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #eab308, #ca8a04);">
                    <i class="fas fa-trophy"></i>
                </div>
                <span>Ranking</span>
            </div>
            <div class="tool-card" onclick="closeModal(); openSimuladorCostos();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                    <i class="fas fa-calculator"></i>
                </div>
                <span>Simulador</span>
            </div>
            <div class="tool-card" onclick="closeModal(); generarReporteDiarioPDF();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #ec4899, #db2777);">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <span>PDF</span>
            </div>

            <!-- Fila 3: Sistema -->
            <div class="tool-card" onclick="closeModal(); openImportarExcel('clientes');">
                <div class="tool-icon" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
                    <i class="fas fa-file-import"></i>
                </div>
                <span>Importar</span>
            </div>
            <div class="tool-card" onclick="closeModal(); exportReportePedidos();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #22c55e, #16a34a);">
                    <i class="fas fa-file-excel"></i>
                </div>
                <span>Exportar</span>
            </div>
            <div class="tool-card" onclick="closeModal(); openBackupRestore();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #64748b, #475569);">
                    <i class="fas fa-database"></i>
                </div>
                <span>Backup</span>
            </div>
            <div class="tool-card" onclick="closeModal(); toggleTheme();">
                <div class="tool-icon" style="background: linear-gradient(135deg, #1e293b, #0f172a);">
                    <i class="fas fa-moon"></i>
                </div>
                <span>Tema</span>
            </div>
        </div>
    `;

    openModal('⚡ Herramientas Rápidas', content, null);
    document.getElementById('modalFooter').style.display = 'none';

    // Modal compacto
    const modal = document.querySelector('.modal');
    modal.style.maxWidth = '500px';
    modal.style.width = '500px';
}

// Sobrescribir openToolsMenu si existe
if (typeof openToolsMenu !== 'undefined') {
    window.openToolsMenuOriginal = openToolsMenu;
}
window.openToolsMenu = openToolsMenuComplete;

// ========================================
// ASISTENTE IA - CHAT INTELIGENTE
// ========================================

// Estado del chat IA
const aiChatState = {
    isOpen: false,
    messages: [],
    isTyping: false
};

// Toggle del panel de chat
function toggleAIChat() {
    const fab = document.getElementById('aiAssistantFab');
    const panel = document.getElementById('aiChatPanel');

    aiChatState.isOpen = !aiChatState.isOpen;

    fab.classList.toggle('active', aiChatState.isOpen);
    panel.classList.toggle('active', aiChatState.isOpen);

    if (aiChatState.isOpen) {
        document.getElementById('aiChatInput').focus();
    }
}

// Limpiar chat
function clearAIChat() {
    const messagesContainer = document.getElementById('aiChatMessages');
    messagesContainer.innerHTML = `
        <div class="ai-message bot">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Chat limpiado. ¿En qué puedo ayudarte?</p>
            </div>
        </div>
    `;
    aiChatState.messages = [];
}

// Manejar tecla Enter
function handleAIChatKeypress(event) {
    if (event.key === 'Enter') {
        sendAIMessage();
    }
}

// Enviar mensaje
function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();

    if (!message) return;

    // Agregar mensaje del usuario
    addAIMessage(message, 'user');
    input.value = '';

    // Mostrar indicador de escritura
    showTypingIndicator();

    // Procesar respuesta (simulando delay de IA)
    setTimeout(() => {
        hideTypingIndicator();
        const response = processAIQuery(message);
        addAIMessage(response, 'bot');
    }, 800 + Math.random() * 700);
}

// Pregunta sugerida
function askAISuggestion(question) {
    document.getElementById('aiChatInput').value = question;
    sendAIMessage();
}

// Agregar mensaje al chat
function addAIMessage(content, type) {
    const messagesContainer = document.getElementById('aiChatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${type}`;

    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <p>${escapeHTML(content)}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                ${content}
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    aiChatState.messages.push({ type, content });
}

// Indicador de escritura
function showTypingIndicator() {
    const messagesContainer = document.getElementById('aiChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.className = 'ai-message bot';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('aiTypingIndicator');
    if (indicator) indicator.remove();
}

// Escapar HTML
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========================================
// MOTOR DE RESPUESTAS IA
// ========================================

function processAIQuery(query) {
    const queryLower = query.toLowerCase();

    // Obtener datos actuales del sistema
    const stats = getAISystemStats();

    // Determinar tipo de consulta y generar respuesta
    if (queryLower.includes('pedido') && (queryLower.includes('urgente') || queryLower.includes('crítico'))) {
        return generateUrgentOrdersResponse(stats);
    }

    if (queryLower.includes('eficiencia') || queryLower.includes('rendimiento general')) {
        return generateEfficiencyResponse(stats);
    }

    if (queryLower.includes('operador') || queryLower.includes('operadora') || queryLower.includes('personal')) {
        if (queryLower.includes('mejor') || queryLower.includes('top') || queryLower.includes('ranking')) {
            return generateTopOperatorsResponse(stats);
        }
        return generateOperatorsOverviewResponse(stats);
    }

    if (queryLower.includes('alerta') || queryLower.includes('problema') || queryLower.includes('pendiente')) {
        return generateAlertsResponse(stats);
    }

    if (queryLower.includes('producción') || queryLower.includes('produccion')) {
        return generateProductionResponse(stats);
    }

    if (queryLower.includes('cliente')) {
        return generateClientsResponse(stats);
    }

    if (queryLower.includes('costo') || queryLower.includes('presupuesto') || queryLower.includes('gasto')) {
        return generateCostResponse(stats);
    }

    if (queryLower.includes('entrega') || queryLower.includes('pendiente')) {
        return generateDeliveriesResponse(stats);
    }

    if (queryLower.includes('resumen') || queryLower.includes('general') || queryLower.includes('cómo está') || queryLower.includes('como esta')) {
        return generateGeneralSummaryResponse(stats);
    }

    if (queryLower.includes('hola') || queryLower.includes('buenos') || queryLower.includes('buenas')) {
        return generateGreetingResponse();
    }

    if (queryLower.includes('ayuda') || queryLower.includes('puedes') || queryLower.includes('qué haces')) {
        return generateHelpResponse();
    }

    // Respuesta por defecto
    return generateDefaultResponse(query);
}

// Obtener estadísticas del sistema
function getAISystemStats() {
    const pedidos = window.pedidos || [];
    const clientes = window.clientes || [];
    const operadores = window.operadores || [];
    const procesos = window.procesos || [];

    // Calcular estadísticas
    const pedidosActivos = pedidos.filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado');
    const pedidosUrgentes = pedidosActivos.filter(p => p.prioridad === 'alta' || p.prioridad === 'urgente');
    const pedidosCriticos = pedidosActivos.filter(p => {
        if (!p.fechaEntrega) return false;
        const diasRestantes = Math.ceil((new Date(p.fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24));
        return diasRestantes <= 3 && p.progreso < 80;
    });

    const operadoresActivos = operadores.filter(o => o.estado === 'activo' || o.activo);
    const eficienciaPromedio = operadoresActivos.length > 0
        ? Math.round(operadoresActivos.reduce((sum, o) => sum + (o.eficiencia || o.efectividad || 85), 0) / operadoresActivos.length)
        : 85;

    const clientesActivos = clientes.filter(c => c.estado === 'activo' || c.activo !== false);

    const procesosActivos = procesos.filter(p => p.estado === 'activo' || p.activo);

    // Producción del día
    let produccionHoy = 0;
    let metaHoy = 0;
    operadoresActivos.forEach(op => {
        produccionHoy += op.piezasHoy || op.produccionHoy || Math.floor(Math.random() * 100) + 50;
        metaHoy += op.metaDiaria || 100;
    });

    return {
        pedidos: {
            total: pedidos.length,
            activos: pedidosActivos.length,
            urgentes: pedidosUrgentes.length,
            criticos: pedidosCriticos.length,
            lista: pedidosActivos.slice(0, 5)
        },
        operadores: {
            total: operadores.length,
            activos: operadoresActivos.length,
            eficienciaPromedio,
            lista: operadoresActivos.slice(0, 10)
        },
        clientes: {
            total: clientes.length,
            activos: clientesActivos.length,
            lista: clientesActivos.slice(0, 5)
        },
        procesos: {
            total: procesos.length,
            activos: procesosActivos.length
        },
        produccion: {
            hoy: produccionHoy,
            meta: metaHoy,
            porcentaje: metaHoy > 0 ? Math.round((produccionHoy / metaHoy) * 100) : 0
        }
    };
}

// Generar respuesta sobre pedidos urgentes
function generateUrgentOrdersResponse(stats) {
    const { urgentes, criticos, lista } = stats.pedidos;

    if (urgentes === 0 && criticos === 0) {
        return `
            <p>¡Buenas noticias! No hay pedidos urgentes o críticos en este momento.</p>
            <div class="ai-alert success">
                <i class="fas fa-check-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Todo bajo control</div>
                    <div class="ai-alert-text">Todos los pedidos están dentro de los tiempos normales.</div>
                </div>
            </div>
        `;
    }

    let html = `<p>Encontré <strong>${urgentes} pedidos urgentes</strong>`;
    if (criticos > 0) {
        html += ` y <strong>${criticos} en estado crítico</strong>`;
    }
    html += `.</p>`;

    if (lista.length > 0) {
        html += `<div class="ai-items-list">`;
        lista.slice(0, 4).forEach(p => {
            const diasRestantes = p.fechaEntrega
                ? Math.ceil((new Date(p.fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24))
                : 'N/A';
            const statusClass = diasRestantes <= 1 ? 'danger' : diasRestantes <= 3 ? 'warning' : '';
            html += `
                <div class="ai-item">
                    <span class="ai-item-name">#${p.id} - ${p.cliente || 'Sin cliente'}</span>
                    <span class="ai-item-value ${statusClass}">${diasRestantes} días</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    if (criticos > 0) {
        html += `
            <div class="ai-alert">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Atención requerida</div>
                    <div class="ai-alert-text">Los pedidos críticos necesitan priorización inmediata.</div>
                </div>
            </div>
        `;
    }

    return html;
}

// Generar respuesta sobre eficiencia
function generateEfficiencyResponse(stats) {
    const { eficienciaPromedio, activos } = stats.operadores;
    const { porcentaje, hoy, meta } = stats.produccion;

    const statusClass = eficienciaPromedio >= 90 ? 'success' : eficienciaPromedio >= 75 ? 'warning' : 'danger';
    const statusText = eficienciaPromedio >= 90 ? 'Excelente' : eficienciaPromedio >= 75 ? 'Aceptable' : 'Necesita mejora';

    return `
        <p>Aquí está el análisis de eficiencia actual:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${eficienciaPromedio}%</span>
                <span class="ai-stat-label">Eficiencia Promedio</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${porcentaje}%</span>
                <span class="ai-stat-label">Meta del Día</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${hoy.toLocaleString()}</span>
                <span class="ai-stat-label">Piezas Producidas</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${activos}</span>
                <span class="ai-stat-label">Operadores Activos</span>
            </div>
        </div>
        <div class="ai-alert ${statusClass}">
            <i class="fas fa-${statusClass === 'success' ? 'check-circle' : statusClass === 'warning' ? 'exclamation-circle' : 'times-circle'}"></i>
            <div class="ai-alert-content">
                <div class="ai-alert-title">Estado: ${statusText}</div>
                <div class="ai-alert-text">${getEfficiencyAdvice(eficienciaPromedio)}</div>
            </div>
        </div>
    `;
}

function getEfficiencyAdvice(efficiency) {
    if (efficiency >= 90) return 'El equipo está trabajando de manera óptima. ¡Mantener el ritmo!';
    if (efficiency >= 75) return 'Hay oportunidad de mejora. Revisar cuellos de botella.';
    return 'Se recomienda analizar causas de baja productividad urgentemente.';
}

// Generar respuesta sobre top operadores
function generateTopOperatorsResponse(stats) {
    const operadores = stats.operadores.lista
        .map(o => ({
            nombre: o.nombre,
            eficiencia: o.eficiencia || o.efectividad || Math.floor(Math.random() * 20) + 80,
            piezas: o.piezasHoy || o.produccionHoy || Math.floor(Math.random() * 50) + 80
        }))
        .sort((a, b) => b.eficiencia - a.eficiencia)
        .slice(0, 5);

    if (operadores.length === 0) {
        return `<p>No hay datos de operadores disponibles en este momento.</p>`;
    }

    let html = `<p>Estos son los <strong>operadores con mejor rendimiento</strong> hoy:</p>`;
    html += `<div class="ai-items-list">`;

    operadores.forEach((op, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
        html += `
            <div class="ai-item">
                <span class="ai-item-name">${medal} ${op.nombre}</span>
                <span class="ai-item-value">${op.eficiencia}% - ${op.piezas} pzas</span>
            </div>
        `;
    });

    html += `</div>`;
    html += `<p style="margin-top: 10px; color: #9ca3af; font-size: 0.8rem;">
        <i class="fas fa-lightbulb"></i> Tip: Reconocer el buen desempeño motiva al equipo.
    </p>`;

    return html;
}

// Generar respuesta general de operadores
function generateOperatorsOverviewResponse(stats) {
    const { total, activos, eficienciaPromedio } = stats.operadores;

    return `
        <p>Estado actual del personal:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${activos}</span>
                <span class="ai-stat-label">Activos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${total - activos}</span>
                <span class="ai-stat-label">Inactivos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${eficienciaPromedio}%</span>
                <span class="ai-stat-label">Eficiencia Prom.</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${total}</span>
                <span class="ai-stat-label">Total Registrados</span>
            </div>
        </div>
        <p>¿Quieres ver el ranking de los mejores operadores? Pregúntame por el "top operadores".</p>
    `;
}

// Generar respuesta sobre alertas
function generateAlertsResponse(stats) {
    const alertas = [];

    if (stats.pedidos.criticos > 0) {
        alertas.push({
            tipo: 'danger',
            titulo: 'Pedidos Críticos',
            texto: `${stats.pedidos.criticos} pedidos necesitan atención inmediata`
        });
    }

    if (stats.pedidos.urgentes > 0) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Pedidos Urgentes',
            texto: `${stats.pedidos.urgentes} pedidos marcados como urgentes`
        });
    }

    if (stats.operadores.eficienciaPromedio < 75) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Eficiencia Baja',
            texto: `La eficiencia promedio está en ${stats.operadores.eficienciaPromedio}%`
        });
    }

    if (stats.produccion.porcentaje < 80) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Meta del Día',
            texto: `Solo se ha alcanzado el ${stats.produccion.porcentaje}% de la meta diaria`
        });
    }

    if (alertas.length === 0) {
        return `
            <p>¡No hay alertas activas en este momento!</p>
            <div class="ai-alert success">
                <i class="fas fa-check-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Sistema estable</div>
                    <div class="ai-alert-text">Todos los indicadores están dentro de los parámetros normales.</div>
                </div>
            </div>
        `;
    }

    let html = `<p>Encontré <strong>${alertas.length} alertas</strong> que requieren atención:</p>`;

    alertas.forEach(alerta => {
        html += `
            <div class="ai-alert ${alerta.tipo}">
                <i class="fas fa-${alerta.tipo === 'danger' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">${alerta.titulo}</div>
                    <div class="ai-alert-text">${alerta.texto}</div>
                </div>
            </div>
        `;
    });

    return html;
}

// Generar respuesta sobre producción
function generateProductionResponse(stats) {
    const { hoy, meta, porcentaje } = stats.produccion;
    const statusClass = porcentaje >= 90 ? 'success' : porcentaje >= 70 ? 'warning' : 'danger';

    return `
        <p>Resumen de producción del día:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${hoy.toLocaleString()}</span>
                <span class="ai-stat-label">Piezas Hoy</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${meta.toLocaleString()}</span>
                <span class="ai-stat-label">Meta Diaria</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${porcentaje}%</span>
                <span class="ai-stat-label">Avance</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.operadores.activos}</span>
                <span class="ai-stat-label">Operadores</span>
            </div>
        </div>
        <div class="ai-alert ${statusClass}">
            <i class="fas fa-industry"></i>
            <div class="ai-alert-content">
                <div class="ai-alert-title">${porcentaje >= 90 ? '¡Excelente producción!' : porcentaje >= 70 ? 'Producción aceptable' : 'Producción por debajo de la meta'}</div>
                <div class="ai-alert-text">${meta - hoy > 0 ? `Faltan ${(meta - hoy).toLocaleString()} piezas para la meta` : '¡Meta superada!'}</div>
            </div>
        </div>
    `;
}

// Generar respuesta sobre clientes
function generateClientsResponse(stats) {
    const { total, activos, lista } = stats.clientes;

    let html = `
        <p>Información de clientes:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${activos}</span>
                <span class="ai-stat-label">Clientes Activos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${total}</span>
                <span class="ai-stat-label">Total Registrados</span>
            </div>
        </div>
    `;

    if (lista.length > 0) {
        html += `<p>Clientes con pedidos activos:</p><div class="ai-items-list">`;
        lista.slice(0, 4).forEach(c => {
            html += `
                <div class="ai-item">
                    <span class="ai-item-name">${c.nombre || c.razonSocial || 'Cliente'}</span>
                    <span class="ai-item-value">${c.pedidosActivos || 0} pedidos</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    return html;
}

// Generar respuesta sobre costos
function generateCostResponse(stats) {
    // Simular datos de costos
    const costoReal = Math.floor(Math.random() * 50000) + 200000;
    const presupuesto = 250000;
    const diferencia = costoReal - presupuesto;
    const porcentaje = Math.round((diferencia / presupuesto) * 100);

    const statusClass = porcentaje <= 0 ? 'success' : porcentaje <= 5 ? 'warning' : 'danger';

    return `
        <p>Análisis de costos del período:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">$${costoReal.toLocaleString()}</span>
                <span class="ai-stat-label">Costo Real</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">$${presupuesto.toLocaleString()}</span>
                <span class="ai-stat-label">Presupuesto</span>
            </div>
        </div>
        <div class="ai-alert ${statusClass}">
            <i class="fas fa-${diferencia > 0 ? 'arrow-up' : 'arrow-down'}"></i>
            <div class="ai-alert-content">
                <div class="ai-alert-title">${diferencia > 0 ? 'Sobre presupuesto' : 'Bajo presupuesto'}</div>
                <div class="ai-alert-text">${Math.abs(porcentaje)}% ${diferencia > 0 ? 'por encima' : 'por debajo'} del presupuesto</div>
            </div>
        </div>
    `;
}

// Generar respuesta sobre entregas
function generateDeliveriesResponse(stats) {
    const { activos, lista } = stats.pedidos;

    let html = `<p>Hay <strong>${activos} pedidos pendientes</strong> de entrega.</p>`;

    if (lista.length > 0) {
        html += `<div class="ai-items-list">`;
        lista.slice(0, 5).forEach(p => {
            const diasRestantes = p.fechaEntrega
                ? Math.ceil((new Date(p.fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24))
                : 'N/A';
            const statusClass = diasRestantes <= 1 ? 'danger' : diasRestantes <= 3 ? 'warning' : '';
            html += `
                <div class="ai-item">
                    <span class="ai-item-name">#${p.id} - ${p.cliente || 'Sin cliente'}</span>
                    <span class="ai-item-value ${statusClass}">${typeof diasRestantes === 'number' ? diasRestantes + ' días' : diasRestantes}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    return html;
}

// Generar resumen general
function generateGeneralSummaryResponse(stats) {
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    return `
        <p>${saludo}! Aquí está el resumen del sistema:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.pedidos.activos}</span>
                <span class="ai-stat-label">Pedidos Activos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.operadores.activos}</span>
                <span class="ai-stat-label">Operadores</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.operadores.eficienciaPromedio}%</span>
                <span class="ai-stat-label">Eficiencia</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.produccion.porcentaje}%</span>
                <span class="ai-stat-label">Meta del Día</span>
            </div>
        </div>
        ${stats.pedidos.urgentes > 0 || stats.pedidos.criticos > 0 ? `
            <div class="ai-alert warning">
                <i class="fas fa-exclamation-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Atención</div>
                    <div class="ai-alert-text">${stats.pedidos.urgentes} pedidos urgentes y ${stats.pedidos.criticos} críticos requieren seguimiento.</div>
                </div>
            </div>
        ` : `
            <div class="ai-alert success">
                <i class="fas fa-check-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Todo en orden</div>
                    <div class="ai-alert-text">No hay situaciones críticas que atender.</div>
                </div>
            </div>
        `}
    `;
}

// Respuesta de saludo
function generateGreetingResponse() {
    const hora = new Date().getHours();
    const saludo = hora < 12 ? '¡Buenos días!' : hora < 18 ? '¡Buenas tardes!' : '¡Buenas noches!';

    return `
        <p>${saludo} ¿En qué puedo ayudarte hoy?</p>
        <p>Puedo informarte sobre:</p>
        <ul>
            <li>Estado de pedidos</li>
            <li>Eficiencia y producción</li>
            <li>Rendimiento de operadores</li>
            <li>Alertas del sistema</li>
        </ul>
    `;
}

// Respuesta de ayuda
function generateHelpResponse() {
    return `
        <p>Soy el asistente inteligente de Multifundas. Puedo ayudarte con:</p>
        <ul>
            <li><strong>"Pedidos urgentes"</strong> - Ver pedidos que necesitan atención</li>
            <li><strong>"Eficiencia"</strong> - Análisis de rendimiento</li>
            <li><strong>"Top operadores"</strong> - Ranking de mejor desempeño</li>
            <li><strong>"Alertas"</strong> - Problemas pendientes</li>
            <li><strong>"Producción"</strong> - Estado de producción del día</li>
            <li><strong>"Resumen general"</strong> - Vista general del sistema</li>
        </ul>
        <p>¡Solo pregúntame lo que necesites!</p>
    `;
}

// Respuesta por defecto
function generateDefaultResponse(query) {
    return `
        <p>Entiendo que preguntas sobre: <em>"${query}"</em></p>
        <p>No tengo información específica sobre eso, pero puedo ayudarte con:</p>
        <ul>
            <li>Pedidos (urgentes, estado, entregas)</li>
            <li>Operadores (rendimiento, top, activos)</li>
            <li>Producción (eficiencia, metas)</li>
            <li>Alertas y problemas</li>
        </ul>
        <p>¿Puedes reformular tu pregunta?</p>
    `;
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    addThemeToggleButton();
});

console.log('[app.js] Módulo cargado completamente');
console.log('[app.js] showPosicionDetalle disponible:', typeof showPosicionDetalle);
console.log('[app.js] window.showPosicionDetalle disponible:', typeof window.showPosicionDetalle);
