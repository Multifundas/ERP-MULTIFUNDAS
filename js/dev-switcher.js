// ========================================
// ERP MULTIFUNDAS - Dev Role Switcher
// Barra flotante para cambiar entre vistas
// Visible con ?dev=1 o localStorage dev_mode
// ========================================

(function() {
    'use strict';

    // Solo mostrar en modo desarrollo
    var isDev = window.location.search.includes('dev=1') ||
                localStorage.getItem('dev_mode') === 'true';

    if (!isDev) return;

    // Activar dev_mode para futuras cargas
    localStorage.setItem('dev_mode', 'true');

    // Determinar la página actual
    var path = window.location.pathname.toLowerCase();
    var currentPage = 'other';
    if (path.includes('admin')) currentPage = 'admin';
    else if (path.includes('supervisora')) currentPage = 'supervisora';
    else if (path.includes('operadora')) currentPage = 'operadora';
    else if (path.includes('layout')) currentPage = 'layout';
    else if (path.includes('index') || path.endsWith('/')) currentPage = 'landing';

    // Rutas relativas según ubicación
    var isInSubfolder = path.includes('panel-operadora');
    var basePath = isInSubfolder ? '../' : '';
    var operadoraPath = isInSubfolder ? 'operadora.html' : 'panel-operadora/operadora.html';

    var links = [
        { id: 'landing', label: 'Landing', icon: 'fa-home', href: basePath + 'index.html' },
        { id: 'admin', label: 'Admin', icon: 'fa-chart-line', href: basePath + 'admin.html?noauth=1' },
        { id: 'supervisora', label: 'Super', icon: 'fa-users-cog', href: basePath + 'supervisora.html?noauth=1' },
        { id: 'operadora', label: 'Oper', icon: 'fa-hard-hat', href: operadoraPath },
        { id: 'layout', label: 'Layout', icon: 'fa-drafting-compass', href: basePath + 'layout-editor.html' }
    ];

    // Crear el switcher flotante
    var container = document.createElement('div');
    container.id = 'devSwitcher';

    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'devSwitcherToggle';
    toggleBtn.innerHTML = '<i class="fas fa-code"></i>';
    toggleBtn.title = 'Dev Switcher';

    var menu = document.createElement('div');
    menu.id = 'devSwitcherMenu';
    menu.style.display = 'none';

    links.forEach(function(link) {
        var a = document.createElement('a');
        a.href = link.href + (link.href.includes('?') ? '&' : '?') + 'dev=1';
        a.className = 'dev-switcher-link' + (link.id === currentPage ? ' active' : '');
        a.innerHTML = '<i class="fas ' + link.icon + '"></i> ' + link.label;
        menu.appendChild(a);
    });

    // Botón para desactivar dev mode
    var offBtn = document.createElement('button');
    offBtn.className = 'dev-switcher-off';
    offBtn.innerHTML = '<i class="fas fa-times"></i>';
    offBtn.title = 'Desactivar dev mode';
    offBtn.onclick = function() {
        localStorage.removeItem('dev_mode');
        container.remove();
    };
    menu.appendChild(offBtn);

    container.appendChild(menu);
    container.appendChild(toggleBtn);

    var isOpen = false;
    toggleBtn.addEventListener('click', function() {
        isOpen = !isOpen;
        menu.style.display = isOpen ? 'flex' : 'none';
        toggleBtn.classList.toggle('open', isOpen);
    });

    // Estilos
    var style = document.createElement('style');
    style.textContent =
        '#devSwitcher{position:fixed;bottom:16px;right:16px;z-index:99998;display:flex;flex-direction:column;align-items:flex-end;gap:8px;}' +
        '#devSwitcherToggle{width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:1rem;cursor:pointer;box-shadow:0 4px 15px rgba(102,126,234,0.5);transition:transform 0.3s;}' +
        '#devSwitcherToggle:hover{transform:scale(1.1);}' +
        '#devSwitcherToggle.open{background:linear-gradient(135deg,#ef4444,#dc2626);}' +
        '#devSwitcherMenu{display:flex;flex-direction:column;gap:4px;background:rgba(15,23,42,0.95);border:1px solid rgba(100,116,139,0.3);border-radius:10px;padding:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);min-width:120px;}' +
        '.dev-switcher-link{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:6px;color:#94a3b8;text-decoration:none;font-size:0.75rem;font-weight:600;transition:all 0.2s;}' +
        '.dev-switcher-link:hover{background:rgba(102,126,234,0.15);color:#e2e8f0;}' +
        '.dev-switcher-link.active{background:rgba(102,126,234,0.2);color:#667eea;}' +
        '.dev-switcher-link i{width:16px;text-align:center;}' +
        '.dev-switcher-off{width:100%;padding:6px;border:1px solid rgba(239,68,68,0.3);border-radius:6px;background:transparent;color:#ef4444;font-size:0.65rem;cursor:pointer;margin-top:4px;}' +
        '.dev-switcher-off:hover{background:rgba(239,68,68,0.1);}';
    document.head.appendChild(style);

    // Insertar en DOM
    if (document.body) {
        document.body.appendChild(container);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            document.body.appendChild(container);
        });
    }
})();
