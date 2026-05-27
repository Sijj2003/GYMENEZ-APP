// ====================================================================
// 🛡️ NÚCLEO ZERO TRUST ADMIN - MIDDLEWARE DE AUTENTICACIÓN
// ====================================================================

const ADMIN_TOKEN_KEY = 'gymen_admin_token';

// 1. Sobrescribir el método nativo 'fetch' para inyectar la firma del Administrador
const originalFetch = window.fetch;

window.fetch = async function(...args) {
    let [resource, config] = args;
    config = config || {};
    config.headers = config.headers || {};
    
    // Inyectar el pasaporte digital (Token JWT de Admin)
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await originalFetch(resource, config);
    const url = typeof resource === 'string' ? resource : resource.url;
    
    // 2. Si el servidor rechaza el token (401/403) y NO estamos en la ruta de login
    if ((response.status === 401 || response.status === 403) && !url.includes('/api/admin/login')) {
        ejecutarPurgaAdmin("Credenciales de administrador inválidas o expiradas.");
    }
    
    return response;
};

// 3. Función de Purga Inmutable
function ejecutarPurgaAdmin(mensaje) {
    localStorage.removeItem('adminSession');
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    alert(`🔴 ALERTA DE SEGURIDAD: ${mensaje}`);
    window.location.href = '/apps/admin/login.html';
}

// 4. Verificación de Perímetro al cargar cualquier pantalla protegida
window.addEventListener('DOMContentLoaded', () => {
    // Si la pantalla actual NO es el login, verificamos que exista sesión local
    if (!window.location.pathname.includes('login.html')) {
        const storedSession = localStorage.getItem('adminSession');
        const token = localStorage.getItem(ADMIN_TOKEN_KEY);
        
        if (!storedSession || !token) {
            window.location.href = '/apps/admin/login.html';
        }
    }
});
