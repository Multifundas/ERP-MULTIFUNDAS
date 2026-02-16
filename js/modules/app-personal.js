// ========================================
// ERP MULTIFUNDAS - MÓDULO: PERSONAL Y ÁREAS
// Extraído de app.js para modularización
// ========================================

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
        db.updateAreaPlanta(areaId, {
            nombre: form.querySelector('[name="nombre"]').value,
            color: form.querySelector('[name="color"]').value
        });
        loadProcesos();
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

// getIniciales() movida a utils.js

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

            DEBUG_MODE && console.log('Guardando posiciones para empleado', empleadoId, ':', nuevasPosiciones);

            // Obtener empleado para crear estado en mapa
            const empleado = db.getEmpleado(empleadoId);

            // Primero liberar las estaciones que ya no estan asignadas
            const estaciones = db.getEstaciones();
            estaciones.forEach(est => {
                if (est.operadorId === empleadoId && !nuevasPosiciones.includes(est.id)) {
                    DEBUG_MODE && console.log('Liberando estacion:', est.id);
                    db.asignarOperadorAEstacion(est.id, null);
                    // Eliminar del mapa
                    eliminarEstadoOperadorDeMapa(est.id);
                }
            });

            // Asignar las nuevas posiciones
            nuevasPosiciones.forEach(posId => {
                DEBUG_MODE && console.log('Asignando estacion:', posId, 'a empleado:', empleadoId);
                db.asignarOperadorAEstacion(posId, empleadoId);
                // Crear estado en el mapa
                crearEstadoOperadorEnMapa(empleado, posId);
            });

            // Actualizar empleado con sus posiciones
            db.updateEmpleado(empleadoId, { posiciones: nuevasPosiciones });

            DEBUG_MODE && console.log('Posiciones guardadas correctamente');

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
// Solo exportar funciones definidas en app-dashboard.js (ya cargado antes)
window.renombrarEstacion = renombrarEstacion;
window.confirmarRenombrarEstacion = confirmarRenombrarEstacion;
window.eliminarEstacionConConfirm = eliminarEstacionConConfirm;
window.sincronizarEstacionesConPaneles = sincronizarEstacionesConPaneles;
window.crearEstadoOperadorEnMapa = crearEstadoOperadorEnMapa;
window.eliminarEstadoOperadorDeMapa = eliminarEstadoOperadorDeMapa;
window.sincronizarEstadoOperadoresDB = sincronizarEstadoOperadoresDB;
// sincronizarEstadoOperadoresAlInicio está en app.js (ya cargado antes)
window.sincronizarEstadoOperadoresAlInicio = sincronizarEstadoOperadoresAlInicio;
// Las siguientes funciones se definen en app-admin.js (carga después) - se exportan allí

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
    const ocultarArea = (rol === 'supervisora' || rol === 'administrador');
    if (areaField) areaField.style.display = ocultarArea ? 'none' : 'block';
    if (posicionesField) posicionesField.style.display = ocultarArea ? 'none' : 'block';
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
                    <div class="form-group" id="areaFieldEdit" style="${(empleado.rol === 'administrador' || empleado.rol === 'supervisora') ? 'display:none' : ''}">
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
            <div class="form-section" id="permisosSectionEdit" style="${(empleado.rol === 'administrador' || empleado.rol === 'supervisora') ? 'display:none' : ''}">
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
            <div class="form-section" id="posicionesFieldEdit" style="${(empleado.rol === 'administrador' || empleado.rol === 'supervisora') ? 'display:none' : ''}">
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
    const posicionesField = document.getElementById('posicionesFieldEdit');
    const ocultarArea = (rol === 'supervisora' || rol === 'administrador');
    if (areaField) areaField.style.display = ocultarArea ? 'none' : 'block';
    if (posicionesField) posicionesField.style.display = ocultarArea ? 'none' : 'block';
}

