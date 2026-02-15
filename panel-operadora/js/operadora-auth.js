// ========================================
// PANEL OPERADORA - SISTEMA DE AUTENTICACIÓN
// ========================================

// Estado de autenticación
var DEBUG_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const authState = {
    operadoraActual: null,
    sesionActiva: false,
    inicioTurno: null,
    estacionConfig: null
};

// Configuración de la estación (se configura una vez por tablet)
const CONFIG_ESTACION = {
    id: localStorage.getItem('estacion_id') || 'E1',
    area: localStorage.getItem('estacion_area') || 'costura',
    nombre: localStorage.getItem('estacion_nombre') || 'Estación 1'
};

// Base de datos de operadoras (fallback local si no hay Supabase)
function getOperadorasDB() {
    const saved = localStorage.getItem('operadoras_db');
    if (saved) {
        return JSON.parse(saved);
    }
    return [];
}

// ========================================
// RATE LIMITING - Protección contra intentos fallidos
// ========================================
const _rateLimiter = {
    maxIntentos: 3,
    bloqueoMinutos: 5,
    getKey: function(numEmpleado) { return 'rl_' + (numEmpleado || 'global'); },
    verificar: function(numEmpleado) {
        var key = this.getKey(numEmpleado);
        var data = safeJsonParse(localStorage.getItem(key), {});
        if (data.bloqueadoHasta && new Date().getTime() < data.bloqueadoHasta) {
            var restante = Math.ceil((data.bloqueadoHasta - new Date().getTime()) / 60000);
            return { bloqueado: true, minutosRestantes: restante };
        }
        if (data.bloqueadoHasta && new Date().getTime() >= data.bloqueadoHasta) {
            localStorage.removeItem(key);
            return { bloqueado: false };
        }
        return { bloqueado: false };
    },
    registrarFallo: function(numEmpleado) {
        var key = this.getKey(numEmpleado);
        var data = safeJsonParse(localStorage.getItem(key), {intentos:0});
        data.intentos = (data.intentos || 0) + 1;
        if (data.intentos >= this.maxIntentos) {
            data.bloqueadoHasta = new Date().getTime() + (this.bloqueoMinutos * 60000);
            data.intentos = 0;
        }
        localStorage.setItem(key, JSON.stringify(data));
        return { intentosRestantes: this.maxIntentos - data.intentos, bloqueado: !!data.bloqueadoHasta };
    },
    limpiar: function(numEmpleado) {
        localStorage.removeItem(this.getKey(numEmpleado));
    }
};

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================

async function iniciarSesion() {
    const numEmpleado = document.getElementById('numEmpleado').value.trim();
    const pin = document.getElementById('pinInput').value.trim();

    if (!numEmpleado) {
        mostrarErrorLogin('Ingresa tu número de empleado');
        return;
    }

    if (!pin || pin.length !== 4) {
        mostrarErrorLogin('Ingresa tu PIN de 4 dígitos');
        return;
    }

    // Verificar rate limiting
    var rlCheck = _rateLimiter.verificar(numEmpleado);
    if (rlCheck.bloqueado) {
        mostrarErrorLogin('Demasiados intentos fallidos. Espera ' + rlCheck.minutosRestantes + ' minuto(s).');
        document.getElementById('pinInput').value = '';
        return;
    }

    // Intentar validación via Supabase RPC (server-side, bcrypt)
    var sb = window.supabaseInstance;
    if (sb) {
        try {
            var result = await sb.rpc('validate_pin', {
                p_num_empleado: numEmpleado,
                p_pin: pin
            });

            if (result.error) {
                console.error('[AUTH] Error RPC validate_pin:', result.error.message);
                // Fallback a validación local si RPC falla
                return iniciarSesionLocal(numEmpleado, pin);
            }

            var row = result.data && result.data[0];
            if (!row) {
                mostrarErrorLogin('Error de conexión. Intenta de nuevo.');
                document.getElementById('pinInput').value = '';
                return;
            }

            if (row.bloqueado) {
                mostrarErrorLogin(row.mensaje);
                document.getElementById('pinInput').value = '';
                return;
            }

            if (!row.valid) {
                var rlResult = _rateLimiter.registrarFallo(numEmpleado);
                var msg = row.mensaje;
                if (!rlResult.bloqueado && rlResult.intentosRestantes > 0) {
                    msg += ' (' + rlResult.intentosRestantes + ' intento(s) restante(s))';
                } else if (rlResult.bloqueado) {
                    msg = 'Demasiados intentos. Espera ' + _rateLimiter.bloqueoMinutos + ' minutos.';
                }
                mostrarErrorLogin(msg);
                document.getElementById('pinInput').value = '';
                return;
            }

            // Login exitoso - limpiar rate limiter
            _rateLimiter.limpiar(numEmpleado);

            // Login exitoso via Supabase
            var operadora = {
                id: row.empleado_id,
                numEmpleado: numEmpleado,
                nombre: row.empleado_nombre,
                rol: row.empleado_rol,
                areaId: row.empleado_area_id
            };

            // Enriquecer con datos de operadoras_db local si existen
            var operadorasLocal = getOperadorasDB();
            var localData = operadorasLocal.find(function(op) { return op.id === row.empleado_id; });
            if (localData) {
                operadora.area = localData.area || operadora.area;
                operadora.foto = localData.foto;
                operadora.permisos = localData.permisos || {};
                operadora.horaEntrada = localData.horaEntrada;
                operadora.horaSalida = localData.horaSalida;
            }

            authState.operadoraActual = operadora;
            authState.sesionActiva = true;
            authState.inicioTurno = new Date();

            guardarSesion();
            ocultarLogin();
            mostrarPanel();

            if (typeof initPanelOperadora === 'function') {
                initPanelOperadora();
            }
            return;

        } catch (e) {
            console.error('[AUTH] Error en validate_pin:', e.message);
            // Fallback a validación local
        }
    }

    // Fallback: validación local (sin Supabase)
    iniciarSesionLocal(numEmpleado, pin);
}

