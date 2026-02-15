// ========================================
// ERP MULTIFUNDAS - Módulo Dashboard
// Extraído de app.js líneas 916-3414
// ========================================

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

// Calcula KPIs ejecutivos avanzados para el dashboard
function calcularKPIsEjecutivos() {
    var pedidos = db.getPedidos() || [];
    var productos = db.getProductos() || [];
    var hoy = new Date();
    var hoyStr = hoy.toISOString().split('T')[0];

    // --- 1. ON-TIME DELIVERY RATE ---
    var pedidosConFecha = pedidos.filter(function(p) { return p.fechaEntrega; });
    var pedidosVencidos = pedidosConFecha.filter(function(p) {
        return new Date(p.fechaEntrega) <= hoy;
    });
    var pedidosEntregadosATiempo = pedidosVencidos.filter(function(p) {
        var estado = (p.estado || '').toLowerCase();
        return estado === 'entregado' || estado === 'completado';
    });
    var onTimeDeliveryRate = pedidosVencidos.length > 0
        ? Math.round((pedidosEntregadosATiempo.length / pedidosVencidos.length) * 100)
        : 100;

    // --- 2. PROFITABILITY: Margin % ---
    var pedidosActivos = filtrarPedidosActivos(pedidos);
    var totalVenta = 0;
    var totalCostoReal = 0;
    var totalPresupuesto = 0;
    pedidosActivos.forEach(function(pedido) {
        var ventaPedido = (pedido.productos || []).reduce(function(sum, p) {
            return sum + (p.cantidad || 0) * (p.precioUnitario || 0);
        }, 0);
        totalVenta += ventaPedido;
        totalCostoReal += pedido.costoReal || 0;
        totalPresupuesto += pedido.presupuestoEstimado || 0;
    });
    var margenBruto = totalVenta > 0
        ? Math.round(((totalVenta - totalCostoReal) / totalVenta) * 1000) / 10
        : 0;

    // --- 3. OPERATIONAL EFFICIENCY: Plant utilization ---
    var estaciones = db.data.estaciones || [];
    var totalEstaciones = estaciones.length;
    var estacionesOcupadas = estaciones.filter(function(e) { return e.operadorId !== null && e.operadorId !== undefined; }).length;
    var utilizacionPlanta = totalEstaciones > 0
        ? Math.round((estacionesOcupadas / totalEstaciones) * 100)
        : 0;

    // Productive vs Dead time
    var tiemposMuertos;
    try { tiemposMuertos = JSON.parse(localStorage.getItem('tiempos_muertos') || '{"activos":{},"historial":[]}'); }
    catch(e) { tiemposMuertos = {activos:{},historial:[]}; }
    var tiemposMuertosHoy = (tiemposMuertos.historial || []).filter(function(t) {
        return t.inicio && t.inicio.startsWith(hoyStr);
    });
    var minutosMuertosHoy = 0;
    tiemposMuertosHoy.forEach(function(t) {
        if (t.duracion) {
            minutosMuertosHoy += t.duracion;
        } else if (t.inicio && t.fin) {
            minutosMuertosHoy += (new Date(t.fin) - new Date(t.inicio)) / 60000;
        }
    });
    Object.values(tiemposMuertos.activos || {}).forEach(function(t) {
        if (t.inicio) minutosMuertosHoy += (hoy - new Date(t.inicio)) / 60000;
    });
    var horasLaboralesDia = 8.5;
    var minutosProductivosEsperados = estacionesOcupadas * horasLaboralesDia * 60;
    var tiempoProductivoPercent = minutosProductivosEsperados > 0
        ? Math.min(100, Math.round(((minutosProductivosEsperados - minutosMuertosHoy) / minutosProductivosEsperados) * 100))
        : 100;

    // --- 4. VOLUME METRICS ---
    var historial;
    try { historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]'); }
    catch(e) { historial = []; }
    var produccionHoy = historial.filter(function(h) { return h.fecha && h.fecha.startsWith(hoyStr); });
    var piezasHoy = produccionHoy.reduce(function(sum, h) { return sum + (h.cantidad || 0); }, 0);

    var inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0,0,0,0);
    var piezasSemana = historial.filter(function(h) {
        return h.fecha && new Date(h.fecha) >= inicioSemana;
    }).reduce(function(sum, h) { return sum + (h.cantidad || 0); }, 0);

    return {
        onTimeDeliveryRate: onTimeDeliveryRate,
        margenBruto: margenBruto,
        totalVenta: totalVenta,
        totalCostoReal: totalCostoReal,
        utilizacionPlanta: utilizacionPlanta,
        estacionesOcupadas: estacionesOcupadas,
        totalEstaciones: totalEstaciones,
        tiempoProductivoPercent: tiempoProductivoPercent,
        minutosMuertosHoy: Math.round(minutosMuertosHoy),
        piezasHoy: piezasHoy,
        piezasSemana: piezasSemana,
        pedidosActivosCount: pedidosActivos.length
    };
}

// ========================================
// DASHBOARD CONFIGURABLE
// ========================================
var DASHBOARD_WIDGETS = {
    kpis: 'KPIs Principales',
    kpis_ejecutivos: 'KPIs Ejecutivos',
    metricas: 'Métricas (Efectividad / Costos)',
    alertas: 'Alertas Activas',
    centro_acciones: 'Centro de Acciones',
    proyecciones: 'Proyecciones',
    costos: 'Comparación Costo Real vs Estimado',
    pedidos_pendientes: 'Pedidos Pendientes',
    pedidos_criticos: 'Pedidos Críticos'
};

function getDashboardConfig() {
    try {
        return JSON.parse(localStorage.getItem('erp_dashboard_config') || '{}');
    } catch(e) { return {}; }
}

function applyDashboardConfig() {
    var config = getDashboardConfig();
    document.querySelectorAll('[data-widget]').forEach(function(el) {
        var key = el.dataset.widget;
        if (config[key] === false) {
            el.style.display = 'none';
        } else {
            el.style.display = '';
        }
    });
}