function toggleCredencialesSectionEdit(rol) {
    const credencialesSection = document.getElementById('credencialesSectionEdit');
    const permisosSection = document.getElementById('permisosSectionEdit');
    const posicionesField = document.getElementById('posicionesFieldEdit');

    if (credencialesSection) {
        credencialesSection.style.display = (rol === 'operador' || rol === 'supervisora') ? 'block' : 'none';
    }
    if (permisosSection) {
        permisosSection.style.display = (rol === 'operador') ? 'block' : 'none';
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
                <button class="btn btn-info" onclick="showReporteAsistencia()">
                    <i class="fas fa-clipboard-check"></i> Asistencia
                </button>
                <button class="btn btn-secondary" onclick="exportarPersonalPDF()">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
                <button class="btn btn-secondary" onclick="exportPersonalToExcel()">
                    <i class="fas fa-file-excel"></i> Excel
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

// Filtrar tabla de personal (con persistencia)
function filterPersonalTable(filter) {
    if (typeof saveFilter === 'function') saveFilter('personal_rol', filter);
    const rows = document.querySelectorAll('#personalTableEnhanced tbody tr');
    rows.forEach(row => {
        if (filter === 'todos' || row.dataset.rol === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Buscar personal (con persistencia)
function searchPersonal() {
    const search = document.getElementById('searchPersonal').value.toLowerCase();
    if (typeof saveFilter === 'function') saveFilter('personal_search', search);
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
// REPORTE DE ASISTENCIA
// ========================================

function showReporteAsistencia() {
    const personal = db.getPersonal().filter(p => p.rol === 'operador' && p.activo);

    // Obtener historial de asistencia desde localStorage
    let historial = [];
    try {
        historial = JSON.parse(localStorage.getItem('historial_asistencia') || '[]');
    } catch (e) {}

    // Rango de fechas: últimos 30 días
    const hoy = new Date();
    const hace30 = new Date(hoy);
    hace30.setDate(hace30.getDate() - 30);
    const fechaInicio = hace30.toISOString().split('T')[0];
    const fechaFin = hoy.toISOString().split('T')[0];

    // Calcular resumen por operador
    const resumen = personal.map(emp => {
        const registros = historial.filter(h =>
            h.personal_id === emp.id &&
            h.fecha >= fechaInicio &&
            h.fecha <= fechaFin
        );

        const asistencias = registros.filter(r => r.tipo === 'asistencia').length;
        const faltas = registros.filter(r => r.tipo === 'falta').length;
        const retardos = registros.filter(r => r.tipo === 'retardo').length;
        const permisos = registros.filter(r => r.tipo === 'permiso').length;
        const totalDias = asistencias + faltas + retardos + permisos;
        const pctAsistencia = totalDias > 0 ? Math.round((asistencias / totalDias) * 100) : 0;

        return {
            id: emp.id,
            nombre: emp.nombre,
            asistencias,
            faltas,
            retardos,
            permisos,
            totalDias,
            pctAsistencia
        };
    });

    // Totales generales
    const totalAsistencias = resumen.reduce((s, r) => s + r.asistencias, 0);
    const totalFaltas = resumen.reduce((s, r) => s + r.faltas, 0);
    const totalRetardos = resumen.reduce((s, r) => s + r.retardos, 0);
    const totalPermisos = resumen.reduce((s, r) => s + r.permisos, 0);

    // Registro del día de hoy
    let asistenciaHoy = {};
    try {
        const saved = JSON.parse(localStorage.getItem('asistencia_hoy') || '{}');
        if (saved.fecha === fechaFin) {
            asistenciaHoy = saved.registros || {};
        }
    } catch (e) {}

    const hoyRegistrado = Object.keys(asistenciaHoy).length > 0;

    const content = `
    <div class="asistencia-reporte">
        <div class="asistencia-reporte-header">
            <div class="asistencia-rango">
                <i class="fas fa-calendar-alt"></i>
                <span>${fechaInicio} a ${fechaFin}</span>
            </div>
            <div class="asistencia-estado-hoy">
                <span class="status-badge ${hoyRegistrado ? 'success' : 'warning'}">
                    <i class="fas fa-${hoyRegistrado ? 'check-circle' : 'exclamation-circle'}"></i>
                    Hoy: ${hoyRegistrado ? 'Registrada' : 'Sin registrar'}
                </span>
            </div>
        </div>

        <div class="asistencia-kpis">
            <div class="asist-kpi ok">
                <span class="asist-kpi-value">${totalAsistencias}</span>
                <span class="asist-kpi-label"><i class="fas fa-check"></i> Asistencias</span>
            </div>
            <div class="asist-kpi falta">
                <span class="asist-kpi-value">${totalFaltas}</span>
                <span class="asist-kpi-label"><i class="fas fa-times"></i> Faltas</span>
            </div>
            <div class="asist-kpi retardo">
                <span class="asist-kpi-value">${totalRetardos}</span>
                <span class="asist-kpi-label"><i class="fas fa-clock"></i> Retardos</span>
            </div>
            <div class="asist-kpi permiso">
                <span class="asist-kpi-value">${totalPermisos}</span>
                <span class="asist-kpi-label"><i class="fas fa-hand-paper"></i> Permisos</span>
            </div>
        </div>

        <div class="asistencia-tabla-wrapper" style="max-height:45vh;overflow-y:auto;">
            <table class="data-table" id="tablaReporteAsistencia">
                <thead>
                    <tr>
                        <th>Operadora</th>
                        <th style="text-align:center">Asistencias</th>
                        <th style="text-align:center">Faltas</th>
                        <th style="text-align:center">Retardos</th>
                        <th style="text-align:center">Permisos</th>
                        <th style="text-align:center">% Asistencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${resumen.map(r => {
                        const colorClass = r.pctAsistencia >= 90 ? 'success' :
                                           r.pctAsistencia >= 75 ? 'warning' : 'danger';
                        return `
                        <tr>
                            <td>
                                <div class="empleado-cell">
                                    <span class="asist-avatar">${getIniciales(r.nombre)}</span>
                                    <strong>${r.nombre}</strong>
                                </div>
                            </td>
                            <td style="text-align:center">
                                <span class="asist-cell-val ok">${r.asistencias}</span>
                            </td>
                            <td style="text-align:center">
                                <span class="asist-cell-val ${r.faltas > 0 ? 'falta' : ''}">${r.faltas}</span>
                            </td>
                            <td style="text-align:center">
                                <span class="asist-cell-val ${r.retardos > 0 ? 'retardo' : ''}">${r.retardos}</span>
                            </td>
                            <td style="text-align:center">
                                <span class="asist-cell-val ${r.permisos > 0 ? 'permiso' : ''}">${r.permisos}</span>
                            </td>
                            <td style="text-align:center">
                                <div class="asist-pct-bar">
                                    <div class="asist-pct-fill ${colorClass}" style="width:${r.pctAsistencia}%"></div>
                                    <span class="asist-pct-text">${r.totalDias > 0 ? r.pctAsistencia + '%' : 'N/A'}</span>
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="asistencia-reporte-footer">
            <button class="btn btn-secondary btn-sm" onclick="exportarReporteAsistencia()">
                <i class="fas fa-file-excel"></i> Exportar a Excel
            </button>
            <button class="btn btn-secondary btn-sm" onclick="verHistorialAsistencia()">
                <i class="fas fa-history"></i> Ver Historial Detallado
            </button>
        </div>
    </div>`;

    const footer = `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`;
    openModal('Reporte de Asistencia - Últimos 30 días', content, footer);
}

function exportarReporteAsistencia() {
    const table = document.getElementById('tablaReporteAsistencia');
    if (table) {
        exportTableToExcel('tablaReporteAsistencia', 'reporte_asistencia');
        showToast('Reporte de asistencia exportado');
    }
}

function verHistorialAsistencia() {
    let historial = [];
    try {
        historial = JSON.parse(localStorage.getItem('historial_asistencia') || '[]');
    } catch (e) {}

    const personal = db.getPersonal();

    // Ordenar por fecha descendente
    historial.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Limitar a últimos 200 registros
    const registros = historial.slice(0, 200);

    const tipoIcons = {
        asistencia: '<i class="fas fa-check" style="color:#22c55e"></i>',
        falta: '<i class="fas fa-times" style="color:#ef4444"></i>',
        retardo: '<i class="fas fa-clock" style="color:#f59e0b"></i>',
        permiso: '<i class="fas fa-hand-paper" style="color:#8b5cf6"></i>'
    };

    const content = `
    <div style="max-height:60vh;overflow-y:auto;">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Operadora</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                </tr>
            </thead>
            <tbody>
                ${registros.map(r => {
                    const emp = personal.find(p => p.id === r.personal_id);
                    return `
                    <tr>
                        <td>${r.fecha}</td>
                        <td>${emp ? emp.nombre : 'ID: ' + r.personal_id}</td>
                        <td>${tipoIcons[r.tipo] || ''} ${r.tipo}</td>
                        <td>${r.motivo || '-'}</td>
                    </tr>`;
                }).join('')}
                ${registros.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#64748b;">No hay registros de asistencia</td></tr>' : ''}
            </tbody>
        </table>
    </div>`;

    const footer = `
        <button class="btn btn-secondary" onclick="showReporteAsistencia()">
            <i class="fas fa-arrow-left"></i> Volver al Resumen
        </button>
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
    `;

    openModal('Historial Detallado de Asistencia', content, footer);
}

// ========================================
// SECCIÓN COSTEO MEJORADA v2
// ========================================
