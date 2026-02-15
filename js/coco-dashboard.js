// ========================================
// PANEL INTELIGENTE DE COCO - DASHBOARD
// ========================================

// Estado del dashboard de Coco
var DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const cocoState = {
    calendarioMes: new Date().getMonth(),
    calendarioAnio: new Date().getFullYear(),
    reportePeriodo: 'semana',
    reporteAreaFiltro: 'todas',
    reporteEstadoFiltro: 'todos',
    dashboardAreaFiltro: 'todas',
    asistenteAreaFiltro: 'todas',
    diaSeleccionado: new Date(),
    chatHistorial: []
};

// ========================================
// FUNCIONES DE FILTRADO
// ========================================

function getAreasDisponibles() {
    const maquinas = Object.values(supervisoraState.maquinas || {});
    const areas = new Set();

    maquinas.forEach(m => {
        if (m.area) areas.add(m.area);
        if (m.tipo) areas.add(m.tipo);
    });

    // Areas por defecto si no hay datos
    if (areas.size === 0) {
        return ['Corte', 'Costura', 'Acabado', 'Empaque', 'Control Calidad'];
    }

    return Array.from(areas);
}

function filtrarOperadorasPorArea(operadoras, area) {
    if (area === 'todas') return operadoras;

    return operadoras.filter(op => {
        // Buscar en que estacion esta el operador
        const maquinas = Object.values(supervisoraState.maquinas || {});
        for (const m of maquinas) {
            if (m.operadores && m.operadores.some(o => o.id === op.id)) {
                return m.area === area || m.tipo === area;
            }
        }
        // Si el operador tiene area asignada directamente
        return op.area === area || op.especialidad === area;
    });
}

function filtrarOperadorasPorEstado(operadoras, estado) {
    if (estado === 'todos') return operadoras;

    const maquinas = Object.values(supervisoraState.maquinas || {});

    return operadoras.filter(op => {
        // Verificar si esta activo (asignado a alguna estacion)
        const estaActivo = maquinas.some(m =>
            m.operadores && m.operadores.some(o => o.id === op.id)
        );

        if (estado === 'activos') return estaActivo;
        if (estado === 'inactivos') return !estaActivo;
        return true;
    });
}

function cambiarFiltroArea(area) {
    cocoState.reporteAreaFiltro = area;
    renderCocoReportes();
}

function cambiarFiltroEstado(estado) {
    cocoState.reporteEstadoFiltro = estado;
    renderCocoReportes();
}

function cambiarFiltroDashboard(area) {
    cocoState.dashboardAreaFiltro = area;
    renderCocoDashboard();
}

function cambiarFiltroAsistente(area) {
    cocoState.asistenteAreaFiltro = area;
    renderCocoAsistente();
}

// Verificar que getIniciales existe (definida en supervisora.js)
if (typeof getIniciales === 'undefined') {
    window.getIniciales = function(nombre) {
        if (!nombre) return '??';
        const partes = nombre.trim().split(' ');
        if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    };
}

// ========================================
// NAVEGACION DE SECCIONES
// ========================================

function showSection(seccion) {
    // Ocultar todas las secciones
    document.querySelectorAll('.coco-section').forEach(s => {
        s.classList.remove('active');
    });

    // Mostrar la seccion seleccionada
    const seccionEl = document.getElementById('section-' + seccion);
    if (seccionEl) {
        seccionEl.classList.add('active');
    }

    // Actualizar navegacion
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === seccion);
    });

    // Renderizar contenido de la seccion
    switch(seccion) {
        case 'dashboard':
            renderCocoDashboard();
            break;
        case 'calendario':
            renderCocoCalendario();
            break;
        case 'reportes':
            renderCocoReportes();
            break;
        case 'asistente':
            renderCocoAsistente();
            break;
        case 'tiempos-muertos':
            renderTiemposMuertos();
            break;
    }
}

// ========================================
// DASHBOARD PRINCIPAL DE COCO
// ========================================

function renderCocoDashboard() {
    const container = document.querySelector('.coco-dashboard-container');
    if (!container) return;

    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    // Obtener estadisticas del dia
    const stats = calcularEstadisticasDia();
    const alertas = generarAlertasInteligentes();
    const alertasAccionables = generarAlertasAccionables();
    const cuellosBottella = detectarCuellosBotella();
    const areaFiltro = cocoState.dashboardAreaFiltro;
    const areas = getAreasDisponibles();

    // Obtener top operadoras con filtro
    let topOperadoras = getTopOperadoras(10);
    if (areaFiltro !== 'todas') {
        topOperadoras = filtrarOperadorasPorArea(topOperadoras, areaFiltro);
    }
    topOperadoras = topOperadoras.slice(0, 5);

    const pedidosUrgentes = getPedidosUrgentes();

    // Calcular semáforo general
    const semaforo = calcularSemaforoGeneral(stats, alertasAccionables);

    container.innerHTML = `
        <div class="coco-dashboard">
            <!-- SEMÁFORO GENERAL DE PLANTA -->
            <div class="semaforo-general">
                <div class="semaforo-light ${semaforo.color}">
                    <i class="fas ${semaforo.icono}"></i>
                </div>
                <div class="semaforo-info">
                    <div class="semaforo-titulo">${semaforo.titulo}</div>
                    <div class="semaforo-subtitulo">${semaforo.subtitulo}</div>
                </div>
                <div class="semaforo-metricas">
                    <div class="semaforo-metrica">
                        <span class="semaforo-metrica-valor">${stats.piezasHoy.toLocaleString()}</span>
                        <span class="semaforo-metrica-label">Piezas</span>
                    </div>
                    <div class="semaforo-metrica">
                        <span class="semaforo-metrica-valor">${stats.operadorasActivas}/${stats.operadorasTotal}</span>
                        <span class="semaforo-metrica-label">Operadoras</span>
                    </div>
                    <div class="semaforo-metrica">
                        <span class="semaforo-metrica-valor">${stats.eficienciaGeneral}%</span>
                        <span class="semaforo-metrica-label">Eficiencia</span>
                    </div>
                    <div class="semaforo-metrica">
                        <span class="semaforo-metrica-valor">${stats.comparacionAyer >= 0 ? '+' : ''}${stats.comparacionAyer}%</span>
                        <span class="semaforo-metrica-label">vs Ayer</span>
                    </div>
                </div>
            </div>

            <!-- ALERTAS ACCIONABLES — "Requiere tu atención" -->
            ${alertasAccionables.length > 0 ? `
                <div class="alertas-accionables">
                    ${alertasAccionables.map(a => `
                        <div class="alerta-accionable ${a.tipo}">
                            <div class="alerta-accionable-icon">
                                <i class="fas ${a.icono}"></i>
                            </div>
                            <div class="alerta-accionable-contenido">
                                <div class="alerta-accionable-titulo">${a.titulo}</div>
                                <div class="alerta-accionable-detalle">${a.detalle}</div>
                            </div>
                            <button class="alerta-accionable-btn" onclick="${a.accion}">
                                ${a.botonTexto}
                            </button>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- FLUJO ENTRE ÁREAS — Cuellos de botella -->
            ${renderFlujoAreas(cuellosBottella)}

            <!-- Grid de metricas -->
            <div class="coco-metrics-grid">
                <div class="metric-card produccion">
                    <div class="metric-header">
                        <i class="fas fa-cubes"></i>
                        <span>Producción Hoy</span>
                    </div>
                    <div class="metric-value">${stats.piezasHoy.toLocaleString()}</div>
                    <div class="metric-comparison ${stats.comparacionAyer >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-${stats.comparacionAyer >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                        ${Math.abs(stats.comparacionAyer)}% vs ayer
                    </div>
                    <div class="metric-chart">
                        ${renderMiniChart(stats.produccionPorHora)}
                    </div>
                </div>

                <div class="metric-card operadoras">
                    <div class="metric-header">
                        <i class="fas fa-users"></i>
                        <span>Operadoras</span>
                    </div>
                    <div class="metric-value">${stats.operadorasActivas}/${stats.operadorasTotal}</div>
                    <div class="metric-breakdown">
                        <span class="breakdown-item activo"><i class="fas fa-circle"></i> ${stats.operadorasActivas} activas</span>
                        <span class="breakdown-item inactivo"><i class="fas fa-circle"></i> ${stats.operadorasInactivas} sin asignar</span>
                    </div>
                </div>

                <div class="metric-card pedidos">
                    <div class="metric-header">
                        <i class="fas fa-clipboard-list"></i>
                        <span>Pedidos del Día</span>
                    </div>
                    <div class="metric-value">${stats.pedidosActivos}</div>
                    <div class="metric-breakdown">
                        <span class="breakdown-item urgente"><i class="fas fa-fire"></i> ${stats.pedidosUrgentes} urgentes</span>
                        <span class="breakdown-item normal"><i class="fas fa-clock"></i> ${stats.pedidosNormales} normales</span>
                    </div>
                </div>

                <div class="metric-card tiempo">
                    <div class="metric-header">
                        <i class="fas fa-clock"></i>
                        <span>Entregas Hoy</span>
                    </div>
                    <div class="metric-value">${stats.entregasHoy}</div>
                    <div class="metric-status ${stats.entregasEnRiesgo > 0 ? 'warning' : 'good'}">
                        ${stats.entregasEnRiesgo > 0 ?
                            `<i class="fas fa-exclamation-triangle"></i> ${stats.entregasEnRiesgo} en riesgo` :
                            `<i class="fas fa-check-circle"></i> Todo a tiempo`
                        }
                    </div>
                </div>
            </div>

            <!-- Sección de Incentivos del Equipo -->
            ${renderSeccionIncentivosEquipo(stats, topOperadoras)}

            <!-- Seccion de dos columnas -->
            <div class="coco-two-columns">
                <!-- Top Operadoras -->
                <div class="coco-card top-operadoras">
                    <div class="card-header">
                        <h3><i class="fas fa-trophy"></i> Top Operadoras Hoy</h3>
                        <div class="card-header-actions">
                            <select class="mini-select" onchange="cambiarFiltroDashboard(this.value)">
                                <option value="todas" ${areaFiltro === 'todas' ? 'selected' : ''}>Todas</option>
                                ${areas.map(a => `<option value="${a}" ${areaFiltro === a ? 'selected' : ''}>${a}</option>`).join('')}
                            </select>
                            <button class="btn-link" onclick="showSection('reportes')">Ver todas</button>
                        </div>
                    </div>
                    <div class="top-list">
                        ${topOperadoras.length > 0 ? topOperadoras.map((op, idx) => `
                            <div class="top-item ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}">
                                <div class="top-rank">${idx + 1}</div>
                                <div class="top-avatar">${getIniciales(op.nombre)}</div>
                                <div class="top-info">
                                    <span class="top-name">${op.nombre}</span>
                                    <span class="top-estacion">${op.estacion || 'Sin estacion'}</span>
                                </div>
                                <div class="top-stats">
                                    <span class="top-piezas">${op.piezas} pzas</span>
                                    <span class="top-eficiencia ${op.eficiencia >= 100 ? 'excellent' : ''}">${op.eficiencia}%</span>
                                    ${(() => {
                                        const tierOp = calcularTierDashboard(op.eficiencia);
                                        if (tierOp) {
                                            const premioOp = calcularPremioDashboard(op.eficiencia, op.id);
                                            return '<span class="top-tier" style="color:' + tierOp.color + '"><i class="fas ' + tierOp.icono + '"></i> $' + premioOp + '</span>';
                                        }
                                        return '';
                                    })()}
                                </div>
                            </div>
                        `).join('') : `
                            <div class="empty-top">
                                <i class="fas fa-users"></i>
                                <p>No hay operadoras activas aun</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Pedidos Urgentes con Predicción -->
                <div class="coco-card pedidos-urgentes">
                    <div class="card-header">
                        <h3><i class="fas fa-fire"></i> Pedidos que Requieren Atención</h3>
                    </div>
                    <div class="urgentes-list">
                        ${pedidosUrgentes.length > 0 ? pedidosUrgentes.map(pedido => {
                            const prediccion = typeof predecirEntrega === 'function' ? predecirEntrega(pedido.id) : null;
                            const estadoPrediccion = prediccion ? (prediccion.aTiempo ? 'a-tiempo' : (prediccion.margen > -12 ? 'en-riesgo' : 'atrasado')) : '';
                            return `
                            <div class="urgente-item">
                                <div class="urgente-info">
                                    <span class="urgente-id">#${pedido.id}</span>
                                    <span class="urgente-cliente">${pedido.cliente}</span>
                                    ${prediccion ? `
                                    <span class="prediccion-badge ${estadoPrediccion}">
                                        <i class="fas ${prediccion.aTiempo ? 'fa-check' : 'fa-exclamation-triangle'}"></i>
                                        ${prediccion.aTiempo ? 'A tiempo' : `${Math.abs(prediccion.margen)}h ${prediccion.margen > 0 ? 'margen' : 'retraso'}`}
                                    </span>
                                    ` : ''}
                                </div>
                                <div class="urgente-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill ${prediccion ? (prediccion.aTiempo ? 'good' : (estadoPrediccion === 'en-riesgo' ? 'warning' : 'danger')) : (pedido.progreso < 50 ? 'danger' : 'warning')}"
                                             style="width: ${prediccion ? prediccion.porcentaje : pedido.progreso}%"></div>
                                    </div>
                                    <span>${prediccion ? prediccion.porcentaje : pedido.progreso}%</span>
                                </div>
                                <div class="urgente-entrega">
                                    <i class="fas fa-clock"></i>
                                    ${pedido.tiempoRestante}
                                    ${prediccion && prediccion.horasRestantes > 0 ? `<small>(~${prediccion.horasRestantes}h trabajo)</small>` : ''}
                                </div>
                            </div>
                        `}).join('') : `
                            <div class="no-urgentes">
                                <i class="fas fa-check-circle"></i>
                                <p>No hay pedidos urgentes en riesgo.</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>

            <!-- Recomendacion rapida de IA -->
            <div class="coco-ia-quick">
                <div class="ia-quick-header">
                    <div class="ia-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="ia-intro">
                        <h4>Recomendación del Asistente</h4>
                        <p>Basado en el rendimiento actual</p>
                    </div>
                </div>
                <div class="ia-quick-content">
                    ${generarRecomendacionRapida()}
                </div>
                <button class="btn btn-primary" onclick="showSection('asistente')">
                    <i class="fas fa-robot"></i> Ver más recomendaciones
                </button>
            </div>

            <!-- Acciones Rápidas -->
            <div class="coco-card acciones-rapidas">
                <div class="card-header">
                    <h3><i class="fas fa-bolt"></i> Acciones Rapidas</h3>
                </div>
                <div class="acciones-grid">
                    <button class="accion-btn" onclick="showSection('planta')">
                        <i class="fas fa-map"></i>
                        <span>Vista Planta</span>
                    </button>
                    <button class="accion-btn" onclick="showSection('reportes')">
                        <i class="fas fa-chart-bar"></i>
                        <span>Reportes</span>
                    </button>
                    <button class="accion-btn" onclick="typeof mostrarModalBackups === 'function' ? mostrarModalBackups() : showToast('Función no disponible', 'error')">
                        <i class="fas fa-database"></i>
                        <span>Backups</span>
                    </button>
                    <button class="accion-btn" onclick="mostrarPremiosEquipo()">
                        <i class="fas fa-coins"></i>
                        <span>Premios Equipo</span>
                    </button>
                    <button class="accion-btn" onclick="typeof toggleModoTV === 'function' ? toggleModoTV() : showToast('Función no disponible', 'error')">
                        <i class="fas fa-tv"></i>
                        <span>Modo TV</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ========================================
// FUNCIONES AUXILIARES DEL DASHBOARD
// ========================================

function calcularEstadisticasDia() {
    const maquinas = Object.values(supervisoraState.maquinas);
    const operadoras = supervisoraState.operadores || [];
    const pedidos = supervisoraState.pedidosHoy || [];

    // Contar operadoras activas (que estan en alguna estacion)
    let operadorasActivas = 0;
    maquinas.forEach(m => {
        if (m.operadores && m.operadores.length > 0) {
            operadorasActivas += m.operadores.length;
        }
    });

    const piezasHoy = maquinas.reduce((sum, m) => sum + (m.piezasHoy || 0), 0);

    return {
        piezasHoy: piezasHoy,
        operadorasActivas: operadorasActivas,
        operadorasTotal: operadoras.length,
        operadorasInactivas: Math.max(0, operadoras.length - operadorasActivas),
        pedidosActivos: pedidos.length,
        pedidosUrgentes: pedidos.filter(p => p.prioridad === 'alta' || p.prioridad === 'urgente').length,
        pedidosNormales: pedidos.filter(p => p.prioridad !== 'alta' && p.prioridad !== 'urgente').length,
        eficienciaGeneral: calcularEficienciaGeneral(),
        entregasHoy: pedidos.filter(p => esEntregaHoy(p)).length,
        entregasEnRiesgo: pedidos.filter(p => esEntregaEnRiesgo(p)).length,
        comparacionAyer: calcularComparacionAyer(),
        produccionPorHora: getProduccionPorHora()
    };
}

function calcularEficienciaGeneral() {
    const maquinas = Object.values(supervisoraState.maquinas);
    const activas = maquinas.filter(m => m.operadores && m.operadores.length > 0);

    if (activas.length === 0) return 0;

    let totalEficiencia = 0;
    activas.forEach(m => {
        totalEficiencia += m.efectividad || 80; // Default 80% si no hay datos
    });

    return Math.round(totalEficiencia / activas.length);
}

function esEntregaHoy(pedido) {
    if (!pedido.fechaEntrega) return false;
    const hoy = new Date();
    const entrega = new Date(pedido.fechaEntrega);
    return entrega.toDateString() === hoy.toDateString();
}

function esEntregaEnRiesgo(pedido) {
    if (!pedido.fechaEntrega) return false;
    const progreso = pedido.progreso || calcularProgresoPedido(pedido);
    const hoy = new Date();
    const entrega = new Date(pedido.fechaEntrega);
    const diasRestantes = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));

    // En riesgo si quedan menos de 2 dias y progreso menor a 70%
    return diasRestantes <= 2 && progreso < 70;
}

function calcularProgresoPedido(pedido) {
    if (pedido.progreso) return pedido.progreso;
    if (!pedido.productos || pedido.productos.length === 0) return 0;

    const prod = pedido.productos[0];
    const cantidad = prod.cantidad || 1;
    const completadas = prod.completadas || 0;
    return Math.round((completadas / cantidad) * 100);
}

function calcularComparacionAyer() {
    const historial = getHistorialProduccion();
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    const produccionAyer = historial
        .filter(h => new Date(h.fecha).toDateString() === ayer.toDateString())
        .reduce((sum, h) => sum + (h.piezas || 0), 0);

    const produccionHoy = Object.values(supervisoraState.maquinas)
        .reduce((sum, m) => sum + (m.piezasHoy || 0), 0);

    if (produccionAyer === 0) return 0;
    return Math.round(((produccionHoy - produccionAyer) / produccionAyer) * 100);
}

function getProduccionPorHora() {
    // Simulacion de datos por hora (en produccion real se obtendrian del historial)
    const horas = [];
    const horaActual = new Date().getHours();

    for (let i = 8; i <= horaActual && i <= 18; i++) {
        horas.push({
            hora: i,
            piezas: Math.floor(Math.random() * 50) + 20
        });
    }

    return horas;
}

function renderMiniChart(data) {
    if (!data || data.length === 0) {
        return '<div class="mini-chart-empty">Sin datos</div>';
    }

    const max = Math.max(...data.map(d => d.piezas));

    return `
        <div class="mini-chart">
            ${data.map(d => `
                <div class="mini-bar" style="height: ${(d.piezas / max) * 100}%" title="${d.hora}:00 - ${d.piezas} pzas"></div>
            `).join('')}
        </div>
    `;
}

function generarAlertasInteligentes() {
    const alertas = [];
    const maquinas = Object.values(supervisoraState.maquinas);
    const pedidos = supervisoraState.pedidosHoy || [];
    const operadores = supervisoraState.operadores || [];

    // Operadoras sin asignar cuando hay pedidos urgentes
    const sinAsignar = operadores.filter(op =>
        !maquinas.some(m =>
            m.operadores && m.operadores.some(o => o.id === op.id)
        )
    );

    const pedidosUrgentes = pedidos.filter(p =>
        (p.prioridad === 'alta' || p.prioridad === 'urgente') &&
        calcularProgresoPedido(p) < 80
    );

    if (sinAsignar.length > 0 && pedidosUrgentes.length > 0) {
        alertas.push({
            tipo: 'warning',
            icono: 'fa-user-plus',
            titulo: `${sinAsignar.length} operadora${sinAsignar.length > 1 ? 's' : ''} sin asignar`,
            mensaje: `Hay pedidos urgentes que necesitan mas manos. Te recomiendo asignar a ${sinAsignar[0].nombre}.`,
            accion: `showSection('asistente')`,
            accionTexto: 'Ver recomendacion'
        });
    }

    // Estaciones activas sin proceso asignado
    const sinProceso = maquinas.filter(m =>
        m.operadores && m.operadores.length > 0 && !m.procesoNombre
    );

    if (sinProceso.length > 0) {
        alertas.push({
            tipo: 'info',
            icono: 'fa-tasks',
            titulo: `${sinProceso.length} estacion${sinProceso.length > 1 ? 'es' : ''} sin proceso`,
            mensaje: `Las estaciones ${sinProceso.map(m => m.id).slice(0, 3).join(', ')}${sinProceso.length > 3 ? '...' : ''} tienen operadoras pero no proceso asignado.`,
            accion: `selectEstacion('${sinProceso[0].id}')`,
            accionTexto: 'Asignar proceso'
        });
    }

    // Pedido en riesgo de entrega
    const enRiesgo = pedidos.filter(p => esEntregaEnRiesgo(p));
    if (enRiesgo.length > 0) {
        alertas.push({
            tipo: 'danger',
            icono: 'fa-exclamation-triangle',
            titulo: `¡Pedido #${enRiesgo[0].id} en riesgo!`,
            mensaje: `Solo tiene ${calcularProgresoPedido(enRiesgo[0])}% de avance y la entrega es pronto. Considera reasignar recursos.`,
            accion: `abrirDetalleProceso && abrirDetalleProceso(${enRiesgo[0].id})`,
            accionTexto: 'Ver pedido'
        });
    }

    // Alertas motivacionales de incentivos
    try {
        const alertasMotiv = generarAlertasMotivacionales();
        // Solo agregar las de prioridad alta/media (máximo 2)
        const motivAltas = alertasMotiv.filter(a => a.prioridad === 'alta' || a.prioridad === 'media').slice(0, 2);
        motivAltas.forEach(m => {
            alertas.push({
                tipo: 'info',
                icono: m.icono,
                titulo: m.titulo,
                mensaje: m.mensaje,
                accion: `mostrarPremiosEquipo()`,
                accionTexto: 'Ver premios'
            });
        });
    } catch(e) {}

    return alertas;
}

