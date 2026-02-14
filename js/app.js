// ========================================
// ERP MULTIFUNDAS - APLICACIÓN PRINCIPAL
// ========================================
DEBUG_MODE && console.log('[app.js] Iniciando carga del módulo...');
var DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

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
        DEBUG_MODE && console.log('[esPedidoActivo] Pedido es null/undefined');
        return false;
    }
    if (!pedido.estado) {
        DEBUG_MODE && console.log('[esPedidoActivo] Pedido #' + pedido.id + ' no tiene estado, retornando TRUE (asumiendo activo)');
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
        DEBUG_MODE && console.log('=== ESTADO DEL SISTEMA ===');
        DEBUG_MODE && console.log('Clientes:', db.getClientes ? db.getClientes().length : 'N/A');
        DEBUG_MODE && console.log('Productos:', db.getProductos ? db.getProductos().length : 'N/A');
        DEBUG_MODE && console.log('Pedidos:', db.getPedidos ? db.getPedidos().length : 'N/A');
        DEBUG_MODE && console.log('Personal:', db.getPersonal ? db.getPersonal().length : 'N/A');
        DEBUG_MODE && console.log('Asignaciones:', Object.keys(JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}')).length);
        DEBUG_MODE && console.log('Historial producción:', JSON.parse(localStorage.getItem('historial_produccion') || '[]').length);
        DEBUG_MODE && console.log('Notificaciones:', JSON.parse(localStorage.getItem('notificaciones_coco') || '[]').length);
    },
    sincronizar: () => {
        if (typeof ejecutarSincronizacionCompleta === 'function') {
            ejecutarSincronizacionCompleta();
            DEBUG_MODE && console.log('✅ Sincronización ejecutada');
        }
    }
};

DEBUG_MODE && console.log('🔧 Comandos de Admin disponibles:');
DEBUG_MODE && console.log('   ADMIN.limpiarTodo()      - Borra TODOS los datos');
DEBUG_MODE && console.log('   ADMIN.limpiarProduccion() - Solo datos de producción');
DEBUG_MODE && console.log('   ADMIN.verEstado()        - Ver estado del sistema');
DEBUG_MODE && console.log('   ADMIN.sincronizar()      - Forzar sincronización');

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
    dbReady.then(() => {
        initNavigation();
        initTopBar();
        initModal();
        initSearchBox();
        aplicarPermisos();
        loadDashboard();
        loadNotifications();
        initLiveUpdates();

        // Escuchar notificaciones de pedidos completados (via realtime-sync)
        initCompletionNotifications();

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
            DEBUG_MODE && console.log('[ADMIN] Sincronización inicial ejecutada');
        }, 1500);
    });
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

    DEBUG_MODE && console.log('[ADMIN] Estado de operadores sincronizado al inicio');
}

// ========================================
// NOTIFICACIONES DE PEDIDOS COMPLETADOS
// ========================================

// Sonido de notificación via Web Audio API
function playNotificationSound() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        // Tono doble: ding-dong
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch (e) { /* Audio no disponible */ }
}

