// ========================================
// PANEL OPERADORA - MÓDULOS POR ÁREA
// ========================================

// Cargar detalles según el área de la estación
function cargarDetallesPorArea(pedido, asignacion) {
    const area = CONFIG_ESTACION.area;

    switch(area) {
        case 'costura':
            return cargarDetallesCostura(pedido, asignacion);
        case 'corte':
            return cargarDetallesCorte(pedido, asignacion);
        case 'empaque':
            return cargarDetallesEmpaque(pedido, asignacion);
        case 'serigrafia':
            return cargarDetallesSerigrafia(pedido, asignacion);
        case 'calidad':
            return cargarDetallesCalidad(pedido, asignacion);
        default:
            return cargarDetallesGenericos(pedido, asignacion);
    }
}

// ========================================
// MÓDULO: COSTURA
// ========================================

function cargarDetallesCostura(pedido, asignacion) {
    const detalles = [];

    // Tipo de bies
    if (asignacion?.tipoBies || pedido?.tipoBies) {
        detalles.push({
            icono: 'fa-tape',
            iconoColor: '#667eea',
            label: 'Bies',
            valor: asignacion?.tipoBies || pedido?.tipoBies
        });
    }

    // Color de hilo
    if (asignacion?.colorHilo || pedido?.colorHilo) {
        const color = asignacion?.colorHilo || pedido?.colorHilo;
        detalles.push({
            icono: 'fa-circle',
            iconoColor: color,
            label: 'Hilo',
            valor: asignacion?.colorHiloNombre || pedido?.colorHiloNombre || color
        });
    }

    // Tipo de puntada
    if (asignacion?.tipoPuntada || pedido?.tipoPuntada) {
        detalles.push({
            icono: 'fa-grip-lines',
            iconoColor: '#8b5cf6',
            label: 'Puntada',
            valor: asignacion?.tipoPuntada || pedido?.tipoPuntada
        });
    }

    // Aguja
    if (asignacion?.tipoAguja || pedido?.tipoAguja) {
        detalles.push({
            icono: 'fa-syringe',
            iconoColor: '#6b7280',
            label: 'Aguja',
            valor: asignacion?.tipoAguja || pedido?.tipoAguja
        });
    }

    // Tensión
    if (asignacion?.tension || pedido?.tension) {
        detalles.push({
            icono: 'fa-sliders-h',
            iconoColor: '#f59e0b',
            label: 'Tensión',
            valor: asignacion?.tension || pedido?.tension
        });
    }

    return renderizarDetalles(detalles);
}

// ========================================
// MÓDULO: CORTE
// ========================================

function cargarDetallesCorte(pedido, asignacion) {
    const detalles = [];

    // Tipo de tela
    if (asignacion?.tipoTela || pedido?.tipoTela) {
        detalles.push({
            icono: 'fa-scroll',
            iconoColor: '#ec4899',
            label: 'Tela',
            valor: asignacion?.tipoTela || pedido?.tipoTela
        });
    }

    // Color de tela
    if (asignacion?.colorTela || pedido?.colorTela) {
        detalles.push({
            icono: 'fa-palette',
            iconoColor: asignacion?.colorTela || '#667eea',
            label: 'Color',
            valor: asignacion?.colorTelaNombre || pedido?.colorTelaNombre || 'Color'
        });
    }

    // Molde
    if (asignacion?.molde || pedido?.molde) {
        detalles.push({
            icono: 'fa-vector-square',
            iconoColor: '#10b981',
            label: 'Molde',
            valor: asignacion?.molde || pedido?.molde
        });
    }

    // Capas
    if (asignacion?.capas || pedido?.capas) {
        detalles.push({
            icono: 'fa-layer-group',
            iconoColor: '#3b82f6',
            label: 'Capas',
            valor: `${asignacion?.capas || pedido?.capas} capas`
        });
    }

    // Ancho de corte
    if (asignacion?.anchoCm || pedido?.anchoCm) {
        detalles.push({
            icono: 'fa-ruler-horizontal',
            iconoColor: '#6b7280',
            label: 'Ancho',
            valor: `${asignacion?.anchoCm || pedido?.anchoCm} cm`
        });
    }

    return renderizarDetalles(detalles);
}

// ========================================
// MÓDULO: EMPAQUE
// ========================================