function showDashboardConfig() {
    var config = getDashboardConfig();
    var html = '<div style="padding:8px 0;">';
    Object.keys(DASHBOARD_WIDGETS).forEach(function(key) {
        var checked = config[key] !== false ? 'checked' : '';
        html += '<label style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(100,116,139,0.15);cursor:pointer;">' +
            '<input type="checkbox" ' + checked + ' onchange="toggleDashboardWidget(\'' + key + '\', this.checked)" ' +
            'style="width:18px;height:18px;accent-color:#667eea;">' +
            '<span style="flex:1;">' + DASHBOARD_WIDGETS[key] + '</span>' +
            '</label>';
    });
    html += '</div>';
    html += '<div style="margin-top:12px;text-align:right;">' +
        '<button class="btn btn-secondary btn-sm" onclick="resetDashboardConfig()" style="margin-right:8px;">' +
        '<i class="fas fa-undo"></i> Restaurar</button>' +
        '<button class="btn btn-primary btn-sm" onclick="closeModal()">' +
        '<i class="fas fa-check"></i> Listo</button></div>';

    openModal('Configurar Dashboard', html);
}

function toggleDashboardWidget(key, visible) {
    var config = getDashboardConfig();
    config[key] = visible;
    localStorage.setItem('erp_dashboard_config', JSON.stringify(config));
    applyDashboardConfig();
}

function resetDashboardConfig() {
    localStorage.removeItem('erp_dashboard_config');
    applyDashboardConfig();
    showDashboardConfig();
}

function loadDashboard() {
    // Aplicar configuración de widgets visibles
    applyDashboardConfig();

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

    // Cargar KPIs Ejecutivos
    var kpisEjec = calcularKPIsEjecutivos();
    var onTimeEl = document.getElementById('kpiOnTimeRate');
    if (onTimeEl) {
        onTimeEl.textContent = kpisEjec.onTimeDeliveryRate + '%';
        onTimeEl.className = 'kpi-value ' + (kpisEjec.onTimeDeliveryRate >= 90 ? 'text-success' :
            kpisEjec.onTimeDeliveryRate >= 70 ? 'text-warning' : 'text-danger');
    }
    var onTimeTrend = document.getElementById('kpiOnTimeTrend');
    if (onTimeTrend) {
        onTimeTrend.textContent = kpisEjec.onTimeDeliveryRate >= 90 ? 'Saludable' :
            kpisEjec.onTimeDeliveryRate >= 70 ? 'Atención' : 'Crítico';
        onTimeTrend.className = 'kpi-trend ' + (kpisEjec.onTimeDeliveryRate >= 90 ? 'up' : 'down');
    }
    var margenEl = document.getElementById('kpiMargenBruto');
    if (margenEl) {
        margenEl.textContent = kpisEjec.margenBruto + '%';
        margenEl.className = 'kpi-value ' + (kpisEjec.margenBruto >= 25 ? 'text-success' :
            kpisEjec.margenBruto >= 10 ? 'text-warning' : 'text-danger');
    }
    var margenDetalle = document.getElementById('kpiMargenDetalle');
    if (margenDetalle) {
        margenDetalle.textContent = 'Venta $' + kpisEjec.totalVenta.toLocaleString() +
            ' | Costo $' + kpisEjec.totalCostoReal.toLocaleString();
    }
    var utilEl = document.getElementById('kpiUtilizacion');
    if (utilEl) utilEl.textContent = kpisEjec.utilizacionPlanta + '%';
    var utilDetalle = document.getElementById('kpiUtilizacionDetalle');
    if (utilDetalle) {
        utilDetalle.textContent = kpisEjec.estacionesOcupadas + '/' +
            kpisEjec.totalEstaciones + ' estaciones | ' +
            kpisEjec.tiempoProductivoPercent + '% productivo';
    }
    var piezasEl = document.getElementById('kpiPiezasHoy');
    if (piezasEl) piezasEl.textContent = kpisEjec.piezasHoy.toLocaleString();
    var piezasSemEl = document.getElementById('kpiPiezasSemana');
    if (piezasSemEl) piezasSemEl.textContent = 'Semana: ' + kpisEjec.piezasSemana.toLocaleString() + ' pzas';

    // Cargar mapa de planta
    loadPlantMap();

    // Cargar alertas
    loadAlertas();

    // Cargar proyecciones
    loadProjections();

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
    const asignacionesEstaciones = safeLocalGet('asignaciones_estaciones', {});
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
    const supervisoraMaquinas = safeLocalGet('supervisora_maquinas', {});

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
                ? `${S(operadorNombre || 'Operador')} - ${S(procesoTooltip)}${piezasHoy > 0 ? ` (${piezasHoy} pzas)` : ''}`
                : operadorNombre
                    ? `${S(operadorNombre)} - Sin proceso`
                    : S(pos.nombre);

            if (!operadorNombre && !tieneAsignacion) {
                return `
                    <div class="workstation empty clickable" data-tooltip="${S(pos.nombre)}" data-id="${pos.id}" onclick="showPosicionDetalle('${pos.id}')">
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
                <div class="workstation ${estado} clickable" data-tooltip="${S(tooltip)}" data-id="${pos.id}" onclick="showPosicionDetalle('${pos.id}')" style="${colorBorde ? `border-color: ${S(colorBorde)}; border-width: 2px;` : ''}">
                    <span class="workstation-initials">${S(iniciales)}</span>
                    <span class="workstation-code">${pos.id}</span>
                    ${tieneAsignacion ? `<span class="workstation-proceso" title="${S(procesoTooltip)}">${S(procesoTexto.substring(0, 10))}${procesoTexto.length > 10 ? '..' : ''}</span>` : ''}
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
                    ${S(area.nombre)}${posicionesLabel}
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
                <a href="layout-editor.html" class="btn btn-primary" style="margin-top:8px;" target="_blank">
                    <i class="fas fa-drafting-compass"></i> Abrir Editor de Mapa
                </a>
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
                                    <h4>${S(area.nombre)}</h4>
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
                <input type="text" name="nombre" value="${S(area.nombre)}" required>
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

    DEBUG_MODE && console.log('Agregando posiciones:', { areaId, cantidad, ultimoNumero });

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

    DEBUG_MODE && console.log('Posiciones guardadas. Total en área:', nuevaCantidadTotal);

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
            <h4>¿Eliminar área "${S(area.nombre)}"?</h4>
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
                <h4 style="margin: 0; color: ${S(area.color)}">${S(area.nombre)}</h4>
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
                                <span class="estacion-list-nombre">${S(est.nombre)}</span>
                            </div>
                            <div class="estacion-list-operador">
                                ${operador ? `
                                    <span class="badge badge-${estado?.estado || 'empty'}">${S(operador.nombre)}</span>
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
    const asignaciones = safeLocalGet('asignaciones_estaciones', {});
    if (asignaciones[idAnterior]) {
        asignaciones[idNuevo] = asignaciones[idAnterior];
        delete asignaciones[idAnterior];
        localStorage.setItem('asignaciones_estaciones', JSON.stringify(asignaciones));
    }

    // Actualizar estado_maquinas
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
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
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
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

    DEBUG_MODE && console.log('[SYNC] Estaciones sincronizadas con paneles:', Object.keys(mapaEstaciones).length);
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
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
    estadoMaquinas[estacionId] = {
        estacionId: estacionId,
        operadorId: empleado.id,
        operadorNombre: empleado.nombre,
        iniciales: getIniciales(empleado.nombre),
        estado: 'inactivo',
        ultimaActualizacion: new Date().toISOString()
    };
    localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));

    DEBUG_MODE && console.log(`[MAPA] Operador ${empleado.nombre} asignado a estación ${estacionId}`);
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
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
    if (estadoMaquinas[estacionId]) {
        delete estadoMaquinas[estacionId];
        localStorage.setItem('estado_maquinas', JSON.stringify(estadoMaquinas));
    }

    DEBUG_MODE && console.log(`[MAPA] Estación ${estacionId} desasignada`);
}

