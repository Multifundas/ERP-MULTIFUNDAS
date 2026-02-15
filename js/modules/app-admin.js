// ========================================
// ERP MULTIFUNDAS - MÓDULO: ADMIN Y CONFIGURACIÓN
// Extraído de app.js para modularización
// ========================================

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
// loadAuditoria: usa versión enhanced (definida más abajo)
function loadAuditoria() {
    if (typeof loadAuditoriaEnhanced === 'function') {
        loadAuditoriaEnhanced();
    }
}

// ========================================
// NOTIFICACIONES
// ========================================
function loadNotifications() {
    const list = document.getElementById('notificationsList');
    // Combinar notificaciones internas (db) con las de administración (localStorage)
    const dbNotifs = db.getNotificaciones() || [];
    var adminNotifs = [];
    try {
        adminNotifs = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
    } catch (e) {}

    // Mapear admin notifs al mismo formato
    var adminMapped = adminNotifs.map(function(n) {
        return {
            id: 'admin_' + n.id,
            _adminId: n.id,
            tipo: n.tipo === 'pedido_completado' ? 'success' : (n.tipo || 'info'),
            titulo: n.titulo || 'Notificación',
            mensaje: n.mensaje || '',
            fecha: n.fecha,
            leida: !!n.leida,
            pedidoId: n.pedidoId,
            _source: 'admin'
        };
    });

    var dbMapped = dbNotifs.map(function(n) {
        n._source = 'db';
        return n;
    });

    // Combinar y ordenar por fecha (más recientes primero)
    var allNotifs = dbMapped.concat(adminMapped);
    allNotifs.sort(function(a, b) {
        return new Date(b.fecha) - new Date(a.fecha);
    });

    // Limitar a 50
    allNotifs = allNotifs.slice(0, 50);

    // Actualizar badge
    updateNotificationBadge();

    // Función para obtener icono según tipo
    function getNotifIcon(tipo) {
        if (tipo === 'warning') return 'fa-exclamation-triangle text-warning';
        if (tipo === 'danger') return 'fa-times-circle text-danger';
        if (tipo === 'success' || tipo === 'pedido_completado') return 'fa-check-circle text-success';
        return 'fa-info-circle text-info';
    }

    if (allNotifs.length === 0) {
        list.innerHTML = '<div class="notification-empty"><i class="fas fa-bell-slash"></i><p>No hay notificaciones</p></div>';
    } else {
        list.innerHTML = allNotifs.map(function(notif) {
            var readClass = notif.leida ? '' : 'unread';
            var sourceLabel = notif._source === 'admin' ? '<span class="notif-source">Supervisora</span>' : '';
            return '<div class="notification-item ' + readClass + '" onclick="markNotificationRead(\'' + S(String(notif.id)) + '\')">' +
                '<div class="notification-title">' +
                    '<i class="fas ' + getNotifIcon(notif.tipo) + '"></i> ' +
                    S(notif.titulo) + sourceLabel +
                '</div>' +
                '<div class="notification-text">' + S(notif.mensaje) + '</div>' +
                '<div class="notification-time">' + formatDateTime(notif.fecha) + '</div>' +
            '</div>';
        }).join('');
    }

    // Marcar todas como leídas
    var markAllBtn = document.querySelector('.notifications-header .btn-link');
    if (markAllBtn) {
        markAllBtn.onclick = function() {
            db.marcarTodasLeidas();
            // Marcar admin notifs como leídas
            try {
                var an = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
                an.forEach(function(n) { n.leida = true; });
                localStorage.setItem('notificaciones_admin', JSON.stringify(an));
            } catch (e) {}
            loadNotifications();
        };
    }
}