// ========================================
// SEMÁFORO GENERAL DE PLANTA
// ========================================

function calcularSemaforoGeneral(stats, alertasAccionables) {
    const peligros = alertasAccionables.filter(a => a.tipo === 'danger').length;
    const advertencias = alertasAccionables.filter(a => a.tipo === 'warning').length;
    const tiemposMuertosActivos = Object.keys(supervisoraState.tiemposMuertos?.activos || {}).length;

    // Condiciones para ROJO
    if (peligros >= 2 || stats.eficienciaGeneral < 50 || stats.entregasEnRiesgo >= 2 || tiemposMuertosActivos >= 3) {
        return {
            color: 'rojo',
            icono: 'fa-exclamation-triangle',
            titulo: 'Atención Inmediata Requerida',
            subtitulo: `${peligros} problema${peligros !== 1 ? 's' : ''} crítico${peligros !== 1 ? 's' : ''} detectado${peligros !== 1 ? 's' : ''}`
        };
    }

    // Condiciones para AMARILLO
    if (peligros >= 1 || advertencias >= 2 || stats.eficienciaGeneral < 70 || stats.entregasEnRiesgo >= 1 || tiemposMuertosActivos >= 1) {
        return {
            color: 'amarillo',
            icono: 'fa-exclamation-circle',
            titulo: 'Hay Situaciones por Atender',
            subtitulo: `${advertencias + peligros} alerta${(advertencias + peligros) !== 1 ? 's' : ''} pendiente${(advertencias + peligros) !== 1 ? 's' : ''}`
        };
    }

    // VERDE
    return {
        color: 'verde',
        icono: 'fa-check-circle',
        titulo: 'Producción en Buen Ritmo',
        subtitulo: `Eficiencia al ${stats.eficienciaGeneral}% — todo en orden`
    };
}

// ========================================
// ALERTAS ACCIONABLES — "Requiere tu atención"
// ========================================

function generarAlertasAccionables() {
    const alertas = [];
    const maquinas = Object.values(supervisoraState.maquinas);
    const pedidos = supervisoraState.pedidosHoy || [];
    const operadores = supervisoraState.operadores || [];

    // 1. Tiempos muertos activos > 15 minutos
    const tmActivos = supervisoraState.tiemposMuertos?.activos || {};
    Object.entries(tmActivos).forEach(([estacionId, tm]) => {
        const durMin = Math.floor((Date.now() - new Date(tm.inicio).getTime()) / 60000);
        if (durMin >= 15) {
            alertas.push({
                tipo: 'danger',
                icono: 'fa-pause-circle',
                titulo: `${estacionId} detenida hace ${durMin} min`,
                detalle: `${tm.motivoNombre} — ${tm.operadores?.map(o => o.nombre.split(' ')[0]).join(', ') || 'Sin operador'}`,
                accion: `mostrarTiempoMuertoActivo('${estacionId}')`,
                botonTexto: 'Resolver'
            });
        }
    });

    // 2. Pedidos en riesgo de entrega
    pedidos.forEach(p => {
        if (esEntregaEnRiesgo(p)) {
            const prog = calcularProgresoPedido(p);
            const cliente = typeof db !== 'undefined' ? db.getCliente(p.clienteId) : null;
            alertas.push({
                tipo: 'danger',
                icono: 'fa-fire',
                titulo: `Pedido #${p.id} en riesgo de entrega`,
                detalle: `${cliente?.nombreComercial || p.clienteNombre || 'Cliente'} — ${prog}% avance`,
                accion: `showSection('planta'); setTimeout(() => { const el = document.querySelector('[data-pedido-id="${p.id}"]'); if(el) el.scrollIntoView({behavior:'smooth'}); }, 300)`,
                botonTexto: 'Ver pedido'
            });
        }
    });

    // 3. Operadoras sin asignar cuando hay pedidos urgentes
    const sinAsignar = operadores.filter(op =>
        !maquinas.some(m => m.operadores && m.operadores.some(o => o.id === op.id))
    );
    const pedidosUrg = pedidos.filter(p => p.prioridad === 'alta' || p.prioridad === 'urgente');

    if (sinAsignar.length > 0 && pedidosUrg.length > 0) {
        alertas.push({
            tipo: 'warning',
            icono: 'fa-user-plus',
            titulo: `${sinAsignar.length} operadora${sinAsignar.length > 1 ? 's' : ''} disponible${sinAsignar.length > 1 ? 's' : ''} sin asignar`,
            detalle: `${sinAsignar.slice(0, 3).map(o => o.nombre.split(' ')[0]).join(', ')} — hay ${pedidosUrg.length} pedido${pedidosUrg.length > 1 ? 's' : ''} urgente${pedidosUrg.length > 1 ? 's' : ''}`,
            accion: `showSection('planta')`,
            botonTexto: 'Asignar'
        });
    }

    // 4. Estaciones con operador pero sin proceso
    const sinProceso = maquinas.filter(m =>
        m.operadores && m.operadores.length > 0 && !m.procesoNombre
    );
    if (sinProceso.length > 0) {
        alertas.push({
            tipo: 'warning',
            icono: 'fa-tasks',
            titulo: `${sinProceso.length} estación${sinProceso.length > 1 ? 'es' : ''} sin proceso asignado`,
            detalle: sinProceso.map(m => m.id).slice(0, 4).join(', '),
            accion: `showSection('planta'); setTimeout(() => selectEstacion('${sinProceso[0].id}'), 300)`,
            botonTexto: 'Asignar proceso'
        });
    }

    // 5. Estaciones retrasadas
    const retrasadas = maquinas.filter(m => m.estado === 'retrasado');
    if (retrasadas.length > 0) {
        alertas.push({
            tipo: 'danger',
            icono: 'fa-clock',
            titulo: `${retrasadas.length} estación${retrasadas.length > 1 ? 'es' : ''} retrasada${retrasadas.length > 1 ? 's' : ''}`,
            detalle: retrasadas.map(m => m.id).slice(0, 4).join(', '),
            accion: `showSection('planta'); setTimeout(() => selectEstacion('${retrasadas[0].id}'), 300)`,
            botonTexto: 'Revisar'
        });
    }

    // 6. Alertas predictivas de entrega (IA)
    try {
        const alertasEntrega = typeof verificarAlertasEntrega === 'function' ? verificarAlertasEntrega() : [];
        alertasEntrega.forEach(ae => {
            alertas.push({
                tipo: ae.prioridad === 'alta' ? 'danger' : 'warning',
                icono: 'fa-brain',
                titulo: ae.tipo === 'sin_produccion' ? `Sin producción: ${ae.codigo}` : `Ritmo insuficiente: ${ae.codigo}`,
                detalle: ae.mensaje,
                accion: `abrirChat(); document.getElementById('chatInput').value='alertas entrega'; enviarMensajeChat()`,
                botonTexto: 'Ver análisis'
            });
        });
    } catch (e) {
        console.error('[COCO IA] Error integrando alertas de entrega:', e);
    }

    // 7. Anomalías detectadas por IA
    try {
        const anomalias = typeof detectarAnomalias === 'function' ? detectarAnomalias() : [];
        anomalias.forEach(an => {
            if (an.tipo === 'baja_produccion') {
                alertas.push({
                    tipo: 'warning',
                    icono: 'fa-chart-line',
                    titulo: `Producción ${an.decline}% por debajo del promedio`,
                    detalle: an.mensaje,
                    accion: `abrirChat(); document.getElementById('chatInput').value='anomalías'; enviarMensajeChat()`,
                    botonTexto: 'Analizar'
                });
            } else if (an.tipo === 'estacion_inactiva') {
                alertas.push({
                    tipo: 'warning',
                    icono: 'fa-exclamation-triangle',
                    titulo: `Estación inactiva: ${an.estacionId}`,
                    detalle: an.mensaje,
                    accion: `showSection('planta'); setTimeout(() => selectEstacion('${an.estacionId}'), 300)`,
                    botonTexto: 'Revisar'
                });
            }
        });
    } catch (e) {
        console.error('[COCO IA] Error integrando anomalías:', e);
    }

    // Ordenar: danger primero, luego warning, luego info
    const prioridad = { danger: 0, warning: 1, info: 2 };
    alertas.sort((a, b) => (prioridad[a.tipo] || 2) - (prioridad[b.tipo] || 2));

    return alertas.slice(0, 5); // Máximo 5 alertas accionables
}

// ========================================
// CUELLOS DE BOTELLA — FLUJO ENTRE ÁREAS
// ========================================

function detectarCuellosBotella() {
    const maquinas = Object.values(supervisoraState.maquinas);
    const tiemposMuertosActivos = supervisoraState.tiemposMuertos?.activos || {};

    // Definir áreas de producción en orden del flujo
    const areasProduccion = [
        { id: 'corte', nombre: 'Corte', icono: 'fa-cut', tipos: ['corte', 'mesa'] },
        { id: 'serigrafia', nombre: 'Serigrafía', icono: 'fa-paint-brush', tipos: ['serigrafia', 'area'] },
        { id: 'costura', nombre: 'Costura', icono: 'fa-tshirt', tipos: ['costura'] },
        { id: 'calidad', nombre: 'Calidad', icono: 'fa-check-circle', tipos: ['calidad'] },
        { id: 'empaque', nombre: 'Empaque', icono: 'fa-box', tipos: ['empaque'] }
    ];

    return areasProduccion.map(area => {
        // Obtener estaciones de esta área
        const estacionesArea = maquinas.filter(m => {
            const tipo = (m.tipo || '').toLowerCase();
            const id = (m.id || '').toLowerCase();
            return area.tipos.some(t => tipo.includes(t) || id.startsWith(t.charAt(0)));
        });

        const total = estacionesArea.length;
        const activas = estacionesArea.filter(m => m.estado === 'activo' || m.estado === 'adelantado').length;
        const conParo = estacionesArea.filter(m => tiemposMuertosActivos[m.id]).length;
        const piezas = estacionesArea.reduce((s, m) => s + (m.piezasHoy || 0), 0);

        // Determinar estado del área
        let estado = 'ok';
        if (total === 0) estado = 'ok';
        else if (conParo > 0 || (activas === 0 && total > 0)) estado = 'cuello';
        else if (activas < total * 0.5) estado = 'lento';
        else if (activas > 0) estado = 'activo';

        return {
            ...area,
            total,
            activas,
            conParo,
            piezas,
            estado
        };
    });
}

function renderFlujoAreas(cuellos) {
    // Solo mostrar si hay datos reales
    const areasConEstaciones = cuellos.filter(c => c.total > 0);
    if (areasConEstaciones.length === 0) return '';

    return `
        <div class="flujo-areas-container">
            <div class="flujo-areas-titulo">
                <i class="fas fa-stream"></i> Flujo de Producción
            </div>
            <div class="flujo-areas">
                ${areasConEstaciones.map((area, idx) => `
                    ${idx > 0 ? `<div class="flujo-flecha ${area.estado === 'cuello' ? 'congestionado' : area.estado === 'lento' ? 'lento' : ''}"><i class="fas fa-chevron-right"></i></div>` : ''}
                    <div class="flujo-area-nodo ${area.estado}" onclick="filtrarMapaPorArea('${area.id}')" title="${area.nombre}: ${area.activas}/${area.total} activas, ${area.piezas} piezas">
                        <div class="flujo-area-icon"><i class="fas ${area.icono}"></i></div>
                        <div class="flujo-area-nombre">${area.nombre}</div>
                        <div class="flujo-area-stat">${area.piezas} pzas</div>
                        <div class="flujo-area-estaciones">${area.activas}/${area.total} activas</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getTopOperadoras(limite) {
    const ranking = [];

    Object.entries(supervisoraState.maquinas).forEach(([estacionId, maquina]) => {
        if (maquina.operadores && maquina.operadores.length > 0) {
            maquina.operadores.forEach(op => {
                ranking.push({
                    id: op.id,
                    nombre: op.nombre,
                    estacion: estacionId,
                    piezas: maquina.piezasHoy || 0,
                    eficiencia: maquina.efectividad || calcularEficienciaOperadora(op.id)
                });
            });
        }
    });

    return ranking
        .sort((a, b) => b.piezas - a.piezas)
        .slice(0, limite);
}

function calcularEficienciaOperadora(operadorId) {
    const historial = getHistorialProduccion();
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});

    // Buscar registros del operador
    const registros = historial.filter(h => h.operadoraId == operadorId || h.operadorId == operadorId);

    // Buscar eficiencia en estado_maquinas
    for (const [estId, estado] of Object.entries(estadoMaquinas)) {
        if (estado.operadoraId == operadorId && estado.efectividad) {
            return Math.round(estado.efectividad);
        }
    }

    // Buscar en supervisoraState.maquinas
    for (const [estId, maquina] of Object.entries(supervisoraState.maquinas || {})) {
        if (maquina.operadores && maquina.operadores.some(o => o.id == operadorId)) {
            if (maquina.efectividad) return Math.round(maquina.efectividad);
        }
    }

    // Calcular desde historial
    if (registros.length === 0) return 85; // Default más realista

    const eficiencias = registros.filter(r => r.eficiencia).map(r => r.eficiencia);
    if (eficiencias.length === 0) {
        // Calcular eficiencia basada en piezas vs meta
        const conMeta = registros.filter(r => r.meta && r.meta > 0);
        if (conMeta.length > 0) {
            const eficiencia = conMeta.reduce((sum, r) => {
                const piezas = r.cantidad || r.piezas || 0;
                return sum + ((piezas / r.meta) * 100);
            }, 0) / conMeta.length;
            return Math.round(eficiencia);
        }
        return 85;
    }

    return Math.round(eficiencias.reduce((a, b) => a + b, 0) / eficiencias.length);
}

function getPedidosUrgentes() {
    const pedidos = supervisoraState.pedidosHoy || [];

    return pedidos
        .filter(p => p.prioridad === 'alta' || p.prioridad === 'urgente' || esEntregaEnRiesgo(p))
        .map(p => ({
            id: p.id,
            cliente: p.clienteNombre || 'Cliente',
            progreso: calcularProgresoPedido(p),
            tiempoRestante: calcularTiempoRestante(p)
        }))
        .slice(0, 5);
}

function calcularTiempoRestante(pedido) {
    if (!pedido.fechaEntrega) return 'Sin fecha';

    const ahora = new Date();
    const entrega = new Date(pedido.fechaEntrega);
    const diff = entrega - ahora;

    if (diff < 0) return 'Vencido';

    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (dias > 0) return `${dias}d ${horas}h`;
    return `${horas}h`;
}

function generarRecomendacionRapida() {
    const recomendaciones = getRecomendacionesIA();

    if (recomendaciones.asignaciones.length === 0) {
        return `<p>Todo está bajo control, Coco. Tu equipo está trabajando eficientemente.</p>`;
    }

    const rec = recomendaciones.asignaciones[0];
    return `
        <div class="recomendacion-rapida">
            <p><strong>${rec.titulo || 'Recomendación de asignación'}</strong></p>
            <p>${rec.razon || `Considera asignar a ${rec.operadora} al proceso de ${rec.procesoSugerido}.`}</p>
        </div>
    `;
}

