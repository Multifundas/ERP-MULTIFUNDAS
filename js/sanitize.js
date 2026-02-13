// ========================================
// ERP MULTIFUNDAS - Sanitización HTML
// Previene XSS en contenido dinámico
// ========================================

(function() {
    'use strict';

    /**
     * Escapa caracteres HTML peligrosos en texto plano.
     * Usar cuando se inserta texto de usuario dentro de HTML.
     * Ej: sanitizeHTML(usuario.nombre)
     */
    function sanitizeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Alias corto
    window.sanitizeHTML = sanitizeHTML;
    window.S = sanitizeHTML;
})();
