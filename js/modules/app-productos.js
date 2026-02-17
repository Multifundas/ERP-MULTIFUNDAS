// ========================================
// ERP MULTIFUNDAS - MÓDULO: PRODUCTOS
// Extraído de app.js para modularización
// ========================================

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
                        <button class="btn-icon-small danger" onclick="confirmarDeleteProducto(${producto.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
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

async function saveProducto() {
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

    const nuevoProducto = await db.addProducto(producto);
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

    openModal('Duplicar Producto', content, async () => {
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

        await db.addProducto(nuevoProducto);
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

// Confirmar eliminación de producto
function confirmarDeleteProducto(id) {
    const producto = db.getProducto(id);
    if (!producto) return;

    // Verificar si tiene pedidos asociados
    const pedidos = db.getPedidos();
    const enPedido = pedidos.some(ped =>
        ped.productos && ped.productos.some(pp => pp.productoId === id)
    );

    let mensaje;
    if (enPedido) {
        mensaje = `El producto "${producto.nombre}" tiene pedidos asociados y no puede eliminarse.\n\n¿Desea inhabilitarlo en su lugar? (quedará marcado como Inactivo)`;
    } else {
        mensaje = `¿Está seguro de que desea eliminar el producto "${producto.nombre}"?\n\nEsta acción no se puede deshacer.`;
    }

    if (confirm(mensaje)) {
        const result = db.deleteProducto(id);
        if (result.deleted) {
            showToast('Producto eliminado correctamente', 'success');
        } else if (result.disabled) {
            showToast('Producto inhabilitado (tiene pedidos asociados)', 'warning');
        }
        loadProductos();
    }
}

// Exponer funciones a window
window.duplicarProducto = duplicarProducto;
window.updateDupSubfamilias = updateDupSubfamilias;
window.addDupMaterialItem = addDupMaterialItem;
window.addDupDescripcionItem = addDupDescripcionItem;
window.confirmarDeleteProducto = confirmarDeleteProducto;

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
