// ========================================
// ERP MULTIFUNDAS - MÓDULO: REPORTES Y COSTEO
// Extraído de app.js para modularización
// ========================================

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
    const historialProduccion = safeLocalGet('historial_produccion', []);
    const asignacionesEstaciones = safeLocalGet('asignaciones_estaciones', {});
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});
    const pedidosERP = safeLocalGet('pedidos_erp', []);

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
// COSTEO ENHANCED v2
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
