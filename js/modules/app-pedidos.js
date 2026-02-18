// ========================================
// ERP MULTIFUNDAS - MÓDULO: PEDIDOS
// Extraído de app.js para modularización
// ========================================

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
                    <span class="area-name">${S(area.nombre)}</span>
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
                            ${S(op.nombre.split(' ')[0])}
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
                                <td>${cliente ? S(cliente.nombreComercial) : 'N/A'}</td>
                                <td title="${S(productosNombres)}">${pedido.productos.length} producto(s)</td>
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
                <span class="producto-nombre">${S(p.nombre)}</span>
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

async function savePedido() {
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

    const nuevoPedido = await db.addPedido(pedido);
    DEBUG_MODE && console.log('[savePedido] Pedido creado:', nuevoPedido);

    closeModal();

    // Recargar la sección correcta
    if (app.currentSection === 'dashboard') {
        DEBUG_MODE && console.log('[savePedido] Recargando dashboard...');
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
window.toggleVisibleSupervisora = toggleVisibleSupervisora;
window.loadPedidosPendientes = loadPedidosPendientes;
window.previsualizarImagenes = previsualizarImagenes;
window.eliminarImagenPreview = eliminarImagenPreview;
window.ampliarImagen = ampliarImagen;
window.updateProductosEditPedido = updateProductosEditPedido;
window.renderEditProductos = renderEditProductos;
window.toggleEditProductoFields = toggleEditProductoFields;

function viewPedido(id) {
    const pedido = db.getPedido(id);
    if (!pedido) {
        console.error('[viewPedido] Pedido no encontrado:', id);
        return;
    }

    const cliente = db.getCliente(pedido.clienteId);
    const productos = db.getProductos();
    const procesos = db.getProcesos();

    DEBUG_MODE && console.log('[viewPedido] Pedido:', id, 'Productos en pedido:', pedido.productos?.length);
    DEBUG_MODE && console.log('[viewPedido] Catálogo productos:', productos.length, 'procesos:', procesos.length);

    // Leer datos sincronizados de localStorage
    const pedidosERP = safeLocalGet('pedidos_erp', []);
    const historialProduccion = safeLocalGet('historial_produccion', []);
    const pedidoERP = pedidosERP.find(pe => pe.id == id);
    DEBUG_MODE && console.log('[viewPedido] pedidoERP encontrado:', !!pedidoERP);

    // Generar HTML para el avance por proceso de cada producto
    const productosDetalleHTML = pedido.productos.map(p => {
        // Usar == para comparación flexible de tipos
        const prod = productos.find(pr => pr.id == p.productoId);

        DEBUG_MODE && console.log('[viewPedido] Producto:', p.productoId, 'encontrado:', !!prod, 'rutaProcesos:', prod?.rutaProcesos?.length || 0);

        // Obtener avanceProcesos, generando desde rutaProcesos si no existe
        let avanceProcesos = p.avanceProcesos;

        // Si no hay avanceProcesos o está vacío, intentar obtener desde pedidos_erp
        if (!avanceProcesos || !Array.isArray(avanceProcesos) || avanceProcesos.length === 0) {
            if (pedidoERP) {
                // Primero buscar en productos[].procesos
                const productoERP = pedidoERP.productos?.find(pe => pe.productoId == p.productoId);
                if (productoERP && productoERP.procesos && productoERP.procesos.length > 0) {
                    DEBUG_MODE && console.log('[viewPedido] Usando procesos de productoERP:', productoERP.procesos.length);
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
                    DEBUG_MODE && console.log('[viewPedido] Usando pedidoERP.procesos directamente:', pedidoERP.procesos.length);
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
            DEBUG_MODE && console.log('[viewPedido] Generando desde rutaProcesos:', rutaProcesos.length, rutaProcesos);
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
                        DEBUG_MODE && console.log('[viewPedido] Encontrado en pedidoERP.procesos:', procesoERP.nombre, 'piezas:', piezasERP);
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
        DEBUG_MODE && console.log('[viewPedido] avanceProcesos final:', avanceProcesos.length, avanceProcesos);

        // Calcular avance general del producto como promedio de procesos
        let avanceGeneral;
        if (avanceProcesos.length > 0 && (p.cantidad || 0) > 0) {
            const sumaAvances = avanceProcesos.reduce((sum, proc) => sum + Math.min((proc.completadas || 0), p.cantidad) / p.cantidad, 0);
            avanceGeneral = Math.round((sumaAvances / avanceProcesos.length) * 100);
        } else {
            avanceGeneral = Math.round(((p.completadas || 0) / (p.cantidad || 1)) * 100);
        }

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
                                    <span class="proceso-nombre">${S(proc.nombre)}</span>
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
                    <h5>${prod ? S(prod.nombre) : 'N/A'}</h5>
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
                <span class="info-value">${cliente ? S(cliente.nombreComercial) : 'N/A'}</span>
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
                    <div class="imagen-apoyo-item" onclick="ampliarImagen('${S(img.data)}')" title="${S(img.nombre || 'Imagen ' + (index + 1))}">
                        <img src="${S(img.data)}" alt="${S(img.nombre || 'Imagen de apoyo')}">
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

    const clientes = db.getClientes();
    const allProductos = db.getProductos();

    // IDs de productos ya en el pedido
    const productosEnPedido = pedido.productos.map(p => p.productoId);

    const content = `
        <form id="editarPedidoForm">
            <div class="form-group">
                <label>Cliente *</label>
                <select name="clienteId" required onchange="updateProductosEditPedido(this.value, ${id})">
                    <option value="">Seleccionar cliente...</option>
                    ${clientes.map(c => `<option value="${c.id}" ${pedido.clienteId === c.id ? 'selected' : ''}>${c.nombreComercial}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Prioridad</label>
                    <select name="prioridad">
                        <option value="baja" ${pedido.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
                        <option value="media" ${pedido.prioridad === 'media' ? 'selected' : ''}>Media</option>
                        <option value="alta" ${pedido.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha de Entrega</label>
                    <input type="date" name="fechaEntrega" value="${pedido.fechaEntrega}">
                </div>
            </div>
            <div class="form-row">
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
            <div id="editProductosContainer" class="pedido-productos-edit">
            </div>

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

        const clienteId = parseInt(formData.get('clienteId'));
        if (!clienteId) {
            alert('Seleccione un cliente');
            return;
        }

        // Recoger productos del contenedor dinámico
        const container = document.getElementById('editProductosContainer');
        const rows = container.querySelectorAll('.producto-pedido-row');
        const productosActualizados = [];

        rows.forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            const cantidadInput = row.querySelector('input[name^="edit_cantidad_"]');
            const completadasInput = row.querySelector('input[name^="edit_completadas_"]');
            const precioInput = row.querySelector('input[name^="edit_precio_"]');
            const prodId = parseInt(checkbox.dataset.productoid);
            const cantidad = parseInt(cantidadInput.value) || 0;

            if (checkbox.checked && cantidad > 0) {
                productosActualizados.push({
                    productoId: prodId,
                    cantidad: cantidad,
                    completadas: parseInt(completadasInput.value) || 0,
                    precioUnitario: parseFloat(precioInput.value) || 0
                });
            }
        });

        if (productosActualizados.length === 0) {
            alert('Seleccione al menos un producto con cantidad');
            return;
        }

        const updates = {
            clienteId: clienteId,
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

    // Después de abrir el modal, renderizar los productos del cliente con los datos existentes
    setTimeout(() => {
        renderEditProductos(pedido.clienteId, pedido);
    }, 50);
}

// Renderiza los productos del cliente en el formulario de edición de pedido
// marcando los que ya están en el pedido y mostrando sus cantidades/completadas/precios
function renderEditProductos(clienteId, pedido) {
    const container = document.getElementById('editProductosContainer');
    if (!container) return;

    if (!clienteId) {
        container.innerHTML = '<p class="text-muted">Seleccione un cliente para ver sus productos</p>';
        return;
    }

    const productos = db.getProductosByCliente(parseInt(clienteId));

    if (productos.length === 0) {
        container.innerHTML = '<p class="text-muted">Este cliente no tiene productos registrados</p>';
        return;
    }

    const pedidoProds = pedido ? pedido.productos || [] : [];

    container.innerHTML = productos.map(p => {
        const enPedido = pedidoProds.find(pp => pp.productoId === p.id);
        const checked = enPedido ? 'checked' : '';
        const cantidad = enPedido ? enPedido.cantidad : '';
        const completadas = enPedido ? enPedido.completadas : 0;
        const precio = enPedido ? (enPedido.precioUnitario || 0) : (p.precioVenta || 0);

        return `
            <div class="producto-pedido-row">
                <div class="producto-edit-check">
                    <input type="checkbox" id="edit_prod_${p.id}" ${checked}
                           data-productoid="${p.id}" data-precio="${p.precioVenta || 0}"
                           onchange="toggleEditProductoFields(this)">
                    <label for="edit_prod_${p.id}" class="producto-pedido-label">
                        <strong>${S(p.nombre)}</strong>
                        <span class="producto-precio">$${(p.precioVenta || 0).toFixed(2)}</span>
                    </label>
                </div>
                <div class="producto-edit-fields" style="${enPedido ? '' : 'display:none'}">
                    <div class="form-group inline">
                        <label>Cantidad</label>
                        <input type="number" name="edit_cantidad_${p.id}" value="${cantidad}" min="1" class="cantidad-input">
                    </div>
                    <div class="form-group inline">
                        <label>Completadas</label>
                        <input type="number" name="edit_completadas_${p.id}" value="${completadas}" min="0" class="cantidad-input">
                    </div>
                    <div class="form-group inline">
                        <label>Precio Unit.</label>
                        <input type="number" name="edit_precio_${p.id}" value="${precio}" step="0.01" min="0" class="cantidad-input">
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Muestra/oculta campos de un producto al marcar/desmarcar en edición de pedido
function toggleEditProductoFields(checkbox) {
    const row = checkbox.closest('.producto-pedido-row');
    const fields = row.querySelector('.producto-edit-fields');
    if (fields) {
        fields.style.display = checkbox.checked ? '' : 'none';
        if (checkbox.checked) {
            const cantInput = fields.querySelector('input[name^="edit_cantidad_"]');
            if (cantInput && !cantInput.value) cantInput.value = 1;
        }
    }
}

// Cuando cambia el cliente en edición, recargar productos (pierde datos anteriores)
function updateProductosEditPedido(clienteId, pedidoId) {
    const pedido = db.getPedido(pedidoId);
    // Si el cliente cambió, no preservar productos anteriores
    const pedidoParaRender = parseInt(clienteId) === pedido.clienteId ? pedido : null;
    renderEditProductos(clienteId, pedidoParaRender);
}

function viewTimeline(id) {
    alert('Timeline del pedido en desarrollo');
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
                                        <button class="btn-icon-small" style="${pedido.visibleSupervisora === false ? 'opacity:0.4' : ''}" onclick="toggleVisibleSupervisora(${pedido.id})" title="${pedido.visibleSupervisora === false ? 'Oculto en Supervisora - Click para mostrar' : 'Visible en Supervisora - Click para ocultar'}">
                                            <i class="fas ${pedido.visibleSupervisora === false ? 'fa-eye-slash' : 'fa-broadcast-tower'}"></i>
                                        </button>
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

// Toggle visibilidad del pedido en la supervisora
function toggleVisibleSupervisora(id) {
    const pedido = db.getPedido(id);
    if (!pedido) return;
    const nuevoValor = pedido.visibleSupervisora === false ? true : false;
    db.updatePedido(id, { visibleSupervisora: nuevoValor });
    loadPedidos();
    showToast(nuevoValor ? 'Pedido visible en Supervisora' : 'Pedido oculto en Supervisora');
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
