// ========================================
// ERP MULTIFUNDAS - MODULO: ASISTENTE IA
// Chat inteligente con procesamiento de consultas
// Extraido de app.js para modularizacion
// ========================================

// ========================================
// ASISTENTE IA - CHAT INTELIGENTE
// ========================================

// Estado del chat IA
const aiChatState = {
    isOpen: false,
    messages: [],
    isTyping: false
};

// Toggle del panel de chat
function toggleAIChat() {
    const fab = document.getElementById('aiAssistantFab');
    const panel = document.getElementById('aiChatPanel');

    aiChatState.isOpen = !aiChatState.isOpen;

    fab.classList.toggle('active', aiChatState.isOpen);
    panel.classList.toggle('active', aiChatState.isOpen);

    if (aiChatState.isOpen) {
        document.getElementById('aiChatInput').focus();
    }
}

// Limpiar chat
function clearAIChat() {
    const messagesContainer = document.getElementById('aiChatMessages');
    messagesContainer.innerHTML = `
        <div class="ai-message bot">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Chat limpiado. ¿En qué puedo ayudarte?</p>
            </div>
        </div>
    `;
    aiChatState.messages = [];
}

// Manejar tecla Enter
function handleAIChatKeypress(event) {
    if (event.key === 'Enter') {
        sendAIMessage();
    }
}

// Enviar mensaje
function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();

    if (!message) return;

    // Agregar mensaje del usuario
    addAIMessage(message, 'user');
    input.value = '';

    // Mostrar indicador de escritura
    showTypingIndicator();

    // Procesar respuesta (simulando delay de IA)
    setTimeout(() => {
        hideTypingIndicator();
        const response = processAIQuery(message);
        addAIMessage(response, 'bot');
    }, 800 + Math.random() * 700);
}

// Pregunta sugerida
function askAISuggestion(question) {
    document.getElementById('aiChatInput').value = question;
    sendAIMessage();
}