function formatearFechaCompleta(fecha) {
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return fecha.toLocaleDateString('es-MX', opciones);
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return '-';
    return fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ========================================
// SISTEMA DE INCENTIVOS - DASHBOARD SUPERVISORA
// ========================================

/**
 * Obtiene config de incentivos (reutiliza la de app.js si está disponible)
 */
function getConfigIncentivosDashboard() {
    if (typeof window.getConfigIncentivos === 'function') {
        return window.getConfigIncentivos();
    }
    var saved = localStorage.getItem('erp_config_incentivos');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
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
 * Calcula el tier para una eficiencia dada
 */
function calcularTierDashboard(eficiencia) {
    if (typeof window.calcularTierPorEficiencia === 'function') {
        return window.calcularTierPorEficiencia(eficiencia);
    }
    var config = getConfigIncentivosDashboard();
    var tiersSorted = config.tiers.slice().sort(function(a, b) { return b.minEficiencia - a.minEficiencia; });
    for (var i = 0; i < tiersSorted.length; i++) {
        if (eficiencia >= tiersSorted[i].minEficiencia) return tiersSorted[i];
    }
    return null;
}

/**
 * Calcula el premio estimado para una operadora
 */
function calcularPremioDashboard(eficiencia, operadoraId) {
    var tier = calcularTierDashboard(eficiencia);
    if (!tier) return 0;
    var premioBase = getConfigIncentivosDashboard().premioBaseDefault;
    // Buscar premio individual
    var operadorasDB = safeLocalGet('operadoras_db', []);
    var op = operadorasDB.find(function(o) { return o.id == operadoraId; });
    if (op && op.premioProduccion > 0) premioBase = op.premioProduccion;
    return Math.round(premioBase * tier.multiplicador);
}

/**
 * Renderiza la sección de incentivos del equipo
 */
function renderSeccionIncentivosEquipo(stats, topOperadoras) {
    var config = getConfigIncentivosDashboard();
    var eficienciaEquipo = stats.eficienciaGeneral || 0;

    // Contar operadoras por tier
    var conteoTiers = { sinBono: 0 };
    config.tiers.forEach(function(t) { conteoTiers[t.nombre] = 0; });

    var premioTotalEquipo = 0;
    topOperadoras.forEach(function(op) {
        var tier = calcularTierDashboard(op.eficiencia);
        if (tier) {
            conteoTiers[tier.nombre] = (conteoTiers[tier.nombre] || 0) + 1;
            premioTotalEquipo += calcularPremioDashboard(op.eficiencia, op.id);
        } else {
            conteoTiers.sinBono++;
        }
    });

    // Incentivo de la supervisora
    var metaEquipo = config.metaEquipoSupervisora || 90;
    var multiplicadorSup = config.multiplicadorSupervisora || 1.0;
    var supervisoraData = safeLocalGet('supervisora_sesion', {});
    var premioBaseSup = 0;
    // Buscar premio de la supervisora en personal
    var operadorasDB = safeLocalGet('operadoras_db', []);
    var supData = operadorasDB.find(function(o) { return o.rol === 'supervisora' || o.rol === 'supervisor'; });
    if (supData && supData.premioProduccion > 0) {
        premioBaseSup = supData.premioProduccion;
    } else {
        premioBaseSup = config.premioBaseDefault;
    }
    var cumpleMeta = eficienciaEquipo >= metaEquipo;
    var premioSupervisora = cumpleMeta ? Math.round(premioBaseSup * multiplicadorSup) : 0;
    var progresoMeta = metaEquipo > 0 ? Math.min(100, Math.round((eficienciaEquipo / metaEquipo) * 100)) : 0;

    return '<div class="coco-incentivos-section">' +
        '<div class="incentivos-equipo-grid">' +

        // Widget: Rendimiento del Equipo
        '<div class="coco-card incentivo-card equipo-rendimiento">' +
            '<div class="card-header">' +
                '<h3><i class="fas fa-users-cog"></i> Rendimiento del Equipo</h3>' +
            '</div>' +
            '<div class="incentivo-body">' +
                '<div class="equipo-eficiencia-display">' +
                    '<div class="eficiencia-circulo" style="--progreso:' + Math.min(eficienciaEquipo, 130) + ';--color:' + (eficienciaEquipo >= 100 ? '#10b981' : eficienciaEquipo >= 80 ? '#f59e0b' : '#ef4444') + '">' +
                        '<span class="eficiencia-valor">' + eficienciaEquipo + '%</span>' +
                        '<span class="eficiencia-label">Eficiencia</span>' +
                    '</div>' +
                '</div>' +
                '<div class="equipo-premio-total">' +
                    '<span class="premio-label">Premios del equipo hoy</span>' +
                    '<span class="premio-valor">$' + premioTotalEquipo + '</span>' +
                '</div>' +
                '<div class="equipo-tiers-resumen">' +
                    config.tiers.slice().reverse().map(function(tier) {
                        var count = conteoTiers[tier.nombre] || 0;
                        return '<div class="tier-count" style="--tier-color:' + tier.color + '">' +
                            '<i class="fas ' + tier.icono + '" style="color:' + tier.color + '"></i>' +
                            '<span class="tier-num">' + count + '</span>' +
                            '<span class="tier-name">' + tier.nombre + '</span>' +
                        '</div>';
                    }).join('') +
                    '<div class="tier-count" style="--tier-color:#999">' +
                        '<i class="fas fa-minus" style="color:#999"></i>' +
                        '<span class="tier-num">' + conteoTiers.sinBono + '</span>' +
                        '<span class="tier-name">Sin bono</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +

        // Widget: Mi Incentivo (Supervisora)
        '<div class="coco-card incentivo-card mi-incentivo">' +
            '<div class="card-header">' +
                '<h3><i class="fas fa-coins"></i> Mi Incentivo</h3>' +
            '</div>' +
            '<div class="incentivo-body">' +
                '<div class="sup-premio-display">' +
                    '<div class="sup-premio-monto' + (cumpleMeta ? ' activo' : '') + '">$' + premioSupervisora + '</div>' +
                    '<div class="sup-premio-estado">' +
                        (cumpleMeta ?
                            '<i class="fas fa-check-circle" style="color:#10b981"></i> Meta alcanzada' :
                            '<i class="fas fa-bullseye" style="color:#f59e0b"></i> Meta: ' + metaEquipo + '% eficiencia equipo') +
                    '</div>' +
                '</div>' +
                '<div class="sup-progreso-container">' +
                    '<div class="sup-progreso-barra">' +
                        '<div class="sup-progreso-fill" style="width:' + progresoMeta + '%;background:' + (cumpleMeta ? '#10b981' : '#f59e0b') + '"></div>' +
                        '<div class="sup-progreso-meta" style="left:100%"></div>' +
                    '</div>' +
                    '<div class="sup-progreso-labels">' +
                        '<span>0%</span>' +
                        '<span>' + eficienciaEquipo + '% actual</span>' +
                        '<span>' + metaEquipo + '%</span>' +
                    '</div>' +
                '</div>' +
                '<div class="sup-proyeccion">' +
                    '<i class="fas fa-chart-line"></i> ' +
                    (cumpleMeta ?
                        'Si el equipo mantiene este ritmo, ganaras <strong>$' + premioSupervisora + '</strong> hoy' :
                        'Faltan <strong>' + (metaEquipo - eficienciaEquipo) + ' puntos</strong> de eficiencia para alcanzar tu premio') +
                '</div>' +
            '</div>' +
        '</div>' +

    '</div>' +
    '</div>';
}

/**
 * Modal "Premios del Equipo" - tabla detallada de todas las operadoras
 */
function mostrarPremiosEquipo() {
    var allOperadoras = getTopOperadoras(50); // Obtener todas
    var config = getConfigIncentivosDashboard();

    // Calcular totales
    var totalPremios = 0;
    var totalPiezas = 0;
    var eficienciaSum = 0;

    var rows = allOperadoras.map(function(op) {
        var tier = calcularTierDashboard(op.eficiencia);
        var premio = calcularPremioDashboard(op.eficiencia, op.id);
        totalPremios += premio;
        totalPiezas += op.piezas;
        eficienciaSum += op.eficiencia;

        // Detectar si está cerca de subir de tier
        var cercaDeSubir = '';
        if (tier) {
            var tiersSorted = config.tiers.slice().sort(function(a, b) { return a.minEficiencia - b.minEficiencia; });
            var idxActual = tiersSorted.findIndex(function(t) { return t.nombre === tier.nombre; });
            if (idxActual < tiersSorted.length - 1) {
                var siguiente = tiersSorted[idxActual + 1];
                var diff = siguiente.minEficiencia - op.eficiencia;
                if (diff <= 10) {
                    cercaDeSubir = '<span class="cerca-subir" style="color:' + siguiente.color + '"><i class="fas fa-arrow-up"></i> A ' + diff + '% de ' + siguiente.nombre + '</span>';
                }
            }
        } else {
            // Sin tier, ver si está cerca del primero
            var primerTier = config.tiers.slice().sort(function(a, b) { return a.minEficiencia - b.minEficiencia; })[0];
            if (primerTier) {
                var diff = primerTier.minEficiencia - op.eficiencia;
                if (diff <= 15 && diff > 0) {
                    cercaDeSubir = '<span class="cerca-subir" style="color:' + primerTier.color + '"><i class="fas fa-arrow-up"></i> A ' + diff + '% de ' + primerTier.nombre + '</span>';
                }
            }
        }

        return '<tr>' +
            '<td>' + op.nombre + '</td>' +
            '<td>' + (op.estacion || '-') + '</td>' +
            '<td><strong>' + op.piezas + '</strong></td>' +
            '<td>' + op.eficiencia + '%</td>' +
            '<td>' + (tier ? '<span style="color:' + tier.color + '"><i class="fas ' + tier.icono + '"></i> ' + tier.nombre + '</span>' : '<span style="color:#999">-</span>') + '</td>' +
            '<td><strong>$' + premio + '</strong></td>' +
            '<td>' + cercaDeSubir + '</td>' +
        '</tr>';
    });

    var eficienciaProm = allOperadoras.length > 0 ? Math.round(eficienciaSum / allOperadoras.length) : 0;

    var content = '<div class="premios-equipo-modal">' +
        '<div class="premios-totales">' +
            '<div class="premio-total-stat"><span class="stat-valor">' + allOperadoras.length + '</span><span class="stat-label">Operadoras</span></div>' +
            '<div class="premio-total-stat"><span class="stat-valor">' + totalPiezas + '</span><span class="stat-label">Piezas Total</span></div>' +
            '<div class="premio-total-stat"><span class="stat-valor">' + eficienciaProm + '%</span><span class="stat-label">Efic. Promedio</span></div>' +
            '<div class="premio-total-stat principal"><span class="stat-valor">$' + totalPremios + '</span><span class="stat-label">Premios Total</span></div>' +
        '</div>' +
        '<table class="premios-tabla">' +
            '<thead><tr><th>Nombre</th><th>Estación</th><th>Piezas</th><th>Efic.</th><th>Nivel</th><th>Premio</th><th>Próximo</th></tr></thead>' +
            '<tbody>' + (rows.length > 0 ? rows.join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;opacity:0.5">Sin datos de producción hoy</td></tr>') + '</tbody>' +
        '</table>' +
    '</div>';

    if (typeof openModal === 'function') {
        openModal('Premios del Equipo', content, '<button class="btn btn-primary" onclick="closeModal()">Cerrar</button>');
    }
}

/**
 * Genera alertas motivacionales para la supervisora
 * Se integra con el sistema de alertas existente
 */
function generarAlertasMotivacionales() {
    var alertas = [];
    var config = getConfigIncentivosDashboard();
    var operadoras = getTopOperadoras(50);

    operadoras.forEach(function(op) {
        var tier = calcularTierDashboard(op.eficiencia);
        var tiersSorted = config.tiers.slice().sort(function(a, b) { return a.minEficiencia - b.minEficiencia; });

        if (tier) {
            var idxActual = tiersSorted.findIndex(function(t) { return t.nombre === tier.nombre; });
            if (idxActual < tiersSorted.length - 1) {
                var siguiente = tiersSorted[idxActual + 1];
                var diff = siguiente.minEficiencia - op.eficiencia;
                if (diff <= 8 && diff > 0) {
                    alertas.push({
                        tipo: 'motivacion',
                        icono: 'fa-arrow-up',
                        titulo: op.nombre + ' cerca de ' + siguiente.nombre,
                        mensaje: 'Le faltan ' + diff + ' puntos de eficiencia para subir a nivel ' + siguiente.nombre + '. Motívala!',
                        color: siguiente.color,
                        prioridad: diff <= 3 ? 'alta' : 'media'
                    });
                }
            }
        } else {
            // Sin tier - ver si está cerca del primero
            if (tiersSorted.length > 0) {
                var primerTier = tiersSorted[0];
                var diff = primerTier.minEficiencia - op.eficiencia;
                if (diff <= 10 && diff > 0) {
                    alertas.push({
                        tipo: 'motivacion',
                        icono: 'fa-hand-holding-heart',
                        titulo: op.nombre + ' cerca de ' + primerTier.nombre,
                        mensaje: 'Le faltan ' + diff + ' puntos para alcanzar su primer bono. Dale ánimo!',
                        color: primerTier.color,
                        prioridad: 'media'
                    });
                }
            }
        }

        // Operadoras en Diamante (celebrar)
        if (tier && tier.nombre === 'Diamante') {
            alertas.push({
                tipo: 'motivacion',
                icono: 'fa-gem',
                titulo: op.nombre + ' en Diamante!',
                mensaje: 'Está en el nivel máximo con ' + op.eficiencia + '% eficiencia.',
                color: '#B9F2FF',
                prioridad: 'baja'
            });
        }
    });

    // Alerta si equipo supera meta
    var stats = calcularEstadisticasDia();
    if (stats.eficienciaGeneral >= (config.metaEquipoSupervisora || 90)) {
        alertas.push({
            tipo: 'motivacion',
            icono: 'fa-trophy',
            titulo: 'Equipo supera la meta!',
            mensaje: 'El equipo tiene ' + stats.eficienciaGeneral + '% de eficiencia. Tu premio está asegurado!',
            color: '#FFD700',
            prioridad: 'alta'
        });
    }

    // Contar Diamantes
    var diamantes = operadoras.filter(function(op) {
        var t = calcularTierDashboard(op.eficiencia);
        return t && t.nombre === 'Diamante';
    });
    if (diamantes.length >= 3) {
        alertas.push({
            tipo: 'motivacion',
            icono: 'fa-star',
            titulo: diamantes.length + ' operadoras en Diamante!',
            mensaje: 'Excelente rendimiento del equipo hoy.',
            color: '#B9F2FF',
            prioridad: 'media'
        });
    }

    return alertas;
}

// ========================================
// CALENDARIO DE COCO
// ========================================

function renderCocoCalendario() {
    const container = document.querySelector('.coco-calendario-container');
    if (!container) return;

    const ahora = new Date();
    const mesActual = cocoState.calendarioMes;
    const anioActual = cocoState.calendarioAnio;

    const diasMes = getDiasMes(anioActual, mesActual);
    const primerDia = new Date(anioActual, mesActual, 1).getDay();
    const eventos = getEventosCalendario(anioActual, mesActual);

    container.innerHTML = `
        <div class="coco-calendario">
            <div class="calendario-header">
                <div class="calendario-nav">
                    <button class="btn-icon" onclick="cambiarMes(-1)">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h2>${getNombreMes(mesActual)} ${anioActual}</h2>
                    <button class="btn-icon" onclick="cambiarMes(1)">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendario-acciones">
                    <button class="btn btn-outline" onclick="irAHoy()">
                        <i class="fas fa-calendar-day"></i> Hoy
                    </button>
                    <button class="btn btn-primary" onclick="agregarEvento()">
                        <i class="fas fa-plus"></i> Nuevo Evento
                    </button>
                </div>
            </div>

            <!-- Leyenda -->
            <div class="calendario-leyenda">
                <span class="leyenda-item"><span class="dot entrega"></span> Entrega</span>
                <span class="leyenda-item"><span class="dot urgente"></span> Urgente</span>
                <span class="leyenda-item"><span class="dot ausencia"></span> Ausencia</span>
                <span class="leyenda-item"><span class="dot pedido"></span> Inicio Pedido</span>
                <span class="leyenda-item"><span class="dot mantenimiento"></span> Mantenimiento</span>
            </div>

            <!-- Grid del calendario -->
            <div class="calendario-grid">
                <div class="calendario-dias-semana">
                    <span>Dom</span><span>Lun</span><span>Mar</span><span>Mie</span>
                    <span>Jue</span><span>Vie</span><span>Sab</span>
                </div>
                <div class="calendario-dias">
                    ${renderDiasCalendario(anioActual, mesActual, diasMes, primerDia, eventos)}
                </div>
            </div>

            <!-- Lista de eventos del dia seleccionado -->
            <div class="calendario-detalle">
                <h3><i class="fas fa-list"></i> Eventos del Dia Seleccionado</h3>
                <div id="eventosDelDia">
                    ${renderEventosDelDia(cocoState.diaSeleccionado, eventos)}
                </div>
            </div>

            <!-- Proximas entregas -->
            <div class="proximas-entregas">
                <h3><i class="fas fa-truck"></i> Proximas Entregas</h3>
                <div class="entregas-timeline">
                    ${renderProximasEntregas()}
                </div>
            </div>
        </div>
    `;
}

function getDiasMes(anio, mes) {
    return new Date(anio, mes + 1, 0).getDate();
}

function getNombreMes(mes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mes];
}

function renderDiasCalendario(anio, mes, diasMes, primerDia, eventos) {
    let html = '';
    const hoy = new Date();

    // Helper: check if a day falls within an event's range
    function eventoCaeEnDia(e, diaDate) {
        if (e.fechaInicio && e.fechaFin) {
            var ini = new Date(e.fechaInicio); ini.setHours(0,0,0,0);
            var fin = new Date(e.fechaFin); fin.setHours(23,59,59,999);
            return diaDate >= ini && diaDate <= fin;
        }
        var f = new Date(e.fecha);
        return f.getDate() === diaDate.getDate() && f.getMonth() === diaDate.getMonth() && f.getFullYear() === diaDate.getFullYear();
    }

    // Calcular carga máxima del mes para normalizar barras
    var maxEventos = 1;
    for (let d = 1; d <= diasMes; d++) {
        var diaCheck = new Date(anio, mes, d);
        var c = eventos.filter(function(e) { return eventoCaeEnDia(e, diaCheck); }).length;
        if (c > maxEventos) maxEventos = c;
    }

    // Dias vacios antes del primer dia
    for (let i = 0; i < primerDia; i++) {
        html += '<div class="dia vacio"></div>';
    }

    // Dias del mes
    for (let dia = 1; dia <= diasMes; dia++) {
        const fecha = new Date(anio, mes, dia);
        const esHoy = fecha.toDateString() === hoy.toDateString();
        const esSeleccionado = fecha.toDateString() === cocoState.diaSeleccionado.toDateString();

        const eventosDelDia = eventos.filter(e => eventoCaeEnDia(e, fecha));

        const tieneEntrega = eventosDelDia.some(e => e.tipo === 'entrega');
        const tieneUrgente = eventosDelDia.some(e => e.tipo === 'urgente');
        const tieneAusencia = eventosDelDia.some(e => e.tipo === 'ausencia');
        const tienePedido = eventosDelDia.some(e => e.tipo === 'pedido');
        const tieneMantenimiento = eventosDelDia.some(e => e.tipo === 'mantenimiento');

        // Tooltip con resumen de eventos
        var tooltipText = '';
        if (eventosDelDia.length > 0) {
            tooltipText = eventosDelDia.map(function(e) { return e.titulo; }).join(' | ');
        }

        // Barra de carga de trabajo (proporción del máximo)
        var cargaPct = eventosDelDia.length > 0 ? Math.round((eventosDelDia.length / maxEventos) * 100) : 0;
        var cargaColor = cargaPct > 66 ? '#ef4444' : cargaPct > 33 ? '#f59e0b' : '#22c55e';

        html += `
            <div class="dia ${esHoy ? 'hoy' : ''} ${esSeleccionado ? 'seleccionado' : ''} ${eventosDelDia.length > 0 ? 'con-eventos' : ''}"
                 onclick="seleccionarDia(${anio}, ${mes}, ${dia})"
                 ${tooltipText ? 'title="' + S(tooltipText) + '"' : ''}>
                <span class="dia-numero">${dia}</span>
                <div class="dia-eventos">
                    ${tieneEntrega ? '<span class="evento-dot entrega"></span>' : ''}
                    ${tieneUrgente ? '<span class="evento-dot urgente"></span>' : ''}
                    ${tieneAusencia ? '<span class="evento-dot ausencia"></span>' : ''}
                    ${tienePedido ? '<span class="evento-dot pedido"></span>' : ''}
                    ${tieneMantenimiento ? '<span class="evento-dot mantenimiento"></span>' : ''}
                </div>
                ${eventosDelDia.length > 1 ? `<span class="eventos-count">+${eventosDelDia.length}</span>` : ''}
                ${eventosDelDia.length > 0 ? `<div class="dia-carga"><div class="dia-carga-bar" style="width:${cargaPct}%;background:${cargaColor}"></div></div>` : ''}
            </div>
        `;
    }

    return html;
}

function getEventosCalendario(anio, mes) {
    const eventos = [];
    const pedidos = supervisoraState.pedidosHoy || [];
    const primerDiaMes = new Date(anio, mes, 1);
    const ultimoDiaMes = new Date(anio, mes + 1, 0, 23, 59, 59);

    // Obtener entregas de pedidos con rango fechaInicio-fechaFin
    pedidos.forEach(pedido => {
        if (pedido.fechaEntrega) {
            const fechaFin = new Date(pedido.fechaEntrega);
            const fechaIni = pedido.fechaCarga ? new Date(pedido.fechaCarga) : null;

            // Incluir si el rango del pedido intersecta con el mes visible
            var inicioRango = fechaIni || fechaFin;
            var finRango = fechaFin;
            var intersecta = inicioRango <= ultimoDiaMes && finRango >= primerDiaMes;

            if (intersecta) {
                var hoy = new Date();
                var diasRestantes = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24));
                var esUrgente = pedido.prioridad === 'alta' || pedido.prioridad === 'urgente' || diasRestantes <= 2;

                eventos.push({
                    id: `entrega-${pedido.id}`,
                    tipo: esUrgente ? 'urgente' : 'entrega',
                    titulo: (esUrgente ? '⚡ ' : '') + `Pedido #${pedido.id}`,
                    descripcion: (pedido.clienteNombre || 'Cliente') + (esUrgente ? ' - URGENTE' : ''),
                    fecha: pedido.fechaEntrega,
                    fechaInicio: pedido.fechaCarga || null,
                    fechaFin: pedido.fechaEntrega,
                    prioridad: pedido.prioridad
                });
            }
        }
    });

    // Cargar eventos guardados (ausencias, mantenimiento, etc)
    const eventosGuardados = safeLocalGet('calendario_eventos', []);
    eventos.push(...eventosGuardados.filter(e => {
        if (e.fechaInicio && e.fechaFin) {
            var ini = new Date(e.fechaInicio);
            var fin = new Date(e.fechaFin);
            return ini <= ultimoDiaMes && fin >= primerDiaMes;
        }
        const fecha = new Date(e.fecha);
        return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    }));

    return eventos;
}