function cargarDetallesEmpaque(pedido, asignacion) {
    const detalles = [];

    // Tipo de empaque
    if (asignacion?.tipoEmpaque || pedido?.tipoEmpaque) {
        detalles.push({
            icono: 'fa-box',
            iconoColor: '#8b5cf6',
            label: 'Empaque',
            valor: asignacion?.tipoEmpaque || pedido?.tipoEmpaque
        });
    }

    // Cantidad por paquete
    if (asignacion?.cantidadPorPaquete || pedido?.cantidadPorPaquete) {
        detalles.push({
            icono: 'fa-hashtag',
            iconoColor: '#f59e0b',
            label: 'Por paquete',
            valor: `${asignacion?.cantidadPorPaquete || pedido?.cantidadPorPaquete} piezas`
        });
    }

    // Etiquetado
    if (asignacion?.tipoEtiqueta || pedido?.tipoEtiqueta) {
        detalles.push({
            icono: 'fa-tag',
            iconoColor: '#10b981',
            label: 'Etiqueta',
            valor: asignacion?.tipoEtiqueta || pedido?.tipoEtiqueta
        });
    }

    // Bolsa
    if (asignacion?.tipoBolsa || pedido?.tipoBolsa) {
        detalles.push({
            icono: 'fa-shopping-bag',
            iconoColor: '#3b82f6',
            label: 'Bolsa',
            valor: asignacion?.tipoBolsa || pedido?.tipoBolsa
        });
    }

    return renderizarDetalles(detalles);
}

// ========================================
// MÓDULO: SERIGRAFÍA
// ========================================

function cargarDetallesSerigrafia(pedido, asignacion) {
    const detalles = [];

    // Diseño
    if (asignacion?.diseno || pedido?.diseno) {
        detalles.push({
            icono: 'fa-paint-brush',
            iconoColor: '#ec4899',
            label: 'Diseño',
            valor: asignacion?.diseno || pedido?.diseno
        });
    }

    // Colores de tinta
    if (asignacion?.coloresTinta || pedido?.coloresTinta) {
        const colores = asignacion?.coloresTinta || pedido?.coloresTinta;
        detalles.push({
            icono: 'fa-fill-drip',
            iconoColor: '#667eea',
            label: 'Tintas',
            valor: Array.isArray(colores) ? colores.join(', ') : colores
        });
    }

    // Marco
    if (asignacion?.marco || pedido?.marco) {
        detalles.push({
            icono: 'fa-border-style',
            iconoColor: '#6b7280',
            label: 'Marco',
            valor: asignacion?.marco || pedido?.marco
        });
    }

    // Posición
    if (asignacion?.posicionEstampado || pedido?.posicionEstampado) {
        detalles.push({
            icono: 'fa-crosshairs',
            iconoColor: '#10b981',
            label: 'Posición',
            valor: asignacion?.posicionEstampado || pedido?.posicionEstampado
        });
    }

    // Temperatura
    if (asignacion?.temperatura || pedido?.temperatura) {
        detalles.push({
            icono: 'fa-thermometer-half',
            iconoColor: '#ef4444',
            label: 'Temp.',
            valor: `${asignacion?.temperatura || pedido?.temperatura}°C`
        });
    }

    return renderizarDetalles(detalles);
}

// ========================================
// MÓDULO: CALIDAD
// ========================================

function cargarDetallesCalidad(pedido, asignacion) {
    const detalles = [];

    // Tipo de inspección
    if (asignacion?.tipoInspeccion || pedido?.tipoInspeccion) {
        detalles.push({
            icono: 'fa-search',
            iconoColor: '#3b82f6',
            label: 'Inspección',
            valor: asignacion?.tipoInspeccion || pedido?.tipoInspeccion
        });
    }

    // Criterios
    if (asignacion?.criterios || pedido?.criterios) {
        detalles.push({
            icono: 'fa-clipboard-check',
            iconoColor: '#10b981',
            label: 'Criterios',
            valor: asignacion?.criterios || pedido?.criterios
        });
    }

    // Muestra de referencia
    if (asignacion?.muestraRef || pedido?.muestraRef) {
        detalles.push({
            icono: 'fa-file-image',
            iconoColor: '#8b5cf6',
            label: 'Muestra',
            valor: asignacion?.muestraRef || pedido?.muestraRef
        });
    }

    // Tolerancia
    if (asignacion?.tolerancia || pedido?.tolerancia) {
        detalles.push({
            icono: 'fa-balance-scale',
            iconoColor: '#f59e0b',
            label: 'Tolerancia',
            valor: asignacion?.tolerancia || pedido?.tolerancia
        });
    }

    return renderizarDetalles(detalles);
}