// Fallback para cuando Supabase no está disponible
// SEGURIDAD: Separa búsqueda de usuario de validación de PIN
function iniciarSesionLocal(numEmpleado, pin) {
    const operadoras = getOperadorasDB();
    // Buscar por número de empleado primero (sin revelar si existe)
    const operadora = operadoras.find(op => op.numEmpleado === numEmpleado);

    // Validar PIN separadamente
    var pinValido = false;
    if (operadora) {
        if (operadora.pinHash && typeof operadora.pinHash === 'string') {
            // Hash comparison (SHA-256 simple para offline)
            pinValido = _simpleHash(pin) === operadora.pinHash;
        } else if (operadora.pin) {
            // Legacy: comparación directa
            pinValido = operadora.pin === pin;
        }
    }

    if (!operadora || !pinValido) {
        var rlResult = _rateLimiter.registrarFallo(numEmpleado);
        var msg = 'Número de empleado o PIN incorrecto';
        if (!rlResult.bloqueado && rlResult.intentosRestantes > 0) {
            msg += ' (' + rlResult.intentosRestantes + ' intento(s) restante(s))';
        } else if (rlResult.bloqueado) {
            msg = 'Demasiados intentos. Espera ' + _rateLimiter.bloqueoMinutos + ' minutos.';
        }
        // Registrar intento fallido en audit trail
        if (typeof AuditTrail !== 'undefined') {
            AuditTrail.log('Login fallido', 'Intento fallido para empleado ' + numEmpleado, 'auth', null, 'sistema');
        }
        mostrarErrorLogin(msg);
        document.getElementById('pinInput').value = '';
        return;
    }

    // Login exitoso - limpiar rate limiter
    _rateLimiter.limpiar(numEmpleado);

    // Registrar login exitoso
    if (typeof AuditTrail !== 'undefined') {
        AuditTrail.log('Login exitoso', operadora.nombre + ' en estación ' + CONFIG_ESTACION.nombre, 'auth', operadora.id, operadora.nombre);
    }

    // Login exitoso
    authState.operadoraActual = operadora;
    authState.sesionActiva = true;
    authState.inicioTurno = new Date();
    // Registrar última actividad para inactivity timeout
    authState.ultimaActividad = Date.now();

    guardarSesion();
    ocultarLogin();
    mostrarPanel();

    if (typeof initPanelOperadora === 'function') {
        initPanelOperadora();
    }
}

// Hash simple para comparación offline (NO es bcrypt, solo para fallback)
function _simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'sh_' + Math.abs(hash).toString(36);
}

function cerrarSesion() {
    try {
        // En lugar de confirmar directamente, mostrar resumen primero
        mostrarResumenCierreTurno();
    } catch (error) {
        console.error('[AUTH] Error al cerrar sesión:', error);
        // Si falla el resumen, ir directo al cierre
        if (confirm('¿Estás segura de que deseas cerrar sesión?')) {
            confirmarCierreSesion();
        }
    }
}