function renderEventosDelDia(fecha, eventos) {
    const eventosDelDia = eventos.filter(e => {
        if (e.fechaInicio && e.fechaFin) {
            var ini = new Date(e.fechaInicio); ini.setHours(0,0,0,0);
            var fin = new Date(e.fechaFin); fin.setHours(23,59,59,999);
            return fecha >= ini && fecha <= fin;
        }
        const fechaEvento = new Date(e.fecha);
        return fechaEvento.toDateString() === fecha.toDateString();
    });

    if (eventosDelDia.length === 0) {
        return '<div class="sin-eventos"><i class="fas fa-calendar-check"></i><p>No hay eventos para este día</p></div>';
    }

    // Resumen rápido
    var entregas = eventosDelDia.filter(function(e) { return e.tipo === 'entrega' || e.tipo === 'urgente'; }).length;
    var ausencias = eventosDelDia.filter(function(e) { return e.tipo === 'ausencia'; }).length;
    var otros = eventosDelDia.length - entregas - ausencias;

    var resumen = '<div class="eventos-dia-resumen">' +
        '<span class="resumen-badge">' + eventosDelDia.length + ' evento' + (eventosDelDia.length > 1 ? 's' : '') + '</span>';
    if (entregas > 0) resumen += '<span class="resumen-tag entrega">' + entregas + ' entrega' + (entregas > 1 ? 's' : '') + '</span>';
    if (ausencias > 0) resumen += '<span class="resumen-tag ausencia">' + ausencias + ' ausencia' + (ausencias > 1 ? 's' : '') + '</span>';
    if (otros > 0) resumen += '<span class="resumen-tag otro">' + otros + ' otro' + (otros > 1 ? 's' : '') + '</span>';
    resumen += '</div>';

    var items = eventosDelDia.map(function(e) {
        var tipoLabel = e.tipo === 'urgente' ? '⚡ Urgente' : e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1);
        // Build date range info
        var fechasHtml = '';
        if (e.fechaInicio && e.fechaFin) {
            var fi = new Date(e.fechaInicio);
            var ff = new Date(e.fechaFin);
            var fmtOpts = { day: '2-digit', month: 'short' };
            fechasHtml = '<span class="evento-fechas"><i class="fas fa-calendar-day"></i> ' +
                fi.toLocaleDateString('es-MX', fmtOpts) + ' → ' + ff.toLocaleDateString('es-MX', fmtOpts) + '</span>';
        }
        return '<div class="evento-item ' + S(e.tipo) + '">' +
            '<div class="evento-tipo-badge ' + S(e.tipo) + '">' + S(tipoLabel) + '</div>' +
            '<div class="evento-info">' +
                '<strong>' + S(e.titulo) + '</strong>' +
                '<span>' + S(e.descripcion || '') + '</span>' +
                fechasHtml +
                (e.prioridad ? '<span class="evento-prioridad">Prioridad: ' + S(e.prioridad) + '</span>' : '') +
            '</div>' +
            (e.tipo !== 'entrega' && e.tipo !== 'urgente' ? '<button class="btn-icon" onclick="eliminarEvento(\'' + S(e.id) + '\')" title="Eliminar"><i class="fas fa-trash"></i></button>' : '') +
        '</div>';
    }).join('');

    return resumen + items;
}

function renderProximasEntregas() {
    const pedidos = supervisoraState.pedidosHoy || [];
    const hoy = new Date();

    const proximasEntregas = pedidos
        .filter(p => p.fechaEntrega && new Date(p.fechaEntrega) >= hoy)
        .sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega))
        .slice(0, 5);

    if (proximasEntregas.length === 0) {
        return '<p class="sin-entregas">No hay entregas programadas</p>';
    }

    return proximasEntregas.map(p => {
        const fecha = new Date(p.fechaEntrega);
        const diasRestantes = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

        return `
            <div class="entrega-timeline-item ${diasRestantes <= 2 ? 'urgente' : ''}">
                <div class="timeline-fecha">
                    <span class="timeline-dia">${fecha.getDate()}</span>
                    <span class="timeline-mes">${getNombreMes(fecha.getMonth()).substring(0, 3)}</span>
                </div>
                <div class="timeline-linea"></div>
                <div class="timeline-content">
                    <span class="timeline-pedido">#${p.id} - ${p.clienteNombre || 'Cliente'}</span>
                    ${p.fechaCarga ? `<span class="timeline-fechas">Inicio: ${new Date(p.fechaCarga).toLocaleDateString('es-MX', {day:'2-digit',month:'short'})}</span>` : ''}
                    <span class="timeline-restante">${diasRestantes === 0 ? 'Hoy' : diasRestantes === 1 ? 'Manana' : `En ${diasRestantes} dias`}</span>
                </div>
            </div>
        `;
    }).join('');
}

function cambiarMes(delta) {
    cocoState.calendarioMes += delta;

    if (cocoState.calendarioMes > 11) {
        cocoState.calendarioMes = 0;
        cocoState.calendarioAnio++;
    } else if (cocoState.calendarioMes < 0) {
        cocoState.calendarioMes = 11;
        cocoState.calendarioAnio--;
    }

    renderCocoCalendario();
}

function irAHoy() {
    const hoy = new Date();
    cocoState.calendarioMes = hoy.getMonth();
    cocoState.calendarioAnio = hoy.getFullYear();
    cocoState.diaSeleccionado = hoy;
    renderCocoCalendario();
}

function seleccionarDia(anio, mes, dia) {
    cocoState.diaSeleccionado = new Date(anio, mes, dia);
    renderCocoCalendario();
}

function agregarEvento() {
    const operadores = supervisoraState.operadores || [];

    const content = `
        <div class="agregar-evento-form">
            <div class="form-group">
                <label>Tipo de Evento</label>
                <select id="eventoTipo" class="form-control" onchange="actualizarFormEvento()">
                    <option value="ausencia">Ausencia de Operadora</option>
                    <option value="mantenimiento">Mantenimiento de Maquina</option>
                    <option value="capacitacion">Capacitacion</option>
                    <option value="otro">Otro</option>
                </select>
            </div>

            <div class="form-group" id="eventoOperadoraGroup">
                <label>Operadora</label>
                <select id="eventoOperadora" class="form-control">
                    <option value="">-- Seleccionar --</option>
                    ${operadores.map(op =>
                        `<option value="${op.id}">${op.nombre}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="form-group" style="display:flex;gap:10px;">
                <div style="flex:1;">
                    <label>Fecha Inicio</label>
                    <input type="date" id="eventoFechaInicio" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div style="flex:1;">
                    <label>Fecha Fin</label>
                    <input type="date" id="eventoFechaFin" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                </div>
            </div>

            <div class="form-group">
                <label>Titulo</label>
                <input type="text" id="eventoTitulo" class="form-control" placeholder="Descripcion breve...">
            </div>

            <div class="form-group">
                <label>Descripcion</label>
                <textarea id="eventoDescripcion" class="form-control" rows="2" placeholder="Detalles adicionales..."></textarea>
            </div>
        </div>
    `;

    const footer = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="guardarEvento()">
            <i class="fas fa-save"></i> Guardar
        </button>
    `;

    openModal('Agregar Evento al Calendario', content, footer);
}

function actualizarFormEvento() {
    const tipo = document.getElementById('eventoTipo').value;
    const operadoraGroup = document.getElementById('eventoOperadoraGroup');

    if (tipo === 'ausencia' || tipo === 'capacitacion') {
        operadoraGroup.style.display = 'block';
    } else {
        operadoraGroup.style.display = 'none';
    }
}

function guardarEvento() {
    const tipo = document.getElementById('eventoTipo').value;
    const operadora = document.getElementById('eventoOperadora')?.value;
    const fechaInicio = document.getElementById('eventoFechaInicio').value;
    const fechaFin = document.getElementById('eventoFechaFin').value;
    const titulo = document.getElementById('eventoTitulo').value;
    const descripcion = document.getElementById('eventoDescripcion').value;

    if (!fechaInicio || !titulo) {
        showToast('Por favor completa los campos requeridos', 'warning');
        return;
    }

    if (fechaFin && fechaFin < fechaInicio) {
        showToast('La fecha fin no puede ser anterior a la fecha inicio', 'warning');
        return;
    }

    const evento = {
        id: 'evt-' + Date.now(),
        tipo: tipo,
        titulo: titulo,
        descripcion: descripcion,
        fecha: fechaFin || fechaInicio,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin || fechaInicio,
        operadoraId: operadora || null
    };

    // Guardar en localStorage
    const eventos = safeLocalGet('calendario_eventos', []);
    eventos.push(evento);
    localStorage.setItem('calendario_eventos', JSON.stringify(eventos));

    closeModal();
    showToast('Evento guardado correctamente', 'success');
    renderCocoCalendario();
}

function eliminarEvento(eventoId) {
    const eventos = safeLocalGet('calendario_eventos', []);
    const nuevosEventos = eventos.filter(e => e.id !== eventoId);
    localStorage.setItem('calendario_eventos', JSON.stringify(nuevosEventos));

    showToast('Evento eliminado', 'info');
    renderCocoCalendario();
}

// ========================================
// REPORTES DE COCO
// ========================================

// Estado para el tipo de reporte actual
if (typeof cocoState !== 'undefined') {
    cocoState.tipoReporte = cocoState.tipoReporte || 'operadoras';
}

function renderCocoReportes() {
    const container = document.querySelector('.coco-reportes-container');
    if (!container) return;

    const tipoReporte = cocoState.tipoReporte || 'operadoras';
    const periodoActual = cocoState.reportePeriodo;

    container.innerHTML = `
        <div class="coco-reportes">
            <div class="reportes-header">
                <h2><i class="fas fa-chart-bar"></i> Reportes y Análisis</h2>
                <div class="reportes-filtros">
                    <select class="form-control" onchange="cambiarPeriodoReporte(this.value)">
                        <option value="hoy" ${periodoActual === 'hoy' ? 'selected' : ''}>Hoy</option>
                        <option value="semana" ${periodoActual === 'semana' ? 'selected' : ''}>Esta Semana</option>
                        <option value="mes" ${periodoActual === 'mes' ? 'selected' : ''}>Este Mes</option>
                    </select>
                    <button class="btn btn-outline" onclick="exportarReporte()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>

            <!-- Pestañas de tipos de reporte -->
            <div class="reportes-tabs">
                <button class="tab-reporte ${tipoReporte === 'operadoras' ? 'active' : ''}" onclick="cambiarTipoReporte('operadoras')">
                    <i class="fas fa-users"></i> Por Operadora
                </button>
                <button class="tab-reporte ${tipoReporte === 'clientes' ? 'active' : ''}" onclick="cambiarTipoReporte('clientes')">
                    <i class="fas fa-building"></i> Por Cliente
                </button>
                <button class="tab-reporte ${tipoReporte === 'procesos' ? 'active' : ''}" onclick="cambiarTipoReporte('procesos')">
                    <i class="fas fa-cogs"></i> Por Proceso
                </button>
                <button class="tab-reporte ${tipoReporte === 'productos' ? 'active' : ''}" onclick="cambiarTipoReporte('productos')">
                    <i class="fas fa-box"></i> Por Producto
                </button>
                <button class="tab-reporte ${tipoReporte === 'pedidos' ? 'active' : ''}" onclick="cambiarTipoReporte('pedidos')">
                    <i class="fas fa-clipboard-list"></i> Por Pedido
                </button>
            </div>

            <!-- Contenido del reporte -->
            <div id="contenido-reporte-coco">
                ${renderContenidoReporte(tipoReporte)}
            </div>
        </div>
    `;
}

function cambiarTipoReporte(tipo) {
    cocoState.tipoReporte = tipo;
    renderCocoReportes();
}

function renderContenidoReporte(tipo) {
    switch(tipo) {
        case 'operadoras':
            return renderReporteOperadoras();
        case 'clientes':
            return renderReporteClientes();
        case 'procesos':
            return renderReporteProcesos();
        case 'productos':
            return renderReporteProductos();
        case 'pedidos':
            return renderReportePedidos();
        default:
            return renderReporteOperadoras();
    }
}

