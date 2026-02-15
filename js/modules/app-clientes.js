// ========================================
// ERP MULTIFUNDAS - MÓDULO: CLIENTES
// Extraído de app.js para modularización
// ========================================

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
                        <span class="card-title">${S(cliente.nombreComercial)}</span>
                        <span class="status-badge ${cliente.tipo === 'estrategico' ? 'success' : cliente.tipo === 'interno' ? 'info' : 'warning'}">${S(cliente.tipo)}</span>
                    </div>
                    <p class="text-muted mb-1">${S(cliente.razonSocial)}</p>
                    <div class="mb-1">
                        <i class="fas fa-user"></i> ${S(cliente.contacto)}<br>
                        <i class="fas fa-envelope"></i> ${S(cliente.email)}<br>
                        <i class="fas fa-phone"></i> ${S(cliente.telefono)}
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
                                            <span class="articulo-nombre" title="${prod ? S(prod.nombre) : 'Producto no encontrado'}">
                                                ${prod ? S(prod.nombre.substring(0, 25)) + (prod.nombre.length > 25 ? '...' : '') : 'N/A'}
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