// ========================================
// ALERTAS INTELIGENTES
// ========================================
function loadAlertas() {
    var container = document.getElementById('alertsContainer');
    if (!container) return;

    var alertas = generarAlertasDinamicas();

    if (alertas.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No hay alertas activas</p>';
        return;
    }

    // Mostrar hasta 6 alertas, resto colapsable
    var visibles = alertas.slice(0, 6);
    var ocultas = alertas.slice(6);

    container.innerHTML = visibles.map(function(alerta, index) {
        return '<div class="alert-card ' + alerta.tipo + '" data-categoria="' + (alerta.categoria || '') + '">' +
            '<div class="alert-icon"><i class="fas ' + getAlertIcon(alerta) + '"></i></div>' +
            '<div class="alert-content">' +
                '<span class="alert-title">' + S(alerta.titulo) + '</span>' +
                '<span class="alert-detail">' + S(alerta.mensaje) + '</span>' +
            '</div>' +
            '<div class="alert-actions">' +
                (alerta.accion ? '<button class="btn-small" onclick="' + alerta.accion + '">Revisar</button>' : '') +
                (alerta.escalable ? '<button class="btn-small btn-escalar" onclick="escalarAlertaASupervisora(' + index + ')" title="Enviar a Supervisora"><i class="fas fa-arrow-up"></i> Escalar</button>' : '') +
            '</div>' +
        '</div>';
    }).join('');

    if (ocultas.length > 0) {
        container.innerHTML += '<button class="btn btn-secondary btn-sm btn-ver-mas-alertas" onclick="toggleAlertasOcultas()">' +
            '<i class="fas fa-chevron-down"></i> Ver ' + ocultas.length + ' alertas más</button>' +
            '<div id="alertasOcultas" style="display:none">' +
            ocultas.map(function(alerta, i) {
                var idx = i + 6;
                return '<div class="alert-card ' + alerta.tipo + '" data-categoria="' + (alerta.categoria || '') + '" style="margin-top:8px;">' +
                    '<div class="alert-icon"><i class="fas ' + getAlertIcon(alerta) + '"></i></div>' +
                    '<div class="alert-content">' +
                        '<span class="alert-title">' + S(alerta.titulo) + '</span>' +
                        '<span class="alert-detail">' + S(alerta.mensaje) + '</span>' +
                    '</div>' +
                    '<div class="alert-actions">' +
                        (alerta.accion ? '<button class="btn-small" onclick="' + alerta.accion + '">Revisar</button>' : '') +
                        (alerta.escalable ? '<button class="btn-small btn-escalar" onclick="escalarAlertaASupervisora(' + idx + ')"><i class="fas fa-arrow-up"></i> Escalar</button>' : '') +
                    '</div></div>';
            }).join('') + '</div>';
    }

    // Almacenar alertas para referencia de escalamiento
    window._alertasActuales = alertas;
}

function getAlertIcon(alerta) {
    var iconMap = {
        'eficiencia': 'fa-tachometer-alt',
        'tiempos_muertos': 'fa-pause-circle',
        'capacidad': 'fa-warehouse',
        'costos': 'fa-money-bill-wave'
    };
    if (alerta.categoria && iconMap[alerta.categoria]) return iconMap[alerta.categoria];
    if (alerta.tipo === 'danger') return 'fa-times-circle';
    if (alerta.tipo === 'warning') return 'fa-exclamation-circle';
    return 'fa-info-circle';
}