// Reporte por Operadoras (original)
function renderReporteOperadoras() {
    const todasOperadoras = getReporteOperadoras();
    const periodoActual = cocoState.reportePeriodo;
    const areaActual = cocoState.reporteAreaFiltro;
    const estadoActual = cocoState.reporteEstadoFiltro;
    const areas = getAreasDisponibles();

    let operadoras = filtrarOperadorasPorArea(todasOperadoras, areaActual);
    operadoras = filtrarOperadorasPorEstado(operadoras, estadoActual);

    return `
        <!-- Filtros adicionales -->
        <div class="filtros-secundarios">
            <select class="form-control" onchange="cambiarFiltroArea(this.value)">
                <option value="todas" ${areaActual === 'todas' ? 'selected' : ''}>Todas las Áreas</option>
                ${areas.map(a => `<option value="${a}" ${areaActual === a ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
            <select class="form-control" onchange="cambiarFiltroEstado(this.value)">
                <option value="todos" ${estadoActual === 'todos' ? 'selected' : ''}>Todos</option>
                <option value="activos" ${estadoActual === 'activos' ? 'selected' : ''}>Activos</option>
                <option value="inactivos" ${estadoActual === 'inactivos' ? 'selected' : ''}>Inactivos</option>
            </select>
            <span class="filtro-info">${operadoras.length} de ${todasOperadoras.length} operadoras</span>
        </div>

        <!-- Resumen General -->
        <div class="reporte-resumen">
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-cubes"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${calcularTotalPiezas(periodoActual).toLocaleString()}</span>
                    <span class="resumen-label">Piezas Totales</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-tachometer-alt"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${calcularPromedioEficiencia(periodoActual)}%</span>
                    <span class="resumen-label">Eficiencia Promedio</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-user-check"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${operadoras.filter(o => o.eficiencia >= 100).length}</span>
                    <span class="resumen-label">Superando Meta</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-medal"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${operadoras[0]?.nombre?.split(' ')[0] || '-'}</span>
                    <span class="resumen-label">Mejor del Periodo</span>
                </div>
            </div>
        </div>

        <!-- Gráfico de barras -->
        <div class="reporte-grafico">
            <h3>Producción por Operadora</h3>
            <div class="grafico-barras">
                ${operadoras.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-chart-bar" style="font-size: 2.5rem; margin-bottom: 10px; display: block; opacity: 0.4;"></i>
                        <p style="margin: 0;">No hay datos de producción</p>
                    </div>
                ` : operadoras.slice(0, 10).map(op => `
                    <div class="barra-container">
                        <div class="barra-label">${(op.nombre || 'NN').split(' ')[0]}</div>
                        <div class="barra-wrapper">
                            <div class="barra" style="width: ${operadoras[0]?.piezas > 0 ? ((op.piezas || 0) / operadoras[0].piezas) * 100 : 0}%">
                                <span class="barra-valor">${op.piezas || 0}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Tabla detallada -->
        <div class="reporte-tabla">
            <h3>Detalle por Operadora</h3>
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Ranking</th>
                        <th>Operadora</th>
                        <th>Estación</th>
                        <th>Piezas</th>
                        <th>Eficiencia</th>
                        <th>Tendencia</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${operadoras.length === 0 ? `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                                <p style="margin: 0;">No hay operadoras registradas</p>
                            </td>
                        </tr>
                    ` : operadoras.map((op, idx) => `
                        <tr class="${op.eficiencia < 70 ? 'bajo-rendimiento' : op.eficiencia >= 100 ? 'alto-rendimiento' : ''}">
                            <td><span class="ranking ${idx < 3 ? 'top' : ''}">${idx + 1}</span></td>
                            <td>
                                <div class="operadora-cell">
                                    <span class="op-avatar">${getIniciales(op.nombre || 'NN')}</span>
                                    <span class="op-nombre">${op.nombre || 'Sin nombre'}</span>
                                </div>
                            </td>
                            <td>${op.estacion || '-'}</td>
                            <td><strong>${(op.piezas || 0).toLocaleString()}</strong></td>
                            <td>
                                <span class="eficiencia-badge ${op.eficiencia >= 100 ? 'excelente' : op.eficiencia >= 80 ? 'buena' : 'baja'}">
                                    ${op.eficiencia || 0}%
                                </span>
                            </td>
                            <td>
                                <span class="tendencia ${op.tendencia > 0 ? 'positiva' : op.tendencia < 0 ? 'negativa' : ''}">
                                    <i class="fas fa-${op.tendencia > 0 ? 'arrow-up' : op.tendencia < 0 ? 'arrow-down' : 'minus'}"></i>
                                    ${Math.abs(op.tendencia || 0)}%
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon" onclick="verDetalleOperadora(${op.id})" title="Ver detalle">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Insights -->
        <div class="reporte-insights">
            <h3><i class="fas fa-lightbulb"></i> Insights</h3>
            <div class="insights-list">
                ${generarInsightsOperadoras(operadoras).map(insight => `
                    <div class="insight-card ${insight.tipo}">
                        <i class="fas ${insight.icono}"></i>
                        <p>${insight.mensaje}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Reporte por Clientes
function renderReporteClientes() {
    const clientes = typeof db !== 'undefined' ? db.getClientes() : [];
    const pedidos = typeof db !== 'undefined' ? db.getPedidos() : [];
    const productos = typeof db !== 'undefined' ? db.getProductos() : [];
    const historial = getHistorialProduccion();

    // Agrupar producción por cliente
    const resumenClientes = clientes.map(cliente => {
        const pedidosCliente = pedidos.filter(p => p.clienteId === cliente.id);
        let totalPiezas = 0;
        let totalPedidos = pedidosCliente.length;
        let productosMap = {};

        pedidosCliente.forEach(pedido => {
            (pedido.productos || []).forEach(prod => {
                totalPiezas += prod.cantidad || 0;
                const producto = productos.find(p => p.id === prod.productoId);
                if (producto) {
                    if (!productosMap[producto.id]) {
                        productosMap[producto.id] = { nombre: producto.nombre, cantidad: 0 };
                    }
                    productosMap[producto.id].cantidad += prod.cantidad || 0;
                }
            });
        });

        return {
            ...cliente,
            totalPedidos,
            totalPiezas,
            productos: Object.values(productosMap).sort((a, b) => b.cantidad - a.cantidad)
        };
    }).filter(c => c.totalPedidos > 0).sort((a, b) => b.totalPiezas - a.totalPiezas);

    const totalGeneral = resumenClientes.reduce((sum, c) => sum + c.totalPiezas, 0);

    return `
        <!-- Resumen -->
        <div class="reporte-resumen">
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-building"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${resumenClientes.length}</span>
                    <span class="resumen-label">Clientes Activos</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-clipboard-list"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${resumenClientes.reduce((sum, c) => sum + c.totalPedidos, 0)}</span>
                    <span class="resumen-label">Pedidos Totales</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-cubes"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${totalGeneral.toLocaleString()}</span>
                    <span class="resumen-label">Piezas Totales</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-star"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${resumenClientes[0]?.nombreComercial?.split(' ')[0] || '-'}</span>
                    <span class="resumen-label">Cliente Principal</span>
                </div>
            </div>
        </div>

        <!-- Gráfico de clientes -->
        <div class="reporte-grafico">
            <h3>Producción por Cliente</h3>
            <div class="grafico-barras">
                ${resumenClientes.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-building" style="font-size: 2.5rem; margin-bottom: 10px; display: block; opacity: 0.4;"></i>
                        <p style="margin: 0;">No hay datos de clientes</p>
                    </div>
                ` : resumenClientes.slice(0, 8).map(cliente => `
                    <div class="barra-container">
                        <div class="barra-label">${(cliente.nombreComercial || 'N/A').substring(0, 12)}</div>
                        <div class="barra-wrapper">
                            <div class="barra barra-cliente" style="width: ${totalGeneral > 0 ? (cliente.totalPiezas / resumenClientes[0].totalPiezas) * 100 : 0}%">
                                <span class="barra-valor">${cliente.totalPiezas.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Detalle por cliente -->
        <div class="reporte-tabla">
            <h3>Detalle por Cliente</h3>
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Cliente</th>
                        <th>Tipo</th>
                        <th>Pedidos</th>
                        <th>Piezas</th>
                        <th>% Total</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${resumenClientes.length === 0 ? `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <p style="margin: 0;">No hay clientes con pedidos</p>
                            </td>
                        </tr>
                    ` : resumenClientes.map((cliente, idx) => `
                        <tr>
                            <td><span class="ranking ${idx < 3 ? 'top' : ''}">${idx + 1}</span></td>
                            <td><strong>${cliente.nombreComercial || 'N/A'}</strong></td>
                            <td>
                                <span class="tipo-badge ${cliente.tipo === 'estrategico' ? 'estrategico' : ''}">${cliente.tipo || 'Regular'}</span>
                            </td>
                            <td>${cliente.totalPedidos}</td>
                            <td><strong>${cliente.totalPiezas.toLocaleString()}</strong></td>
                            <td>${totalGeneral > 0 ? Math.round((cliente.totalPiezas / totalGeneral) * 100) : 0}%</td>
                            <td>
                                <button class="btn-icon" onclick="verDetalleCliente(${cliente.id})" title="Ver detalle">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Ver detalle de cliente
function verDetalleCliente(clienteId) {
    const cliente = typeof db !== 'undefined' ? db.getCliente(clienteId) : null;
    if (!cliente) return;

    const pedidos = typeof db !== 'undefined' ? db.getPedidos().filter(p => p.clienteId === clienteId) : [];
    const productos = typeof db !== 'undefined' ? db.getProductos() : [];
    const personal = typeof db !== 'undefined' ? db.getPersonal() : [];

    // Obtener IDs de pedidos del cliente
    const pedidoIds = pedidos.map(p => p.id);

    // Obtener historial de producción para estos pedidos
    const historial = getHistorialProduccion().filter(h =>
        pedidoIds.includes(h.pedidoId) || pedidoIds.some(id => id == h.pedidoId)
    );

    // Enriquecer historial
    const historialEnriquecido = historial.map(h => {
        let operadorNombre = h.operadoraNombre || h.operadorNombre || '';
        if (!operadorNombre && (h.operadoraId || h.operadorId)) {
            const op = personal.find(p => p.id == h.operadoraId || p.id == h.operadorId);
            operadorNombre = op ? op.nombre : '';
        }
        const procesoNombre = h.procesoNombre || h.proceso || h.tipoProceso || h.nombreProceso || '';
        return { ...h, operadorNombre, procesoNombre };
    });

    let productosMap = {};
    pedidos.forEach(pedido => {
        (pedido.productos || []).forEach(prod => {
            const producto = productos.find(p => p.id === prod.productoId);
            if (producto) {
                if (!productosMap[producto.id]) {
                    productosMap[producto.id] = { nombre: producto.nombre, cantidad: 0, pedidos: 0 };
                }
                productosMap[producto.id].cantidad += prod.cantidad || 0;
                productosMap[producto.id].pedidos++;
            }
        });
    });

    const productosCliente = Object.values(productosMap).sort((a, b) => b.cantidad - a.cantidad);
    const totalProducido = historial.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

    const content = `
        <div class="detalle-cliente">
            <div class="detalle-cliente-header">
                <h3>${cliente.nombreComercial}</h3>
                <span class="tipo-badge ${cliente.tipo === 'estrategico' ? 'estrategico' : ''}">${cliente.tipo || 'Regular'}</span>
            </div>

            <div class="detalle-op-stats" style="margin: 20px 0;">
                <div class="stat-item">
                    <span class="stat-label">Pedidos</span>
                    <span class="stat-value">${pedidos.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Productos</span>
                    <span class="stat-value">${productosCliente.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Producido</span>
                    <span class="stat-value">${totalProducido.toLocaleString()}</span>
                </div>
            </div>

            <!-- Productos solicitados -->
            <div class="detalle-op-historial" style="margin-bottom: 15px;">
                <h4>Productos Solicitados</h4>
                ${productosCliente.length === 0 ?
                    '<p style="text-align: center; color: #94a3b8; padding: 15px;">Sin productos registrados</p>'
                    : productosCliente.slice(0, 5).map(p => `
                    <div class="historial-item" style="display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="color: #e5e7eb;">${p.nombre}</span>
                        <span style="color: #10b981; font-weight: 600;">${p.cantidad.toLocaleString()} pzas</span>
                    </div>
                `).join('')}
            </div>

            <!-- Historial de producción -->
            <div class="detalle-op-historial">
                <h4>Últimos Registros de Producción</h4>
                ${historialEnriquecido.length === 0 ?
                    '<p style="text-align: center; color: #94a3b8; padding: 15px;">Sin registros de producción</p>'
                    : `
                    <div class="historial-header" style="display: grid; grid-template-columns: 80px 50px 1fr 1fr; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #3d4a5c; margin-bottom: 5px;">
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Fecha</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Pzas</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Operador</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Proceso</span>
                    </div>
                    ${historialEnriquecido.slice(0, 10).map(h => `
                    <div style="display: grid; grid-template-columns: 80px 50px 1fr 1fr; gap: 8px; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;">
                        <span style="color: #94a3b8; font-size: 0.75rem;">${formatearFecha(h.fecha)}</span>
                        <span style="color: #10b981; font-weight: 600; font-size: 0.8rem;">${h.cantidad || h.piezas || 0}</span>
                        <span style="color: #38bdf8; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${h.operadorNombre ? h.operadorNombre.split(' ')[0] : '-'}</span>
                        <span style="color: #fbbf24; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${h.procesoNombre || '-'}</span>
                    </div>
                `).join('')}
                `}
            </div>
        </div>
    `;

    openModal(`Cliente: ${cliente.nombreComercial}`, content, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

// Reporte por Procesos
function renderReporteProcesos() {
    const historial = getHistorialProduccion();
    const asignaciones = safeLocalGet('asignaciones_estaciones', {});
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});

    // Agrupar por proceso
    const procesosMap = {};

    // Desde historial
    historial.forEach(h => {
        const proceso = h.proceso || h.tipoProceso || 'Sin proceso';
        if (!procesosMap[proceso]) {
            procesosMap[proceso] = { nombre: proceso, piezas: 0, registros: 0, operadores: new Set() };
        }
        procesosMap[proceso].piezas += h.cantidad || h.piezas || 0;
        procesosMap[proceso].registros++;
        if (h.operadoraId || h.operadorId) {
            procesosMap[proceso].operadores.add(h.operadoraId || h.operadorId);
        }
    });

    // Desde asignaciones actuales
    Object.values(asignaciones).forEach(asig => {
        const proceso = asig.procesoActual || asig.proceso || 'Sin proceso';
        if (!procesosMap[proceso]) {
            procesosMap[proceso] = { nombre: proceso, piezas: 0, registros: 0, operadores: new Set() };
        }
        procesosMap[proceso].piezas += asig.piezasProducidas || 0;
    });

    const procesos = Object.values(procesosMap)
        .map(p => ({ ...p, operadores: p.operadores.size }))
        .sort((a, b) => b.piezas - a.piezas);

    const totalPiezas = procesos.reduce((sum, p) => sum + p.piezas, 0);

    return `
        <!-- Resumen -->
        <div class="reporte-resumen">
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-cogs"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${procesos.length}</span>
                    <span class="resumen-label">Procesos Activos</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-cubes"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${totalPiezas.toLocaleString()}</span>
                    <span class="resumen-label">Piezas Totales</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-trophy"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${procesos[0]?.nombre?.substring(0, 10) || '-'}</span>
                    <span class="resumen-label">Proceso Líder</span>
                </div>
            </div>
        </div>

        <!-- Gráfico -->
        <div class="reporte-grafico">
            <h3>Producción por Proceso</h3>
            <div class="grafico-barras">
                ${procesos.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-cogs" style="font-size: 2.5rem; margin-bottom: 10px; display: block; opacity: 0.4;"></i>
                        <p style="margin: 0;">No hay datos de procesos</p>
                    </div>
                ` : procesos.slice(0, 10).map(proceso => `
                    <div class="barra-container">
                        <div class="barra-label">${proceso.nombre.substring(0, 12)}</div>
                        <div class="barra-wrapper">
                            <div class="barra barra-proceso" style="width: ${procesos[0]?.piezas > 0 ? (proceso.piezas / procesos[0].piezas) * 100 : 0}%">
                                <span class="barra-valor">${proceso.piezas.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Tabla -->
        <div class="reporte-tabla">
            <h3>Detalle por Proceso</h3>
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Proceso</th>
                        <th>Piezas</th>
                        <th>Registros</th>
                        <th>Operadores</th>
                        <th>% Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${procesos.length === 0 ? `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <p style="margin: 0;">No hay procesos registrados</p>
                            </td>
                        </tr>
                    ` : procesos.map((proceso, idx) => `
                        <tr>
                            <td><span class="ranking ${idx < 3 ? 'top' : ''}">${idx + 1}</span></td>
                            <td><strong>${proceso.nombre}</strong></td>
                            <td><strong>${proceso.piezas.toLocaleString()}</strong></td>
                            <td>${proceso.registros}</td>
                            <td>${proceso.operadores}</td>
                            <td>${totalPiezas > 0 ? Math.round((proceso.piezas / totalPiezas) * 100) : 0}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Reporte por Productos
function renderReporteProductos() {
    const productos = typeof db !== 'undefined' ? db.getProductos() : [];
    const clientes = typeof db !== 'undefined' ? db.getClientes() : [];
    const historial = getHistorialProduccion();
    const asignaciones = safeLocalGet('asignaciones_estaciones', {});

    // Agrupar producción por producto
    const productosMap = {};

    historial.forEach(h => {
        const prodId = h.productoId;
        if (prodId) {
            if (!productosMap[prodId]) {
                const prod = productos.find(p => p.id === prodId);
                productosMap[prodId] = {
                    id: prodId,
                    nombre: prod?.nombre || 'Producto ' + prodId,
                    cliente: clientes.find(c => c.id === prod?.clienteId)?.nombreComercial || 'N/A',
                    piezas: 0,
                    registros: 0
                };
            }
            productosMap[prodId].piezas += h.cantidad || h.piezas || 0;
            productosMap[prodId].registros++;
        }
    });

    // Desde asignaciones
    Object.values(asignaciones).forEach(asig => {
        const prodId = asig.productoId;
        if (prodId) {
            if (!productosMap[prodId]) {
                const prod = productos.find(p => p.id === prodId);
                productosMap[prodId] = {
                    id: prodId,
                    nombre: prod?.nombre || 'Producto ' + prodId,
                    cliente: clientes.find(c => c.id === prod?.clienteId)?.nombreComercial || 'N/A',
                    piezas: 0,
                    registros: 0
                };
            }
            productosMap[prodId].piezas += asig.piezasProducidas || 0;
        }
    });

    const productosArr = Object.values(productosMap).sort((a, b) => b.piezas - a.piezas);
    const totalPiezas = productosArr.reduce((sum, p) => sum + p.piezas, 0);

    return `
        <!-- Resumen -->
        <div class="reporte-resumen">
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-box"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${productosArr.length}</span>
                    <span class="resumen-label">Productos en Producción</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-cubes"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${totalPiezas.toLocaleString()}</span>
                    <span class="resumen-label">Piezas Totales</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-crown"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${productosArr[0]?.nombre?.substring(0, 10) || '-'}</span>
                    <span class="resumen-label">Producto Líder</span>
                </div>
            </div>
        </div>

        <!-- Gráfico -->
        <div class="reporte-grafico">
            <h3>Producción por Producto</h3>
            <div class="grafico-barras">
                ${productosArr.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #94a3b8;">
                        <i class="fas fa-box" style="font-size: 2.5rem; margin-bottom: 10px; display: block; opacity: 0.4;"></i>
                        <p style="margin: 0;">No hay datos de productos</p>
                    </div>
                ` : productosArr.slice(0, 8).map(prod => `
                    <div class="barra-container">
                        <div class="barra-label">${prod.nombre.substring(0, 12)}</div>
                        <div class="barra-wrapper">
                            <div class="barra barra-producto" style="width: ${productosArr[0]?.piezas > 0 ? (prod.piezas / productosArr[0].piezas) * 100 : 0}%">
                                <span class="barra-valor">${prod.piezas.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Tabla -->
        <div class="reporte-tabla">
            <h3>Detalle por Producto</h3>
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Producto</th>
                        <th>Cliente</th>
                        <th>Piezas</th>
                        <th>Registros</th>
                        <th>% Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productosArr.length === 0 ? `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <p style="margin: 0;">No hay productos en producción</p>
                            </td>
                        </tr>
                    ` : productosArr.map((prod, idx) => `
                        <tr>
                            <td><span class="ranking ${idx < 3 ? 'top' : ''}">${idx + 1}</span></td>
                            <td><strong>${prod.nombre}</strong></td>
                            <td>${prod.cliente}</td>
                            <td><strong>${prod.piezas.toLocaleString()}</strong></td>
                            <td>${prod.registros}</td>
                            <td>${totalPiezas > 0 ? Math.round((prod.piezas / totalPiezas) * 100) : 0}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Reporte por Pedidos
function renderReportePedidos() {
    const pedidos = typeof db !== 'undefined' ? db.getPedidos() : [];
    const pedidosActivos = safeLocalGet('pedidos_activos', []);
    const clientes = typeof db !== 'undefined' ? db.getClientes() : [];
    const historial = getHistorialProduccion();

    // Combinar pedidos
    const todosPedidos = [...pedidos, ...pedidosActivos.filter(pa => !pedidos.find(p => p.id === pa.id))];

    // Agrupar producción por pedido
    const pedidosConProduccion = todosPedidos.map(pedido => {
        const cliente = clientes.find(c => c.id === pedido.clienteId);
        const produccionPedido = historial.filter(h => h.pedidoId === pedido.id || h.pedidoId == pedido.id);
        const piezasProducidas = produccionPedido.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);
        const piezasTotal = (pedido.productos || []).reduce((sum, p) => sum + (p.cantidad || 0), 0);
        const progreso = piezasTotal > 0 ? Math.round((piezasProducidas / piezasTotal) * 100) : 0;

        return {
            ...pedido,
            clienteNombre: cliente?.nombreComercial || 'N/A',
            piezasProducidas,
            piezasTotal,
            progreso: Math.min(progreso, 100)
        };
    }).filter(p => p.piezasTotal > 0).sort((a, b) => b.piezasProducidas - a.piezasProducidas);

    const totalProducido = pedidosConProduccion.reduce((sum, p) => sum + p.piezasProducidas, 0);
    const totalMeta = pedidosConProduccion.reduce((sum, p) => sum + p.piezasTotal, 0);

    return `
        <!-- Resumen -->
        <div class="reporte-resumen">
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-clipboard-list"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${pedidosConProduccion.length}</span>
                    <span class="resumen-label">Pedidos Activos</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-cubes"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${totalProducido.toLocaleString()}</span>
                    <span class="resumen-label">Piezas Producidas</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-bullseye"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${totalMeta.toLocaleString()}</span>
                    <span class="resumen-label">Meta Total</span>
                </div>
            </div>
            <div class="resumen-card">
                <div class="resumen-icon"><i class="fas fa-percentage"></i></div>
                <div class="resumen-data">
                    <span class="resumen-value">${totalMeta > 0 ? Math.round((totalProducido / totalMeta) * 100) : 0}%</span>
                    <span class="resumen-label">Avance General</span>
                </div>
            </div>
        </div>

        <!-- Tabla de pedidos -->
        <div class="reporte-tabla">
            <h3>Estado de Pedidos</h3>
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Pedido</th>
                        <th>Cliente</th>
                        <th>Producido</th>
                        <th>Meta</th>
                        <th>Progreso</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${pedidosConProduccion.length === 0 ? `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                                <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                                <p style="margin: 0;">No hay pedidos en producción</p>
                            </td>
                        </tr>
                    ` : pedidosConProduccion.slice(0, 20).map(pedido => `
                        <tr>
                            <td><strong>#${pedido.id}</strong></td>
                            <td>${pedido.clienteNombre}</td>
                            <td>${pedido.piezasProducidas.toLocaleString()}</td>
                            <td>${pedido.piezasTotal.toLocaleString()}</td>
                            <td>
                                <div class="progress-mini">
                                    <div class="progress-bar-mini ${pedido.progreso >= 100 ? 'completado' : pedido.progreso >= 50 ? 'avanzado' : ''}" style="width: ${pedido.progreso}%"></div>
                                </div>
                                <span class="progress-text">${pedido.progreso}%</span>
                            </td>
                            <td>
                                <span class="estado-badge ${pedido.progreso >= 100 ? 'completado' : pedido.progreso > 0 ? 'en-proceso' : 'pendiente'}">
                                    ${pedido.progreso >= 100 ? 'Completado' : pedido.progreso > 0 ? 'En Proceso' : 'Pendiente'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon" onclick="verDetallePedido(${pedido.id})" title="Ver detalle">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Ver detalle de pedido
function verDetallePedido(pedidoId) {
    const pedidos = typeof db !== 'undefined' ? db.getPedidos() : [];
    const pedidosActivos = safeLocalGet('pedidos_activos', []);
    const pedido = pedidos.find(p => p.id === pedidoId) || pedidosActivos.find(p => p.id === pedidoId);

    if (!pedido) return;

    const cliente = typeof db !== 'undefined' ? db.getCliente(pedido.clienteId) : null;
    const productos = typeof db !== 'undefined' ? db.getProductos() : [];
    const personal = typeof db !== 'undefined' ? db.getPersonal() : [];
    const historial = getHistorialProduccion().filter(h => h.pedidoId === pedidoId || h.pedidoId == pedidoId);

    const totalProducido = historial.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);
    const totalMeta = (pedido.productos || []).reduce((sum, p) => sum + (p.cantidad || 0), 0);

    // Enriquecer historial con nombre de operador
    const historialEnriquecido = historial.map(h => {
        let operadorNombre = h.operadoraNombre || h.operadorNombre || '';
        if (!operadorNombre && (h.operadoraId || h.operadorId)) {
            const op = personal.find(p => p.id == h.operadoraId || p.id == h.operadorId);
            operadorNombre = op ? op.nombre : '';
        }
        const procesoNombre = h.procesoNombre || h.proceso || h.tipoProceso || h.nombreProceso || '';
        return { ...h, operadorNombre, procesoNombre };
    });

    const content = `
        <div class="detalle-pedido">
            <div class="detalle-pedido-header">
                <h3>Pedido #${pedido.id}</h3>
                <span class="cliente-nombre">${cliente?.nombreComercial || 'N/A'}</span>
            </div>

            <div class="detalle-op-stats" style="margin: 20px 0;">
                <div class="stat-item">
                    <span class="stat-label">Cliente</span>
                    <span class="stat-value" style="font-size: 1rem;">${cliente?.nombreComercial?.substring(0, 12) || 'N/A'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Producido</span>
                    <span class="stat-value">${totalProducido.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Meta</span>
                    <span class="stat-value">${totalMeta.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Progreso</span>
                    <span class="stat-value">${totalMeta > 0 ? Math.round((totalProducido / totalMeta) * 100) : 0}%</span>
                </div>
            </div>

            <div class="detalle-op-historial">
                <h4>Registros de Producción</h4>
                ${historialEnriquecido.length === 0 ?
                    '<p style="text-align: center; color: #94a3b8; padding: 20px;">Sin registros de producción</p>'
                    : `
                    <div class="historial-header" style="display: grid; grid-template-columns: 80px 55px 1fr 1fr; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #3d4a5c; margin-bottom: 5px;">
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Fecha</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Pzas</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Operador</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Proceso</span>
                    </div>
                    ${historialEnriquecido.slice(0, 15).map(h => `
                    <div class="historial-item-detallado" style="display: grid; grid-template-columns: 80px 55px 1fr 1fr; gap: 8px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;">
                        <span class="fecha" style="color: #94a3b8; font-size: 0.75rem;">${formatearFecha(h.fecha)}</span>
                        <span class="piezas" style="color: #10b981; font-weight: 600; background: rgba(16, 185, 129, 0.1); padding: 3px 6px; border-radius: 12px; text-align: center; font-size: 0.8rem;">${h.cantidad || h.piezas || 0}</span>
                        <span class="operador" style="color: #38bdf8; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${h.operadorNombre || ''}">${h.operadorNombre ? h.operadorNombre.split(' ')[0] : '-'}</span>
                        <span class="proceso" style="color: #fbbf24; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;" title="${h.procesoNombre || ''}">${h.procesoNombre || '-'}</span>
                    </div>
                `).join('')}
                `}
            </div>
        </div>
    `;

    openModal(`Pedido #${pedido.id}`, content, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function getReporteOperadoras() {
    const historial = getHistorialProduccion();

    // Obtener operadores de múltiples fuentes
    let operadores = supervisoraState.operadores || [];

    // Si no hay operadores en state, intentar obtener de la base de datos
    if (operadores.length === 0 && typeof db !== 'undefined') {
        try {
            const personal = db.getPersonal();
            operadores = personal.filter(p => p.rol === 'operador' && p.activo !== false);
        } catch (e) {
            DEBUG_MODE && console.warn('[COCO] Error obteniendo personal:', e);
        }
    }

    // Obtener datos de estado_maquinas y asignaciones para piezas actuales
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
    const asignaciones = safeLocalGet('asignaciones_estaciones', {});
    const estaciones = typeof db !== 'undefined' ? db.getEstaciones() : [];

    const operadoras = [];

    operadores.forEach(op => {
        // Buscar estación asignada a este operador
        const estacionOp = estaciones.find(e => e.operadorId === op.id);
        const estacionId = estacionOp?.id || null;

        // Obtener piezas de hoy desde estado_maquinas
        let piezasHoy = 0;
        if (estacionId && estadoMaquinas[estacionId]) {
            piezasHoy = estadoMaquinas[estacionId].piezasHoy || 0;
        }

        // También buscar en supervisoraState.maquinas
        if (piezasHoy === 0) {
            const maquina = Object.entries(supervisoraState.maquinas || {}).find(([id, m]) =>
                m.operadores && m.operadores.some(o => o.id === op.id)
            );
            if (maquina) {
                piezasHoy = maquina[1].piezasHoy || 0;
            }
        }

        // Buscar en historial de producción del día
        const hoy = new Date().toISOString().split('T')[0];
        const historialHoy = historial.filter(h => {
            const esDeOperador = h.operadoraId == op.id || h.operadorId == op.id ||
                                (h.estacionId && estacionId && h.estacionId === estacionId);
            const esDeHoy = h.fecha && h.fecha.startsWith(hoy);
            return esDeOperador && esDeHoy;
        });

        // Sumar piezas del historial si no hay en estado_maquinas
        if (piezasHoy === 0 && historialHoy.length > 0) {
            piezasHoy = historialHoy.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);
        }

        // Datos históricos completos para estadísticas
        const datosHistoricos = historial.filter(h =>
            h.operadoraId == op.id || h.operadorId == op.id ||
            (h.estacionId && estacionId && h.estacionId === estacionId)
        );

        const piezasSemana = datosHistoricos.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

        operadoras.push({
            id: op.id,
            nombre: op.nombre,
            estacion: estacionId || (estacionOp?.nombre) || '-',
            piezas: piezasHoy,
            piezasSemana: piezasSemana,
            eficiencia: calcularEficienciaOperadora(op.id),
            tendencia: calcularTendenciaOperadora(op.id),
            procesosCompletados: datosHistoricos.filter(h => h.tipo === 'completado' || h.tipo === 'proceso_completado').length
        });
    });

    return operadoras.sort((a, b) => b.piezas - a.piezas);
}

function calcularTendenciaOperadora(operadorId) {
    const historial = getHistorialProduccion();
    const registros = historial.filter(h => h.operadoraId == operadorId || h.operadorId == operadorId);

    if (registros.length < 2) return 0;

    // Comparar ultima semana con semana anterior
    const hace7dias = new Date();
    hace7dias.setDate(hace7dias.getDate() - 7);
    const hace14dias = new Date();
    hace14dias.setDate(hace14dias.getDate() - 14);

    const semanaActual = registros.filter(r => r.fecha && new Date(r.fecha) >= hace7dias);
    const semanaAnterior = registros.filter(r => r.fecha && new Date(r.fecha) >= hace14dias && new Date(r.fecha) < hace7dias);

    const promedioActual = semanaActual.length > 0 ?
        semanaActual.reduce((sum, r) => sum + (r.cantidad || r.piezas || 0), 0) / semanaActual.length : 0;
    const promedioAnterior = semanaAnterior.length > 0 ?
        semanaAnterior.reduce((sum, r) => sum + (r.cantidad || r.piezas || 0), 0) / semanaAnterior.length : 0;

    if (promedioAnterior === 0) return 0;
    return Math.round(((promedioActual - promedioAnterior) / promedioAnterior) * 100);
}

function calcularTotalPiezas(periodo) {
    const maquinas = Object.values(supervisoraState.maquinas || {});
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
    const historial = getHistorialProduccion();

    // Piezas de hoy desde estado_maquinas (más actualizado)
    let piezasHoyEstado = Object.values(estadoMaquinas).reduce((sum, m) => sum + (m.piezasHoy || 0), 0);

    // Si no hay en estado_maquinas, usar supervisoraState.maquinas
    if (piezasHoyEstado === 0) {
        piezasHoyEstado = maquinas.reduce((sum, m) => sum + (m.piezasHoy || 0), 0);
    }

    // Si aún no hay, calcular del historial de hoy
    const hoy = new Date().toISOString().split('T')[0];
    if (piezasHoyEstado === 0) {
        piezasHoyEstado = historial
            .filter(h => h.fecha && h.fecha.startsWith(hoy))
            .reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);
    }

    if (periodo === 'hoy') {
        return piezasHoyEstado;
    }

    const fechaInicio = new Date();
    fechaInicio.setHours(0, 0, 0, 0);

    if (periodo === 'semana') {
        fechaInicio.setDate(fechaInicio.getDate() - 7);
    } else if (periodo === 'mes') {
        fechaInicio.setMonth(fechaInicio.getMonth() - 1);
    }

    const piezasHistorial = historial
        .filter(h => h.fecha && new Date(h.fecha) >= fechaInicio)
        .reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

    return piezasHistorial;
}

function calcularPromedioEficiencia(periodo) {
    const operadoras = getReporteOperadoras();
    if (operadoras.length === 0) return 0;

    const total = operadoras.reduce((sum, o) => sum + o.eficiencia, 0);
    return Math.round(total / operadoras.length);
}

function generarInsightsOperadoras(operadoras) {
    const insights = [];

    // Mejor operadora
    if (operadoras.length > 0 && operadoras[0].eficiencia >= 100) {
        insights.push({
            tipo: 'success',
            icono: 'fa-star',
            mensaje: `<strong>${operadoras[0].nombre}</strong> esta destacando con ${operadoras[0].eficiencia}% de eficiencia. ¡Considera reconocer su esfuerzo!`
        });
    }

    // Operadoras que necesitan atencion
    const bajoRendimiento = operadoras.filter(o => o.eficiencia < 70);
    if (bajoRendimiento.length > 0) {
        insights.push({
            tipo: 'warning',
            icono: 'fa-exclamation-circle',
            mensaje: `${bajoRendimiento.length} operadora${bajoRendimiento.length > 1 ? 's' : ''} con rendimiento bajo el 70%. Podria ser buen momento para capacitacion o revisar asignaciones.`
        });
    }

    // Tendencia general
    const tendenciaPositiva = operadoras.filter(o => o.tendencia > 0).length;
    if (operadoras.length > 0 && tendenciaPositiva > operadoras.length / 2) {
        insights.push({
            tipo: 'info',
            icono: 'fa-chart-line',
            mensaje: `El ${Math.round((tendenciaPositiva / operadoras.length) * 100)}% del equipo muestra tendencia positiva. ¡Buen trabajo liderando, Coco!`
        });
    }

    // Si no hay insights
    if (insights.length === 0) {
        insights.push({
            tipo: 'info',
            icono: 'fa-info-circle',
            mensaje: 'Acumula mas datos de produccion para obtener insights personalizados sobre tu equipo.'
        });
    }

    return insights;
}

function cambiarPeriodoReporte(periodo) {
    cocoState.reportePeriodo = periodo;
    renderCocoReportes();
}

function verDetalleOperadora(operadorId) {
    // Buscar operador en múltiples fuentes
    let operador = supervisoraState.operadores?.find(o => o.id === operadorId || o.id == operadorId);

    // Si no está en state, buscar en la base de datos
    if (!operador && typeof db !== 'undefined') {
        try {
            const personal = db.getPersonal();
            operador = personal.find(p => p.id === operadorId || p.id == operadorId);
        } catch (e) {
            DEBUG_MODE && console.warn('[COCO] Error buscando operador:', e);
        }
    }

    // Si aún no hay, buscar en getReporteOperadoras (ya procesado)
    if (!operador) {
        const reporteOps = getReporteOperadoras();
        operador = reporteOps.find(o => o.id === operadorId || o.id == operadorId);
    }

    if (!operador) {
        DEBUG_MODE && console.warn('[COCO] Operador no encontrado:', operadorId);
        openModal('Error', '<p style="text-align:center; padding: 20px;">No se encontró información del operador</p>', '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
        return;
    }

    // Obtener historial con búsqueda flexible (operadorId u operadoraId)
    const historial = getHistorialProduccion().filter(h =>
        h.operadorId == operadorId || h.operadoraId == operadorId
    );

    // Obtener datos de estado_maquinas para info en tiempo real
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
    const asignaciones = safeLocalGet('asignaciones_estaciones', {});

    // Obtener productos, pedidos y clientes para referencias
    const productos = typeof db !== 'undefined' ? db.getProductos() : [];
    const pedidos = typeof db !== 'undefined' ? db.getPedidos() : [];
    const clientes = typeof db !== 'undefined' ? db.getClientes() : [];
    const pedidosActivos = safeLocalGet('pedidos_activos', []);
    const todosPedidos = [...pedidos, ...pedidosActivos];

    // Buscar estación actual del operador
    let estacionActual = null;
    let piezasHoy = 0;
    let procesoActual = null;
    let pedidoActual = null;
    let productoActual = null;

    Object.entries(estadoMaquinas).forEach(([estId, estado]) => {
        if (estado.operadoraId == operadorId || estado.operadorId == operadorId) {
            estacionActual = estId;
            piezasHoy = estado.piezasHoy || 0;
            // Buscar nombre de proceso en múltiples campos
            procesoActual = estado.procesoNombre || estado.procesoActual || estado.proceso || estado.nombreProceso;
        }
    });

    // También buscar en asignaciones
    Object.entries(asignaciones).forEach(([estId, asig]) => {
        if (asig.operadoraId == operadorId || asig.operadorId == operadorId) {
            if (!estacionActual) estacionActual = estId;
            if (!piezasHoy && asig.piezasProducidas) piezasHoy = asig.piezasProducidas;
            if (!procesoActual) procesoActual = asig.procesoNombre || asig.procesoActual || asig.proceso || asig.nombreProceso;
            if (asig.pedidoId) {
                const ped = todosPedidos.find(p => p.id == asig.pedidoId);
                if (ped) pedidoActual = ped;
            }
            if (asig.productoId) {
                const prod = productos.find(p => p.id == asig.productoId);
                if (prod) productoActual = prod;
            }
        }
    });

    const eficiencia = calcularEficienciaOperadora(operadorId);
    const tendencia = calcularTendenciaOperadora(operadorId);

    // Calcular total de piezas del historial
    const totalPiezasHistorial = historial.reduce((sum, h) => sum + (h.cantidad || h.piezas || 0), 0);

    // Enriquecer historial con info de pedido, producto y cliente
    const historialEnriquecido = historial.map(h => {
        let pedidoInfo = '';
        let productoInfo = '';
        let clienteInfo = '';
        // Buscar nombre de proceso en múltiples campos posibles
        let procesoInfo = h.procesoNombre || h.proceso || h.tipoProceso || h.nombreProceso || '';

        if (h.pedidoId || h.pedidoCodigo) {
            const ped = todosPedidos.find(p => p.id == h.pedidoId);
            pedidoInfo = h.pedidoCodigo || (ped ? `#${ped.id}` : `#${h.pedidoId}`);

            // Obtener cliente del pedido
            if (ped && ped.clienteId) {
                const cliente = clientes.find(c => c.id == ped.clienteId);
                clienteInfo = cliente ? cliente.nombreComercial : '';
            }
        }

        if (h.productoId) {
            const prod = productos.find(p => p.id == h.productoId);
            if (prod) {
                productoInfo = prod.nombre;
                // Si no hay cliente, intentar obtenerlo del producto
                if (!clienteInfo && prod.clienteId) {
                    const cliente = clientes.find(c => c.id == prod.clienteId);
                    clienteInfo = cliente ? cliente.nombreComercial : '';
                }
            }
        }

        return {
            ...h,
            pedidoInfo,
            productoInfo,
            clienteInfo,
            procesoInfo
        };
    });

    const content = `
        <div class="detalle-operadora">
            <div class="detalle-op-header">
                <div class="detalle-op-avatar">${getIniciales(operador.nombre || 'NN')}</div>
                <div class="detalle-op-info">
                    <h3>${operador.nombre || 'Sin nombre'}</h3>
                    <span class="eficiencia-badge ${eficiencia >= 100 ? 'excelente' : eficiencia >= 80 ? 'buena' : 'baja'}">${eficiencia}% eficiencia</span>
                    ${estacionActual ? `<span class="estacion-actual" style="display: block; margin-top: 5px; font-size: 0.85rem; color: #64748b;"><i class="fas fa-desktop"></i> Estación: ${estacionActual}</span>` : ''}
                </div>
            </div>

            <!-- Trabajo actual -->
            ${procesoActual || pedidoActual || productoActual ? `
            <div class="trabajo-actual" style="background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; font-size: 0.85rem; color: #a5b4fc;"><i class="fas fa-tools"></i> Trabajo Actual</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    ${procesoActual ? `<div><span style="font-size: 0.7rem; color: #8b9dc3; display: block;">Proceso</span><strong style="color: #fff;">${procesoActual}</strong></div>` : ''}
                    ${pedidoActual ? `<div><span style="font-size: 0.7rem; color: #8b9dc3; display: block;">Pedido</span><strong style="color: #fff;">#${pedidoActual.id}</strong></div>` : ''}
                    ${productoActual ? `<div><span style="font-size: 0.7rem; color: #8b9dc3; display: block;">Producto</span><strong style="color: #fff;">${productoActual.nombre.substring(0, 15)}</strong></div>` : ''}
                </div>
            </div>
            ` : ''}

            <div class="detalle-op-stats">
                <div class="stat-item">
                    <span class="stat-label">Piezas Hoy</span>
                    <span class="stat-value">${piezasHoy.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Histórico</span>
                    <span class="stat-value">${totalPiezasHistorial.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Registros</span>
                    <span class="stat-value">${historial.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tendencia</span>
                    <span class="stat-value tendencia ${tendencia > 0 ? 'positiva' : tendencia < 0 ? 'negativa' : ''}">
                        ${tendencia > 0 ? '+' : ''}${tendencia}%
                    </span>
                </div>
            </div>

            <div class="detalle-op-historial">
                <h4>Últimos Registros de Producción</h4>
                ${historialEnriquecido.length === 0 ?
                    '<p class="sin-registros" style="text-align: center; color: #94a3b8; padding: 20px;">Sin registros históricos aún</p>'
                    : `
                    <div class="historial-header" style="display: grid; grid-template-columns: 85px 55px 1fr 75px 1fr; gap: 8px; padding: 8px 10px; border-bottom: 1px solid #3d4a5c; margin-bottom: 5px;">
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Fecha</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Pzas</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Proceso</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Pedido</span>
                        <span style="font-size: 0.65rem; color: #8b9dc3; text-transform: uppercase;">Cliente</span>
                    </div>
                    ${historialEnriquecido.slice(0, 15).map(h => `
                    <div class="historial-item-detallado" style="display: grid; grid-template-columns: 85px 55px 1fr 75px 1fr; gap: 8px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center;">
                        <span class="fecha" style="color: #94a3b8; font-size: 0.75rem;">${formatearFecha(h.fecha)}</span>
                        <span class="piezas" style="color: #10b981; font-weight: 600; background: rgba(16, 185, 129, 0.1); padding: 3px 6px; border-radius: 12px; text-align: center; font-size: 0.8rem;">${h.cantidad || h.piezas || 0}</span>
                        <span class="proceso" style="color: #fbbf24; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;" title="${h.procesoInfo || ''}">${h.procesoInfo || '-'}</span>
                        <span class="pedido" style="color: #a5b4fc; font-size: 0.75rem;">${h.pedidoInfo || '-'}</span>
                        <span class="cliente" style="color: #38bdf8; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${h.clienteInfo || ''}">${h.clienteInfo ? h.clienteInfo.substring(0, 15) : '-'}</span>
                    </div>
                `).join('')}
                `}
            </div>
        </div>
    `;

    openModal(`Detalle: ${operador.nombre || 'Operador'}`, content, '<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>');
}

function verHistorialOperadora(operadorId) {
    verDetalleOperadora(operadorId);
}

function exportarReporte() {
    // Mostrar modal con opciones de exportación
    const content = `
        <div class="export-options">
            <p>Selecciona el formato de exportación:</p>
            <div class="export-buttons">
                <button class="btn btn-primary" onclick="exportarReporteCSV(); closeModal();">
                    <i class="fas fa-file-csv"></i> CSV (Excel)
                </button>
                <button class="btn btn-outline" onclick="exportarReportePDF(); closeModal();">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
            </div>
        </div>
    `;

    openModal('Exportar Reporte', content, [
        { text: 'Cancelar', class: 'btn-secondary', onclick: 'closeModal()' }
    ]);
}

function exportarReporteCSV() {
    const operadoras = getReporteOperadoras();
    let csv = 'Ranking,Nombre,Estacion,Piezas,Eficiencia,Tendencia\n';

    operadoras.forEach((op, idx) => {
        csv += `${idx + 1},"${op.nombre}","${op.estacion || '-'}",${op.piezas},${op.eficiencia}%,${op.tendencia}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_operadoras_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('Reporte CSV exportado correctamente', 'success');
}

function cargarHtml2Pdf() {
    return new Promise(function(resolve, reject) {
        if (typeof html2pdf !== 'undefined') { resolve(); return; }
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = resolve;
        script.onerror = function() { reject(new Error('No se pudo cargar html2pdf')); };
        document.head.appendChild(script);
    });
}

function exportarReportePDF() {
    const elemento = document.querySelector('.coco-reportes');
    if (!elemento) {
        showToast('No se encontró el reporte para exportar', 'error');
        return;
    }

    showToast('Cargando generador PDF...', 'info');

    cargarHtml2Pdf().then(function() {
        _generarPDF(elemento);
    }).catch(function() {
        showToast('Error al cargar la librería de PDF', 'error');
    });
}

function _generarPDF(elemento) {
    showToast('Generando PDF...', 'info');

    const opciones = {
        margin: 10,
        filename: `reporte_operadoras_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    // Clonar elemento para no afectar la UI
    const clon = elemento.cloneNode(true);
    clon.style.background = '#1a1f2e';
    clon.style.padding = '20px';

    html2pdf().set(opciones).from(clon).save().then(() => {
        showToast('Reporte PDF exportado correctamente', 'success');
    }).catch(err => {
        console.error('Error al exportar PDF:', err);
        showToast('Error al generar PDF', 'error');
    });
}

// ========================================
// ASISTENTE IA DE COCO
// ========================================

function renderCocoAsistente() {
    const container = document.querySelector('.coco-asistente-container');
    if (!container) return;

    const areaFiltro = cocoState.asistenteAreaFiltro;
    const areas = getAreasDisponibles();
    const recomendaciones = getRecomendacionesIA(areaFiltro);
    const datosHistoricos = hayDatosSuficientes();

    container.innerHTML = `
        <div class="coco-asistente">
            <div class="asistente-header">
                <div class="asistente-avatar">
                    <i class="fas fa-robot"></i>
                    <div class="avatar-pulse"></div>
                </div>
                <div class="asistente-intro">
                    <h2>Asistente Inteligente</h2>
                    <p>Hola Coco, analice los datos de produccion y tengo algunas recomendaciones para ti.</p>
                </div>
                <div class="asistente-filtros">
                    <select class="mini-select" onchange="cambiarFiltroAsistente(this.value)">
                        <option value="todas" ${areaFiltro === 'todas' ? 'selected' : ''}>Todas las areas</option>
                        ${areas.map(a => `<option value="${a}" ${areaFiltro === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                </div>
            </div>

            ${!datosHistoricos ? `
                <div class="asistente-sin-datos">
                    <div class="sin-datos-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <h3>Recopilando datos...</h3>
                    <p>Para darte recomendaciones más precisas, necesito analizar más datos históricos.</p>
                    <div class="datos-progreso">
                        <div class="progreso-item">
                            <span>Registros de producción</span>
                            <div class="progreso-barra">
                                <div class="progreso-fill" style="width: ${getProgresoRegistros()}%"></div>
                            </div>
                            <span>${getProgresoRegistros()}%</span>
                        </div>
                        <div class="progreso-item">
                            <span>Historial de operadoras</span>
                            <div class="progreso-barra">
                                <div class="progreso-fill" style="width: ${getProgresoHistorial()}%"></div>
                            </div>
                            <span>${getProgresoHistorial()}%</span>
                        </div>
                    </div>
                    <p class="datos-tip">
                        <i class="fas fa-lightbulb"></i>
                        Tip: Mientras más uses el sistema de liberación y captures datos de producción,
                        mejores serán mis recomendaciones.
                    </p>
                </div>
            ` : ''}

            <!-- Recomendaciones de Asignación -->
            <div class="asistente-seccion">
                <h3><i class="fas fa-user-cog"></i> Recomendaciones de Asignación</h3>
                <p class="seccion-descripcion">
                    Basado en el rendimiento histórico de cada operadora en diferentes procesos.
                </p>

                <div class="recomendaciones-grid">
                    ${recomendaciones.asignaciones.length > 0 ? recomendaciones.asignaciones.map(rec => `
                        <div class="recomendacion-card">
                            <div class="rec-header">
                                <div class="rec-operadora">
                                    <span class="rec-avatar">${getIniciales(rec.operadora)}</span>
                                    <div class="rec-info">
                                        <strong>${rec.operadora}</strong>
                                        <span>Actualmente: ${rec.estacionActual || 'Sin asignar'}</span>
                                    </div>
                                </div>
                                <span class="rec-confianza ${rec.confianza >= 80 ? 'alta' : rec.confianza >= 60 ? 'media' : 'baja'}">
                                    ${rec.confianza}% confianza
                                </span>
                            </div>
                            <div class="rec-body">
                                <div class="rec-sugerencia">
                                    <i class="fas fa-arrow-right"></i>
                                    <span>Asignar a: <strong>${rec.procesoSugerido}</strong></span>
                                </div>
                                <div class="rec-razon">
                                    <i class="fas fa-chart-line"></i>
                                    <span>${rec.razon}</span>
                                </div>
                                <div class="rec-stats">
                                    <span title="Eficiencia histórica en este proceso">
                                        <i class="fas fa-tachometer-alt"></i> ${rec.eficienciaHistorica}%
                                    </span>
                                    <span title="Piezas promedio por día">
                                        <i class="fas fa-cubes"></i> ${rec.promediodiario} pzas/día
                                    </span>
                                </div>
                            </div>
                            <div class="rec-actions">
                                <button class="btn btn-sm btn-primary" onclick="aplicarRecomendacion('${rec.id}')">
                                    <i class="fas fa-check"></i> Aplicar
                                </button>
                                <button class="btn btn-sm btn-secondary" onclick="ignorarRecomendacion('${rec.id}')">
                                    <i class="fas fa-times"></i> Ignorar
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="sin-recomendaciones">
                            <i class="fas fa-check-circle"></i>
                            <p>No hay recomendaciones pendientes. Tu equipo esta bien asignado.</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Optimizacion de Pedidos -->
            ${recomendaciones.pedidos.length > 0 ? `
                <div class="asistente-seccion">
                    <h3><i class="fas fa-clipboard-check"></i> Optimizacion de Pedidos</h3>
                    <div class="optimizacion-grid">
                        ${recomendaciones.pedidos.map(rec => `
                            <div class="optimizacion-card ${rec.prioridad}">
                                <div class="opt-header">
                                    <span class="opt-pedido">Pedido #${rec.pedidoId}</span>
                                    <span class="opt-prioridad">${rec.prioridad}</span>
                                </div>
                                <div class="opt-body">
                                    <p>${rec.recomendacion}</p>
                                    <div class="opt-impacto">
                                        <i class="fas fa-bolt"></i>
                                        Impacto estimado: <strong>${rec.impacto}</strong>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Chat con IA -->
            <div class="asistente-chat">
                <h3><i class="fas fa-comments"></i> Preguntame algo, Coco</h3>
                <div class="chat-container">
                    <div class="chat-messages" id="chatMessages">
                        <div class="chat-message ia">
                            <div class="message-avatar"><i class="fas fa-robot"></i></div>
                            <div class="message-content">
                                <p>¿En que puedo ayudarte? Puedes preguntarme cosas como:</p>
                                <ul class="sugerencias-chat">
                                    <li onclick="enviarPregunta('¿Quien es mejor para costura?')">¿Quien es mejor para costura?</li>
                                    <li onclick="enviarPregunta('¿Como optimizo el pedido urgente?')">¿Como optimizo el pedido urgente?</li>
                                    <li onclick="enviarPregunta('¿Quien necesita capacitacion?')">¿Quien necesita capacitacion?</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="chat-input">
                        <input type="text" id="chatInput" placeholder="Escribe tu pregunta..."
                               onkeypress="if(event.key==='Enter') enviarPregunta()">
                        <button class="btn btn-primary" onclick="enviarPregunta()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Historial de recomendaciones -->
            <div class="asistente-historial">
                <h3><i class="fas fa-history"></i> Historial de Recomendaciones</h3>
                <div class="historial-lista">
                    ${getHistorialRecomendaciones().slice(0, 5).map(h => `
                        <div class="historial-rec-item ${h.aplicada ? 'aplicada' : 'ignorada'}">
                            <span class="historial-fecha">${formatearFecha(h.fecha)}</span>
                            <span class="historial-texto">${h.texto}</span>
                            <span class="historial-estado">
                                <i class="fas fa-${h.aplicada ? 'check' : 'times'}"></i>
                                ${h.aplicada ? 'Aplicada' : 'Ignorada'}
                            </span>
                        </div>
                    `).join('') || '<p class="sin-historial">No hay historial de recomendaciones</p>'}
                </div>
            </div>
        </div>
    `;
}

// ========================================
// MOTOR DE RECOMENDACIONES IA
// ========================================

function getRecomendacionesIA(areaFiltro = 'todas') {
    const historial = getHistorialProduccion();
    let operadores = supervisoraState.operadores || [];
    const pedidos = supervisoraState.pedidosHoy || [];
    const maquinas = supervisoraState.maquinas;

    // Aplicar filtro de area si es necesario
    if (areaFiltro !== 'todas') {
        operadores = filtrarOperadorasPorArea(operadores, areaFiltro);
    }

    const recomendaciones = {
        asignaciones: [],
        pedidos: [],
        general: []
    };

    // Analizar rendimiento por operadora y proceso
    const rendimientoPorOperadora = {};

    operadores.forEach(op => {
        rendimientoPorOperadora[op.id] = {
            nombre: op.nombre,
            procesos: {}
        };

        // Analizar historial por tipo de proceso
        const historialOp = historial.filter(h => h.operadorId === op.id);

        historialOp.forEach(h => {
            const tipoProceso = h.tipoProceso || 'general';
            if (!rendimientoPorOperadora[op.id].procesos[tipoProceso]) {
                rendimientoPorOperadora[op.id].procesos[tipoProceso] = {
                    totalPiezas: 0,
                    totalRegistros: 0,
                    eficiencias: []
                };
            }

            rendimientoPorOperadora[op.id].procesos[tipoProceso].totalPiezas += h.piezas || 0;
            rendimientoPorOperadora[op.id].procesos[tipoProceso].totalRegistros++;
            if (h.eficiencia) {
                rendimientoPorOperadora[op.id].procesos[tipoProceso].eficiencias.push(h.eficiencia);
            }
        });
    });

    // Generar recomendaciones de asignacion
    operadores.forEach(op => {
        const datos = rendimientoPorOperadora[op.id];
        if (!datos || Object.keys(datos.procesos).length === 0) return;

        // Encontrar el mejor proceso para esta operadora
        let mejorProceso = null;
        let mejorEficiencia = 0;

        Object.entries(datos.procesos).forEach(([proceso, stats]) => {
            if (stats.eficiencias.length > 0) {
                const promedioEficiencia = stats.eficiencias.reduce((a, b) => a + b, 0) / stats.eficiencias.length;
                if (promedioEficiencia > mejorEficiencia) {
                    mejorEficiencia = promedioEficiencia;
                    mejorProceso = proceso;
                }
            }
        });

        if (mejorProceso && mejorEficiencia > 0) {
            // Verificar si hay pedidos que necesiten este proceso
            const pedidosConProceso = pedidos.filter(p =>
                p.procesos?.some(proc =>
                    proc.tipo === mejorProceso && proc.estado !== 'completado'
                )
            );

            if (pedidosConProceso.length > 0) {
                const estacionActual = Object.entries(maquinas).find(([id, m]) =>
                    m.operadores?.some(o => o.id === op.id)
                );

                recomendaciones.asignaciones.push({
                    id: Date.now() + op.id,
                    operadoraId: op.id,
                    operadora: op.nombre,
                    estacionActual: estacionActual ? estacionActual[0] : null,
                    procesoSugerido: mejorProceso,
                    eficienciaHistorica: Math.round(mejorEficiencia),
                    promediodiario: Math.round(datos.procesos[mejorProceso].totalPiezas / Math.max(1, datos.procesos[mejorProceso].totalRegistros)),
                    confianza: Math.min(95, 50 + datos.procesos[mejorProceso].totalRegistros * 5),
                    razon: `Historicamente rinde ${Math.round(mejorEficiencia)}% en ${mejorProceso}`
                });
            }
        }
    });

    // Ordenar por confianza
    recomendaciones.asignaciones.sort((a, b) => b.confianza - a.confianza);

    // Limitar a 5 recomendaciones
    recomendaciones.asignaciones = recomendaciones.asignaciones.slice(0, 5);

    // Recomendaciones para pedidos
    pedidos.forEach(pedido => {
        const progreso = calcularProgresoPedido(pedido);
        if ((pedido.prioridad === 'alta' || pedido.prioridad === 'urgente') && progreso < 50) {
            const estacionesEnPedido = Object.values(maquinas).filter(m => m.pedidoId === pedido.id);

            if (estacionesEnPedido.length < 3) {
                recomendaciones.pedidos.push({
                    pedidoId: pedido.id,
                    prioridad: 'alta',
                    recomendacion: `Agregar mas estaciones al pedido #${pedido.id}. Actualmente solo tiene ${estacionesEnPedido.length}.`,
                    impacto: '+20% velocidad estimada'
                });
            }
        }
    });

    return recomendaciones;
}

function hayDatosSuficientes() {
    const historial = getHistorialProduccion();
    return historial.length >= 10; // Minimo 10 registros para empezar a recomendar
}

function getProgresoRegistros() {
    const historial = getHistorialProduccion();
    return Math.min(100, Math.round((historial.length / 50) * 100));
}

function getProgresoHistorial() {
    const liberaciones = safeLocalGet('supervisora_liberaciones', []);
    return Math.min(100, Math.round((liberaciones.length / 30) * 100));
}

function getHistorialProduccion() {
    return safeLocalGet('historial_produccion', []);
}

function guardarRegistroProduccion(registro) {
    const historial = getHistorialProduccion();
    historial.unshift({
        ...registro,
        fecha: new Date().toISOString()
    });

    // Mantener ultimos 500 registros
    if (historial.length > 500) historial.splice(500);

    localStorage.setItem('historial_produccion', JSON.stringify(historial));
}

function getHistorialRecomendaciones() {
    return safeLocalGet('historial_recomendaciones', []);
}

function aplicarRecomendacion(recId) {
    const recomendaciones = getRecomendacionesIA();
    const rec = recomendaciones.asignaciones.find(r => r.id == recId);

    if (rec) {
        // Guardar en historial
        const historial = getHistorialRecomendaciones();
        historial.unshift({
            fecha: new Date().toISOString(),
            texto: `Asignar ${rec.operadora} a ${rec.procesoSugerido}`,
            aplicada: true
        });
        localStorage.setItem('historial_recomendaciones', JSON.stringify(historial.slice(0, 50)));

        showToast(`Recomendación aplicada: ${rec.operadora} -> ${rec.procesoSugerido}`, 'success');
        renderCocoAsistente();
    }
}

function ignorarRecomendacion(recId) {
    const recomendaciones = getRecomendacionesIA();
    const rec = recomendaciones.asignaciones.find(r => r.id == recId);

    if (rec) {
        // Guardar en historial
        const historial = getHistorialRecomendaciones();
        historial.unshift({
            fecha: new Date().toISOString(),
            texto: `Asignar ${rec.operadora} a ${rec.procesoSugerido}`,
            aplicada: false
        });
        localStorage.setItem('historial_recomendaciones', JSON.stringify(historial.slice(0, 50)));

        showToast('Recomendación ignorada', 'info');
        renderCocoAsistente();
    }
}

// Chat con IA
function enviarPregunta(preguntaPredef) {
    const input = document.getElementById('chatInput');
    const pregunta = preguntaPredef || (input ? input.value.trim() : '');

    if (!pregunta) return;

    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // Agregar mensaje del usuario
    chatMessages.innerHTML += `
        <div class="chat-message usuario">
            <div class="message-content">
                <p>${pregunta}</p>
            </div>
            <div class="message-avatar"><i class="fas fa-user"></i></div>
        </div>
    `;

    // Generar respuesta de IA
    const respuesta = generarRespuestaIAEnhanced(pregunta);

    setTimeout(() => {
        chatMessages.innerHTML += `
            <div class="chat-message ia">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p>${respuesta}</p>
                </div>
            </div>
        `;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 500);

    if (input) input.value = '';
}

// ========================================
// INTELIGENCIA ARTIFICIAL - ANÁLISIS PREDICTIVO
// ========================================

/**
 * FASE 6.1: Alertas predictivas de entrega
 * Calcula ritmo de producción actual y proyecta si alcanzará para fecha de entrega
 */
function verificarAlertasEntrega() {
    const alertas = [];
    try {
        const pedidosERP = JSON.parse(localStorage.getItem('pedidos_erp') || '[]');
        const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
        const hoy = new Date();

        pedidosERP.forEach(pedido => {
            if (pedido.estado === 'completado' || pedido.estado === 'entregado') return;

            const fechaEntrega = pedido.fechaEntrega ? new Date(pedido.fechaEntrega) : null;
            if (!fechaEntrega || fechaEntrega <= hoy) return;

            const diasRestantes = Math.ceil((fechaEntrega - hoy) / (1000 * 60 * 60 * 24));
            if (diasRestantes <= 0) return;

            // Calcular piezas totales producidas para este pedido
            const piezasProducidas = (pedido.procesos || []).reduce((sum, p) => sum + (p.piezas || 0), 0);
            const cantidadTotal = pedido.cantidad || 0;
            const piezasFaltantes = Math.max(0, cantidadTotal - piezasProducidas);

            if (piezasFaltantes === 0) return;

            // Calcular ritmo: piezas producidas hoy para este pedido
            const hoyStr = hoy.toISOString().split('T')[0];
            const produccionHoy = historial.filter(h =>
                h.pedidoId == pedido.id && h.fecha?.startsWith(hoyStr)
            );
            const piezasHoy = produccionHoy.reduce((s, h) => s + (h.cantidad || 0), 0);

            // Proyección: necesitamos piezasFaltantes en diasRestantes días
            const necesitasPorDia = piezasFaltantes / diasRestantes;

            if (piezasHoy > 0 && piezasHoy < necesitasPorDia * 0.7) {
                alertas.push({
                    tipo: 'entrega_en_riesgo',
                    pedidoId: pedido.id,
                    codigo: pedido.codigo,
                    cliente: pedido.cliente,
                    mensaje: `${pedido.codigo}: ritmo actual (${piezasHoy}/día) insuficiente. Necesita ${Math.ceil(necesitasPorDia)}/día para entregar en ${diasRestantes} días.`,
                    deficit: Math.ceil(necesitasPorDia - piezasHoy),
                    diasRestantes: diasRestantes,
                    prioridad: diasRestantes <= 3 ? 'alta' : 'media'
                });
            } else if (piezasHoy === 0 && diasRestantes <= 5 && piezasFaltantes > 0) {
                alertas.push({
                    tipo: 'sin_produccion',
                    pedidoId: pedido.id,
                    codigo: pedido.codigo,
                    cliente: pedido.cliente,
                    mensaje: `${pedido.codigo}: sin producción hoy. Faltan ${piezasFaltantes} piezas y quedan ${diasRestantes} días.`,
                    diasRestantes: diasRestantes,
                    prioridad: 'alta'
                });
            }
        });
    } catch (e) {
        console.error('[COCO IA] Error en alertas de entrega:', e);
    }
    return alertas;
}

/**
 * FASE 6.2: Detección de anomalías en producción
 * Compara producción de hoy vs promedio de 7 días
 */
function detectarAnomalias() {
    const anomalias = [];
    try {
        const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];

        // Agrupar producción por día de los últimos 7 días
        const produccionPorDia = {};
        for (let i = 0; i < 7; i++) {
            const dia = new Date(hoy);
            dia.setDate(dia.getDate() - i);
            const diaStr = dia.toISOString().split('T')[0];
            produccionPorDia[diaStr] = historial
                .filter(h => h.fecha?.startsWith(diaStr))
                .reduce((s, h) => s + (h.cantidad || 0), 0);
        }

        const piezasHoy = produccionPorDia[hoyStr] || 0;
        const diasAnteriores = Object.entries(produccionPorDia)
            .filter(([d]) => d !== hoyStr && produccionPorDia[d] > 0)
            .map(([, v]) => v);

        if (diasAnteriores.length >= 3) {
            const promedio = diasAnteriores.reduce((s, v) => s + v, 0) / diasAnteriores.length;
            const decline = promedio > 0 ? ((promedio - piezasHoy) / promedio) * 100 : 0;

            if (decline >= 30) {
                anomalias.push({
                    tipo: 'baja_produccion',
                    mensaje: `Producción de hoy (${piezasHoy}) es ${Math.round(decline)}% menor que el promedio (${Math.round(promedio)}).`,
                    piezasHoy: piezasHoy,
                    promedio: Math.round(promedio),
                    decline: Math.round(decline)
                });
            }
        }

        // Detectar estaciones sin actividad que deberían estar trabajando
        const estadoMaquinas = JSON.parse(localStorage.getItem('estado_maquinas') || '{}');
        const asignaciones = JSON.parse(localStorage.getItem('asignaciones_estaciones') || '{}');

        Object.entries(asignaciones).forEach(([estId, asig]) => {
            const estado = estadoMaquinas[estId];
            if (asig.pedidoId && (!estado || !estado.procesoActivo)) {
                const ultimaCaptura = estado?.ultimaCaptura ? new Date(estado.ultimaCaptura) : null;
                const sinActividad = !ultimaCaptura || (hoy - ultimaCaptura > 30 * 60 * 1000); // 30 min

                if (sinActividad) {
                    anomalias.push({
                        tipo: 'estacion_inactiva',
                        estacionId: estId,
                        mensaje: `Estación ${estId} tiene pedido asignado pero sin actividad por más de 30 min.`
                    });
                }
            }
        });
    } catch (e) {
        console.error('[COCO IA] Error en detección de anomalías:', e);
    }
    return anomalias;
}

/**
 * FASE 6.3: Sugerencias de reasignación basadas en eficiencia histórica
 */
function sugerirReasignaciones() {
    const sugerencias = [];
    try {
        const historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]');
        const personal = JSON.parse(localStorage.getItem('erp_multifundas_db') || '{}').personal || [];

        // Calcular eficiencia por operador por proceso
        const eficienciaPorOperador = {};
        historial.forEach(h => {
            if (!h.operadoraId || !h.procesoNombre || !h.cantidad) return;
            const key = `${h.operadoraId}_${h.procesoNombre.toLowerCase()}`;
            if (!eficienciaPorOperador[key]) {
                eficienciaPorOperador[key] = {
                    operadoraId: h.operadoraId,
                    operadoraNombre: h.operadoraNombre,
                    proceso: h.procesoNombre,
                    totalPiezas: 0,
                    capturas: 0
                };
            }
            eficienciaPorOperador[key].totalPiezas += h.cantidad;
            eficienciaPorOperador[key].capturas++;
        });

        // Buscar procesos donde hay diferencias significativas de eficiencia
        const porProceso = {};
        Object.values(eficienciaPorOperador).forEach(e => {
            const proc = e.proceso.toLowerCase();
            if (!porProceso[proc]) porProceso[proc] = [];
            const promedioPorCaptura = e.capturas > 0 ? e.totalPiezas / e.capturas : 0;
            porProceso[proc].push({
                ...e,
                promedioPorCaptura: Math.round(promedioPorCaptura * 10) / 10
            });
        });

        Object.entries(porProceso).forEach(([proceso, operadores]) => {
            if (operadores.length < 2) return;
            operadores.sort((a, b) => b.promedioPorCaptura - a.promedioPorCaptura);

            const mejor = operadores[0];
            const peor = operadores[operadores.length - 1];

            if (peor.promedioPorCaptura > 0 && mejor.promedioPorCaptura > peor.promedioPorCaptura * 1.3) {
                sugerencias.push({
                    proceso: proceso,
                    mejorOperadora: mejor.operadoraNombre,
                    mejorPromedio: mejor.promedioPorCaptura,
                    peorOperadora: peor.operadoraNombre,
                    peorPromedio: peor.promedioPorCaptura,
                    mensaje: `En "${proceso}": ${mejor.operadoraNombre} produce ${mejor.promedioPorCaptura} pzas/captura vs ${peor.operadoraNombre} con ${peor.promedioPorCaptura}. Considerar reasignar.`
                });
            }
        });
    } catch (e) {
        console.error('[COCO IA] Error en sugerencias de reasignación:', e);
    }
    return sugerencias;
}

/**
 * FASE 6.5: Enhanced Coco chat - Wraps generarRespuestaIA with contextual AI data
 */
function generarRespuestaIAEnhanced(pregunta) {
    const preguntaLower = (pregunta || '').toLowerCase().trim();

    // Patrones contextuales con datos reales
    if (preguntaLower.includes('alerta') || preguntaLower.includes('entrega') || preguntaLower.includes('riesgo')) {
        const alertas = verificarAlertasEntrega();
        if (alertas.length > 0) {
            const lista = alertas.slice(0, 3).map(a => '• ' + a.mensaje).join('\n');
            return `Hay ${alertas.length} alerta(s) de entrega:\n${lista}`;
        }
        return 'No hay alertas de entrega en este momento. Todos los pedidos van en tiempo.';
    }

    if (preguntaLower.includes('anomal') || preguntaLower.includes('problema') || preguntaLower.includes('raro')) {
        const anomalias = detectarAnomalias();
        if (anomalias.length > 0) {
            const lista = anomalias.slice(0, 3).map(a => '• ' + a.mensaje).join('\n');
            return `Detecté ${anomalias.length} anomalía(s):\n${lista}`;
        }
        return 'No detecté anomalías. La producción va dentro de parámetros normales.';
    }

    if (preguntaLower.includes('reasign') || preguntaLower.includes('mejor operador') || preguntaLower.includes('eficiencia')) {
        const sugerencias = sugerirReasignaciones();
        if (sugerencias.length > 0) {
            const lista = sugerencias.slice(0, 3).map(s => '• ' + s.mensaje).join('\n');
            return `Tengo ${sugerencias.length} sugerencia(s) de reasignación:\n${lista}`;
        }
        return 'Actualmente no hay oportunidades claras de reasignación. Las eficiencias están balanceadas.';
    }

    if (preguntaLower.includes('como vamos') || preguntaLower.includes('cómo vamos') || preguntaLower.includes('resumen') || preguntaLower.includes('status')) {
        const alertas = verificarAlertasEntrega();
        const anomalias = detectarAnomalias();
        const historial = safeLocalGet('historial_produccion', []);
        const hoyStr = new Date().toISOString().split('T')[0];
        const produccionHoy = historial.filter(h => h.fecha?.startsWith(hoyStr));
        const totalHoy = produccionHoy.reduce((s, h) => s + (h.cantidad || 0), 0);
        const operadoresActivos = new Set(produccionHoy.map(h => h.operadoraId).filter(Boolean)).size;

        let resumen = `Resumen del día:\n• Producción total: ${totalHoy} piezas\n• Operadoras activas: ${operadoresActivos}`;

        if (alertas.length > 0) {
            resumen += `\n• ⚠ ${alertas.length} alerta(s) de entrega`;
        }
        if (anomalias.length > 0) {
            resumen += `\n• ⚠ ${anomalias.length} anomalía(s) detectada(s)`;
        }
        if (alertas.length === 0 && anomalias.length === 0) {
            resumen += '\n• Todo marcha bien, sin alertas.';
        }
        return resumen;
    }

    // Buscar por nombre de operadora
    const personal = safeLocalGet('erp_multifundas_db', {}).personal || [];
    for (const persona of personal) {
        if (persona.nombre && preguntaLower.includes(persona.nombre.toLowerCase().split(' ')[0])) {
            const historial = safeLocalGet('historial_produccion', []);
            const hoyStr = new Date().toISOString().split('T')[0];
            const registros = historial.filter(h =>
                h.operadoraId == persona.id && h.fecha?.startsWith(hoyStr)
            );
            const piezasHoy = registros.reduce((s, h) => s + (h.cantidad || 0), 0);
            const capturas = registros.length;

            if (piezasHoy > 0) {
                return `${persona.nombre}: ${piezasHoy} piezas hoy en ${capturas} capturas. Promedio: ${capturas > 0 ? Math.round(piezasHoy / capturas) : 0} pzas/captura.`;
            }
            return `${persona.nombre} no ha registrado producción hoy.`;
        }
    }

    // Fallback: usar la función original
    return generarRespuestaIA(pregunta);
}

function generarRespuestaIA(pregunta) {
    const preguntaLower = pregunta.toLowerCase();
    const operadores = supervisoraState.operadores || [];
    const historial = getHistorialProduccion();

    // Analizar pregunta y generar respuesta contextual
    if (preguntaLower.includes('mejor') && preguntaLower.includes('costura')) {
        const mejorCostura = encontrarMejorOperadoraPorProceso('costura');
        if (mejorCostura) {
            return `Basado en los datos históricos, <strong>${mejorCostura.nombre}</strong> tiene el mejor rendimiento en costura con un promedio de ${mejorCostura.promedio} piezas por día y ${mejorCostura.eficiencia}% de eficiencia.`;
        }
        return `Aún no tengo suficientes datos para determinar quién es mejor en costura, Coco. Necesito más registros de producción.`;
    }

    if (preguntaLower.includes('mejor') && preguntaLower.includes('corte')) {
        const mejorCorte = encontrarMejorOperadoraPorProceso('corte');
        if (mejorCorte) {
            return `Para corte, mi recomendación es <strong>${mejorCorte.nombre}</strong> con ${mejorCorte.eficiencia}% de eficiencia y promedio de ${mejorCorte.promedio} piezas por día.`;
        }
        return `Necesito más datos de producción de corte para darte una recomendación precisa.`;
    }

    if (preguntaLower.includes('capacitacion') || preguntaLower.includes('necesita ayuda')) {
        const bajoRendimiento = operadores.filter(op => calcularEficienciaOperadora(op.id) < 70);
        if (bajoRendimiento.length > 0) {
            return `Te sugiero revisar el desempeño de: <strong>${bajoRendimiento.map(o => o.nombre).join(', ')}</strong>. Su eficiencia está por debajo del 70%. Podrían beneficiarse de capacitación adicional o revisar si están en el proceso adecuado.`;
        }
        return `¡Buenas noticias, Coco! Todo tu equipo está por encima del 70% de eficiencia. No detecto necesidades urgentes de capacitación.`;
    }

    if (preguntaLower.includes('optimiz') && preguntaLower.includes('pedido')) {
        const urgentes = (supervisoraState.pedidosHoy || []).filter(p => p.prioridad === 'alta' || p.prioridad === 'urgente');
        if (urgentes.length > 0) {
            return `Para optimizar el pedido urgente #${urgentes[0].id}, te recomiendo: 1) Asignar a tus operadoras más eficientes, 2) Agregar más estaciones si es posible, 3) Revisar que no haya cuellos de botella en procesos anteriores.`;
        }
        return `No tienes pedidos urgentes en este momento. ¿Hay algún pedido específico que quieras optimizar?`;
    }

    if (preguntaLower.includes('cuantas') && preguntaLower.includes('operadora')) {
        const total = operadores.length;
        const activas = Object.values(supervisoraState.maquinas).filter(m => m.operadores && m.operadores.length > 0).length;
        return `Tienes ${total} operadoras en total. Actualmente hay ${activas} estaciones con operadoras asignadas.`;
    }

    if (preguntaLower.includes('produccion') && preguntaLower.includes('hoy')) {
        const piezasHoy = Object.values(supervisoraState.maquinas).reduce((sum, m) => sum + (m.piezasHoy || 0), 0);
        return `La producción de hoy es de <strong>${piezasHoy.toLocaleString()}</strong> piezas. ${piezasHoy > 500 ? '¡Vamos muy bien!' : 'Aún hay margen de mejora.'}`;
    }

    // Respuesta generica
    return `Entiendo tu pregunta, Coco. Déjame analizar los datos... Para darte una mejor respuesta, ¿podrías ser más específica? Por ejemplo, puedes preguntarme sobre operadoras específicas, procesos, o pedidos.`;
}

function encontrarMejorOperadoraPorProceso(tipoProceso) {
    const historial = getHistorialProduccion();
    const porOperadora = {};

    historial.filter(h => h.tipoProceso === tipoProceso).forEach(h => {
        if (!porOperadora[h.operadorId]) {
            porOperadora[h.operadorId] = {
                id: h.operadorId,
                nombre: h.operadorNombre,
                totalPiezas: 0,
                registros: 0,
                eficiencias: []
            };
        }
        porOperadora[h.operadorId].totalPiezas += h.piezas || 0;
        porOperadora[h.operadorId].registros++;
        if (h.eficiencia) porOperadora[h.operadorId].eficiencias.push(h.eficiencia);
    });

    const ordenado = Object.values(porOperadora)
        .filter(o => o.registros >= 2)
        .sort((a, b) => (b.totalPiezas / b.registros) - (a.totalPiezas / a.registros));

    if (ordenado.length === 0) return null;

    const mejor = ordenado[0];
    return {
        nombre: mejor.nombre,
        promedio: Math.round(mejor.totalPiezas / mejor.registros),
        eficiencia: mejor.eficiencias.length > 0 ?
            Math.round(mejor.eficiencias.reduce((a, b) => a + b, 0) / mejor.eficiencias.length) : 80
    };
}

// ========================================
// DASHBOARD DE TIEMPOS MUERTOS
// ========================================

let tiemposMuertosFiltro = 'hoy';

function renderTiemposMuertos() {
    const container = document.querySelector('.coco-tiempos-muertos-container');
    if (!container) return;

    // Verificar que exista el estado
    if (!supervisoraState.tiemposMuertos) {
        supervisoraState.tiemposMuertos = { activos: {}, historial: [] };
    }

    const activos = supervisoraState.tiemposMuertos.activos || {};
    const activosArray = Object.values(activos);

    // Calcular estadísticas
    const stats = typeof calcularEstadisticasTiemposMuertos === 'function'
        ? calcularEstadisticasTiemposMuertos(tiemposMuertosFiltro)
        : { totalParos: 0, tiempoTotal: 0, promedio: 0, activos: activosArray.length, porMotivo: [] };

    const historial = typeof getHistorialTiemposMuertos === 'function'
        ? getHistorialTiemposMuertos(tiemposMuertosFiltro)
        : [];

    const horasTotales = Math.floor(stats.tiempoTotal / 60);
    const minutosTotales = stats.tiempoTotal % 60;

    container.innerHTML = `
        <div class="tiempos-muertos-dashboard">
            <div class="tm-header">
                <h2><i class="fas fa-pause-circle"></i> Tiempos Muertos</h2>
                <div class="tm-header-actions">
                    <select class="form-control" id="tmFiltroSelect" onchange="cambiarFiltroTM(this.value)">
                        <option value="hoy" ${tiemposMuertosFiltro === 'hoy' ? 'selected' : ''}>Hoy</option>
                        <option value="semana" ${tiemposMuertosFiltro === 'semana' ? 'selected' : ''}>Esta semana</option>
                        <option value="mes" ${tiemposMuertosFiltro === 'mes' ? 'selected' : ''}>Este mes</option>
                    </select>
                    <button class="btn btn-outline" onclick="exportarTiemposMuertosCSV()">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>

            <!-- Paros Activos -->
            ${activosArray.length > 0 ? `
                <div class="tm-activos-section">
                    <h3><i class="fas fa-exclamation-circle"></i> Paros Activos (${activosArray.length})</h3>
                    <div class="tm-activos-grid">
                        ${activosArray.map(tm => {
                            const inicio = new Date(tm.inicio);
                            const duracionMin = Math.floor((new Date() - inicio) / 60000);
                            return `
                                <div class="tm-activo-card" onclick="mostrarTiempoMuertoActivo('${tm.estacionId}')"
                                     style="border-left: 4px solid ${tm.motivoColor}">
                                    <div class="tm-card-header">
                                        <span class="tm-card-estacion">${tm.estacionId}</span>
                                        <span class="tm-card-duracion">${duracionMin} min</span>
                                    </div>
                                    <div class="tm-card-motivo">
                                        <i class="fas ${tm.motivoIcono}" style="color: ${tm.motivoColor}"></i>
                                        ${tm.motivoNombre}
                                    </div>
                                    ${tm.operadores && tm.operadores.length > 0 ? `
                                        <div class="tm-card-operadores">
                                            ${tm.operadores.map(op => op.nombre.split(' ')[0]).join(', ')}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Resumen del período con análisis mejorado -->
            <div class="tm-resumen">
                <div class="tm-stat-card">
                    <div class="tm-stat-icon"><i class="fas fa-hashtag"></i></div>
                    <div class="tm-stat-value">${stats.totalParos}</div>
                    <div class="tm-stat-label">Paros registrados</div>
                </div>
                <div class="tm-stat-card">
                    <div class="tm-stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="tm-stat-value">${horasTotales}h ${minutosTotales}m</div>
                    <div class="tm-stat-label">Tiempo total</div>
                </div>
                <div class="tm-stat-card">
                    <div class="tm-stat-icon"><i class="fas fa-hourglass-half"></i></div>
                    <div class="tm-stat-value">${stats.promedio} min</div>
                    <div class="tm-stat-label">Promedio por paro</div>
                </div>
                <div class="tm-stat-card ${activosArray.length > 0 ? 'activos' : ''}">
                    <div class="tm-stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="tm-stat-value">${activosArray.length}</div>
                    <div class="tm-stat-label">Activos ahora</div>
                </div>
            </div>

            <!-- ANÁLISIS: Costo estimado y tendencia -->
            <div class="tm-analisis-section">
                <h3><i class="fas fa-chart-bar"></i> Análisis de Impacto</h3>
                <div class="tm-analisis-grid">
                    <div class="tm-analisis-card">
                        <div class="tm-analisis-card-titulo">Piezas No Producidas (Est.)</div>
                        <div class="tm-analisis-card-valor" style="color:#ef4444">~${estimarPiezasPerdidasTM(stats.tiempoTotal)}</div>
                        <div class="tm-analisis-card-detalle">Basado en promedio de producción</div>
                    </div>
                    <div class="tm-analisis-card">
                        <div class="tm-analisis-card-titulo">Estación Más Problemática</div>
                        <div class="tm-analisis-card-valor">${obtenerEstacionMasProblematica(historial)}</div>
                        <div class="tm-analisis-card-detalle">Mayor tiempo acumulado</div>
                    </div>
                    <div class="tm-analisis-card">
                        <div class="tm-analisis-card-titulo">Tendencia vs Semana Anterior</div>
                        <div class="tm-analisis-card-valor">${renderTendenciaTM(stats, tiemposMuertosFiltro)}</div>
                    </div>
                </div>

                <!-- Top 3 causas -->
                ${stats.porMotivo && stats.porMotivo.length > 0 ? `
                <h4 style="margin:16px 0 10px;color:#8b9dc3;font-size:0.85rem"><i class="fas fa-list-ol"></i> Top Causas de Paro</h4>
                <div class="tm-top-causas">
                    ${stats.porMotivo.slice(0, 3).map((m, idx) => {
                        const piezasPerdidas = estimarPiezasPerdidasTM(m.tiempoTotal);
                        return `
                        <div class="tm-top-causa-item">
                            <div class="tm-top-causa-rank">${idx + 1}</div>
                            <span class="tm-motivo-icon" style="background:${m.color}20;color:${m.color};width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                                <i class="fas ${m.icono}"></i>
                            </span>
                            <div class="tm-top-causa-info">
                                <div class="tm-top-causa-nombre">${m.motivo}</div>
                                <div class="tm-top-causa-stats">${m.cantidad} paros — ${m.tiempoTotal} min total</div>
                            </div>
                            <div class="tm-top-causa-piezas-perdidas">~${piezasPerdidas} pzas</div>
                        </div>
                    `}).join('')}
                </div>
                ` : ''}
            </div>

            <!-- Distribución por motivo -->
            <div class="tm-por-motivo">
                <h3><i class="fas fa-chart-pie"></i> Distribución por Motivo</h3>
                <div class="tm-motivos-list">
                    ${stats.porMotivo && stats.porMotivo.length > 0 ? stats.porMotivo.map(m => {
                        const porcentaje = stats.tiempoTotal > 0 ? Math.round((m.tiempoTotal / stats.tiempoTotal) * 100) : 0;
                        return `
                            <div class="tm-motivo-item">
                                <div class="tm-motivo-info">
                                    <span class="tm-motivo-icon" style="background: ${m.color}20; color: ${m.color}">
                                        <i class="fas ${m.icono}"></i>
                                    </span>
                                    <span class="tm-motivo-nombre">${m.motivo}</span>
                                </div>
                                <div class="tm-motivo-stats">
                                    <span class="tm-motivo-cantidad">${m.cantidad} paros</span>
                                    <span class="tm-motivo-tiempo">${m.tiempoTotal} min</span>
                                </div>
                                <div class="tm-motivo-bar">
                                    <div class="tm-motivo-bar-fill" style="width: ${porcentaje}%; background: ${m.color}"></div>
                                </div>
                            </div>
                        `;
                    }).join('') : '<p class="text-muted text-center">No hay paros registrados en este período</p>'}
                </div>
            </div>

            <!-- Historial reciente -->
            <div class="tm-historial">
                <h3><i class="fas fa-history"></i> Historial</h3>
                <div class="tm-historial-tabla">
                    ${historial.length > 0 ? `
                        <table class="tabla-tm">
                            <thead>
                                <tr>
                                    <th>Fecha/Hora</th>
                                    <th>Estación</th>
                                    <th>Motivo</th>
                                    <th>Duración</th>
                                    <th>Operadora</th>
                                    <th>Solución</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${historial.slice(0, 25).map(h => {
                                    const inicio = new Date(h.inicio);
                                    const fechaStr = inicio.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
                                    const horaStr = inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                                    return `
                                        <tr>
                                            <td>
                                                <div class="tm-fecha">${fechaStr}</div>
                                                <div class="tm-hora">${horaStr}</div>
                                            </td>
                                            <td><strong>${h.estacionId}</strong></td>
                                            <td>
                                                <span class="tm-motivo-badge" style="background: ${h.motivoColor}20; color: ${h.motivoColor}">
                                                    <i class="fas ${h.motivoIcono}"></i> ${h.motivoNombre}
                                                </span>
                                            </td>
                                            <td>${h.duracionMinutos} min</td>
                                            <td>${h.operadores?.map(op => op.nombre.split(' ')[0]).join(', ') || '-'}</td>
                                            <td class="solucion-cell" title="${h.solucion || ''}">${h.solucion || '-'}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="text-muted text-center">No hay paros registrados en este período</p>'}
                </div>
            </div>
        </div>
    `;
}

function cambiarFiltroTM(filtro) {
    tiemposMuertosFiltro = filtro;
    renderTiemposMuertos();
}

// Estimar piezas perdidas basado en promedio de producción
function estimarPiezasPerdidasTM(minutosParo) {
    const maquinas = Object.values(supervisoraState.maquinas);
    const piezasTotal = maquinas.reduce((s, m) => s + (m.piezasHoy || 0), 0);
    const hora = new Date().getHours();
    const horasTrabajadas = Math.max(1, hora - 8);
    const piezasPorMinuto = piezasTotal / (horasTrabajadas * 60) || 0.5;
    return Math.round(piezasPorMinuto * minutosParo);
}

// Obtener la estación con más tiempo muerto
function obtenerEstacionMasProblematica(historial) {
    if (!historial || historial.length === 0) return 'N/A';
    const porEstacion = {};
    historial.forEach(h => {
        if (!porEstacion[h.estacionId]) porEstacion[h.estacionId] = 0;
        porEstacion[h.estacionId] += h.duracionMinutos || 0;
    });
    const sorted = Object.entries(porEstacion).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? `${sorted[0][0]} (${sorted[0][1]} min)` : 'N/A';
}

// Calcular tendencia de tiempos muertos
function renderTendenciaTM(stats, filtro) {
    // Comparar con período anterior (simplificado)
    const historialPrevio = typeof getHistorialTiemposMuertos === 'function'
        ? getHistorialTiemposMuertos('semana') : [];

    const tiempoActual = stats.tiempoTotal || 0;

    // Si no hay datos previos suficientes, mostrar estable
    if (historialPrevio.length < 2) {
        return '<span class="tm-tendencia estable"><i class="fas fa-minus"></i> Sin datos previos</span>';
    }

    // Estimar basado en cantidad de registros
    const mitad = Math.floor(historialPrevio.length / 2);
    const primeraMitad = historialPrevio.slice(0, mitad).reduce((s, h) => s + (h.duracionMinutos || 0), 0);
    const segundaMitad = historialPrevio.slice(mitad).reduce((s, h) => s + (h.duracionMinutos || 0), 0);

    if (segundaMitad < primeraMitad * 0.8) {
        return '<span class="tm-tendencia mejorando"><i class="fas fa-arrow-down"></i> Mejorando</span>';
    } else if (segundaMitad > primeraMitad * 1.2) {
        return '<span class="tm-tendencia empeorando"><i class="fas fa-arrow-up"></i> Empeorando</span>';
    }
    return '<span class="tm-tendencia estable"><i class="fas fa-minus"></i> Estable</span>';
}
