// ========================================
// ERP MULTIFUNDAS - MÓDULO: AVANZADO
// Auditoría, Charts, herramientas, PDF, búsqueda, Gantt, etc.
// Extraído de app.js líneas 16265-16945 + 16946-20400
// ========================================

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

// getIniciales() en utils.js

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

// Escapar HTML (usa la función global S/sanitizeHTML)
function escapeHtml(text) {
    return S(text);
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
        // Marcar como completado inmediatamente para que no vuelva a aparecer
        localStorage.setItem('tourCompleted', 'true');
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
                        <button class="btn btn-secondary" onclick="closeModal();">
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

// Función genérica para exportar reportes a PDF
function exportarReportePDF(titulo, columnas, datos, nombreArchivo) {
    if (typeof window.jspdf === 'undefined') {
        showToast('Librería jsPDF no disponible', 'error');
        return;
    }

    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MULTIFUNDAS', 15, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, 15, 22);
    doc.setFontSize(8);
    doc.text('Generado: ' + new Date().toLocaleString('es-MX'), 195, 22, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Tabla con autotable
    if (doc.autoTable) {
        doc.autoTable({
            head: [columnas],
            body: datos,
            startY: 38,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 10, right: 10 }
        });
    }

    // Footer
    var pageCount = doc.internal.getNumberOfPages();
    for (var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text('ERP Multifundas - Página ' + i + ' de ' + pageCount, 105, 290, { align: 'center' });
    }

    doc.save((nombreArchivo || 'reporte') + '.pdf');
    showToast('PDF generado: ' + (nombreArchivo || 'reporte') + '.pdf', 'success');
}

// Exportar Dashboard a PDF
function exportarDashboardPDF() {
    var stats = db.getDashboardStats('month');
    var pedidos = db.getPedidos().filter(function(p) {
        return !['entregado', 'cancelado', 'anulado'].includes((p.estado || '').toLowerCase());
    });
    var clientes = db.getClientes();

    var columnas = ['Pedido', 'Cliente', 'Estado', 'Fecha Entrega', 'Avance'];
    var datos = pedidos.slice(0, 50).map(function(p) {
        var cliente = clientes.find(function(c) { return c.id === p.clienteId; });
        return [
            '#' + p.id,
            cliente ? cliente.nombreComercial : 'N/A',
            p.estado || 'pendiente',
            p.fechaEntrega ? new Date(p.fechaEntrega).toLocaleDateString('es-MX') : '-',
            (calcularAvancePedido(p, db.getProductos()) || 0) + '%'
        ];
    });

    exportarReportePDF(
        'Reporte Dashboard - Pedidos Activos',
        columnas, datos,
        'dashboard_' + new Date().toISOString().split('T')[0]
    );
}

// Exportar Personal a PDF
function exportarPersonalPDF() {
    var personal = db.getPersonal().filter(function(p) { return p.activo; });

    var columnas = ['Nombre', 'Rol', 'Entrada', 'Salida', 'Salario/Hr'];
    var datos = personal.map(function(emp) {
        return [
            emp.nombre,
            emp.rol || '-',
            emp.horaEntrada || '08:00',
            emp.horaSalida || '17:00',
            '$' + (emp.salarioHora || 0).toFixed(2)
        ];
    });

    exportarReportePDF(
        'Reporte de Personal',
        columnas, datos,
        'personal_' + new Date().toISOString().split('T')[0]
    );
}

// Exportar Asistencia a PDF
function exportarAsistenciaPDF() {
    var historial = safeLocalGet('historial_asistencia', []);
    var personal = db.getPersonal();

    var columnas = ['Fecha', 'Empleado', 'Tipo', 'Motivo'];
    var datos = historial.slice(0, 100).map(function(reg) {
        var emp = personal.find(function(p) { return p.id === reg.personal_id; });
        return [
            reg.fecha || '-',
            emp ? emp.nombre : 'ID:' + reg.personal_id,
            reg.tipo || '-',
            reg.motivo || '-'
        ];
    });

    exportarReportePDF(
        'Reporte de Asistencia',
        columnas, datos,
        'asistencia_' + new Date().toISOString().split('T')[0]
    );
}

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