function initCompletionNotifications() {
    // Rastrear IDs de notificaciones ya mostradas para no repetir
    var _shownCompletionIds = new Set();

    // Marcar las existentes como ya vistas
    try {
        var existing = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
        existing.forEach(function(n) {
            if (n.tipo === 'pedido_completado') _shownCompletionIds.add(n.id);
        });
        var existingAdmin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
        existingAdmin.forEach(function(n) {
            if (n.tipo === 'pedido_completado') _shownCompletionIds.add(n.id);
        });
    } catch (e) {}

    // Escuchar cambios via realtime-sync
    window.addEventListener('sync-update', function(event) {
        if (event.detail && (event.detail.key === 'notificaciones_coco' || event.detail.key === 'notificaciones_admin')) {
            checkForNewCompletions(event.detail.value);
        }
    });

    // También escuchar storage events (cambios desde otras pestañas)
    window.addEventListener('storage', function(event) {
        if ((event.key === 'notificaciones_coco' || event.key === 'notificaciones_admin') && event.newValue) {
            try {
                checkForNewCompletions(JSON.parse(event.newValue));
            } catch (e) {}
        }
    });

    // Polling cada 30 segundos como respaldo
    setInterval(function() {
        try {
            var admin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
            checkForNewCompletions(admin);
            var coco = JSON.parse(localStorage.getItem('notificaciones_coco') || '[]');
            checkForNewCompletions(coco);
        } catch (e) {}
        updateNotificationBadge();
    }, 30000);

    function checkForNewCompletions(notifs) {
        if (!Array.isArray(notifs)) return;
        var hasNew = false;
        notifs.forEach(function(n) {
            if (n.tipo === 'pedido_completado' && !_shownCompletionIds.has(n.id)) {
                _shownCompletionIds.add(n.id);
                hasNew = true;
                // Mostrar toast prominente
                showCompletionToast(n);
            }
        });
        if (hasNew) {
            playNotificationSound();
            if (typeof loadNotifications === 'function') loadNotifications();
            if (typeof loadAlertas === 'function') loadAlertas();
        }
    }

    function showCompletionToast(notif) {
        var toastEl = document.createElement('div');
        toastEl.className = 'completion-toast';
        toastEl.innerHTML =
            '<div class="completion-toast-icon"><i class="fas fa-check-circle"></i></div>' +
            '<div class="completion-toast-content">' +
                '<strong>' + S(notif.titulo || 'Pedido Completado') + '</strong>' +
                '<p>' + S(notif.mensaje || '') + '</p>' +
            '</div>' +
            '<button class="completion-toast-close" onclick="this.parentElement.remove()">&times;</button>';

        if (notif.pedidoId) {
            toastEl.style.cursor = 'pointer';
            toastEl.addEventListener('click', function(e) {
                if (e.target.tagName !== 'BUTTON') {
                    viewPedido(notif.pedidoId);
                    toastEl.remove();
                }
            });
        }

        document.body.appendChild(toastEl);
        // Auto-remove after 10 seconds
        setTimeout(function() {
            if (toastEl.parentElement) toastEl.remove();
        }, 10000);
    }
}

// Actualizar badge de notificaciones desde todas las fuentes
function updateNotificationBadge() {
    var badge = document.querySelector('#notificationsBtn .badge');
    if (!badge) return;
    var count = 0;
    try {
        // Contar no leídas de db (notificaciones internas)
        if (typeof db !== 'undefined' && typeof db.getNotificacionesNoLeidas === 'function') {
            count += db.getNotificacionesNoLeidas().length;
        }
        // Contar no leídas de notificaciones_admin (de supervisora)
        var admin = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
        count += admin.filter(function(n) { return !n.leida; }).length;
    } catch (e) {}
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
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

function showSectionLoading(sectionId) {
    var el = document.getElementById('section-' + sectionId);
    if (!el) return;
    var existingContent = el.querySelector('.section-header');
    var loadingDiv = el.querySelector('.loading-section');
    if (!loadingDiv) {
        loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-section';
        loadingDiv.innerHTML = '<div class="loading-spinner"></div><p>Cargando...</p>';
        if (existingContent && existingContent.nextSibling) {
            existingContent.parentNode.insertBefore(loadingDiv, existingContent.nextSibling);
        } else {
            el.appendChild(loadingDiv);
        }
    }
}

function hideSectionLoading(sectionId) {
    var el = document.getElementById('section-' + sectionId);
    if (!el) return;
    var loadingDiv = el.querySelector('.loading-section');
    if (loadingDiv) loadingDiv.remove();
}

function loadSectionContent(section) {
    showSectionLoading(section);
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
        case 'usuarios':
            loadUsuarios();
            break;
        case 'incentivos':
            loadIncentivos();
            break;
        case 'auditoria':
            loadAuditoria();
            break;
    }
    hideSectionLoading(section);
}

// ========================================
// CONFIGURACIÓN DE INCENTIVOS
// ========================================