function mostrarResumenCierreTurno() {
    let stats;
    try {
        // Calcular estadísticas del día
        stats = calcularEstadisticasTurno();
    } catch (error) {
        console.error('[AUTH] Error calculando estadísticas:', error);
        stats = {
            piezasTotales: 0,
            tiempoTrabajado: '0m',
            eficiencia: 0,
            eficienciaClase: 'bajo',
            piezasPorMinuto: '0.0',
            metaDia: 0,
            porcentajeMeta: 0,
            cumpliMeta: false,
            piezasSobreMeta: 0,
            piezasFaltantes: 0,
            pausas: [],
            tiempoTotalPausas: '0m',
            comparacionAyer: null
        };
    }

    const content = `
        <div class="resumen-cierre">
            <!-- Header con saludo -->
            <div class="resumen-header-cierre">
                <div class="resumen-avatar">
                    <i class="fas fa-user-check"></i>
                </div>
                <h3>¡Buen trabajo, ${authState.operadoraActual?.nombre?.split(' ')[0] || 'Operadora'}!</h3>
                <p>Aquí está tu resumen del día</p>
            </div>

            <!-- Estadísticas principales -->
            <div class="resumen-stats-grid">
                <div class="stat-card principal">
                    <div class="stat-icono">
                        <i class="fas fa-cubes"></i>
                    </div>
                    <div class="stat-datos">
                        <span class="stat-numero">${stats.piezasTotales}</span>
                        <span class="stat-etiqueta">piezas producidas</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icono tiempo">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-datos">
                        <span class="stat-numero">${stats.tiempoTrabajado}</span>
                        <span class="stat-etiqueta">tiempo efectivo</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icono eficiencia ${stats.eficienciaClase}">
                        <i class="fas fa-percentage"></i>
                    </div>
                    <div class="stat-datos">
                        <span class="stat-numero">${stats.eficiencia}%</span>
                        <span class="stat-etiqueta">eficiencia</span>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icono ritmo">
                        <i class="fas fa-tachometer-alt"></i>
                    </div>
                    <div class="stat-datos">
                        <span class="stat-numero">${stats.piezasPorMinuto}</span>
                        <span class="stat-etiqueta">piezas/min</span>
                    </div>
                </div>
            </div>

            <!-- Comparación con meta -->
            <div class="resumen-meta-comparacion">
                <div class="meta-barra-container">
                    <div class="meta-barra">
                        <div class="meta-barra-fill ${stats.cumpliMeta ? 'cumplida' : ''}"
                             style="width: ${Math.min(100, stats.porcentajeMeta)}%"></div>
                        <div class="meta-marcador" style="left: ${Math.min(100, stats.porcentajeMeta)}%">
                            <span>${stats.porcentajeMeta}%</span>
                        </div>
                    </div>
                    <div class="meta-labels">
                        <span>0</span>
                        <span>Meta: ${stats.metaDia} piezas</span>
                    </div>
                </div>
                ${stats.cumpliMeta
                    ? `<div class="meta-mensaje exito">
                         <i class="fas fa-trophy"></i> ¡Cumpliste tu meta! ${stats.piezasSobreMeta > 0 ? `+${stats.piezasSobreMeta} extra` : ''}
                       </div>`
                    : `<div class="meta-mensaje pendiente">
                         <i class="fas fa-info-circle"></i> Te faltaron ${stats.piezasFaltantes} piezas para la meta
                       </div>`
                }
            </div>

            <!-- Detalle de pausas -->
            <div class="resumen-pausas">
                <h4><i class="fas fa-pause-circle"></i> Pausas del día</h4>
                ${stats.pausas.length > 0 ? `
                    <div class="pausas-lista">
                        ${stats.pausas.map(p => `
                            <div class="pausa-item-resumen">
                                <i class="fas ${p.icono}" style="color: ${p.color}"></i>
                                <span class="pausa-nombre">${p.nombre}</span>
                                <span class="pausa-duracion">${p.duracion}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="pausas-total">
                        <span>Total en pausas:</span>
                        <strong>${stats.tiempoTotalPausas}</strong>
                    </div>
                ` : `
                    <p class="sin-pausas">No tomaste pausas hoy</p>
                `}
            </div>

            <!-- Comparación con ayer -->
            ${stats.comparacionAyer ? `
                <div class="resumen-comparacion">
                    <h4><i class="fas fa-chart-line"></i> Comparado con ayer</h4>
                    <div class="comparacion-items">
                        <div class="comparacion-item ${stats.comparacionAyer.piezasDiff >= 0 ? 'positivo' : 'negativo'}">
                            <i class="fas fa-${stats.comparacionAyer.piezasDiff >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                            <span>${Math.abs(stats.comparacionAyer.piezasDiff)} piezas</span>
                        </div>
                        <div class="comparacion-item ${stats.comparacionAyer.eficienciaDiff >= 0 ? 'positivo' : 'negativo'}">
                            <i class="fas fa-${stats.comparacionAyer.eficienciaDiff >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                            <span>${Math.abs(stats.comparacionAyer.eficienciaDiff)}% eficiencia</span>
                        </div>
                    </div>
                </div>
            ` : ''}

            <!-- Mensaje motivacional final -->
            <div class="resumen-mensaje-final">
                ${obtenerMensajeFinalTurno(stats)}
            </div>
        </div>
    `;

    try {
        mostrarModal('Resumen de tu Turno', content, [
            { text: 'Seguir trabajando', class: 'btn-secondary', onclick: 'cerrarModal()' },
            { text: 'Cerrar Sesión', class: 'btn-danger', onclick: 'confirmarCierreSesion()' }
        ]);
    } catch (error) {
        console.error('[AUTH] Error mostrando modal:', error);
        // Fallback si falla el modal
        if (confirm('¿Estás segura de que deseas cerrar sesión?')) {
            confirmarCierreSesion();
        }
    }
}

function calcularEstadisticasTurno() {
    const ahora = new Date();
    const inicioTurno = authState.inicioTurno || ahora;

    // Tiempo total del turno
    const tiempoTurnoMs = ahora - inicioTurno;

    // Tiempo efectivo trabajado (sin pausas que detienen tiempo)
    let tiempoEfectivoMs = 0;
    let piezasTotales = 0;

    // Verificar si está en modo multi-pedido (calidad/empaque)
    if (typeof operadoraState !== 'undefined' && operadoraState.modoMultiPedido && operadoraState.pedidosActivos) {
        // Sumar tiempo y piezas de todos los pedidos activos
        operadoraState.pedidosActivos.forEach(pedido => {
            piezasTotales += (pedido.piezasCapturadas || 0);
            tiempoEfectivoMs += (pedido.tiempoProcesoAcumulado || 0);
            if (pedido.procesoIniciado && !pedido.procesoEnPausa && pedido.tiempoProcesoInicio) {
                tiempoEfectivoMs += (ahora - new Date(pedido.tiempoProcesoInicio));
            }
        });
    } else {
        // Modo normal (un solo pedido)
        tiempoEfectivoMs = typeof operadoraState !== 'undefined' ? (operadoraState.tiempoProcesoAcumulado || 0) : 0;
        if (typeof operadoraState !== 'undefined' && operadoraState.procesoIniciado && !operadoraState.procesoEnPausa && operadoraState.tiempoProcesoInicio) {
            const tiempoInicio = operadoraState.tiempoProcesoInicio instanceof Date
                ? operadoraState.tiempoProcesoInicio
                : new Date(operadoraState.tiempoProcesoInicio);
            tiempoEfectivoMs += (ahora - tiempoInicio);
        }
        piezasTotales = typeof operadoraState !== 'undefined' ? (operadoraState.piezasCapturadas || 0) : 0;
    }

    // Meta del día (basada en tiempo efectivo y meta por minuto)
    const metaPorMinuto = typeof operadoraState !== 'undefined' ? (operadoraState.metaPorMinuto || 2.5) : 2.5;
    const minutosEfectivos = tiempoEfectivoMs / 60000;
    const metaDia = Math.round(minutosEfectivos * metaPorMinuto);

    // Eficiencia
    const eficiencia = metaDia > 0 ? Math.round((piezasTotales / metaDia) * 100) : 0;

    // Piezas por minuto real
    const piezasPorMinuto = minutosEfectivos > 0
        ? (piezasTotales / minutosEfectivos).toFixed(1)
        : '0.0';

    // Porcentaje de meta
    const porcentajeMeta = metaDia > 0 ? Math.round((piezasTotales / metaDia) * 100) : 0;
    const cumpliMeta = porcentajeMeta >= 100;
    const piezasSobreMeta = cumpliMeta ? piezasTotales - metaDia : 0;
    const piezasFaltantes = !cumpliMeta ? metaDia - piezasTotales : 0;

    // Clase de eficiencia para color
    let eficienciaClase = 'bajo';
    if (eficiencia >= 100) eficienciaClase = 'excelente';
    else if (eficiencia >= 85) eficienciaClase = 'bien';
    else if (eficiencia >= 70) eficienciaClase = 'normal';

    // Procesar pausas
    const historialPausas = typeof operadoraState !== 'undefined' ? (operadoraState.historialPausas || []) : [];
    const pausasAgrupadas = {};
    let tiempoTotalPausasMs = 0;

    historialPausas.forEach(pausa => {
        const duracionMs = pausa.duracion || 0;
        tiempoTotalPausasMs += duracionMs;

        if (!pausasAgrupadas[pausa.motivoId]) {
            const motivoConfig = typeof MOTIVOS_PAUSA !== 'undefined'
                ? MOTIVOS_PAUSA.find(m => m.id === pausa.motivoId)
                : null;
            pausasAgrupadas[pausa.motivoId] = {
                nombre: motivoConfig?.nombre || pausa.motivoId,
                icono: motivoConfig?.icono || 'fa-pause',
                color: motivoConfig?.color || '#6b7280',
                duracionMs: 0,
                cantidad: 0
            };
        }
        pausasAgrupadas[pausa.motivoId].duracionMs += duracionMs;
        pausasAgrupadas[pausa.motivoId].cantidad++;
    });

    const pausas = Object.values(pausasAgrupadas).map(p => ({
        ...p,
        duracion: formatearDuracionResumen(p.duracionMs)
    }));

    // Comparación con ayer
    const comparacionAyer = obtenerComparacionAyer();

    return {
        piezasTotales,
        tiempoTrabajado: formatearDuracionResumen(tiempoEfectivoMs),
        tiempoTurno: formatearDuracionResumen(tiempoTurnoMs),
        eficiencia,
        eficienciaClase,
        piezasPorMinuto,
        metaDia,
        porcentajeMeta,
        cumpliMeta,
        piezasSobreMeta,
        piezasFaltantes,
        pausas,
        tiempoTotalPausas: formatearDuracionResumen(tiempoTotalPausasMs),
        comparacionAyer
    };
}

function formatearDuracionResumen(ms) {
    const totalMinutos = Math.floor(ms / 60000);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    if (horas > 0) {
        return `${horas}h ${minutos}m`;
    }
    return `${minutos}m`;
}

function obtenerComparacionAyer() {
    const historial = safeLocalGet('historial_turnos', []);
    const operadoraId = authState.operadoraActual?.id;

    // Buscar turno de ayer
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toISOString().split('T')[0];

    const turnoAyer = historial.find(t =>
        t.operadoraId === operadoraId &&
        t.fecha?.startsWith(ayerStr)
    );

    if (!turnoAyer) return null;

    const piezasHoy = typeof operadoraState !== 'undefined' ? (operadoraState.piezasCapturadas || 0) : 0;
    const eficienciaHoy = calcularEstadisticasTurno().eficiencia;

    return {
        piezasDiff: piezasHoy - (turnoAyer.piezas || 0),
        eficienciaDiff: eficienciaHoy - (turnoAyer.eficiencia || 0)
    };
}

function obtenerMensajeFinalTurno(stats) {
    if (stats.eficiencia >= 120) {
        return `<i class="fas fa-star"></i> ¡Extraordinario! Superaste todas las expectativas. ¡Eres increíble!`;
    } else if (stats.eficiencia >= 100) {
        return `<i class="fas fa-trophy"></i> ¡Excelente día! Cumpliste tu meta. ¡Descansa bien!`;
    } else if (stats.eficiencia >= 85) {
        return `<i class="fas fa-thumbs-up"></i> ¡Buen trabajo! Estuviste muy cerca de la meta.`;
    } else if (stats.eficiencia >= 70) {
        return `<i class="fas fa-smile"></i> Día aceptable. ¡Mañana será mejor!`;
    } else {
        return `<i class="fas fa-heart"></i> Gracias por tu esfuerzo. ¡Ánimo para mañana!`;
    }
}

function confirmarCierreSesion() {
    DEBUG_MODE && console.log('[AUTH] Iniciando cierre de sesión...');

    try {
        // Cerrar modal
        if (typeof cerrarModal === 'function') {
            cerrarModal();
        } else {
            document.getElementById('modalOverlay').style.display = 'none';
        }
    } catch (e) {
        console.error('[AUTH] Error cerrando modal:', e);
    }

    try {
        // Guardar datos finales del turno
        if (typeof guardarDatosTurno === 'function') {
            guardarDatosTurno();
        }
    } catch (e) {
        console.error('[AUTH] Error guardando datos turno:', e);
    }

    try {
        // Guardar en historial
        guardarTurnoEnHistorial();
    } catch (e) {
        console.error('[AUTH] Error guardando historial:', e);
    }

    try {
        // Limpiar timers de modo multi-pedido si estaba activo
        if (typeof operadoraState !== 'undefined' && operadoraState.modoMultiPedido && operadoraState.pedidosActivos) {
            operadoraState.pedidosActivos.forEach(pedido => {
                if (pedido.intervaloProceso) {
                    clearInterval(pedido.intervaloProceso);
                }
            });
            operadoraState.pedidosActivos = [];
            operadoraState.modoMultiPedido = false;
            localStorage.removeItem('multi_pedidos_estado_local');
        }
    } catch (e) {
        console.error('[AUTH] Error limpiando multi-pedido:', e);
    }

    // Limpiar estado de auth
    authState.operadoraActual = null;
    authState.sesionActiva = false;
    authState.inicioTurno = null;

    localStorage.removeItem('sesion_operadora');

    // Mostrar login
    ocultarPanel();
    mostrarLogin();
    limpiarFormLogin();

    DEBUG_MODE && console.log('[AUTH] Sesión cerrada correctamente');

    if (typeof mostrarToast === 'function') {
        mostrarToast('Sesión cerrada. ¡Hasta mañana!', 'success');
    }
}

function guardarTurnoEnHistorial() {
    try {
        const historial = safeLocalGet('historial_turnos', []);

        let stats = { eficiencia: 0, cumpliMeta: false };
        try {
            stats = calcularEstadisticasTurno();
        } catch (e) {
            console.error('[AUTH] Error calculando stats para historial:', e);
        }

        // Calcular piezas y tiempo considerando modo multi-pedido
        let piezasTurno = 0;
        let tiempoTurnoMs = 0;

        if (typeof operadoraState !== 'undefined' && operadoraState.modoMultiPedido && operadoraState.pedidosActivos) {
            operadoraState.pedidosActivos.forEach(pedido => {
                piezasTurno += (pedido.piezasCapturadas || 0);
                tiempoTurnoMs += (pedido.tiempoProcesoAcumulado || 0);
            });
        } else {
            piezasTurno = typeof operadoraState !== 'undefined' ? (operadoraState.piezasCapturadas || 0) : 0;
            tiempoTurnoMs = typeof operadoraState !== 'undefined' ? (operadoraState.tiempoProcesoAcumulado || 0) : 0;
        }

        const turno = {
            operadoraId: authState.operadoraActual?.id,
            operadoraNombre: authState.operadoraActual?.nombre,
            fecha: new Date().toISOString(),
            piezas: piezasTurno,
            eficiencia: stats.eficiencia || 0,
            tiempoTrabajadoMs: tiempoTurnoMs,
            cumpliMeta: stats.cumpliMeta || false,
            pausas: typeof operadoraState !== 'undefined' ? (operadoraState.historialPausas || []) : [],
            modoMultiPedido: typeof operadoraState !== 'undefined' ? (operadoraState.modoMultiPedido || false) : false
        };

        historial.push(turno);

        // Mantener solo últimos 30 días
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        const historialFiltrado = historial.filter(t => new Date(t.fecha) >= hace30Dias);

        localStorage.setItem('historial_turnos', JSON.stringify(historialFiltrado));
    } catch (e) {
        console.error('[AUTH] Error guardando turno en historial:', e);
    }
}

function verificarSesionActiva() {
    const sesionGuardada = localStorage.getItem('sesion_operadora');

    if (!sesionGuardada) {
        return false;
    }

    try {
        const sesion = JSON.parse(sesionGuardada);
        const fechaSesion = new Date(sesion.fecha).toDateString();
        const hoy = new Date().toDateString();

        // Verificar que la sesión sea del mismo día
        if (fechaSesion !== hoy) {
            localStorage.removeItem('sesion_operadora');
            return false;
        }

        // FASE 4.2: Verificar expiración de sesión (8 horas máximo)
        const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000;
        const tiempoSesion = Date.now() - new Date(sesion.fecha).getTime();
        if (tiempoSesion > SESSION_EXPIRY_MS) {
            console.warn('[AUTH] Sesión expirada después de 8 horas');
            localStorage.removeItem('sesion_operadora');
            return false;
        }

        // Verificar que la operadora existe
        const operadoras = getOperadorasDB();
        const operadora = operadoras.find(op => op.id === sesion.operadoraId);

        if (!operadora) {
            localStorage.removeItem('sesion_operadora');
            return false;
        }

        // Restaurar sesión
        authState.operadoraActual = operadora;
        authState.sesionActiva = true;
        authState.inicioTurno = new Date(sesion.inicioTurno);

        return true;
    } catch (e) {
        localStorage.removeItem('sesion_operadora');
        return false;
    }
}

function guardarSesion() {
    const sesion = {
        operadoraId: authState.operadoraActual.id,
        inicioTurno: authState.inicioTurno.toISOString(),
        estacionId: CONFIG_ESTACION.id,
        fecha: new Date().toISOString()
    };
    localStorage.setItem('sesion_operadora', JSON.stringify(sesion));

    // FASE 4.2: Verificar expiración cada 60 segundos
    if (window._sessionExpiryInterval) {
        clearInterval(window._sessionExpiryInterval);
    }
    window._sessionExpiryInterval = setInterval(() => {
        const sesionActual = localStorage.getItem('sesion_operadora');
        if (!sesionActual) return;
        try {
            const s = JSON.parse(sesionActual);
            const tiempoSesion = Date.now() - new Date(s.fecha).getTime();
            const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000;
            if (tiempoSesion > SESSION_EXPIRY_MS) {
                console.warn('[AUTH] Sesión expirada por inactividad');
                if (typeof mostrarToast === 'function') {
                    mostrarToast('Sesión expirada. Por favor inicia sesión de nuevo.', 'warning');
                }
                setTimeout(() => {
                    if (typeof cerrarSesion === 'function') cerrarSesion();
                }, 2000);
            }
        } catch (e) {}
    }, 60000);
}

// ========================================
// FUNCIONES DE UI LOGIN
// ========================================

function mostrarLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
}

function ocultarLogin() {
    document.getElementById('loginScreen').style.display = 'none';
}

function mostrarPanel() {
    document.getElementById('panelOperadora').style.display = 'flex';
}

function ocultarPanel() {
    document.getElementById('panelOperadora').style.display = 'none';

    // Ocultar columna multi-pedidos si estaba visible
    const colMulti = document.getElementById('colMultiPedidos');
    if (colMulti) colMulti.style.display = 'none';

    // Mostrar columna de pedido individual si estaba oculta
    const colPedido = document.querySelector('.col-pedido');
    if (colPedido) colPedido.style.display = '';
}

function mostrarErrorLogin(mensaje) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = mensaje;
    errorDiv.style.display = 'block';

    // Ocultar después de 3 segundos
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function limpiarFormLogin() {
    document.getElementById('numEmpleado').value = '';
    document.getElementById('pinInput').value = '';
    document.getElementById('loginError').style.display = 'none';
}

// ========================================
// TECLADO NUMÉRICO VIRTUAL
// ========================================

let campoActivo = null;

function enfocarCampo(campo) {
    campoActivo = campo;
    document.querySelectorAll('.input-field').forEach(el => el.classList.remove('active'));
    document.getElementById(campo).parentElement.classList.add('active');
}

function agregarDigito(digito) {
    if (!campoActivo) campoActivo = 'numEmpleado';

    const input = document.getElementById(campoActivo);

    if (campoActivo === 'pinInput' && input.value.length >= 4) {
        return;
    }

    if (campoActivo === 'numEmpleado' && input.value.length >= 6) {
        return;
    }

    input.value += digito;

    // Auto-avanzar al PIN cuando el número de empleado está completo
    if (campoActivo === 'numEmpleado' && input.value.length >= 3) {
        setTimeout(() => enfocarCampo('pinInput'), 100);
    }
}

function borrarDigito() {
    if (!campoActivo) return;
    const input = document.getElementById(campoActivo);
    input.value = input.value.slice(0, -1);
}

function limpiarCampo() {
    if (!campoActivo) return;
    document.getElementById(campoActivo).value = '';
}

// ========================================
// CONFIGURACIÓN DE ESTACIÓN
// ========================================

function configurarEstacion(id, area, nombre) {
    localStorage.setItem('estacion_id', id);
    localStorage.setItem('estacion_area', area);
    localStorage.setItem('estacion_nombre', nombre);

    CONFIG_ESTACION.id = id;
    CONFIG_ESTACION.area = area;
    CONFIG_ESTACION.nombre = nombre;

    DEBUG_MODE && console.log('Estación configurada:', CONFIG_ESTACION);
}

function mostrarConfigEstacion() {
    // Crear modal directamente si no existe la función mostrarModal
    // (puede que operadora.js no esté cargado en la pantalla de login)

    // Remover modal existente si hay
    const existente = document.getElementById('configModal');
    if (existente) existente.remove();

    const modalHTML = `
        <div id="configModal" style="
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        ">
            <div style="
                background: white;
                border-radius: 16px;
                padding: 24px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            ">
                <h3 style="margin: 0 0 20px; color: #1e293b; font-size: 1.3rem;">
                    <i class="fas fa-cog" style="color: #667eea;"></i> Configurar Estación
                </h3>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">
                        ID de Estación (debe coincidir con el layout)
                    </label>
                    <input type="text" id="configEstacionId" value="${CONFIG_ESTACION.id}"
                        placeholder="Ej: C1, E1, K1"
                        style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
                    <small style="color: #6b7280; margin-top: 4px; display: block;">
                        Usa el mismo ID que aparece en el panel de Coco/Supervisora
                    </small>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Área</label>
                    <select id="configEstacionArea" style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
                        <option value="costura" ${CONFIG_ESTACION.area === 'costura' ? 'selected' : ''}>Costura</option>
                        <option value="corte" ${CONFIG_ESTACION.area === 'corte' ? 'selected' : ''}>Corte</option>
                        <option value="empaque" ${CONFIG_ESTACION.area === 'empaque' ? 'selected' : ''}>Empaque</option>
                        <option value="serigrafia" ${CONFIG_ESTACION.area === 'serigrafia' ? 'selected' : ''}>Serigrafía</option>
                        <option value="calidad" ${CONFIG_ESTACION.area === 'calidad' ? 'selected' : ''}>Calidad</option>
                    </select>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: #374151;">Nombre</label>
                    <input type="text" id="configEstacionNombre" value="${CONFIG_ESTACION.nombre}"
                        placeholder="Ej: Costura 1"
                        style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
                </div>

                <div style="display: flex; gap: 12px;">
                    <button onclick="cerrarConfigModal()" style="
                        flex: 1;
                        padding: 14px;
                        border: 2px solid #e5e7eb;
                        background: white;
                        color: #374151;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Cancelar</button>
                    <button onclick="guardarConfigEstacion()" style="
                        flex: 1;
                        padding: 14px;
                        border: none;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Guardar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function cerrarConfigModal() {
    const modal = document.getElementById('configModal');
    if (modal) modal.remove();
}

function guardarConfigEstacion() {
    const id = document.getElementById('configEstacionId').value.trim();
    const area = document.getElementById('configEstacionArea').value;
    const nombre = document.getElementById('configEstacionNombre').value.trim();

    if (!id || !nombre) {
        alert('Completa todos los campos');
        return;
    }

    configurarEstacion(id, area, nombre);
    cerrarConfigModal();

    // Actualizar UI en pantalla de login
    if (document.getElementById('loginEstacion')) {
        document.getElementById('loginEstacion').textContent = `${CONFIG_ESTACION.id} - ${CONFIG_ESTACION.nombre}`;
    }

    // Actualizar UI en panel principal si existe
    if (document.getElementById('headerEstacion')) {
        document.getElementById('headerEstacion').textContent = `${CONFIG_ESTACION.id} - ${CONFIG_ESTACION.nombre}`;
    }

    // Mostrar confirmación
    alert(`Estación configurada: ${id} - ${nombre}`);
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Mostrar login inmediatamente mientras carga DB
    mostrarLogin();
    ocultarPanel();

    dbReady.then(() => {
        // Si viene por navegación directa (no refresh), forzar login
        var navType = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        var esNavegacion = navType && navType.type === 'navigate';

        // Verificar si hay sesión activa (solo permitir auto-restore en reload/back)
        if (!esNavegacion && verificarSesionActiva()) {
            ocultarLogin();
            mostrarPanel();
            if (typeof initPanelOperadora === 'function') {
                initPanelOperadora();
            }
        } else {
            // Si es navegación directa (desde landing), limpiar sesión y pedir login
            if (esNavegacion) {
                localStorage.removeItem('sesion_operadora');
            }
            mostrarLogin();
            ocultarPanel();
        }

        // Enfocar primer campo
        setTimeout(() => enfocarCampo('numEmpleado'), 100);
    }).catch(() => {
        // Si dbReady falla, igualmente mostrar login
        mostrarLogin();
        ocultarPanel();
        setTimeout(() => enfocarCampo('numEmpleado'), 100);
    });
});