// ========================================
// MÓDULO: GENÉRICO
// ========================================

function cargarDetallesGenericos(pedido, asignacion) {
    const detalles = [];

    // Proceso
    if (asignacion?.procesoNombre) {
        detalles.push({
            icono: 'fa-cog',
            iconoColor: '#667eea',
            label: 'Proceso',
            valor: asignacion.procesoNombre
        });
    }

    // Notas
    if (asignacion?.notas || pedido?.notas) {
        detalles.push({
            icono: 'fa-sticky-note',
            iconoColor: '#f59e0b',
            label: 'Notas',
            valor: asignacion?.notas || pedido?.notas
        });
    }

    return renderizarDetalles(detalles);
}

// ========================================
// UTILIDAD: RENDERIZAR DETALLES
// ========================================

function renderizarDetalles(detalles) {
    if (detalles.length === 0) {
        return '<p class="sin-detalles">Sin detalles adicionales</p>';
    }

    return `
        <div class="detalles-proceso">
            ${detalles.map(d => `
                <div class="detalle-item">
                    <i class="fas ${d.icono}" style="color: ${d.iconoColor}"></i>
                    <label>${d.label}:</label>
                    <span>${d.valor}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ========================================
// CONFIGURACIÓN ESPECÍFICA POR ÁREA
// ========================================

const AREA_CONFIG = {
    costura: {
        nombre: 'Costura',
        icono: 'fa-tshirt',
        color: '#667eea',
        metaDefecto: 2.5, // piezas por minuto
        campos: ['tipoBies', 'colorHilo', 'tipoPuntada', 'tipoAguja', 'tension']
    },
    corte: {
        nombre: 'Corte',
        icono: 'fa-cut',
        color: '#ec4899',
        metaDefecto: 3.0,
        campos: ['tipoTela', 'colorTela', 'molde', 'capas', 'anchoCm']
    },
    empaque: {
        nombre: 'Empaque',
        icono: 'fa-box',
        color: '#8b5cf6',
        metaDefecto: 5.0,
        campos: ['tipoEmpaque', 'cantidadPorPaquete', 'tipoEtiqueta', 'tipoBolsa']
    },
    serigrafia: {
        nombre: 'Serigrafía',
        icono: 'fa-paint-brush',
        color: '#f59e0b',
        metaDefecto: 1.5,
        campos: ['diseno', 'coloresTinta', 'marco', 'posicionEstampado', 'temperatura']
    },
    calidad: {
        nombre: 'Control de Calidad',
        icono: 'fa-check-circle',
        color: '#10b981',
        metaDefecto: 4.0,
        campos: ['tipoInspeccion', 'criterios', 'muestraRef', 'tolerancia']
    }
};

function getAreaConfig() {
    return AREA_CONFIG[CONFIG_ESTACION.area] || {
        nombre: 'Estación',
        icono: 'fa-cog',
        color: '#6b7280',
        metaDefecto: 2.5,
        campos: []
    };
}

// ========================================
// VALIDACIONES ESPECÍFICAS POR ÁREA
// ========================================

function validarCapturaArea(cantidad) {
    const area = CONFIG_ESTACION.area;

    // Validaciones específicas
    switch(area) {
        case 'empaque':
            // En empaque, generalmente se capturan paquetes completos
            const pzasPorPaquete = operadoraState.procesoActual?.cantidadPorPaquete || 1;
            if (cantidad % pzasPorPaquete !== 0) {
                return {
                    valido: false,
                    mensaje: `En empaque, captura múltiplos de ${pzasPorPaquete} (piezas por paquete)`
                };
            }
            break;

        case 'corte':
            // En corte, se capturan por capas
            const capas = operadoraState.procesoActual?.capas || 1;
            if (cantidad > capas * 10) {
                return {
                    valido: false,
                    mensaje: `Cantidad muy alta para ${capas} capas. Verifica.`
                };
            }
            break;
    }

    return { valido: true };
}