// Agregar mensaje al chat
function addAIMessage(content, type) {
    const messagesContainer = document.getElementById('aiChatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${type}`;

    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="message-content">
                <p>${escapeHTML(content)}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                ${content}
            </div>
        `;
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    aiChatState.messages.push({ type, content });
}

// Indicador de escritura
function showTypingIndicator() {
    const messagesContainer = document.getElementById('aiChatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.className = 'ai-message bot';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="ai-typing">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('aiTypingIndicator');
    if (indicator) indicator.remove();
}

// Escapar HTML
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========================================
// MOTOR DE RESPUESTAS IA
// ========================================

function processAIQuery(query) {
    const queryLower = query.toLowerCase();

    // Obtener datos actuales del sistema
    const stats = getAISystemStats();

    // Determinar tipo de consulta y generar respuesta
    if (queryLower.includes('pedido') && (queryLower.includes('urgente') || queryLower.includes('crítico'))) {
        return generateUrgentOrdersResponse(stats);
    }

    if (queryLower.includes('eficiencia') || queryLower.includes('rendimiento general')) {
        return generateEfficiencyResponse(stats);
    }

    if (queryLower.includes('operador') || queryLower.includes('operadora') || queryLower.includes('personal')) {
        if (queryLower.includes('mejor') || queryLower.includes('top') || queryLower.includes('ranking')) {
            return generateTopOperatorsResponse(stats);
        }
        return generateOperatorsOverviewResponse(stats);
    }

    if (queryLower.includes('alerta') || queryLower.includes('problema') || queryLower.includes('pendiente')) {
        return generateAlertsResponse(stats);
    }

    if (queryLower.includes('producción') || queryLower.includes('produccion')) {
        return generateProductionResponse(stats);
    }

    if (queryLower.includes('cliente')) {
        return generateClientsResponse(stats);
    }

    if (queryLower.includes('costo') || queryLower.includes('presupuesto') || queryLower.includes('gasto')) {
        return generateCostResponse(stats);
    }

    if (queryLower.includes('entrega') || queryLower.includes('pendiente')) {
        return generateDeliveriesResponse(stats);
    }

    if (queryLower.includes('resumen') || queryLower.includes('general') || queryLower.includes('cómo está') || queryLower.includes('como esta')) {
        return generateGeneralSummaryResponse(stats);
    }

    if (queryLower.includes('hola') || queryLower.includes('buenos') || queryLower.includes('buenas')) {
        return generateGreetingResponse();
    }

    if (queryLower.includes('ayuda') || queryLower.includes('puedes') || queryLower.includes('qué haces')) {
        return generateHelpResponse();
    }

    // Respuesta por defecto
    return generateDefaultResponse(query);
}

// Obtener estadísticas del sistema
function getAISystemStats() {
    const pedidos = window.pedidos || [];
    const clientes = window.clientes || [];
    const operadores = window.operadores || [];
    const procesos = window.procesos || [];

    // Calcular estadísticas
    const pedidosActivos = pedidos.filter(p => p.estado !== 'entregado' && p.estado !== 'cancelado');
    const pedidosUrgentes = pedidosActivos.filter(p => p.prioridad === 'alta' || p.prioridad === 'urgente');
    const pedidosCriticos = pedidosActivos.filter(p => {
        if (!p.fechaEntrega) return false;
        const diasRestantes = Math.ceil((new Date(p.fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24));
        return diasRestantes <= 3 && p.progreso < 80;
    });

    const operadoresActivos = operadores.filter(o => o.estado === 'activo' || o.activo);
    const eficienciaPromedio = operadoresActivos.length > 0
        ? Math.round(operadoresActivos.reduce((sum, o) => sum + (o.eficiencia || o.efectividad || 85), 0) / operadoresActivos.length)
        : 85;

    const clientesActivos = clientes.filter(c => c.estado === 'activo' || c.activo !== false);

    const procesosActivos = procesos.filter(p => p.estado === 'activo' || p.activo);

    // Producción del día
    let produccionHoy = 0;
    let metaHoy = 0;
    operadoresActivos.forEach(op => {
        produccionHoy += op.piezasHoy || op.produccionHoy || Math.floor(Math.random() * 100) + 50;
        metaHoy += op.metaDiaria || 100;
    });

    return {
        pedidos: {
            total: pedidos.length,
            activos: pedidosActivos.length,
            urgentes: pedidosUrgentes.length,
            criticos: pedidosCriticos.length,
            lista: pedidosActivos.slice(0, 5)
        },
        operadores: {
            total: operadores.length,
            activos: operadoresActivos.length,
            eficienciaPromedio,
            lista: operadoresActivos.slice(0, 10)
        },
        clientes: {
            total: clientes.length,
            activos: clientesActivos.length,
            lista: clientesActivos.slice(0, 5)
        },
        procesos: {
            total: procesos.length,
            activos: procesosActivos.length
        },
        produccion: {
            hoy: produccionHoy,
            meta: metaHoy,
            porcentaje: metaHoy > 0 ? Math.round((produccionHoy / metaHoy) * 100) : 0
        }
    };
}

// Generar respuesta sobre pedidos urgentes
function generateUrgentOrdersResponse(stats) {
    const { urgentes, criticos, lista } = stats.pedidos;

    if (urgentes === 0 && criticos === 0) {
        return `
            <p>¡Buenas noticias! No hay pedidos urgentes o críticos en este momento.</p>
            <div class="ai-alert success">
                <i class="fas fa-check-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Todo bajo control</div>
                    <div class="ai-alert-text">Todos los pedidos están dentro de los tiempos normales.</div>
                </div>
            </div>
        `;
    }

    let html = `<p>Encontré <strong>${urgentes} pedidos urgentes</strong>`;
    if (criticos > 0) {
        html += ` y <strong>${criticos} en estado crítico</strong>`;
    }
    html += `.</p>`;

    if (lista.length > 0) {
        html += `<div class="ai-items-list">`;
        lista.slice(0, 4).forEach(p => {
            const diasRestantes = p.fechaEntrega
                ? Math.ceil((new Date(p.fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24))
                : 'N/A';
            const statusClass = diasRestantes <= 1 ? 'danger' : diasRestantes <= 3 ? 'warning' : '';
            html += `
                <div class="ai-item">
                    <span class="ai-item-name">#${p.id} - ${p.cliente || 'Sin cliente'}</span>
                    <span class="ai-item-value ${statusClass}">${diasRestantes} días</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    if (criticos > 0) {
        html += `
            <div class="ai-alert">
                <i class="fas fa-exclamation-triangle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Atención requerida</div>
                    <div class="ai-alert-text">Los pedidos críticos necesitan priorización inmediata.</div>
                </div>
            </div>
        `;
    }

    return html;
}

// Generar respuesta sobre eficiencia
function generateEfficiencyResponse(stats) {
    const { eficienciaPromedio, activos } = stats.operadores;
    const { porcentaje, hoy, meta } = stats.produccion;

    const statusClass = eficienciaPromedio >= 90 ? 'success' : eficienciaPromedio >= 75 ? 'warning' : 'danger';
    const statusText = eficienciaPromedio >= 90 ? 'Excelente' : eficienciaPromedio >= 75 ? 'Aceptable' : 'Necesita mejora';

    return `
        <p>Aquí está el análisis de eficiencia actual:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${eficienciaPromedio}%</span>
                <span class="ai-stat-label">Eficiencia Promedio</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${porcentaje}%</span>
                <span class="ai-stat-label">Meta del Día</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${hoy.toLocaleString()}</span>
                <span class="ai-stat-label">Piezas Producidas</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${activos}</span>
                <span class="ai-stat-label">Operadores Activos</span>
            </div>
        </div>
        <div class="ai-alert ${statusClass}">
            <i class="fas fa-${statusClass === 'success' ? 'check-circle' : statusClass === 'warning' ? 'exclamation-circle' : 'times-circle'}"></i>
            <div class="ai-alert-content">
                <div class="ai-alert-title">Estado: ${statusText}</div>
                <div class="ai-alert-text">${getEfficiencyAdvice(eficienciaPromedio)}</div>
            </div>
        </div>
    `;
}

function getEfficiencyAdvice(efficiency) {
    if (efficiency >= 90) return 'El equipo está trabajando de manera óptima. ¡Mantener el ritmo!';
    if (efficiency >= 75) return 'Hay oportunidad de mejora. Revisar cuellos de botella.';
    return 'Se recomienda analizar causas de baja productividad urgentemente.';
}

// Generar respuesta sobre top operadores
function generateTopOperatorsResponse(stats) {
    const operadores = stats.operadores.lista
        .map(o => ({
            nombre: o.nombre,
            eficiencia: o.eficiencia || o.efectividad || Math.floor(Math.random() * 20) + 80,
            piezas: o.piezasHoy || o.produccionHoy || Math.floor(Math.random() * 50) + 80
        }))
        .sort((a, b) => b.eficiencia - a.eficiencia)
        .slice(0, 5);

    if (operadores.length === 0) {
        return `<p>No hay datos de operadores disponibles en este momento.</p>`;
    }

    let html = `<p>Estos son los <strong>operadores con mejor rendimiento</strong> hoy:</p>`;
    html += `<div class="ai-items-list">`;

    operadores.forEach((op, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
        html += `
            <div class="ai-item">
                <span class="ai-item-name">${medal} ${op.nombre}</span>
                <span class="ai-item-value">${op.eficiencia}% - ${op.piezas} pzas</span>
            </div>
        `;
    });

    html += `</div>`;
    html += `<p style="margin-top: 10px; color: #9ca3af; font-size: 0.8rem;">
        <i class="fas fa-lightbulb"></i> Tip: Reconocer el buen desempeño motiva al equipo.
    </p>`;

    return html;
}

// Generar respuesta general de operadores
function generateOperatorsOverviewResponse(stats) {
    const { total, activos, eficienciaPromedio } = stats.operadores;

    return `
        <p>Estado actual del personal:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${activos}</span>
                <span class="ai-stat-label">Activos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${total - activos}</span>
                <span class="ai-stat-label">Inactivos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${eficienciaPromedio}%</span>
                <span class="ai-stat-label">Eficiencia Prom.</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${total}</span>
                <span class="ai-stat-label">Total Registrados</span>
            </div>
        </div>
        <p>¿Quieres ver el ranking de los mejores operadores? Pregúntame por el "top operadores".</p>
    `;
}

// Generar respuesta sobre alertas
function generateAlertsResponse(stats) {
    const alertas = [];

    if (stats.pedidos.criticos > 0) {
        alertas.push({
            tipo: 'danger',
            titulo: 'Pedidos Críticos',
            texto: `${stats.pedidos.criticos} pedidos necesitan atención inmediata`
        });
    }

    if (stats.pedidos.urgentes > 0) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Pedidos Urgentes',
            texto: `${stats.pedidos.urgentes} pedidos marcados como urgentes`
        });
    }

    if (stats.operadores.eficienciaPromedio < 75) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Eficiencia Baja',
            texto: `La eficiencia promedio está en ${stats.operadores.eficienciaPromedio}%`
        });
    }

    if (stats.produccion.porcentaje < 80) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Meta del Día',
            texto: `Solo se ha alcanzado el ${stats.produccion.porcentaje}% de la meta diaria`
        });
    }

    if (alertas.length === 0) {
        return `
            <p>¡No hay alertas activas en este momento!</p>
            <div class="ai-alert success">
                <i class="fas fa-check-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Sistema estable</div>
                    <div class="ai-alert-text">Todos los indicadores están dentro de los parámetros normales.</div>
                </div>
            </div>
        `;
    }

    let html = `<p>Encontré <strong>${alertas.length} alertas</strong> que requieren atención:</p>`;

    alertas.forEach(alerta => {
        html += `
            <div class="ai-alert ${alerta.tipo}">
                <i class="fas fa-${alerta.tipo === 'danger' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">${alerta.titulo}</div>
                    <div class="ai-alert-text">${alerta.texto}</div>
                </div>
            </div>
        `;
    });

    return html;
}