function markNotificationRead(id) {
    // Determinar si es notificación admin o db
    if (typeof id === 'string' && id.indexOf('admin_') === 0) {
        var adminId = parseInt(id.replace('admin_', ''));
        try {
            var notifs = JSON.parse(localStorage.getItem('notificaciones_admin') || '[]');
            var notif = notifs.find(function(n) { return n.id === adminId; });
            if (notif) {
                notif.leida = true;
                localStorage.setItem('notificaciones_admin', JSON.stringify(notifs));
            }
        } catch (e) {}
    } else {
        db.marcarNotificacionLeida(id);
    }
    loadNotifications();
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
// showToast() en utils.js

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
    DEBUG_MODE && console.log('[showPosicionDetalle] Iniciando para estación:', estacionId);

    try {
        const estacion = db.getEstacion(estacionId);
        DEBUG_MODE && console.log('[showPosicionDetalle] Estación encontrada:', estacion);

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

        DEBUG_MODE && console.log('[showPosicionDetalle] Datos cargados - Personal:', personal.length, 'EstadoOps:', estadoOps.length);

        const operador = estacion.operadorId ? personal.find(p => p.id === estacion.operadorId) : null;
        const estadoOp = estadoOps.find(e => e.estacionId === estacionId);

        DEBUG_MODE && console.log('[showPosicionDetalle] Operador asignado:', operador ? operador.nombre : 'Ninguno');

        // Si no hay operador asignado, mostrar modal simple
        if (!operador) {
            DEBUG_MODE && console.log('[showPosicionDetalle] Mostrando modal sin operador');
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
            DEBUG_MODE && console.warn('[showPosicionDetalle] Error calculando estadísticas:', e);
        }
        DEBUG_MODE && console.log('[showPosicionDetalle] Estadísticas:', estadisticasEmpleado);

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

    DEBUG_MODE && console.log('[showPosicionDetalle] Abriendo modal con contenido');
    openModal(`Estación ${estacionId} - ${operador.nombre}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
    DEBUG_MODE && console.log('[showPosicionDetalle] Modal abierto exitosamente');

    } catch (error) {
        console.error('[showPosicionDetalle] Error:', error);
        console.error('[showPosicionDetalle] Stack:', error.stack);
        showToast('Error al cargar detalles de la posición', 'error');
    }
}

// Genera la sección de procesos asignados a un operador
function generarSeccionProcesosAsignados(operadorId, pedidos, productos, procesos, clientes) {
    // Obtener asignaciones desde múltiples fuentes en localStorage
    const asignacionesEstaciones = safeLocalGet('asignaciones_estaciones', {});
    const supervisoraMaquinas = safeLocalGet('supervisora_maquinas', {});
    const estadoMaquinas = safeLocalGet('estado_maquinas', {});

    // Buscar la estación del operador
    const estaciones = db.getEstaciones() || [];
    const estacionOperador = estaciones.find(e => e.operadorId === operadorId);
    const estacionId = estacionOperador?.id;

    DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Buscando para operador:', operadorId, 'Estación:', estacionId);

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
        DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Maquina encontrada:', maquina);

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
        DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Estado maquina encontrado:', estadoMaq);

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
        DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Asignación estación:', asig);

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
            DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Procesos simultáneos encontrados:', estado.procesosSimultaneos.length);
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
    const pedidosERP = safeLocalGet('pedidos_erp', []);
    const historialProduccion = safeLocalGet('historial_produccion', []);

    asignacionesOperador.forEach(asig => {
        DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Procesando asignación:', asig.procesoNombre, 'procesoId:', asig.procesoId, 'pedidoId:', asig.pedidoId);

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
            DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Historial encontrado para', asig.procesoNombre,
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
                    DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Actualizando piezas desde pedidos_erp:',
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
                DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Actualizando desde estado_maquinas:',
                    asig.procesoNombre, 'piezasHoy:', estadoMaq.piezasHoy);
                asig.piezasCompletadas = estadoMaq.piezasHoy;
            }
        }

        // Log final del estado de la asignación
        DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Resultado:', asig.procesoNombre,
            'pedidoId:', asig.pedidoId, 'piezasCompletadas:', asig.piezasCompletadas, 'piezasAsignadas:', asig.piezasAsignadas);
    });

    // Segunda pasada: si alguna asignación no tiene piezasAsignadas, usar el máximo encontrado
    const maxPiezasAsignadas = Math.max(...asignacionesOperador.map(a => a.piezasAsignadas || 0), 0);
    asignacionesOperador.forEach(asig => {
        if (!asig.piezasAsignadas || asig.piezasAsignadas === 0) {
            asig.piezasAsignadas = maxPiezasAsignadas;
        }
    });

    DEBUG_MODE && console.log('[generarSeccionProcesosAsignados] Total asignaciones encontradas:', asignacionesOperador.length);

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
    DEBUG_MODE && console.log('[showPosicionSinOperador] Iniciando para estación:', estacionId);
    const operadoresDisponibles = personal.filter(p => p.rol === 'operador' && p.activo !== false);
    DEBUG_MODE && console.log('[showPosicionSinOperador] Operadores disponibles:', operadoresDisponibles.length);

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

    DEBUG_MODE && console.log('[showPosicionSinOperador] Abriendo modal');
    openModal(`Estación ${estacionId}`, content, null);
    document.getElementById('modalFooter').style.display = 'none';
    DEBUG_MODE && console.log('[showPosicionSinOperador] Modal abierto exitosamente');
}

// Asegurar que las funciones estén disponibles globalmente
if (typeof window !== 'undefined') {
    window.showPosicionDetalle = showPosicionDetalle;
    window.showPosicionSinOperador = showPosicionSinOperador;
    DEBUG_MODE && console.log('[app.js] Funciones de posición exportadas a window');
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
        DEBUG_MODE && console.warn('Error en calcularEstadisticasEmpleado:', error);
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