function toggleAlertasOcultas() {
    var el = document.getElementById('alertasOcultas');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Genera alertas dinámicas basadas en el estado actual del sistema
function generarAlertasDinamicas() {
    var alertas = [];
    var pedidos = db.getPedidos() || [];
    var productos = db.getProductos() || [];
    var hoy = new Date();

    // Alerta: Pedidos atrasados
    pedidos.forEach(function(pedido) {
        if (!pedido.fechaEntrega) return;
        var entrega = new Date(pedido.fechaEntrega);
        var diasRestantes = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));
        var estado = (pedido.estado || '').toLowerCase();

        if (['entregado', 'cancelado', 'anulado'].includes(estado)) return;

        if (diasRestantes < 0) {
            alertas.push({
                tipo: 'danger',
                prioridadNivel: 1,
                titulo: 'Pedido atrasado',
                mensaje: 'Pedido #' + pedido.id + ' tiene ' + Math.abs(diasRestantes) + ' días de atraso',
                accion: 'viewPedido(' + pedido.id + ')',
                escalable: true,
                categoria: 'entregas',
                pedidoId: pedido.id
            });
        } else if (diasRestantes <= 2) {
            var avance = calcularAvancePedido(pedido, productos);
            if (avance < 80) {
                alertas.push({
                    tipo: 'warning',
                    prioridadNivel: 2,
                    titulo: 'Pedido en riesgo',
                    mensaje: 'Pedido #' + pedido.id + ' entrega en ' + diasRestantes + ' días con ' + avance + '% avance',
                    accion: 'viewPedido(' + pedido.id + ')',
                    escalable: true,
                    categoria: 'entregas',
                    pedidoId: pedido.id
                });
            }
        }
    });

    // Alerta: Pedidos sin asignar
    var pedidosSinAsignar = pedidos.filter(function(p) {
        var estado = (p.estado || 'pendiente').toLowerCase();
        return estado === 'pendiente';
    });
    if (pedidosSinAsignar.length > 0) {
        alertas.push({
            tipo: 'info',
            prioridadNivel: 3,
            titulo: 'Pedidos sin asignar',
            mensaje: 'Hay ' + pedidosSinAsignar.length + ' pedido(s) pendiente(s) de asignación',
            accion: "navigateTo('pedidos')",
            escalable: false,
            categoria: 'asignacion'
        });
    }

    // NUEVA: Baja eficiencia detectada
    var estadoOps = db.getEstadoOperadores ? db.getEstadoOperadores() : (db.data.estadoOperadores || []);
    var opsLowEff = estadoOps.filter(function(e) {
        return e.estado !== 'inactivo' && e.efectividad > 0 && e.efectividad < 60;
    });
    if (opsLowEff.length > 0) {
        alertas.push({
            tipo: 'warning',
            prioridadNivel: 2,
            titulo: 'Baja eficiencia detectada',
            mensaje: opsLowEff.length + ' operador(es) por debajo del 60% de efectividad',
            accion: "showKPIDetalle('efectividad')",
            escalable: true,
            categoria: 'eficiencia'
        });
    }

    // NUEVA: Tiempos muertos prolongados (>30 min)
    var tiemposMuertos;
    try { tiemposMuertos = JSON.parse(localStorage.getItem('tiempos_muertos') || '{"activos":{},"historial":[]}'); }
    catch(e) { tiemposMuertos = {activos:{},historial:[]}; }
    var tmActivos = Object.entries(tiemposMuertos.activos || {});
    var tmLargos = tmActivos.filter(function(entry) {
        var minutos = (new Date() - new Date(entry[1].inicio)) / 60000;
        return minutos > 30;
    });
    if (tmLargos.length > 0) {
        alertas.push({
            tipo: 'danger',
            prioridadNivel: 1,
            titulo: 'Tiempos muertos prolongados',
            mensaje: tmLargos.length + ' estación(es) con paro >30 min: ' + tmLargos.map(function(e) { return e[0]; }).join(', '),
            accion: null,
            escalable: true,
            categoria: 'tiempos_muertos'
        });
    }

    // NUEVA: Capacidad al límite
    var estaciones = db.data.estaciones || [];
    var totalEstaciones = estaciones.length;
    var ocupadas = estaciones.filter(function(e) { return e.operadorId !== null && e.operadorId !== undefined; }).length;
    var utilizacion = totalEstaciones > 0 ? (ocupadas / totalEstaciones) * 100 : 0;
    if (utilizacion > 80 && pedidosSinAsignar.length > 2) {
        alertas.push({
            tipo: 'warning',
            prioridadNivel: 2,
            titulo: 'Capacidad al límite',
            mensaje: 'Planta al ' + Math.round(utilizacion) + '% con ' + pedidosSinAsignar.length + ' pedidos pendientes de iniciar',
            accion: null,
            escalable: true,
            categoria: 'capacidad'
        });
    }

    // NUEVA: Sobrecosto por pedido (>15% sobre presupuesto)
    var pedidosActivos = filtrarPedidosActivos(pedidos);
    pedidosActivos.forEach(function(pedido) {
        if (pedido.presupuestoEstimado > 0 && pedido.costoReal > 0) {
            var variacion = ((pedido.costoReal - pedido.presupuestoEstimado) / pedido.presupuestoEstimado) * 100;
            if (variacion > 15) {
                alertas.push({
                    tipo: 'danger',
                    prioridadNivel: 1,
                    titulo: 'Sobrecosto en pedido',
                    mensaje: 'Pedido #' + pedido.id + ' excede presupuesto en ' + Math.round(variacion) + '%',
                    accion: 'viewPedido(' + pedido.id + ')',
                    escalable: true,
                    categoria: 'costos',
                    pedidoId: pedido.id
                });
            }
        }
    });

    // Ordenar por prioridad (1=crítico primero)
    alertas.sort(function(a, b) { return (a.prioridadNivel || 3) - (b.prioridadNivel || 3); });

    return alertas;
}

// ========================================
// COMUNICACIÓN CON SUPERVISORA
// ========================================

function enviarNotificacionASupervisora(notif) {
    var notificaciones;
    try { notificaciones = JSON.parse(localStorage.getItem('notificaciones_admin_to_supervisora') || '[]'); }
    catch(e) { notificaciones = []; }

    var nueva = {
        id: Date.now(),
        tipo: notif.tipo || 'mensaje',
        titulo: notif.titulo || 'Mensaje de Dirección',
        mensaje: notif.mensaje || '',
        prioridad: notif.prioridad || 'media',
        pedidoId: notif.pedidoId || null,
        alertaOrigen: notif.alertaOrigen || null,
        remitente: 'Dirección',
        fecha: new Date().toISOString(),
        leida: false
    };
    notificaciones.unshift(nueva);
    localStorage.setItem('notificaciones_admin_to_supervisora',
        JSON.stringify(notificaciones.slice(0, 100)));

    registrarAlertaHistorial({
        tipo: 'escalamiento_enviado',
        destino: 'supervisora',
        notificacion: nueva
    });

    showToast('Notificación enviada a Supervisora', 'success');
    return nueva;
}

function registrarAlertaHistorial(data) {
    var historial;
    try { historial = JSON.parse(localStorage.getItem('historial_alertas_admin') || '[]'); }
    catch(e) { historial = []; }
    historial.unshift({
        id: Date.now(),
        fecha: new Date().toISOString(),
        tipo: data.tipo,
        destino: data.destino,
        notificacion: data.notificacion
    });
    localStorage.setItem('historial_alertas_admin', JSON.stringify(historial.slice(0, 500)));
}