// Generar respuesta sobre producción
function generateProductionResponse(stats) {
    const { hoy, meta, porcentaje } = stats.produccion;
    const statusClass = porcentaje >= 90 ? 'success' : porcentaje >= 70 ? 'warning' : 'danger';

    return `
        <p>Resumen de producción del día:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${hoy.toLocaleString()}</span>
                <span class="ai-stat-label">Piezas Hoy</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${meta.toLocaleString()}</span>
                <span class="ai-stat-label">Meta Diaria</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${porcentaje}%</span>
                <span class="ai-stat-label">Avance</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.operadores.activos}</span>
                <span class="ai-stat-label">Operadores</span>
            </div>
        </div>
        <div class="ai-alert ${statusClass}">
            <i class="fas fa-industry"></i>
            <div class="ai-alert-content">
                <div class="ai-alert-title">${porcentaje >= 90 ? '¡Excelente producción!' : porcentaje >= 70 ? 'Producción aceptable' : 'Producción por debajo de la meta'}</div>
                <div class="ai-alert-text">${meta - hoy > 0 ? `Faltan ${(meta - hoy).toLocaleString()} piezas para la meta` : '¡Meta superada!'}</div>
            </div>
        </div>
    `;
}

// Generar respuesta sobre clientes
function generateClientsResponse(stats) {
    const { total, activos, lista } = stats.clientes;

    let html = `
        <p>Información de clientes:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${activos}</span>
                <span class="ai-stat-label">Clientes Activos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${total}</span>
                <span class="ai-stat-label">Total Registrados</span>
            </div>
        </div>
    `;

    if (lista.length > 0) {
        html += `<p>Clientes con pedidos activos:</p><div class="ai-items-list">`;
        lista.slice(0, 4).forEach(c => {
            html += `
                <div class="ai-item">
                    <span class="ai-item-name">${c.nombre || c.razonSocial || 'Cliente'}</span>
                    <span class="ai-item-value">${c.pedidosActivos || 0} pedidos</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    return html;
}

// Generar respuesta sobre costos
function generateCostResponse(stats) {
    // Simular datos de costos
    const costoReal = Math.floor(Math.random() * 50000) + 200000;
    const presupuesto = 250000;
    const diferencia = costoReal - presupuesto;
    const porcentaje = Math.round((diferencia / presupuesto) * 100);

    const statusClass = porcentaje <= 0 ? 'success' : porcentaje <= 5 ? 'warning' : 'danger';

    return `
        <p>Análisis de costos del período:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">$${costoReal.toLocaleString()}</span>
                <span class="ai-stat-label">Costo Real</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">$${presupuesto.toLocaleString()}</span>
                <span class="ai-stat-label">Presupuesto</span>
            </div>
        </div>
        <div class="ai-alert ${statusClass}">
            <i class="fas fa-${diferencia > 0 ? 'arrow-up' : 'arrow-down'}"></i>
            <div class="ai-alert-content">
                <div class="ai-alert-title">${diferencia > 0 ? 'Sobre presupuesto' : 'Bajo presupuesto'}</div>
                <div class="ai-alert-text">${Math.abs(porcentaje)}% ${diferencia > 0 ? 'por encima' : 'por debajo'} del presupuesto</div>
            </div>
        </div>
    `;
}

// Generar respuesta sobre entregas
function generateDeliveriesResponse(stats) {
    const { activos, lista } = stats.pedidos;

    let html = `<p>Hay <strong>${activos} pedidos pendientes</strong> de entrega.</p>`;

    if (lista.length > 0) {
        html += `<div class="ai-items-list">`;
        lista.slice(0, 5).forEach(p => {
            const diasRestantes = p.fechaEntrega
                ? Math.ceil((new Date(p.fechaEntrega) - new Date()) / (1000 * 60 * 60 * 24))
                : 'N/A';
            const statusClass = diasRestantes <= 1 ? 'danger' : diasRestantes <= 3 ? 'warning' : '';
            html += `
                <div class="ai-item">
                    <span class="ai-item-name">#${p.id} - ${p.cliente || 'Sin cliente'}</span>
                    <span class="ai-item-value ${statusClass}">${typeof diasRestantes === 'number' ? diasRestantes + ' días' : diasRestantes}</span>
                </div>
            `;
        });
        html += `</div>`;
    }

    return html;
}

// Generar resumen general
function generateGeneralSummaryResponse(stats) {
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    return `
        <p>${saludo}! Aquí está el resumen del sistema:</p>
        <div class="ai-stats-grid">
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.pedidos.activos}</span>
                <span class="ai-stat-label">Pedidos Activos</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.operadores.activos}</span>
                <span class="ai-stat-label">Operadores</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.operadores.eficienciaPromedio}%</span>
                <span class="ai-stat-label">Eficiencia</span>
            </div>
            <div class="ai-stat-card">
                <span class="ai-stat-value">${stats.produccion.porcentaje}%</span>
                <span class="ai-stat-label">Meta del Día</span>
            </div>
        </div>
        ${stats.pedidos.urgentes > 0 || stats.pedidos.criticos > 0 ? `
            <div class="ai-alert warning">
                <i class="fas fa-exclamation-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Atención</div>
                    <div class="ai-alert-text">${stats.pedidos.urgentes} pedidos urgentes y ${stats.pedidos.criticos} críticos requieren seguimiento.</div>
                </div>
            </div>
        ` : `
            <div class="ai-alert success">
                <i class="fas fa-check-circle"></i>
                <div class="ai-alert-content">
                    <div class="ai-alert-title">Todo en orden</div>
                    <div class="ai-alert-text">No hay situaciones críticas que atender.</div>
                </div>
            </div>
        `}
    `;
}

// Respuesta de saludo
function generateGreetingResponse() {
    const hora = new Date().getHours();
    const saludo = hora < 12 ? '¡Buenos días!' : hora < 18 ? '¡Buenas tardes!' : '¡Buenas noches!';

    return `
        <p>${saludo} ¿En qué puedo ayudarte hoy?</p>
        <p>Puedo informarte sobre:</p>
        <ul>
            <li>Estado de pedidos</li>
            <li>Eficiencia y producción</li>
            <li>Rendimiento de operadores</li>
            <li>Alertas del sistema</li>
        </ul>
    `;
}

// Respuesta de ayuda
function generateHelpResponse() {
    return `
        <p>Soy el asistente inteligente de Multifundas. Puedo ayudarte con:</p>
        <ul>
            <li><strong>"Pedidos urgentes"</strong> - Ver pedidos que necesitan atención</li>
            <li><strong>"Eficiencia"</strong> - Análisis de rendimiento</li>
            <li><strong>"Top operadores"</strong> - Ranking de mejor desempeño</li>
            <li><strong>"Alertas"</strong> - Problemas pendientes</li>
            <li><strong>"Producción"</strong> - Estado de producción del día</li>
            <li><strong>"Resumen general"</strong> - Vista general del sistema</li>
        </ul>
        <p>¡Solo pregúntame lo que necesites!</p>
    `;
}

// Respuesta por defecto
function generateDefaultResponse(query) {
    return `
        <p>Entiendo que preguntas sobre: <em>"${query}"</em></p>
        <p>No tengo información específica sobre eso, pero puedo ayudarte con:</p>
        <ul>
            <li>Pedidos (urgentes, estado, entregas)</li>
            <li>Operadores (rendimiento, top, activos)</li>
            <li>Producción (eficiencia, metas)</li>
            <li>Alertas y problemas</li>
        </ul>
        <p>¿Puedes reformular tu pregunta?</p>
    `;
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    addThemeToggleButton();
});

DEBUG_MODE && console.log('[app.js] Módulo cargado completamente');
DEBUG_MODE && console.log('[app.js] showPosicionDetalle disponible:', typeof showPosicionDetalle);
DEBUG_MODE && console.log('[app.js] window.showPosicionDetalle disponible:', typeof window.showPosicionDetalle);
