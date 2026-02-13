// ========================================
// ERP MULTIFUNDAS - Auth Admin/Supervisora
// Login con usuario y contraseña via Supabase RPC
// ========================================

(function() {
    'use strict';

    var SESSION_KEY = 'erp_admin_session';
    var sb = window.supabaseInstance;

    var SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 horas

    // Verificar si hay sesión activa (con expiración)
    function getSession() {
        try {
            var session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
            if (session && session.userId && session.rol) {
                var loginTime = new Date(session.loginTime);
                var now = new Date();
                if ((now - loginTime) > SESSION_EXPIRY_MS) {
                    sessionStorage.removeItem(SESSION_KEY);
                    return null;
                }
                return session;
            }
        } catch (e) {}
        return null;
    }

    function setSession(data) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            userId: data.user_id,
            nombre: data.user_nombre,
            rol: data.user_rol,
            permisos: data.user_permisos || {},
            loginTime: new Date().toISOString()
        }));
    }

    // Verificar si el usuario tiene un permiso específico
    // Admin siempre tiene todos los permisos
    window.tienePermiso = function(permiso) {
        var session = getSession();
        if (!session) return false;
        if (session.rol === 'admin') return true;
        if (!session.permisos) return false;
        return session.permisos[permiso] === true;
    };

    function clearSession() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    // Determinar el rol requerido según la página
    function getRequiredRole() {
        var path = window.location.pathname.toLowerCase();
        if (path.includes('supervisora')) return 'supervisora';
        return 'admin'; // admin.html = admin
    }

    // Mostrar pantalla de login
    function showLoginScreen() {
        var requiredRole = getRequiredRole();
        var roleLabel = requiredRole === 'supervisora' ? 'Supervisora' : 'Administración';

        var overlay = document.createElement('div');
        overlay.id = 'adminLoginOverlay';
        overlay.innerHTML =
            '<div class="admin-login-container">' +
                '<div class="admin-login-card">' +
                    '<div class="admin-login-header">' +
                        '<div class="admin-login-logo">' +
                            '<i class="fas fa-shield-alt"></i>' +
                        '</div>' +
                        '<h2>Panel ' + roleLabel + '</h2>' +
                        '<p>Ingresa tus credenciales para acceder</p>' +
                    '</div>' +
                    '<form id="adminLoginForm" onsubmit="return false;">' +
                        '<div class="admin-login-field">' +
                            '<label><i class="fas fa-user"></i> Usuario</label>' +
                            '<input type="text" id="adminUsername" placeholder="Ingresa tu usuario" autocomplete="username" required>' +
                        '</div>' +
                        '<div class="admin-login-field">' +
                            '<label><i class="fas fa-lock"></i> Contraseña</label>' +
                            '<input type="password" id="adminPassword" placeholder="Ingresa tu contraseña" autocomplete="current-password" required>' +
                        '</div>' +
                        '<div id="adminLoginError" class="admin-login-error" style="display:none;"></div>' +
                        '<button type="submit" id="adminLoginBtn" class="admin-login-btn">' +
                            '<i class="fas fa-sign-in-alt"></i> Ingresar' +
                        '</button>' +
                    '</form>' +
                '</div>' +
            '</div>';

        // Estilos inline para el overlay
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);display:flex;align-items:center;justify-content:center;';

        document.body.appendChild(overlay);

        // Agregar estilos
        var style = document.createElement('style');
        style.id = 'adminLoginStyles';
        style.textContent =
            '.admin-login-container{width:100%;max-width:400px;padding:20px;}' +
            '.admin-login-card{background:rgba(30,41,59,0.95);border:1px solid rgba(100,116,139,0.3);border-radius:16px;padding:40px 32px;box-shadow:0 20px 60px rgba(0,0,0,0.5);}' +
            '.admin-login-header{text-align:center;margin-bottom:32px;}' +
            '.admin-login-logo{width:64px;height:64px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.8rem;color:#fff;}' +
            '.admin-login-header h2{color:#e2e8f0;font-size:1.4rem;margin:0 0 8px;}' +
            '.admin-login-header p{color:#94a3b8;font-size:0.85rem;margin:0;}' +
            '.admin-login-field{margin-bottom:20px;}' +
            '.admin-login-field label{display:block;color:#94a3b8;font-size:0.8rem;margin-bottom:8px;font-weight:600;}' +
            '.admin-login-field label i{margin-right:6px;width:14px;}' +
            '.admin-login-field input{width:100%;padding:12px 16px;background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.3);border-radius:10px;color:#e2e8f0;font-size:0.95rem;outline:none;transition:border-color 0.3s;}' +
            '.admin-login-field input:focus{border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.15);}' +
            '.admin-login-error{background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;padding:10px 14px;border-radius:8px;font-size:0.8rem;margin-bottom:16px;}' +
            '.admin-login-btn{width:100%;padding:14px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity 0.3s,transform 0.2s;}' +
            '.admin-login-btn:hover{opacity:0.9;transform:translateY(-1px);}' +
            '.admin-login-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}' +
            '.admin-login-btn i{margin-right:8px;}';
        document.head.appendChild(style);

        // Event listeners
        var form = document.getElementById('adminLoginForm');
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            doLogin();
        });

        document.getElementById('adminUsername').focus();
    }

    // Ejecutar login
    async function doLogin() {
        var username = document.getElementById('adminUsername').value.trim();
        var password = document.getElementById('adminPassword').value;
        var errorEl = document.getElementById('adminLoginError');
        var btn = document.getElementById('adminLoginBtn');

        if (!username || !password) {
            errorEl.textContent = 'Ingresa usuario y contraseña';
            errorEl.style.display = 'block';
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        errorEl.style.display = 'none';

        try {
            if (sb) {
                // Login via Supabase RPC
                var result = await sb.rpc('validate_admin_login', {
                    p_username: username,
                    p_password: password
                });

                if (result.error) {
                    throw new Error(result.error.message);
                }

                var data = result.data;
                if (data && data.length > 0 && data[0].valid) {
                    var row = data[0];
                    var requiredRole = getRequiredRole();

                    // Verificar que el rol coincida (admin puede acceder a todo)
                    if (row.user_rol === requiredRole || row.user_rol === 'admin') {
                        setSession(row);
                        removeLoginScreen();
                        return;
                    } else {
                        errorEl.textContent = 'No tienes permiso para acceder a este panel';
                        errorEl.style.display = 'block';
                    }
                } else if (data && data.length > 0) {
                    errorEl.textContent = data[0].mensaje || 'Credenciales incorrectas';
                    errorEl.style.display = 'block';
                } else {
                    errorEl.textContent = 'Credenciales incorrectas';
                    errorEl.style.display = 'block';
                }
            } else {
                errorEl.textContent = 'Servicio no disponible. Intenta más tarde.';
                errorEl.style.display = 'block';
            }
        } catch (err) {
            console.error('[Auth] Error en login:', err.message);
            errorEl.textContent = 'Error de conexión. Verifica tu internet e intenta de nuevo.';
            errorEl.style.display = 'block';
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar';
    }

    function removeLoginScreen() {
        var overlay = document.getElementById('adminLoginOverlay');
        if (overlay) overlay.remove();
        var style = document.getElementById('adminLoginStyles');
        if (style) style.remove();
    }

    // Función de logout global
    window.adminLogout = function() {
        clearSession();
        location.reload();
    };

    // Verificar al cargar la página
    function checkAuth() {
        // Skip si estamos en operadora o layout-editor
        var path = window.location.pathname.toLowerCase();
        if (path.includes('operadora') || path.includes('layout-editor') || path.includes('landing')) {
            return;
        }

        // Permitir bypass con ?noauth=1 SOLO en localhost
        if (window.location.search.includes('noauth=1') &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            return;
        }

        var session = getSession();
        if (!session) {
            showLoginScreen();
        }
    }

    // Exponer sesión actual
    window.getAdminSession = getSession;

    // Ejecutar check al cargar DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

})();