function getConfigIncentivos() {
    var defaults = {
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
    try {
        var saved = JSON.parse(localStorage.getItem('erp_config_incentivos'));
        if (saved && saved.tiers) return saved;
    } catch (e) {}
    return defaults;
}

function guardarConfigIncentivos(config) {
    localStorage.setItem('erp_config_incentivos', JSON.stringify(config));
}

function calcularTierPorEficiencia(eficiencia) {
    var config = getConfigIncentivos();
    var tierActual = null;
    for (var i = config.tiers.length - 1; i >= 0; i--) {
        if (eficiencia >= config.tiers[i].minEficiencia) {
            tierActual = config.tiers[i];
            break;
        }
    }
    return tierActual;
}

function calcularPremioEstimado(eficiencia, premioBase) {
    var config = getConfigIncentivos();
    var tier = calcularTierPorEficiencia(eficiencia);
    if (!tier) return { monto: 0, tier: null };
    var base = premioBase || config.premioBaseDefault;
    return { monto: Math.round(base * tier.multiplicador), tier: tier };
}

// Exportar funciones globalmente para que operadora y supervisora las usen
window.getConfigIncentivos = getConfigIncentivos;
window.calcularTierPorEficiencia = calcularTierPorEficiencia;
window.calcularPremioEstimado = calcularPremioEstimado;

function loadIncentivos() {
    var config = getConfigIncentivos();
    var container = document.getElementById('section-incentivos');
    if (!container) {
        // Crear la sección si no existe
        container = document.createElement('section');
        container.className = 'section active';
        container.id = 'section-incentivos';
        document.getElementById('contentArea').appendChild(container);
    }

    var tiersHTML = config.tiers.map(function(tier, idx) {
        return '<div class="tier-config-card" style="border-left: 4px solid ' + tier.color + ';">' +
            '<div class="tier-config-header">' +
                '<div class="tier-badge" style="background: ' + tier.color + '; color: ' + (tier.color === '#FFD700' || tier.color === '#B9F2FF' ? '#333' : '#fff') + ';">' +
                    '<i class="fas ' + tier.icono + '"></i>' +
                '</div>' +
                '<input type="text" class="tier-nombre-input" value="' + tier.nombre + '" data-tier="' + idx + '" data-field="nombre" onchange="actualizarTier(this)">' +
            '</div>' +
            '<div class="tier-config-fields">' +
                '<div class="tier-field">' +
                    '<label>Eficiencia mínima (%)</label>' +
                    '<input type="number" value="' + tier.minEficiencia + '" data-tier="' + idx + '" data-field="minEficiencia" onchange="actualizarTier(this)" min="0" max="200">' +
                '</div>' +
                '<div class="tier-field">' +
                    '<label>Multiplicador</label>' +
                    '<input type="number" value="' + tier.multiplicador + '" data-tier="' + idx + '" data-field="multiplicador" onchange="actualizarTier(this)" step="0.05" min="0" max="5">' +
                '</div>' +
                '<div class="tier-field">' +
                    '<label>Color</label>' +
                    '<input type="color" value="' + tier.color + '" data-tier="' + idx + '" data-field="color" onchange="actualizarTier(this)">' +
                '</div>' +
            '</div>' +
            '<div class="tier-preview">' +
                '<span>Ejemplo: Premio base $' + config.premioBaseDefault + ' × ' + tier.multiplicador + ' = <strong>$' + Math.round(config.premioBaseDefault * tier.multiplicador) + '</strong></span>' +
            '</div>' +
        '</div>';
    }).join('');

    container.innerHTML =
        '<div class="section-header">' +
            '<h1><i class="fas fa-coins"></i> Configuración de Incentivos</h1>' +
            '<button class="btn btn-primary" onclick="resetearIncentivos()"><i class="fas fa-undo"></i> Restaurar Defaults</button>' +
        '</div>' +

        '<div class="incentivos-grid">' +
            // Configuración general
            '<div class="incentivos-card">' +
                '<h3><i class="fas fa-sliders-h"></i> Configuración General</h3>' +
                '<div class="config-form">' +
                    '<div class="config-field">' +
                        '<label>Premio base por defecto (diario)</label>' +
                        '<div class="input-with-prefix"><span>$</span><input type="number" id="premioBaseDefault" value="' + config.premioBaseDefault + '" onchange="guardarConfigGeneral()" min="0"></div>' +
                        '<small>Se usa cuando la operadora no tiene premio individual asignado</small>' +
                    '</div>' +
                    '<div class="config-field">' +
                        '<label>Premio puntualidad por defecto</label>' +
                        '<div class="input-with-prefix"><span>$</span><input type="number" id="premioPuntualidadDefault" value="' + config.premioPuntualidadDefault + '" onchange="guardarConfigGeneral()" min="0"></div>' +
                    '</div>' +
                    '<div class="config-field">' +
                        '<label>Meta equipo para supervisora (%)</label>' +
                        '<input type="number" id="metaEquipoSupervisora" value="' + config.metaEquipoSupervisora + '" onchange="guardarConfigGeneral()" min="0" max="200">' +
                        '<small>El equipo debe promediar este % para que la supervisora reciba premio</small>' +
                    '</div>' +
                    '<div class="config-field">' +
                        '<label>Multiplicador premio supervisora</label>' +
                        '<input type="number" id="multiplicadorSupervisora" value="' + config.multiplicadorSupervisora + '" onchange="guardarConfigGeneral()" step="0.1" min="0" max="5">' +
                    '</div>' +
                '</div>' +
            '</div>' +

            // Simulador
            '<div class="incentivos-card">' +
                '<h3><i class="fas fa-calculator"></i> Simulador</h3>' +
                '<div class="config-form">' +
                    '<div class="config-field">' +
                        '<label>Simular eficiencia (%)</label>' +
                        '<input type="range" id="simuladorEficiencia" min="0" max="150" value="100" oninput="actualizarSimulador()">' +
                        '<div class="simulador-display">' +
                            '<span class="sim-eficiencia" id="simEficiencia">100%</span>' +
                            '<span class="sim-tier" id="simTier">--</span>' +
                            '<span class="sim-premio" id="simPremio">$0</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="simulador-barra" id="simuladorBarra">' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        // Tiers
        '<h2 class="section-subtitle"><i class="fas fa-layer-group"></i> Niveles de Premio</h2>' +
        '<div class="tiers-grid">' + tiersHTML + '</div>' +

        // Info
        '<div class="usuarios-help" style="margin-top: 20px;">' +
            '<i class="fas fa-info-circle"></i>' +
            '<div>' +
                '<strong>Cómo funciona:</strong> El premio diario de cada operadora se calcula como: ' +
                '<code>Premio Base × Multiplicador del Nivel</code>. El nivel se determina por la eficiencia en tiempo real. ' +
                'El premio base individual se configura en la sección de Personal (campo "Premio Producción"). ' +
                'Si no tiene uno asignado, se usa el valor por defecto configurado arriba.' +
            '</div>' +
        '</div>';

    actualizarSimulador();
}

function actualizarTier(input) {
    var idx = parseInt(input.dataset.tier);
    var field = input.dataset.field;
    var config = getConfigIncentivos();
    if (field === 'multiplicador' || field === 'minEficiencia') {
        config.tiers[idx][field] = parseFloat(input.value);
    } else {
        config.tiers[idx][field] = input.value;
    }
    guardarConfigIncentivos(config);
    loadIncentivos();
}

function guardarConfigGeneral() {
    var config = getConfigIncentivos();
    config.premioBaseDefault = parseFloat(document.getElementById('premioBaseDefault').value) || 100;
    config.premioPuntualidadDefault = parseFloat(document.getElementById('premioPuntualidadDefault').value) || 50;
    config.metaEquipoSupervisora = parseFloat(document.getElementById('metaEquipoSupervisora').value) || 90;
    config.multiplicadorSupervisora = parseFloat(document.getElementById('multiplicadorSupervisora').value) || 1.0;
    guardarConfigIncentivos(config);
}

function actualizarSimulador() {
    var slider = document.getElementById('simuladorEficiencia');
    if (!slider) return;
    var eficiencia = parseInt(slider.value);
    var config = getConfigIncentivos();
    var resultado = calcularPremioEstimado(eficiencia, config.premioBaseDefault);

    document.getElementById('simEficiencia').textContent = eficiencia + '%';
    document.getElementById('simTier').textContent = resultado.tier ? resultado.tier.nombre : 'Sin bono';
    document.getElementById('simTier').style.color = resultado.tier ? resultado.tier.color : '#999';
    document.getElementById('simPremio').textContent = '$' + resultado.monto;
    document.getElementById('simPremio').style.color = resultado.monto > 0 ? '#22c55e' : '#999';

    // Actualizar barra del simulador
    var barraContainer = document.getElementById('simuladorBarra');
    if (barraContainer) {
        var barHTML = '<div class="sim-barra-track">';
        config.tiers.forEach(function(tier) {
            barHTML += '<div class="sim-barra-zone" style="left:' + (tier.minEficiencia / 1.5) + '%;background:' + tier.color + ';" title="' + tier.nombre + ' (' + tier.minEficiencia + '%+)"></div>';
        });
        barHTML += '<div class="sim-barra-marker" style="left:' + Math.min(100, eficiencia / 1.5) + '%;"></div>';
        barHTML += '</div>';
        barraContainer.innerHTML = barHTML;
    }
}

function resetearIncentivos() {
    if (confirm('¿Restaurar la configuración de incentivos a los valores por defecto?')) {
        localStorage.removeItem('erp_config_incentivos');
        loadIncentivos();
    }
}

// ========================================
// USUARIOS Y PERMISOS
// ========================================

var _permisosDisponibles = [
    { key: 'ver_costos', label: 'Ver Costeo', icon: 'fa-dollar-sign', desc: 'Acceso a la sección de costeo y márgenes' },
    { key: 'gestionar_personal', label: 'Gestionar Personal', icon: 'fa-id-badge', desc: 'Ver y editar registros de personal' },
    { key: 'ver_auditoria', label: 'Ver Auditoría', icon: 'fa-history', desc: 'Acceso al log de auditoría del sistema' },
    { key: 'exportar_datos', label: 'Exportar Datos', icon: 'fa-file-export', desc: 'Exportar reportes a PDF' },
    { key: 'gestionar_pedidos', label: 'Gestionar Pedidos', icon: 'fa-clipboard-list', desc: 'Crear, editar y eliminar pedidos' },
    { key: 'gestionar_clientes', label: 'Gestionar Clientes', icon: 'fa-users', desc: 'Crear, editar y eliminar clientes' },
    { key: 'gestionar_productos', label: 'Gestionar Productos', icon: 'fa-box', desc: 'Crear, editar y eliminar productos' },
    { key: 'gestionar_areas', label: 'Gestionar Áreas', icon: 'fa-th-large', desc: 'Modificar áreas y estaciones de planta' },
    { key: 'gestionar_usuarios', label: 'Gestionar Usuarios', icon: 'fa-user-shield', desc: 'Administrar usuarios y permisos' }
];

function loadUsuarios() {
    var section = document.querySelector('.content-area');
    if (!section) return;

    // Solo admin puede ver esta sección
    var session = typeof getAdminSession === 'function' ? getAdminSession() : null;
    if (!session || session.rol !== 'admin') {
        section.innerHTML = '<div class="section-header"><h2><i class="fas fa-user-shield"></i> Usuarios y Permisos</h2></div>' +
            '<div class="empty-state"><i class="fas fa-lock"></i><p>Solo el administrador puede gestionar usuarios y permisos.</p></div>';
        return;
    }

    var personal = db.getPersonal();
    // Filtrar solo admin y supervisora
    var usuarios = personal.filter(function(p) {
        return p.rol === 'administrador' || p.rol === 'admin' || p.rol === 'supervisora';
    });

    var listaHTML = usuarios.length === 0
        ? '<p class="text-muted">No hay usuarios administrativos registrados. Crea un empleado con rol "administrador" o "supervisora" en la sección Personal.</p>'
        : usuarios.map(function(u) {
            var permisos = u.permisos || {};
            var rolBadge = (u.rol === 'admin' || u.rol === 'administrador')
                ? '<span class="badge badge-primary">Admin</span>'
                : '<span class="badge badge-info">Supervisora</span>';

            var permisosHTML = _permisosDisponibles.map(function(p) {
                var checked = (u.rol === 'admin' || u.rol === 'administrador') ? 'checked disabled' : (permisos[p.key] ? 'checked' : '');
                var isAdmin = (u.rol === 'admin' || u.rol === 'administrador');
                return '<label class="permiso-toggle" title="' + S(p.desc) + '">' +
                    '<input type="checkbox" ' + checked + ' data-user-id="' + u.id + '" data-permiso="' + p.key + '"' +
                    (isAdmin ? '' : ' onchange="togglePermisoUsuario(this)"') + '>' +
                    '<span><i class="fas ' + p.icon + '"></i> ' + S(p.label) + '</span>' +
                '</label>';
            }).join('');

            return '<div class="usuario-card">' +
                '<div class="usuario-header">' +
                    '<div class="usuario-info">' +
                        '<div class="usuario-avatar">' + S(getIniciales(u.nombre)) + '</div>' +
                        '<div>' +
                            '<strong>' + S(u.nombre) + '</strong>' +
                            '<span class="text-muted"> #' + S(u.numEmpleado || '') + '</span><br>' +
                            rolBadge +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="usuario-permisos">' +
                    '<h5><i class="fas fa-key"></i> Permisos' +
                    ((u.rol === 'admin' || u.rol === 'administrador') ? ' <span class="text-muted">(Admin tiene todos los permisos)</span>' : '') +
                    '</h5>' +
                    '<div class="permisos-grid-admin">' + permisosHTML + '</div>' +
                '</div>' +
            '</div>';
        }).join('');

    section.innerHTML =
        '<div class="section-header">' +
            '<h2><i class="fas fa-user-shield"></i> Usuarios y Permisos</h2>' +
            '<p class="text-muted">Gestiona los permisos de acceso de administradores y supervisoras</p>' +
        '</div>' +
        '<div class="usuarios-list">' + listaHTML + '</div>' +
        '<div class="usuarios-help">' +
            '<i class="fas fa-info-circle"></i> ' +
            'Para agregar nuevos usuarios administrativos, ve a <strong>Personal</strong> y asigna el rol "administrador" o "supervisora". ' +
            'Los administradores tienen todos los permisos automáticamente.' +
        '</div>';
}

function togglePermisoUsuario(checkbox) {
    var userId = parseInt(checkbox.dataset.userId);
    var permiso = checkbox.dataset.permiso;
    var activo = checkbox.checked;

    var personal = db.getPersonal();
    var usuario = personal.find(function(p) { return p.id === userId; });
    if (!usuario) return;

    var permisos = usuario.permisos || {};
    permisos[permiso] = activo;

    // Guardar via db
    db.updatePersonal(userId, { permisos: permisos });
    showToast('Permiso "' + permiso.replace(/_/g, ' ') + '" ' + (activo ? 'activado' : 'desactivado') + ' para ' + usuario.nombre, 'success');
}

// ========================================
// PERMISOS: Ocultar secciones según permisos del usuario
// ========================================
function aplicarPermisos() {
    if (typeof tienePermiso !== 'function') return;

    // Mapa de secciones a permisos requeridos
    var seccionPermisos = {
        'costeo': 'ver_costos',
        'personal': 'gestionar_personal',
        'auditoria': 'ver_auditoria',
        'usuarios': 'gestionar_usuarios'
    };

    // Mostrar/ocultar items del sidebar según permisos
    document.querySelectorAll('.nav-item[data-section]').forEach(function(item) {
        var seccion = item.dataset.section;
        var permiso = seccionPermisos[seccion];
        if (permiso) {
            item.style.display = tienePermiso(permiso) ? '' : 'none';
        }
    });

    // Ocultar botones de exportación si no tiene permiso
    document.querySelectorAll('[onclick*="exportar"], [onclick*="export"]').forEach(function(btn) {
        btn.style.display = tienePermiso('exportar_datos') ? '' : 'none';
    });
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
    DEBUG_MODE && console.log('[openModal] Abriendo modal:', title);

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
    DEBUG_MODE && console.log('[openModal] Contenido asignado, longitud:', content?.length || 0);

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
    DEBUG_MODE && console.log('[openModal] Modal activado');
}

function closeModal() {
    const modalFooter = document.getElementById('modalFooter');
    if (modalFooter) {
        modalFooter.style.display = 'flex';
    }
    document.getElementById('modalOverlay').classList.remove('active');
}


// ========================================
// MÓDULOS CARGADOS EXTERNAMENTE:
// - app-dashboard.js (Dashboard ejecutivo)
// - app-pedidos.js (Gestión de pedidos)
// - app-clientes.js (Gestión de clientes)
// - app-productos.js (Productos, inventario, rutas)
// - app-personal.js (Personal, áreas, nómina)
// - app-reportes.js (Reportes, costeo)
// - app-admin.js (Portal admin, config, notificaciones)
// - app-advanced.js (Charts, herramientas, auditoría, PDF, Gantt)
// - app-ai-assistant.js (Asistente IA)
// ========================================

// ========================================
// INICIALIZACIÓN FINAL
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    addThemeToggleButton();
});

DEBUG_MODE && console.log('[app.js] Módulo cargado completamente');
DEBUG_MODE && console.log('[app.js] showPosicionDetalle disponible:', typeof showPosicionDetalle);
DEBUG_MODE && console.log('[app.js] window.showPosicionDetalle disponible:', typeof window.showPosicionDetalle);