function escalarAlertaASupervisora(alertIndex) {
    var alerta = window._alertasActuales && window._alertasActuales[alertIndex];
    if (!alerta) {
        showToast('Alerta no encontrada', 'warning');
        return;
    }

    var content = '<div class="escalamiento-form">' +
        '<div class="alert-card ' + alerta.tipo + '" style="margin-bottom:16px;">' +
            '<div class="alert-icon"><i class="fas ' + getAlertIcon(alerta) + '"></i></div>' +
            '<div class="alert-content">' +
                '<span class="alert-title">' + S(alerta.titulo) + '</span>' +
                '<span class="alert-detail">' + S(alerta.mensaje) + '</span>' +
            '</div>' +
        '</div>' +
        '<div class="form-group">' +
            '<label>Mensaje para Supervisora (opcional)</label>' +
            '<textarea id="escalarMensaje" rows="3" placeholder="Instrucciones o contexto adicional..."></textarea>' +
        '</div>' +
        '<div class="form-group">' +
            '<label>Prioridad</label>' +
            '<select id="escalarPrioridad">' +
                '<option value="alta">Alta - Atender de inmediato</option>' +
                '<option value="media" selected>Media - Atender pronto</option>' +
                '<option value="baja">Baja - Informativo</option>' +
            '</select>' +
        '</div>' +
    '</div>';

    openModal('Escalar Alerta a Supervisora', content, function() {
        var mensaje = document.getElementById('escalarMensaje').value;
        var prioridad = document.getElementById('escalarPrioridad').value;

        enviarNotificacionASupervisora({
            tipo: 'escalamiento',
            titulo: 'ESCALAMIENTO: ' + alerta.titulo,
            mensaje: (mensaje ? mensaje + ' | ' : '') + 'Detalle: ' + alerta.mensaje,
            prioridad: prioridad,
            pedidoId: alerta.pedidoId || null,
            alertaOrigen: { tipo: alerta.tipo, categoria: alerta.categoria, titulo: alerta.titulo }
        });

        closeModal();
    });
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
        const avance = calcularAvancePedido(pedido, productos);

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
// PROYECCIONES PREDICTIVAS
// ========================================
function loadProjections() {
    var container = document.getElementById('projectionsContainer');
    if (!container) return;

    var pedidos = db.getPedidos() || [];
    var productos = db.getProductos() || [];
    var hoy = new Date();
    var pedidosActivos = filtrarPedidosActivos(pedidos);

    // --- Obtener tasa de producción diaria (últimos 7 días) ---
    var historial;
    try { historial = JSON.parse(localStorage.getItem('historial_produccion') || '[]'); }
    catch(e) { historial = []; }

    var hace7dias = new Date(hoy);
    hace7dias.setDate(hoy.getDate() - 7);
    var produccionSemana = historial.filter(function(h) {
        return h.fecha && new Date(h.fecha) >= hace7dias;
    });
    var piezasTotalesSemana = produccionSemana.reduce(function(sum, h) { return sum + (h.cantidad || 0); }, 0);
    var diasConProduccion = new Set();
    produccionSemana.forEach(function(h) {
        if (h.fecha) diasConProduccion.add(h.fecha.split('T')[0]);
    });
    var diasActivos = Math.max(diasConProduccion.size, 1);
    var tasaDiaria = Math.round(piezasTotalesSemana / diasActivos);

    // --- 1. PROYECCIÓN DE ENTREGAS ---
    var pedidosEnRiesgo = [];
    var pedidosEnTiempo = 0;
    pedidosActivos.forEach(function(pedido) {
        if (!pedido.fechaEntrega) return;
        var entrega = new Date(pedido.fechaEntrega);
        var diasDisponibles = Math.ceil((entrega - hoy) / (1000 * 60 * 60 * 24));
        if (diasDisponibles < 0) diasDisponibles = 0;

        var totalPiezas = (pedido.productos || []).reduce(function(sum, p) { return sum + (p.cantidad || 0); }, 0);
        var avance = calcularAvancePedido(pedido, productos);
        var piezasRestantes = Math.round(totalPiezas * (1 - avance / 100));

        var diasNecesarios = tasaDiaria > 0 ? Math.ceil(piezasRestantes / tasaDiaria) : 999;

        if (diasNecesarios > diasDisponibles && avance < 95) {
            var riesgo = diasNecesarios - diasDisponibles > 3 ? 'alto' : 'medio';
            pedidosEnRiesgo.push({
                id: pedido.id,
                diasDisponibles: diasDisponibles,
                diasNecesarios: diasNecesarios,
                avance: avance,
                piezasRestantes: piezasRestantes,
                riesgo: riesgo
            });
        } else {
            pedidosEnTiempo++;
        }
    });
    pedidosEnRiesgo.sort(function(a, b) { return a.diasDisponibles - b.diasDisponibles; });

    // --- 2. PROYECCIÓN DE COSTOS ---
    var pedidosSobrecosto = [];
    var pedidosDentroPpto = 0;
    pedidosActivos.forEach(function(pedido) {
        var presupuesto = pedido.presupuestoEstimado || 0;
        var costoActual = pedido.costoReal || 0;
        if (presupuesto <= 0 || costoActual <= 0) return;

        var avance = calcularAvancePedido(pedido, productos);
        if (avance < 5) return; // Muy poco avance para proyectar

        var costoProyectado = Math.round((costoActual / (avance / 100)));
        var variacion = Math.round(((costoProyectado - presupuesto) / presupuesto) * 100);

        if (variacion > 10) {
            pedidosSobrecosto.push({
                id: pedido.id,
                presupuesto: presupuesto,
                costoActual: costoActual,
                costoProyectado: costoProyectado,
                variacion: variacion,
                avance: avance
            });
        } else {
            pedidosDentroPpto++;
        }
    });
    pedidosSobrecosto.sort(function(a, b) { return b.variacion - a.variacion; });

    // --- 3. CAPACIDAD ---
    var estaciones = db.data.estaciones || [];
    var totalEstaciones = estaciones.length;
    var estacionesOcupadas = estaciones.filter(function(e) { return e.operadorId !== null && e.operadorId !== undefined; }).length;
    var piezasPendientesTotal = 0;
    pedidosActivos.forEach(function(pedido) {
        var totalPiezas = (pedido.productos || []).reduce(function(sum, p) { return sum + (p.cantidad || 0); }, 0);
        var avance = calcularAvancePedido(pedido, productos);
        piezasPendientesTotal += Math.round(totalPiezas * (1 - avance / 100));
    });
    var diasBacklog = tasaDiaria > 0 ? Math.ceil(piezasPendientesTotal / tasaDiaria) : 0;
    var pedidosSinIniciar = pedidosActivos.filter(function(p) {
        return esPedidoPendiente(p);
    }).length;

    // --- RENDER ---
    var html = '';

    // Card 1: Entregas
    var entregaColor = pedidosEnRiesgo.length === 0 ? 'success' : (pedidosEnRiesgo.filter(function(p) { return p.riesgo === 'alto'; }).length > 0 ? 'danger' : 'warning');
    html += '<div class="projection-card">';
    html += '<div class="projection-header ' + entregaColor + '">';
    html += '<i class="fas fa-shipping-fast"></i>';
    html += '<span>Entregas</span>';
    html += '</div>';
    html += '<div class="projection-summary">';
    if (pedidosEnRiesgo.length === 0) {
        html += '<div class="projection-number success">' + pedidosEnTiempo + '</div>';
        html += '<div class="projection-label">pedidos en tiempo</div>';
    } else {
        html += '<div class="projection-number ' + entregaColor + '">' + pedidosEnRiesgo.length + '</div>';
        html += '<div class="projection-label">pedidos en riesgo de atraso</div>';
    }
    html += '</div>';
    html += '<div class="projection-detail">';
    if (pedidosEnRiesgo.length > 0) {
        pedidosEnRiesgo.slice(0, 4).forEach(function(p) {
            html += '<div class="projection-row ' + p.riesgo + '">';
            html += '<span class="projection-row-label">#' + p.id + '</span>';
            html += '<span class="projection-row-value">Faltan ' + p.diasNecesarios + 'd / Quedan ' + p.diasDisponibles + 'd</span>';
            html += '</div>';
        });
        if (pedidosEnRiesgo.length > 4) {
            html += '<div class="projection-row-more">+' + (pedidosEnRiesgo.length - 4) + ' más</div>';
        }
    } else {
        html += '<div class="projection-row success">';
        html += '<span class="projection-row-label">Tasa diaria</span>';
        html += '<span class="projection-row-value">' + tasaDiaria.toLocaleString() + ' pzas/día</span>';
        html += '</div>';
    }
    html += '</div></div>';

    // Card 2: Costos
    var costoColor = pedidosSobrecosto.length === 0 ? 'success' : (pedidosSobrecosto.filter(function(p) { return p.variacion > 25; }).length > 0 ? 'danger' : 'warning');
    html += '<div class="projection-card">';
    html += '<div class="projection-header ' + costoColor + '">';
    html += '<i class="fas fa-dollar-sign"></i>';
    html += '<span>Costos</span>';
    html += '</div>';
    html += '<div class="projection-summary">';
    if (pedidosSobrecosto.length === 0) {
        html += '<div class="projection-number success">' + pedidosDentroPpto + '</div>';
        html += '<div class="projection-label">pedidos dentro de presupuesto</div>';
    } else {
        html += '<div class="projection-number ' + costoColor + '">' + pedidosSobrecosto.length + '</div>';
        html += '<div class="projection-label">pedidos proyectan sobrecosto</div>';
    }
    html += '</div>';
    html += '<div class="projection-detail">';
    if (pedidosSobrecosto.length > 0) {
        pedidosSobrecosto.slice(0, 4).forEach(function(p) {
            var riesgoClass = p.variacion > 25 ? 'alto' : 'medio';
            html += '<div class="projection-row ' + riesgoClass + '">';
            html += '<span class="projection-row-label">#' + p.id + '</span>';
            html += '<span class="projection-row-value">+' + p.variacion + '% sobre ppto</span>';
            html += '</div>';
        });
        if (pedidosSobrecosto.length > 4) {
            html += '<div class="projection-row-more">+' + (pedidosSobrecosto.length - 4) + ' más</div>';
        }
    } else {
        html += '<div class="projection-row success">';
        html += '<span class="projection-row-label">Sin alertas</span>';
        html += '<span class="projection-row-value">Costos controlados</span>';
        html += '</div>';
    }
    html += '</div></div>';

    // Card 3: Capacidad
    var capPercent = totalEstaciones > 0 ? Math.round((estacionesOcupadas / totalEstaciones) * 100) : 0;
    var capColor = capPercent > 85 ? 'danger' : (capPercent > 60 ? 'warning' : 'success');
    html += '<div class="projection-card">';
    html += '<div class="projection-header ' + capColor + '">';
    html += '<i class="fas fa-industry"></i>';
    html += '<span>Capacidad</span>';
    html += '</div>';
    html += '<div class="projection-summary">';
    html += '<div class="projection-number ' + capColor + '">' + diasBacklog + '</div>';
    html += '<div class="projection-label">días de backlog estimado</div>';
    html += '</div>';
    html += '<div class="projection-detail">';
    html += '<div class="projection-row info">';
    html += '<span class="projection-row-label">Estaciones</span>';
    html += '<span class="projection-row-value">' + estacionesOcupadas + '/' + totalEstaciones + ' ocupadas (' + capPercent + '%)</span>';
    html += '</div>';
    html += '<div class="projection-row info">';
    html += '<span class="projection-row-label">Piezas pendientes</span>';
    html += '<span class="projection-row-value">' + piezasPendientesTotal.toLocaleString() + '</span>';
    html += '</div>';
    html += '<div class="projection-row info">';
    html += '<span class="projection-row-label">Sin iniciar</span>';
    html += '<span class="projection-row-value">' + pedidosSinIniciar + ' pedidos</span>';
    html += '</div>';
    html += '</div></div>';

    container.innerHTML = html;
}

function refreshProjections() {
    loadProjections();
    showToast('Proyecciones actualizadas', 'info');
}

// ========================================
// CENTRO DE ACCIONES EJECUTIVO
// ========================================
function abrirMensajeSupervisora() {
    var pedidos = filtrarPedidosActivos(db.getPedidos() || []);
    var opcionesPedidos = '<option value="">-- Ninguno --</option>';
    pedidos.forEach(function(p) {
        opcionesPedidos += '<option value="' + p.id + '">#' + p.id + ' - ' + (p.cliente || 'Sin cliente') + '</option>';
    });

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalMensajeSupervisora';
    modal.innerHTML = '<div class="modal-content" style="max-width:500px;">' +
        '<div class="modal-header"><h3><i class="fas fa-comment-dots"></i> Mensaje a Supervisora</h3>' +
        '<button class="modal-close" onclick="cerrarModal(\'modalMensajeSupervisora\')">&times;</button></div>' +
        '<div class="modal-body">' +
        '<div class="form-group"><label>Prioridad</label>' +
        '<select id="msgPrioridad" class="form-control">' +
        '<option value="baja">Baja - Informativo</option>' +
        '<option value="media" selected>Media - Requiere atención</option>' +
        '<option value="alta">Alta - Urgente</option>' +
        '<option value="critica">Crítica - Acción inmediata</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Pedido relacionado (opcional)</label>' +
        '<select id="msgPedidoRelacionado" class="form-control">' + opcionesPedidos + '</select></div>' +
        '<div class="form-group"><label>Mensaje</label>' +
        '<textarea id="msgTexto" class="form-control" rows="4" placeholder="Escribe tu mensaje para la supervisora..."></textarea></div>' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="cerrarModal(\'modalMensajeSupervisora\')">Cancelar</button>' +
        '<button class="btn btn-primary" onclick="enviarMensajeSupervisora()"><i class="fas fa-paper-plane"></i> Enviar</button>' +
        '</div></div>';
    document.body.appendChild(modal);
    setTimeout(function() { modal.classList.add('active'); }, 10);
}

function enviarMensajeSupervisora() {
    var mensaje = document.getElementById('msgTexto').value.trim();
    if (!mensaje) {
        showToast('Escribe un mensaje', 'warning');
        return;
    }
    var prioridad = document.getElementById('msgPrioridad').value;
    var pedidoId = document.getElementById('msgPedidoRelacionado').value || null;

    enviarNotificacionASupervisora({
        tipo: 'mensaje_direccion',
        titulo: 'Mensaje de Dirección',
        mensaje: mensaje,
        prioridad: prioridad,
        pedidoId: pedidoId ? parseInt(pedidoId) : null
    });

    cerrarModal('modalMensajeSupervisora');
}

function abrirFlagPrioridad() {
    var pedidos = filtrarPedidosActivos(db.getPedidos() || []);
    var opcionesPedidos = '';
    pedidos.forEach(function(p) {
        opcionesPedidos += '<option value="' + p.id + '">#' + p.id + ' - ' + (p.cliente || 'Sin cliente') + '</option>';
    });

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalFlagPrioridad';
    modal.innerHTML = '<div class="modal-content" style="max-width:500px;">' +
        '<div class="modal-header"><h3><i class="fas fa-flag"></i> Marcar Pedido Prioritario</h3>' +
        '<button class="modal-close" onclick="cerrarModal(\'modalFlagPrioridad\')">&times;</button></div>' +
        '<div class="modal-body">' +
        '<div class="form-group"><label>Seleccionar Pedido</label>' +
        '<select id="flagPedido" class="form-control">' + opcionesPedidos + '</select></div>' +
        '<div class="form-group"><label>Nueva Prioridad</label>' +
        '<select id="flagNuevaPrioridad" class="form-control">' +
        '<option value="alta">Alta</option>' +
        '<option value="urgente" selected>Urgente</option>' +
        '<option value="critica">Crítica</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Motivo</label>' +
        '<textarea id="flagMotivo" class="form-control" rows="3" placeholder="Motivo del cambio de prioridad..."></textarea></div>' +
        '</div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="cerrarModal(\'modalFlagPrioridad\')">Cancelar</button>' +
        '<button class="btn btn-primary" onclick="ejecutarFlagPrioridad()"><i class="fas fa-flag"></i> Marcar</button>' +
        '</div></div>';
    document.body.appendChild(modal);
    setTimeout(function() { modal.classList.add('active'); }, 10);
}

function ejecutarFlagPrioridad() {
    var pedidoId = document.getElementById('flagPedido').value;
    var nuevaPrioridad = document.getElementById('flagNuevaPrioridad').value;
    var motivo = document.getElementById('flagMotivo').value.trim();

    if (!pedidoId) {
        showToast('Selecciona un pedido', 'warning');
        return;
    }

    // Actualizar prioridad del pedido en DB
    var pedido = db.getPedidos().find(function(p) { return p.id == pedidoId; });
    if (pedido) {
        pedido.prioridad = nuevaPrioridad;
        db.savePedidos(db.getPedidos());
    }

    // Notificar a supervisora
    enviarNotificacionASupervisora({
        tipo: 'cambio_prioridad',
        titulo: 'Cambio de Prioridad - Pedido #' + pedidoId,
        mensaje: 'Dirección ha marcado el pedido #' + pedidoId + ' como ' + nuevaPrioridad.toUpperCase() + (motivo ? '. Motivo: ' + motivo : ''),
        prioridad: 'alta',
        pedidoId: parseInt(pedidoId)
    });

    registrarAlertaHistorial({
        tipo: 'cambio_prioridad',
        destino: 'supervisora',
        notificacion: { pedidoId: pedidoId, nuevaPrioridad: nuevaPrioridad, motivo: motivo }
    });

    cerrarModal('modalFlagPrioridad');
    showToast('Pedido #' + pedidoId + ' marcado como ' + nuevaPrioridad, 'success');
}

function solicitarStatusUpdate() {
    enviarNotificacionASupervisora({
        tipo: 'solicitud_reporte',
        titulo: 'Solicitud de Reporte de Planta',
        mensaje: 'Dirección solicita un reporte actualizado del estado de planta, producción activa y estaciones.',
        prioridad: 'alta'
    });

    registrarAlertaHistorial({
        tipo: 'solicitud_reporte',
        destino: 'supervisora',
        notificacion: { mensaje: 'Solicitud de reporte de planta enviada' }
    });
}

function verHistorialAcciones() {
    var historial;
    try { historial = JSON.parse(localStorage.getItem('historial_alertas_admin') || '[]'); }
    catch(e) { historial = []; }

    var html = '';
    if (historial.length === 0) {
        html = '<div style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-history" style="font-size:2rem;margin-bottom:10px;display:block;"></i>No hay acciones registradas</div>';
    } else {
        html = '<div class="historial-acciones-list">';
        historial.slice(0, 50).forEach(function(item) {
            var iconClass = 'fa-info-circle';
            var colorClass = 'info';
            if (item.tipo === 'escalamiento_enviado') { iconClass = 'fa-exclamation-triangle'; colorClass = 'warning'; }
            else if (item.tipo === 'cambio_prioridad') { iconClass = 'fa-flag'; colorClass = 'danger'; }
            else if (item.tipo === 'solicitud_reporte') { iconClass = 'fa-clipboard-check'; colorClass = 'info'; }

            var detalle = '';
            if (item.notificacion) {
                if (item.notificacion.titulo) detalle = item.notificacion.titulo;
                else if (item.notificacion.mensaje) detalle = item.notificacion.mensaje;
            }

            html += '<div class="historial-accion-item">';
            html += '<div class="historial-accion-icon ' + colorClass + '"><i class="fas ' + iconClass + '"></i></div>';
            html += '<div class="historial-accion-body">';
            html += '<div class="historial-accion-tipo">' + (item.tipo || '').replace(/_/g, ' ') + '</div>';
            html += '<div class="historial-accion-detalle">' + (typeof S === 'function' ? S(detalle) : detalle) + '</div>';
            html += '<div class="historial-accion-fecha">' + formatDateTime(item.fecha) + '</div>';
            html += '</div></div>';
        });
        html += '</div>';
    }

    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modalHistorialAcciones';
    modal.innerHTML = '<div class="modal-content" style="max-width:600px;">' +
        '<div class="modal-header"><h3><i class="fas fa-history"></i> Historial de Acciones</h3>' +
        '<button class="modal-close" onclick="cerrarModal(\'modalHistorialAcciones\')">&times;</button></div>' +
        '<div class="modal-body" style="max-height:500px;overflow-y:auto;">' + html + '</div>' +
        '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="cerrarModal(\'modalHistorialAcciones\')">Cerrar</button>' +
        '</div></div>';
    document.body.appendChild(modal);
    setTimeout(function() { modal.classList.add('active'); }, 10);
}

function cerrarModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(function() { modal.remove(); }, 300);
    }
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
var _pedidosPendientesPage = 1;

