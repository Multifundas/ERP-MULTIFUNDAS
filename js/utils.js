// ========================================
// ERP MULTIFUNDAS - Utilidades Compartidas
// Funciones comunes usadas en múltiples paneles
// ========================================

(function() {
    'use strict';

    // ========================================
    // INICIALES
    // ========================================
    function getIniciales(nombre) {
        if (!nombre || typeof nombre !== 'string') return '??';
        var partes = nombre.trim().split(' ');
        if (partes.length >= 2 && partes[0] && partes[1]) {
            return (partes[0][0] + partes[1][0]).toUpperCase();
        }
        return nombre.substring(0, 2).toUpperCase();
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    function showToast(mensaje, tipo) {
        tipo = tipo || 'success';

        // Remover toast existente si hay
        var existingToast = document.querySelector('.toast-message, .toast-enhanced');
        if (existingToast) {
            existingToast.remove();
        }

        // Buscar contenedor de toasts (supervisora usa #toastContainer)
        var container = document.getElementById('toastContainer');

        var toast = document.createElement('div');
        toast.className = 'toast-message ' + tipo;

        var iconos = {
            'success': 'fa-check-circle',
            'error': 'fa-times-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        var icono = iconos[tipo] || 'fa-check-circle';

        // Sanitizar si S() está disponible
        var textoSeguro = typeof S === 'function' ? S(mensaje) : mensaje;
        toast.innerHTML = '<i class="fas ' + icono + '"></i> ' + textoSeguro;

        if (container) {
            toast.className = 'toast ' + tipo;
            container.appendChild(toast);
        } else {
            document.body.appendChild(toast);
            setTimeout(function() { toast.classList.add('show'); }, 10);
        }

        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    // ========================================
    // FORMATEO
    // ========================================
    function formatDate(date) {
        if (!date) return '-';
        var d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        return day + '/' + month + '/' + year;
    }

    function formatDateTime(date) {
        if (!date) return '-';
        var d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        var day = String(d.getDate()).padStart(2, '0');
        var month = String(d.getMonth() + 1).padStart(2, '0');
        var year = d.getFullYear();
        var hours = String(d.getHours()).padStart(2, '0');
        var mins = String(d.getMinutes()).padStart(2, '0');
        return day + '/' + month + '/' + year + ' ' + hours + ':' + mins;
    }

    function formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
        return '$' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return Number(num).toLocaleString('es-MX');
    }

    // ========================================
    // PAGINACIÓN GENÉRICA
    // ========================================
    var PAGE_SIZE = 25;

    function renderPaginacion(containerId, totalItems, currentPage, callback) {
        var totalPages = Math.ceil(totalItems / PAGE_SIZE);
        if (totalPages <= 1) return '';

        var html = '<div class="paginacion-container">';
        html += '<span class="paginacion-info">Mostrando ' +
            (((currentPage - 1) * PAGE_SIZE) + 1) + '-' +
            Math.min(currentPage * PAGE_SIZE, totalItems) +
            ' de ' + totalItems + '</span>';
        html += '<div class="paginacion-btns">';

        // Botón anterior
        html += '<button class="paginacion-btn" ' +
            (currentPage <= 1 ? 'disabled' : '') +
            ' onclick="' + callback + '(' + (currentPage - 1) + ')">' +
            '<i class="fas fa-chevron-left"></i></button>';

        // Páginas
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            html += '<button class="paginacion-btn" onclick="' + callback + '(1)">1</button>';
            if (startPage > 2) html += '<span class="paginacion-dots">...</span>';
        }

        for (var i = startPage; i <= endPage; i++) {
            html += '<button class="paginacion-btn' + (i === currentPage ? ' active' : '') +
                '" onclick="' + callback + '(' + i + ')">' + i + '</button>';
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += '<span class="paginacion-dots">...</span>';
            html += '<button class="paginacion-btn" onclick="' + callback + '(' + totalPages + ')">' + totalPages + '</button>';
        }

        // Botón siguiente
        html += '<button class="paginacion-btn" ' +
            (currentPage >= totalPages ? 'disabled' : '') +
            ' onclick="' + callback + '(' + (currentPage + 1) + ')">' +
            '<i class="fas fa-chevron-right"></i></button>';

        html += '</div></div>';
        return html;
    }

    function paginarArray(arr, page) {
        var start = (page - 1) * PAGE_SIZE;
        return arr.slice(start, start + PAGE_SIZE);
    }

    // ========================================
    // PERSISTENCIA DE FILTROS
    // ========================================
    function saveFilter(key, value) {
        try {
            sessionStorage.setItem('erp_filter_' + key, JSON.stringify(value));
        } catch (e) {}
    }

    function getFilter(key, defaultValue) {
        try {
            var val = sessionStorage.getItem('erp_filter_' + key);
            return val ? JSON.parse(val) : (defaultValue !== undefined ? defaultValue : null);
        } catch (e) {
            return defaultValue !== undefined ? defaultValue : null;
        }
    }

    function clearFilters() {
        Object.keys(sessionStorage).forEach(function(key) {
            if (key.startsWith('erp_filter_')) {
                sessionStorage.removeItem(key);
            }
        });
    }

    // ========================================
    // CONFIGURACIÓN CENTRALIZADA
    // Constantes y valores por defecto usados en múltiples paneles
    // ========================================
    var ERP_CONFIG = {
        // Producción
        META_POR_MINUTO_DEFAULT: 2.5,
        META_DIARIA_DEFAULT: 500,
        HORAS_TURNO: 8,

        // Tiempos (ms)
        INTERVALO_MONITOREO: 30000,
        INTERVALO_SYNC: 60000,
        TOAST_DURACION: 3000,
        FEEDBACK_MIN_INTERVALO: 120000,

        // Rate limiting
        LOGIN_MAX_INTENTOS: 3,
        LOGIN_BLOQUEO_MINUTOS: 5,

        // Offline
        OFFLINE_RETRY_MAX_DELAY: 60000,
        COLA_OFFLINE_MAX: 500,

        // Historial
        HISTORIAL_MAX_ITEMS: 100,
        NOTIFICACIONES_MAX: 50,

        // Paginación
        PAGE_SIZE: 25,

        // localStorage keys
        KEYS: {
            CONFIG_INCENTIVOS: 'erp_config_incentivos',
            PERSONAL: 'erp_personal',
            OPERADORAS_DB: 'operadoras_db',
            PEDIDOS_ERP: 'pedidos_erp',
            ESTADO_MAQUINAS: 'estado_maquinas',
            HISTORIAL_PRODUCCION: 'historial_produccion',
            HISTORIAL_TURNOS: 'historial_turnos'
        }
    };

    // ========================================
    // EXPORTAR GLOBALMENTE
    // ========================================
    window.getIniciales = getIniciales;
    window.showToast = showToast;
    window.formatDate = formatDate;
    window.formatDateTime = formatDateTime;
    window.formatCurrency = formatCurrency;
    window.formatNumber = formatNumber;
    window.renderPaginacion = renderPaginacion;
    window.paginarArray = paginarArray;
    window.PAGE_SIZE = PAGE_SIZE;
    window.saveFilter = saveFilter;
    window.getFilter = getFilter;
    window.clearFilters = clearFilters;
    window.ERP_CONFIG = ERP_CONFIG;

})();