function loadPedidosPendientes(page) {
    if (page) _pedidosPendientesPage = page;

    const tbody = document.getElementById('pendingDeliveryTable');
    if (!tbody) return;

    if (typeof db === 'undefined') {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error: Base de datos no disponible</td></tr>';
        return;
    }

    let todosPedidos = [];
    try {
        todosPedidos = db.getPedidos() || [];
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al obtener pedidos: ' + e.message + '</td></tr>';
        return;
    }

    const estadosEntregados = ['entregado', 'cancelado', 'anulado'];
    const pedidos = todosPedidos.filter(p => {
        const estado = (p.estado || 'pendiente').toLowerCase().trim();
        return !estadosEntregados.includes(estado);
    });

    const clientes = db.getClientes();
    const productos = db.getProductos();

    pedidos.sort((a, b) => new Date(a.fechaEntrega || '2099-12-31') - new Date(b.fechaEntrega || '2099-12-31'));

    if (pedidos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay pedidos pendientes</td></tr>';
        return;
    }

    // Paginación
    var pedidosPagina = typeof paginarArray === 'function' ? paginarArray(pedidos, _pedidosPendientesPage) : pedidos;

    try {
        tbody.innerHTML = pedidosPagina.map(pedido => {
            const cliente = clientes.find(c => c.id === pedido.clienteId);
            const productosArr = pedido.productos || [];
            const totalCantidad = productosArr.reduce((sum, p) => sum + (p.cantidad || 0), 0);
            const totalCompletadas = productosArr.reduce((sum, p) => sum + (p.completadas || 0), 0);
            const avance = calcularAvancePedido(pedido, productos);

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
                    <td>${S(cliente?.nombreComercial || 'N/A')}</td>
                    <td title="${S(nombresProductos)}">${S(nombresProductos.substring(0, 30))}${nombresProductos.length > 30 ? '...' : ''}</td>
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

    // Agregar paginación
    var paginacionEl = document.getElementById('pedidosPendientesPaginacion');
    if (!paginacionEl) {
        paginacionEl = document.createElement('div');
        paginacionEl.id = 'pedidosPendientesPaginacion';
        tbody.closest('.orders-table-container')?.after(paginacionEl);
    }
    if (typeof renderPaginacion === 'function') {
        paginacionEl.innerHTML = renderPaginacion('pedidosPendientesPaginacion', pedidos.length, _pedidosPendientesPage, 'loadPedidosPendientes');
    }
    } catch (error) {
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
    const pedidosERP = safeLocalGet('pedidos_erp', []);
    const historialProduccion = safeLocalGet('historial_produccion', []);
    const pedidoERP = pedidosERP.find(pe => pe.id == pedido.id);

    DEBUG_MODE && console.log('[generarEtapasPedido] Pedido:', pedido.id, 'pedidoERP:', pedidoERP ? 'encontrado' : 'no encontrado');

    return productosArr.map(pp => {
        // Usar == para comparación flexible de tipos
        const producto = productos.find(p => p.id == pp.productoId);
        if (!producto) {
            DEBUG_MODE && console.warn('[generarEtapasPedido] Producto no encontrado:', pp.productoId);
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
                    DEBUG_MODE && console.log('[generarEtapasPedido] Usando pedidoERP.procesos:', avanceProcesos.length);
                }
            }
        }

        // Si aún no hay avanceProcesos, generar desde rutaProcesos del producto
        if (!Array.isArray(avanceProcesos) || avanceProcesos.length === 0) {
            const rutaProcesos = producto.rutaProcesos || [];
            if (rutaProcesos.length === 0) {
                return `
                    <div class="etapas-producto">
                        <h5>${S(producto.nombre)} (${pp.cantidad} piezas)</h5>
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

            DEBUG_MODE && console.log('[generarEtapasPedido] Proceso:', proc.nombre, 'historial:', piezasHistorial, 'ERP:', piezasERP, 'total:', completadas);

            return {
                ...proc,
                completadas: completadas,
                estado: porcentaje >= 100 ? 'completado' : completadas > 0 ? 'en_proceso' : 'pendiente'
            };
        });

        return `
            <div class="etapas-producto">
                <h5>${S(producto.nombre)} <span class="text-muted">(${pp.completadas}/${pp.cantidad} piezas)</span></h5>
                <div class="etapas-timeline">
                    ${avanceProcesos.map(proc => {
                        const porcentaje = pp.cantidad > 0 ? Math.round((proc.completadas / pp.cantidad) * 100) : 0;
                        const estadoClass = proc.estado === 'completado' ? 'completado' : proc.estado === 'en_proceso' ? 'en_proceso' : 'pendiente';
                        const estadoTexto = proc.estado === 'completado' ? 'Completado' : proc.estado === 'en_proceso' ? 'En proceso' : 'Pendiente';
                        const iconClass = proc.estado === 'completado' ? 'fa-check' : proc.estado === 'en_proceso' ? 'fa-cog fa-spin' : 'fa-clock';

                        return `
                            <div class="etapa-item ${estadoClass}" title="${S(proc.nombre)}: ${proc.completadas}/${pp.cantidad} (${porcentaje}%)">
                                <div class="etapa-numero">${proc.procesoOrden}</div>
                                <div class="etapa-info">
                                    <span class="etapa-nombre">${S(proc.nombre)}</span>
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

